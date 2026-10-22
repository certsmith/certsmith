// Certsmith CLI - Create Custom Hostname (SaaS)
// Registers a new Cloudflare for SaaS custom hostname with custom origin.

import type { CertsmithEnv } from '@/env';
import { getClient } from '@/cloudflare/client';
import { logOk, logFail, logStep, logBlank } from '@/utils/logger';
import * as p from '@clack/prompts';

/**
 * Create a new Cloudflare for SaaS custom hostname.
 * Sets the custom origin server and requests HTTP DCV validation.
 */
export async function createCustomHostname(
  env: CertsmithEnv,
  hostname: string,
  customOrigin: string,
): Promise<string | null> {
  const cf = getClient(env);

  const spinner = p.spinner();
  spinner.start(`Registering custom hostname: ${hostname}`);

  try {
    const result = await cf.customHostnames.create({
      zone_id: env.cloudflareZoneId!,
      hostname,
      ssl: {
        method: 'http',
        type: 'dv',
      },
      custom_origin_server: customOrigin,
    });

    spinner.stop(`Custom hostname registered.`);

    const id = result.id ?? 'unknown';
    logOk(`Created custom hostname: ${hostname}`);
    logStep('ID', id);
    logStep('Custom Origin', customOrigin);
    logStep('SSL Method', 'HTTP DCV');
    logBlank();

    return id;
  } catch (err) {
    spinner.stop(`Failed to register hostname.`);
    logFail(`Error creating custom hostname: ${(err as Error).message}`);
    return null;
  }
}
