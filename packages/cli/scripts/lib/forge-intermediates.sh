#!/usr/bin/env bash
# ==========================================
# forge-intermediates.sh — Intermediate CA Generation
# ==========================================
# Provides: forge::generate_intermediate, forge::generate_all_intermediates
# Depends:  common.sh, forge-root.sh (ROOT_CRT, ROOT_KEY)
# ==========================================

# ------------------------------------------
# forge::generate_intermediate
# ------------------------------------------
forge::generate_intermediate() {
    local tier_lower="$1"   # e.g. cr1, ce2
    local tier_upper="${tier_lower^^}"  # e.g. CR1, CE2

    local cn_var="${tier_upper}_CN"
    local key_type_var="${tier_upper}_KEY_TYPE"
    local validity_var="${tier_upper}_VALIDITY_YEARS"

    local cn="${!cn_var}"
    local key_type="${!key_type_var}"
    local validity_years="${!validity_var}"
    local validity_days=$((validity_years * 365))

    local inter_dir="${DATA_DIR}/intermediates/${tier_lower}"
    mkdir -p "${inter_dir}"

    local inter_key="${inter_dir}/intermediate_ca.key"
    local inter_csr="${inter_dir}/intermediate_ca.csr"
    local inter_crt="${inter_dir}/intermediate_ca.crt"
    local inter_subject
    inter_subject=$(forge::build_subject "${cn}")

    echo ""
    echo "[certsmith-forge] --- ${tier_upper} ---"
    echo "[certsmith-forge] Subject: ${inter_subject}"
    echo "[certsmith-forge] Key Type: ${key_type}"
    echo "[certsmith-forge] Validity: ${validity_years} years (${validity_days} days)"

    if [ -f "${inter_crt}" ] && [ -f "${inter_key}" ]; then
        echo "[certsmith-forge] ✓ ${tier_upper} already exists. Skipping."
        return
    fi

    # Generate key based on type
    if [ "${key_type}" = "RSA" ]; then
        local bits_var="${tier_upper}_KEY_BITS"
        local bits="${!bits_var}"
        echo "[certsmith-forge] Key Size: ${bits} bits"
        forge::generate_rsa_key "${inter_key}" "${bits}"
    elif [ "${key_type}" = "ECDSA" ]; then
        local curve_var="${tier_upper}_KEY_CURVE"
        local curve="${!curve_var}"
        echo "[certsmith-forge] Curve: ${curve}"
        forge::generate_ec_key "${inter_key}" "${curve}"
    else
        echo "[certsmith-forge] FATAL: Unknown key type '${key_type}' for ${tier_upper}"
        exit 1
    fi

    # Generate CSR
    echo "[certsmith-forge]   Generating CSR..."
    openssl req -new \
        -key "${inter_key}" \
        -out "${inter_csr}" \
        -subj "${inter_subject}"

    # Create extensions file for intermediate CA
    local ext_file="${inter_dir}/v3_intermediate.ext"
    cat > "${ext_file}" <<EOF
basicConstraints = critical, CA:TRUE, pathlen:0
keyUsage = critical, keyCertSign, cRLSign, digitalSignature
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always, issuer
EOF

    # Sign with Root CA
    echo "[certsmith-forge]   Signing with Root CA..."
    openssl x509 -req \
        -in "${inter_csr}" \
        -CA "${ROOT_CRT}" \
        -CAkey "${ROOT_KEY}" \
        -CAcreateserial \
        -out "${inter_crt}" \
        -days "${validity_days}" \
        -extfile "${ext_file}" \
        -sha384

    # Clean up CSR and ext file
    rm -f "${inter_csr}" "${ext_file}"
    chmod 644 "${inter_crt}"
    chmod 600 "${inter_key}"

    echo "[certsmith-forge] ✓ ${tier_upper} Intermediate CA generated and signed."
    echo "[certsmith-forge]   Certificate: ${inter_crt}"
    echo "[certsmith-forge]   Key:         ${inter_key}"
}

# ------------------------------------------
# forge::generate_all_intermediates
# ------------------------------------------
forge::generate_all_intermediates() {
    echo ""
    echo "[certsmith-forge] =========================================="
    echo "[certsmith-forge] Phase 2: Intermediate CA Generation"
    echo "[certsmith-forge] =========================================="

    for tier in cr1 cr2 cr3 ce1 ce2 ce3; do
        forge::generate_intermediate "${tier}"
    done
}
