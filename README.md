# Certsmith

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&size=22&duration=3000&pause=1000&color=3B82F6&center=true&vCenter=true&width=650&lines=All-in-One+Private+CA+Appliance;6-Tier+ACME+PKI+with+step-ca+%26+Nginx;Zero-Runtime+Trust+Portal+with+React+Router;Offline+Root+Ceremony+%26+Air-Gapped+Security" alt="Certsmith Subtitle" />
</p>

<p align="center">
  <a href="https://github.com/certsmith/certsmith/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="License: MIT" />
  </a>
  <img src="https://img.shields.io/badge/docker-automated_build-2496ED.svg?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Appliance" />
  <img src="https://img.shields.io/badge/engine-step--ca_ACME-4F46E5.svg?style=for-the-badge" alt="step-ca ACME" />
  <img src="https://img.shields.io/badge/proxy-Nginx_1.26+-009639.svg?style=for-the-badge&logo=nginx&logoColor=white" alt="Nginx Reverse Proxy" />
  <img src="https://img.shields.io/badge/portal-React_Router_SSG-CA4245.svg?style=for-the-badge&logo=react&logoColor=white" alt="React Router SSG" />
  <img src="https://img.shields.io/badge/styling-Tailwind_CSS_v4-06B6D4.svg?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
</p>

<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=docker,nginx,react,ts,tailwind,linux,bash" alt="Technology Stack" />
  </a>
</p>

---

## Overview

Certsmith is an enterprise-grade, all-in-one private Certificate Authority (CA) appliance and Trust Portal. It bundles six independent `step-ca` ACME v2 daemons, an Nginx reverse proxy with dual RSA/ECC TLS termination, and a pre-rendered static Trust Portal web interface inside a single hardened Debian-based container.

Designed for internal infrastructures, homelabs, staging environments, and hybrid cloud topologies, Certsmith enforces rigorous cryptographic isolation: the Root CA is generated completely offline via an air-gapped ceremony, while the operational container handles automated certificate enrollment through standardized ACME v2 protocol endpoints.

---

## Architectural Hierarchy

Certsmith segregates issuance policies across six dedicated intermediate tiers beneath an offline Root CA:

```
                          +-------------------------------------+
                          |        Offline Root CA (G1)         |
                          |          RSA 4096-bit               |
                          |        Validity: 30 Years           |
                          +------------------+------------------+
                                             |
             +-------------------------------+-------------------------------+
             |                                                               |
  [ RSA Issuing Authorities ]                                     [ ECC Issuing Authorities ]
+-----------------------------------+                           +-----------------------------------+
| CR1: RSA 4096-bit (Port 9101)     |                           | CE1: ECDSA P-384 (Port 9201)      |
| Maximum Security / Long Term      |                           | High Assurance Elliptic Curve     |
+-----------------------------------+                           +-----------------------------------+
| CR2: RSA 3072-bit (Port 9102)     |                           | CE2: ECDSA P-256 (Port 9202)      |
| Enterprise Standard               |                           | Modern Default / Fast             |
+-----------------------------------+                           +-----------------------------------+
| CR3: RSA 2048-bit (Port 9103)     |                           | CE3: ECDSA P-521 (Port 9203)      |
| High Performance / Compatibility  |                           | Ultra-Grade Elliptic Curve        |
+-----------------------------------+                           +-----------------------------------+
```

### Issuing Tier Specifications

| Tier ID | Algorithm | Key Parameters | Port | Default Lifetime | Target Workload |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CR1** | RSA | 4096-bit | 9101 | 20 Years | Maximum security, long-lived infrastructure, root anchors |
| **CR2** | RSA | 3072-bit | 9102 | 15 Years | Enterprise production workloads, corporate web servers |
| **CR3** | RSA | 2048-bit | 9103 | 10 Years | Legacy systems, high-throughput microservices |
| **CE1** | ECDSA | P-384 / secp384r1 | 9201 | 18 Years | High-assurance government/financial standards |
| **CE2** | ECDSA | P-256 / secp256r1 | 9202 | 13 Years | Modern cloud-native default, edge routers, mobile clients |
| **CE3** | ECDSA | P-521 / secp521r1 | 9203 | 20 Years | Maximum-strength asymmetric elliptic curve workloads |

