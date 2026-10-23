// Certsmith CLI - Command Tree (Commander)
// Dispatches non-interactive subcommands and interactive launch.

import { Command } from 'commander';
import { loadEnv } from '@/env';
import { printBanner } from '@/ui/banner';
import { logFail } from '@/utils/logger';
import { syncCloudflare, listCloudflareHostnames, viewCloudflareTunnel } from '@/handlers/cloudflare';
import { dockerStatus, dockerRestart, dockerBuild, dockerLogs } from '@/handlers/docker';
import { stepcaHealth, stepcaProvisioners, stepcaRevoke } from '@/handlers/stepca';
import { pkiAudit, pkiVerify, pkiRenewPortal, pkiRotate, pkiCeremony } from '@/handlers/pki';
import { handleHealthcheck } from '@/handlers/healthcheck';
import { handleConfigInit, handleConfigPath, handleConfigGet, handleConfigSet } from '@/handlers/config';
import { handleLogin } from '@/handlers/auth';

export function createProgram(onInteractiveLaunch: () => Promise<void>): Command {
  const program = new Command();

  program
    .name('certsmith')
    .description('Unified CLI Hub for Certsmith - Cloudflare SaaS, step-ca, Docker, and PKI Management')
    .version('1.0.0')
    .option('-c, --config <path>', 'Custom path to configuration file')
    .option('-i, --interactive', 'Explicitly launch interactive menu');

  // Helper to wrap async actions with exit code and error handling
  const actionWrapper = (fn: (env: ReturnType<typeof loadEnv>) => Promise<number | void>) => {
    return async () => {
      const opts = program.opts<{ config?: string }>();
      try {
        const env = loadEnv(opts.config);
        const exitCode = (await fn(env)) ?? 0;
        process.exit(exitCode);
      } catch (err) {
        logFail((err as Error).message);
        process.exit(1);
      }
    };
  };

  // Interactive Hub
  program
    .command('interactive')
    .alias('ui')
    .description('Launch the interactive prompt menu')
    .action(async () => {
      await onInteractiveLaunch();
    });

  // Cloudflare Group
  const cf = program.command('cf').description('Cloudflare Zero Trust & SaaS operations');
  cf.command('sync')
    .description('Sync domains to Cloudflare SaaS and enforce strict tunnel TLS')
    .action(actionWrapper(async (env) => syncCloudflare(env)));
  cf.command('list')
    .description('List custom hostnames on Cloudflare SaaS')
    .action(actionWrapper(async (env) => listCloudflareHostnames(env)));
  cf.command('tunnel')
    .description('View Cloudflare tunnel ingress rules')
    .action(actionWrapper(async (env) => viewCloudflareTunnel(env)));

  // step-ca Group
  const ca = program.command('ca').description('step-ca certificate authority operations');
  ca.command('health')
    .description('Check health of all 6 step-ca tiers')
    .action(actionWrapper(async (env) => stepcaHealth(env.containerName)));
  ca.command('provisioners [tier]')
    .description('List provisioners for a tier (cr1, cr2, cr3, ce1, ce2, ce3)')
    .action((tier) => actionWrapper(async (env) => stepcaProvisioners(env.containerName, tier))());
  ca.command('revoke [tier]')
    .description('Revoke certificate for a tier')
    .action((tier) => actionWrapper(async (env) => stepcaRevoke(env.containerName, tier))());

  // Docker Group
  const docker = program.command('docker').description('Docker container management operations');
  docker.command('status')
    .description('Check certsmith container status and health')
    .action(actionWrapper(async (env) => dockerStatus(env.containerName)));
  docker.command('restart')
    .description('Restart the certsmith container')
    .action(actionWrapper(async (env) => dockerRestart(env.containerName)));
  docker.command('build [path]')
    .description('Build the Docker image')
    .action((path) => actionWrapper(async () => dockerBuild(path ?? '.'))());
  docker.command('logs [tail]')
    .description('Stream real-time logs from the container')
    .action((tail) => actionWrapper(async (env) => dockerLogs(env.containerName, tail ? Number(tail) : 100))());

  // PKI Group
  const pki = program.command('pki').description('PKI and root/intermediate authority operations');
  pki.command('audit')
    .description('Audit expiry of root and intermediate certificates')
    .action(actionWrapper(async () => pkiAudit()));
  pki.command('verify')
    .description('Verify OpenSSL certificate chain integrity')
    .action(actionWrapper(async () => pkiVerify()));
  pki.command('renew-portal')
    .description('Renew portal TLS leaf certificates')
    .action(actionWrapper(async (env) => pkiRenewPortal(env.containerName)));
  pki.command('rotate')
    .description('Rotate intermediate certificate')
    .action(actionWrapper(async (env) => pkiRotate(env.containerName)));
  pki.command('ceremony')
    .description('Trigger offline Root CA forge ceremony')
    .action(actionWrapper(async () => pkiCeremony()));

  // Healthcheck
  program
    .command('health')
    .description('Run comprehensive health check across Docker, step-ca, and PKI')
    .action(actionWrapper(async (env) => handleHealthcheck(env)));

  // Login (Browser-based Auth Wizard)
  program
    .command('login')
    .description('Authenticate with Cloudflare via browser-based setup wizard')
    .option('--no-browser', 'Print the URL instead of opening a browser (for SSH/headless)')
    .action(async (opts) => {
      const code = await handleLogin({ noBrowser: !opts.browser });
      process.exit(code);
    });

  // Configuration Group
  const config = program.command('config').description('Manage Certsmith configuration and credentials');
  config.command('init')
    .description('Initialize starter configuration file')
    .option('-g, --global', 'Create user global config (~/.config/certsmith/config.jsonc)')
    .action(async (opts) => {
      const code = await handleConfigInit({ global: opts.global });
      process.exit(code);
    });
  config.command('path')
    .description('Show active and discovered configuration paths')
    .action(async () => {
      const code = await handleConfigPath();
      process.exit(code);
    });
  config.command('get [key]')
    .description('Get configuration value (e.g. cloudflare.accountId or full config)')
    .action(async (key) => {
      const code = await handleConfigGet(key);
      process.exit(code);
    });
  config.command('set <key> <value>')
    .description('Set configuration key value')
    .option('-g, --global', 'Set in user global config (~/.config/certsmith/config.jsonc)')
    .action(async (key, value, opts) => {
      const code = await handleConfigSet(key, value, { global: opts.global });
      process.exit(code);
    });

  return program;
}
