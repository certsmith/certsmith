// Certsmith CLI - Full Cloudflare Sync
// Orchestrates domain synchronization: SaaS hostnames + tunnel strict TLS.

import type { CertsmithEnv } from '@/env';
import { listCustomHostnames } from '@/cloudflare/saas-list';
import { createCustomHostname } from '@/cloudflare/saas-create';
import { getTunnelConfig, printIngressRules } from '@/cloudflare/tunnel-get';
import { buildStrictRulesFromEnv, appendCatchAll } from '@/cloudflare/tunnel-strict';
import { pushTunnelConfig } from '@/cloudflare/tunnel-push';
import { logInfo, logOk, logWarn, logBlank } from '@/utils/logger';
import { confirmAction } from '@/ui/prompt-helpers';
import * as p from '@clack/prompts';

/**
 * Run the full domain sync flow:
 * 1. Compare .env domains against existing custom hostnames.
 * 2. Register missing custom hostnames.
 * 3. Rebuild tunnel ingress with strict TLS for all domains.
 * 4. Push updated config to Cloudflare.
 */
export async function syncAll(env: CertsmithEnv): Promise<void> {
  p.intro('Cloudflare Domain Sync');

  // Step 1: Check existing custom hostnames
  const existing = await listCustomHostnames(env);
  const existingNames = new Set(existing.map((h) => h.hostname));

  const nonWildcard = env.domains.filter((d) => !d.startsWith('*.'));
  const missing = nonWildcard.filter((d) => !existingNames.has(d));

  if (missing.length === 0) {
    logOk('All domains are already registered as custom hostnames.');
  } else {
    logWarn(`${missing.length} domain(s) not registered: ${missing.join(', ')}`);

    const shouldCreate = await confirmAction('Register missing custom hostnames?');
    if (shouldCreate) {
      for (const domain of missing) {
        await createCustomHostname(env, domain, env.primaryDomain);
      }
    }
  }

  logBlank();

  // Step 2: Rebuild tunnel ingress with strict TLS
  logInfo('Building strict TLS ingress rules...');
  const strictRules = buildStrictRulesFromEnv(env);
  const finalIngress = appendCatchAll(strictRules);

  printIngressRules({ ingress: finalIngress });

  const shouldPush = await confirmAction('Push this tunnel configuration to Cloudflare?');
  if (shouldPush) {
    await pushTunnelConfig(env, finalIngress);
  }

  p.outro('Sync complete.');
}
