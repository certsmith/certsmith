// Certsmith CLI - Async Exec Utility
// Wraps child_process for safe async command execution.

import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Execute a shell command and capture output.
 * Returns a resolved result even on non-zero exit (check exitCode).
 */
export async function run(
  command: string,
  options?: { cwd?: string; timeout?: number },
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: options?.cwd,
      timeout: options?.timeout ?? 30_000,
    });
    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: (e.stdout ?? '').trim(),
      stderr: (e.stderr ?? '').trim(),
      exitCode: e.code ?? 1,
    };
  }
}

/**
 * Stream a command's stdout/stderr to the terminal in real time.
 */
export function streamCommand(
  command: string,
  args: string[],
  options?: { cwd?: string },
): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options?.cwd,
      stdio: 'inherit',
      shell: false,
    });
    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}