---

## Key Features

- **Offline Key Ceremony**: The Root CA key material is generated outside the operational container using `tools/certsmith-forge.sh`. The root private key can remain air-gapped once intermediate certificates and initial portal certificates are signed.
- **Multi-Domain & Wildcard SAN Support**: Configure multiple hostnames and wildcard SANs via `CERTSMITH_DOMAINS` (comma-separated). The first domain serves as the primary Subject CN, while all specified domains and wildcards are automatically populated into Nginx `server_name`, step-ca `dnsNames`, and dual-stack portal TLS SANs. Fully backward-compatible with legacy `CERTSMITH_DOMAIN`.
- **6-Tier ACME Isolation**: Each tier runs an independent `step-ca` process bound to local loopback ports with its own dedicated intermediate key, certificate, and configuration.
- **Dual-Certificate Reverse Proxy**: Nginx terminates HTTPS using both RSA (4096-bit) and ECC (P-256) certificates simultaneously, negotiating optimal cipher suites dynamically.
- **Zero-Runtime Trust Portal**: Built with React Router 8 and Tailwind CSS v4, compiled to static HTML via Static Site Generation (SSG) in a multi-stage Docker build. No Node.js runtime or JavaScript server process exists in the runtime container.
- **Fail-Fast Configuration**: Strict environment variable auditing via `scripts/entrypoint.sh`. Missing or empty variables abort container initialization immediately without dangerous implicit fallbacks.
- **Unified 3-Tier Error Handling**: Comprehensive status handling spanning Nginx static upstream fallbacks, React Router client-side error boundaries, and dedicated guide lookup routes.

---

## Directory Structure

```
certsmith/
├── .dockerignore
├── .env.example              # Template containing all mandatory configuration variables
├── .gitignore
├── Dockerfile                # Multi-stage build (Node 24 Alpine SSG builder -> Debian runtime)
├── LICENSE                   # MIT License
├── README.md                 # Root technical documentation
├── configs/
│   ├── certsmith-vhost.template.conf  # Nginx virtual host configuration template
│   └── nginx.conf            # Base Nginx master configuration
├── data/                     # Mounted runtime volume (Keys, certificates, step-ca databases)
│   ├── challenges/           # ACME HTTP-01 challenge directories
│   ├── intermediates/        # Intermediate CA key pairs (cr1-cr3, ce1-ce3)
│   ├── root/                 # Root CA public certificate and serial records
│   ├── step-ca/              # Per-tier step-ca configuration and database files
│   └── tls/                  # Portal TLS certificates (RSA + ECC dual stack)
├── scripts/
│   ├── 01-install-deps.sh    # Base package dependencies installer
│   ├── 02-install-step-ca.sh # step-ca binary installation
│   ├── 03-setup-user.sh      # System user and privilege isolation
│   ├── 04-cleanup.sh         # Image layer minimization
│   ├── entrypoint.sh         # Modular runtime orchestrator
│   └── entrypoint/           # Modular runtime routines
│       ├── 00-utils.sh       # Shared helpers, env parsing, cert generators
│       ├── 01-validate-env.sh# Fail-fast environment variable auditing
│       ├── 02-generate-step-ca.sh # step-ca config & password generation
│       ├── 03-portal-tls.sh  # Dynamic portal TLS generation with SAN audit
│       ├── 04-generate-nginx.sh   # Nginx template expansion
│       └── 05-supervise.sh   # Multi-process supervisor (step-ca + Nginx)
├── tools/
│   ├── certsmith-forge.sh    # Modular offline PKI orchestrator
│   ├── lib/                  # Offline ceremony modules
│   │   ├── common.sh         # Shared forge utilities, colors, validations
│   │   ├── forge-root.sh     # Offline Root CA generation
│   │   ├── forge-intermediates.sh # 6-tier Intermediate CA generation
│   │   ├── forge-portal-tls.sh # Dual-stack portal TLS generation
│   │   └── forge-verify.sh   # OpenSSL certificate chain verification
│   └── test-issuance.sh      # ACME end-to-end issuance validation script
└── web/                      # Trust Portal source (React Router 8, Tailwind v4, Shadcn)
    ├── app/
    ├── public/
    └── package.json
```

