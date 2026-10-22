export interface TierInfo {
  id: string
  name: string
  family: "rsa" | "ecc"
  algo: string
  keyType: "rsa" | "ecdsa"
  keySize?: number
  curve?: string
  purpose: string
  validity: string
}

export const TIERS: Record<string, TierInfo> = {
  cr1: {
    id: "cr1",
    name: "CR1",
    family: "rsa",
    algo: "RSA 4096-bit",
    keyType: "rsa",
    keySize: 4096,
    purpose: "Maximum Security / Long Term",
    validity: "20-year validity",
  },
  cr2: {
    id: "cr2",
    name: "CR2",
    family: "rsa",
    algo: "RSA 3072-bit",
    keyType: "rsa",
    keySize: 3072,
    purpose: "Enterprise Standard",
    validity: "15-year validity",
  },
  cr3: {
    id: "cr3",
    name: "CR3",
    family: "rsa",
    algo: "RSA 2048-bit",
    keyType: "rsa",
    keySize: 2048,
    purpose: "High Performance / Legacy",
    validity: "10-year validity",
  },
  ce1: {
    id: "ce1",
    name: "CE1",
    family: "ecc",
    algo: "ECDSA P-384",
    keyType: "ecdsa",
    curve: "secp384r1",
    purpose: "High Assurance",
    validity: "18-year validity",
  },
  ce2: {
    id: "ce2",
    name: "CE2",
    family: "ecc",
    algo: "ECDSA P-256",
    keyType: "ecdsa",
    curve: "secp256r1",
    purpose: "Modern Default / Fast",
    validity: "13-year validity",
  },
  ce3: {
    id: "ce3",
    name: "CE3",
    family: "ecc",
    algo: "ECDSA P-521",
    keyType: "ecdsa",
    curve: "secp521r1",
    purpose: "Ultra Security",
    validity: "20-year validity",
  },
}

export const RSA_TIERS = [TIERS.cr1, TIERS.cr2, TIERS.cr3]
export const ECC_TIERS = [TIERS.ce1, TIERS.ce2, TIERS.ce3]

export function buildAcmeUrl(baseUrl: string, tierKey: string): string {
  const origin = baseUrl.replace(/\/+$/, "")
  return `${origin}/${tierKey}/acme/${tierKey}/directory`
}

export function buildCertbotCommand(tier: TierInfo, acmeUrl: string): string {
  const parts = [
    "certbot certonly",
    `--server ${acmeUrl}`,
    "--standalone",
    "-d YOUR_DOMAIN",
    "--agree-tos",
    "--no-eff-email",
    "--email admin@example.com",
  ]

  if (tier.keyType === "rsa") {
    parts.push("--key-type rsa")
    parts.push(`--rsa-key-size ${tier.keySize}`)
  } else if (tier.keyType === "ecdsa") {
    parts.push("--key-type ecdsa")
    parts.push(`--elliptic-curve ${tier.curve}`)
  }

  return parts.join(" \\\n  ")
}

export function buildCurlCommand(acmeUrl: string): string {
  return `curl -sk ${acmeUrl} | python3 -m json.tool`
}
