# Certsmith Trust Portal

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&size=20&duration=3000&pause=1000&color=0284C7&center=true&vCenter=true&width=600&lines=Certsmith+Trust+Portal+Frontend;Static+Site+Generation+with+React+Router;Pre-Rendered+HTML+with+Zero+Node.js+Runtime;Interactive+PKI+Guides+%26+Code+Highlighter" alt="Certsmith Trust Portal Subtitle" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/framework-React_Router_8-CA4245.svg?style=for-the-badge&logo=react&logoColor=white" alt="React Router 8" />
  <img src="https://img.shields.io/badge/bundler-Vite_8-646CFF.svg?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/language-TypeScript_6-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 6" />
  <img src="https://img.shields.io/badge/styling-Tailwind_CSS_v4-06B6D4.svg?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/components-Shadcn_UI-000000.svg?style=for-the-badge&logo=shadcnui&logoColor=white" alt="Shadcn UI" />
  <img src="https://img.shields.io/badge/code_style-Prettier-F7B93E.svg?style=for-the-badge&logo=prettier&logoColor=black" alt="Prettier" />
</p>

<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=react,ts,tailwind,vite,html,css" alt="Frontend Tech Stack" />
  </a>
</p>

---

## Overview

The Certsmith Trust Portal is the official web interface and self-service trust distributor for Certsmith. It serves as the primary gateway for system administrators and developers to inspect issuing CA tier statuses, obtain the Root CA certificate, access client integration snippets, and read step-by-step trust store installation documentation across operating systems and runtimes.

The frontend is architected using React Router 8 with full Static Site Generation (SSG). During container assembly, the application is compiled into pre-rendered static HTML, CSS, and client-side JavaScript assets. The production container serves these files directly through Nginx with zero Node.js server overhead.

---

## Key Capabilities

- **Zero-Runtime Static Site Generation**: All standard routes (`/`, `/guides/root-ca`, `/guides/acme-clients`, `/error`) are pre-rendered into static HTML during image compilation.
- **Dynamic Origin Interpolation**: Client-side code templates automatically adapt ACME directory URLs and certificate download commands to match the client's current browser hostname and protocol.
- **On-the-Fly Shiki Highlighting**: Integration snippets and terminal commands are formatted with syntax highlighting powered by Shiki across light and dark display modes.
- **Comprehensive Trust Guides**: Markdown-backed guides instructing users on installing the Root CA anchor across Linux (Debian, Ubuntu, Fedora, Alpine), macOS Keychain, Windows Certificate Store, Android, iOS, Docker containers, Java Keystore, and Node.js.
- **Client Configuration Generator**: Pre-formatted, copy-pasteable configurations and CLI flags for Certbot, Lego, Caddy, Traefik, and acme.sh.
- **Unified 3-Tier Error Surface**: Integrated client error boundary paired with Nginx upstream fallback routing.
- **Dark, Light, and System Themes**: Seamless theme switching backed by `next-themes` and Tailwind CSS v4 variables.

---

## Architecture and Directory Structure

```
packages/web/
├── app/
│   ├── app.css                 # Base stylesheet and theme variables
│   ├── components/             # Reusable UI components
│   │   ├── guide-viewer.tsx    # Markdown rendering and table of contents
│   │   ├── layout/             # Shell layout (Header, Footer, Navigation)
│   │   ├── markdown-code.tsx   # Markdown code block adapter
│   │   ├── quick-start.tsx     # Copy-pasteable quick-start commands
│   │   ├── status-banner.tsx   # Issuance tier status indicator
│   │   ├── tier-card.tsx       # Individual CA tier card representation
│   │   └── ui/                 # Shadcn primitives (Card, Badge, Button, Tabs, etc.)
│   ├── content/
│   │   ├── acme-clients.md     # Client configuration guide markdown
│   │   └── root-ca-installation.md # Cross-platform root installation guide markdown
│   ├── hooks/                  # Custom React hooks (useOrigin, useTheme, useHealth)
│   ├── lib/                    # Tier definitions, highlighter helpers, and interpolation
│   ├── root.tsx                # App root layout, HTML shell, and error boundary
│   ├── routes.ts               # Route definitions
│   └── routes/                 # Route components
│       ├── error.tsx           # Standalone error inspection route
│       ├── guides.$slug.tsx    # Dynamic guide route
│       ├── guides._index.tsx   # Guides redirect handler
│       ├── guides.tsx          # Guides layout wrapper
│       └── home.tsx            # Main portal dashboard
├── public/                     # Static assets (Favicons, web manifest, logos)
├── react-router.config.ts      # SSG prerender route configuration
├── vite.config.ts              # Vite 8 configuration with Tailwind v4 plugin
├── tsconfig.json               # TypeScript compiler configuration
└── package.json                # Project dependencies and script declarations
```

---

## Development Workflow

### Prerequisites

- Node.js 22 LTS or Node.js 24 Alpine
- pnpm (managed via Corepack or standalone installation)

### Installation

```bash
pnpm install
```

### Development Server

Launch the Vite local development server with Hot Module Replacement:

```bash
pnpm dev
```

The portal will be accessible locally at `http://localhost:5173`.

### Type Checking

Execute the React Router type generation and TypeScript compiler:

```bash
pnpm typecheck
```

### Code Formatting

Format all TypeScript, TSX, and CSS source files using Prettier:

```bash
pnpm format
```

### Static Build (SSG Export)

Compile the static production bundle:

```bash
pnpm build
```

The compiled static output will be located in `build/client`.

---

## Production Appliance Integration

The Trust Portal is compiled inside the multi-stage Dockerfile during Phase 0:

```dockerfile
FROM node:24-alpine AS pruner
WORKDIR /app
RUN npm install -g turbo@^2
COPY . .
RUN turbo prune @certsmith/web --docker

FROM node:24-alpine AS web-builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@certsmith/web
```

During Phase 2, the resulting `build/client` directory is copied directly into Nginx's document root at `/var/www/certsmith/`. The operational container contains no Node.js runtime, ensuring minimal image size, zero memory consumption from JavaScript servers, and an ultra-lean security surface.

---

## License

This frontend is part of the Certsmith project and is distributed under the MIT License. See the root [LICENSE](../LICENSE) file for complete details.
