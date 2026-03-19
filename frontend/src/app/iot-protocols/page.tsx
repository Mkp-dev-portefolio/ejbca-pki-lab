'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { IoTProtocol } from '@/types/ejbca';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { CheckCircle, Lock, Wifi, ChevronRight, BookOpen } from 'lucide-react';

function securityBadge(security: string) {
  if (security.includes('1.3')) return <Badge variant="success">{security}</Badge>;
  if (security.includes('DTLS') || security.includes('TLS')) return <Badge variant="info">{security}</Badge>;
  if (security.includes('ECIES') || security.includes('SCMS')) return <Badge variant="warning">{security}</Badge>;
  return <Badge variant="neutral">{security}</Badge>;
}

export default function IoTProtocolsPage() {
  const [protocols, setProtocols] = useState<IoTProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IoTProtocol | null>(null);

  useEffect(() => {
    api.iot.protocols.list().then(r => setProtocols(r.protocols)).finally(() => setLoading(false));
  }, []);

  const certRequired = protocols.filter(p => p.cert_required).length;
  const offlineCapable = protocols.filter(p => p.offline_capable).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">IoT Protocols</h1>
        <p className="text-slate-400 text-sm mt-1">
          Supported communication protocols — security posture, certificate requirements &amp; best practices
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-400">{protocols.length}</div>
            <div className="text-xs text-slate-400 mt-1">Protocols</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-400">{certRequired}</div>
            <div className="text-xs text-slate-400 mt-1">Require Certificates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-400">{offlineCapable}</div>
            <div className="text-xs text-slate-400 mt-1">Offline Capable</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-400">
              {protocols.reduce((s, p) => s + p.devices_count, 0)}
            </div>
            <div className="text-xs text-slate-400 mt-1">Total Devices</div>
          </CardContent>
        </Card>
      </div>

      {/* Protocol cards */}
      {loading ? (
        <div className="text-center text-slate-500 py-16">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {protocols.map(p => (
            <Card
              key={p.id}
              className="cursor-pointer hover:border-blue-600/50 transition-colors"
              onClick={() => setSelected(p)}
            >
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-white font-semibold text-base">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.full_name}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {securityBadge(p.security)}
                    {p.offline_capable && (
                      <Badge variant="warning">Offline OK</Badge>
                    )}
                  </div>
                </div>

                <p className="text-slate-400 text-sm mb-3 line-clamp-2">{p.description}</p>

                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  {p.port && (
                    <span className="flex items-center gap-1">
                      <Wifi className="w-3 h-3" /> Port {p.port}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3" /> {p.auth_method}
                  </span>
                  <span className="flex items-center gap-1 text-blue-400">
                    <CheckCircle className="w-3 h-3" /> {p.devices_count} device{p.devices_count !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
                  <span>{p.standard}</span>
                  <div className="flex items-center gap-1 text-blue-400">
                    <BookOpen className="w-3 h-3" /> Best practices
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <Modal open={!!selected} title={`${selected.name} — Protocol Details`} onClose={() => setSelected(null)}>
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Standard', selected.standard],
                ['Version', selected.version],
                ['Transport', selected.transport],
                ['Port', selected.port?.toString() ?? 'N/A'],
                ['Security', selected.security],
                ['Auth Method', selected.auth_method],
                ['Cert Required', selected.cert_required ? 'Yes' : 'No'],
                ['Offline Capable', selected.offline_capable ? 'Yes' : 'No'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-slate-500 text-xs mb-0.5">{label}</div>
                  <div className="text-slate-200">{value}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-700 pt-4">
              <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Use Case</div>
              <p className="text-slate-300">{selected.use_case}</p>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
                Best Practices
              </div>
              <ul className="space-y-2">
                {selected.best_practices.map((bp, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{bp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
