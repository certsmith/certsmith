// Certsmith CLI - Launch Container
// Runs the certsmith Docker container with proper volume and port mappings.

import { run } from '@/utils/exec';
import { logOk, logFail, logInfo, logStep } from '@/utils/logger';
import * as p from '@clack/prompts';

const DEFAULT_IMAGE = 'ghcr.io/certsmith/certsmith:latest';
const DATA_VOLUME = '/opt/certsmith/data';

/**
 * Launch a new certsmith container with standard configuration.
 */
export async function launchContainer(
  containerName: string,
  image?: string,
): Promise<boolean> {
  const img = image ?? DEFAULT_IMAGE;
  const spinner = p.spinner();
  spinner.start(`Launching container "${containerName}"...`);

  const cmd = [
    'docker run -d',
    `--name ${containerName}`,
    '--restart unless-stopped',
    '--network host',
    `-v ${DATA_VOLUME}:${DATA_VOLUME}`,
    img,
  ].join(' ');

  const result = await run(cmd, { timeout: 60_000 });

  if (result.exitCode === 0) {
    spinner.stop('Container launched.');
    logOk(`Container "${containerName}" started.`);
    logStep('Image', img);
    logStep('Container ID', result.stdout.slice(0, 12));
    return true;
  }

  spinner.stop('Failed to launch container.');
  logFail(result.stderr || result.stdout);
  return false;
}
