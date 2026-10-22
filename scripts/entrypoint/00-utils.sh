#!/usr/bin/env bash
# ==========================================
# 00-utils.sh — Shared Utility Functions
# ==========================================
# Provides: utils::require_env, utils::strip_quotes,
#           utils::parse_domains, utils::banner
# Exports:  CERTSMITH_DOMAINS_ARRAY, PRIMARY_DOMAIN,
#           CERTSMITH_SERVER_NAMES
# ==========================================

# ------------------------------------------
# utils::require_env
# ------------------------------------------
# Validates that an environment variable is set and non-empty.
# Aborts immediately with a clear error if validation fails.
utils::require_env() {
    local var_name="$1"
    local var_value="${!var_name:-}"
    if [ -z "${var_value}" ]; then
        echo "[certsmith] FATAL: Required environment variable '${var_name}' is missing or empty."
        echo "[certsmith] All configuration must be provided via .env file. No fallback defaults exist."
        exit 1
    fi
}

# ------------------------------------------
# utils::strip_quotes
# ------------------------------------------
# Strips literal double-quote characters from a value.
# Docker --env-file passes quotes literally; OpenSSL rejects them.
utils::strip_quotes() {
    local val="$1"
    val="${val//\"/}"
    echo "${val}"
}

# ------------------------------------------
# utils::sanitize_dn_vars
# ------------------------------------------
# Strips quotes from all Subject DN environment variables.
utils::sanitize_dn_vars() {
    CA_COUNTRY="$(utils::strip_quotes "${CA_COUNTRY}")"
    CA_STATE="$(utils::strip_quotes "${CA_STATE}")"
    CA_LOCALITY="$(utils::strip_quotes "${CA_LOCALITY}")"
    CA_ORGANIZATION="$(utils::strip_quotes "${CA_ORGANIZATION}")"
    CA_ORGANIZATIONAL_UNIT="$(utils::strip_quotes "${CA_ORGANIZATIONAL_UNIT}")"
}

# ------------------------------------------
# utils::parse_domains
# ------------------------------------------
# Parses CERTSMITH_DOMAINS (comma-separated) into:
#   PRIMARY_DOMAIN           — first domain (used as Subject CN)
#   CERTSMITH_DOMAINS_ARRAY  — bash array of all domains
#   CERTSMITH_SERVER_NAMES   — space-separated (for Nginx server_name)
CERTSMITH_DOMAINS_ARRAY=()
PRIMARY_DOMAIN=""
CERTSMITH_SERVER_NAMES=""

utils::parse_domains() {
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
# utils::banner
# ------------------------------------------
utils::banner() {
    echo "============================================"
    echo "  Certsmith — Private ACME CA Appliance"
    echo "  6-Tier Multi-Algorithm Certificate Server"
    echo "============================================"
    echo ""
}
