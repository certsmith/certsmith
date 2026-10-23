# certsmith

Unified CLI Hub for Certsmith - Cloudflare SaaS, step-ca, Docker, and PKI Management.

## Installation

### Global Installation

```bash
# Via npm (use sudo if your system encounters EACCES permission errors)
sudo npm install -g certsmith
# or without sudo if npm prefix is set to user space:
npm install -g certsmith

# Or via pnpm (recommended: installs to user-space without requiring sudo)
pnpm add -g certsmith
```

> [!NOTE]
> **Permission Error (`EACCES`) on Linux / macOS:**
> If you encounter `npm error code EACCES: permission denied, mkdir '/usr/lib/node_modules/certsmith'`, run the command with `sudo` (`sudo npm install -g certsmith`), or install via `pnpm add -g certsmith` which places binaries in your user directory (`~/.local/share/pnpm`).

### Direct Execution (No Installation Required)

You can also run Certsmith on-demand without installing it globally:

```bash
# Via npx
npx certsmith

# Or via pnpm dlx
pnpm dlx certsmith
```

## Features

- **Dynamic ASCII Branding**: Clean, dynamically-rendered terminal banner via `figlet`.
- **Dual Execution Engine**:
  - Direct non-interactive execution for CI/CD and scripting (e.g. `certsmith cf sync`, `certsmith docker status`).
  - Interactive menu hub when launched in terminal without arguments or via `certsmith -i`.
- **Hierarchical Configuration**: Securely store credentials in `~/.config/certsmith/config.jsonc` instead of committing them to shared `.env` files.
- **Robust Error Diagnostics & Exit Codes**: Standardized UNIX exit codes (`0` success, `1` operational failure, `2` invalid syntax, `130` user cancellation) with helpful troubleshooting guidance.

---

## Configuration Hierarchy

Certsmith resolves configuration in the following order of precedence:

1. **CLI Flags**: `--config <path>`, `--domains <list>`
2. **Environment Variables**: `CLOUDFLARE_API_TOKEN`, `CERTSMITH_DOMAINS`, etc.
3. **Local Project Config**: `./certsmith.jsonc` or `./.certsmithrc.jsonc`
4. **User Global Config**: `~/.config/certsmith/config.jsonc` (recommended for tokens/credentials)
5. **System Defaults**

### Managing Configuration via CLI

```bash
# Initialize personal global config
certsmith config init --global

# Set credentials securely
certsmith config set cloudflare.apiToken "your-api-token" --global
certsmith config set cloudflare.accountId "your-account-id" --global
certsmith config set cloudflare.tunnelId "your-tunnel-uuid" --global
certsmith config set cloudflare.zoneId "your-zone-id" --global

# Check active configuration paths
certsmith config path

# Inspect current configuration
certsmith config get
```

---

## Usage

### 1. Interactive Mode
Run `certsmith` without arguments inside an interactive terminal to launch the menu hub:
```bash
certsmith
```

### 2. Direct Subcommands (Scripted / CI)

```bash
# Cloudflare Zero Trust & SaaS
certsmith cf sync       # Sync hostnames & strict TLS ingress
certsmith cf list       # List custom hostnames
certsmith cf tunnel     # Inspect tunnel ingress rules

# step-ca Operations
certsmith ca health               # Check health of all 6 tiers
certsmith ca provisioners [tier]  # List provisioners (cr1..cr3, ce1..ce3)
certsmith ca revoke [tier]        # Revoke certificate

# Docker Operations
certsmith docker status           # Container health and running status
certsmith docker restart          # Stop, remove, and recreate container
certsmith docker build [path]     # Build image
certsmith docker logs [lines]     # Follow live logs

# PKI Operations
certsmith pki audit               # Audit expiry of root & intermediates
certsmith pki verify              # Verify full chain integrity with OpenSSL
certsmith pki renew-portal        # Renew portal leaf certificates
certsmith pki rotate              # Rotate intermediate CA
certsmith pki ceremony            # Trigger offline root forge ceremony

# Unified Full Healthcheck
certsmith health                  # Comprehensive multi-engine check
```

## License

MIT © 2026 Certsmith Authors (dyzulk)
