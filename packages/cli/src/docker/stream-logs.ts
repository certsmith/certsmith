// Certsmith CLI - Stream Container Logs
// Streams real-time logs from the certsmith container.

import { streamCommand } from '@/utils/exec';
import { logInfo, logFail } from '@/utils/logger';

/**
 * Stream logs from the certsmith container to the terminal.
 * Uses `docker logs -f` for real-time follow mode.
 * Press Ctrl+C to stop streaming.
 */
export async function streamLogs(
  containerName: string,
  tail?: number,
): Promise<void> {
  const lines = tail ?? 100;
  logInfo(`Streaming logs from "${containerName}" (last ${lines} lines, follow mode)...`);
  logInfo('Press Ctrl+C to stop.');

  const exitCode = await streamCommand('docker', [
    'logs',
    '-f',
    '--tail', String(lines),
    containerName,
  ]);

  if (exitCode !== 0 && exitCode !== 130) {
    logFail(`Log stream exited with code ${exitCode}.`);
  }
}
