'use client';

import { useEffect, useState } from 'react';
import { Eye, ShieldOff, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { SearchBar, Select } from '@/components/ui/SearchBar';
import { api } from '@/lib/api';
import { formatDate, formatDateTime, timeUntil, daysUntil, truncateDN } from '@/lib/utils';
import { REVOCATION_REASONS } from '@/types/ejbca';
import type { Certificate } from '@/types/ejbca';

export default function CertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Certificate | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Certificate | null>(null);
  const [revokeReason, setRevokeReason] = useState('UNSPECIFIED');
  const [revoking, setRevoking] = useState(false);

  const load = (params: Record<string, string> = {}) => {
    setLoading(true);
    api.certificates.search(params).then(d => setCerts(d.certificates)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = certs.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.username.toLowerCase().includes(q) || c.subject_dn.toLowerCase().includes(q) || c.serial_number.toLowerCase().includes(q);
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await api.certificates.revoke({
        issuer_dn: revokeTarget.issuer_dn,
        serial_number: revokeTarget.serial_number,
        reason: revokeReason,
      });
      setRevokeTarget(null);
      load();
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Certificate Management" subtitle={`${certs.length} certificates`} />

      <main className="flex-1 p-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by username, DN, serial..."
            className="flex-1 min-w-48"
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'All Status' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'REVOKED', label: 'Revoked' },
              { value: 'EXPIRED', label: 'Expired' },
            ]}
          />
          <Button size="md" onClick={() => load()}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        <Card className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Status</Th>
                  <Th>Subject</Th>
                  <Th>Serial</Th>
                  <Th>CA</Th>
                  <Th>Not Before</Th>
                  <Th>Not After</Th>
                  <Th>Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {filtered.map(cert => {
                  const days = daysUntil(cert.not_after);
                  const expiringSoon = cert.status === 'ACTIVE' && days <= 30;
                  return (
                    <Tr key={cert.serial_number}>
                      <Td><Badge variant={statusBadge(cert.status)}>{cert.status}</Badge></Td>
                      <Td>
                        <div className="font-medium text-slate-200">{truncateDN(cert.subject_dn)}</div>
                        <div className="text-xs text-slate-500">{cert.username} · {cert.certificate_profile}</div>
                      </Td>
                      <Td><span className="font-mono text-xs">{cert.serial_number.slice(0, 12)}...</span></Td>
                      <Td><span className="text-xs">{cert.ca_name}</span></Td>
                      <Td><span className="text-xs">{formatDate(cert.not_before)}</span></Td>
                      <Td>
                        <div className={`text-xs ${expiringSoon ? 'text-amber-400' : ''}`}>
                          {formatDate(cert.not_after)}
                        </div>
                        {expiringSoon && <div className="text-xs text-amber-400">{timeUntil(cert.not_after)}</div>}
                      </Td>
                      <Td>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setSelected(cert)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {cert.status === 'ACTIVE' && (
                            <Button size="sm" variant="ghost" onClick={() => setRevokeTarget(cert)}>
                              <ShieldOff className="w-3.5 h-3.5 text-red-400" />
                            </Button>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
                {filtered.length === 0 && (
                  <Tr><Td className="text-center py-8 text-slate-500" colSpan={7 as never}>No certificates found</Td></Tr>
                )}
              </Tbody>
            </Table>
          )}
        </Card>
      </main>

      {/* Certificate Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Certificate Details">
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant={statusBadge(selected.status)} className="text-sm px-3 py-1">{selected.status}</Badge>
              <span className="text-slate-400">{selected.certificate_profile} · {selected.type}</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {[
                ['Serial Number', selected.serial_number],
                ['Subject DN', selected.subject_dn],
                ['Issuer DN', selected.issuer_dn],
                ['Fingerprint (SHA-1)', selected.fingerprint],
                ['Not Before', formatDateTime(selected.not_before)],
                ['Not After', formatDateTime(selected.not_after)],
                ['Revocation Date', formatDateTime(selected.revocation_date)],
                ['Revocation Reason', selected.revocation_reason || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 py-1 border-b border-slate-700/50">
                  <span className="text-slate-500 w-40 flex-shrink-0">{k}</span>
                  <span className="font-mono text-xs text-slate-200 break-all">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Revoke Modal */}
      <Modal open={!!revokeTarget} onClose={() => setRevokeTarget(null)} title="Revoke Certificate">
        {revokeTarget && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Are you sure you want to revoke the certificate for <strong>{truncateDN(revokeTarget.subject_dn)}</strong>?
            </p>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider">Revocation Reason</label>
              <Select
                value={revokeReason}
                onChange={setRevokeReason}
                options={REVOCATION_REASONS.map(r => ({ value: r.code, label: r.label }))}
                className="w-full"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="danger" disabled={revoking} onClick={handleRevoke}>
                {revoking ? 'Revoking...' : 'Revoke Certificate'}
              </Button>
              <Button onClick={() => setRevokeTarget(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
