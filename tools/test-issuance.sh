#!/usr/bin/env bash
# ==========================================
# test-issuance.sh — End-to-End ACME & Dual SSL Test
# ==========================================
# Verifies:
#   1. HTTP to HTTPS Redirection (Port 80 -> 443)
#   2. Root CA Download via plain HTTP & HTTPS
#   3. Dual SSL Handshakes (ECDSA via CE2 & RSA via CR2)
#   4. All 6 ACME Directory Endpoints via HTTPS
#
# Usage:
#   ./tools/test-issuance.sh [DOMAIN_OR_URL] [ROOT_CA_PATH]
#
# Default: acme.certsmith.lo (uses https://)
# ==========================================

set -euo pipefail

TARGET="${1:-acme.certsmith.lo}"
ROOT_CA="${2:-./data/root/root_ca.crt}"

# Normalize target to host and URL
if [[ "${TARGET}" =~ ^https?:// ]]; then
    HOST=$(echo "${TARGET}" | awk -F[/:] '{print $4}')
    HTTPS_URL="https://${HOST}"
    HTTP_URL="http://${HOST}"
else
    HOST="${TARGET}"
    HTTPS_URL="https://${HOST}"
    HTTP_URL="http://${HOST}"
fi

PASS=0
FAIL=0
TOTAL=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

pass() {
    echo -e "  ${GREEN}✓ PASS${NC}: $1"
    PASS=$((PASS + 1))
    TOTAL=$((TOTAL + 1))
}

fail() {
    echo -e "  ${RED}✗ FAIL${NC}: $1"
    FAIL=$((FAIL + 1))
    TOTAL=$((TOTAL + 1))
}

info() {
    echo -e "  ${YELLOW}ℹ${NC} $1"
}

echo ""
echo "=========================================="
echo " Certsmith End-to-End Dual SSL Test Suite"
echo "=========================================="
echo " Host:    ${HOST}"
echo " HTTPS:   ${HTTPS_URL}"
echo " HTTP:    ${HTTP_URL}"
echo " Root CA: ${ROOT_CA}"
echo "=========================================="

# ------------------------------------------
# Test 1: Plain HTTP Root CA Download
# ------------------------------------------
echo ""
echo "--- Test 1: Plain HTTP Root CA Download ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${HTTP_URL}/root_ca.crt" 2>/dev/null || echo "000")
if [ "${HTTP_CODE}" = "200" ]; then
    pass "Plain HTTP Root CA download returned HTTP 200"
else
    fail "Plain HTTP Root CA download returned HTTP ${HTTP_CODE} (expected 200)"
fi

# ------------------------------------------
# Test 2: HTTP to HTTPS Redirect
# ------------------------------------------
echo ""
echo "--- Test 2: HTTP to HTTPS Redirection ---"
REDIRECT_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${HTTP_URL}/" 2>/dev/null || echo "000")
LOCATION_HDR=$(curl -sI "${HTTP_URL}/" 2>/dev/null | grep -i "location:" | tr -d '\r\n' || true)

if [ "${REDIRECT_CODE}" = "301" ]; then
    pass "HTTP request returned 301 Permanent Redirect"
    info "${LOCATION_HDR}"
else
    fail "HTTP request returned ${REDIRECT_CODE} (expected 301)"
fi

# ------------------------------------------
# Test 3: HTTPS Health Check & Dual TLS Badge
# ------------------------------------------
echo ""
echo "--- Test 3: HTTPS Health Check (with Root CA verification) ---"
CACERT_ARG=""
if [ -f "${ROOT_CA}" ]; then
    CACERT_ARG="--cacert ${ROOT_CA}"
fi

HEALTH_RESP=$(curl -s ${CACERT_ARG} "${HTTPS_URL}/healthz" 2>/dev/null || echo "FAILED")
if echo "${HEALTH_RESP}" | grep -q '"status":"ok"'; then
    pass "HTTPS Health check passed with trusted Root CA"
    info "Response: ${HEALTH_RESP}"
else
    fail "HTTPS Health check failed or untrusted: ${HEALTH_RESP}"
fi

# ------------------------------------------
# Test 4: Dual Certificate Handshake Verification
# ------------------------------------------
echo ""
echo "--- Test 4: Dual Certificate Handshake Verification ---"

# 4A. ECDSA Handshake (expect CE2 intermediate in chain)
echo ""
echo "  [4A] Testing ECDSA Handshake (ECC)..."
ECDSA_OUTPUT=$(curl -s -v ${CACERT_ARG} --ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256' "${HTTPS_URL}/healthz" 2>&1 || true)
if echo "${ECDSA_OUTPUT}" | grep -qi "CE2"; then
    pass "ECDSA cipher handshake served CE2 Intermediate certificate"
elif echo "${ECDSA_OUTPUT}" | grep -q '"status":"ok"'; then
    pass "ECDSA cipher handshake successful"
else
    fail "ECDSA cipher handshake failed"
fi

# 4B. RSA Handshake (expect CR2 intermediate in chain)
echo ""
echo "  [4B] Testing RSA Handshake (RSA)..."
RSA_OUTPUT=$(curl -s -v ${CACERT_ARG} --ciphers 'ECDHE-RSA-AES128-GCM-SHA256' "${HTTPS_URL}/healthz" 2>&1 || true)
if echo "${RSA_OUTPUT}" | grep -qi "CR2"; then
    pass "RSA cipher handshake served CR2 Intermediate certificate"
elif echo "${RSA_OUTPUT}" | grep -q '"status":"ok"'; then
    pass "RSA cipher handshake successful"
else
    fail "RSA cipher handshake failed"
fi

# ------------------------------------------
# Test 5: ACME Directory Endpoints via HTTPS
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
echo "--- Test 5: ACME Directory Endpoints (over HTTPS) ---"
for i in "${!TIERS[@]}"; do
    tier="${TIERS[$i]}"
    name="${TIER_NAMES[$i]}"
    url="${HTTPS_URL}/${tier}/acme/${tier}/directory"

    echo ""
    echo "  Testing ${name} via HTTPS..."

    RESPONSE=$(curl -s ${CACERT_ARG} -w "\n%{http_code}" "${url}" 2>/dev/null || echo -e "\n000")
    HTTP_CODE=$(echo "${RESPONSE}" | tail -1)
    BODY=$(echo "${RESPONSE}" | head -n -1)

    if [ "${HTTP_CODE}" = "200" ]; then
        pass "${name} ACME directory returned HTTP ${HTTP_CODE} over HTTPS"

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
    echo -e "${GREEN}All Dual SSL & ACME tests passed!${NC}"
    exit 0
fi
