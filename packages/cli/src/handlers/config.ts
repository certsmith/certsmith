// Certsmith CLI - Config Management Handler
// Implements `certsmith config [init|get|set|path]`

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  getGlobalConfigPath,
  resolveConfigPaths,
  generateConfigTemplate,
  writeConfig,
} from '@/config/loader';
import { parseJsonc } from '@/config/jsonc';
import { logOk, logInfo, logFail, logWarn } from '@/utils/logger';

interface ConfigOptions {
  global?: boolean;
}

/**
 * Initialize a new config template.
 */
export async function handleConfigInit(options: ConfigOptions): Promise<number> {
  const isGlobal = Boolean(options.global);
  const targetPath = isGlobal
    ? getGlobalConfigPath()
    : resolve(process.cwd(), 'certsmith.jsonc');

  if (existsSync(targetPath)) {
    logWarn(`Configuration file already exists at: ${targetPath}`);
    return 0;
  }

  try {
    const template = generateConfigTemplate(isGlobal);
    writeConfig(targetPath, template);
    logOk(`Created configuration file: ${targetPath}`);
    logInfo('Edit this file to customize your Certsmith environment.');
    return 0;
  } catch (err) {
    logFail(`Failed to initialize configuration: ${(err as Error).message}`);
    return 1;
  }
}

/**
 * Display active and discovered configuration paths.
 */
export async function handleConfigPath(): Promise<number> {
  const { globalPath, localPath, activePaths } = resolveConfigPaths();

  console.log('\n--- Certsmith Configuration Discovery ---');
  console.log(`Global config location : ${globalPath} (${existsSync(globalPath) ? 'FOUND' : 'NOT FOUND'})`);
  console.log(`Local config location  : ${localPath} (${existsSync(localPath) ? 'FOUND' : 'NOT FOUND'})`);

  if (activePaths.length > 0) {
    console.log('\nActive loaded files (in precedence order):');
    for (const p of activePaths) {
      console.log(`  - ${p}`);
    }
  } else {
    console.log('\nNo custom config files found. Using environment variables and defaults.');
  }
  console.log('-----------------------------------------\n');
  return 0;
}

/**
 * Set a key value in the config file.
 * Handles nested dot notation (e.g. `cloudflare.apiToken` or `docker.containerName`).
 */
export async function handleConfigSet(
  key: string,
  value: string,
  options: ConfigOptions,
): Promise<number> {
  const isGlobal = Boolean(options.global);
  const targetPath = isGlobal
    ? getGlobalConfigPath()
    : resolve(process.cwd(), 'certsmith.jsonc');

  let currentData: Record<string, any> = {};

  if (existsSync(targetPath)) {
    try {
      currentData = parseJsonc<Record<string, any>>(readFileSync(targetPath, 'utf-8'));
    } catch {
      currentData = {};
    }
  }

  // Parse value (boolean, array, number, string)
  let parsedValue: any = value;
  if (value.toLowerCase() === 'true') parsedValue = true;
  else if (value.toLowerCase() === 'false') parsedValue = false;
  else if (!isNaN(Number(value)) && value.trim() !== '') parsedValue = Number(value);
  else if (value.startsWith('[') && value.endsWith(']')) {
    try {
      parsedValue = JSON.parse(value);
    } catch {
      parsedValue = value;
    }
  }

  const keys = key.split('.');
  let current = currentData;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!current[k] || typeof current[k] !== 'object') {
      current[k] = {};
    }
    current = current[k];
  }
  current[keys[keys.length - 1]] = parsedValue;

  try {
    writeConfig(targetPath, JSON.stringify(currentData, null, 2) + '\n');
    logOk(`Set "${key}" = ${JSON.stringify(parsedValue)} in ${targetPath}`);
    return 0;
  } catch (err) {
    logFail(`Failed to save configuration: ${(err as Error).message}`);
    return 1;
  }
}

/**
 * Get a configuration value or display full config.
 */
export async function handleConfigGet(key?: string): Promise<number> {
  const { globalPath, localPath } = resolveConfigPaths();
  let merged: Record<string, any> = {};

  if (existsSync(globalPath)) {
    try {
      merged = { ...merged, ...parseJsonc<Record<string, any>>(readFileSync(globalPath, 'utf-8')) };
    } catch {}
  }
  if (existsSync(localPath)) {
    try {
      merged = { ...merged, ...parseJsonc<Record<string, any>>(readFileSync(localPath, 'utf-8')) };
    } catch {}
  }

  if (!key) {
    console.log(JSON.stringify(merged, null, 2));
    return 0;
  }

  const keys = key.split('.');
  let current: any = merged;
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      current = undefined;
      break;
    }
  }

  if (current === undefined) {
    logWarn(`Key "${key}" is not set in any active configuration.`);
    return 1;
  }

  if (typeof current === 'object') {
    console.log(JSON.stringify(current, null, 2));
  } else {
    console.log(String(current));
  }
  return 0;
}
