// Certsmith CLI - List Custom Hostnames (SaaS)
// Queries existing Cloudflare for SaaS custom hostnames.

import type Cloudflare from 'cloudflare';
import type { CertsmithEnv } from '@/env';
import { getClient } from '@/cloudflare/client';
import { ensureZoneId } from '@/cloudflare/resolver';
import { logInfo, logOk, logFail, logStep, logBlank } from '@/utils/logger';

export interface SaaSHostEntry {
  id: string;
  hostname: string;
  status: string;
  sslStatus: string;
  customOrigin: string | undefined;
}

/**
 * Fetch all custom hostnames from the Cloudflare zone.
 */
export async function listCustomHostnames(env: CertsmithEnv): Promise<SaaSHostEntry[]> {
  const cf = getClient(env);
  const entries: SaaSHostEntry[] = [];

  const zoneId = await ensureZoneId(env);

  logInfo('Fetching custom hostnames from Cloudflare...');

  try {
    for await (const host of cf.customHostnames.list({
      zone_id: zoneId,
    })) {
      entries.push({
        id: host.id ?? '',
        hostname: host.hostname ?? '',
        status: host.status ?? 'unknown',
        sslStatus: host.ssl?.status ?? 'unknown',
        customOrigin: host.custom_origin_server,
      });
    }

    logOk(`Found ${entries.length} custom hostname(s).`);
  } catch (err) {
    logFail(`Failed to list custom hostnames: ${(err as Error).message}`);
  }

  return entries;
}

/**
 * Print a formatted table of custom hostname entries.
 */
export function printHostnameTable(entries: SaaSHostEntry[]): void {
  logBlank();
  for (const e of entries) {
    logStep('Hostname', e.hostname);
    logStep('Status', e.status);
    logStep('SSL', e.sslStatus);
    if (e.customOrigin) logStep('Origin', e.customOrigin);
    logBlank();
  }
}