---

## Quick Start

### 1. Configure Environment

Copy the configuration template:

```bash
cp .env.example .env
```

Edit `.env` to define your domain(s), subject DNs, key lengths, and validity periods:
- `CERTSMITH_DOMAINS`: Comma-separated list of domains and wildcard SANs (e.g. `acme.example.com,acme.internal,*.example.com`). The first domain becomes the primary Subject CN.
- Legacy `CERTSMITH_DOMAIN` is also supported for single-domain setups.
- Every variable in `.env` is mandatory.

### 2. Execute Offline Key Ceremony

Run the forge tool locally to generate the Root CA, all 6 intermediate CA pairs, and the dual-stack portal TLS certificates:

```bash
chmod +x tools/certsmith-forge.sh
./tools/certsmith-forge.sh .env ./data
```

### 3. Air-Gap the Root Private Key

For production security, extract and store the Root CA private key in secure offline storage:

```bash
# Backup root private key to offline storage
cp ./data/root/root_ca.key /path/to/offline/secure/storage/

# Remove root private key from the deployment volume
rm ./data/root/root_ca.key
```

The runtime container only requires `root_ca.crt` to serve trust anchors to clients.

### 4. Build and Run the Appliance

Build the multi-stage Docker image:

```bash
docker build -t certsmith:latest .
```

Launch the container:

```bash
docker run -d \
  --name certsmith \
  --env-file .env \
  -p 80:80 \
  -p 443:443 \
  -v "$(pwd)/data:/data" \
  --restart unless-stopped \
  certsmith:latest
```

---

## ACME Endpoints

Once running, Certsmith routes ACME directory requests via path-based reverse proxying across any configured domain (or your primary domain `<PRIMARY_DOMAIN>`):

| Tier | Directory URL |
| :--- | :--- |
| **CR1** (RSA 4096) | `https://<PRIMARY_DOMAIN>/acme/cr1/directory` |
| **CR2** (RSA 3072) | `https://<PRIMARY_DOMAIN>/acme/cr2/directory` |
| **CR3** (RSA 2048) | `https://<PRIMARY_DOMAIN>/acme/cr3/directory` |
| **CE1** (ECDSA P-384) | `https://<PRIMARY_DOMAIN>/acme/ce1/directory` |
| **CE2** (ECDSA P-256) | `https://<PRIMARY_DOMAIN>/acme/ce2/directory` |
| **CE3** (ECDSA P-521) | `https://<PRIMARY_DOMAIN>/acme/ce3/directory` |

Public Trust Portal and Certificate Download:
- Web Portal: `https://<PRIMARY_DOMAIN>/` (or any configured SAN domain)
- Root Certificate: `https://<PRIMARY_DOMAIN>/root_ca.crt`
- Health Checks: `https://<PRIMARY_DOMAIN>/health` and `https://<PRIMARY_DOMAIN>/healthz`

> [!NOTE]
> All endpoints are simultaneously accessible via any hostname specified in `CERTSMITH_DOMAINS` and matching wildcard SANs.

---

## Client Integration Examples

### Certbot

```bash
certbot certonly \
  --standalone \
  --server https://<CERTSMITH_DOMAIN>/acme/ce2/directory \
  -d app.internal.example.com
```

### Lego

```bash
lego \
  --server https://<CERTSMITH_DOMAIN>/acme/ce2/directory \
  --email admin@example.com \
  --domains app.internal.example.com \
  --http \
  run
```

### Caddy (`Caddyfile`)

```caddyfile
app.internal.example.com {
    tls {
        ca https://<CERTSMITH_DOMAIN>/acme/ce2/directory
        ca_root /etc/ssl/certs/root_ca.crt
    }
    reverse_proxy localhost:8080
}
```

