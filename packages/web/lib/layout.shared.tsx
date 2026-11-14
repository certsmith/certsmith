import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2 font-bold text-base">
          <img src="/logo.svg" alt="Certsmith" className="size-6 object-contain" />
          <span>{appName}</span>
        </span>
      ),
      url: '/',
    },
    links: [
      {
        text: 'Trust Portal',
        url: '/',
        active: 'nested-url',
        on: 'nav',
      },
      {
        text: 'Documentation',
        url: '/docs',
        active: 'nested-url',
        on: 'nav',
      },
      {
        text: 'Root CA (.crt)',
        url: '/root_ca.crt',
        on: 'nav',
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
