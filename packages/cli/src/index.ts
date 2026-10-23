// Certsmith CLI - Main Entry Point
// Routes subcommands via Commander or launches the interactive hub.

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
import { createProgram } from '@/cli';

type MenuAction = 'cf' | 'stepca' | 'docker' | 'pki' | 'health' | 'exit';

async function mainMenu(): Promise<MenuAction> {
  return selectOption<MenuAction>('Select an engine (q / Esc to exit):', [
    { value: 'cf', label: '[CF] Cloudflare Management' },
    { value: 'stepca', label: '[CA] step-ca Operations' },
    { value: 'docker', label: '[DOCKER] Docker Operations' },
    { value: 'pki', label: '[PKI] PKI & CA Operations' },
    { value: 'health', label: '[SYS] Full Healthcheck' },
    { value: 'exit', label: 'Exit' },
  ]);
}

export async function runInteractiveMenu(): Promise<void> {
  printBanner();

  let env;
  try {
    env = loadEnv();
  } catch (err) {
    logFail((err as Error).message);
    process.exit(1);
  }

  while (true) {
    const action = await mainMenu();

    let executed = false;
    switch (action) {
      case 'cf':
        executed = await handleCloudflare(env);
        break;
      case 'stepca':
        executed = await handleStepCa(env);
        break;
      case 'docker':
        executed = await handleDocker(env);
        break;
      case 'pki':
        executed = await handlePki(env);
        break;
      case 'health':
        await handleHealthcheck(env);
        executed = true;
        break;
      case 'exit':
        p.outro('Goodbye.');
        process.exit(0);
    }

    if (executed) {
      // Completed selected operation. Return cleanly to shell terminal.
      process.exit(0);
    }
  }
}

// Global process signal handlers
process.on('SIGINT', () => {
  console.log('\n');
  process.exit(130);
});
process.on('SIGTERM', () => {
  process.exit(143);
});

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const program = createProgram(runInteractiveMenu);

  if (args.length === 0) {
    // If running in terminal interactively, open Clack menu
    if (process.stdout.isTTY) {
      await runInteractiveMenu();
      return;
    }
    // If running headless / piped without arguments, output help and exit
    program.help();
    return;
  }

  if (args.includes('-i') || args.includes('--interactive')) {
    await runInteractiveMenu();
    return;
  }

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  logFail(`Fatal: ${(err as Error).message}`);
  process.exit(1);
});
