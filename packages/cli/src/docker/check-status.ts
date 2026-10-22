// Certsmith CLI - Container Status Check
// Checks if the certsmith Docker container is running.

import { run } from '@/utils/exec';
import { logOk, logFail, logStep, logBlank } from '@/utils/logger';

export interface ContainerStatus {
  running: boolean;
  status: string;
  image: string;
  uptime: string;
}

/**
 * Inspect the certsmith container and return its status.
 */
export async function checkContainerStatus(
  containerName: string,
): Promise<ContainerStatus> {
  const result = await run(
    `docker inspect --format '{{.State.Status}}|{{.Config.Image}}|{{.State.StartedAt}}' ${containerName}`,
  );

  if (result.exitCode !== 0) {
    return { running: false, status: 'not found', image: '', uptime: '' };
  }

  const [status, image, startedAt] = result.stdout.split('|');
  return {
    running: status === 'running',
    status: status ?? 'unknown',
    image: image ?? '',
    uptime: startedAt ?? '',
  };
}

/**
 * Print container status to terminal.
 */
export async function printContainerStatus(containerName: string): Promise<void> {
  const info = await checkContainerStatus(containerName);
  logBlank();
  if (info.running) {
    logOk(`Container "${containerName}" is running.`);
  } else {
    logFail(`Container "${containerName}" is ${info.status}.`);
  }
  logStep('Image', info.image || '(none)');
  logStep('Started', info.uptime || '(never)');
  logBlank();
}
