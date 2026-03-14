'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { SearchBar, Select, Input } from '@/components/ui/SearchBar';
import { api } from '@/lib/api';
import { formatDate, truncateDN } from '@/lib/utils';
import type { EndEntity } from '@/types/ejbca';

const BLANK: Partial<EndEntity> & { password: string } = {
  username: '', subject_dn: '', subject_alt_name: '', email: '',
  ca_name: 'IssuingCA', certificate_profile: 'ENDUSER',
  end_entity_profile: 'USER_PROFILE', token_type: 'USERGENERATED', password: '',
};

export default function EndEntitiesPage() {
  const [ees, setEEs] = useState<EndEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EndEntity | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EndEntity | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    api.endentities.list().then(d => setEEs(d.end_entities)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = ees.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.username.toLowerCase().includes(q) || e.subject_dn.toLowerCase().includes(q);
    const matchStatus = !statusFilter || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...BLANK });
    setShowForm(true);
  };

  const openEdit = (ee: EndEntity) => {
    setEditing(ee);
    setForm({ ...ee, password: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await api.endentities.update(editing.username, form);
      } else {
        await api.endentities.create(form);
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.endentities.delete(deleteTarget.username);
      setDeleteTarget(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  const setField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="End Entity Management" subtitle={`${ees.length} end entities`} />

      <main className="flex-1 p-6 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by username or DN..." className="flex-1 min-w-48" />
          <Select value={statusFilter} onChange={setStatusFilter} options={[
            { value: '', label: 'All Status' },
            { value: 'NEW', label: 'New' },
            { value: 'GENERATED', label: 'Generated' },
            { value: 'REVOKED', label: 'Revoked' },
            { value: 'HISTORICAL', label: 'Historical' },
          ]} />
          <Button size="md" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="md" variant="primary" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add End Entity
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
                  <Th>Username</Th>
                  <Th>Subject DN</Th>
                  <Th>CA</Th>
                  <Th>Profile</Th>
                  <Th>Modified</Th>
                  <Th>Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {filtered.map(ee => (
                  <Tr key={ee.username}>
                    <Td><Badge variant={statusBadge(ee.status)}>{ee.status}</Badge></Td>
                    <Td><span className="font-medium text-slate-200">{ee.username}</span></Td>
                    <Td><span className="text-xs font-mono">{truncateDN(ee.subject_dn)}</span></Td>
                    <Td><span className="text-xs">{ee.ca_name}</span></Td>
                    <Td><span className="text-xs">{ee.certificate_profile}</span></Td>
                    <Td><span className="text-xs">{formatDate(ee.modified)}</span></Td>
                    <Td>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(ee)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(ee)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
                {filtered.length === 0 && (
                  <Tr><Td className="text-center py-8 text-slate-500" colSpan={7 as never}>No end entities found</Td></Tr>
                )}
              </Tbody>
            </Table>
          )}
        </Card>
      </main>

      {/* Create/Edit Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? `Edit: ${editing.username}` : 'Create End Entity'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Username" value={form.username || ''} onChange={v => setField('username', v)} placeholder="alice" required />
            <Input label="Email" value={form.email || ''} onChange={v => setField('email', v)} placeholder="alice@example.com" type="email" />
          </div>
          <Input label="Subject DN" value={form.subject_dn || ''} onChange={v => setField('subject_dn', v)} placeholder="CN=alice,O=Lab,C=SE" required />
          <Input label="Subject Alt Name" value={form.subject_alt_name || ''} onChange={v => setField('subject_alt_name', v)} placeholder="rfc822Name=alice@example.com" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">CA</label>
              <Select value={form.ca_name || ''} onChange={v => setField('ca_name', v)} options={[
                { value: 'ManagementCA', label: 'ManagementCA' },
                { value: 'IssuingCA', label: 'IssuingCA' },
                { value: 'TLSIssuingCA', label: 'TLSIssuingCA' },
              ]} className="w-full" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Certificate Profile</label>
              <Select value={form.certificate_profile || ''} onChange={v => setField('certificate_profile', v)} options={[
                { value: 'ENDUSER', label: 'ENDUSER' },
                { value: 'SERVER', label: 'SERVER' },
                { value: 'ADMINROLE', label: 'ADMINROLE' },
                { value: 'DEVICE', label: 'DEVICE' },
              ]} className="w-full" />
            </div>
          </div>
          {!editing && (
            <Input label="Password" value={form.password || ''} onChange={v => setField('password', v)} type="password" placeholder="Enrollment password" required />
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="primary" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create End Entity'}
            </Button>
            <Button onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete End Entity">
        <div className="space-y-4">
          <p className="text-slate-300">
            Are you sure you want to delete end entity <strong>{deleteTarget?.username}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="danger" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
            <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
