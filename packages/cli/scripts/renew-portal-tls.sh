#!/usr/bin/env bash
# ==========================================
# renew-portal-tls.sh — Portal TLS Leaf Renewal
# ==========================================
# Generates dual RSA + ECC portal leaf certificates
# without touching Root or Intermediate CAs.
#
# Usage:
#   renew-portal-tls.sh [envFile] [dataDir]
# ==========================================

set -euo pipefail

ENV_FILE="${1:-.env}"
DATA_DIR="${2:-./data}"

if [ ! -f "${ENV_FILE}" ]; then
    echo "[certsmith-portal] FATAL: .env file not found at '${ENV_FILE}'"
    exit 1
fi

# shellcheck source=/dev/null
source "${ENV_FILE}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/lib"

source "${LIB_DIR}/common.sh"
source "${LIB_DIR}/forge-root.sh"
source "${LIB_DIR}/forge-portal-tls.sh"

forge::parse_domains
forge::sanitize_dn_vars

ROOT_CRT="${DATA_DIR}/root/root_ca.crt"
ROOT_KEY="${DATA_DIR}/root/root_ca.key"

if [ ! -f "${ROOT_CRT}" ]; then
    echo "[certsmith-portal] FATAL: Root CA not found at '${ROOT_CRT}'"
    exit 1
fi

echo "[certsmith-portal] Regenerating Portal TLS leaf certificates..."
forge::generate_portal_tls



echo "[certsmith-portal] Portal TLS leaf certificates renewed successfully."
