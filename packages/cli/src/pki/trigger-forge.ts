// Certsmith CLI - Forge Ceremony Trigger
// Runs the offline root/intermediate CA forge ceremony script self-contained within packages/cli.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { streamCommand } from '@/utils/exec';
import { logOk, logFail, logInfo, logStep, logBlank, logWarn } from '@/utils/logger';
import { confirmAction } from '@/ui/prompt-helpers';

/**
 * Locate the bundled certsmith-forge.sh script inside this package.
 */
function resolveForgeScript(): string {
  const currentDir = typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));

  // 1. Packaged location (packages/cli/scripts/certsmith-forge.sh)
  const inPackage = resolve(currentDir, '../scripts/certsmith-forge.sh');
  if (existsSync(inPackage)) return inPackage;

  // 2. Relative to package root
  const inPkgRoot = resolve(currentDir, '../../scripts/certsmith-forge.sh');
  if (existsSync(inPkgRoot)) return inPkgRoot;

  // 3. Fallback to process.cwd()
  const inCwd = resolve(process.cwd(), 'scripts/certsmith-forge.sh');
  if (existsSync(inCwd)) return inCwd;

  return inPackage;
}

/**
 * Trigger the full PKI ceremony via bundled certsmith-forge.sh.
 * WARNING: This is a destructive operation for initial setup or root rotation.
 */
export async function triggerForge(envPath = '.env', dataDir = './data'): Promise<boolean> {
  const scriptPath = resolveForgeScript();

  logBlank();
  logInfo('PKI Forge Ceremony');
  logStep('Script', scriptPath);
  logWarn('This is a high-impact operation that regenerates CA certificates.');
  logWarn('Existing intermediate CAs may be invalidated.');
  logBlank();

  const firstConfirm = await confirmAction(
    'Are you sure you want to run the forge ceremony?',
  );
  if (!firstConfirm) return false;

  const secondConfirm = await confirmAction(
    'This cannot be undone. Confirm again to proceed.',
  );
  if (!secondConfirm) return false;

  logInfo('Running forge ceremony...');

  const exitCode = await streamCommand('bash', [scriptPath, envPath, dataDir], {
    cwd: process.cwd(),
  });

  if (exitCode === 0) {
    logOk('Forge ceremony completed successfully.');
    return true;
  }

  logFail(`Forge ceremony failed with exit code ${exitCode}.`);
  return false;
}
