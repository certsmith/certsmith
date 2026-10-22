// Certsmith CLI - Certificate Expiry Auditor
// Checks remaining validity of root, intermediate, and leaf certificates.

import { run } from '@/utils/exec';
import { logOk, logWarn, logFail, logStep, logBlank, logInfo } from '@/utils/logger';

interface ExpiryInfo {
  label: string;
  path: string;
  notAfter: string;
  daysLeft: number;
}

/**
 * Parse the expiry date of a certificate using OpenSSL.
 */
async function getExpiry(certPath: string, label: string): Promise<ExpiryInfo> {
  const result = await run(
    `openssl x509 -in ${certPath} -noout -enddate`,
  );

  const match = result.stdout.match(/notAfter=(.+)/);
  const notAfter = match?.[1]?.trim() ?? 'unknown';

  let daysLeft = -1;
  if (notAfter !== 'unknown') {
    const expDate = new Date(notAfter);
    const now = new Date();
    daysLeft = Math.floor((expDate.getTime() - now.getTime()) / 86_400_000);
  }

  return { label, path: certPath, notAfter, daysLeft };
}

/**
 * Print expiry information with color-coded status.
 */
function printExpiry(info: ExpiryInfo): void {
  const status =
    info.daysLeft < 0 ? 'EXPIRED' :
    info.daysLeft < 30 ? 'CRITICAL' :
    info.daysLeft < 90 ? 'WARNING' : 'OK';

  const logFn = status === 'OK' ? logOk : status === 'WARNING' ? logWarn : logFail;
  logFn(`${info.label}: ${info.daysLeft}d remaining (${status})`);
  logStep('Expires', info.notAfter);
}

/**
 * Audit expiry for root CA and all 6 intermediate CAs.
 */
export async function auditExpiry(): Promise<void> {
  logBlank();
  logInfo('Certificate Expiry Audit');
  logBlank();

  // Root CA
  const root = await getExpiry('/opt/certsmith/data/root/root_ca.crt', 'Root CA');
  printExpiry(root);

  // Intermediates
  const tiers = ['cr1', 'cr2', 'cr3', 'ce1', 'ce2', 'ce3'];
  for (const tier of tiers) {
    const info = await getExpiry(
      `/opt/certsmith/data/${tier}/${tier}_intermediate_ca.crt`,
      tier.toUpperCase(),
    );
    printExpiry(info);
  }

  // Portal TLS (if exists)
  const portal = await getExpiry('/opt/certsmith/data/portal/portal.crt', 'Portal TLS');
  if (portal.daysLeft >= 0) printExpiry(portal);

  logBlank();
}
