// Certsmith CLI - Strict TLS Ingress Rule Builder
// Constructs an ingress rule with caPool, originServerName, and noTLSVerify=false.

import type { CertsmithEnv } from '@/env';
import type { IngressRule } from '@/cloudflare/tunnel-get';
import { parse as parseTld } from 'tldts';
import { logWarn } from '@/utils/logger';

export interface StrictTlsOptions {
  hostname: string;
  service: string;
  caPool: string;
  originServerName: string;
}

/**
 * Check if a domain is non-routable / not a registered public domain.
 * Uses the Mozilla Public Suffix List (via tldts) to verify that the
 * domain's TLD is a real ICANN-registered suffix.
 * Domains like .lo, .local, .internal, .test will return true.
 */
export function isLocalDomain(hostname: string): boolean {
  const result = parseTld(hostname, { allowPrivateDomains: false });
  return !result.isIcann || !result.domain;
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
 * Filters out wildcards and local/non-routable domains.
 */
export function buildStrictRulesFromEnv(env: CertsmithEnv): IngressRule[] {
  const nonWildcard = env.domains.filter((d) => !d.startsWith('*.'));

  const localDomains = nonWildcard.filter(isLocalDomain);
  if (localDomains.length > 0) {
    logWarn(`Skipping local/non-routable domain(s): ${localDomains.join(', ')}`);
  }

  return nonWildcard
    .filter((d) => !isLocalDomain(d))
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
 * Build strict TLS rules for a specific set of hostnames (e.g. only those
 * that are already registered as Cloudflare for SaaS custom hostnames).
 */
export function buildStrictRulesFromHostnames(
  hostnames: string[],
  caPoolPath: string,
): IngressRule[] {
  return hostnames
    .filter((d) => !d.startsWith('*.') && !isLocalDomain(d))
    .map((hostname) =>
      buildStrictRule({
        hostname,
        service: 'https://127.0.0.1:443',
        caPool: caPoolPath,
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
