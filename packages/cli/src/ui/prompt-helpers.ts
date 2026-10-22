// Certsmith CLI - Prompt Helpers
// Reusable @clack/prompts wrappers for consistent interactive UX.

import * as p from '@clack/prompts';
import { theme } from '@/ui/theme';

/**
 * Confirm action with user. Exits process on cancel.
 */
export async function confirmAction(message: string): Promise<boolean> {
  const result = await p.confirm({ message });
  if (p.isCancel(result)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }
  return result;
}

/**
 * Single selection from a list of options. Exits on cancel.
 */
export async function selectOption<T extends string>(
  message: string,
  options: { value: T; label?: string; hint?: string }[],
): Promise<T> {
  const result = await p.select({
    message,
    options: options as Parameters<typeof p.select<T>>[0]['options'],
  });
  if (p.isCancel(result)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }
  return result as T;
}

/**
 * Text input with validation. Exits on cancel.
 */
export async function textInput(
  message: string,
  placeholder?: string,
): Promise<string> {
  const result = await p.text({ message, placeholder });
  if (p.isCancel(result)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }
  return result;
}

/**
 * Display a note block.
 */
export function showNote(title: string, body: string): void {
  p.note(body, title);
}

/**
 * Display formatted status line.
 */
export function statusLine(
  marker: 'ok' | 'fail' | 'info' | 'warn',
  message: string,
): void {
  const prefix = theme.markers[marker];
  const colorFn =
    marker === 'ok' ? theme.success :
    marker === 'fail' ? theme.error :
    marker === 'warn' ? theme.warn :
    theme.info;
  console.log(`${colorFn(prefix)} ${message}`);
}
