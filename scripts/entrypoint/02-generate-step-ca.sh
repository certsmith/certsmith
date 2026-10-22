#!/usr/bin/env bash
# ==========================================
# 02-generate-step-ca.sh — step-ca Configuration Generator
# ==========================================
# Provides: stepca::generate_config, stepca::generate_all_configs
# Depends:  00-utils.sh (CERTSMITH_DOMAINS_ARRAY)
# ==========================================

# ------------------------------------------
# stepca::generate_config
# ------------------------------------------
# Generates a single step-ca ca.json configuration for one tier.
stepca::generate_config() {
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

# ------------------------------------------
# stepca::generate_all_configs
# ------------------------------------------
stepca::generate_all_configs() {
    echo "[certsmith] =========================================="
    echo "[certsmith] Phase 2: Generating step-ca configurations"
    echo "[certsmith] =========================================="

    for tier in cr1 cr2 cr3 ce1 ce2 ce3; do
        stepca::generate_config "${tier}"
    done

    echo "[certsmith] All step-ca configurations generated."
}
