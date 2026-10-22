/**
 * Dynamic URL interpolation utility for Certsmith guides and documentation.
 * Resolves placeholders based on the active browser origin / host.
 */

export interface TierVariables {
  CA_ORIGIN: string
  CA_HOST: string
  ROOT_CA_URL: string
  HEALTH_URL: string
  // All 6 Container Tiers
  ACME_URL_CE1: string
  ACME_URL_CE2: string
  ACME_URL_CE3: string
  ACME_URL_CR1: string
  ACME_URL_CR2: string
  ACME_URL_CR3: string
  // Defaults
  ACME_URL_DEFAULT: string
  ACME_URL_LEGACY: string
  [key: string]: string
}

export function buildTierVariables(origin: string): TierVariables {
  const cleanOrigin = origin.replace(/\/+$/, "")
  let hostname = "localhost"
  try {
    hostname = new URL(cleanOrigin).hostname
  } catch {
    // If not a valid absolute URL yet
    hostname = cleanOrigin.split(":")[0] || "localhost"
  }

  return {
    CA_ORIGIN: cleanOrigin,
    CA_HOST: hostname,
    ROOT_CA_URL: `${cleanOrigin}/root_ca.crt`,
    HEALTH_URL: `${cleanOrigin}/healthz`,
    // ECC Tiers
    ACME_URL_CE1: `${cleanOrigin}/ce1/acme/ce1/directory`,
    ACME_URL_CE2: `${cleanOrigin}/ce2/acme/ce2/directory`,
    ACME_URL_CE3: `${cleanOrigin}/ce3/acme/ce3/directory`,
    // RSA Tiers
    ACME_URL_CR1: `${cleanOrigin}/cr1/acme/cr1/directory`,
    ACME_URL_CR2: `${cleanOrigin}/cr2/acme/cr2/directory`,
    ACME_URL_CR3: `${cleanOrigin}/cr3/acme/cr3/directory`,
    // Common aliases
    ACME_URL_DEFAULT: `${cleanOrigin}/ce2/acme/ce2/directory`,
    ACME_URL_LEGACY: `${cleanOrigin}/cr3/acme/cr3/directory`,
  }
}

export function interpolateVariables(
  content: string,
  variables: Record<string, string>
): string {
  return content.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match
  })
}
