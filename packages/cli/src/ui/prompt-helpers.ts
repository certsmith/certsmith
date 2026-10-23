// Certsmith CLI - Prompt Helpers
// Reusable @clack/prompts wrappers with shortcut support (q, Esc, Ctrl+C).

import * as p from '@clack/prompts';
import { theme } from '@/ui/theme';

/**
 * Confirm action with user. Exits process on cancel.
 */
export async function confirmAction(message: string): Promise<boolean> {
  const result = await p.confirm({ message });
  if (p.isCancel(result)) {
    p.cancel('Operation cancelled.');
    process.exit(130);
  }
  return result;
}

/**
 * Single selection from a list of options.
 * Supports quick-exit shortcuts: 'q', 'Q', and 'Escape'.
 */
export async function selectOption<T extends string>(
  message: string,
  options: { value: T; label?: string; hint?: string }[],
): Promise<T> {
  const onKeyData = (data: Buffer) => {
    // Check for Escape (0x1b standalone) or 'q' / 'Q' (0x71 / 0x51)
    const isStandaloneEsc = data.length === 1 && data[0] === 0x1b;
    const isQuitChar = data.length === 1 && (data[0] === 0x71 || data[0] === 0x51);

    if (isStandaloneEsc || isQuitChar) {
      cleanup();
      p.cancel('Cancelled.');
      process.exit(0);
    }
  };

  const cleanup = () => {
    if (process.stdin.isTTY) {
      process.stdin.removeListener('data', onKeyData);
    }
  };

  if (process.stdin.isTTY) {
    process.stdin.on('data', onKeyData);
  }

  try {
    const result = await p.select({
      message,
      options: options as Parameters<typeof p.select<T>>[0]['options'],
    });

    cleanup();

    if (p.isCancel(result)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }
    return result as T;
  } catch (err) {
    cleanup();
    throw err;
  }
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
    process.exit(130);
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
