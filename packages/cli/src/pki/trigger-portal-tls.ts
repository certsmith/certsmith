// Certsmith CLI - Portal TLS Renewal Trigger
// Forces regeneration of the web portal's dual RSA/ECC leaf certificates.

import { run } from '@/utils/exec';
import { logOk, logFail, logInfo, logStep, logBlank } from '@/utils/logger';
import { confirmAction } from '@/ui/prompt-helpers';
import * as p from '@clack/prompts';

const PORTAL_SCRIPT = '/opt/certsmith/scripts/certsmith-portal-tls.sh';

/**
 * Trigger a manual portal TLS leaf certificate renewal.
 * This regenerates the dual RSA+ECC certs used by Nginx
 * without touching root or intermediate CAs.
 */
export async function triggerPortalTls(containerName: string): Promise<boolean> {
  logBlank();
  logInfo('Portal TLS Leaf Renewal');
  logStep('Script', PORTAL_SCRIPT);
  logStep('Scope', 'Portal leaf certificates only (RSA + ECC)');
  logBlank();

  const confirmed = await confirmAction(
    'Regenerate portal TLS leaf certificates? This will briefly restart Nginx.',
  );
  if (!confirmed) return false;

  const spinner = p.spinner();
  spinner.start('Regenerating portal TLS certificates...');

  const result = await run(
    `docker exec ${containerName} bash ${PORTAL_SCRIPT}`,
    { timeout: 60_000 },
  );

  if (result.exitCode === 0) {
    spinner.stop('Portal TLS renewed.');
    logOk('Portal leaf certificates regenerated successfully.');
    return true;
  }

  spinner.stop('Renewal failed.');
  logFail(`Portal TLS renewal failed: ${result.stderr || result.stdout}`);
  return false;
}
