#!/usr/bin/env bash
# ==========================================
# entrypoint.sh — Certsmith Container Entrypoint
# ==========================================
# 1. Validates ALL .env variables (fail-fast, zero fallback)
# 2. Generates step-ca configuration for each of the 6 tiers
# 3. Generates Nginx vhost config from template via envsubst
# 4. Launches 6 step-ca daemons + Nginx as a simple supervisor
# ==========================================

set -euo pipefail

CERTSMITH_DATA="${CERTSMITH_DATA:-/data}"
CERTSMITH_HOME="${CERTSMITH_HOME:-/certsmith}"
CONFIGS_DIR="/etc/certsmith/configs"
PIDS=()

# ------------------------------------------
# Utility: require_env
# ------------------------------------------
# Validates that an environment variable is set and non-empty.
# Aborts immediately with a clear error if validation fails.
require_env() {
    local var_name="$1"
    local var_value="${!var_name:-}"
    if [ -z "${var_value}" ]; then
        echo "[certsmith] FATAL: Required environment variable '${var_name}' is missing or empty."
        echo "[certsmith] All configuration must be provided via .env file. No fallback defaults exist."
        exit 1
    fi
}

# ------------------------------------------
# Utility: parse_domains
# ------------------------------------------
# Parses CERTSMITH_DOMAINS (comma-separated) into:
#   PRIMARY_DOMAIN     — first domain (used as Subject CN)
#   CERTSMITH_DOMAINS_ARRAY — bash array of all domains
#   CERTSMITH_SERVER_NAMES — space-separated (for Nginx server_name)
CERTSMITH_DOMAINS_ARRAY=()
PRIMARY_DOMAIN=""
CERTSMITH_SERVER_NAMES=""

parse_domains() {
    local raw_domains="${CERTSMITH_DOMAINS:-${CERTSMITH_DOMAIN:-}}"
    if [ -z "${raw_domains}" ]; then
        echo "[certsmith] FATAL: Neither CERTSMITH_DOMAINS nor CERTSMITH_DOMAIN is set."
        exit 1
    fi

    # Split comma-separated into array
    IFS=',' read -ra CERTSMITH_DOMAINS_ARRAY <<< "${raw_domains}"

    # Trim whitespace from each element
    for i in "${!CERTSMITH_DOMAINS_ARRAY[@]}"; do
        CERTSMITH_DOMAINS_ARRAY[$i]=$(echo "${CERTSMITH_DOMAINS_ARRAY[$i]}" | xargs)
    done

    PRIMARY_DOMAIN="${CERTSMITH_DOMAINS_ARRAY[0]}"
    CERTSMITH_SERVER_NAMES="${CERTSMITH_DOMAINS_ARRAY[*]}"

    echo "[certsmith] Primary domain (CN): ${PRIMARY_DOMAIN}"
    echo "[certsmith] All domains (${#CERTSMITH_DOMAINS_ARRAY[@]}): ${CERTSMITH_SERVER_NAMES}"
}

# ------------------------------------------
# Phase 1: Strict .env Validation
# ------------------------------------------
validate_env() {
    echo "[certsmith] =========================================="
    echo "[certsmith] Phase 1: Validating environment variables"
    echo "[certsmith] =========================================="

    # Global — backward compatible: accept CERTSMITH_DOMAINS or CERTSMITH_DOMAIN
    if [ -z "${CERTSMITH_DOMAINS:-}" ] && [ -z "${CERTSMITH_DOMAIN:-}" ]; then
        echo "[certsmith] FATAL: Required environment variable 'CERTSMITH_DOMAINS' (or 'CERTSMITH_DOMAIN') is missing or empty."
        echo "[certsmith] All configuration must be provided via .env file. No fallback defaults exist."
        exit 1
    fi
    require_env CERTSMITH_PORT_HTTP
    require_env CERTSMITH_PORT_HTTPS

    # Base DN
    require_env CA_COUNTRY
    require_env CA_STATE
    require_env CA_LOCALITY
    require_env CA_ORGANIZATION
    require_env CA_ORGANIZATIONAL_UNIT

    # Root CA
    require_env ROOT_CA_CN
    require_env ROOT_CA_KEY_TYPE
    require_env ROOT_CA_KEY_BITS
    require_env ROOT_CA_VALIDITY_YEARS

    # CR1
    require_env CR1_CN
    require_env CR1_KEY_TYPE
    require_env CR1_KEY_BITS
    require_env CR1_VALIDITY_YEARS
    require_env CR1_PORT

    # CR2
    require_env CR2_CN
    require_env CR2_KEY_TYPE
    require_env CR2_KEY_BITS
    require_env CR2_VALIDITY_YEARS
    require_env CR2_PORT

    # CR3
    require_env CR3_CN
    require_env CR3_KEY_TYPE
    require_env CR3_KEY_BITS
    require_env CR3_VALIDITY_YEARS
    require_env CR3_PORT

    # CE1
    require_env CE1_CN
    require_env CE1_KEY_TYPE
    require_env CE1_KEY_CURVE
    require_env CE1_VALIDITY_YEARS
    require_env CE1_PORT

    # CE2
    require_env CE2_CN
    require_env CE2_KEY_TYPE
    require_env CE2_KEY_CURVE
    require_env CE2_VALIDITY_YEARS
    require_env CE2_PORT

    # CE3
    require_env CE3_CN
    require_env CE3_KEY_TYPE
    require_env CE3_KEY_CURVE
    require_env CE3_VALIDITY_YEARS
    require_env CE3_PORT

    echo "[certsmith] All environment variables validated successfully."

    # Parse domain list into arrays and primary domain
    parse_domains
}

