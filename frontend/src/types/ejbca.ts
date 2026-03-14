export interface CA {
  id: number;
  name: string;
  subject_dn: string;
  issuer_dn: string;
  serial_number: string;
  status: 'ACTIVE' | 'OFFLINE' | 'EXTERNAL';
  type: 'ROOT' | 'SUBCA';
  expiration_date: string;
  crl_next_update: string;
  crl_last_update: string;
  signature_algorithm: string;
  key_algorithm: string;
  key_size: number;
  certificate_profile: string;
}

export interface Certificate {
  serial_number: string;
  subject_dn: string;
  issuer_dn: string;
  ca_name: string;
  username: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  not_before: string;
  not_after: string;
  revocation_date: string | null;
  revocation_reason: string | null;
  certificate_profile: string;
  type: 'CLIENT' | 'SERVER' | 'CA';
  fingerprint: string;
}

export interface EndEntity {
  username: string;
  subject_dn: string;
  subject_alt_name: string;
  email: string;
  status: 'NEW' | 'FAILED' | 'INITIALIZED' | 'INPROCESS' | 'GENERATED' | 'REVOKED' | 'HISTORICAL';
  ca_name: string;
  certificate_profile: string;
  end_entity_profile: string;
  token_type: string;
  created: string;
  modified: string;
}

export interface HealthStatus {
  status: 'OK' | 'ERROR' | 'UNREACHABLE';
  detail?: string;
  source: 'mock' | 'ejbca';
  timestamp: string;
}

export interface RevocationReason {
  code: string;
  label: string;
}

export const REVOCATION_REASONS: RevocationReason[] = [
  { code: 'UNSPECIFIED', label: 'Unspecified' },
  { code: 'KEYCOMPROMISE', label: 'Key Compromise' },
  { code: 'CACOMPROMISE', label: 'CA Compromise' },
  { code: 'AFFILIATIONCHANGED', label: 'Affiliation Changed' },
  { code: 'SUPERSEDED', label: 'Superseded' },
  { code: 'CESSATIONOFOPERATION', label: 'Cessation of Operation' },
  { code: 'CERTIFICATEHOLD', label: 'Certificate Hold' },
  { code: 'PRIVILEGEWITHDRAWN', label: 'Privilege Withdrawn' },
];
