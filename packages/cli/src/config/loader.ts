// Certsmith CLI - Configuration Loader & Resolver
// Manages hierarchical resolution: CLI Flags > Env Vars > Local Config > Global Config > Defaults

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { config as loadDotenv } from 'dotenv';
import { parseJsonc } from '@/config/jsonc';
import type { CertsmithConfig, ResolvedCertsmithContext } from '@/config/types';

/**
 * Get standard global config paths in priority order.
 */
export function getGlobalConfigPath(): string {
  const xdgConfig = process.env.XDG_CONFIG_HOME;
  if (xdgConfig) {
    return resolve(xdgConfig, 'certsmith', 'config.jsonc');
  }
  return resolve(homedir(), '.config', 'certsmith', 'config.jsonc');
}

/**
 * Get standard local config candidates in current directory and parents.
 */
export function getLocalConfigCandidates(startDir: string = process.cwd()): string[] {
  const candidates: string[] = [];
  let current = resolve(startDir);

  for (let i = 0; i < 5; i++) {
    candidates.push(resolve(current, 'certsmith.jsonc'));
    candidates.push(resolve(current, '.certsmithrc.jsonc'));
    candidates.push(resolve(current, '.certsmithrc'));
    candidates.push(resolve(current, 'certsmith.json'));
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return candidates;
}

/**
 * Resolve existing configuration file paths.
 */
export function resolveConfigPaths(): {
  globalPath: string;
  localPath: string;
  activePaths: string[];
} {
  const globalPath = getGlobalConfigPath();
  const altGlobalRc = resolve(homedir(), '.certsmithrc');
  const altGlobalJsonc = resolve(homedir(), '.certsmith.jsonc');

  const activePaths: string[] = [];

  // Check local first
  const localCandidates = getLocalConfigCandidates();
  let localPath = resolve(process.cwd(), 'certsmith.jsonc');

  for (const candidate of localCandidates) {
    if (existsSync(candidate)) {
      localPath = candidate;
      activePaths.push(candidate);
      break;
    }
  }

  // Check global
  if (existsSync(globalPath)) {
    activePaths.push(globalPath);
  } else if (existsSync(altGlobalJsonc)) {
    activePaths.push(altGlobalJsonc);
  } else if (existsSync(altGlobalRc)) {
    activePaths.push(altGlobalRc);
  }

  return { globalPath, localPath, activePaths };
}

/**
 * Read and parse a JSONC config file safely.
 */
function readConfigFile(filePath: string): CertsmithConfig {
  if (!existsSync(filePath)) return {};
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return parseJsonc<CertsmithConfig>(raw);
  } catch (err) {
    throw new Error(`Failed to parse configuration file at "${filePath}": ${(err as Error).message}`);
  }
}

/**
 * Load .env fallback if present for backwards compatibility.
 */
function loadDotenvFallback(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '..', '.env'),
    resolve(process.cwd(), '..', '..', '.env'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      loadDotenv({ path: candidate });
      break;
    }
  }
}

/**
 * Recursively merge two config objects.
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const output = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      output[key] = deepMerge(targetVal, sourceVal);
    } else if (sourceVal !== undefined) {
      output[key] = sourceVal as T[keyof T];
    }
  }
  return output;
}

/**
 * Resolve full configuration context.
 */
