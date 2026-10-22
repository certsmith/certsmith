// Certsmith CLI - Docker Handler
// Submenu for Docker container lifecycle management.

import type { CertsmithEnv } from '@/env';
import { selectOption } from '@/ui/prompt-helpers';
import { printContainerStatus } from '@/docker/check-status';
import { restartContainer } from '@/docker/restart-container';
import { buildImage } from '@/docker/build-image';
import { streamLogs } from '@/docker/stream-logs';

type DockerAction = 'status' | 'restart' | 'build' | 'logs' | 'back';

export async function handleDocker(env: CertsmithEnv): Promise<void> {
  const action = await selectOption<DockerAction>(
    'Docker Operations:',
    [
      { value: 'status', label: 'Container Status' },
      { value: 'restart', label: 'Restart Container', hint: 'Stop + Remove + Launch' },
      { value: 'build', label: 'Build Image' },
      { value: 'logs', label: 'Stream Logs', hint: 'Real-time follow' },
      { value: 'back', label: 'Back to main menu' },
    ],
  );

  switch (action) {
    case 'status':
      await printContainerStatus(env.containerName);
      break;
    case 'restart':
      await restartContainer(env.containerName);
      break;
    case 'build':
      await buildImage('.');
      break;
    case 'logs':
      await streamLogs(env.containerName);
      break;
    case 'back':
      break;
  }
}
