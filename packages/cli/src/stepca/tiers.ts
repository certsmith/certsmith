// Certsmith CLI - step-ca Tier Registry
// Maps the 6 intermediate CA tiers to their ports, key types, and config paths.

export interface TierInfo {
  id: string;
  label: string;
  cn: string;
  keyType: 'RSA' | 'ECDSA';
  port: number;
  configPath: string;
  dbPath: string;
}

/**
 * The six intermediate CA tiers.
 * CR1-CR3 = RSA tiers, CE1-CE3 = ECC/ECDSA tiers.
 */
export const TIERS: TierInfo[] = [
  {
    id: 'cr1', label: 'CR1 (RSA 4096)', cn: 'Certsmith RSA Issuing Authority CR1',
    keyType: 'RSA', port: 9101, configPath: '/opt/certsmith/data/cr1/ca.json',
    dbPath: '/opt/certsmith/data/cr1/db',
  },
  {
    id: 'cr2', label: 'CR2 (RSA 3072)', cn: 'Certsmith RSA Issuing Authority CR2',
    keyType: 'RSA', port: 9102, configPath: '/opt/certsmith/data/cr2/ca.json',
    dbPath: '/opt/certsmith/data/cr2/db',
  },
  {
    id: 'cr3', label: 'CR3 (RSA 2048)', cn: 'Certsmith RSA Issuing Authority CR3',
    keyType: 'RSA', port: 9103, configPath: '/opt/certsmith/data/cr3/ca.json',
    dbPath: '/opt/certsmith/data/cr3/db',
  },
  {
    id: 'ce1', label: 'CE1 (ECDSA P-384)', cn: 'Certsmith ECC Issuing Authority CE1',
    keyType: 'ECDSA', port: 9201, configPath: '/opt/certsmith/data/ce1/ca.json',
    dbPath: '/opt/certsmith/data/ce1/db',
  },
  {
    id: 'ce2', label: 'CE2 (ECDSA P-256)', cn: 'Certsmith ECC Issuing Authority CE2',
    keyType: 'ECDSA', port: 9202, configPath: '/opt/certsmith/data/ce2/ca.json',
    dbPath: '/opt/certsmith/data/ce2/db',
  },
  {
    id: 'ce3', label: 'CE3 (ECDSA P-521)', cn: 'Certsmith ECC Issuing Authority CE3',
    keyType: 'ECDSA', port: 9203, configPath: '/opt/certsmith/data/ce3/ca.json',
    dbPath: '/opt/certsmith/data/ce3/db',
  },
];

/**
 * Look up a tier by its short ID (e.g., 'cr1', 'ce2').
 */
export function getTier(id: string): TierInfo | undefined {
  return TIERS.find((t) => t.id === id.toLowerCase());
}
