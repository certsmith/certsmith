#!/usr/bin/env bash
# ==========================================
# 03-portal-tls.sh — Portal Dual TLS Certificate Management
# ==========================================
# Provides: tls::generate_portal_certs, tls::ensure_portal_certs,
#           tls::check_and_renew
# Depends:  00-utils.sh (CERTSMITH_DOMAINS_ARRAY, PRIMARY_DOMAIN)
# ==========================================

# ------------------------------------------
# tls::_build_san_ext
# ------------------------------------------
# Builds a v3_server.ext file with dynamic SAN entries.
tls::_build_san_ext() {
    local san_ext="$1"

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
}

# ------------------------------------------
# tls::generate_portal_certs
# ------------------------------------------
# Generates dual-stack (ECC + RSA) portal TLS certificates.
tls::generate_portal_certs() {
    local tls_dir="${CERTSMITH_DATA}/tls"
    local san_ext="${tls_dir}/v3_server.ext"
    mkdir -p "${tls_dir}"

    tls::_build_san_ext "${san_ext}"

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

# ------------------------------------------
# tls::ensure_portal_certs
# ------------------------------------------
# Verifies existing certs have correct SANs, regenerates if needed.
tls::ensure_portal_certs() {
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

    local san_matches=true
    if [ -f "${rsa_crt}" ]; then
        local current_sans
        current_sans=$(openssl x509 -in "${rsa_crt}" -noout -text 2>/dev/null | grep -A 2 "Subject Alternative Name" || true)
        for domain in "${CERTSMITH_DOMAINS_ARRAY[@]}"; do
            if ! echo "${current_sans}" | grep -F -i -q "DNS:${domain}"; then
                san_matches=false
                break
            fi
        done
    else
        san_matches=false
    fi

    if [ ! -f "${ecc_crt}" ] || [ ! -f "${ecc_key}" ] || [ ! -f "${rsa_crt}" ] || [ ! -f "${rsa_key}" ] || [ "${san_matches}" = false ]; then
        if [ "${san_matches}" = false ]; then
            echo "[certsmith] Portal Dual TLS certificates missing, incomplete, or domain list changed. Generating..."
        else
            echo "[certsmith] Portal Dual TLS certificates missing or incomplete. Generating on-the-fly..."
        fi
        tls::generate_portal_certs
    else
        echo "[certsmith] Portal Dual TLS certificates verified."
    fi
}

# ------------------------------------------
# tls::check_and_renew
# ------------------------------------------
# Checks certificate expiry and renews if within 30 days.
tls::check_and_renew() {
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
        tls::generate_portal_certs
        if pgrep nginx > /dev/null 2>&1; then
            echo "[certsmith-renew] Reloading Nginx with renewed certificates..."
            nginx -s reload
            echo "[certsmith-renew] Nginx reloaded successfully without downtime."
        fi
    fi
}
