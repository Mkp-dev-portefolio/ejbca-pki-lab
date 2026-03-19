'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { IoTDevice, IoTDeviceStatus, CertStatus } from '@/types/ejbca';
import { formatDate, formatDateTime, daysUntil } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Thead, Tbody, Th, Tr, Td } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import {
  Cpu,
  Wifi,
  WifiOff,
  Shield,
  ShieldAlert,
  RefreshCw,
  Plus,
  ChevronRight,
  Server,
  Car,
  Radio,
  Camera,
  Thermometer,
  Network,
} from 'lucide-react';

const DEVICE_TYPE_ICON: Record<string, React.ReactNode> = {
  VEHICLE_ECU: <Car className="w-4 h-4" />,
  V2X_RSU: <Radio className="w-4 h-4" />,
  SENSOR: <Thermometer className="w-4 h-4" />,
  GATEWAY: <Network className="w-4 h-4" />,
  CAMERA: <Camera className="w-4 h-4" />,
  ACTUATOR: <Cpu className="w-4 h-4" />,
};

const DEVICE_TYPE_LABEL: Record<string, string> = {
  VEHICLE_ECU: 'Vehicle ECU',
  V2X_RSU: 'V2X RSU',
  SENSOR: 'Sensor',
  GATEWAY: 'Gateway',
  CAMERA: 'Camera',
  ACTUATOR: 'Actuator',
};

function statusBadge(status: IoTDeviceStatus) {
  const map: Record<IoTDeviceStatus, { variant: string; label: string }> = {
    ONLINE: { variant: 'success', label: 'Online' },
    OFFLINE: { variant: 'danger', label: 'Offline' },
    PROVISIONING: { variant: 'warning', label: 'Provisioning' },
    ERROR: { variant: 'danger', label: 'Error' },
  };
  const { variant, label } = map[status] ?? { variant: 'default', label: status };
  return <Badge variant={variant as any}>{label}</Badge>;
}

function certBadge(status: CertStatus | null) {
  if (!status) return <Badge variant="neutral">—</Badge>;
  const map: Record<CertStatus, { variant: string; label: string }> = {
    ACTIVE: { variant: 'success', label: 'Active' },
    REVOKED: { variant: 'danger', label: 'Revoked' },
    EXPIRED: { variant: 'danger', label: 'Expired' },
    EXPIRING_SOON: { variant: 'warning', label: 'Expiring Soon' },
  };
  const { variant, label } = map[status] ?? { variant: 'default', label: status };
  return <Badge variant={variant as any}>{label}</Badge>;
}

