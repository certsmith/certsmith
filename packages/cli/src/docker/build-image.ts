// Certsmith CLI - Build Docker Image
// Executes docker build for the certsmith multi-stage image.

import { streamCommand } from '@/utils/exec';
import { logOk, logFail, logInfo, logStep } from '@/utils/logger';
import { confirmAction } from '@/ui/prompt-helpers';

const DEFAULT_TAG = 'ghcr.io/certsmith/certsmith:latest';

/**
 * Build the certsmith Docker image from the project root Dockerfile.
 * Streams build output to the terminal in real time.
 */
export async function buildImage(
  contextPath: string,
  tag?: string,
): Promise<boolean> {
  const imageTag = tag ?? DEFAULT_TAG;

  logInfo(`Building image: ${imageTag}`);
  logStep('Context', contextPath);

  const confirmed = await confirmAction('Start Docker build?');
  if (!confirmed) return false;

  const exitCode = await streamCommand('docker', [
    'build',
    '-t', imageTag,
    contextPath,
  ]);

  if (exitCode === 0) {
    logOk(`Image built successfully: ${imageTag}`);
    return true;
  }

  logFail(`Build failed with exit code ${exitCode}.`);
  return false;
}
