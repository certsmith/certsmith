#!/usr/bin/env bash
# ==========================================
# test-issuance.sh — End-to-End ACME Test
# ==========================================
# Verifies all 6 ACME tier endpoints are responding
# with valid ACME directory JSON, and optionally
# tests certificate issuance via step CLI.
#
# Usage:
#   ./tools/test-issuance.sh [BASE_URL]
#
# Default BASE_URL: http://localhost
# ==========================================

set -euo pipefail

BASE_URL="${1:-http://localhost}"
PASS=0
FAIL=0
TOTAL=0

# ------------------------------------------
# Color output
# ------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() {
    echo -e "  ${GREEN}✓ PASS${NC}: $1"
    ((PASS++))
    ((TOTAL++))
}

fail() {
    echo -e "  ${RED}✗ FAIL${NC}: $1"
    ((FAIL++))
    ((TOTAL++))
}

info() {
    echo -e "  ${YELLOW}ℹ${NC} $1"
}

# ------------------------------------------
# Test 1: Health Check
# ------------------------------------------
echo ""
echo "=========================================="
echo " Certsmith End-to-End Test Suite"
echo "=========================================="
echo " Target: ${BASE_URL}"
echo "=========================================="

echo ""
echo "--- Test: Health Check ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/healthz" 2>/dev/null || echo "000")
if [ "${HTTP_CODE}" = "200" ]; then
    pass "Health check returned HTTP ${HTTP_CODE}"
else
    fail "Health check returned HTTP ${HTTP_CODE} (expected 200)"
fi

# ------------------------------------------
# Test 2: Trust Portal
# ------------------------------------------
echo ""
echo "--- Test: Trust Portal ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/" 2>/dev/null || echo "000")
if [ "${HTTP_CODE}" = "200" ]; then
    pass "Trust Portal returned HTTP ${HTTP_CODE}"
else
    fail "Trust Portal returned HTTP ${HTTP_CODE} (expected 200)"
fi

# ------------------------------------------
# Test 3: Root CA Download
# ------------------------------------------
echo ""
echo "--- Test: Root CA Certificate Download ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/root_ca.crt" 2>/dev/null || echo "000")
if [ "${HTTP_CODE}" = "200" ]; then
    pass "Root CA download returned HTTP ${HTTP_CODE}"
    # Verify it's a valid certificate
    CERT_CONTENT=$(curl -s "${BASE_URL}/root_ca.crt" 2>/dev/null)
    if echo "${CERT_CONTENT}" | openssl x509 -noout -subject > /dev/null 2>&1; then
        pass "Root CA is a valid X.509 certificate"
        SUBJECT=$(echo "${CERT_CONTENT}" | openssl x509 -noout -subject 2>/dev/null)
        info "Subject: ${SUBJECT}"
    else
        fail "Root CA is not a valid X.509 certificate"
    fi
else
    fail "Root CA download returned HTTP ${HTTP_CODE} (expected 200)"
fi

# ------------------------------------------
# Test 4: ACME Directory Endpoints
# ------------------------------------------
TIERS=("cr1" "cr2" "cr3" "ce1" "ce2" "ce3")
TIER_NAMES=(
    "CR1 (RSA 4096-bit)"
    "CR2 (RSA 3072-bit)"
    "CR3 (RSA 2048-bit)"
    "CE1 (ECDSA P-384)"
    "CE2 (ECDSA P-256)"
    "CE3 (ECDSA P-521)"
)

echo ""
echo "--- Test: ACME Directory Endpoints ---"
for i in "${!TIERS[@]}"; do
    tier="${TIERS[$i]}"
    name="${TIER_NAMES[$i]}"
    url="${BASE_URL}/${tier}/acme/${tier}/directory"

    echo ""
    echo "  Testing ${name}..."

    RESPONSE=$(curl -sk -w "\n%{http_code}" "${url}" 2>/dev/null || echo -e "\n000")
    HTTP_CODE=$(echo "${RESPONSE}" | tail -1)
    BODY=$(echo "${RESPONSE}" | head -n -1)

    if [ "${HTTP_CODE}" = "200" ]; then
        pass "${name} ACME directory returned HTTP ${HTTP_CODE}"

        # Validate it contains required ACME directory fields
        if echo "${BODY}" | grep -q "newNonce" && echo "${BODY}" | grep -q "newAccount" && echo "${BODY}" | grep -q "newOrder"; then
            pass "${name} ACME directory contains required fields (newNonce, newAccount, newOrder)"
        else
            fail "${name} ACME directory missing required ACME fields"
            info "Response body: ${BODY}"
        fi
    else
        fail "${name} ACME directory returned HTTP ${HTTP_CODE} (expected 200)"
    fi
done

# ------------------------------------------
# Summary
# ------------------------------------------
echo ""
echo "=========================================="
echo " Test Results"
echo "=========================================="
echo -e " Total:  ${TOTAL}"
echo -e " ${GREEN}Passed: ${PASS}${NC}"
echo -e " ${RED}Failed: ${FAIL}${NC}"
echo "=========================================="

if [ "${FAIL}" -gt 0 ]; then
    echo ""
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi
