#!/usr/bin/env bash
# ==========================================
# 04-generate-nginx.sh — Nginx Configuration Generator
# ==========================================
# Provides: nginx::generate_config
# Depends:  00-utils.sh (CERTSMITH_SERVER_NAMES)
# ==========================================

# ------------------------------------------
# nginx::generate_config
# ------------------------------------------
# Renders Nginx vhost config from template via envsubst.
nginx::generate_config() {
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
