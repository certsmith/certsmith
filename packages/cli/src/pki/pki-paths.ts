// Certsmith CLI - PKI Path Resolver & Execution Helper
// Seamlessly resolves certificate paths on Host or inside Docker container.

import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { run, type ExecResult } from '@/utils/exec';

/**
 * Locate host data directory by walking up from current working directory.
 */
export function findHostDataDir(): string | null {
  const envData = process.env.CERTSMITH_DATA;
  if (envData && existsSync(resolve(envData, 'root', 'root_ca.crt'))) {
    return resolve(envData);
  }

  let current = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(current, 'data');
    if (existsSync(resolve(candidate, 'root', 'root_ca.crt'))) {
      return candidate;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  // Fallback to legacy default
  const optData = '/opt/certsmith/data';
  if (existsSync(resolve(optData, 'root', 'root_ca.crt'))) {
    return optData;
  }

  return null;
}

/**
 * Check if the target Docker container is running.
 */
export async function isContainerRunning(containerName: string = 'certsmith'): Promise<boolean> {
  const res = await run(`docker inspect -f '{{.State.Running}}' ${containerName}`);
  return res.exitCode === 0 && res.stdout.includes('true');
}

export interface CertLocation {
  hostPath: string | null;
  containerPath: string;
}

/**
 * Get resolved location for Root CA certificate.
 */
export function getRootCertLocation(): CertLocation {
  const hostDir = findHostDataDir();
  return {
    hostPath: hostDir ? resolve(hostDir, 'root', 'root_ca.crt') : null,
    containerPath: '/data/root/root_ca.crt',
  };
}

/**
 * Get resolved location for Intermediate CA certificate.
 */
export function getIntermediateCertLocation(tier: string): CertLocation {
  const hostDir = findHostDataDir();
  let hostPath: string | null = null;

  if (hostDir) {
    const primaryCandidate = resolve(hostDir, 'intermediates', tier, 'intermediate_ca.crt');
    const legacyCandidate = resolve(hostDir, tier, `${tier}_intermediate_ca.crt`);
    if (existsSync(primaryCandidate)) {
      hostPath = primaryCandidate;
    } else if (existsSync(legacyCandidate)) {
      hostPath = legacyCandidate;
    } else {
      hostPath = primaryCandidate;
    }
  }

  return {
    hostPath,
    containerPath: `/data/intermediates/${tier}/intermediate_ca.crt`,
  };
}

/**
 * Get resolved location for Portal TLS certificate.
 */
export function getPortalCertLocation(): CertLocation {
  const hostDir = findHostDataDir();
  let hostPath: string | null = null;

  if (hostDir) {
    const tlsCandidate = resolve(hostDir, 'tls', 'certsmith-rsa.crt');
    const portalCandidate = resolve(hostDir, 'portal', 'portal.crt');
    if (existsSync(tlsCandidate)) {
      hostPath = tlsCandidate;
    } else if (existsSync(portalCandidate)) {
      hostPath = portalCandidate;
    }
  }

  return {
    hostPath,
    containerPath: '/data/tls/certsmith-rsa.crt',
  };
}

/**
 * Execute an OpenSSL command either locally on host or via docker exec inside container.
 */
export async function runOpenssl(
  certLoc: CertLocation,
  subCommandArgs: string,
  extraHostCA?: string | null,
  extraContainerCA?: string,
  containerName: string = 'certsmith',
): Promise<ExecResult> {
  // 1. Try local host execution if host file exists
  if (certLoc.hostPath && existsSync(certLoc.hostPath)) {
    let localCmd = `openssl ${subCommandArgs.replace('__CERT__', certLoc.hostPath)}`;
    if (extraHostCA) {
      localCmd = localCmd.replace('__CA__', extraHostCA);
    }
    const localRes = await run(localCmd);
    if (localRes.exitCode === 0 || !await isContainerRunning(containerName)) {
      return localRes;
    }
  }

  // 2. Fallback to docker exec if container is running
  if (await isContainerRunning(containerName)) {
    let dockerCmd = `docker exec ${containerName} openssl ${subCommandArgs.replace('__CERT__', certLoc.containerPath)}`;
    if (extraContainerCA) {
      dockerCmd = dockerCmd.replace('__CA__', extraContainerCA);
    }
    return run(dockerCmd);
  }

  // 3. Return informative error if neither host path nor container is accessible
  return {
    stdout: '',
    stderr: `Certificate file not found on host (${certLoc.hostPath ?? 'unknown'}) and Docker container "${containerName}" is not running.`,
    exitCode: 1,
  };
}
