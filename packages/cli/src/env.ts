// Certsmith CLI - Environment & Configuration Bridge
// Resolves config via hierarchical loader and provides descriptive requirement errors.

import { resolveConfig } from '@/config/loader';
import type { ResolvedCertsmithContext } from '@/config/types';

export type CertsmithEnv = ResolvedCertsmithContext;

/**
 * Validate that at least one domain is configured.
 */
export function requireDomains(env: CertsmithEnv): string[] {
  if (!env.domains || env.domains.length === 0) {
    throw new Error(
      `No domains configured for Certsmith.\n\n` +
      `How to fix:\n` +
      `  1. Set domains in ./certsmith.jsonc:\n` +
      `     "domains": ["acme.example.com"]\n` +
      `  2. Or set via CLI command:\n` +
      `     certsmith config set domains '["acme.example.com"]'\n` +
      `  3. Or export environment variable:\n` +
      `     export CERTSMITH_DOMAINS="acme.example.com"\n`
    );
  }
  return env.domains;
}

/**
 * Validate and extract Cloudflare credentials.
 * Throws a comprehensive diagnostic error with remediation steps if any variable is missing.
 */
export function requireCloudflareEnv(env: CertsmithEnv): {
  apiToken: string;
  accountId: string;
  tunnelId: string;
  zoneId: string;
} {
  const missing: string[] = [];

  if (!env.cloudflareApiToken) missing.push('CLOUDFLARE_API_TOKEN (or cloudflare.apiToken in config)');
  if (!env.cloudflareAccountId) missing.push('CLOUDFLARE_ACCOUNT_ID (or cloudflare.accountId in config)');
  if (!env.cloudflareTunnelId) missing.push('CLOUDFLARE_TUNNEL_ID (or cloudflare.tunnelId in config)');
  if (!env.cloudflareZoneId) missing.push('CLOUDFLARE_ZONE_ID (or cloudflare.zoneId in config)');

  if (missing.length > 0) {
    throw new Error(
      `Missing required Cloudflare configuration:\n` +
      missing.map((m) => `  - ${m}`).join('\n') +
      `\n\nHow to fix:` +
      `\n  1. Store credentials securely in your user config (~/.config/certsmith/config.jsonc):` +
      `\n     certsmith config init --global` +
      `\n     certsmith config set cloudflare.apiToken <YOUR_TOKEN> --global` +
      `\n     certsmith config set cloudflare.accountId <ACCOUNT_ID> --global` +
      `\n     certsmith config set cloudflare.tunnelId <TUNNEL_ID> --global` +
      `\n     certsmith config set cloudflare.zoneId <ZONE_ID> --global` +
      `\n  2. Or export environment variables in your shell / CI:` +
      `\n     export CLOUDFLARE_API_TOKEN="<token>"` +
      `\n\nToken permission requirements:` +
      `\n  - Zone:Read (Zone Resources: All zones)` +
      `\n  - DNS:Edit (Zone Resources: All zones)` +
      `\n  - Cloudflare Tunnel:Edit (Account Resources: All accounts)` +
      `\n  - SSL and Certificates:Edit (Zone Resources: All zones)\n`
    );
  }

  return {
    apiToken: env.cloudflareApiToken!,
    accountId: env.cloudflareAccountId!,
    tunnelId: env.cloudflareTunnelId!,
    zoneId: env.cloudflareZoneId!,
  };
}

/**
 * Load and resolve configuration context from files and environment.
 */
export function loadEnv(customConfigPath?: string): CertsmithEnv {
  return resolveConfig({ customConfigPath });
}
