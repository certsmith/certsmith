// Certsmith CLI - PKI Handler
// Submenu for PKI and CA certificate operations.

import type { CertsmithEnv } from '@/env';
import { selectOption } from '@/ui/prompt-helpers';
import { auditExpiry } from '@/pki/inspect-expiry';
import { verifyAllChains } from '@/pki/inspect-chains';
import { triggerPortalTls } from '@/pki/trigger-portal-tls';
import { triggerForge } from '@/pki/trigger-forge';
import { rotateIntermediate } from '@/pki/rotate-intermediate';

type PkiAction = 'audit' | 'chains' | 'renew-portal' | 'rotate' | 'ceremony' | 'back';

export async function handlePki(env: CertsmithEnv): Promise<void> {
  const action = await selectOption<PkiAction>(
    'PKI & CA Operations:',
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
      await auditExpiry();
      break;
    case 'chains':
      await verifyAllChains();
      break;
    case 'renew-portal':
      await triggerPortalTls(env.containerName);
      break;
    case 'rotate':
      await rotateIntermediate(env.containerName);
      break;
    case 'ceremony':
      await triggerForge();
      break;
    case 'back':
      break;
  }
}
