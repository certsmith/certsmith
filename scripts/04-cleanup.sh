#!/usr/bin/env bash
# ==========================================
# 04-cleanup.sh
# ==========================================
# Purges apt caches and temporary files to
# minimize the final Docker image size.
# ==========================================

set -euo pipefail

echo "[certsmith] Cleaning up build artifacts..."

# Remove apt package lists
rm -rf /var/lib/apt/lists/*

# Remove apt cache
apt-get clean

# Remove any leftover temp files
rm -rf /tmp/*

echo "[certsmith] Cleanup complete."
