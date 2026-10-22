#!/usr/bin/env bash
# ==========================================
# forge-root.sh — Root CA Generation
# ==========================================
# Provides: forge::generate_root_ca
# Depends:  common.sh
# ==========================================

# ------------------------------------------
# forge::generate_root_ca
# ------------------------------------------
forge::generate_root_ca() {
    echo ""
    echo "[certsmith-forge] =========================================="
    echo "[certsmith-forge] Phase 1: Root CA Generation"
    echo "[certsmith-forge] =========================================="

    ROOT_DIR="${DATA_DIR}/root"
    mkdir -p "${ROOT_DIR}"

    ROOT_KEY="${ROOT_DIR}/root_ca.key"
    ROOT_CRT="${ROOT_DIR}/root_ca.crt"
    ROOT_SUBJECT=$(forge::build_subject "${ROOT_CA_CN}")
    ROOT_DAYS=$((ROOT_CA_VALIDITY_YEARS * 365))

    if [ -f "${ROOT_CRT}" ] && [ -f "${ROOT_KEY}" ]; then
        echo "[certsmith-forge] Root CA already exists. Skipping generation."
        echo "[certsmith-forge]   Certificate: ${ROOT_CRT}"
        echo "[certsmith-forge]   Key:         ${ROOT_KEY}"
    else
        echo "[certsmith-forge] Subject: ${ROOT_SUBJECT}"
        echo "[certsmith-forge] Validity: ${ROOT_CA_VALIDITY_YEARS} years (${ROOT_DAYS} days)"

        forge::generate_rsa_key "${ROOT_KEY}" "${ROOT_CA_KEY_BITS}"

        echo "[certsmith-forge]   Generating self-signed Root CA certificate..."
        openssl req -new -x509 \
            -key "${ROOT_KEY}" \
            -out "${ROOT_CRT}" \
            -days "${ROOT_DAYS}" \
            -subj "${ROOT_SUBJECT}" \
            -addext "basicConstraints=critical,CA:TRUE" \
            -addext "keyUsage=critical,keyCertSign,cRLSign" \
            -addext "subjectKeyIdentifier=hash" \
            -sha384

        echo "[certsmith-forge] ✓ Root CA generated."
        echo "[certsmith-forge]   Certificate: ${ROOT_CRT}"
        echo "[certsmith-forge]   Key:         ${ROOT_KEY}"
    fi
}
