'use client';

import { useEffect, useState } from 'react';
import { Download, Eye, RefreshCw, ShieldCheck } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { api } from '@/lib/api';
import { formatDate, timeUntil, daysUntil } from '@/lib/utils';
import type { CA } from '@/types/ejbca';

export default function CAsPage() {
  const [cas, setCAs] = useState<CA[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CA | null>(null);

  useEffect(() => {
    api.cas.list().then(d => setCAs(d.cas)).finally(() => setLoading(false));
  }, []);

  const handleDownloadCRL = async (ca: CA) => {
    try {
      const data = await api.cas.crl(ca.name);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ca.name}-crl.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CRL download failed', e);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Certificate Authorities" subtitle={`${cas.length} CAs configured`} />

      <main className="flex-1 p-6 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['ACTIVE', 'OFFLINE', 'ROOT', 'SUBCA'].map(type => {
            const count = type === 'ROOT' || type === 'SUBCA'
              ? cas.filter(c => c.type === type).length
              : cas.filter(c => c.status === type).length;
            const colors: Record<string, string> = {
              ACTIVE: 'text-emerald-400', OFFLINE: 'text-red-400',
              ROOT: 'text-blue-400', SUBCA: 'text-purple-400',
            };
            return (
              <Card key={type} className="py-4 text-center">
                <div className={`text-2xl font-bold ${colors[type]}`}>{count}</div>
                <div className="text-xs text-slate-500 mt-1">{type}</div>
              </Card>
            );
          })}
        </div>

        <Card className="p-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <h3 className="font-semibold text-slate-100">All Certificate Authorities</h3>
            <Button size="sm" onClick={() => { setLoading(true); api.cas.list().then(d => setCAs(d.cas)).finally(() => setLoading(false)); }}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Status</Th>
                  <Th>CA Name</Th>
                  <Th>Type</Th>
                  <Th>Algorithm</Th>
                  <Th>Cert Expiry</Th>
                  <Th>CRL Next Update</Th>
                  <Th>Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {cas.map(ca => {
                  const crlDays = daysUntil(ca.crl_next_update);
                  return (
                    <Tr key={ca.id}>
                      <Td><Badge variant={statusBadge(ca.status)}>{ca.status}</Badge></Td>
                      <Td>
                        <div className="font-medium text-slate-200">{ca.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{ca.serial_number.slice(0, 12)}...</div>
                      </Td>
                      <Td>
                        <Badge variant="info">{ca.type}</Badge>
                      </Td>
                      <Td>
                        <div className="text-xs">{ca.key_algorithm} {ca.key_size}</div>
                        <div className="text-xs text-slate-500">{ca.signature_algorithm}</div>
                      </Td>
                      <Td>
                        <div className="text-xs">{formatDate(ca.expiration_date)}</div>
                        <div className="text-xs text-slate-500">{timeUntil(ca.expiration_date)}</div>
                      </Td>
                      <Td>
                        <div className={`text-xs ${crlDays < 2 ? 'text-red-400' : crlDays < 6 ? 'text-amber-400' : 'text-slate-300'}`}>
                          {timeUntil(ca.crl_next_update)}
                        </div>
                        <div className="text-xs text-slate-500">Last: {formatDate(ca.crl_last_update)}</div>
                      </Td>
                      <Td>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setSelected(ca)}>
                            <Eye className="w-3.5 h-3.5" /> View
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDownloadCRL(ca)}>
                            <Download className="w-3.5 h-3.5" /> CRL
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}
        </Card>
      </main>

      {/* CA Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`CA Details: ${selected?.name}`}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-blue-400 flex-shrink-0" />
              <div>
                <div className="text-lg font-semibold text-slate-100">{selected.name}</div>
                <Badge variant={statusBadge(selected.status)}>{selected.status}</Badge>
                <Badge variant="info" className="ml-1">{selected.type}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Subject DN', selected.subject_dn],
                ['Issuer DN', selected.issuer_dn],
                ['Serial Number', selected.serial_number],
                ['Certificate Profile', selected.certificate_profile],
                ['Key Algorithm', `${selected.key_algorithm} ${selected.key_size}`],
                ['Signature Algorithm', selected.signature_algorithm],
                ['Expiration', formatDate(selected.expiration_date)],
                ['CRL Next Update', formatDate(selected.crl_next_update)],
                ['CRL Last Update', formatDate(selected.crl_last_update)],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-900/60 rounded-lg p-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{k}</div>
                  <div className="text-slate-200 font-mono text-xs break-all">{v}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="primary" onClick={() => handleDownloadCRL(selected)}>
                <Download className="w-4 h-4" /> Download CRL
              </Button>
              <Button onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
