// Certsmith CLI - step-ca Handler
// Submenu and direct actions for step-ca wrapper operations.

import type { CertsmithEnv } from '@/env';
import { selectOption } from '@/ui/prompt-helpers';
import { TIERS } from '@/stepca/tiers';
import { checkAllTiersHealth } from '@/stepca/health';
import { listProvisioners, printProvisioners } from '@/stepca/provisioners';
import { interactiveRevoke } from '@/stepca/revoke';
import { logFail } from '@/utils/logger';

export async function stepcaHealth(containerName: string): Promise<number> {
  await checkAllTiersHealth(containerName);
  return 0;
}

export async function stepcaProvisioners(containerName: string, tierId?: string): Promise<number> {
  if (tierId) {
    const tier = TIERS.find((t) => t.id === tierId);
    if (!tier) {
      logFail(`Unknown tier: "${tierId}". Valid tiers: ${TIERS.map((t) => t.id).join(', ')}`);
      return 1;
    }
    const provs = await listProvisioners(containerName, tier);
    printProvisioners(tier, provs);
    return 0;
  }

  const selectedTierId = await selectOption(
    'Select tier:',
    TIERS.map((t) => ({ value: t.id, label: t.label })),
  );
  const tier = TIERS.find((t) => t.id === selectedTierId)!;
  const provs = await listProvisioners(containerName, tier);
  printProvisioners(tier, provs);
  return 0;
}

export async function stepcaRevoke(containerName: string, tierId?: string): Promise<number> {
  let targetTier = tierId ? TIERS.find((t) => t.id === tierId) : undefined;
  if (tierId && !targetTier) {
    logFail(`Unknown tier: "${tierId}". Valid tiers: ${TIERS.map((t) => t.id).join(', ')}`);
    return 1;
  }

  if (!targetTier) {
    const selectedId = await selectOption(
      'Select tier for revocation:',
      TIERS.map((t) => ({ value: t.id, label: t.label })),
    );
    targetTier = TIERS.find((t) => t.id === selectedId)!;
  }

  await interactiveRevoke(containerName, targetTier);
  return 0;
}

type StepAction = 'health' | 'provisioners' | 'revoke' | 'back';

export async function handleStepCa(env: CertsmithEnv): Promise<boolean> {
  const action = await selectOption<StepAction>(
    'step-ca Operations (q / Esc to exit):',
    [
      { value: 'health', label: 'Health Check', hint: 'All 6 tiers' },
      { value: 'provisioners', label: 'List Provisioners' },
      { value: 'revoke', label: 'Revoke Certificate' },
      { value: 'back', label: 'Back to main menu' },
    ],
  );

  switch (action) {
    case 'health':
      await stepcaHealth(env.containerName);
      return true;
    case 'provisioners':
      await stepcaProvisioners(env.containerName);
      return true;
    case 'revoke':
      await stepcaRevoke(env.containerName);
      return true;
    case 'back':
      return false;
  }
}
