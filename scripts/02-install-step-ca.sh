#!/usr/bin/env bash
# ==========================================
# 02-install-step-ca.sh
# ==========================================
# Downloads and installs the official step-ca binary
# from Smallstep's GitHub Releases.
#
# Expects build ARG:
#   STEP_CA_VERSION  (e.g. 0.30.2)
#
# Architecture is auto-detected from dpkg.
# ==========================================

set -euo pipefail

STEP_CA_VERSION="${STEP_CA_VERSION:?STEP_CA_VERSION build arg is required}"

# Detect architecture
ARCH=$(dpkg --print-architecture)
case "${ARCH}" in
    amd64) STEP_ARCH="amd64" ;;
    arm64) STEP_ARCH="arm64" ;;
    *)
        echo "[certsmith] ERROR: Unsupported architecture: ${ARCH}"
        exit 1
        ;;
esac

DOWNLOAD_URL="https://github.com/smallstep/certificates/releases/download/v${STEP_CA_VERSION}/step-ca_linux_${STEP_CA_VERSION}_${STEP_ARCH}.tar.gz"

echo "[certsmith] Downloading step-ca v${STEP_CA_VERSION} (${STEP_ARCH})..."
echo "[certsmith] URL: ${DOWNLOAD_URL}"

curl -fsSL "${DOWNLOAD_URL}" -o /tmp/step-ca.tar.gz

echo "[certsmith] Extracting step-ca..."
tar -xzf /tmp/step-ca.tar.gz -C /tmp/

# The tarball extracts to a directory; find the binary
STEP_CA_BIN=$(find /tmp -name "step-ca" -type f -executable 2>/dev/null | head -1)
if [ -z "${STEP_CA_BIN}" ]; then
    # Binary might not have execute bit in tarball; search by name
    STEP_CA_BIN=$(find /tmp -name "step-ca" -type f 2>/dev/null | head -1)
fi

if [ -z "${STEP_CA_BIN}" ]; then
    echo "[certsmith] ERROR: step-ca binary not found in tarball."
    echo "[certsmith] Tarball contents:"
    tar -tzf /tmp/step-ca.tar.gz
    exit 1
fi

install -m 0755 "${STEP_CA_BIN}" /usr/local/bin/step-ca

# Verify step-ca installation
step-ca version || echo "[certsmith] WARNING: step-ca version check returned non-zero (may require config to run)."

# Cleanup step-ca download artifacts
rm -f /tmp/step-ca.tar.gz
rm -rf /tmp/step-ca*

echo "[certsmith] step-ca v${STEP_CA_VERSION} installed to /usr/local/bin/step-ca."

# Also install official Smallstep CLI (step) for admin operations like revocation
STEP_CLI_VERSION="${STEP_CLI_VERSION:-0.31.0}"
STEP_CLI_URL="https://github.com/smallstep/cli/releases/download/v${STEP_CLI_VERSION}/step_linux_${STEP_CLI_VERSION}_${STEP_ARCH}.tar.gz"

echo "[certsmith] Downloading step CLI v${STEP_CLI_VERSION} (${STEP_ARCH})..."
curl -fsSL "${STEP_CLI_URL}" -o /tmp/step.tar.gz
tar -xzf /tmp/step.tar.gz -C /tmp/
STEP_BIN=$(find /tmp -name "step" -type f 2>/dev/null | head -1)
if [ -n "${STEP_BIN}" ]; then
    install -m 0755 "${STEP_BIN}" /usr/local/bin/step
    step version || true
    echo "[certsmith] step CLI v${STEP_CLI_VERSION} installed to /usr/local/bin/step."
fi
rm -f /tmp/step.tar.gz
rm -rf /tmp/step*