export default function IoTDevicesPage() {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IoTDevice | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProtocol, setFilterProtocol] = useState('');

  function load() {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filterStatus) params.status = filterStatus;
    if (filterProtocol) params.protocol = filterProtocol;
    api.iot.devices
      .list(params)
      .then(r => setDevices(r.devices))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [filterStatus, filterProtocol]);

  const online = devices.filter(d => d.status === 'ONLINE').length;
  const offline = devices.filter(d => d.status === 'OFFLINE').length;
  const expiring = devices.filter(d => d.cert_status === 'EXPIRING_SOON').length;
  const hsmBacked = devices.filter(d => d.hsm_backed).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">IoT Devices</h1>
          <p className="text-slate-400 text-sm mt-1">Fleet certificate management — automotive &amp; industrial</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-400">{online}</div>
                <div className="text-xs text-slate-400 mt-1">Online</div>
              </div>
              <Wifi className="w-8 h-8 text-green-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-400">{offline}</div>
                <div className="text-xs text-slate-400 mt-1">Offline</div>
              </div>
              <WifiOff className="w-8 h-8 text-red-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-400">{expiring}</div>
                <div className="text-xs text-slate-400 mt-1">Certs Expiring</div>
              </div>
              <ShieldAlert className="w-8 h-8 text-yellow-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-400">{hsmBacked}</div>
                <div className="text-xs text-slate-400 mt-1">HSM-Backed</div>
              </div>
              <Shield className="w-8 h-8 text-blue-400/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All statuses</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
              <option value="PROVISIONING">Provisioning</option>
              <option value="ERROR">Error</option>
            </select>
            <select
              value={filterProtocol}
              onChange={e => setFilterProtocol(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All protocols</option>
              <option value="MQTT">MQTT</option>
              <option value="COAP_DTLS">CoAP/DTLS</option>
              <option value="V2X_DSRC">V2X/DSRC</option>
              <option value="HTTPS_EST">EST/HTTPS</option>
              <option value="AMQP_TLS">AMQP/TLS</option>
              <option value="LWM2M">LwM2M</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Device table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Devices <span className="text-slate-500 font-normal text-sm">({devices.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>Device</Th>
                <Th>Type</Th>
                <Th>Protocol</Th>
                <Th>Status</Th>
                <Th>Cert Status</Th>
                <Th>Cert Expiry</Th>
                <Th>HSM</Th>
                <Th>Last Seen</Th>
                <Th>{" "}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr>
                  <Td colSpan={9} className="text-center py-10 text-slate-500">
                    Loading…
                  </Td>
                </Tr>
              ) : devices.length === 0 ? (
                <Tr>
                  <Td colSpan={9} className="text-center py-10 text-slate-500">
                    No devices found
                  </Td>
                </Tr>
              ) : (
                devices.map(d => (
                  <Tr key={d.device_id} onClick={() => setSelected(d)}>
                    <Td>
                      <div className="font-medium text-white">{d.name}</div>
                      <div className="text-xs text-slate-500">{d.device_id}</div>
                      {d.vin && <div className="text-xs text-slate-600">VIN: {d.vin}</div>}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        {DEVICE_TYPE_ICON[d.type]}
                        <span className="text-sm">{DEVICE_TYPE_LABEL[d.type] ?? d.type}</span>
                      </div>
                    </Td>
                    <Td>
                      <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-blue-300">
                        {d.protocol}
                      </code>
                    </Td>
                    <Td>{statusBadge(d.status)}</Td>
                    <Td>{certBadge(d.cert_status)}</Td>
                    <Td>
                      {d.cert_expiry ? (
                        <div>
                          <div className="text-sm">{formatDate(d.cert_expiry)}</div>
                          {daysUntil(d.cert_expiry) <= 30 && (
                            <div className="text-xs text-yellow-400">
                              {daysUntil(d.cert_expiry) < 0
                                ? 'Expired'
                                : `${daysUntil(d.cert_expiry)}d left`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </Td>
                    <Td>
                      {d.hsm_backed ? (
                        <Badge variant="info">HSM</Badge>
                      ) : (
                        <span className="text-slate-600 text-xs">Software</span>
                      )}
                    </Td>
                    <Td className="text-xs text-slate-400">{formatDateTime(d.last_seen)}</Td>
                    <Td>
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail modal */}
      {selected && (
        <Modal open={!!selected} title={selected.name} onClose={() => setSelected(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Device ID', selected.device_id],
                ['Type', DEVICE_TYPE_LABEL[selected.type] ?? selected.type],
                ['VIN', selected.vin ?? '—'],
                ['Protocol', selected.protocol],
                ['Location', selected.location],
                ['Firmware', selected.firmware_version],
                ['IP Address', selected.ip_address],
                ['CA', selected.ca_name],
                ['CLM Policy', selected.clm_policy_id],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-slate-500 text-xs mb-0.5">{label}</div>
                  <div className="text-slate-200">{value}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-700 pt-4">
              <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Certificate</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-slate-500 text-xs mb-0.5">Serial</div>
                  <code className="text-blue-300 text-xs">{selected.certificate_serial ?? '—'}</code>
                </div>
                <div>
                  <div className="text-slate-500 text-xs mb-0.5">Status</div>
                  {certBadge(selected.cert_status)}
                </div>
                <div>
                  <div className="text-slate-500 text-xs mb-0.5">Expiry</div>
                  <div className="text-slate-200">{formatDate(selected.cert_expiry)}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs mb-0.5">HSM-Backed</div>
                  {selected.hsm_backed ? <Badge variant="info">Yes — CloudHSM</Badge> : <span className="text-slate-400">No</span>}
                </div>
              </div>
            </div>

            {selected.kms_key_id && (
              <div className="border-t border-slate-700 pt-4">
                <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">AWS KMS</div>
                <code className="text-xs text-orange-300 break-all">{selected.kms_key_id}</code>
              </div>
            )}

            {selected.tags.length > 0 && (
              <div className="border-t border-slate-700 pt-4 flex flex-wrap gap-1">
                {selected.tags.map(t => (
                  <span key={t} className="text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-400">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