# ------------------------------------------
# Phase 2: Generate step-ca configs per tier
# ------------------------------------------
generate_step_ca_config() {
    local tier="$1"
    local cn_var="${tier^^}_CN"
    local port_var="${tier^^}_PORT"
    local key_type_var="${tier^^}_KEY_TYPE"

    local cn="${!cn_var}"
    local port="${!port_var}"
    local key_type="${!key_type_var}"
    local tier_data="${CERTSMITH_DATA}/step-ca/${tier}"
    local inter_data="${CERTSMITH_DATA}/intermediates/${tier}"

    # Determine key details for step-ca config
    local kty=""
    local crv=""
    local size=""

    if [ "${key_type}" = "RSA" ]; then
        local bits_var="${tier^^}_KEY_BITS"
        kty="RSA"
        size="${!bits_var}"
    elif [ "${key_type}" = "ECDSA" ]; then
        local curve_var="${tier^^}_KEY_CURVE"
        kty="EC"
        crv="${!curve_var}"
    fi

    echo "[certsmith] Generating step-ca config for ${tier^^} (${cn}) on port ${port}..."

    # Check that intermediate cert and key exist
    if [ ! -f "${inter_data}/intermediate_ca.crt" ] || [ ! -f "${inter_data}/intermediate_ca.key" ]; then
        echo "[certsmith] FATAL: Intermediate certificate or key not found for ${tier^^}."
        echo "[certsmith] Expected:"
        echo "  - ${inter_data}/intermediate_ca.crt"
        echo "  - ${inter_data}/intermediate_ca.key"
        echo "[certsmith] Run 'certsmith-forge.sh' first to generate Root CA and sign all intermediates."
        exit 1
    fi

    # Check root cert exists
    if [ ! -f "${CERTSMITH_DATA}/root/root_ca.crt" ]; then
        echo "[certsmith] FATAL: Root CA certificate not found at ${CERTSMITH_DATA}/root/root_ca.crt"
        exit 1
    fi

    # Ensure tier data directory exists
    mkdir -p "${tier_data}"

    # Create password file for step-ca (use the key password or generate a runtime one)
    local password_file="${tier_data}/password.txt"
    if [ ! -f "${password_file}" ]; then
        # Generate a random runtime password for the step-ca database
        head -c 32 /dev/urandom | base64 | tr -d '\n' > "${password_file}"
        chmod 600 "${password_file}"
    fi

    # Build step-ca ca.json configuration
    local ca_config="${tier_data}/ca.json"

    # Build key object based on type
    local key_json=""
    if [ "${kty}" = "RSA" ]; then
        key_json="\"key\": { \"type\": \"RSA\", \"size\": ${size} }"
    else
        key_json="\"key\": { \"type\": \"EC\", \"curve\": \"${crv}\" }"
    fi

    # Build dynamic dnsNames JSON array from CERTSMITH_DOMAINS_ARRAY
    local dns_names_json=''
    for domain in "${CERTSMITH_DOMAINS_ARRAY[@]}"; do
        if [ -n "${dns_names_json}" ]; then
            dns_names_json="${dns_names_json}, "
        fi
        dns_names_json="${dns_names_json}\"${domain}\""
    done
    dns_names_json="${dns_names_json}, \"localhost\", \"127.0.0.1\""

    cat > "${ca_config}" <<EOF
{
    "root": "${CERTSMITH_DATA}/root/root_ca.crt",
    "crt": "${inter_data}/intermediate_ca.crt",
    "key": "${inter_data}/intermediate_ca.key",
    "address": "127.0.0.1:${port}",
    "dnsNames": [${dns_names_json}],
    "logger": {
        "format": "text"
    },
    "db": {
        "type": "badgerv2",
        "dataSource": "${tier_data}/db"
    },
    "authority": {
        "provisioners": [
            {
                "type": "ACME",
                "name": "${tier}",
                "forceCN": true,
                "claims": {
                    "maxTLSCertDuration": "2160h",
                    "defaultTLSCertDuration": "720h"
                }
            }
        ]
    },
    "tls": {
        "cipherSuites": [
            "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256",
            "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
            "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384",
            "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
        ],
        "minVersion": 1.2,
        "maxVersion": 1.3
    }
}
EOF

    chmod 600 "${ca_config}"
    echo "[certsmith] Config for ${tier^^} written to ${ca_config}."
}

