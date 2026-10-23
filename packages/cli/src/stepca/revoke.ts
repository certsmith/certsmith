// Certsmith CLI - Certificate Revocation
// Revokes a certificate by serial number via step-ca CLI wrapper.

import type { TierInfo } from '@/stepca/tiers';
import { stepExec } from '@/stepca/docker-exec';
import { logOk, logFail, logInfo } from '@/utils/logger';
import * as p from '@clack/prompts';
import { textInput, confirmAction } from '@/ui/prompt-helpers';

/**
 * Revoke a certificate by its serial number on a specific tier.
 */
export async function revokeCertificate(
  containerName: string,
  tier: TierInfo,
  serial: string,
  reason: string,
): Promise<boolean> {
  const caUrl = `https://127.0.0.1:${tier.port}`;
  const result = await stepExec(containerName, [
    'ca', 'revoke',
    serial,
    '--ca-url', caUrl,
    '--root', '/data/root/root_ca.crt',
    '--reason', reason,
  ]);

  if (result.exitCode === 0) {
    logOk(`Certificate ${serial} revoked on ${tier.label}.`);
    return true;
  }

  logFail(`Revocation failed: ${result.stderr || result.stdout}`);
  return false;
}

/**
 * Interactive revocation flow: prompt for serial and reason, then confirm.
 */
export async function interactiveRevoke(
  containerName: string,
  tier: TierInfo,
): Promise<void> {
  logInfo(`Revoking certificate on ${tier.label} (port ${tier.port})`);

  const serial = await textInput('Certificate serial number:');
  const reason = await textInput('Revocation reason:', 'key compromise');

  const confirmed = await confirmAction(
    `Revoke serial ${serial} on ${tier.label}?`,
  );

  if (confirmed) {
    const spinner = p.spinner();
    spinner.start('Revoking certificate...');
    const ok = await revokeCertificate(containerName, tier, serial, reason);
    spinner.stop(ok ? 'Certificate revoked.' : 'Revocation failed.');
  }
}
