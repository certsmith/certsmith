// Certsmith CLI - PKI Handler
// Submenu and direct actions for PKI and CA certificate operations.

import type { CertsmithEnv } from '@/env';
import { selectOption } from '@/ui/prompt-helpers';
import { auditExpiry } from '@/pki/inspect-expiry';
import { verifyAllChains } from '@/pki/inspect-chains';
import { triggerPortalTls } from '@/pki/trigger-portal-tls';
import { triggerForge } from '@/pki/trigger-forge';
import { rotateIntermediate } from '@/pki/rotate-intermediate';

export async function pkiAudit(): Promise<number> {
  await auditExpiry();
  return 0;
}

export async function pkiVerify(): Promise<number> {
  await verifyAllChains();
  return 0;
}

export async function pkiRenewPortal(containerName: string): Promise<number> {
  const ok = await triggerPortalTls(containerName);
  return ok ? 0 : 1;
}

export async function pkiRotate(containerName: string): Promise<number> {
  const ok = await rotateIntermediate(containerName);
  return ok ? 0 : 1;
}


export async function pkiCeremony(): Promise<number> {
  await triggerForge();
  return 0;
}

type PkiAction = 'audit' | 'chains' | 'renew-portal' | 'rotate' | 'ceremony' | 'back';

export async function handlePki(env: CertsmithEnv): Promise<boolean> {
  const action = await selectOption<PkiAction>(
    'PKI & CA Operations (q / Esc to exit):',
    [
      { value: 'audit', label: 'Audit Expiry', hint: 'Root + 6 intermediates' },
      { value: 'chains', label: 'Verify Chains', hint: 'OpenSSL validation' },
      { value: 'renew-portal', label: 'Renew Portal TLS', hint: 'Leaf certs only' },
      { value: 'rotate', label: 'Rotate Intermediate' },
      { value: 'ceremony', label: 'Forge Ceremony', hint: 'Root CA generation' },
      { value: 'back', label: 'Back to main menu' },
    ],
  );

  switch (action) {
    case 'audit':
      await pkiAudit();
      return true;
    case 'chains':
      await pkiVerify();
      return true;
    case 'renew-portal':
      await pkiRenewPortal(env.containerName);
      return true;
    case 'rotate':
      await pkiRotate(env.containerName);
      return true;
    case 'ceremony':
      await pkiCeremony();
      return true;
    case 'back':
      return false;
  }
}
