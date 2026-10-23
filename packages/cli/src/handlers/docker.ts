// Certsmith CLI - Docker Handler
// Submenu and direct actions for Docker container lifecycle management.

import type { CertsmithEnv } from '@/env';
import { selectOption } from '@/ui/prompt-helpers';
import { printContainerStatus } from '@/docker/check-status';
import { restartContainer } from '@/docker/restart-container';
import { buildImage } from '@/docker/build-image';
import { streamLogs, type StreamLogsOptions } from '@/docker/stream-logs';

export async function dockerStatus(containerName: string): Promise<number> {
  await printContainerStatus(containerName);
  return 0;
}

export async function dockerRestart(containerName: string): Promise<number> {
  await restartContainer(containerName);
  return 0;
}

export async function dockerBuild(buildContext: string = '.'): Promise<number> {
  await buildImage(buildContext);
  return 0;
}

export async function dockerLogs(containerName: string, tail?: number, options?: StreamLogsOptions): Promise<number> {
  await streamLogs(containerName, { tail, ...options });
  return 0;
}

type DockerAction = 'status' | 'restart' | 'build' | 'logs' | 'snapshot' | 'back';

export async function handleDocker(env: CertsmithEnv): Promise<boolean> {
  const action = await selectOption<DockerAction>(
    'Docker Operations (q / Esc to exit):',
    [
      { value: 'status', label: 'Container Status' },
      { value: 'restart', label: 'Restart Container', hint: 'Stop + Remove + Launch' },
      { value: 'build', label: 'Build Image' },
      { value: 'logs', label: 'Stream Logs', hint: 'Live follow (press q or Esc to exit)' },
      { value: 'snapshot', label: 'View Recent Logs', hint: 'Last 100 lines (static snapshot)' },
      { value: 'back', label: 'Back to main menu' },
    ],
  );

  switch (action) {
    case 'status':
      await dockerStatus(env.containerName);
      return true;
    case 'restart':
      await dockerRestart(env.containerName);
      return true;
    case 'build':
      await dockerBuild('.');
      return true;
    case 'logs':
      await dockerLogs(env.containerName, 100, { follow: true });
      return true;
    case 'snapshot':
      await dockerLogs(env.containerName, 100, { follow: false });
      return true;
    case 'back':
      return false;
  }
}
