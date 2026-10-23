// Certsmith CLI - Local Ephemeral Auth Server
// Spawns a temporary HTTP server on localhost to serve the Auth Wizard UI,
// receive the API token, verify it against Cloudflare, and persist to config.

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import Cloudflare from 'cloudflare';
import { getGlobalConfigPath, writeConfig } from '@/config/loader';
import { parseJsonc } from '@/config/jsonc';
import { logOk, logInfo, logFail, logStep, logBlank } from '@/utils/logger';
import { generateAuthWizardHtml } from '@/auth/html';

interface VerifyPayload {
  token: string;
  accountId?: string;
  zoneId?: string;
  tunnelId?: string;
}

interface VerifyResult {
  success: boolean;
  error?: string;
  accountName?: string;
  accountId?: string;
  configPath?: string;
}

/**
 * Verify a Cloudflare API token and optionally auto-discover account info.
 */
async function verifyCloudflareToken(payload: VerifyPayload): Promise<VerifyResult> {
  const { token, accountId, zoneId, tunnelId } = payload;
  const configPath = getGlobalConfigPath();

  try {
    const cf = new Cloudflare({ apiToken: token });

    // Verify token is active
    const verifyResponse = await cf.user.tokens.verify();
    if (verifyResponse.status !== 'active') {
      return {
        success: false,
        error: `Token status is "${verifyResponse.status}". Expected "active". Please check your token.`,
      };
    }

    // Try to auto-discover account info if not provided
    let resolvedAccountId = accountId || '';
    let resolvedAccountName = '';

    if (!resolvedAccountId) {
      try {
        const accounts = await cf.accounts.list({ per_page: 1 });
        const firstAccount = accounts.result?.[0];
        if (firstAccount) {
          resolvedAccountId = firstAccount.id;
          resolvedAccountName = firstAccount.name ?? '';
        }
      } catch {
        // Account discovery is optional — continue without it
      }
    }

    // Persist credentials to global config
    let existingConfig: Record<string, any> = {};
    if (existsSync(configPath)) {
      try {
        existingConfig = parseJsonc<Record<string, any>>(readFileSync(configPath, 'utf-8'));
      } catch {
        existingConfig = {};
      }
    }

    // Merge cloudflare credentials into existing config
    const cfConfig: Record<string, string> = { apiToken: token };
    if (resolvedAccountId) cfConfig.accountId = resolvedAccountId;
    if (zoneId) cfConfig.zoneId = zoneId;
    if (tunnelId) cfConfig.tunnelId = tunnelId;

    existingConfig.cloudflare = {
      ...(existingConfig.cloudflare ?? {}),
      ...cfConfig,
    };

    writeConfig(configPath, JSON.stringify(existingConfig, null, 2) + '\n');

    return {
      success: true,
      accountName: resolvedAccountName,
      accountId: resolvedAccountId,
      configPath,
    };
  } catch (err) {
    const message = (err as Error).message ?? String(err);

    if (message.includes('401') || message.includes('Invalid API Token')) {
      return {
        success: false,
        error: 'Invalid API Token. Double-check that you copied the full token string.',
      };
    }

    if (message.includes('403')) {
      return {
        success: false,
        error: 'Token is valid but lacks required permissions. Ensure the token has Zone:DNS:Edit, Zone:SSL:Edit, and Account:Tunnel:Edit.',
      };
    }

    return {
      success: false,
      error: `Verification failed: ${message}`,
    };
  }
}

/**
 * Parse JSON body from an incoming HTTP request.
 */
function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send a JSON response.
 */
function sendJson(res: ServerResponse, statusCode: number, data: any): void {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

/**
 * Send an HTML response.
 */
function sendHtml(res: ServerResponse, html: string): void {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(html);
}

/**
 * Start the ephemeral local auth server.
 * Returns the bound port and a promise that resolves when the user completes auth.
 */
export function startAuthServer(): Promise<{ port: number; done: Promise<{ success: boolean }> }> {
  return new Promise((resolveStart) => {
    const done = new Promise<{ success: boolean }>((resolveDone) => {
      const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? '/', `http://localhost`);

        // CORS preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          res.end();
          return;
        }

        // Serve the wizard HTML
        if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/auth')) {
          const port = (server.address() as any)?.port ?? 0;
          sendHtml(res, generateAuthWizardHtml(port));
          return;
        }

        // Token verification endpoint
        if (req.method === 'POST' && url.pathname === '/api/verify') {
          try {
            const payload = (await parseBody(req)) as VerifyPayload;

            if (!payload.token) {
              sendJson(res, 400, { success: false, error: 'Token is required.' });
              return;
            }

            logInfo('Verifying Cloudflare API token...');
            const result = await verifyCloudflareToken(payload);

            if (result.success) {
              logBlank();
              logOk('Cloudflare API token verified successfully!');
              if (result.accountName) logStep('Account', result.accountName);
              if (result.accountId) logStep('Account ID', result.accountId);
              logStep('Config saved', result.configPath ?? getGlobalConfigPath());
              logBlank();

              sendJson(res, 200, result);

              // Gracefully shut down the server after a small delay
              setTimeout(() => {
                server.close(() => {
                  resolveDone({ success: true });
                });
              }, 1500);
            } else {
              logFail(result.error ?? 'Token verification failed.');
              sendJson(res, 200, result);
            }
          } catch (err) {
            sendJson(res, 500, {
              success: false,
              error: `Server error: ${(err as Error).message}`,
            });
          }
          return;
        }

        // 404 for everything else
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      });

      // Listen on a dynamic port (OS assigns a free port)
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        logInfo(`Auth wizard running at http://127.0.0.1:${port}/auth`);
        resolveStart({ port, done });
      });

      // Handle server errors
      server.on('error', (err) => {
        logFail(`Auth server error: ${err.message}`);
        resolveDone({ success: false });
      });
    });
  });
}
