// Certsmith CLI - Docker Exec for step-ca
// Runs `step` commands inside the certsmith container.

import { run, type ExecResult } from '@/utils/exec';

/**
 * Execute a `step` CLI command inside the certsmith Docker container.
 * Wraps the command with `docker exec <container> step ...`.
 */
export async function stepExec(
  containerName: string,
  args: string[],
): Promise<ExecResult> {
  const command = `docker exec ${containerName} step ${args.join(' ')}`;
  return run(command, { timeout: 15_000 });
}

/**
 * Execute a raw command inside the certsmith container.
 * Useful for non-step commands like `cat` or `ls`.
 */
export async function containerExec(
  containerName: string,
  command: string,
): Promise<ExecResult> {
  const full = `docker exec ${containerName} ${command}`;
  return run(full, { timeout: 15_000 });
}
