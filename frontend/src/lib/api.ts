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
    get: () => apiFetch<{ status: string; source: string; timestamp: string; detail?: string }>('/api/health'),
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
