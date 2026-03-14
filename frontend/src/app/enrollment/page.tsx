'use client';

import { useState } from 'react';
import { FilePlus, Copy, CheckCheck, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Input } from '@/components/ui/SearchBar';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

const SAMPLE_CSR = `-----BEGIN CERTIFICATE REQUEST-----
MIICyjCCAbICAQAwgYQxCzAJBgNVBAYTAlNFMRMwEQYDVQQIDApTdG9ja2hvbG0x
EjAQBgNVBAcMCVN0b2NraG9sbTEUMBIGA1UECgwLRUpCQ0EgTGFiLjEVMBMGA1UE
CwwMUEtJIFRlc3RpbmcxHzAdBgNVBAMMFnRlc3QuZXhhbXBsZS5sYWIubG9jYWww
ggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC2EnmHjqFMIGQJGYtJpL/T
YDemoTESTmockCSRdataHEREforShowcasePurposesOnly12345ABCDE==
-----END CERTIFICATE REQUEST-----`;

export default function EnrollmentPage() {
  const [csr, setCsr] = useState('');
  const [caName, setCaName] = useState('IssuingCA');
  const [certProfile, setCertProfile] = useState('ENDUSER');
  const [eeProfile, setEeProfile] = useState('USER_PROFILE');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ serial_number: string; certificate: string; ca_name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleEnroll = async () => {
    if (!csr.trim()) { setError('CSR is required'); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.certificates.enroll({
        csr, ca_name: caName, certificate_profile: certProfile,
        end_entity_profile: eeProfile, username, password,
      });
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Enrollment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.certificate);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Certificate Enrollment" subtitle="PKCS#10 CSR enrollment via EJBCA REST API" />

      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm">
            {['Paste CSR', 'Configure', 'Enroll', 'Receive Certificate'].map((step, i) => (
              <span key={step} className="flex items-center gap-2">
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>{i + 1}</span>
                <span className={i === 0 ? 'text-slate-200' : 'text-slate-500'}>{step}</span>
                {i < 3 && <ChevronRight className="w-3 h-3 text-slate-600" />}
              </span>
            ))}
          </div>

          <Card>
            <h3 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <FilePlus className="w-5 h-5 text-blue-400" />
              Certificate Signing Request
            </h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">PKCS#10 CSR (PEM format) <span className="text-red-400">*</span></label>
                  <Button size="sm" variant="ghost" onClick={() => setCsr(SAMPLE_CSR)}>
                    Use sample CSR
                  </Button>
                </div>
                <textarea
                  value={csr}
                  onChange={e => setCsr(e.target.value)}
                  placeholder="-----BEGIN CERTIFICATE REQUEST-----&#10;...&#10;-----END CERTIFICATE REQUEST-----"
                  rows={8}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Certificate Authority</label>
                  <Select value={caName} onChange={setCaName} options={[
                    { value: 'IssuingCA', label: 'IssuingCA' },
                    { value: 'TLSIssuingCA', label: 'TLSIssuingCA' },
                    { value: 'ManagementCA', label: 'ManagementCA' },
                  ]} className="w-full" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Certificate Profile</label>
                  <Select value={certProfile} onChange={setCertProfile} options={[
                    { value: 'ENDUSER', label: 'ENDUSER' },
                    { value: 'SERVER', label: 'SERVER' },
                    { value: 'ADMINROLE', label: 'ADMINROLE' },
                    { value: 'DEVICE', label: 'DEVICE' },
                  ]} className="w-full" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">End Entity Profile</label>
                  <Select value={eeProfile} onChange={setEeProfile} options={[
                    { value: 'USER_PROFILE', label: 'USER_PROFILE' },
                    { value: 'SERVER_PROFILE', label: 'SERVER_PROFILE' },
                    { value: 'EMPTY', label: 'EMPTY' },
                    { value: 'DEVICE_PROFILE', label: 'DEVICE_PROFILE' },
                  ]} className="w-full" />
                </div>
                <Input label="Username" value={username} onChange={setUsername} placeholder="alice (for existing end entity)" />
              </div>

              <Input label="Enrollment Password" value={password} onChange={setPassword} type="password" placeholder="Leave blank in mock mode" />

              {error && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button variant="primary" size="lg" disabled={loading} onClick={handleEnroll} className="w-full justify-center">
                {loading ? 'Enrolling...' : 'Enroll Certificate'}
              </Button>
            </div>
          </Card>

          {result && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="success">Enrolled</Badge>
                  <h3 className="text-base font-semibold text-slate-100">Issued Certificate</h3>
                </div>
                <Button size="sm" onClick={handleCopy}>
                  {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy PEM'}
                </Button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex gap-3 py-1">
                  <span className="text-slate-500 w-32">Serial Number</span>
                  <span className="font-mono text-slate-200">{result.serial_number}</span>
                </div>
                <div className="flex gap-3 py-1">
                  <span className="text-slate-500 w-32">Issued By</span>
                  <span className="text-slate-200">{result.ca_name}</span>
                </div>
              </div>
              <pre className="mt-4 p-4 bg-slate-900 rounded-lg text-xs text-emerald-400 overflow-x-auto border border-slate-700 whitespace-pre-wrap break-all">
                {result.certificate}
              </pre>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
