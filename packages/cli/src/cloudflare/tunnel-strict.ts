// Certsmith CLI - Strict TLS Ingress Rule Builder
// Constructs an ingress rule with caPool, originServerName, and noTLSVerify=false.

import type { CertsmithEnv } from '@/env';
import type { IngressRule } from '@/cloudflare/tunnel-get';

export interface StrictTlsOptions {
  hostname: string;
  service: string;
  caPool: string;
  originServerName: string;
}

/**
 * Build a single ingress rule configured for strict TLS verification.
 * This ensures the tunnel verifies the origin certificate against
 * the specified CA pool and expected server name.
 */
export function buildStrictRule(opts: StrictTlsOptions): IngressRule {
  return {
    hostname: opts.hostname,
    service: opts.service,
    originRequest: {
      caPool: opts.caPool,
      noTLSVerify: false,
      originServerName: opts.originServerName,
    },
  };
}

/**
 * Build strict TLS rules for all domains in the environment.
 * Uses the primary domain as the originServerName and the root CA
 * cert path as the caPool.
 */
export function buildStrictRulesFromEnv(env: CertsmithEnv): IngressRule[] {
  return env.domains
    .filter((d) => !d.startsWith('*.'))
    .map((hostname) =>
      buildStrictRule({
        hostname,
        service: 'https://127.0.0.1:443',
        caPool: env.caPoolPath,
        originServerName: hostname,
      }),
    );
}

/**
 * Append the mandatory catch-all rule to the end of ingress list.
 */
export function appendCatchAll(rules: IngressRule[]): IngressRule[] {
  const hasCatchAll = rules.some((r) => !r.hostname);
  if (!hasCatchAll) {
    rules.push({ service: 'http_status:404' });
  }
  return rules;
}
