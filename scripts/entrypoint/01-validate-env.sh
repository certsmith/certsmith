#!/usr/bin/env bash
# ==========================================
# 01-validate-env.sh — Fail-Fast .env Validation
# ==========================================
# Provides: env::validate
# Depends:  00-utils.sh (utils::require_env, utils::sanitize_dn_vars, utils::parse_domains)
# ==========================================

# ------------------------------------------
# env::validate
# ------------------------------------------
# Validates ALL required environment variables, sanitizes DN fields,
# and parses domain list.
env::validate() {
    echo "[certsmith] =========================================="
    echo "[certsmith] Phase 1: Validating environment variables"
    echo "[certsmith] =========================================="

    # Global — backward compatible: accept CERTSMITH_DOMAINS or CERTSMITH_DOMAIN
    if [ -z "${CERTSMITH_DOMAINS:-}" ] && [ -z "${CERTSMITH_DOMAIN:-}" ]; then
        echo "[certsmith] FATAL: Required environment variable 'CERTSMITH_DOMAINS' (or 'CERTSMITH_DOMAIN') is missing or empty."
        echo "[certsmith] All configuration must be provided via .env file. No fallback defaults exist."
        exit 1
    fi
    utils::require_env CERTSMITH_PORT_HTTP
    utils::require_env CERTSMITH_PORT_HTTPS

    # Base DN
    utils::require_env CA_COUNTRY
    utils::require_env CA_STATE
    utils::require_env CA_LOCALITY
    utils::require_env CA_ORGANIZATION
    utils::require_env CA_ORGANIZATIONAL_UNIT

    # Root CA
    utils::require_env ROOT_CA_CN
    utils::require_env ROOT_CA_KEY_TYPE
    utils::require_env ROOT_CA_KEY_BITS
    utils::require_env ROOT_CA_VALIDITY_YEARS

    # CR1
    utils::require_env CR1_CN
    utils::require_env CR1_KEY_TYPE
    utils::require_env CR1_KEY_BITS
    utils::require_env CR1_VALIDITY_YEARS
    utils::require_env CR1_PORT

    # CR2
    utils::require_env CR2_CN
    utils::require_env CR2_KEY_TYPE
    utils::require_env CR2_KEY_BITS
    utils::require_env CR2_VALIDITY_YEARS
    utils::require_env CR2_PORT

    # CR3
    utils::require_env CR3_CN
    utils::require_env CR3_KEY_TYPE
    utils::require_env CR3_KEY_BITS
    utils::require_env CR3_VALIDITY_YEARS
    utils::require_env CR3_PORT

    # CE1
    utils::require_env CE1_CN
    utils::require_env CE1_KEY_TYPE
    utils::require_env CE1_KEY_CURVE
    utils::require_env CE1_VALIDITY_YEARS
    utils::require_env CE1_PORT

    # CE2
    utils::require_env CE2_CN
    utils::require_env CE2_KEY_TYPE
    utils::require_env CE2_KEY_CURVE
    utils::require_env CE2_VALIDITY_YEARS
    utils::require_env CE2_PORT

    # CE3
    utils::require_env CE3_CN
    utils::require_env CE3_KEY_TYPE
    utils::require_env CE3_KEY_CURVE
    utils::require_env CE3_VALIDITY_YEARS
    utils::require_env CE3_PORT

    # Strip quotes from Subject DN variables for OpenSSL compatibility
    utils::sanitize_dn_vars

    echo "[certsmith] All environment variables validated successfully."

    # Parse domain list into arrays and primary domain
    utils::parse_domains
}
