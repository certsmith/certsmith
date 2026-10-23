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
 * Validate that Cloudflare API Token is configured.
 * This is the only strictly mandatory secret for Cloudflare operations.
 */
export function requireCloudflareToken(env: CertsmithEnv): string {
  if (!env.cloudflareApiToken) {
    throw new Error(
      `Cloudflare API Token not found.\n\n` +
      `How to fix:\n` +
      `  1. Run the interactive browser login wizard:\n` +
      `     certsmith login\n\n` +
      `  2. Or store your token in user config (~/.config/certsmith/config.jsonc):\n` +
      `     certsmith config set cloudflare.apiToken <YOUR_TOKEN> --global\n\n` +
      `  3. Or export environment variable:\n` +
      `     export CLOUDFLARE_API_TOKEN="<token>"\n`
    );
  }
  return env.cloudflareApiToken;
}

/**
 * Validate and extract Cloudflare credentials.
 * Only validates that apiToken is present; other fields can be dynamically resolved.
 */
export function requireCloudflareEnv(env: CertsmithEnv): {
  apiToken: string;
  accountId?: string;
  tunnelId?: string;
  zoneId?: string;
} {
  requireCloudflareToken(env);

  return {
    apiToken: env.cloudflareApiToken!,
    accountId: env.cloudflareAccountId,
    tunnelId: env.cloudflareTunnelId,
    zoneId: env.cloudflareZoneId,
  };
}

/**
 * Load and resolve configuration context from files and environment.
 */
export function loadEnv(customConfigPath?: string): CertsmithEnv {
  return resolveConfig({ customConfigPath });
}
