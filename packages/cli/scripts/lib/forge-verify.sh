#!/usr/bin/env bash
# ==========================================
# forge-verify.sh — Chain Verification
# ==========================================
# Provides: forge::verify_chains
# Depends:  common.sh, forge-root.sh (ROOT_CRT)
# ==========================================

# ------------------------------------------
# forge::verify_tier
# ------------------------------------------
forge::verify_tier() {
    local tier="$1"
    local local_crt="${DATA_DIR}/intermediates/${tier}/intermediate_ca.crt"
    echo ""
    echo "[certsmith-forge] --- ${tier^^} Intermediate ---"
    openssl x509 -in "${local_crt}" -noout -subject -issuer -dates

    # Verify chain
    if openssl verify -CAfile "${ROOT_CRT}" "${local_crt}" > /dev/null 2>&1; then
        echo "[certsmith-forge] ✓ Chain verification PASSED for ${tier^^}."
    else
        echo "[certsmith-forge] ✗ Chain verification FAILED for ${tier^^}!"
        exit 1
    fi
}

# ------------------------------------------
# forge::verify_chains
# ------------------------------------------
forge::verify_chains() {
    echo ""
    echo "[certsmith-forge] =========================================="
    echo "[certsmith-forge] Phase 3: Verification"
    echo "[certsmith-forge] =========================================="

    echo ""
    echo "[certsmith-forge] --- Root CA ---"
    openssl x509 -in "${ROOT_CRT}" -noout -subject -issuer -dates

    for tier in cr1 cr2 cr3 ce1 ce2 ce3; do
        forge::verify_tier "${tier}"
    done
}

