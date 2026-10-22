#!/usr/bin/env bash
# ==========================================
# 01-install-deps.sh
# ==========================================
# Installs all system dependencies required by Certsmith
# on debian:trixie-slim. Called during Docker build only.
#
# Dependencies:
#   - curl:           Download step-ca binary
#   - ca-certificates: TLS trust store for curl
#   - nginx-light:    Lightweight reverse proxy
#   - libcap2-bin:    setcap for binding to privileged ports without root
#   - gettext-base:   envsubst for templating config files
#   - procps:         ps command for process supervision
# ==========================================

set -euo pipefail

echo "[certsmith] Installing system dependencies..."

apt-get update -qq

apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    nginx-light \
    libcap2-bin \
    gettext-base \
    procps

echo "[certsmith] System dependencies installed."
