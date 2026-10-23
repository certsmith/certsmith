// Certsmith CLI - Stream Container Logs
// Streams real-time logs from the certsmith container with keyboard exit (q / Esc / Ctrl+C).

import { spawn } from 'node:child_process';
import { logInfo, logOk, logFail, logBlank } from '@/utils/logger';

export interface StreamLogsOptions {
  tail?: number;
  follow?: boolean;
}

/**
 * Stream or inspect logs from the certsmith container.
 * Supports graceful exit via 'q', Esc, Enter, or Ctrl+C without killing the CLI ungracefully.
 */
export async function streamLogs(
  containerName: string,
  options: StreamLogsOptions = {},
): Promise<void> {
  const lines = options.tail ?? 100;
  const follow = options.follow ?? true;

  logBlank();
  logInfo(`Logs for "${containerName}" (last ${lines} lines${follow ? ', follow mode' : ''}):`);
  if (follow) {
    logInfo('Press "q", Esc, Enter, or Ctrl+C to stop streaming anytime.');
  }
  logBlank();

  const args = ['logs', '--tail', String(lines)];
  if (follow) {
    args.push('-f');
  }
  args.push(containerName);

  await new Promise<void>((resolve) => {
    const child = spawn('docker', args, {
      stdio: ['ignore', 'inherit', 'inherit'],
      shell: false,
    });

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;

      if (process.stdin.isTTY) {
        try {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onKeyData);
        } catch {
          // ignore if stdin already closed
        }
      }
      process.removeListener('SIGINT', onSigInt);

      if (!child.killed) {
        try {
          child.kill('SIGTERM');
        } catch {
          // ignore
        }
      }
      logBlank();
      logOk('Log stream stopped.');
      resolve();
    };

    const onSigInt = () => {
      cleanup();
    };

    const onKeyData = (data: Buffer) => {
      const key = data.toString();
      // 'q', 'Q', Esc ('\u001b'), Ctrl+C ('\u0003'), Enter ('\r' or '\n')
      if (key === 'q' || key === 'Q' || key === '\u001b' || key === '\u0003' || key === '\r' || key === '\n') {
        cleanup();
      }
    };

    process.once('SIGINT', onSigInt);

    if (follow && process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', onKeyData);
      } catch {
        // fallback to standard signal handling if raw mode fails
      }
    }

    child.on('close', () => {
      if (!cleanedUp) {
        cleanup();
      }
    });

    child.on('error', (err) => {
      logFail(`Failed to execute docker logs: ${err.message}`);
      cleanup();
    });
  });
}
