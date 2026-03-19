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

// ── IoT ───────────────────────────────────────────────────────────────────

export type IoTDeviceType =
  | 'VEHICLE_ECU'
  | 'V2X_RSU'
  | 'SENSOR'
  | 'GATEWAY'
  | 'CAMERA'
  | 'ACTUATOR';

export type IoTProtocolId =
  | 'MQTT'
  | 'COAP_DTLS'
  | 'V2X_DSRC'
  | 'HTTPS_EST'
  | 'AMQP_TLS'
  | 'LWM2M';

export type IoTDeviceStatus = 'ONLINE' | 'OFFLINE' | 'PROVISIONING' | 'ERROR';

export type CertStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'EXPIRING_SOON';

export interface IoTDevice {
  device_id: string;
  name: string;
  type: IoTDeviceType;
  vin: string | null;
  protocol: IoTProtocolId;
  location: string;
  status: IoTDeviceStatus;
  last_seen: string;
  firmware_version: string;
  ip_address: string;
  ca_name: string;
  certificate_serial: string | null;
  cert_expiry: string | null;
  cert_status: CertStatus | null;
  clm_policy_id: string;
  kms_key_id: string | null;
  hsm_backed: boolean;
  tags: string[];
}

export interface IoTProtocol {
  id: IoTProtocolId;
  name: string;
  full_name: string;
  version: string;
  port: number | null;
  transport: string;
  security: string;
  auth_method: string;
  cert_required: boolean;
  offline_capable: boolean;
  standard: string;
  use_case: string;
  devices_count: number;
  description: string;
  best_practices: string[];
}

export type RevocationCheckMode = 'CRL' | 'OCSP' | 'BOTH';
export type ClmPriority = 'OK' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ClmAction =
  | 'NONE'
  | 'MONITOR'
  | 'ALERT'
  | 'AUTO_RENEW'
  | 'RENEW'
  | 'QUEUE_RENEWAL'
  | 'SUSPEND'
  | 'REISSUE'
  | 'ENROLL';

export interface ClmPolicy {
  id: string;
  name: string;
  description: string;
  cert_lifetime_days: number;
  renewal_threshold_days: number;
  revocation_check: RevocationCheckMode;
  crl_check_interval_hours: number | null;
  ocsp_check_interval_minutes: number | null;
  offline_tolerance_days: number;
  offline_action: 'ALERT' | 'SUSPEND' | 'REVOKE';
  auto_renew: boolean;
  renewal_protocol: string;
  kms_signing: boolean;
  hsm_required: boolean;
  ca_name: string;
  devices_count: number;
}

export interface ClmDeviceStatus {
  device_id: string;
  name: string;
  type: IoTDeviceType;
  status: IoTDeviceStatus;
  cert_status: CertStatus | null;
  cert_expiry: string | null;
  ca_name: string;
  clm_policy_id: string;
  hsm_backed: boolean;
  last_seen: string;
  clm: {
    action_needed: ClmAction;
    priority: ClmPriority;
    reason: string;
    offline_days?: number;
    crl_checked?: boolean;
    ocsp_checked?: boolean;
  };
}

export interface ClmSummary {
  total: number;
  ok: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  pending_renewal: number;
  offline_devices: number;
}

// ── AWS KMS / CloudHSM ────────────────────────────────────────────────────

export interface KmsKey {
  key_id: string;
  alias: string;
  description: string;
  key_spec: string;
  key_usage: 'SIGN_VERIFY' | 'ENCRYPT_DECRYPT';
  origin: 'AWS_KMS' | 'AWS_CLOUDHSM' | 'EXTERNAL';
  enabled: boolean;
  rotation_enabled: boolean;
  created: string;
  next_rotation: string | null;
  region: string;
  multi_region: boolean;
}

export interface HsmCluster {
  cluster_id: string;
  state: 'ACTIVE' | 'DEGRADED' | 'DELETED' | 'CREATE_IN_PROGRESS';
  hsm_type: string;
  hsm_count: number;
  availability_zones: string[];
  fips_level: string;
  created: string;
  purpose: string;
}

export interface AwsKmsConfig {
  region: string;
  account_id: string;
  hsm_clusters: HsmCluster[];
  kms_keys: KmsKey[];
  audit: {
    cloudtrail_enabled: boolean;
    cloudwatch_logs_group: string;
    last_key_usage_event: string;
    events_last_24h: number;
  };
}

// ── Revocation ────────────────────────────────────────────────────────────

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
