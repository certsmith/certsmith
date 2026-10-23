// Certsmith CLI - Configuration Types

export interface CloudflareConfig {
  apiToken?: string;
  accountId?: string;
  tunnelId?: string;
  zoneId?: string;
}

export interface DockerConfig {
  containerName?: string;
}

export interface StepCaConfig {
  caPoolPath?: string;
}

export interface PkiConfig {
  caPoolPath?: string;
}

export interface CertsmithConfig {
  domains?: string[];
  cloudflare?: CloudflareConfig;
  docker?: DockerConfig;
  stepca?: StepCaConfig;
  pki?: PkiConfig;
}

/**
 * Resolved runtime environment used across handlers.
 */
export interface ResolvedCertsmithContext {
  domains: string[];
  primaryDomain: string;
  cloudflareApiToken?: string;
  cloudflareAccountId?: string;
  cloudflareTunnelId?: string;
  cloudflareZoneId?: string;
  caPoolPath: string;
  containerName: string;
  configPath?: string;
}
