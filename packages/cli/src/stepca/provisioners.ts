// Certsmith CLI - Provisioner Viewer
// Lists ACME/JWK provisioners for a selected step-ca tier.

import type { TierInfo } from '@/stepca/tiers';
import { stepExec } from '@/stepca/docker-exec';
import { logOk, logFail, logStep, logBlank } from '@/utils/logger';

export interface Provisioner {
  name: string;
  type: string;
}

/**
 * Fetch the list of provisioners for a specific tier.
 * Parses the JSON output of `step ca provisioner list`.
 */
export async function listProvisioners(
  containerName: string,
  tier: TierInfo,
): Promise<Provisioner[]> {
  const caUrl = `https://127.0.0.1:${tier.port}`;
  const result = await stepExec(containerName, [
    'ca', 'provisioner', 'list',
    '--ca-url', caUrl,
    '--root', '/opt/certsmith/data/root/root_ca.crt',
  ]);

  if (result.exitCode !== 0) {
    logFail(`Failed to list provisioners for ${tier.label}: ${result.stderr}`);
    return [];
  }

  try {
    const parsed = JSON.parse(result.stdout);
    const list: Provisioner[] = (Array.isArray(parsed) ? parsed : []).map(
      (p: { name?: string; type?: string }) => ({
        name: p.name ?? 'unnamed',
        type: p.type ?? 'unknown',
      }),
    );
    return list;
  } catch {
    logFail(`Failed to parse provisioner output for ${tier.label}.`);
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
