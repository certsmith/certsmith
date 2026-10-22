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
# ==========================================
# Phase 0a: Prune Monorepo via Turborepo
# ==========================================
FROM node:24-alpine AS pruner

WORKDIR /app

# Install turbo CLI globally for docker pruning
RUN npm install -g turbo@^2

# Copy monorepo sources and isolate @certsmith/web
COPY . .
RUN turbo prune @certsmith/web --docker

# ==========================================
# Phase 0b: Build Web UI (Node 24 Alpine)
# ==========================================
FROM node:24-alpine AS web-builder

WORKDIR /app

# Enable modern pnpm via Corepack
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate

# Layer caching for dependencies (isolated pruned package manifests & workspace lockfile)
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Copy pruned source and compile SSG static export via Turborepo
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@certsmith/web

# ==========================================
# Phase 1: Base Runtime Environment
# ==========================================
FROM debian:trixie-slim

# Pinned step-ca version (audited)
ARG STEP_CA_VERSION=0.30.2

# Non-interactive apt + base paths
ENV DEBIAN_FRONTEND=noninteractive \
    CERTSMITH_HOME=/certsmith \
    CERTSMITH_DATA=/data

WORKDIR ${CERTSMITH_HOME}

# ==========================================
# Phase 2: Install via Modular Scripts
# ==========================================
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

# ==========================================
# Phase 3: Copy Application Files
# ==========================================
# Nginx configuration templates
COPY configs/ /etc/certsmith/configs/

# Trust Portal web assets (Compiled static files from web-builder, zero Node.js runtime)
COPY --from=web-builder /app/packages/web/build/client/ /var/www/trust-portal/

# Tools (forge, test) + shared libraries
COPY tools/ /usr/local/share/certsmith/tools/
RUN chmod -R +x /usr/local/share/certsmith/tools/

# Container entrypoint + modular modules
COPY scripts/entrypoint.sh /usr/local/bin/certsmith-entrypoint
COPY scripts/entrypoint/ /usr/local/bin/entrypoint/
RUN chmod +x /usr/local/bin/certsmith-entrypoint \
    && chmod -R +x /usr/local/bin/entrypoint/

# ==========================================
# Phase 4: Container Metadata & Entrypoint
# ==========================================
EXPOSE 80 443

# Persistent volume for Root CA, intermediates, step-ca DB
VOLUME ["/data"]

ENTRYPOINT ["certsmith-entrypoint"]
CMD ["run"]