### acme.sh

```bash
acme.sh --issue \
  -d app.internal.example.com \
  --standalone \
  --server https://<CERTSMITH_DOMAIN>/acme/ce2/directory
```

---

## Health and Diagnostics

Certsmith includes automated testing utilities to verify ACME challenge validation and certificate issuance:

```bash
chmod +x tools/test-issuance.sh
./tools/test-issuance.sh .env
```

Container logs can be monitored with:

```bash
docker logs -f certsmith
```

---

## Standalone Deployment & Migration Guide

Certsmith is deliberately designed to run as a **standalone container without Docker Compose**, maximizing portability across Proxmox LXC, Docker hosts, VMs, and bare-metal environments.

### 1. Target Directory & Working Convention
Recommended deployment directory on the target host: `/opt/certsmith`

```bash
ssh user@target-host "mkdir -p /opt/certsmith/data"
```

### 2. Configuration Preparation (Local Edit, Remote Transfer)
Always prepare your production `.env` locally before copying to the remote target host:

```bash
# 1. Prepare .env locally with target domains (including internal homelab FQDNs and wildcards)
# e.g. CERTSMITH_DOMAINS=acme.internal.lan,*.internal.lan,*.example.com

# 2. Securely transfer to target host
scp .env user@target-host:/opt/certsmith/.env
ssh user@target-host "chmod 600 /opt/certsmith/.env"
```

### 3. Preserving PKI Materials (`data/`) During Migration
To migrate an active instance or staged CA ceremony without regenerating keys or breaking existing client trusts:

```bash
# Stop local container to flush state
docker stop certsmith

# Sync PKI data preserving permissions and timestamps
rsync -avzP data/ user@target-host:/opt/certsmith/data/
ssh user@target-host "chmod -R 700 /opt/certsmith/data/root /opt/certsmith/data/intermediates 2>/dev/null || true"
```

> [!TIP]
> **Zero-Downtime TLS Re-issuance**: When migrating to new hostnames or IP addresses, the Certsmith container automatically detects changes in `CERTSMITH_DOMAINS` upon startup, dynamically re-issuing portal TLS certificates signed by your existing Intermediate CAs without touching or invalidating the Root CA.

### 4. Image Deployment & Standalone Container Launch

You can run the container using pre-built images from GitHub Container Registry or by transferring a locally built image:

#### Option A: Run from GitHub Container Registry (GHCR)
```bash
ssh user@target-host "docker run -d \
  --name certsmith \
  --restart unless-stopped \
  -p 80:80 \
  -p 443:443 \
  --env-file /opt/certsmith/.env \
  -v /opt/certsmith/data:/data \
  ghcr.io/certsmith/certsmith:latest"
```

#### Option B: Direct Docker Image Streaming (Offline / Direct SSH)
```bash
docker save certsmith:latest | ssh user@target-host "docker load"
ssh user@target-host "docker run -d \
  --name certsmith \
  --restart unless-stopped \
  -p 80:80 \
  -p 443:443 \
  --env-file /opt/certsmith/.env \
  -v /opt/certsmith/data:/data \
  certsmith:latest"
```

### 5. Verification on Target Host
```bash
# Verify container startup and daemon status
ssh user@target-host "docker logs certsmith"

# Verify TLS portal and ACME directory
curl -k -I https://<TARGET_HOST_OR_IP>/health
curl -k -s https://<TARGET_HOST_OR_IP>/acme/cr1/directory | jq .
```

---

## Security Principles

- **Separation of Concerns**: Each intermediate CA runs as a separate daemon under a dedicated unprivileged user (`certsmith`).
- **Cryptographic Independence**: Compromise of an individual intermediate key does not invalidate other issuing tiers.
- **Minimal Attack Surface**: The production image contains no development tooling, compilers, or Node.js runtimes.
- **Fail-Fast Initialization**: Any missing configuration parameter halts initialization before any port is opened or key loaded.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for complete details.
