// Certsmith CLI - Certificate Expiry Auditor
// Checks remaining validity of root, intermediate, and leaf certificates (Host or Docker).

import {
  getRootCertLocation,
  getIntermediateCertLocation,
  getPortalCertLocation,
  runOpenssl,
  type CertLocation,
} from '@/pki/pki-paths';
import { logOk, logWarn, logFail, logStep, logBlank, logInfo } from '@/utils/logger';

interface ExpiryInfo {
  label: string;
  path: string;
  notAfter: string;
  daysLeft: number;
}

/**
 * Parse the expiry date of a certificate using OpenSSL (local or in container).
 */
async function getExpiry(certLoc: CertLocation, label: string): Promise<ExpiryInfo> {
  const result = await runOpenssl(certLoc, 'x509 -in __CERT__ -noout -enddate');

  const match = result.stdout.match(/notAfter=(.+)/);
  const notAfter = match?.[1]?.trim() ?? 'unknown';

  let daysLeft = -1;
  if (notAfter !== 'unknown') {
    const expDate = new Date(notAfter);
    const now = new Date();
    daysLeft = Math.floor((expDate.getTime() - now.getTime()) / 86_400_000);
  }

  return {
    label,
    path: certLoc.hostPath ?? certLoc.containerPath,
    notAfter,
    daysLeft,
  };
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
  const root = await getExpiry(getRootCertLocation(), 'Root CA');
  printExpiry(root);

  // Intermediates
  const tiers = ['cr1', 'cr2', 'cr3', 'ce1', 'ce2', 'ce3'];
  for (const tier of tiers) {
    const info = await getExpiry(
      getIntermediateCertLocation(tier),
      tier.toUpperCase(),
    );
    printExpiry(info);
  }

  // Portal TLS (if exists)
  const portalLoc = getPortalCertLocation();
  const portal = await getExpiry(portalLoc, 'Portal TLS');
  if (portal.daysLeft >= 0) {
    printExpiry(portal);
  }

  logBlank();
}