generate_all_configs() {
    echo "[certsmith] =========================================="
    echo "[certsmith] Phase 2: Generating step-ca configurations"
    echo "[certsmith] =========================================="

    for tier in cr1 cr2 cr3 ce1 ce2 ce3; do
        generate_step_ca_config "${tier}"
    done

    echo "[certsmith] All step-ca configurations generated."
}

# ------------------------------------------
# Phase 2.5: Portal Dual TLS & Auto-Renewal
# ------------------------------------------
generate_portal_certs() {
    local tls_dir="${CERTSMITH_DATA}/tls"
    local san_ext="${tls_dir}/v3_server.ext"
    mkdir -p "${tls_dir}"

    # Build dynamic SAN alt_names from CERTSMITH_DOMAINS_ARRAY
    local alt_names_block=""
    local dns_index=1
    for domain in "${CERTSMITH_DOMAINS_ARRAY[@]}"; do
        alt_names_block="${alt_names_block}DNS.${dns_index} = ${domain}\n"
        dns_index=$((dns_index + 1))
    done
    alt_names_block="${alt_names_block}DNS.${dns_index} = localhost\n"
    alt_names_block="${alt_names_block}IP.1 = 127.0.0.1"

    cat > "${san_ext}" <<EOF
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid, issuer
subjectAltName = @alt_names

[alt_names]
$(echo -e "${alt_names_block}")
EOF

    # 1. ECC (CE2 P-256)
    local ce2_ca_crt="${CERTSMITH_DATA}/intermediates/ce2/intermediate_ca.crt"
    local ce2_ca_key="${CERTSMITH_DATA}/intermediates/ce2/intermediate_ca.key"
    local ecc_key="${tls_dir}/certsmith-ecc.key"
    local ecc_csr="${tls_dir}/certsmith-ecc.csr"
    local ecc_crt="${tls_dir}/certsmith-ecc.crt"
    local ecc_fullchain="${tls_dir}/certsmith-ecc-fullchain.crt"

    if [ ! -f "${ecc_key}" ]; then
        openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:prime256v1 -out "${ecc_key}" 2>/dev/null
        chmod 600 "${ecc_key}"
    fi

    openssl req -new -key "${ecc_key}" -out "${ecc_csr}" \
        -subj "/C=${CA_COUNTRY}/ST=${CA_STATE}/L=${CA_LOCALITY}/O=${CA_ORGANIZATION}/OU=${CA_ORGANIZATIONAL_UNIT}/CN=${PRIMARY_DOMAIN}"
    openssl x509 -req -in "${ecc_csr}" -CA "${ce2_ca_crt}" -CAkey "${ce2_ca_key}" -CAcreateserial \
        -out "${ecc_crt}" -days 730 -extfile "${san_ext}" -sha256
    cat "${ecc_crt}" "${ce2_ca_crt}" > "${ecc_fullchain}"
    rm -f "${ecc_csr}"
    chmod 644 "${ecc_crt}" "${ecc_fullchain}"

    # 2. RSA (CR2 3072-bit)
    local cr2_ca_crt="${CERTSMITH_DATA}/intermediates/cr2/intermediate_ca.crt"
    local cr2_ca_key="${CERTSMITH_DATA}/intermediates/cr2/intermediate_ca.key"
    local rsa_key="${tls_dir}/certsmith-rsa.key"
    local rsa_csr="${tls_dir}/certsmith-rsa.csr"
    local rsa_crt="${tls_dir}/certsmith-rsa.crt"
    local rsa_fullchain="${tls_dir}/certsmith-rsa-fullchain.crt"

    if [ ! -f "${rsa_key}" ]; then
        openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out "${rsa_key}" 2>/dev/null
        chmod 600 "${rsa_key}"
    fi

    openssl req -new -key "${rsa_key}" -out "${rsa_csr}" \
        -subj "/C=${CA_COUNTRY}/ST=${CA_STATE}/L=${CA_LOCALITY}/O=${CA_ORGANIZATION}/OU=${CA_ORGANIZATIONAL_UNIT}/CN=${PRIMARY_DOMAIN}"
    openssl x509 -req -in "${rsa_csr}" -CA "${cr2_ca_crt}" -CAkey "${cr2_ca_key}" -CAcreateserial \
        -out "${rsa_crt}" -days 730 -extfile "${san_ext}" -sha256
    cat "${rsa_crt}" "${cr2_ca_crt}" > "${rsa_fullchain}"
    rm -f "${rsa_csr}" "${san_ext}"
    chmod 644 "${rsa_crt}" "${rsa_fullchain}"

    echo "[certsmith] Portal Dual TLS certificates successfully generated."
}

