// Certsmith CLI - Inspect Certificate Chains
// Validates X.509 certificate chain integrity using OpenSSL.

import { run } from '@/utils/exec';
import { logOk, logFail, logInfo, logStep, logBlank } from '@/utils/logger';

const ROOT_CERT = '/opt/certsmith/data/root/root_ca.crt';

/**
 * Verify a certificate chain against the root CA.
 */
export async function verifyChain(
  certPath: string,
  label: string,
): Promise<boolean> {
  const result = await run(
    `openssl verify -CAfile ${ROOT_CERT} ${certPath}`,
  );

  if (result.exitCode === 0 && result.stdout.includes(': OK')) {
    logOk(`${label}: chain valid`);
    return true;
  }

  logFail(`${label}: chain verification failed`);
  if (result.stderr) logStep('Error', result.stderr);
  return false;
}

/**
 * Inspect the subject and issuer of a certificate.
 */
export async function inspectCert(
  certPath: string,
  label: string,
): Promise<void> {
  const subj = await run(`openssl x509 -in ${certPath} -noout -subject`);
  const issuer = await run(`openssl x509 -in ${certPath} -noout -issuer`);

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
    const certPath = `/opt/certsmith/data/${tier}/${tier}_intermediate_ca.crt`;
    await verifyChain(certPath, tier.toUpperCase());
  }
  logBlank();
}
