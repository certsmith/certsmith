# certsmith

Unified CLI Hub for Certsmith - Cloudflare SaaS, step-ca, Docker, and PKI Management.

## Installation

```bash
# Global installation via npm
npm install -g certsmith

# Or via pnpm
pnpm add -g certsmith

# Or run directly via npx
npx certsmith
```

## Features

- **Cloudflare Zero Trust & SaaS Management**: Automated Custom Hostnames, SSL verification, strict tunnel ingress rules with custom CA pool.
- **step-ca Orchestration**: Healthcheck all 6 CA tiers (CR1-CR3, CE1-CE3), inspect provisioners, and revoke certificates.
- **Docker Container Lifecycle**: Status inspections, rebuilds, container restarts, and real-time log streaming.
- **PKI Operations**: Certificate expiry auditing, OpenSSL chain verification, dual RSA/ECC leaf renewal, intermediate CA rotation, and root forge ceremony.
- **Unified Healthcheck**: Complete single-command diagnostics across all engines.

## Usage

Ensure your `.env` is configured with your Certsmith environment variables:

```bash
certsmith
```

## License

MIT © 2026 Certsmith Authors (dyzulk)
