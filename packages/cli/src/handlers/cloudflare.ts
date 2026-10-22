// Certsmith CLI - Cloudflare Handler
// Submenu for Cloudflare management actions.

import { requireCloudflareEnv, type CertsmithEnv } from '@/env';
import { selectOption } from '@/ui/prompt-helpers';
import { syncAll } from '@/cloudflare/sync-all';
import { listCustomHostnames, printHostnameTable } from '@/cloudflare/saas-list';
import { getTunnelConfig, printIngressRules } from '@/cloudflare/tunnel-get';
import { logFail } from '@/utils/logger';

type CfAction = 'sync' | 'list-saas' | 'view-tunnel' | 'back';

export async function handleCloudflare(env: CertsmithEnv): Promise<void> {
  try {
    requireCloudflareEnv(env);
  } catch (err) {
    logFail(err instanceof Error ? err.message : String(err));
    return;
  }

  const action = await selectOption<CfAction>(
    'Cloudflare Management:',
    [
      { value: 'sync', label: 'Sync Domains', hint: 'SaaS + Tunnel strict TLS' },
      { value: 'list-saas', label: 'List Custom Hostnames' },
      { value: 'view-tunnel', label: 'View Tunnel Ingress' },
      { value: 'back', label: 'Back to main menu' },
    ],
  );

  switch (action) {
    case 'sync':
      await syncAll(env);
      break;
    case 'list-saas': {
      const entries = await listCustomHostnames(env);
      printHostnameTable(entries);
      break;
    }
    case 'view-tunnel': {
      const config = await getTunnelConfig(env);
      if (config) printIngressRules(config);
      break;
    }
    case 'back':
      break;
  }
}
