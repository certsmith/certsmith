// Certsmith CLI - Rotate Intermediate CA
// Handles rotation of a specific intermediate tier certificate.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { TIERS } from '@/stepca/tiers';
import { run, streamCommand } from '@/utils/exec';
import { logOk, logFail, logInfo, logWarn, logStep, logBlank } from '@/utils/logger';
import { selectOption, confirmAction } from '@/ui/prompt-helpers';
import { findHostDataDir, isContainerRunning } from '@/pki/pki-paths';

/**
 * Locate the bundled rotate-tier.sh script.
 */
function resolveRotateScript(): string {
  const currentDir = typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));

  const candidates = [
    resolve(currentDir, '../scripts/rotate-tier.sh'),
    resolve(currentDir, '../../scripts/rotate-tier.sh'),
    resolve(process.cwd(), 'packages/cli/scripts/rotate-tier.sh'),
    resolve(process.cwd(), 'scripts/rotate-tier.sh'),
  ];

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}

/**
 * Interactive intermediate CA rotation flow.
 * Prompts operator to select a tier, backs up old key/cert,
 * regenerates intermediate signed by Root CA, and restarts step-ca.
 */
export async function rotateIntermediate(
  containerName: string = 'certsmith',
  targetTierId?: string,
): Promise<boolean> {
  logBlank();
  logInfo('Intermediate CA Rotation');

  let tierId = targetTierId;
  if (!tierId) {
    tierId = await selectOption(
      'Select the tier to rotate (q / Esc to exit):',
      TIERS.map((t) => ({ value: t.id, label: t.label, hint: t.cn })),
    );
  }

  const tier = TIERS.find((t) => t.id === tierId);
  if (!tier) {
    logFail(`Invalid tier selection: "${tierId}".`);
    return false;
  }

  logWarn(`Rotating ${tier.label} will invalidate all certificates previously issued by this tier.`);
  logInfo('The Root CA will sign a new Intermediate certificate for this tier.');
  const confirmed = await confirmAction(`Rotate ${tier.label}?`);
  if (!confirmed) return false;

  const scriptPath = resolveRotateScript();
  const hostDataDir = findHostDataDir() ?? resolve(process.cwd(), 'data');
  const envPath = resolve(process.cwd(), '.env');

  logStep('Script', scriptPath);
  logStep('Data Dir', hostDataDir);

  const exitCode = await streamCommand(
    'bash',
    [scriptPath, tier.id, envPath, hostDataDir],
    { cwd: process.cwd() },
  );

  if (exitCode !== 0) {
    logFail(`Rotation failed for ${tier.label} (code ${exitCode}).`);
    return false;
  }

  // If container is active, restart it so step-ca picks up the new intermediate
  if (await isContainerRunning(containerName)) {
    logInfo(`Restarting container "${containerName}" to reload step-ca...`);
    const restartRes = await run(`docker restart ${containerName}`);
    if (restartRes.exitCode === 0) {
      logOk(`Container "${containerName}" restarted with new ${tier.label} intermediate.`);
    } else {
      logWarn(`Container restart warning: ${restartRes.stderr || restartRes.stdout}`);
    }
  }

  logOk(`Intermediate CA ${tier.label} rotated successfully.`);
  return true;
}
