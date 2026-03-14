'use client';

import { useEffect, useState } from 'react';
import { Download, RefreshCw, ScrollText, Clock, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { formatDateTime, daysUntil } from '@/lib/utils';
import type { CA } from '@/types/ejbca';

interface CRLInfo {
  ca: CA;
  crl_last_update: string;
  crl_next_update: string;
  loading: boolean;
  error?: string;
}

export default function CRLPage() {
  const [crls, setCRLs] = useState<CRLInfo[]>([]);
  const [loadingCAs, setLoadingCAs] = useState(true);

  const loadCAs = async () => {
    setLoadingCAs(true);
    try {
      const { cas } = await api.cas.list();
      const initial: CRLInfo[] = cas.map(ca => ({
        ca,
        crl_last_update: ca.crl_last_update,
        crl_next_update: ca.crl_next_update,
        loading: true,
      }));
      setCRLs(initial);

      // Load CRL details in parallel
      const updated = await Promise.all(
        initial.map(async info => {
          try {
            const crl = await api.cas.crl(info.ca.name);
            return {
              ...info,
              crl_last_update: crl.crl_last_update,
              crl_next_update: crl.crl_next_update,
              loading: false,
            };
          } catch (e) {
            return { ...info, loading: false, error: 'Failed to load CRL' };
          }
        })
      );
      setCRLs(updated);
    } finally {
      setLoadingCAs(false);
    }
  };

  useEffect(() => { loadCAs(); }, []);

  const handleDownload = async (name: string) => {
    try {
      const data = await api.cas.crl(name);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}-crl.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CRL download failed', e);
    }
  };

  const crlStatus = (nextUpdate: string) => {
    const days = daysUntil(nextUpdate);
    if (days < 0) return { label: 'EXPIRED', variant: 'danger' as const, icon: AlertTriangle };
    if (days < 1) return { label: 'EXPIRING SOON', variant: 'warning' as const, icon: Clock };
    return { label: 'VALID', variant: 'success' as const, icon: ScrollText };
  };

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="CRL Management" subtitle="Certificate Revocation List status per CA" />

      <main className="flex-1 p-6 space-y-4">
        <div className="flex justify-end">
          <Button onClick={loadCAs} disabled={loadingCAs}>
            <RefreshCw className={`w-4 h-4 ${loadingCAs ? 'animate-spin' : ''}`} /> Refresh All
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {['VALID', 'EXPIRING SOON', 'EXPIRED'].map(type => {
            const count = crls.filter(c => {
              const s = crlStatus(c.crl_next_update);
              return s.label === type;
            }).length;
            const colors: Record<string, string> = {
              VALID: 'text-emerald-400', 'EXPIRING SOON': 'text-amber-400', EXPIRED: 'text-red-400',
            };
            return (
              <Card key={type} className="text-center py-4">
                <div className={`text-2xl font-bold ${colors[type]}`}>{count}</div>
                <div className="text-xs text-slate-500 mt-1">{type}</div>
              </Card>
            );
          })}
        </div>

        {loadingCAs && crls.length === 0 ? (
          <div className="text-center py-12 text-slate-400">Loading CRLs...</div>
        ) : (
          <div className="grid gap-4">
            {crls.map(({ ca, crl_last_update, crl_next_update, loading: crlLoading, error }) => {
              const { label, variant, icon: StatusIcon } = crlStatus(crl_next_update);
              const days = daysUntil(crl_next_update);
              return (
                <Card key={ca.id} className="flex items-center gap-6">
                  <div className="flex-shrink-0">
                    <div className={`p-3 rounded-lg ${
                      variant === 'success' ? 'bg-emerald-500/20' :
                      variant === 'warning' ? 'bg-amber-500/20' : 'bg-red-500/20'
                    }`}>
                      <StatusIcon className={`w-6 h-6 ${
                        variant === 'success' ? 'text-emerald-400' :
                        variant === 'warning' ? 'text-amber-400' : 'text-red-400'
                      }`} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-100">{ca.name}</span>
                      <Badge variant={variant}>{label}</Badge>
                      <Badge variant={ca.status === 'ACTIVE' ? 'success' : 'danger'}>{ca.status}</Badge>
                    </div>
                    {crlLoading ? (
                      <div className="text-xs text-slate-500">Loading CRL info...</div>
                    ) : error ? (
                      <div className="text-xs text-red-400">{error}</div>
                    ) : (
                      <div className="flex gap-6 text-xs text-slate-400">
                        <span>Last issued: <span className="text-slate-300">{formatDateTime(crl_last_update)}</span></span>
                        <span>
                          Next update:{' '}
                          <span className={days < 0 ? 'text-red-400' : days < 1 ? 'text-amber-400' : 'text-slate-300'}>
                            {formatDateTime(crl_next_update)}
                            {days >= 0 ? ` (in ${days}d)` : ' (OVERDUE)'}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDownload(ca.name)}
                    disabled={ca.status !== 'ACTIVE'}
                  >
                    <Download className="w-4 h-4" /> Download CRL
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
