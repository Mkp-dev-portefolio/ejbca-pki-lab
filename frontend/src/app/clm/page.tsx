'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ClmDeviceStatus, ClmSummary, ClmPolicy, ClmPriority, ClmAction } from '@/types/ejbca';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Thead, Tbody, Th, Tr, Td } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  WifiOff,
  RotateCcw,
  ShieldCheck,
  Shield,
  FileSearch,
} from 'lucide-react';

const PRIORITY_CONFIG: Record<ClmPriority, { color: string; label: string; icon: React.ReactNode }> = {
  OK: { color: 'text-green-400', label: 'OK', icon: <CheckCircle className="w-4 h-4 text-green-400" /> },
  LOW: { color: 'text-slate-400', label: 'Low', icon: <Clock className="w-4 h-4 text-slate-400" /> },
  MEDIUM: { color: 'text-yellow-400', label: 'Medium', icon: <AlertTriangle className="w-4 h-4 text-yellow-400" /> },
  HIGH: { color: 'text-orange-400', label: 'High', icon: <AlertTriangle className="w-4 h-4 text-orange-400" /> },
  CRITICAL: { color: 'text-red-400', label: 'Critical', icon: <AlertTriangle className="w-4 h-4 text-red-400" /> },
};

const ACTION_BADGE: Record<ClmAction, { variant: string; label: string }> = {
  NONE: { variant: 'success', label: 'No Action' },
  MONITOR: { variant: 'default', label: 'Monitor' },
  ALERT: { variant: 'warning', label: 'Alert' },
  AUTO_RENEW: { variant: 'info', label: 'Auto-Renew' },
  RENEW: { variant: 'warning', label: 'Renew' },
  QUEUE_RENEWAL: { variant: 'warning', label: 'Queued' },
  SUSPEND: { variant: 'danger', label: 'Suspend' },
  REISSUE: { variant: 'danger', label: 'Reissue' },
  ENROLL: { variant: 'danger', label: 'Enroll' },
};

