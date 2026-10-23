// Certsmith CLI - Dynamic Cloudflare Resource Resolver
// Lazily resolves Account ID, Zone ID, and Tunnel ID via Cloudflare API.
// Automatically selects single items, or prompts with an interactive selector
// when multiple items exist. Offers to persist choices to user global config.

import * as p from '@clack/prompts';
import type { CertsmithEnv } from '@/env';
import { getClient } from '@/cloudflare/client';
import { selectOption } from '@/ui/prompt-helpers';
import { handleConfigSet } from '@/handlers/config';
import { logInfo, logOk, logStep } from '@/utils/logger';

/**
 * Ask user a non-fatal confirmation prompt.
 */
async function askConfirm(message: string, initialValue: boolean = true): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  try {
    const res = await p.confirm({ message, initialValue });
    if (p.isCancel(res)) return false;
    return Boolean(res);
  } catch {
    return false;
  }
}

/**
 * Prompt to persist a discovered ID to ~/.config/certsmith/config.jsonc
 */
async function maybePersist(configKey: string, value: string, label: string): Promise<void> {
  if (!process.stdin.isTTY) return;
  const shouldSave = await askConfirm(
    `Save selected ${label} to global config (~/.config/certsmith/config.jsonc)?`,
    false,
  );
  if (shouldSave) {
    await handleConfigSet(configKey, value, { global: true });
  }
}

/**
 * Ensure Account ID is resolved.
 * Checks env/config first, then queries Cloudflare API.
 */
export async function ensureAccountId(
  env: CertsmithEnv,
  options?: { persist?: boolean },
): Promise<string> {
  if (env.cloudflareAccountId && env.cloudflareAccountId.trim()) {
    return env.cloudflareAccountId;
  }

  logInfo('Account ID not specified in config. Discovering accounts from Cloudflare API...');
  const cf = getClient(env);
  const accounts: { id: string; name: string }[] = [];

  try {
    for await (const acc of cf.accounts.list()) {
      if (acc.id) {
        accounts.push({ id: acc.id, name: acc.name ?? acc.id });
      }
    }
  } catch {
    // accounts.list() may fail if the token lacks Account Settings:Read.
    // Fall back to discovering account from zones (which uses Zone:Read).
    logInfo('Could not list accounts directly. Trying zone-based discovery...');
    try {
      for await (const zone of cf.zones.list({ per_page: 1 })) {
        if (zone.account?.id) {
          accounts.push({
            id: zone.account.id,
            name: zone.account.name ?? zone.account.id,
          });
          break;
        }
      }
    } catch {
      // Zone discovery also failed
    }
  }

  if (accounts.length === 0) {
    throw new Error(
      'Could not auto-discover Cloudflare Account ID.\n' +
      'Your token may lack account-level permissions.\n\n' +
      'How to fix:\n' +
      '  1. Re-run `certsmith login` with a new token that has broader permissions\n' +
      '  2. Or set your Account ID manually:\n' +
      '     certsmith config set cloudflare.accountId <ACCOUNT_ID> --global\n' +
      '  3. Find your Account ID at: https://dash.cloudflare.com → any zone → Overview → Account ID'
    );
  }

  let selectedId: string;
  let selectedName: string;

  if (accounts.length === 1) {
    selectedId = accounts[0].id;
    selectedName = accounts[0].name;
    logOk(`Auto-selected account: ${selectedName} (${selectedId})`);
  } else {
    selectedId = await selectOption(
      'Select Cloudflare Account:',
      accounts.map((a) => ({
        value: a.id,
        label: a.name,
        hint: a.id,
      })),
    );
    selectedName = accounts.find((a) => a.id === selectedId)?.name ?? selectedId;
    logStep('Account', `${selectedName} (${selectedId})`);
  }

  env.cloudflareAccountId = selectedId;

  if (options?.persist !== false) {
    await maybePersist('cloudflare.accountId', selectedId, `Account ID (${selectedName})`);
  }

  return selectedId;
}

