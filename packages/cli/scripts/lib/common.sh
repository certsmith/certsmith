#!/usr/bin/env bash
# ==========================================
# common.sh — Shared Library for Forge Tools
# ==========================================
# Provides: forge::require_env, forge::strip_quotes,
#           forge::sanitize_dn_vars, forge::parse_domains,
#           forge::build_subject, forge::generate_rsa_key,
#           forge::generate_ec_key
# ==========================================

# ------------------------------------------
# forge::require_env
# ------------------------------------------
forge::require_env() {
    local var_name="$1"
    local var_value="${!var_name:-}"
    if [ -z "${var_value}" ]; then
        echo "[certsmith-forge] FATAL: Required variable '${var_name}' is missing or empty in ${ENV_FILE}"
        exit 1
    fi
}

# ------------------------------------------
# forge::strip_quotes
# ------------------------------------------
forge::strip_quotes() {
    local val="$1"
    val="${val//\"/}"
    echo "${val}"
}

# ------------------------------------------
# forge::sanitize_dn_vars
# ------------------------------------------
forge::sanitize_dn_vars() {
    CA_COUNTRY="$(forge::strip_quotes "${CA_COUNTRY}")"
    CA_STATE="$(forge::strip_quotes "${CA_STATE}")"
    CA_LOCALITY="$(forge::strip_quotes "${CA_LOCALITY}")"
    CA_ORGANIZATION="$(forge::strip_quotes "${CA_ORGANIZATION}")"
    CA_ORGANIZATIONAL_UNIT="$(forge::strip_quotes "${CA_ORGANIZATIONAL_UNIT}")"
}

# ------------------------------------------
# forge::parse_domains
# ------------------------------------------
# Parses CERTSMITH_DOMAINS into DOMAIN_ARRAY and PRIMARY_DOMAIN.
DOMAIN_ARRAY=()
PRIMARY_DOMAIN=""

forge::parse_domains() {
    local raw_domains="${CERTSMITH_DOMAINS:-${CERTSMITH_DOMAIN:-}}"
    if [ -z "${raw_domains}" ]; then
        echo "[certsmith-forge] FATAL: Neither CERTSMITH_DOMAINS nor CERTSMITH_DOMAIN is set in ${ENV_FILE}"
        exit 1
    fi

    IFS=',' read -ra DOMAIN_ARRAY <<< "${raw_domains}"
    for i in "${!DOMAIN_ARRAY[@]}"; do
        DOMAIN_ARRAY[$i]=$(echo "${DOMAIN_ARRAY[$i]}" | xargs)
    done

    PRIMARY_DOMAIN="${DOMAIN_ARRAY[0]}"
    echo "[certsmith-forge] Primary domain (CN): ${PRIMARY_DOMAIN}"
    echo "[certsmith-forge] All domains (${#DOMAIN_ARRAY[@]}): ${DOMAIN_ARRAY[*]}"
}

# ------------------------------------------
# forge::build_subject
# ------------------------------------------
forge::build_subject() {
    local cn="$1"
    echo "/C=${CA_COUNTRY}/ST=${CA_STATE}/L=${CA_LOCALITY}/O=${CA_ORGANIZATION}/OU=${CA_ORGANIZATIONAL_UNIT}/CN=${cn}"
}

# ------------------------------------------
# forge::generate_rsa_key
# ------------------------------------------
forge::generate_rsa_key() {
    local keyfile="$1"
    local bits="$2"
    echo "[certsmith-forge]   Generating RSA ${bits}-bit key..."
    openssl genpkey -algorithm RSA -pkeyopt "rsa_keygen_bits:${bits}" -out "${keyfile}" 2>/dev/null
    chmod 600 "${keyfile}"
}

# ------------------------------------------
# forge::generate_ec_key
# ------------------------------------------
forge::generate_ec_key() {
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
