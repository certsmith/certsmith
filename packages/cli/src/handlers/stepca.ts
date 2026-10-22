// Certsmith CLI - step-ca Handler
// Submenu for step-ca wrapper operations.

import type { CertsmithEnv } from '@/env';
import { selectOption } from '@/ui/prompt-helpers';
import { TIERS } from '@/stepca/tiers';
import { checkAllTiersHealth } from '@/stepca/health';
import { listProvisioners, printProvisioners } from '@/stepca/provisioners';
import { interactiveRevoke } from '@/stepca/revoke';

type StepAction = 'health' | 'provisioners' | 'revoke' | 'back';

export async function handleStepCa(env: CertsmithEnv): Promise<void> {
  const action = await selectOption<StepAction>(
    'step-ca Operations:',
    [
      { value: 'health', label: 'Health Check', hint: 'All 6 tiers' },
      { value: 'provisioners', label: 'List Provisioners' },
      { value: 'revoke', label: 'Revoke Certificate' },
      { value: 'back', label: 'Back to main menu' },
    ],
  );

  switch (action) {
    case 'health':
      await checkAllTiersHealth(env.containerName);
      break;
    case 'provisioners': {
      const tierId = await selectOption(
        'Select tier:',
        TIERS.map((t) => ({ value: t.id, label: t.label })),
      );
      const tier = TIERS.find((t) => t.id === tierId)!;
      const provs = await listProvisioners(env.containerName, tier);
      printProvisioners(tier, provs);
      break;
    }
    case 'revoke': {
      const tierId = await selectOption(
        'Select tier for revocation:',
        TIERS.map((t) => ({ value: t.id, label: t.label })),
      );
      const tier = TIERS.find((t) => t.id === tierId)!;
      await interactiveRevoke(env.containerName, tier);
      break;
    }
    case 'back':
      break;
  }
}
