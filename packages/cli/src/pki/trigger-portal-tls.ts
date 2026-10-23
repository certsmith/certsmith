// Certsmith CLI - Portal TLS Renewal Trigger
// Forces regeneration of the web portal's dual RSA/ECC leaf certificates.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { run, streamCommand } from '@/utils/exec';
import { logOk, logFail, logInfo, logWarn, logStep, logBlank } from '@/utils/logger';
import { confirmAction } from '@/ui/prompt-helpers';
import { findHostDataDir, isContainerRunning } from '@/pki/pki-paths';

/**
 * Locate the bundled renew-portal-tls.sh script.
 */
function resolvePortalScript(): string {
  const currentDir = typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));

  const candidates = [
    resolve(currentDir, '../scripts/renew-portal-tls.sh'),
    resolve(currentDir, '../../scripts/renew-portal-tls.sh'),
    resolve(process.cwd(), 'packages/cli/scripts/renew-portal-tls.sh'),
    resolve(process.cwd(), 'scripts/renew-portal-tls.sh'),
  ];

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}

/**
 * Trigger a manual portal TLS leaf certificate renewal.
 * This regenerates the dual RSA+ECC certs used by Nginx
 * without touching root or intermediate CAs.
 */
export async function triggerPortalTls(
  containerName: string = 'certsmith',
): Promise<boolean> {
  logBlank();
  logInfo('Portal TLS Leaf Renewal');
  logStep('Scope', 'Portal leaf certificates only (RSA + ECC)');

  const confirmed = await confirmAction(
    'Regenerate portal TLS leaf certificates? Nginx will reload config.',
  );
  if (!confirmed) return false;

  const scriptPath = resolvePortalScript();
  const hostDataDir = findHostDataDir() ?? resolve(process.cwd(), 'data');
  const envPath = resolve(process.cwd(), '.env');

  logStep('Script', scriptPath);
  logStep('Data Dir', hostDataDir);

  const exitCode = await streamCommand(
    'bash',
    [scriptPath, envPath, hostDataDir],
    { cwd: process.cwd() },
  );

  if (exitCode !== 0) {
    logFail(`Portal TLS renewal failed (exit code ${exitCode}).`);
    return false;
  }

  // Reload Nginx inside container if running
  if (await isContainerRunning(containerName)) {
    logInfo(`Reloading Nginx in container "${containerName}"...`);
    const reloadRes = await run(`docker exec ${containerName} nginx -s reload`);
    if (reloadRes.exitCode === 0) {
      logOk('Nginx reloaded successfully with renewed TLS certificates.');
    } else {
      logWarn(`Nginx reload warning: ${reloadRes.stderr || reloadRes.stdout}`);
    }
  }

  logOk('Portal leaf certificates regenerated successfully.');
  return true;
}
