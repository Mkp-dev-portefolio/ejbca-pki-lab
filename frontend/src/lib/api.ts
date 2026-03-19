const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Health
export const api = {
  health: {
    get: () => apiFetch<import('@/types/ejbca').HealthStatus>('/api/health'),
    vas: () => apiFetch<{ vas: Array<{ name: string; sync: boolean; error: boolean }>; source: string; timestamp: string }>('/api/health/vas'),
  },

  cas: {
    list: () => apiFetch<{ cas: import('@/types/ejbca').CA[]; source: string }>('/api/cas'),
    crl: (name: string) =>
      apiFetch<{ ca_name: string; crl_last_update: string; crl_next_update: string; source: string }>(
        `/api/cas/${encodeURIComponent(name)}/crl`
      ),
  },

  certificates: {
    search: (params: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch<{ certificates: import('@/types/ejbca').Certificate[]; total: number; source: string }>(
        `/api/certificates/search${qs ? `?${qs}` : ''}`
      );
    },
    enroll: (body: Record<string, string>) =>
      apiFetch<{ serial_number: string; certificate: string; ca_name: string; source: string }>('/api/certificates/enroll', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    revoke: (body: { issuer_dn: string; serial_number: string; reason: string }) =>
      apiFetch<{ revoked: boolean; serial_number: string; reason: string; source: string }>('/api/certificates/revoke', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
  },

  iot: {
    devices: {
      list: (params?: Record<string, string>) => {
        const qs = params ? new URLSearchParams(params).toString() : '';
        return apiFetch<{ devices: import('@/types/ejbca').IoTDevice[]; total: number; source: string }>(
          `/api/iot/devices${qs ? `?${qs}` : ''}`
        );
      },
      get: (id: string) =>
        apiFetch<import('@/types/ejbca').IoTDevice & { source: string }>(
          `/api/iot/devices/${encodeURIComponent(id)}`
        ),
      create: (body: Partial<import('@/types/ejbca').IoTDevice>) =>
        apiFetch<import('@/types/ejbca').IoTDevice & { source: string }>('/api/iot/devices', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      update: (id: string, body: Partial<import('@/types/ejbca').IoTDevice>) =>
        apiFetch<import('@/types/ejbca').IoTDevice & { source: string }>(
          `/api/iot/devices/${encodeURIComponent(id)}`,
          { method: 'PUT', body: JSON.stringify(body) }
        ),
      delete: (id: string) =>
        apiFetch<{ deleted: boolean; device_id: string; source: string }>(
          `/api/iot/devices/${encodeURIComponent(id)}`,
          { method: 'DELETE' }
        ),
    },
    protocols: {
      list: () =>
        apiFetch<{ protocols: import('@/types/ejbca').IoTProtocol[]; total: number; source: string }>(
          '/api/iot/protocols'
        ),
      get: (id: string) =>
        apiFetch<import('@/types/ejbca').IoTProtocol & { source: string }>(
          `/api/iot/protocols/${encodeURIComponent(id)}`
        ),
    },
  },

  clm: {
    policies: () =>
      apiFetch<{ policies: import('@/types/ejbca').ClmPolicy[]; total: number; source: string }>(
        '/api/clm/policies'
      ),
    status: () =>
      apiFetch<{
        summary: import('@/types/ejbca').ClmSummary;
        statuses: import('@/types/ejbca').ClmDeviceStatus[];
        source: string;
        checked_at: string;
      }>('/api/clm/status'),
    deviceStatus: (id: string) =>
      apiFetch<{ device_id: string; clm: import('@/types/ejbca').ClmDeviceStatus['clm']; source: string; checked_at: string }>(
        `/api/clm/status/${encodeURIComponent(id)}`
      ),
    renew: (id: string) =>
      apiFetch<{ queued: boolean; device_id: string; renewal_protocol: string; estimated_completion: string; source: string }>(
        `/api/clm/renew/${encodeURIComponent(id)}`,
        { method: 'POST' }
      ),
  },

  aws: {
    kms: () => apiFetch<import('@/types/ejbca').AwsKmsConfig & { source: string }>('/api/aws/kms'),
    kmsKeys: (params?: Record<string, string>) => {
      const qs = params ? new URLSearchParams(params).toString() : '';
      return apiFetch<{ keys: import('@/types/ejbca').KmsKey[]; total: number; source: string }>(
        `/api/aws/kms/keys${qs ? `?${qs}` : ''}`
      );
    },
    hsm: () =>
      apiFetch<{ clusters: import('@/types/ejbca').HsmCluster[]; total: number; source: string }>(
        '/api/aws/hsm'
      ),
  },

  endentities: {
    list: (params?: Record<string, string>) => {
      const qs = params ? new URLSearchParams(params).toString() : '';
      return apiFetch<{ end_entities: import('@/types/ejbca').EndEntity[]; total: number; source: string }>(
        `/api/endentities${qs ? `?${qs}` : ''}`
      );
    },
    get: (username: string) =>
      apiFetch<import('@/types/ejbca').EndEntity & { source: string }>(
        `/api/endentities/${encodeURIComponent(username)}`
      ),
    create: (body: Partial<import('@/types/ejbca').EndEntity> & { password?: string }) =>
      apiFetch<import('@/types/ejbca').EndEntity & { source: string }>('/api/endentities', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (username: string, body: Partial<import('@/types/ejbca').EndEntity>) =>
      apiFetch<import('@/types/ejbca').EndEntity & { source: string }>(
        `/api/endentities/${encodeURIComponent(username)}`,
        { method: 'PUT', body: JSON.stringify(body) }
      ),
    delete: (username: string) =>
      apiFetch<{ deleted: boolean; username: string; source: string }>(
        `/api/endentities/${encodeURIComponent(username)}`,
        { method: 'DELETE' }
      ),
  },
};
