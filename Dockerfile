# ==========================================
# Dockerfile — Certsmith All-in-One Image
# ==========================================
# Single-image appliance containing:
#   - 6 x step-ca ACME daemons (CR1-CR3, CE1-CE3)
#   - Nginx reverse proxy
#   - Trust Portal web UI
#
# Build:
#   docker build -t certsmith:latest .
#
# Run:
#   docker run -d --name certsmith \
#     --env-file .env \
#     -p 80:80 -p 443:443 \
#     -v certsmith-data:/data \
#     certsmith:latest
# ==========================================

FROM debian:trixie-slim

# Pinned step-ca version (audited)
ARG STEP_CA_VERSION=0.30.2

# Non-interactive apt + base paths
ENV DEBIAN_FRONTEND=noninteractive \
    CERTSMITH_HOME=/certsmith \
    CERTSMITH_DATA=/data

WORKDIR ${CERTSMITH_HOME}

# ---- Phase 1: Install via modular scripts ----
# Copy build scripts to /tmp, execute in order, then clean up
COPY scripts/01-install-deps.sh \
     scripts/02-install-step-ca.sh \
     scripts/03-setup-user.sh \
     scripts/04-cleanup.sh \
     /tmp/scripts/

RUN chmod +x /tmp/scripts/*.sh && \
    /tmp/scripts/01-install-deps.sh && \
    STEP_CA_VERSION=${STEP_CA_VERSION} /tmp/scripts/02-install-step-ca.sh && \
    /tmp/scripts/03-setup-user.sh && \
    /tmp/scripts/04-cleanup.sh && \
    rm -rf /tmp/scripts

# ---- Phase 2: Copy application files ----
# Nginx configuration templates
COPY configs/ /etc/certsmith/configs/

# Trust Portal web assets
COPY web/ /var/www/trust-portal/

# Tools (forge, test)
COPY tools/ /usr/local/share/certsmith/tools/
RUN chmod +x /usr/local/share/certsmith/tools/*.sh

# Container entrypoint
COPY scripts/entrypoint.sh /usr/local/bin/certsmith-entrypoint
RUN chmod +x /usr/local/bin/certsmith-entrypoint

# ---- Phase 3: Container metadata ----
EXPOSE 80 443

# Persistent volume for Root CA, intermediates, step-ca DB
VOLUME ["/data"]

ENTRYPOINT ["certsmith-entrypoint"]
CMD ["run"]