ensure_portal_certs() {
    echo "[certsmith] =========================================="
    echo "[certsmith] Phase 2.5: Verifying Portal Dual TLS certs"
    echo "[certsmith] =========================================="

    local tls_dir="${CERTSMITH_DATA}/tls"
    local challenges_dir="${CERTSMITH_DATA}/challenges"
    mkdir -p "${tls_dir}" "${challenges_dir}"

    local ecc_crt="${tls_dir}/certsmith-ecc-fullchain.crt"
    local ecc_key="${tls_dir}/certsmith-ecc.key"
    local rsa_crt="${tls_dir}/certsmith-rsa-fullchain.crt"
    local rsa_key="${tls_dir}/certsmith-rsa.key"

    if [ ! -f "${ecc_crt}" ] || [ ! -f "${ecc_key}" ] || [ ! -f "${rsa_crt}" ] || [ ! -f "${rsa_key}" ]; then
        echo "[certsmith] Portal Dual TLS certificates missing or incomplete. Generating on-the-fly..."
        generate_portal_certs
    else
        echo "[certsmith] Portal Dual TLS certificates verified."
    fi
}

check_and_renew_portal_certs() {
    local tls_dir="${CERTSMITH_DATA}/tls"
    local ecc_crt="${tls_dir}/certsmith-ecc.crt"
    local rsa_crt="${tls_dir}/certsmith-rsa.crt"
    local renew_needed=false

    # Check ECC (30 days threshold = 2592000 seconds)
    if [ -f "${ecc_crt}" ]; then
        if ! openssl x509 -checkend 2592000 -in "${ecc_crt}" > /dev/null 2>&1; then
            echo "[certsmith-renew] ECC portal certificate expires in < 30 days. Renewing..."
            renew_needed=true
        fi
    fi

    # Check RSA (30 days threshold)
    if [ -f "${rsa_crt}" ]; then
        if ! openssl x509 -checkend 2592000 -in "${rsa_crt}" > /dev/null 2>&1; then
            echo "[certsmith-renew] RSA portal certificate expires in < 30 days. Renewing..."
            renew_needed=true
        fi
    fi

    if [ "${renew_needed}" = true ]; then
        echo "[certsmith-renew] Regenerating portal certificates..."
        generate_portal_certs
        if pgrep nginx > /dev/null 2>&1; then
            echo "[certsmith-renew] Reloading Nginx with renewed certificates..."
            nginx -s reload
            echo "[certsmith-renew] Nginx reloaded successfully without downtime."
        fi
    fi
}

# ------------------------------------------
# Phase 3: Generate Nginx config from template
# ------------------------------------------
generate_nginx_config() {
    echo "[certsmith] =========================================="
    echo "[certsmith] Phase 3: Generating Nginx configuration"
    echo "[certsmith] =========================================="

    local template="${CONFIGS_DIR}/certsmith-vhost.template.conf"
    local output="/etc/nginx/sites-enabled/certsmith.conf"

    if [ ! -f "${template}" ]; then
        echo "[certsmith] FATAL: Nginx vhost template not found at ${template}"
        exit 1
    fi

    # Export all tier ports for envsubst
    export CR1_PORT CE1_PORT
    export CR2_PORT CE2_PORT
    export CR3_PORT CE3_PORT
    export CERTSMITH_SERVER_NAMES
    export CERTSMITH_DATA

    envsubst '${CR1_PORT} ${CR2_PORT} ${CR3_PORT} ${CE1_PORT} ${CE2_PORT} ${CE3_PORT} ${CERTSMITH_SERVER_NAMES} ${CERTSMITH_DATA}' \
        < "${template}" > "${output}"

    # Copy core nginx.conf
    if [ -f "${CONFIGS_DIR}/nginx.conf" ]; then
        cp "${CONFIGS_DIR}/nginx.conf" /etc/nginx/nginx.conf
    fi

    # Remove default site if exists
    rm -f /etc/nginx/sites-enabled/default

    echo "[certsmith] Nginx configuration generated at ${output}."
}

