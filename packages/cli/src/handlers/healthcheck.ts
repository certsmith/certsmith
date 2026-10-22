// Certsmith CLI - Full Healthcheck Handler
// Runs a comprehensive system health check across all engines.

import type { CertsmithEnv } from '@/env';
import { logInfo, logBlank, logDivider } from '@/utils/logger';
import { printContainerStatus } from '@/docker/check-status';
import { checkAllTiersHealth } from '@/stepca/health';
import { auditExpiry } from '@/pki/inspect-expiry';
import { verifyAllChains } from '@/pki/inspect-chains';
import * as p from '@clack/prompts';

/**
 * Run a full system healthcheck:
 * 1. Docker container status
 * 2. step-ca tier health (all 6)
 * 3. Certificate expiry audit
 * 4. Chain integrity verification
 */
export async function handleHealthcheck(env: CertsmithEnv): Promise<void> {
  p.intro('Full System Healthcheck');

  logInfo('1/4 - Docker Container Status');
  logDivider();
  await printContainerStatus(env.containerName);

  logInfo('2/4 - step-ca Tier Health');
  logDivider();
  await checkAllTiersHealth(env.containerName);

  logInfo('3/4 - Certificate Expiry Audit');
  logDivider();
  await auditExpiry();

  logInfo('4/4 - Chain Integrity Verification');
  logDivider();
  await verifyAllChains();

  p.outro('Healthcheck complete.');
}
