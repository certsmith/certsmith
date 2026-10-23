// Certsmith CLI - Cloudflare Handler
// Provides both interactive submenu and direct command actions.

import { requireCloudflareEnv, type CertsmithEnv } from '@/env';
import { selectOption } from '@/ui/prompt-helpers';
import { syncAll } from '@/cloudflare/sync-all';
import { listCustomHostnames, printHostnameTable } from '@/cloudflare/saas-list';
import { getTunnelConfig, printIngressRules } from '@/cloudflare/tunnel-get';
import { logFail } from '@/utils/logger';

export async function syncCloudflare(env: CertsmithEnv): Promise<number> {
  requireCloudflareEnv(env);
  await syncAll(env);
  return 0;
}

export async function listCloudflareHostnames(env: CertsmithEnv): Promise<number> {
  requireCloudflareEnv(env);
  const entries = await listCustomHostnames(env);
  printHostnameTable(entries);
  return 0;
}

export async function viewCloudflareTunnel(env: CertsmithEnv): Promise<number> {
  requireCloudflareEnv(env);
  const config = await getTunnelConfig(env);
  if (config) {
    printIngressRules(config);
  }
  return 0;
}

type CfAction = 'sync' | 'list-saas' | 'view-tunnel' | 'back';

export async function handleCloudflare(env: CertsmithEnv): Promise<boolean> {
  try {
    requireCloudflareEnv(env);
  } catch (err) {
    logFail(err instanceof Error ? err.message : String(err));
    return true; // Finished handling (error shown)
  }

  const action = await selectOption<CfAction>(
    'Cloudflare Management (q / Esc to exit):',
    [
      { value: 'sync', label: 'Sync Domains', hint: 'SaaS + Tunnel strict TLS' },
      { value: 'list-saas', label: 'List Custom Hostnames' },
      { value: 'view-tunnel', label: 'View Tunnel Ingress' },
      { value: 'back', label: 'Back to main menu' },
    ],
  );

  switch (action) {
    case 'sync':
      await syncCloudflare(env);
      return true;
    case 'list-saas':
      await listCloudflareHostnames(env);
      return true;
    case 'view-tunnel':
      await viewCloudflareTunnel(env);
      return true;
    case 'back':
      return false;
  }
}
