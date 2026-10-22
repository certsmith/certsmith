#!/usr/bin/env bash
# ==========================================
# certsmith-forge.sh — Offline Key Ceremony Tool (Orchestrator)
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

# Resolve library directory relative to this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/lib"

# Load modules
source "${LIB_DIR}/common.sh"
source "${LIB_DIR}/forge-root.sh"
source "${LIB_DIR}/forge-intermediates.sh"
source "${LIB_DIR}/forge-verify.sh"
source "${LIB_DIR}/forge-portal-tls.sh"

# ------------------------------------------
# Phase 0: Validate ALL required variables
# ------------------------------------------
echo "[certsmith-forge] =========================================="
echo "[certsmith-forge] Phase 0: Validating .env configuration"
echo "[certsmith-forge] =========================================="

# Base DN
forge::require_env CA_COUNTRY
forge::require_env CA_STATE
forge::require_env CA_LOCALITY
forge::require_env CA_ORGANIZATION
forge::require_env CA_ORGANIZATIONAL_UNIT

# Root CA
forge::require_env ROOT_CA_CN
forge::require_env ROOT_CA_KEY_TYPE
forge::require_env ROOT_CA_KEY_BITS
forge::require_env ROOT_CA_VALIDITY_YEARS

# All intermediates
for tier in CR1 CR2 CR3; do
    forge::require_env "${tier}_CN"
    forge::require_env "${tier}_KEY_TYPE"
    forge::require_env "${tier}_KEY_BITS"
    forge::require_env "${tier}_VALIDITY_YEARS"
    forge::require_env "${tier}_PORT"
done

for tier in CE1 CE2 CE3; do
    forge::require_env "${tier}_CN"
    forge::require_env "${tier}_KEY_TYPE"
    forge::require_env "${tier}_KEY_CURVE"
    forge::require_env "${tier}_VALIDITY_YEARS"
    forge::require_env "${tier}_PORT"
done

echo "[certsmith-forge] All variables validated."

# Parse domains and sanitize DN
forge::parse_domains
forge::sanitize_dn_vars

# ------------------------------------------
# Execute Pipeline
# ------------------------------------------
forge::generate_root_ca
forge::generate_all_intermediates
forge::verify_chains
forge::generate_portal_tls

# ------------------------------------------
# Summary
# ------------------------------------------
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
