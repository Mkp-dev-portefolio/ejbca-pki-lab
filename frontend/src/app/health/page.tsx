'use client';

import { useEffect, useState, useCallback } from 'react';
import { Activity, RefreshCw, Wifi, WifiOff, Server } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { api } from '@/lib/api';

interface HealthCheck {
  id: string;
  label: string;
  status: 'ok' | 'error' | 'warning' | 'unknown';
  detail?: string;
  latency?: number;
  timestamp: string;
}

interface LogEntry {
  timestamp: string;
  checks: HealthCheck[];
}

export default function HealthPage() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [polling, setPolling] = useState(false);
  const [lastPoll, setLastPoll] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);

  const runChecks = useCallback(async () => {
    const start = Date.now();
    const results: HealthCheck[] = [];

    // EJBCA Health
    try {
      const t0 = Date.now();
      const h = await api.health.get();
      results.push({
        id: 'ejbca-health',
        label: 'EJBCA Health Check',
        status: h.status === 'OK' ? 'ok' : 'error',
        detail: h.detail || h.status,
        latency: Date.now() - t0,
        timestamp: h.timestamp,
      });
    } catch {
      results.push({ id: 'ejbca-health', label: 'EJBCA Health Check', status: 'error', detail: 'Unreachable', timestamp: new Date().toISOString() });
    }

    // VA Status
    try {
      const t0 = Date.now();
      const v = await api.health.vas();
      const anyError = v.vas?.some((va: { error: boolean }) => va.error);
      results.push({
        id: 'va-status',
        label: 'VA / OCSP Status',
        status: anyError ? 'warning' : 'ok',
        detail: v.vas ? `${v.vas.length} VA(s) configured` : 'N/A',
        latency: Date.now() - t0,
        timestamp: v.timestamp,
      });
    } catch {
      results.push({ id: 'va-status', label: 'VA / OCSP Status', status: 'unknown', detail: 'Not available', timestamp: new Date().toISOString() });
    }

    // REST API
    try {
      const t0 = Date.now();
      await api.cas.list();
      results.push({
        id: 'rest-api',
        label: 'REST API (CA List)',
        status: 'ok',
        detail: 'Responding normally',
        latency: Date.now() - t0,
        timestamp: new Date().toISOString(),
      });
    } catch {
      results.push({ id: 'rest-api', label: 'REST API (CA List)', status: 'error', detail: 'API Error', timestamp: new Date().toISOString() });
    }

    // Certificate Service
    try {
      const t0 = Date.now();
      const r = await api.certificates.search({});
      results.push({
        id: 'cert-service',
        label: 'Certificate Service',
        status: 'ok',
        detail: `${r.total} certificates accessible`,
        latency: Date.now() - t0,
        timestamp: new Date().toISOString(),
      });
    } catch {
      results.push({ id: 'cert-service', label: 'Certificate Service', status: 'error', detail: 'Service Error', timestamp: new Date().toISOString() });
    }

    setChecks(results);
    const ts = new Date().toISOString();
    setLastPoll(ts);
    setLog(prev => [{ timestamp: ts, checks: results }, ...prev].slice(0, 20));
    setCountdown(10);
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  // Auto-polling
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(runChecks, 10000);
    const timer = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => { clearInterval(interval); clearInterval(timer); };
  }, [polling, runChecks]);

  const overall = checks.every(c => c.status === 'ok') ? 'ok'
    : checks.some(c => c.status === 'error') ? 'error' : 'warning';

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Health Monitor" subtitle="Real-time EJBCA status monitoring" />

      <main className="flex-1 p-6 space-y-6">
        {/* Overall Status */}
        <Card className="flex items-center gap-6">
          <div className={`p-4 rounded-xl ${overall === 'ok' ? 'bg-emerald-500/20' : overall === 'error' ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
            {overall === 'ok' ? <Wifi className="w-8 h-8 text-emerald-400" /> : <WifiOff className="w-8 h-8 text-red-400" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-100">
                {overall === 'ok' ? 'All Systems Operational' : overall === 'error' ? 'System Degraded' : 'Partial Outage'}
              </h2>
              <Badge variant={overall === 'ok' ? 'success' : overall === 'error' ? 'danger' : 'warning'}>
                {overall.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Last checked: {lastPoll ? new Date(lastPoll).toLocaleTimeString() : 'Never'}
              {polling && ` · Next in ${countdown}s`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={polling ? 'danger' : 'primary'}
              onClick={() => setPolling(p => !p)}
            >
              <Activity className="w-4 h-4" />
              {polling ? 'Stop Polling' : 'Auto-Poll (10s)'}
            </Button>
            <Button onClick={runChecks}>
              <RefreshCw className="w-4 h-4" /> Check Now
            </Button>
          </div>
        </Card>

        {/* Individual Checks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {checks.map(check => (
            <Card key={check.id} className="flex items-center gap-4">
              <StatusIndicator status={check.status} pulse={check.status === 'ok' && polling} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-200">{check.label}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{check.detail}</p>
              </div>
              {check.latency !== undefined && (
                <div className="text-right">
                  <div className="text-xs font-mono text-slate-300">{check.latency}ms</div>
                  <div className="text-xs text-slate-600">latency</div>
                </div>
              )}
              <Badge variant={check.status === 'ok' ? 'success' : check.status === 'error' ? 'danger' : 'warning'}>
                {check.status.toUpperCase()}
              </Badge>
            </Card>
          ))}
        </div>

        {/* Poll History */}
        {log.length > 0 && (
          <Card>
            <h3 className="text-base font-semibold text-slate-100 mb-4">Check History (last 20)</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {log.map((entry, i) => {
                const allOk = entry.checks.every(c => c.status === 'ok');
                return (
                  <div key={i} className="flex items-center gap-3 py-1.5 border-b border-slate-700/50 last:border-0">
                    <StatusIndicator status={allOk ? 'ok' : 'error'} />
                    <span className="text-xs font-mono text-slate-400">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <span className="text-xs text-slate-500">
                      {entry.checks.filter(c => c.status === 'ok').length}/{entry.checks.length} checks passed
                    </span>
                    {!allOk && (
                      <span className="text-xs text-red-400">
                        Failed: {entry.checks.filter(c => c.status !== 'ok').map(c => c.label).join(', ')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