export default function ClmPage() {
  const [summary, setSummary] = useState<ClmSummary | null>(null);
  const [statuses, setStatuses] = useState<ClmDeviceStatus[]>([]);
  const [policies, setPolicies] = useState<ClmPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterPolicy, setFilterPolicy] = useState('');
  const [selected, setSelected] = useState<ClmDeviceStatus | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'policies'>('status');

  function loadAll() {
    setLoading(true);
    Promise.all([api.clm.status(), api.clm.policies()]).then(([clmData, policyData]) => {
      setSummary(clmData.summary);
      setStatuses(clmData.statuses);
      setCheckedAt(clmData.checked_at);
      setPolicies(policyData.policies);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { loadAll(); }, []);

  function handleRenew(deviceId: string) {
    setRenewingId(deviceId);
    api.clm.renew(deviceId).finally(() => setRenewingId(null));
  }

  const filtered = statuses.filter(s => {
    if (filterPriority && s.clm.priority !== filterPriority) return false;
    if (filterPolicy && s.clm_policy_id !== filterPolicy) return false;
    return true;
  });

  const needsAction = statuses.filter(s => s.clm.action_needed !== 'NONE' && s.clm.action_needed !== 'MONITOR');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Certificate Lifecycle Management</h1>
          <p className="text-slate-400 text-sm mt-1">
            CRL + OCSP revocation monitoring — offline device handling — automated renewal
          </p>
        </div>
        <Button variant="ghost" onClick={loadAll}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Summary strip */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Total', value: summary.total, color: 'text-white' },
            { label: 'OK', value: summary.ok, color: 'text-green-400' },
            { label: 'Critical', value: summary.critical, color: 'text-red-400' },
            { label: 'High', value: summary.high, color: 'text-orange-400' },
            { label: 'Medium', value: summary.medium, color: 'text-yellow-400' },
            { label: 'Pending Renewal', value: summary.pending_renewal, color: 'text-blue-400' },
            { label: 'Offline', value: summary.offline_devices, color: 'text-slate-400' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-3 pb-3">
                <div className={`text-xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action needed banner */}
      {needsAction.length > 0 && (
        <div className="flex items-center gap-3 bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-red-200 text-sm">
            <strong>{needsAction.length} device{needsAction.length > 1 ? 's' : ''}</strong> require immediate action —{' '}
            {needsAction.map(d => d.name).join(', ')}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-700">
        {(['status', 'policies'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'status' ? 'Device Status' : 'CLM Policies'}
          </button>
        ))}
        {checkedAt && (
          <span className="ml-auto text-xs text-slate-600 self-center pr-1">
            Checked: {formatDateTime(checkedAt)}
          </span>
        )}
      </div>

      {activeTab === 'status' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="OK">OK</option>
            </select>
            <select
              value={filterPolicy}
              onChange={e => setFilterPolicy(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All policies</option>
              {policies.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Status table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Priority</Th>
                    <Th>Device</Th>
                    <Th>Policy</Th>
                    <Th>Cert Status</Th>
                    <Th>Cert Expiry</Th>
                    <Th>CRL</Th>
                    <Th>OCSP</Th>
                    <Th>Action</Th>
                    <Th>Reason</Th>
                    <Th>{" "}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {loading ? (
                    <Tr><Td colSpan={10} className="text-center py-10 text-slate-500">Loading…</Td></Tr>
                  ) : filtered.length === 0 ? (
                    <Tr><Td colSpan={10} className="text-center py-10 text-slate-500">No devices found</Td></Tr>
                  ) : (
                    filtered.map(s => {
                      const pc = PRIORITY_CONFIG[s.clm.priority];
                      const ac = ACTION_BADGE[s.clm.action_needed];
                      const canRenew = ['AUTO_RENEW', 'RENEW', 'REISSUE', 'ENROLL'].includes(s.clm.action_needed);
                      return (
                        <Tr key={s.device_id} onClick={() => setSelected(s)}>
                          <Td>
                            <div className="flex items-center gap-1.5">
                              {pc.icon}
                              <span className={`text-xs font-medium ${pc.color}`}>{pc.label}</span>
                            </div>
                          </Td>
                          <Td>
                            <div className="font-medium text-white text-sm">{s.name}</div>
                            <div className="text-xs text-slate-500">{s.device_id}</div>
                          </Td>
                          <Td>
                            <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-purple-300">
                              {s.clm_policy_id}
                            </code>
                          </Td>
                          <Td>
                            {s.cert_status ? (
                              <Badge variant={
                                s.cert_status === 'ACTIVE' ? 'success' :
                                s.cert_status === 'EXPIRING_SOON' ? 'warning' : 'danger'
                              }>{s.cert_status}</Badge>
                            ) : <span className="text-slate-500">—</span>}
                          </Td>
                          <Td className="text-sm">{formatDate(s.cert_expiry)}</Td>
                          <Td>
                            {s.clm.crl_checked != null ? (
                              s.clm.crl_checked
                                ? <CheckCircle className="w-4 h-4 text-green-400" />
                                : <WifiOff className="w-4 h-4 text-slate-600" />
                            ) : <span className="text-slate-600">—</span>}
                          </Td>
                          <Td>
                            {s.clm.ocsp_checked != null ? (
                              s.clm.ocsp_checked
                                ? <CheckCircle className="w-4 h-4 text-green-400" />
                                : <WifiOff className="w-4 h-4 text-slate-600" />
                            ) : <span className="text-slate-600">—</span>}
                          </Td>
                          <Td>
                            <Badge variant={ac.variant as any}>{ac.label}</Badge>
                          </Td>
                          <Td className="text-xs text-slate-400 max-w-xs truncate">{s.clm.reason}</Td>
                          <Td>
                            {canRenew && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRenew(s.device_id)}
                                disabled={renewingId === s.device_id}
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                {renewingId === s.device_id ? '…' : 'Renew'}
                              </Button>
                            )}
                          </Td>
                        </Tr>
                      );
                    })
                  )}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map(p => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{p.name}</span>
                  <code className="text-xs text-purple-300 bg-slate-800 px-2 py-0.5 rounded">{p.id}</code>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-slate-400 text-sm">{p.description}</p>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {[
                    ['Cert Lifetime', `${p.cert_lifetime_days}d`],
                    ['Renewal Threshold', `${p.renewal_threshold_days}d before expiry`],
                    ['Revocation Check', p.revocation_check],
                    ['CRL Interval', p.crl_check_interval_hours ? `${p.crl_check_interval_hours}h` : '—'],
                    ['OCSP Interval', p.ocsp_check_interval_minutes ? `${p.ocsp_check_interval_minutes}min` : '—'],
                    ['Offline Tolerance', `${p.offline_tolerance_days}d`],
                    ['Offline Action', p.offline_action],
                    ['Auto Renew', p.auto_renew ? 'Yes' : 'No'],
                    ['Renewal Protocol', p.renewal_protocol],
                    ['CA', p.ca_name],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span className="text-slate-500">{label}: </span>
                      <span className="text-slate-200">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {p.kms_signing && <Badge variant="info">AWS KMS Signing</Badge>}
                  {p.hsm_required && <Badge variant="warning">HSM Required</Badge>}
                  <Badge variant="neutral">{p.devices_count} device{p.devices_count !== 1 ? 's' : ''}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <Modal open={!!selected} title={`CLM Detail — ${selected.name}`} onClose={() => setSelected(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Device ID', selected.device_id],
                ['Type', selected.type],
                ['Status', selected.status],
                ['CLM Policy', selected.clm_policy_id],
                ['CA', selected.ca_name],
                ['HSM-Backed', selected.hsm_backed ? 'Yes' : 'No'],
                ['Last Seen', formatDateTime(selected.last_seen)],
                ['Cert Expiry', formatDate(selected.cert_expiry)],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-slate-500 text-xs mb-0.5">{label}</div>
                  <div className="text-slate-200">{value}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-700 pt-4">
              <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">CLM Decision</div>
              <div className="flex items-center gap-3 mb-2">
                {PRIORITY_CONFIG[selected.clm.priority].icon}
                <span className={`font-semibold ${PRIORITY_CONFIG[selected.clm.priority].color}`}>
                  {PRIORITY_CONFIG[selected.clm.priority].label} — {ACTION_BADGE[selected.clm.action_needed].label}
                </span>
              </div>
              <p className="text-slate-300">{selected.clm.reason}</p>
              {selected.clm.offline_days != null && (
                <p className="text-slate-400 text-xs mt-1">Offline for {selected.clm.offline_days} day(s)</p>
              )}
            </div>

            <div className="border-t border-slate-700 pt-4">
              <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Revocation Checks</div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400">CRL:</span>
                  {selected.clm.crl_checked == null ? (
                    <span className="text-slate-600">N/A</span>
                  ) : selected.clm.crl_checked ? (
                    <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Passed</span>
                  ) : (
                    <span className="text-slate-500 flex items-center gap-1"><WifiOff className="w-3 h-3" /> Not checked (offline)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400">OCSP:</span>
                  {selected.clm.ocsp_checked == null ? (
                    <span className="text-slate-600">N/A</span>
                  ) : selected.clm.ocsp_checked ? (
                    <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Passed</span>
                  ) : (
                    <span className="text-slate-500 flex items-center gap-1"><WifiOff className="w-3 h-3" /> Not checked (offline)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
