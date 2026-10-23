// Certsmith CLI - Push Tunnel Configuration
// Updates the tunnel ingress rules via the Cloudflare SDK.

import type { CertsmithEnv } from '@/env';
import { getClient } from '@/cloudflare/client';
import { ensureAccountId, ensureTunnelId } from '@/cloudflare/resolver';
import type { IngressRule } from '@/cloudflare/tunnel-get';
import { logOk, logFail } from '@/utils/logger';
import * as p from '@clack/prompts';

/**
 * Convert internal IngressRule[] to the SDK-expected payload format
 * and push the updated configuration to Cloudflare.
 */
export async function pushTunnelConfig(
  env: CertsmithEnv,
  ingress: IngressRule[],
): Promise<boolean> {
  const cf = getClient(env);
  const accountId = await ensureAccountId(env);
  const tunnelId = await ensureTunnelId(env, { accountId });

  const spinner = p.spinner();
  spinner.start('Pushing tunnel configuration to Cloudflare...');

  try {
    const sdkIngress = ingress.map((rule) => {
      const entry: Record<string, unknown> = { service: rule.service };
      if (rule.hostname) entry.hostname = rule.hostname;
      if (rule.originRequest) {
        entry.originRequest = {
          caPool: rule.originRequest.caPool,
          noTLSVerify: rule.originRequest.noTLSVerify,
          originServerName: rule.originRequest.originServerName,
        };
      }
      return entry;
    });

    await cf.zeroTrust.tunnels.cloudflared.configurations.update(
      tunnelId,
      {
        account_id: accountId,
        config: { ingress: sdkIngress as never },
      },
    );

    spinner.stop('Tunnel configuration updated.');
    logOk(`Pushed ${ingress.length} ingress rule(s) to Cloudflare.`);
    return true;
  } catch (err) {
    spinner.stop('Failed to push tunnel configuration.');
    logFail(`Error updating tunnel: ${(err as Error).message}`);
    return false;
  }
}
