#!/usr/bin/env bash
# ==========================================
# rotate-tier.sh — Intermediate CA Tier Rotation
# ==========================================
# Backs up the old intermediate key and certificate,
# generates a new key pair and CSR, signs it with Root CA,
# and verifies chain integrity.
#
# Usage:
#   rotate-tier.sh <tier> [envFile] [dataDir]
# ==========================================

set -euo pipefail

TIER="${1:?Tier argument required (e.g. cr1, ce2)}"
TIER_LOWER="${TIER,,}"
ENV_FILE="${2:-.env}"
DATA_DIR="${3:-./data}"

if [ ! -f "${ENV_FILE}" ]; then
    echo "[certsmith-rotate] FATAL: .env file not found at '${ENV_FILE}'"
    exit 1
fi

# shellcheck source=/dev/null
source "${ENV_FILE}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/lib"

source "${LIB_DIR}/common.sh"
source "${LIB_DIR}/forge-root.sh"
source "${LIB_DIR}/forge-intermediates.sh"
source "${LIB_DIR}/forge-verify.sh"

forge::parse_domains
forge::sanitize_dn_vars

ROOT_CRT="${DATA_DIR}/root/root_ca.crt"
ROOT_KEY="${DATA_DIR}/root/root_ca.key"

# Verify Root CA exists
if [ ! -f "${ROOT_CRT}" ] || [ ! -f "${ROOT_KEY}" ]; then
    echo "[certsmith-rotate] FATAL: Root CA not found at '${ROOT_CRT}'. Run forge ceremony first."
    exit 1
fi

INTER_DIR="${DATA_DIR}/intermediates/${TIER_LOWER}"
INTER_CRT="${INTER_DIR}/intermediate_ca.crt"
INTER_KEY="${INTER_DIR}/intermediate_ca.key"

TIMESTAMP=$(date +%s)
if [ -f "${INTER_CRT}" ]; then
    echo "[certsmith-rotate] Backing up existing ${TIER_LOWER} certificate to ${INTER_CRT}.bak.${TIMESTAMP}"
    mv "${INTER_CRT}" "${INTER_CRT}.bak.${TIMESTAMP}"
fi
if [ -f "${INTER_KEY}" ]; then
    echo "[certsmith-rotate] Backing up existing ${TIER_LOWER} key to ${INTER_KEY}.bak.${TIMESTAMP}"
    mv "${INTER_KEY}" "${INTER_KEY}.bak.${TIMESTAMP}"
fi

echo "[certsmith-rotate] Forging new Intermediate CA for ${TIER_LOWER}..."
forge::generate_intermediate "${TIER_LOWER}"

echo "[certsmith-rotate] Verifying chain for ${TIER_LOWER}..."
forge::verify_tier "${TIER_LOWER}"

if [ "${TIER_LOWER}" = "ce2" ] || [ "${TIER_LOWER}" = "cr2" ]; then
    echo "[certsmith-rotate] Tier ${TIER_LOWER^^} is an issuer for Trust Portal TLS. Regenerating Portal TLS..."
    source "${LIB_DIR}/forge-portal-tls.sh"
    forge::generate_portal_tls
fi

echo "[certsmith-rotate] Intermediate CA ${TIER_LOWER} rotation complete."

