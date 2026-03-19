'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AwsKmsConfig, KmsKey, HsmCluster } from '@/types/ejbca';
import { formatDateTime } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  Key,
  Server,
  ShieldCheck,
  RotateCcw,
  Globe,
  ChevronRight,
  Activity,
  CheckCircle,
  Cloud,
} from 'lucide-react';

function keyOriginBadge(origin: string) {
  if (origin === 'AWS_CLOUDHSM') return <Badge variant="warning">CloudHSM</Badge>;
  if (origin === 'AWS_KMS') return <Badge variant="info">AWS KMS</Badge>;
  return <Badge variant="neutral">{origin}</Badge>;
}

function keyUsageBadge(usage: string) {
  if (usage === 'SIGN_VERIFY') return <Badge variant="success">Sign / Verify</Badge>;
  return <Badge variant="info">Encrypt / Decrypt</Badge>;
}

export default function AwsKmsPage() {
  const [config, setConfig] = useState<AwsKmsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<KmsKey | null>(null);

  useEffect(() => {
    api.aws.kms().then(d => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { source, ...rest } = d as any;
      setConfig(rest);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6 text-slate-500 text-center py-20">Loading AWS KMS configuration…</div>;
  }

  if (!config) {
    return <div className="p-6 text-red-400 text-center py-20">Failed to load KMS configuration</div>;
  }

  const hsmKeys = config.kms_keys.filter(k => k.origin === 'AWS_CLOUDHSM');
  const kmsKeys = config.kms_keys.filter(k => k.origin === 'AWS_KMS');
  const signingKeys = config.kms_keys.filter(k => k.key_usage === 'SIGN_VERIFY');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AWS KMS &amp; CloudHSM</h1>
        <p className="text-slate-400 text-sm mt-1">
          Key management infrastructure — FIPS 140-2 Level 3 hardware-backed PKI signing keys
        </p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-400">{hsmKeys.length}</div>
                <div className="text-xs text-slate-400 mt-1">CloudHSM Keys</div>
              </div>
              <Server className="w-8 h-8 text-yellow-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-400">{kmsKeys.length}</div>
                <div className="text-xs text-slate-400 mt-1">KMS-Native Keys</div>
              </div>
              <Cloud className="w-8 h-8 text-blue-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-400">{signingKeys.length}</div>
                <div className="text-xs text-slate-400 mt-1">Signing Keys</div>
              </div>
              <Key className="w-8 h-8 text-green-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-400">{config.audit.events_last_24h.toLocaleString()}</div>
                <div className="text-xs text-slate-400 mt-1">KMS Events / 24h</div>
              </div>
              <Activity className="w-8 h-8 text-purple-400/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* HSM Clusters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-4 h-4 text-yellow-400" /> CloudHSM Clusters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.hsm_clusters.map((cluster: HsmCluster) => (
            <div key={cluster.cluster_id} className="bg-slate-900/60 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <code className="text-sm text-yellow-300">{cluster.cluster_id}</code>
                  <div className="text-xs text-slate-500 mt-0.5">{cluster.purpose}</div>
                </div>
                <Badge variant={cluster.state === 'ACTIVE' ? 'success' : 'danger'}>{cluster.state}</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {[
                  ['HSM Type', cluster.hsm_type],
                  ['HSM Count', `${cluster.hsm_count} instances`],
                  ['FIPS Level', cluster.fips_level],
                  ['AZs', cluster.availability_zones.join(', ')],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-slate-500 mb-0.5">{label}</div>
                    <div className="text-slate-200">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* KMS Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-4 h-4 text-blue-400" /> KMS Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-0 pb-2">
          {config.kms_keys.map((key: KmsKey) => (
            <div
              key={key.key_id}
              onClick={() => setSelected(key)}
              className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/50 cursor-pointer transition-colors border-b border-slate-800 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <code className="text-sm text-blue-300">{key.alias}</code>
                  {key.multi_region && (
                    <span className="flex items-center gap-0.5 text-xs text-slate-500">
                      <Globe className="w-3 h-3" /> Multi-Region
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 truncate">{key.description}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                {keyOriginBadge(key.origin)}
                {keyUsageBadge(key.key_usage)}
                <Badge variant="neutral">{key.key_spec}</Badge>
                {key.enabled ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <span className="text-red-400 text-xs">Disabled</span>
                )}
                {key.rotation_enabled && (
                  <RotateCcw className="w-3 h-3 text-slate-400" aria-label="Auto-rotation enabled" />
                )}
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Audit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-400" /> Audit &amp; Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              ['Region', config.region],
              ['Account ID', config.account_id],
              ['CloudTrail', config.audit.cloudtrail_enabled ? 'Enabled' : 'Disabled'],
              ['Log Group', config.audit.cloudwatch_logs_group],
              ['Last Key Use', formatDateTime(config.audit.last_key_usage_event)],
              ['Events (24h)', config.audit.events_last_24h.toLocaleString()],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-slate-500 text-xs mb-0.5">{label}</div>
                <div className="text-slate-200">{value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key detail modal */}
      {selected && (
        <Modal open={!!selected} title={`KMS Key — ${selected.alias}`} onClose={() => setSelected(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Key ID', selected.key_id],
                ['Alias', selected.alias],
                ['Spec', selected.key_spec],
                ['Usage', selected.key_usage],
                ['Origin', selected.origin],
                ['Region', selected.region],
                ['Multi-Region', selected.multi_region ? 'Yes' : 'No'],
                ['Enabled', selected.enabled ? 'Yes' : 'No'],
                ['Auto-Rotation', selected.rotation_enabled ? 'Yes' : 'No'],
                ['Next Rotation', selected.next_rotation ? formatDateTime(selected.next_rotation) : '—'],
                ['Created', formatDateTime(selected.created)],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-slate-500 text-xs mb-0.5">{label}</div>
                  <div className="text-slate-200 break-all">{value}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-700 pt-4">
              <div className="text-slate-500 text-xs mb-1">Description</div>
              <div className="text-slate-300">{selected.description}</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
