// Certsmith CLI - Tier Health Checker
// Checks the health of each step-ca daemon by querying its HTTPS endpoint.

import { TIERS, type TierInfo } from '@/stepca/tiers';
import { containerExec } from '@/stepca/docker-exec';
import { logOk, logFail, logStep, logBlank } from '@/utils/logger';

export interface HealthResult {
  tier: TierInfo;
  healthy: boolean;
  message: string;
}

/**
 * Check health of a single step-ca tier by hitting its /health endpoint.
 */
export async function checkTierHealth(
  containerName: string,
  tier: TierInfo,
): Promise<HealthResult> {
  const url = `https://127.0.0.1:${tier.port}/health`;
  const result = await containerExec(
    containerName,
    `curl -sk --max-time 5 ${url}`,
  );

  const healthy = result.exitCode === 0 && result.stdout.includes('"status"');
  return {
    tier,
    healthy,
    message: healthy ? 'ok' : result.stderr || 'unreachable',
  };
}

/**
 * Check health of all 6 tiers and print results.
 */
export async function checkAllTiersHealth(containerName: string): Promise<void> {
  logBlank();
  for (const tier of TIERS) {
    const result = await checkTierHealth(containerName, tier);
    if (result.healthy) {
      logOk(`${tier.label} -> healthy (port ${tier.port})`);
    } else {
      logFail(`${tier.label} -> ${result.message} (port ${tier.port})`);
    }
  }
  logBlank();
}
