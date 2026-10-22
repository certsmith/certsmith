#!/usr/bin/env bash
# ==========================================
# forge-portal-tls.sh — Portal Dual TLS Certificate Generation
# ==========================================
# Provides: forge::generate_portal_tls
# Depends:  common.sh (DOMAIN_ARRAY, PRIMARY_DOMAIN, forge::build_subject,
#           forge::generate_ec_key, forge::generate_rsa_key),
#           forge-root.sh (ROOT_CRT)
# ==========================================

# ------------------------------------------
# forge::generate_portal_tls
# ------------------------------------------
forge::generate_portal_tls() {
    echo ""
    echo "[certsmith-forge] =========================================="
    echo "[certsmith-forge] Phase 4: Portal Dual TLS Certificate Generation"
    echo "[certsmith-forge] =========================================="

    TLS_DIR="${DATA_DIR}/tls"
    mkdir -p "${TLS_DIR}"

    # Build dynamic SAN alt_names from DOMAIN_ARRAY
    local alt_names_block=""
    local dns_index=1
    for domain in "${DOMAIN_ARRAY[@]}"; do
        alt_names_block="${alt_names_block}DNS.${dns_index} = ${domain}\n"
        dns_index=$((dns_index + 1))
    done
    alt_names_block="${alt_names_block}DNS.${dns_index} = localhost\n"
    alt_names_block="${alt_names_block}IP.1 = 127.0.0.1"

    SAN_EXT="${TLS_DIR}/v3_server.ext"
    cat > "${SAN_EXT}" <<EOF
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid, issuer
subjectAltName = @alt_names

[alt_names]
$(echo -e "${alt_names_block}")
EOF

    # 1. ECC Server Certificate (Signed by CE2)
    echo ""
    echo "[certsmith-forge] --- Generating ECC Portal Certificate (CE2 - P-256) ---"
    local ecc_key="${TLS_DIR}/certsmith-ecc.key"
    local ecc_csr="${TLS_DIR}/certsmith-ecc.csr"
    local ecc_crt="${TLS_DIR}/certsmith-ecc.crt"
    local ecc_fullchain="${TLS_DIR}/certsmith-ecc-fullchain.crt"
    local ce2_ca_crt="${DATA_DIR}/intermediates/ce2/intermediate_ca.crt"
    local ce2_ca_key="${DATA_DIR}/intermediates/ce2/intermediate_ca.key"

    forge::generate_ec_key "${ecc_key}" "P-256"

    openssl req -new \
        -key "${ecc_key}" \
        -out "${ecc_csr}" \
        -subj "/C=${CA_COUNTRY}/ST=${CA_STATE}/L=${CA_LOCALITY}/O=${CA_ORGANIZATION}/OU=${CA_ORGANIZATIONAL_UNIT}/CN=${PRIMARY_DOMAIN}"

    openssl x509 -req \
        -in "${ecc_csr}" \
        -CA "${ce2_ca_crt}" \
        -CAkey "${ce2_ca_key}" \
        -CAcreateserial \
        -out "${ecc_crt}" \
        -days 730 \
        -extfile "${SAN_EXT}" \
        -sha256

    cat "${ecc_crt}" "${ce2_ca_crt}" > "${ecc_fullchain}"
    rm -f "${ecc_csr}"
    chmod 644 "${ecc_crt}" "${ecc_fullchain}"
    chmod 600 "${ecc_key}"
    echo "[certsmith-forge] ✓ ECC Portal Certificate generated and chained."

    # 2. RSA Server Certificate (Signed by CR2)
    echo ""
    echo "[certsmith-forge] --- Generating RSA Portal Certificate (CR2 - RSA 3072) ---"
    local rsa_key="${TLS_DIR}/certsmith-rsa.key"
    local rsa_csr="${TLS_DIR}/certsmith-rsa.csr"
    local rsa_crt="${TLS_DIR}/certsmith-rsa.crt"
    local rsa_fullchain="${TLS_DIR}/certsmith-rsa-fullchain.crt"
    local cr2_ca_crt="${DATA_DIR}/intermediates/cr2/intermediate_ca.crt"
    local cr2_ca_key="${DATA_DIR}/intermediates/cr2/intermediate_ca.key"

    forge::generate_rsa_key "${rsa_key}" 3072

    openssl req -new \
        -key "${rsa_key}" \
        -out "${rsa_csr}" \
        -subj "/C=${CA_COUNTRY}/ST=${CA_STATE}/L=${CA_LOCALITY}/O=${CA_ORGANIZATION}/OU=${CA_ORGANIZATIONAL_UNIT}/CN=${PRIMARY_DOMAIN}"

    openssl x509 -req \
        -in "${rsa_csr}" \
        -CA "${cr2_ca_crt}" \
        -CAkey "${cr2_ca_key}" \
        -CAcreateserial \
        -out "${rsa_crt}" \
        -days 730 \
        -extfile "${SAN_EXT}" \
        -sha256

    cat "${rsa_crt}" "${cr2_ca_crt}" > "${rsa_fullchain}"
    rm -f "${rsa_csr}" "${SAN_EXT}"
    chmod 644 "${rsa_crt}" "${rsa_fullchain}"
    chmod 600 "${rsa_key}"
    echo "[certsmith-forge] ✓ RSA Portal Certificate generated and chained."

    # Verify portal certificates
    if openssl verify -CAfile "${ROOT_CRT}" -untrusted "${ce2_ca_crt}" "${ecc_crt}" > /dev/null 2>&1; then
        echo "[certsmith-forge] ✓ Chain verification PASSED for ECC Portal Certificate."
    else
        echo "[certsmith-forge] ✗ Chain verification FAILED for ECC Portal Certificate!"
        exit 1
    fi

    if openssl verify -CAfile "${ROOT_CRT}" -untrusted "${cr2_ca_crt}" "${rsa_crt}" > /dev/null 2>&1; then
        echo "[certsmith-forge] ✓ Chain verification PASSED for RSA Portal Certificate."
    else
        echo "[certsmith-forge] ✗ Chain verification FAILED for RSA Portal Certificate!"
        exit 1
    fi
}
