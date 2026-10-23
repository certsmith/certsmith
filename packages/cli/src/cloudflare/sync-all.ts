// Certsmith CLI - Full Cloudflare Sync
// Orchestrates domain synchronization: SaaS hostnames + tunnel strict TLS.

import type { CertsmithEnv } from '@/env';
import { listCustomHostnames } from '@/cloudflare/saas-list';
import { createCustomHostname } from '@/cloudflare/saas-create';
import { getTunnelConfig, printIngressRules } from '@/cloudflare/tunnel-get';
import { isLocalDomain, buildStrictRulesFromHostnames, appendCatchAll } from '@/cloudflare/tunnel-strict';
import { pushTunnelConfig } from '@/cloudflare/tunnel-push';
import { logInfo, logOk, logWarn, logBlank } from '@/utils/logger';
import { confirmAction } from '@/ui/prompt-helpers';
import * as p from '@clack/prompts';

/**
 * Run the full domain sync flow:
 * 1. Filter out local/non-routable domains.
 * 2. Compare domains against existing Cloudflare SaaS custom hostnames.
 * 3. Register missing custom hostnames (user confirms).
 * 4. Build tunnel ingress ONLY from domains that have custom hostnames.
 * 5. Push updated config to Cloudflare (user confirms).
 */
export async function syncAll(env: CertsmithEnv): Promise<void> {
  p.intro('Cloudflare Domain Sync');

  // Step 0: Separate routable vs local domains
  const nonWildcard = env.domains.filter((d) => !d.startsWith('*.'));
  const localDomains = nonWildcard.filter(isLocalDomain);
  const routableDomains = nonWildcard.filter((d) => !isLocalDomain(d));

  if (localDomains.length > 0) {
    logWarn(`Skipping local/non-routable domain(s) (not valid for Cloudflare): ${localDomains.join(', ')}`);
  }

  if (routableDomains.length === 0) {
    logWarn('No routable domains to sync. All configured domains are local/non-routable.');
    p.outro('Nothing to sync.');
    return;
  }

  // Step 1: Check existing custom hostnames
  const existing = await listCustomHostnames(env);
  const existingNames = new Set(existing.map((h) => h.hostname));

  const missing = routableDomains.filter((d) => !existingNames.has(d));

  if (missing.length === 0) {
    logOk('All routable domains are already registered as custom hostnames.');
  } else {
    logWarn(`${missing.length} domain(s) not registered: ${missing.join(', ')}`);

    const shouldCreate = await confirmAction('Register missing custom hostnames?');
    if (shouldCreate) {
      for (const domain of missing) {
        await createCustomHostname(env, domain, env.primaryDomain);
      }
      // Refresh existing hostnames after registration
      const refreshed = await listCustomHostnames(env);
      existingNames.clear();
      for (const h of refreshed) {
        existingNames.add(h.hostname);
      }
    }
  }

  logBlank();

  // Step 2: Build tunnel ingress ONLY from domains that have custom hostnames
  // This prevents pushing rules for domains that aren't registered yet
  const tunnelDomains = routableDomains.filter((d) => existingNames.has(d));

  if (tunnelDomains.length === 0) {
    logWarn('No domains with active custom hostnames to add to tunnel ingress.');
    p.outro('Sync complete (no tunnel changes).');
    return;
  }

  logInfo(`Building strict TLS ingress rules for ${tunnelDomains.length} domain(s)...`);
  const strictRules = buildStrictRulesFromHostnames(tunnelDomains, env.caPoolPath);
  const finalIngress = appendCatchAll(strictRules);

  printIngressRules({ ingress: finalIngress });

  const shouldPush = await confirmAction('Push this tunnel configuration to Cloudflare?');
  if (shouldPush) {
    await pushTunnelConfig(env, finalIngress);
  }

  p.outro('Sync complete.');
}
