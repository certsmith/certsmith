import rootCaMarkdown from "~/content/root-ca-installation.md?raw"
import acmeClientsMarkdown from "~/content/acme-clients.md?raw"

export interface GuideMeta {
  slug: string
  title: string
  shortTitle: string
  description: string
  icon: "shield-check" | "terminal"
  content: string
}

export const GUIDES: GuideMeta[] = [
  {
    slug: "root-ca",
    title: "Root CA Installation",
    shortTitle: "Root CA",
    description:
      "Step-by-step instructions to establish trust with your private Root CA across macOS, Linux, Windows, iOS, Android, and browsers.",
    icon: "shield-check",
    content: rootCaMarkdown,
  },
  {
    slug: "acme-clients",
    title: "ACME Client Configuration",
    shortTitle: "ACME Clients",
    description:
      "Automate private TLS certificate issuance with modern ACME clients including Certbot, Lego, Caddy, Traefik, and acme.sh.",
    icon: "terminal",
    content: acmeClientsMarkdown,
  },
]

export function getAllGuides(): GuideMeta[] {
  return GUIDES
}

export function getGuideBySlug(slug: string): GuideMeta | undefined {
  return GUIDES.find((g) => g.slug === slug)
}
