// Certsmith CLI - Launch Container
// Runs the certsmith Docker container with proper volume and environment mappings.

import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { run } from '@/utils/exec';
import { logOk, logFail, logInfo, logStep } from '@/utils/logger';
import { findHostDataDir } from '@/pki/pki-paths';
import * as p from '@clack/prompts';

const DEFAULT_IMAGE = 'ghcr.io/certsmith/certsmith:latest';

/**
 * Locate .env file by walking up from current working directory.
 */
function findEnvFilePath(): string | null {
  let current = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(current, '.env');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

/**
 * Launch a new certsmith container with detected volume and environment.
 */
export async function launchContainer(
  containerName: string,
  image?: string,
): Promise<boolean> {
  const img = image ?? DEFAULT_IMAGE;
  const spinner = p.spinner();
  spinner.start(`Launching container "${containerName}"...`);

  // Detect host data directory and env file
  const hostDataDir = findHostDataDir() ?? resolve(process.cwd(), 'data');
  const envFilePath = findEnvFilePath();

  const cmdParts = [
    'docker run -d',
    `--name ${containerName}`,
    '--restart unless-stopped',
    '--network host',
    `-v ${hostDataDir}:/data`,
  ];

  if (envFilePath) {
    cmdParts.push(`--env-file ${envFilePath}`);
  }

  cmdParts.push(img);

  const cmd = cmdParts.join(' ');
  const result = await run(cmd, { timeout: 60_000 });

  if (result.exitCode === 0) {
    spinner.stop('Container launched.');
    logOk(`Container "${containerName}" started.`);
    logStep('Image', img);
    logStep('Data Volume', `${hostDataDir} -> /data`);
    if (envFilePath) {
      logStep('Env File', envFilePath);
    }
    logStep('Container ID', result.stdout.slice(0, 12));
    return true;
  }

  spinner.stop('Failed to launch container.');
  logFail(result.stderr || result.stdout);
  return false;
}
