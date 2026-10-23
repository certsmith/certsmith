// Certsmith CLI - Provisioner Viewer
// Lists ACME/JWK provisioners directly from step-ca configuration (Host or Docker).

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TierInfo } from '@/stepca/tiers';
import { containerExec } from '@/stepca/docker-exec';
import { findHostDataDir } from '@/pki/pki-paths';
import { logOk, logFail, logStep, logBlank } from '@/utils/logger';

export interface Provisioner {
  name: string;
  type: string;
}

/**
 * Fetch the list of provisioners for a specific tier by reading its ca.json.
 * Works without requiring the external `step` CLI binary inside the container.
 */
export async function listProvisioners(
  containerName: string,
  tier: TierInfo,
): Promise<Provisioner[]> {
  let rawJson = '';

  // 1. Try reading directly from host data directory
  const hostDataDir = findHostDataDir();
  if (hostDataDir) {
    const hostCaJson = resolve(hostDataDir, 'step-ca', tier.id, 'ca.json');
    if (existsSync(hostCaJson)) {
      try {
        rawJson = readFileSync(hostCaJson, 'utf-8');
      } catch {}
    }
  }

  // 2. Fallback to reading from inside container via cat
  if (!rawJson) {
    const containerResult = await containerExec(
      containerName,
      `cat /data/step-ca/${tier.id}/ca.json`,
    );
    if (containerResult.exitCode === 0) {
      rawJson = containerResult.stdout;
    } else {
      logFail(`Failed to read configuration for ${tier.label}: ${containerResult.stderr}`);
      return [];
    }
  }

  try {
    const parsed = JSON.parse(rawJson);
    const provisioners = parsed?.authority?.provisioners ?? [];
    const list: Provisioner[] = (Array.isArray(provisioners) ? provisioners : []).map(
      (p: { name?: string; type?: string }) => ({
        name: p.name ?? 'unnamed',
        type: p.type ?? 'unknown',
      }),
    );
    return list;
  } catch (err) {
    logFail(`Failed to parse ca.json provisioners for ${tier.label}: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Print provisioner list for a tier.
 */
export function printProvisioners(tier: TierInfo, provisioners: Provisioner[]): void {
  logBlank();
  logOk(`Provisioners for ${tier.label}:`);
  for (const prov of provisioners) {
    logStep(prov.name, prov.type);
  }
  if (provisioners.length === 0) {
    logStep('(none)', 'No provisioners found');
  }
  logBlank();
}
