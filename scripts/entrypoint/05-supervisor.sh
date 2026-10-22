#!/usr/bin/env bash
# ==========================================
# 05-supervisor.sh — Process Supervisor & Signal Handler
# ==========================================
# Provides: supervisor::start_step_ca, supervisor::start_nginx,
#           supervisor::start_all, supervisor::shutdown, supervisor::monitor
# ==========================================

PIDS=()

# ------------------------------------------
# supervisor::start_step_ca
# ------------------------------------------
supervisor::start_step_ca() {
    local tier="$1"
    local tier_data="${CERTSMITH_DATA}/step-ca/${tier}"
    local ca_config="${tier_data}/ca.json"
    local password_file="${tier_data}/password.txt"

    echo "[certsmith] Starting step-ca daemon for ${tier^^}..."
    step-ca "${ca_config}" --password-file="${password_file}" &
    local pid=$!
    PIDS+=("${pid}")
    echo "[certsmith] step-ca ${tier^^} started (PID: ${pid})."
}

# ------------------------------------------
# supervisor::start_nginx
# ------------------------------------------
supervisor::start_nginx() {
    echo "[certsmith] Starting Nginx reverse proxy..."
    nginx -g "daemon off;" &
    local pid=$!
    PIDS+=("${pid}")
    echo "[certsmith] Nginx started (PID: ${pid})."
}

# ------------------------------------------
# supervisor::shutdown
# ------------------------------------------
# Graceful shutdown of all managed processes.
supervisor::shutdown() {
    echo ""
    echo "[certsmith] =========================================="
    echo "[certsmith] Received shutdown signal. Stopping all processes..."
    echo "[certsmith] =========================================="

    for pid in "${PIDS[@]}"; do
        if kill -0 "${pid}" 2>/dev/null; then
            echo "[certsmith] Stopping PID ${pid}..."
            kill -TERM "${pid}" 2>/dev/null || true
        fi
    done

    # Wait for all processes to exit
    for pid in "${PIDS[@]}"; do
        wait "${pid}" 2>/dev/null || true
    done

    echo "[certsmith] All processes stopped. Goodbye."
    exit 0
}

# ------------------------------------------
# supervisor::start_all
# ------------------------------------------
# Starts all 6 step-ca daemons and Nginx, prints READY banner.
supervisor::start_all() {
    echo "[certsmith] =========================================="
    echo "[certsmith] Phase 4: Starting all daemons"
    echo "[certsmith] =========================================="

    for tier in cr1 cr2 cr3 ce1 ce2 ce3; do
        supervisor::start_step_ca "${tier}"
    done

    # Small delay to let step-ca daemons initialize
    sleep 2

    supervisor::start_nginx

    echo ""
    echo "[certsmith] =========================================="
    echo "[certsmith] Certsmith is READY"
    echo "[certsmith] Primary: ${PRIMARY_DOMAIN}"
    echo "[certsmith] Domains: ${CERTSMITH_SERVER_NAMES}"
    echo "[certsmith] HTTP:    port ${CERTSMITH_PORT_HTTP}"
    echo "[certsmith] HTTPS:   port ${CERTSMITH_PORT_HTTPS}"
    echo "[certsmith] Tiers:   CR1(:${CR1_PORT}) CR2(:${CR2_PORT}) CR3(:${CR3_PORT})"
    echo "[certsmith]          CE1(:${CE1_PORT}) CE2(:${CE2_PORT}) CE3(:${CE3_PORT})"
    echo "[certsmith] =========================================="
    echo ""
}

# ------------------------------------------
# supervisor::monitor
# ------------------------------------------
# Monitors all processes and handles auto-renewal.
supervisor::monitor() {
    echo "[certsmith] =========================================="
    echo "[certsmith] Process supervisor active. Monitoring ${#PIDS[@]} processes."
    echo "[certsmith] Auto-renewal monitor active (checks every 24h)."
    echo "[certsmith] =========================================="

    local last_renew_check=$(date +%s)

    while true; do
        for pid in "${PIDS[@]}"; do
            if ! kill -0 "${pid}" 2>/dev/null; then
                echo "[certsmith] FATAL: Process ${pid} has exited unexpectedly."
                echo "[certsmith] Initiating graceful shutdown of all processes..."
                supervisor::shutdown
            fi
        done

        local now=$(date +%s)
        # Check every 24 hours (86400 seconds)
        if [ $((now - last_renew_check)) -ge 86400 ]; then
            tls::check_and_renew
            last_renew_check=${now}
        fi

        sleep 5
    done
}
