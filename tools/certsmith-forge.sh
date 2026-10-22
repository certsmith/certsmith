#!/usr/bin/env bash
# ==========================================
# certsmith-forge.sh — Offline Key Ceremony Tool
# ==========================================
# Generates the Root CA and signs all 6 Intermediate CAs.
#
# This tool is designed to run OUTSIDE the container
# (or inside with mounted volumes) during the initial
# key ceremony phase.
#
# It requires:
#   - openssl (3.x recommended)
#   - A valid .env file in the project root
#
# Usage:
#   ./tools/certsmith-forge.sh /path/to/.env /path/to/data
#
# ==========================================

set -euo pipefail

# ------------------------------------------
# Arguments
# ------------------------------------------
ENV_FILE="${1:-.env}"
DATA_DIR="${2:-./data}"

if [ ! -f "${ENV_FILE}" ]; then
    echo "[certsmith-forge] FATAL: .env file not found at '${ENV_FILE}'"
    echo "[certsmith-forge] Usage: $0 /path/to/.env [/path/to/data]"
    exit 1
fi

# shellcheck source=/dev/null
source "${ENV_FILE}"

# ------------------------------------------
# Utility: require_env
# ------------------------------------------
require_env() {
    local var_name="$1"
    local var_value="${!var_name:-}"
    if [ -z "${var_value}" ]; then
        echo "[certsmith-forge] FATAL: Required variable '${var_name}' is missing or empty in ${ENV_FILE}"
        exit 1
    fi
}

# ------------------------------------------
# Phase 0: Validate ALL required variables
# ------------------------------------------
echo "[certsmith-forge] =========================================="
echo "[certsmith-forge] Phase 0: Validating .env configuration"
echo "[certsmith-forge] =========================================="

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

# All intermediates
for tier in CR1 CR2 CR3; do
    require_env "${tier}_CN"
    require_env "${tier}_KEY_TYPE"
    require_env "${tier}_KEY_BITS"
    require_env "${tier}_VALIDITY_YEARS"
    require_env "${tier}_PORT"
done

for tier in CE1 CE2 CE3; do
    require_env "${tier}_CN"
    require_env "${tier}_KEY_TYPE"
    require_env "${tier}_KEY_CURVE"
    require_env "${tier}_VALIDITY_YEARS"
    require_env "${tier}_PORT"
done

echo "[certsmith-forge] All variables validated."

# ------------------------------------------
# Helper: Build Subject DN
# ------------------------------------------
build_subject() {
    local cn="$1"
    echo "/C=${CA_COUNTRY}/ST=${CA_STATE}/L=${CA_LOCALITY}/O=${CA_ORGANIZATION}/OU=${CA_ORGANIZATIONAL_UNIT}/CN=${cn}"
}

# ------------------------------------------
# Helper: Generate RSA key pair
# ------------------------------------------
generate_rsa_key() {
    local keyfile="$1"
    local bits="$2"
    echo "[certsmith-forge]   Generating RSA ${bits}-bit key..."
    openssl genpkey -algorithm RSA -pkeyopt "rsa_keygen_bits:${bits}" -out "${keyfile}" 2>/dev/null
    chmod 600 "${keyfile}"
}

# ------------------------------------------
# Helper: Generate ECDSA key pair
# ------------------------------------------
generate_ec_key() {
    local keyfile="$1"
    local curve="$2"

    # Map curve names to OpenSSL curve names
    local openssl_curve=""
    case "${curve}" in
        P-256) openssl_curve="prime256v1" ;;
        P-384) openssl_curve="secp384r1" ;;
        P-521) openssl_curve="secp521r1" ;;
        *)
            echo "[certsmith-forge] FATAL: Unsupported curve: ${curve}"
            exit 1
            ;;
    esac

    echo "[certsmith-forge]   Generating ECDSA ${curve} (${openssl_curve}) key..."
    openssl genpkey -algorithm EC -pkeyopt "ec_paramgen_curve:${openssl_curve}" -out "${keyfile}" 2>/dev/null
    chmod 600 "${keyfile}"
}

# ------------------------------------------
# Phase 1: Generate Root CA
# ------------------------------------------
echo ""
echo "[certsmith-forge] =========================================="
echo "[certsmith-forge] Phase 1: Root CA Generation"
echo "[certsmith-forge] =========================================="

ROOT_DIR="${DATA_DIR}/root"
mkdir -p "${ROOT_DIR}"

