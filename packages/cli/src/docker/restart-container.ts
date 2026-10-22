// Certsmith CLI - Restart Container
// Stops, removes, and re-launches the certsmith container.

import { run } from '@/utils/exec';
import { logOk, logFail, logInfo } from '@/utils/logger';
import { launchContainer } from '@/docker/launch-container';
import * as p from '@clack/prompts';

/**
 * Restart the container by stopping, removing, then re-launching.
 * Preserves data through the bind-mounted volume.
 */
export async function restartContainer(
  containerName: string,
  image?: string,
): Promise<boolean> {
  const spinner = p.spinner();

  // Stop
  spinner.start(`Stopping container "${containerName}"...`);
  const stopResult = await run(`docker stop ${containerName}`, { timeout: 30_000 });
  if (stopResult.exitCode !== 0) {
    spinner.stop('Container not running or not found.');
    logInfo('Proceeding with removal attempt...');
  } else {
    spinner.stop('Container stopped.');
  }

  // Remove
  const rmResult = await run(`docker rm ${containerName}`, { timeout: 10_000 });
  if (rmResult.exitCode === 0) {
    logOk('Old container removed.');
  }

  // Re-launch
  return launchContainer(containerName, image);
}
