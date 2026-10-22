// Certsmith CLI - Color Theme
// Centralized color palette using picocolors for consistent terminal styling.

import pc from 'picocolors';

export const theme = {
  // Status indicators
  success: (text: string) => pc.green(text),
  error: (text: string) => pc.red(text),
  warn: (text: string) => pc.yellow(text),
  info: (text: string) => pc.cyan(text),

  // Branding
  brand: (text: string) => pc.bold(pc.magenta(text)),
  accent: (text: string) => pc.bold(pc.cyan(text)),

  // Structural
  dim: (text: string) => pc.dim(text),
  bold: (text: string) => pc.bold(text),
  label: (text: string) => pc.bold(pc.white(text)),
  value: (text: string) => pc.green(text),

  // Markers (ASCII only, zero emoji)
  markers: {
    ok: '[+]',
    fail: '[-]',
    info: '[*]',
    warn: '[!]',
    arrow: '->',
    bullet: ' - ',
  },
} as const;

export type Theme = typeof theme;
