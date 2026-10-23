// Certsmith CLI - Inspect Certificate Chains
// Validates X.509 certificate chain integrity using OpenSSL (Host or Docker).

import {
  getRootCertLocation,
  getIntermediateCertLocation,
  runOpenssl,
  type CertLocation,
} from '@/pki/pki-paths';
import { logOk, logFail, logInfo, logStep, logBlank } from '@/utils/logger';

/**
 * Verify a certificate chain against the root CA.
 */
export async function verifyChain(
  certLoc: CertLocation,
  label: string,
): Promise<boolean> {
  const rootLoc = getRootCertLocation();

  const result = await runOpenssl(
    certLoc,
    'verify -CAfile __CA__ __CERT__',
    rootLoc.hostPath,
    rootLoc.containerPath,
  );

  if (result.exitCode === 0 && result.stdout.includes(': OK')) {
    logOk(`${label}: chain valid`);
    return true;
  }

  logFail(`${label}: chain verification failed`);
  if (result.stderr || result.stdout) {
    logStep('Details', (result.stderr || result.stdout).trim());
  }
  return false;
}

/**
 * Inspect the subject and issuer of a certificate.
 */
export async function inspectCert(
  certLoc: CertLocation,
  label: string,
): Promise<void> {
  const subj = await runOpenssl(certLoc, 'x509 -in __CERT__ -noout -subject');
  const issuer = await runOpenssl(certLoc, 'x509 -in __CERT__ -noout -issuer');

  logBlank();
  logInfo(label);
  logStep('Subject', subj.stdout.replace('subject=', '').trim());
  logStep('Issuer', issuer.stdout.replace('issuer=', '').trim());
}

/**
 * Verify all 6 intermediate CA chains against root.
 */
export async function verifyAllChains(): Promise<void> {
  const tiers = ['cr1', 'cr2', 'cr3', 'ce1', 'ce2', 'ce3'];
  logBlank();
  for (const tier of tiers) {
    const certLoc = getIntermediateCertLocation(tier);
    await verifyChain(certLoc, tier.toUpperCase());
  }
  logBlank();
}