ROOT_KEY="${ROOT_DIR}/root_ca.key"
ROOT_CRT="${ROOT_DIR}/root_ca.crt"
ROOT_SUBJECT=$(build_subject "${ROOT_CA_CN}")
ROOT_DAYS=$((ROOT_CA_VALIDITY_YEARS * 365))

if [ -f "${ROOT_CRT}" ] && [ -f "${ROOT_KEY}" ]; then
    echo "[certsmith-forge] Root CA already exists. Skipping generation."
    echo "[certsmith-forge]   Certificate: ${ROOT_CRT}"
    echo "[certsmith-forge]   Key:         ${ROOT_KEY}"
else
    echo "[certsmith-forge] Subject: ${ROOT_SUBJECT}"
    echo "[certsmith-forge] Validity: ${ROOT_CA_VALIDITY_YEARS} years (${ROOT_DAYS} days)"

    generate_rsa_key "${ROOT_KEY}" "${ROOT_CA_KEY_BITS}"

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

# ------------------------------------------
# Phase 2: Generate & Sign Intermediate CAs
# ------------------------------------------
echo ""
echo "[certsmith-forge] =========================================="
echo "[certsmith-forge] Phase 2: Intermediate CA Generation"
echo "[certsmith-forge] =========================================="

# Function to create an Intermediate CA
generate_intermediate() {
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
    inter_subject=$(build_subject "${cn}")

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
        generate_rsa_key "${inter_key}" "${bits}"
    elif [ "${key_type}" = "ECDSA" ]; then
        local curve_var="${tier_upper}_KEY_CURVE"
        local curve="${!curve_var}"
        echo "[certsmith-forge] Curve: ${curve}"
        generate_ec_key "${inter_key}" "${curve}"
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

# Generate all 6 intermediates
for tier in cr1 cr2 cr3 ce1 ce2 ce3; do
    generate_intermediate "${tier}"
done

# ------------------------------------------
# Phase 3: Verification
# ------------------------------------------
echo ""
echo "[certsmith-forge] =========================================="
echo "[certsmith-forge] Phase 3: Verification"
echo "[certsmith-forge] =========================================="

echo ""
echo "[certsmith-forge] --- Root CA ---"
openssl x509 -in "${ROOT_CRT}" -noout -subject -issuer -dates

for tier in cr1 cr2 cr3 ce1 ce2 ce3; do
    local_crt="${DATA_DIR}/intermediates/${tier}/intermediate_ca.crt"
    echo ""
    echo "[certsmith-forge] --- ${tier^^} Intermediate ---"
    openssl x509 -in "${local_crt}" -noout -subject -issuer -dates

    # Verify chain
    if openssl verify -CAfile "${ROOT_CRT}" "${local_crt}" > /dev/null 2>&1; then
        echo "[certsmith-forge] ✓ Chain verification PASSED for ${tier^^}."
    else
        echo "[certsmith-forge] ✗ Chain verification FAILED for ${tier^^}!"
        exit 1
    fi
done

# ------------------------------------------
# Phase 4: Portal Dual TLS Certificate Generation
# ------------------------------------------
echo ""
echo "[certsmith-forge] =========================================="
echo "[certsmith-forge] Phase 4: Portal Dual TLS Certificate Generation"
echo "[certsmith-forge] =========================================="

TLS_DIR="${DATA_DIR}/tls"
mkdir -p "${TLS_DIR}"

SAN_EXT="${TLS_DIR}/v3_server.ext"
cat > "${SAN_EXT}" <<EOF
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid, issuer
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${CERTSMITH_DOMAIN}
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF

# 1. ECC Server Certificate (Signed by CE2)
echo ""
echo "[certsmith-forge] --- Generating ECC Portal Certificate (CE2 - P-256) ---"
ECC_KEY="${TLS_DIR}/certsmith-ecc.key"
ECC_CSR="${TLS_DIR}/certsmith-ecc.csr"
ECC_CRT="${TLS_DIR}/certsmith-ecc.crt"
ECC_FULLCHAIN="${TLS_DIR}/certsmith-ecc-fullchain.crt"
CE2_CA_CRT="${DATA_DIR}/intermediates/ce2/intermediate_ca.crt"
CE2_CA_KEY="${DATA_DIR}/intermediates/ce2/intermediate_ca.key"

generate_ec_key "${ECC_KEY}" "P-256"

openssl req -new \
    -key "${ECC_KEY}" \
    -out "${ECC_CSR}" \
    -subj "/C=${CA_COUNTRY}/ST=${CA_STATE}/L=${CA_LOCALITY}/O=${CA_ORGANIZATION}/OU=${CA_ORGANIZATIONAL_UNIT}/CN=${CERTSMITH_DOMAIN}"

openssl x509 -req \
    -in "${ECC_CSR}" \
    -CA "${CE2_CA_CRT}" \
    -CAkey "${CE2_CA_KEY}" \
    -CAcreateserial \
    -out "${ECC_CRT}" \
    -days 730 \
    -extfile "${SAN_EXT}" \
    -sha256

cat "${ECC_CRT}" "${CE2_CA_CRT}" > "${ECC_FULLCHAIN}"
rm -f "${ECC_CSR}"
chmod 644 "${ECC_CRT}" "${ECC_FULLCHAIN}"
chmod 600 "${ECC_KEY}"
echo "[certsmith-forge] ✓ ECC Portal Certificate generated and chained."

# 2. RSA Server Certificate (Signed by CR2)
echo ""
echo "[certsmith-forge] --- Generating RSA Portal Certificate (CR2 - RSA 3072) ---"
RSA_KEY="${TLS_DIR}/certsmith-rsa.key"
RSA_CSR="${TLS_DIR}/certsmith-rsa.csr"
RSA_CRT="${TLS_DIR}/certsmith-rsa.crt"
RSA_FULLCHAIN="${TLS_DIR}/certsmith-rsa-fullchain.crt"
CR2_CA_CRT="${DATA_DIR}/intermediates/cr2/intermediate_ca.crt"
CR2_CA_KEY="${DATA_DIR}/intermediates/cr2/intermediate_ca.key"

generate_rsa_key "${RSA_KEY}" 3072

openssl req -new \
    -key "${RSA_KEY}" \
    -out "${RSA_CSR}" \
    -subj "/C=${CA_COUNTRY}/ST=${CA_STATE}/L=${CA_LOCALITY}/O=${CA_ORGANIZATION}/OU=${CA_ORGANIZATIONAL_UNIT}/CN=${CERTSMITH_DOMAIN}"

openssl x509 -req \
    -in "${RSA_CSR}" \
    -CA "${CR2_CA_CRT}" \
    -CAkey "${CR2_CA_KEY}" \
    -CAcreateserial \
    -out "${RSA_CRT}" \
    -days 730 \
    -extfile "${SAN_EXT}" \
    -sha256

cat "${RSA_CRT}" "${CR2_CA_CRT}" > "${RSA_FULLCHAIN}"
rm -f "${RSA_CSR}" "${SAN_EXT}"
chmod 644 "${RSA_CRT}" "${RSA_FULLCHAIN}"
chmod 600 "${RSA_KEY}"
echo "[certsmith-forge] ✓ RSA Portal Certificate generated and chained."

# Verify portal certificates
if openssl verify -CAfile "${ROOT_CRT}" -untrusted "${CE2_CA_CRT}" "${ECC_CRT}" > /dev/null 2>&1; then
    echo "[certsmith-forge] ✓ Chain verification PASSED for ECC Portal Certificate."
else
    echo "[certsmith-forge] ✗ Chain verification FAILED for ECC Portal Certificate!"
    exit 1
fi

if openssl verify -CAfile "${ROOT_CRT}" -untrusted "${CR2_CA_CRT}" "${RSA_CRT}" > /dev/null 2>&1; then
    echo "[certsmith-forge] ✓ Chain verification PASSED for RSA Portal Certificate."
else
    echo "[certsmith-forge] ✗ Chain verification FAILED for RSA Portal Certificate!"
    exit 1
fi

echo ""
echo "[certsmith-forge] =========================================="
echo "[certsmith-forge] Key Ceremony Complete"
echo "[certsmith-forge] =========================================="
echo ""
echo "[certsmith-forge] Root CA:        ${ROOT_CRT}"
echo "[certsmith-forge] Root Key:       ${ROOT_KEY} (SECURE THIS FILE!)"
echo "[certsmith-forge] Intermediates:  ${DATA_DIR}/intermediates/{cr1,cr2,cr3,ce1,ce2,ce3}/"
echo "[certsmith-forge] Portal Dual TLS: ${TLS_DIR}/ (ECC + RSA fullchains)"
echo ""
echo "[certsmith-forge] IMPORTANT: The Root CA private key (${ROOT_KEY})"
echo "[certsmith-forge] should be moved to secure offline/air-gapped storage"
echo "[certsmith-forge] after this ceremony is complete."
echo ""
