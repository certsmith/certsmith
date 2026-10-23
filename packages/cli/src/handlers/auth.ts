// Certsmith CLI - Login Handler
// Implements `certsmith login` — launches the local auth wizard or falls back to terminal prompt.

import { exec } from 'node:child_process';
import { platform } from 'node:os';
import { startAuthServer } from '@/auth/server';
import { logInfo, logOk, logFail, logBlank } from '@/utils/logger';

/**
 * Detect if we can open a browser on this system.
 */
function canOpenBrowser(): boolean {
  // SSH sessions and headless environments
  if (process.env.SSH_CONNECTION || process.env.SSH_TTY) return false;
  if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY && platform() === 'linux') return false;
  return true;
}

/**
 * Open a URL in the default browser (cross-platform).
 */
function openBrowser(url: string): void {
  const os = platform();
  const cmd =
    os === 'darwin' ? `open "${url}"` :
    os === 'win32' ? `start "" "${url}"` :
    `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) {
      logInfo(`Could not auto-open browser. Please visit manually:`);
      logInfo(url);
    }
  });
}

/**
 * Handler for `certsmith login` command.
 * Spawns an ephemeral local web server with a guided auth wizard.
 * Falls back to URL display for headless/SSH environments.
 */
export async function handleLogin(options: { noBrowser?: boolean }): Promise<number> {
  logBlank();
  logInfo('Starting Certsmith authentication wizard...');
  logBlank();

  // Start the auth server — returns the bound port and a completion promise
  const { port, done } = await startAuthServer();
  const wizardUrl = `http://127.0.0.1:${port}/auth`;

  if (!options.noBrowser && canOpenBrowser()) {
    logInfo('Opening browser...');
    openBrowser(wizardUrl);
  } else {
    logInfo('Headless environment detected. Open this URL in your browser:');
    logInfo(wizardUrl);
  }

  logInfo('Waiting for authentication to complete... (Ctrl+C to cancel)');
  logBlank();

  const result = await done;

  if (result.success) {
    logOk('Authentication complete! You can now use Cloudflare commands.');
    logBlank();
    return 0;
  } else {
    logFail('Authentication was not completed.');
    logBlank();
    return 1;
  }
}
