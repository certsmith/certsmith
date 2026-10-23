// Certsmith CLI - ASCII Banner
// Displays the branded header generated dynamically via figlet.

import figlet from 'figlet';
import { theme } from '@/ui/theme';

const VERSION = '1.0.0';

/**
 * Generate formatted ASCII art banner using figlet.
 */
function getAsciiArt(): string {
  try {
    const text = figlet.textSync('CertSmith', {
      font: 'Standard',
      horizontalLayout: 'default',
      verticalLayout: 'default',
    });
    return text;
  } catch {
    // Fallback if font loading fails
    return '  ____           _   ____            _ _   _\n / ___|___ _ __| |_/ ___| _ __ ___ (_) |_| |__\n| |   / _ \\ \'__| __\\___ \\| \'_ ` _ \\| | __| \'_ \\\n| |__|  __/ |  | |_ ___) | | | | | | | |_| | | |\n \\____\\___|_|   \\__|____/|_| |_| |_|_|\\__|_| |_|';
  }
}

/**
 * Print the full branded header with metadata and separator.
 */
export function printBanner(): void {
  const art = getAsciiArt();
  console.log(theme.brand(art));
  console.log(
    theme.dim(`  Unified CLI Hub v${VERSION} `) +
    theme.dim(' |  Cloudflare + Docker + PKI + step-ca')
  );
  console.log(theme.dim('  ---------------------------------------------------'));
  console.log();
}
