'use client';

import { useEffect, useState } from 'react';
import { Shield, FileCheck, AlertTriangle, XCircle, Activity, Cpu, WifiOff, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { api } from '@/lib/api';
import { formatDate, timeUntil, daysUntil, truncateDN } from '@/lib/utils';
import type { CA, Certificate, HealthStatus, ClmSummary } from '@/types/ejbca';

function StatsCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'blue',
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    red: 'bg-red-500/20 text-red-400',
  };
  return (
    <Card className="flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        <p className="text-sm text-slate-400">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const [cas, setCAs] = useState<CA[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [clmSummary, setClmSummary] = useState<ClmSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.cas.list(),
      api.certificates.search({}),
      api.health.get(),
      api.clm.status(),
    ])
      .then(([casData, certsData, healthData, clmData]) => {
        setCAs(casData.cas);
        setCerts(certsData.certificates);
        setHealth(healthData);
        setClmSummary(clmData.summary);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeCAs = cas.filter(c => c.status === 'ACTIVE').length;
  const activeCerts = certs.filter(c => c.status === 'ACTIVE').length;
  const expiringSoon = certs.filter(
    c => c.status === 'ACTIVE' && daysUntil(c.not_after) <= 30
  ).length;
  const revokedCerts = certs.filter(c => c.status === 'REVOKED').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header
        title="Dashboard"
        subtitle="EJBCA PKI Management Overview"
      />

      <main className="flex-1 p-6 space-y-6">
        {/* Health Banner */}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl">
          <StatusIndicator
            status={health?.status === 'OK' ? 'ok' : health?.status === 'UNREACHABLE' ? 'error' : 'warning'}
            pulse
          />
          <span className="text-sm text-slate-300">
            EJBCA Health: <span className="font-medium text-slate-100">{health?.status || '—'}</span>
          </span>
          <span className="text-xs text-slate-500 ml-auto">
            Last checked: {health ? new Date(health.timestamp).toLocaleTimeString() : '—'}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={Shield} label="Active CAs" value={activeCAs} sub={`${cas.length} total`} color="blue" />
          <StatsCard icon={FileCheck} label="Active Certificates" value={activeCerts} sub={`${certs.length} total`} color="green" />
          <StatsCard icon={AlertTriangle} label="Expiring ≤30 Days" value={expiringSoon} color="amber" />
          <StatsCard icon={XCircle} label="Revoked" value={revokedCerts} color="red" />
        </div>

        {/* IoT Fleet Strip */}
        {clmSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-cyan-500/20">
                <Cpu className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-100">{clmSummary.total}</p>
                <p className="text-xs text-slate-400">IoT Devices</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-500/20">
                <WifiOff className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-red-400">{clmSummary.offline_devices}</p>
                <p className="text-xs text-slate-400">Devices Offline</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/20">
                <RefreshCw className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-blue-400">{clmSummary.pending_renewal}</p>
                <p className="text-xs text-slate-400">Pending Renewal</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-red-400">{clmSummary.critical}</p>
                <p className="text-xs text-slate-400">CLM Critical</p>
              </div>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CA Status */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-100">Certificate Authorities</h3>
              <Activity className="w-4 h-4 text-slate-500" />
            </div>
            <div className="space-y-3">
              {cas.map(ca => {
                const crlDays = daysUntil(ca.crl_next_update);
                const certDays = daysUntil(ca.expiration_date);
                return (
                  <div key={ca.id} className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusBadge(ca.status)}>{ca.status}</Badge>
                        <span className="text-sm font-medium text-slate-200">{ca.name}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {ca.type} · {ca.key_algorithm} {ca.key_size}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">
                        CRL: <span className={crlDays < 2 ? 'text-red-400' : 'text-slate-300'}>{timeUntil(ca.crl_next_update)}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Cert: {formatDate(ca.expiration_date)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recent Certificates */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-100">Certificate Overview</h3>
            </div>
            <div className="space-y-2">
              {certs.map(cert => {
                const days = daysUntil(cert.not_after);
                const isExpiringSoon = cert.status === 'ACTIVE' && days <= 30;
                return (
                  <div key={cert.serial_number} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={statusBadge(cert.status)}>{cert.status}</Badge>
                        <span className="text-sm text-slate-200 truncate">{truncateDN(cert.subject_dn)}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{cert.ca_name} · {cert.certificate_profile}</div>
                    </div>
                    <div className="text-xs text-right ml-4 flex-shrink-0">
                      {cert.status === 'REVOKED' ? (
                        <span className="text-red-400">Revoked</span>
                      ) : (
                        <span className={isExpiringSoon ? 'text-amber-400' : 'text-slate-400'}>
                          {timeUntil(cert.not_after)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
