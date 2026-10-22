import type { Config } from "@react-router/dev/config"

// Mode toggle:
// true  => Pure SSR (on-demand server rendering, no prerendering/SSG)
// false => Pure SSG (Fumadocs-style static export, all routes prerendered to static HTML)
const ssr = false

export default {
  ssr,

  async prerender() {
    // When SSR is enabled, return an empty array to disable prerendering
    if (ssr) {
      return []
    }

    // When SSR is disabled (SSG mode), prerender all routes to static HTML files
    return [
      "/",
      "/error",
      "/guides",
      "/guides/root-ca",
      "/guides/acme-clients",
    ]
  },
} satisfies Config