# ------------------------------------------
# Phase 4: Supervisor — Launch all daemons
# ------------------------------------------
start_step_ca_daemon() {
    local tier="$1"
    local tier_data="${CERTSMITH_DATA}/step-ca/${tier}"
    local ca_config="${tier_data}/ca.json"
    local password_file="${tier_data}/password.txt"

    echo "[certsmith] Starting step-ca daemon for ${tier^^}..."
    step-ca "${ca_config}" --password-file="${password_file}" &
    local pid=$!
    PIDS+=("${pid}")
    echo "[certsmith] step-ca ${tier^^} started (PID: ${pid})."
}

start_nginx() {
    echo "[certsmith] Starting Nginx reverse proxy..."
    nginx -g "daemon off;" &
    local pid=$!
    PIDS+=("${pid}")
    echo "[certsmith] Nginx started (PID: ${pid})."
}

# ------------------------------------------
# Signal Handling: Graceful Shutdown
# ------------------------------------------
shutdown() {
    echo ""
    echo "[certsmith] =========================================="
    echo "[certsmith] Received shutdown signal. Stopping all processes..."
    echo "[certsmith] =========================================="

    for pid in "${PIDS[@]}"; do
        if kill -0 "${pid}" 2>/dev/null; then
            echo "[certsmith] Stopping PID ${pid}..."
            kill -TERM "${pid}" 2>/dev/null || true
        fi
    done

    # Wait for all processes to exit
    for pid in "${PIDS[@]}"; do
        wait "${pid}" 2>/dev/null || true
    done

    echo "[certsmith] All processes stopped. Goodbye."
    exit 0
}

trap shutdown SIGTERM SIGINT SIGQUIT

# ------------------------------------------
# Process Monitor: Restart crashed daemons
# ------------------------------------------
monitor_processes() {
    echo "[certsmith] =========================================="
    echo "[certsmith] Process supervisor active. Monitoring ${#PIDS[@]} processes."
    echo "[certsmith] Auto-renewal monitor active (checks every 24h)."
    echo "[certsmith] =========================================="

    local last_renew_check=$(date +%s)

    while true; do
        for pid in "${PIDS[@]}"; do
            if ! kill -0 "${pid}" 2>/dev/null; then
                echo "[certsmith] FATAL: Process ${pid} has exited unexpectedly."
                echo "[certsmith] Initiating graceful shutdown of all processes..."
                shutdown
            fi
        done

        local now=$(date +%s)
        # Check every 24 hours (86400 seconds)
        if [ $((now - last_renew_check)) -ge 86400 ]; then
            check_and_renew_portal_certs
            last_renew_check=${now}
        fi

        sleep 5
    done
}

# ------------------------------------------
# Main
# ------------------------------------------
main() {
    echo "============================================"
    echo "  Certsmith — Private ACME CA Appliance"
    echo "  6-Tier Multi-Algorithm Certificate Server"
    echo "============================================"
    echo ""

    case "${1:-run}" in
        run)
            validate_env
            generate_all_configs
            ensure_portal_certs
            generate_nginx_config

            echo "[certsmith] =========================================="
            echo "[certsmith] Phase 4: Starting all daemons"
            echo "[certsmith] =========================================="

            for tier in cr1 cr2 cr3 ce1 ce2 ce3; do
                start_step_ca_daemon "${tier}"
            done

            # Small delay to let step-ca daemons initialize
            sleep 2

            start_nginx

            echo ""
            echo "[certsmith] =========================================="
            echo "[certsmith] Certsmith is READY"
            echo "[certsmith] Primary: ${PRIMARY_DOMAIN}"
            echo "[certsmith] Domains: ${CERTSMITH_SERVER_NAMES}"
            echo "[certsmith] HTTP:    port ${CERTSMITH_PORT_HTTP}"
            echo "[certsmith] HTTPS:   port ${CERTSMITH_PORT_HTTPS}"
            echo "[certsmith] Tiers:   CR1(:${CR1_PORT}) CR2(:${CR2_PORT}) CR3(:${CR3_PORT})"
            echo "[certsmith]          CE1(:${CE1_PORT}) CE2(:${CE2_PORT}) CE3(:${CE3_PORT})"
            echo "[certsmith] =========================================="
            echo ""

            monitor_processes
            ;;
        validate)
            validate_env
            echo "[certsmith] Validation passed."
            ;;
        *)
            echo "Usage: certsmith-entrypoint {run|validate}"
            exit 1
            ;;
    esac
}

main "$@"