export function resolveConfig(options?: {
  customConfigPath?: string;
  cliOverrides?: Partial<CertsmithConfig>;
}): ResolvedCertsmithContext {
  // 1. Load legacy .env if available
  loadDotenvFallback();

  // 2. Discover files
  const { globalPath, localPath } = resolveConfigPaths();
  let globalConfig: CertsmithConfig = {};
  let localConfig: CertsmithConfig = {};
  let customConfig: CertsmithConfig = {};

  if (options?.customConfigPath) {
    if (!existsSync(options.customConfigPath)) {
      throw new Error(`Specified config file not found: ${options.customConfigPath}`);
    }
    customConfig = readConfigFile(options.customConfigPath);
  } else {
    if (existsSync(globalPath)) {
      globalConfig = readConfigFile(globalPath);
    }
    if (existsSync(localPath)) {
      localConfig = readConfigFile(localPath);
    }
  }

  // 3. Environment overrides
  const envConfig: CertsmithConfig = {};
  const envDomainsRaw = process.env.CERTSMITH_DOMAINS ?? process.env.CERTSMITH_DOMAIN;
  if (envDomainsRaw) {
    envConfig.domains = envDomainsRaw.split(',').map((d) => d.trim()).filter(Boolean);
  }

  if (
    process.env.CLOUDFLARE_API_TOKEN ||
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CLOUDFLARE_TUNNEL_ID ||
    process.env.CLOUDFLARE_ZONE_ID
  ) {
    envConfig.cloudflare = {
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      tunnelId: process.env.CLOUDFLARE_TUNNEL_ID,
      zoneId: process.env.CLOUDFLARE_ZONE_ID,
    };
  }

  if (process.env.CERTSMITH_CONTAINER) {
    envConfig.docker = {
      containerName: process.env.CERTSMITH_CONTAINER,
    };
  }

  if (process.env.CA_POOL_PATH) {
    envConfig.pki = {
      caPoolPath: process.env.CA_POOL_PATH,
    };
  }

  // 4. Merge priority: Global -> Local -> Custom -> Env -> CLI Overrides
  let merged: CertsmithConfig = {};
  merged = deepMerge(merged, globalConfig);
  merged = deepMerge(merged, localConfig);
  merged = deepMerge(merged, customConfig);
  merged = deepMerge(merged, envConfig);
  if (options?.cliOverrides) {
    merged = deepMerge(merged, options.cliOverrides);
  }

  const domains = merged.domains ?? [];
  const primaryDomain = domains.length > 0 ? domains[0] : '';

  return {
    domains,
    primaryDomain,
    cloudflareApiToken: merged.cloudflare?.apiToken,
    cloudflareAccountId: merged.cloudflare?.accountId,
    cloudflareTunnelId: merged.cloudflare?.tunnelId,
    cloudflareZoneId: merged.cloudflare?.zoneId,
    caPoolPath: merged.pki?.caPoolPath ?? '/opt/certsmith/data/root/root_ca.crt',
    containerName: merged.docker?.containerName ?? 'certsmith',
    configPath: options?.customConfigPath ?? (existsSync(localPath) ? localPath : existsSync(globalPath) ? globalPath : undefined),
  };
}

/**
 * Generate default starter template with explanatory comments.
 */
export function generateConfigTemplate(isGlobal: boolean = false): string {
  if (isGlobal) {
    return `// Certsmith Global Configuration (~/.config/certsmith/config.jsonc)
// Place your personal credentials and global preferences here.
// DO NOT commit this file to public version control.

{
  "cloudflare": {
    // Cloudflare API Token with permissions: Zone:Read, DNS:Edit, Cloudflare Tunnel:Edit
    "apiToken": "",
    // Cloudflare Account ID (32 hex characters)
    "accountId": "",
    // Cloudflare Zero Trust Tunnel ID (UUID)
    "tunnelId": "",
    // Cloudflare Zone ID (32 hex characters)
    "zoneId": ""
  }
}
`;
  }

  return `// Certsmith Project Configuration (./certsmith.jsonc)
// Specific to this project/repository.

{
  // Primary domain is the first entry; additional SANs follow
  "domains": [
    "acme.homelab.internal"
  ],

  // Docker container settings
  "docker": {
    "containerName": "certsmith"
  },

  // PKI / step-ca certificate path
  "pki": {
    "caPoolPath": "/opt/certsmith/data/root/root_ca.crt"
  }
}
`;
}

/**
 * Save configuration to target file (creating directory if needed).
 */
export function writeConfig(filePath: string, content: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, content, 'utf-8');
}
