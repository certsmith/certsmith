// Certsmith CLI - ASCII Banner
// Displays the branded header on CLI launch.

import { theme } from '@/ui/theme';

const ASCII_ART = `
   ____          _   ____            _ _   _
  / ___|___ _ __| |_/ ___| _ __ ___ (_) |_| |__
 | |   / _ \\ '__| __\\___ \\| '_ \` _ \\| | __| '_ \\
 | |__| __/ |  | |_ ___) | | | | | | | |_| | | |
  \\____\\___|_|   \\__|____/|_| |_| |_|_|\\__|_| |_|
`;

const VERSION = '1.0.0';

export function printBanner(): void {
  console.log(theme.brand(ASCII_ART));
  console.log(
    theme.dim(`  Unified CLI Hub v${VERSION}`) +
    theme.dim('  |  Cloudflare + Docker + PKI + step-ca')
  );
  console.log(theme.dim('  ---------------------------------------------------'));
  console.log();
}
