// Certsmith CLI - Environment Parser
// Loads and validates required environment variables from .env

import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface CertsmithEnv {
  domains: string[];
  primaryDomain: string;
  cloudflareApiToken?: string;
  cloudflareAccountId?: string;
  cloudflareTunnelId?: string;
  cloudflareZoneId?: string;
  caPoolPath: string;
  containerName: string;
}

/**
 * Locate the .env file by checking cwd and walking upwards, falling back to package root.
 */
function findEnvPath(): string {
  // Check process.cwd() first (standard CLI runtime context)
  const cwdCandidate = resolve(process.cwd(), '.env');
  if (existsSync(cwdCandidate)) return cwdCandidate;

  // Walk up from process.cwd()
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Fallback: walk up from package location
  const baseDir = typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));

  dir = baseDir;
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return cwdCandidate;
}

/**
 * Validate and extract Cloudflare credentials from environment.
 * Throws descriptive error if any Cloudflare variable is missing.
 */
export function requireCloudflareEnv(env: CertsmithEnv): {
  apiToken: string;
  accountId: string;
  tunnelId: string;
  zoneId: string;
} {
  if (!env.cloudflareApiToken) throw new Error('Missing required CLOUDFLARE_API_TOKEN in .env');
  if (!env.cloudflareAccountId) throw new Error('Missing required CLOUDFLARE_ACCOUNT_ID in .env');
  if (!env.cloudflareTunnelId) throw new Error('Missing required CLOUDFLARE_TUNNEL_ID in .env');
  if (!env.cloudflareZoneId) throw new Error('Missing required CLOUDFLARE_ZONE_ID in .env');

  return {
    apiToken: env.cloudflareApiToken,
    accountId: env.cloudflareAccountId,
    tunnelId: env.cloudflareTunnelId,
    zoneId: env.cloudflareZoneId,
  };
}

/**
 * Load and parse required environment variables.
 * Domains are required for any operation; Cloudflare vars are optional until CF engine is used.
 */
export function loadEnv(): CertsmithEnv {
  const envPath = findEnvPath();
  config({ path: envPath });

  const raw = process.env.CERTSMITH_DOMAINS ?? process.env.CERTSMITH_DOMAIN ?? '';
  const domains = raw.split(',').map((d) => d.trim()).filter(Boolean);

  if (domains.length === 0) {
    throw new Error('Missing CERTSMITH_DOMAINS in .env - at least one domain is required.');
  }

  return {
    domains,
    primaryDomain: domains[0],
    cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN,
    cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    cloudflareTunnelId: process.env.CLOUDFLARE_TUNNEL_ID,
    cloudflareZoneId: process.env.CLOUDFLARE_ZONE_ID,
    caPoolPath: process.env.CA_POOL_PATH ?? '/opt/certsmith/data/root/root_ca.crt',
    containerName: process.env.CERTSMITH_CONTAINER ?? 'certsmith',
  };
}
