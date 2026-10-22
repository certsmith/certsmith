// Certsmith CLI - Rotate Intermediate CA
// Handles rotation of a specific intermediate tier certificate.

import { TIERS, type TierInfo } from '@/stepca/tiers';
import { run } from '@/utils/exec';
import { logOk, logFail, logInfo, logWarn, logStep, logBlank } from '@/utils/logger';
import { selectOption, confirmAction } from '@/ui/prompt-helpers';
import * as p from '@clack/prompts';

/**
 * Interactive intermediate CA rotation flow.
 * Prompts operator to select a tier, confirms the action,
 * then triggers the rotation script.
 */
export async function rotateIntermediate(
  containerName: string,
): Promise<boolean> {
  logBlank();
  logInfo('Intermediate CA Rotation');

  const tierId = await selectOption(
    'Select the tier to rotate:',
    TIERS.map((t) => ({ value: t.id, label: t.label, hint: t.cn })),
  );

  const tier = TIERS.find((t) => t.id === tierId);
  if (!tier) {
    logFail('Invalid tier selection.');
    return false;
  }

  logWarn(`Rotating ${tier.label} will invalidate all certificates issued by this tier.`);
  const confirmed = await confirmAction(`Rotate ${tier.label}?`);
  if (!confirmed) return false;

  const spinner = p.spinner();
  spinner.start(`Rotating ${tier.label}...`);

  const result = await run(
    `docker exec ${containerName} bash /opt/certsmith/scripts/rotate-intermediate.sh ${tier.id}`,
    { timeout: 120_000 },
  );

  if (result.exitCode === 0) {
    spinner.stop(`${tier.label} rotated.`);
    logOk(`Intermediate CA ${tier.label} rotated successfully.`);
    return true;
  }

  spinner.stop('Rotation failed.');
  logFail(`Rotation failed: ${result.stderr || result.stdout}`);
  return false;
}
