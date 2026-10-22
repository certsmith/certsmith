// Certsmith CLI - Main Entry Point
// Interactive menu dispatcher for all engines.

import * as p from '@clack/prompts';
import { printBanner } from '@/ui/banner';
import { selectOption } from '@/ui/prompt-helpers';
import { loadEnv } from '@/env';
import { logFail } from '@/utils/logger';
import { handleCloudflare } from '@/handlers/cloudflare';
import { handleStepCa } from '@/handlers/stepca';
import { handleDocker } from '@/handlers/docker';
import { handlePki } from '@/handlers/pki';
import { handleHealthcheck } from '@/handlers/healthcheck';

type MenuAction = 'cf' | 'stepca' | 'docker' | 'pki' | 'health' | 'exit';

async function mainMenu(): Promise<MenuAction> {
  return selectOption<MenuAction>('Select an engine:', [
    { value: 'cf', label: '[CF] Cloudflare Management' },
    { value: 'stepca', label: '[CA] step-ca Operations' },
    { value: 'docker', label: '[DOCKER] Docker Operations' },
    { value: 'pki', label: '[PKI] PKI & CA Operations' },
    { value: 'health', label: '[SYS] Full Healthcheck' },
    { value: 'exit', label: 'Exit' },
  ]);
}

async function main(): Promise<void> {
  printBanner();

  let env;
  try {
    env = loadEnv();
  } catch (err) {
    logFail((err as Error).message);
    process.exit(1);
  }

  let running = true;
  while (running) {
    const action = await mainMenu();

    switch (action) {
      case 'cf': await handleCloudflare(env); break;
      case 'stepca': await handleStepCa(env); break;
      case 'docker': await handleDocker(env); break;
      case 'pki': await handlePki(env); break;
      case 'health': await handleHealthcheck(env); break;
      case 'exit': running = false; break;
    }
  }

  p.outro('Goodbye.');
}

main().catch((err) => {
  logFail(`Fatal: ${(err as Error).message}`);
  process.exit(1);
});
