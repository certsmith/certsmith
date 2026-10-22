// Certsmith CLI - Cloudflare SDK Client Factory
// Initializes and exports a singleton Cloudflare API client.

import Cloudflare from 'cloudflare';
import type { CertsmithEnv } from '@/env';

let instance: Cloudflare | null = null;

/**
 * Create or return the cached Cloudflare SDK client.
 * Uses the API token from environment.
 */
export function getClient(env: CertsmithEnv): Cloudflare {
  if (!instance) {
    if (!env.cloudflareApiToken) {
      throw new Error('CLOUDFLARE_API_TOKEN is required in .env');
    }
    instance = new Cloudflare({
      apiToken: env.cloudflareApiToken,
    });
  }
  return instance;
}

/**
 * Reset the cached client (useful for testing or token rotation).
 */
export function resetClient(): void {
  instance = null;
}