/**
 * Ensure Zone ID is resolved.
 * Checks env/config first, then queries Cloudflare API.
 */
export async function ensureZoneId(
  env: CertsmithEnv,
  options?: { persist?: boolean },
): Promise<string> {
  if (env.cloudflareZoneId && env.cloudflareZoneId.trim()) {
    return env.cloudflareZoneId;
  }

  logInfo('Zone ID not specified in config. Discovering zones from Cloudflare API...');
  const cf = getClient(env);
  const zones: { id: string; name: string; status?: string }[] = [];

  for await (const zone of cf.zones.list()) {
    if (zone.id) {
      zones.push({
        id: zone.id,
        name: zone.name ?? zone.id,
        status: zone.status,
      });
    }
  }

  if (zones.length === 0) {
    throw new Error(
      'No Cloudflare zones found for this token.\n' +
      'Make sure your domain is active on Cloudflare and token has Zone:Read permission.'
    );
  }

  let selectedId: string;
  let selectedName: string;

  if (zones.length === 1) {
    selectedId = zones[0].id;
    selectedName = zones[0].name;
    logOk(`Auto-selected zone: ${selectedName} (${selectedId})`);
  } else {
    selectedId = await selectOption(
      'Select Cloudflare Zone (Domain):',
      zones.map((z) => ({
        value: z.id,
        label: z.name,
        hint: z.status ? `status: ${z.status}` : z.id,
      })),
    );
    selectedName = zones.find((z) => z.id === selectedId)?.name ?? selectedId;
    logStep('Zone', `${selectedName} (${selectedId})`);
  }

  env.cloudflareZoneId = selectedId;

  if (options?.persist !== false) {
    await maybePersist('cloudflare.zoneId', selectedId, `Zone ID (${selectedName})`);
  }

  return selectedId;
}

/**
 * Ensure Tunnel ID is resolved.
 * Checks env/config first, then queries Cloudflare Zero Trust Tunnels for the account.
 */
export async function ensureTunnelId(
  env: CertsmithEnv,
  options?: { accountId?: string; persist?: boolean },
): Promise<string> {
  if (env.cloudflareTunnelId && env.cloudflareTunnelId.trim()) {
    return env.cloudflareTunnelId;
  }

  const accountId = options?.accountId ?? (await ensureAccountId(env));
  logInfo('Tunnel ID not specified in config. Discovering tunnels from Cloudflare API...');
  const cf = getClient(env);
  const tunnels: { id: string; name: string; status?: string }[] = [];

  for await (const t of cf.zeroTrust.tunnels.cloudflared.list({
    account_id: accountId,
    is_deleted: false,
  })) {
    if (t.id) {
      tunnels.push({
        id: t.id,
        name: t.name ?? t.id,
        status: t.status,
      });
    }
  }

  if (tunnels.length === 0) {
    throw new Error(
      `No active Cloudflare Zero Trust Tunnels found in account ${accountId}.\n` +
      'Create a tunnel first on Cloudflare Zero Trust Dashboard.'
    );
  }

  let selectedId: string;
  let selectedName: string;

  if (tunnels.length === 1) {
    selectedId = tunnels[0].id;
    selectedName = tunnels[0].name;
    logOk(`Auto-selected tunnel: ${selectedName} (${selectedId})`);
  } else {
    selectedId = await selectOption(
      'Select Cloudflare Zero Trust Tunnel:',
      tunnels.map((t) => ({
        value: t.id,
        label: t.name,
        hint: t.status ? `status: ${t.status}` : t.id,
      })),
    );
    selectedName = tunnels.find((t) => t.id === selectedId)?.name ?? selectedId;
    logStep('Tunnel', `${selectedName} (${selectedId})`);
  }

  env.cloudflareTunnelId = selectedId;

  if (options?.persist !== false) {
    await maybePersist('cloudflare.tunnelId', selectedId, `Tunnel ID (${selectedName})`);
  }

  return selectedId;
}
