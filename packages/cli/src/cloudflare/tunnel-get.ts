// Certsmith CLI - Get Tunnel Configuration
// Retrieves the current ingress rules from a Cloudflare tunnel.

import type { CertsmithEnv } from '@/env';
import { getClient } from '@/cloudflare/client';
import { logInfo, logOk, logFail, logStep, logBlank } from '@/utils/logger';

export interface IngressRule {
  hostname?: string;
  service: string;
  originRequest?: {
    caPool?: string;
    noTLSVerify?: boolean;
    originServerName?: string;
  };
}

export interface TunnelConfig {
  ingress: IngressRule[];
}

/**
 * Fetch the current tunnel configuration (ingress rules).
 */
export async function getTunnelConfig(env: CertsmithEnv): Promise<TunnelConfig | null> {
  const cf = getClient(env);

  logInfo('Fetching tunnel configuration...');

  try {
    const result = await cf.zeroTrust.tunnels.cloudflared.configurations.get(
      env.cloudflareTunnelId!,
      { account_id: env.cloudflareAccountId! },
    );

    const config = result.config;
    const ingress: IngressRule[] = (config?.ingress ?? []).map((r) => ({
      hostname: r.hostname,
      service: r.service ?? 'http_status:404',
      originRequest: r.originRequest ? {
        caPool: r.originRequest.caPool,
        noTLSVerify: r.originRequest.noTLSVerify,
        originServerName: r.originRequest.originServerName,
      } : undefined,
    }));

    logOk(`Retrieved ${ingress.length} ingress rule(s).`);
    return { ingress };
  } catch (err) {
    logFail(`Failed to get tunnel config: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Print ingress rules summary.
 */
export function printIngressRules(config: TunnelConfig): void {
  logBlank();
  for (const rule of config.ingress) {
    logStep('Hostname', rule.hostname ?? '(catch-all)');
    logStep('Service', rule.service);
    if (rule.originRequest?.caPool) logStep('CA Pool', rule.originRequest.caPool);
    if (rule.originRequest?.originServerName) {
      logStep('Origin SNI', rule.originRequest.originServerName);
    }
    logStep('TLS Verify', rule.originRequest?.noTLSVerify === false ? 'strict' : 'insecure');
    logBlank();
  }
}
