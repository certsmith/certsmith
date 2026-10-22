#!/usr/bin/env bash
# ==========================================
# entrypoint.sh — Certsmith Container Entrypoint (Orchestrator)
# ==========================================
# Modular orchestrator that sources all modules and executes
# the initialization pipeline in order.
#
# Modules:
#   00-utils.sh          — Shared utilities (require_env, parse_domains, strip_quotes)
#   01-validate-env.sh   — Fail-fast .env validation
#   02-generate-step-ca.sh — step-ca ca.json generation for 6 tiers
#   03-portal-tls.sh     — Portal dual TLS cert generation & auto-renewal
#   04-generate-nginx.sh — Nginx vhost config rendering via envsubst
#   05-supervisor.sh     — Daemon launcher, signal trap, process monitor
# ==========================================

set -euo pipefail

CERTSMITH_DATA="${CERTSMITH_DATA:-/data}"
CERTSMITH_HOME="${CERTSMITH_HOME:-/certsmith}"
CONFIGS_DIR="/etc/certsmith/configs"

# Resolve module directory relative to this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULES_DIR="${SCRIPT_DIR}/entrypoint"

# Load all modules
source "${MODULES_DIR}/00-utils.sh"
source "${MODULES_DIR}/01-validate-env.sh"
source "${MODULES_DIR}/02-generate-step-ca.sh"
source "${MODULES_DIR}/03-portal-tls.sh"
source "${MODULES_DIR}/04-generate-nginx.sh"
source "${MODULES_DIR}/05-supervisor.sh"

# ------------------------------------------
# Main
# ------------------------------------------
main() {
    utils::banner

    case "${1:-run}" in
        run)
            env::validate
            stepca::generate_all_configs
            tls::ensure_portal_certs
            nginx::generate_config

            trap supervisor::shutdown SIGTERM SIGINT SIGQUIT

            supervisor::start_all
            supervisor::monitor
            ;;
        validate)
            env::validate
            echo "[certsmith] Validation passed."
            ;;
        *)
            echo "Usage: certsmith-entrypoint {run|validate}"
            exit 1
            ;;
    esac
}

main "$@"
