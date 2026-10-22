// Certsmith CLI - Logger
// Pretty-prints status messages with ASCII markers and color.

import { theme } from '@/ui/theme';

export function logOk(message: string): void {
  console.log(`${theme.success(theme.markers.ok)} ${message}`);
}

export function logFail(message: string): void {
  console.log(`${theme.error(theme.markers.fail)} ${message}`);
}

export function logInfo(message: string): void {
  console.log(`${theme.info(theme.markers.info)} ${message}`);
}

export function logWarn(message: string): void {
  console.log(`${theme.warn(theme.markers.warn)} ${message}`);
}

export function logStep(label: string, value: string): void {
  console.log(`  ${theme.dim(theme.markers.arrow)} ${theme.label(label)}: ${theme.value(value)}`);
}

export function logDivider(): void {
  console.log(theme.dim('  ---'));
}

export function logBlank(): void {
  console.log();
}
