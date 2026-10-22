#!/usr/bin/env bash
# ==========================================
# 03-setup-user.sh
# ==========================================
# Creates the non-root 'certsmith' user and group,
# and sets up required directory structure with
# appropriate ownership and permissions.
# ==========================================

set -euo pipefail

CERTSMITH_USER="certsmith"
CERTSMITH_GROUP="certsmith"
CERTSMITH_HOME="${CERTSMITH_HOME:-/certsmith}"
CERTSMITH_DATA="${CERTSMITH_DATA:-/data}"

echo "[certsmith] Creating user '${CERTSMITH_USER}'..."

# Create system group and user (no login shell, no home creation)
groupadd --system "${CERTSMITH_GROUP}"
useradd --system \
    --gid "${CERTSMITH_GROUP}" \
    --no-create-home \
    --home-dir "${CERTSMITH_HOME}" \
    --shell /usr/sbin/nologin \
    "${CERTSMITH_USER}"

# Create directory structure
echo "[certsmith] Setting up directory structure..."

# Application root
mkdir -p "${CERTSMITH_HOME}"

# Persistent data directories (mounted as VOLUME)
mkdir -p "${CERTSMITH_DATA}/root"          # Root CA cert (public) + key ceremony artifacts
mkdir -p "${CERTSMITH_DATA}/intermediates"  # Per-intermediate dirs (cr1..ce3)
mkdir -p "${CERTSMITH_DATA}/step-ca"        # step-ca runtime configs and DB

# Per-intermediate runtime directories
for tier in cr1 cr2 cr3 ce1 ce2 ce3; do
    mkdir -p "${CERTSMITH_DATA}/intermediates/${tier}"
    mkdir -p "${CERTSMITH_DATA}/step-ca/${tier}"
done

# Nginx directories
mkdir -p /var/www/trust-portal
mkdir -p /var/log/nginx
mkdir -p /run/nginx

# Set ownership
chown -R "${CERTSMITH_USER}:${CERTSMITH_GROUP}" "${CERTSMITH_HOME}"
chown -R "${CERTSMITH_USER}:${CERTSMITH_GROUP}" "${CERTSMITH_DATA}"
chown -R "${CERTSMITH_USER}:${CERTSMITH_GROUP}" /var/www/trust-portal

# Allow nginx to be managed by certsmith user
chown -R "${CERTSMITH_USER}:${CERTSMITH_GROUP}" /var/log/nginx
chown -R "${CERTSMITH_USER}:${CERTSMITH_GROUP}" /run/nginx

# Grant step-ca the ability to bind to privileged ports (80/443) without root
setcap 'cap_net_bind_service=+ep' /usr/local/bin/step-ca || \
    echo "[certsmith] WARNING: setcap failed (may not be needed if running behind Nginx)."

echo "[certsmith] User '${CERTSMITH_USER}' and directories configured."
