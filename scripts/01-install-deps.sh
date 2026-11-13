#!/usr/bin/env bash
# ==========================================
# 01-install-deps.sh
# ==========================================
# Installs all system dependencies required by Certsmith
# on debian:trixie-slim. Called during Docker build only.
#
# Dependencies:
#   - curl:           Download step-ca binary & NodeSource setup
#   - ca-certificates: TLS trust store for curl
#   - gnupg:          Keyring management for external repositories
#   - nodejs:         Node.js 24 LTS via NodeSource for Next.js web service
#   - nginx-light:    Lightweight reverse proxy
#   - libcap2-bin:    setcap for binding to privileged ports without root
#   - gettext-base:   envsubst for templating config files
#   - procps:         ps command for process supervision
# ==========================================

set -euo pipefail

echo "[certsmith] Installing system dependencies..."

apt-get update -qq

# Install base tools for repository setup
apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg

# Setup official NodeSource Node.js 24.x repository
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -

# Install runtime dependencies including official Node.js 24
apt-get install -y --no-install-recommends \
    nginx-light \
    libnginx-mod-http-headers-more-filter \
    libcap2-bin \
    gettext-base \
    procps \
    nodejs

echo "[certsmith] System dependencies installed."
