import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Mail, Home, AlertCircle, Plus, Pencil, Trash2, Shield, UserCog, X, Check,
} from 'lucide-react';
import { getApiBaseUrl } from '../../services/authApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';

const API_BASE = getApiBaseUrl();

type PortalUser = {
  id: string;
  email: string;
  userName: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
};

type SafehouseRow = {
  safehouseId: number;
  safehouseCode: string;
  name: string;
  region: string;
  city: string;
  province: string;
  country: string;
  openDate: string | null;
  status: string;
  capacityGirls: number | null;
  capacityStaff: number | null;
  currentOccupancy: number;
  notes: string | null;
};

type ResidentLite = { residentId: number; caseManagerId?: string | null };

function staffName(u: PortalUser) {
  return `${u.firstName} ${u.lastName}`.trim() || u.email;
}

export default function StaffManagement() {
  useDocumentTitle('Staff Management');
  const [admins, setAdmins] = useState<PortalUser[]>([]);
  const [caseManagers, setCaseManagers] = useState<PortalUser[]>([]);
  const [safehouses, setSafehouses] = useState<SafehouseRow[]>([]);
  const [residents, setResidents] = useState<ResidentLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showAddCm, setShowAddCm] = useState(false);
  const [showAddSh, setShowAddSh] = useState(false);

  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [newCm, setNewCm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [newSh, setNewSh] = useState({
    safehouseCode: '',
    name: '',
    region: '',
    city: '',
    province: '',
    country: 'Philippines',
    status: 'Active',
    capacityGirls: '' as string,
    capacityStaff: '' as string,
    notes: '',
  });

  const [editStaff, setEditStaff] = useState<PortalUser | null>(null);
  const [editStaffForm, setEditStaffForm] = useState({ firstName: '', lastName: '', email: '', isActive: true });

  const [editSh, setEditSh] = useState<SafehouseRow | null>(null);
  const [editShForm, setEditShForm] = useState({
    safehouseCode: '',
    name: '',
    region: '',
    city: '',
    province: '',
    country: 'Philippines',
    status: 'Active',
    capacityGirls: '' as string,
    capacityStaff: '' as string,
    currentOccupancy: '' as string,
    notes: '',
  });

  const [deleteStaffTarget, setDeleteStaffTarget] = useState<PortalUser | null>(null);
  const [deleteShTarget, setDeleteShTarget] = useState<SafehouseRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [a, c, s, r] = await Promise.all([
        fetch(`${API_BASE}/api/staff/admins`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/staff/case-managers`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/safehouses`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/residents?page=1&pageSize=500`, { credentials: 'include' }),
      ]);
      if (!a.ok) throw new Error(`Admins ${a.status}`);
      if (!c.ok) throw new Error(`Case managers ${c.status}`);
      if (!s.ok) throw new Error(`Safe houses ${s.status}`);
      if (!r.ok) throw new Error(`Residents ${r.status}`);
      setAdmins(await a.json());
      setCaseManagers(await c.json());
      setSafehouses(await s.json());
      const rj = await r.json();
      setResidents((rj.items ?? []) as ResidentLite[]);
    } catch (e) {
      setError((e as Error).message || 'Failed to load staff data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const caseloadByUserId = useMemo(() => {
    const m = new Map<string, number>();
    for (const res of residents) {
      const id = res.caseManagerId?.trim();
      if (!id) continue;
      m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [residents]);

  const openEditStaff = (u: PortalUser) => {
    setEditStaff(u);
    setEditStaffForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email ?? '',
      isActive: u.isActive,
    });
    setFormError('');
  };

  const openEditSh = (sh: SafehouseRow) => {
    setEditSh(sh);
    setEditShForm({
      safehouseCode: sh.safehouseCode,
      name: sh.name,
      region: sh.region,
      city: sh.city,
      province: sh.province,
      country: sh.country || 'Philippines',
      status: sh.status,
      capacityGirls: sh.capacityGirls != null ? String(sh.capacityGirls) : '',
      capacityStaff: sh.capacityStaff != null ? String(sh.capacityStaff) : '',
      currentOccupancy: String(sh.currentOccupancy ?? 0),
      notes: sh.notes ?? '',
    });
    setFormError('');
  };

  const saveEditStaff = async () => {
    if (!editStaff) return;
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch(`${API_BASE}/api/staff/users/${editStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: editStaffForm.firstName.trim(),
          lastName: editStaffForm.lastName.trim(),
          email: editStaffForm.email.trim() || null,
          isActive: editStaffForm.isActive,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Save failed (${res.status})`);
      }
      setEditStaff(null);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const saveEditSh = async () => {
    if (!editSh) return;
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch(`${API_BASE}/api/safehouses/${editSh.safehouseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          safehouseCode: editShForm.safehouseCode.trim(),
          name: editShForm.name.trim(),
          region: editShForm.region.trim(),
          city: editShForm.city.trim(),
          province: editShForm.province.trim(),
          country: editShForm.country.trim() || 'Philippines',
          status: editShForm.status.trim() || 'Active',
          capacityGirls: editShForm.capacityGirls ? Number(editShForm.capacityGirls) : null,
          capacityStaff: editShForm.capacityStaff ? Number(editShForm.capacityStaff) : null,
          currentOccupancy: Number(editShForm.currentOccupancy) || 0,
          notes: editShForm.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Save failed (${res.status})`);
      }
      setEditSh(null);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const createAdmin = async () => {
    if (!newAdmin.email.trim() || newAdmin.password.length < 14) {
      setFormError('Email and password (14+ characters) are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch(`${API_BASE}/api/staff/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: newAdmin.email.trim(),
          password: newAdmin.password,
          firstName: newAdmin.firstName.trim(),
          lastName: newAdmin.lastName.trim(),
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Create failed (${res.status})`);
      }
      setShowAddAdmin(false);
      setNewAdmin({ email: '', password: '', firstName: '', lastName: '' });
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Create failed.');
    } finally {
      setSaving(false);
    }
  };

  const createCm = async () => {
    if (!newCm.email.trim() || newCm.password.length < 14) {
      setFormError('Email and password (14+ characters) are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch(`${API_BASE}/api/staff/case-managers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: newCm.email.trim(),
          password: newCm.password,
          firstName: newCm.firstName.trim(),
          lastName: newCm.lastName.trim(),
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Create failed (${res.status})`);
      }
      setShowAddCm(false);
      setNewCm({ email: '', password: '', firstName: '', lastName: '' });
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Create failed.');
    } finally {
      setSaving(false);
    }
  };

  const createSh = async () => {
    if (!newSh.safehouseCode.trim() || !newSh.name.trim()) {
      setFormError('Code and name are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch(`${API_BASE}/api/safehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          safehouseCode: newSh.safehouseCode.trim(),
          name: newSh.name.trim(),
          region: newSh.region.trim(),
          city: newSh.city.trim(),
          province: newSh.province.trim(),
          country: newSh.country.trim() || 'Philippines',
          status: newSh.status.trim() || 'Active',
          capacityGirls: newSh.capacityGirls ? Number(newSh.capacityGirls) : null,
          capacityStaff: newSh.capacityStaff ? Number(newSh.capacityStaff) : null,
          notes: newSh.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Create failed (${res.status})`);
      }
      setShowAddSh(false);
      setNewSh({
        safehouseCode: '',
        name: '',
        region: '',
        city: '',
        province: '',
        country: 'Philippines',
        status: 'Active',
        capacityGirls: '',
        capacityStaff: '',
        notes: '',
      });
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Create failed.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteStaff = async () => {
    if (!deleteStaffTarget) return;
    try {
      const res = await fetch(`${API_BASE}/api/staff/users/${deleteStaffTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmed: true }),
      });
      if (!res.ok) {
        const t = await res.text();
        alert(t || `Failed (${res.status})`);
        return;
      }
      setDeleteStaffTarget(null);
      load();
    } catch {
      alert('Network error.');
    }
  };

  const confirmDeleteSh = async () => {
    if (!deleteShTarget) return;
    try {
      const res = await fetch(`${API_BASE}/api/safehouses/${deleteShTarget.safehouseId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmed: true }),
      });
      if (!res.ok) {
        const t = await res.text();
        alert(t || `Failed (${res.status})`);
        return;
      }
      setDeleteShTarget(null);
      load();
    } catch {
      alert('Network error.');
    }
  };

  const avgCaseload =
    caseManagers.length === 0
      ? 0
      : Math.round(
          caseManagers.reduce((s, u) => s + (caseloadByUserId.get(u.id) ?? 0), 0) / caseManagers.length
        );

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Staff Management</h1>
          <p>
            Manage <strong>admin accounts</strong>, <strong>social workers (case managers)</strong>, and{' '}
            <strong>safe houses</strong>. Passwords for new portal users must be at least 14 characters.
          </p>
        </div>
      </div>

      <div className="metrics-grid metrics-grid-3">
        <div className="metric-card metric-card-blue">
          <div className="metric-value">{admins.filter((a) => a.isActive).length}</div>
          <div className="metric-label">Active admins</div>
        </div>
        <div className="metric-card metric-card-green">
          <div className="metric-value">{caseManagers.filter((a) => a.isActive).length}</div>
          <div className="metric-label">Active social workers</div>
        </div>
        <div className="metric-card metric-card-amber">
          <div className="metric-value">{safehouses.filter((s) => s.status === 'Active').length}</div>
          <div className="metric-label">Safe houses</div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}
      {loading && (
        <div className="table-card" style={{ padding: '1rem 1.25rem' }}>
          Loading…
        </div>
      )}

      {/* Admins */}
      <div className="table-card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--gray-100)' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} aria-hidden /> Administrators
          </h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setShowAddAdmin((v) => !v); setFormError(''); }}>
            <Plus size={14} /> New admin
          </button>
        </div>
        {showAddAdmin && (
          <div className="inline-form-card" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
            {formError && showAddAdmin && !editStaff && <div className="alert alert-error"><AlertCircle size={14} /> {formError}</div>}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Password * (14+ chars)</label>
                <input className="form-input" type="password" autoComplete="new-password" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">First name *</label>
                <input className="form-input" value={newAdmin.firstName} onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Last name *</label>
                <input className="form-input" value={newAdmin.lastName} onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddAdmin(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={createAdmin}><Check size={14} /> Create</button>
            </div>
          </div>
        )}
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((u) => (
              <tr key={u.id}>
                <td><div className="table-name">{staffName(u)}</div></td>
                <td className="table-secondary"><Mail size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{u.email}</td>
                <td><span className={`status-badge status-${u.isActive ? 'active' : 'inactive'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div className="action-btns">
                    <button type="button" className="btn-icon" title="Edit" aria-label={`Edit ${staffName(u)}`} onClick={() => openEditStaff(u)}><Pencil size={15} /></button>
                    <button type="button" className="btn-icon btn-icon-danger" title="Deactivate" aria-label={`Deactivate ${staffName(u)}`} onClick={() => setDeleteStaffTarget(u)}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && admins.length === 0 && (
              <tr><td colSpan={4} className="empty-row"><AlertCircle size={16} /> No admin accounts.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Social workers */}
      <div className="table-card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--gray-100)' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserCog size={18} aria-hidden /> Social workers (case managers)
          </h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setShowAddCm((v) => !v); setFormError(''); }}>
            <Plus size={14} /> New social worker
          </button>
        </div>
        <p className="table-secondary" style={{ margin: '0.5rem 1.25rem 0', fontSize: '0.8125rem' }}>
          Avg. caseload (residents with matching case manager ID): {avgCaseload}
        </p>
        {showAddCm && (
          <div className="inline-form-card" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
            {formError && showAddCm && !editStaff && <div className="alert alert-error"><AlertCircle size={14} /> {formError}</div>}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={newCm.email} onChange={(e) => setNewCm({ ...newCm, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Password * (14+ chars)</label>
                <input className="form-input" type="password" autoComplete="new-password" value={newCm.password} onChange={(e) => setNewCm({ ...newCm, password: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">First name *</label>
                <input className="form-input" value={newCm.firstName} onChange={(e) => setNewCm({ ...newCm, firstName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Last name *</label>
                <input className="form-input" value={newCm.lastName} onChange={(e) => setNewCm({ ...newCm, lastName: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddCm(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={createCm}><Check size={14} /> Create</button>
            </div>
          </div>
        )}
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Caseload</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {caseManagers.map((u) => (
              <tr key={u.id}>
                <td><div className="table-name">{staffName(u)}</div></td>
                <td className="table-secondary"><Mail size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{u.email}</td>
                <td>{caseloadByUserId.get(u.id) ?? 0}</td>
                <td><span className={`status-badge status-${u.isActive ? 'active' : 'inactive'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div className="action-btns">
                    <button type="button" className="btn-icon" title="Edit" aria-label={`Edit ${staffName(u)}`} onClick={() => openEditStaff(u)}><Pencil size={15} /></button>
                    <button type="button" className="btn-icon btn-icon-danger" title="Deactivate" aria-label={`Deactivate ${staffName(u)}`} onClick={() => setDeleteStaffTarget(u)}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && caseManagers.length === 0 && (
              <tr><td colSpan={5} className="empty-row"><AlertCircle size={16} /> No case manager accounts.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Safe houses */}
      <div className="table-card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--gray-100)' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Home size={18} aria-hidden /> Safe houses
          </h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setShowAddSh((v) => !v); setFormError(''); }}>
            <Plus size={14} /> New safe house
          </button>
        </div>
        {showAddSh && (
          <div className="inline-form-card" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
            {formError && showAddSh && !editSh && <div className="alert alert-error"><AlertCircle size={14} /> {formError}</div>}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Code *</label>
                <input className="form-input" value={newSh.safehouseCode} onChange={(e) => setNewSh({ ...newSh, safehouseCode: e.target.value })} placeholder="e.g. SH-MNL-01" />
              </div>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={newSh.name} onChange={(e) => setNewSh({ ...newSh, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Region</label>
                <input className="form-input" value={newSh.region} onChange={(e) => setNewSh({ ...newSh, region: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={newSh.city} onChange={(e) => setNewSh({ ...newSh, city: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Province</label>
                <input className="form-input" value={newSh.province} onChange={(e) => setNewSh({ ...newSh, province: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <input className="form-input" value={newSh.country} onChange={(e) => setNewSh({ ...newSh, country: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <input className="form-input" value={newSh.status} onChange={(e) => setNewSh({ ...newSh, status: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Capacity (girls)</label>
                <input className="form-input" type="number" value={newSh.capacityGirls} onChange={(e) => setNewSh({ ...newSh, capacityGirls: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Capacity (staff)</label>
                <input className="form-input" type="number" value={newSh.capacityStaff} onChange={(e) => setNewSh({ ...newSh, capacityStaff: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={2} value={newSh.notes} onChange={(e) => setNewSh({ ...newSh, notes: e.target.value })} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddSh(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={createSh}><Check size={14} /> Create</button>
            </div>
          </div>
        )}
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Code</th>
              <th scope="col">Name</th>
              <th scope="col">Location</th>
              <th scope="col">Capacity</th>
              <th scope="col">Occupancy</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {safehouses.map((sh) => {
              const cap = sh.capacityGirls ?? 0;
              const occ = sh.currentOccupancy ?? 0;
              return (
                <tr key={sh.safehouseId}>
                  <td className="table-mono">{sh.safehouseCode}</td>
                  <td><div className="table-name">{sh.name}</div></td>
                  <td className="table-secondary">{sh.city}, {sh.province}</td>
                  <td>{cap}{sh.capacityStaff != null ? ` / staff ${sh.capacityStaff}` : ''}</td>
                  <td>{occ}</td>
                  <td><span className={`status-badge status-${sh.status === 'Active' ? 'active' : 'inactive'}`}>{sh.status}</span></td>
                  <td>
                    <div className="action-btns">
                      <button type="button" className="btn-icon" title="Edit" aria-label={`Edit ${sh.name}`} onClick={() => openEditSh(sh)}><Pencil size={15} /></button>
                      <button type="button" className="btn-icon btn-icon-danger" title="Delete" aria-label={`Delete ${sh.name}`} onClick={() => setDeleteShTarget(sh)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && safehouses.length === 0 && (
              <tr><td colSpan={7} className="empty-row"><AlertCircle size={16} /> No safe houses.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit staff modal */}
      {editStaff && (
        <div className="modal-overlay" onClick={() => setEditStaff(null)} role="presentation">
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-staff-title">
            <div className="modal-header">
              <h2 id="edit-staff-title">Edit portal user</h2>
              <button type="button" className="modal-close" onClick={() => setEditStaff(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="modal-body">
              {formError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><AlertCircle size={14} /> {formError}</div>}
              <div className="form-group">
                <label className="form-label">First name</label>
                <input className="form-input" value={editStaffForm.firstName} onChange={(e) => setEditStaffForm({ ...editStaffForm, firstName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Last name</label>
                <input className="form-input" value={editStaffForm.lastName} onChange={(e) => setEditStaffForm({ ...editStaffForm, lastName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={editStaffForm.email} onChange={(e) => setEditStaffForm({ ...editStaffForm, email: e.target.value })} />
              </div>
              <label className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={editStaffForm.isActive} onChange={(e) => setEditStaffForm({ ...editStaffForm, isActive: e.target.checked })} />
                <span>Active</span>
              </label>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', padding: '1rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEditStaff(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={saveEditStaff}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit safehouse modal */}
      {editSh && (
        <div className="modal-overlay" onClick={() => setEditSh(null)} role="presentation">
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-sh-title">
            <div className="modal-header">
              <h2 id="edit-sh-title">Edit safe house</h2>
              <button type="button" className="modal-close" onClick={() => setEditSh(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="modal-body">
              {formError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><AlertCircle size={14} /> {formError}</div>}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Code</label>
                  <input className="form-input" value={editShForm.safehouseCode} onChange={(e) => setEditShForm({ ...editShForm, safehouseCode: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={editShForm.name} onChange={(e) => setEditShForm({ ...editShForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Region</label>
                  <input className="form-input" value={editShForm.region} onChange={(e) => setEditShForm({ ...editShForm, region: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" value={editShForm.city} onChange={(e) => setEditShForm({ ...editShForm, city: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Province</label>
                  <input className="form-input" value={editShForm.province} onChange={(e) => setEditShForm({ ...editShForm, province: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input className="form-input" value={editShForm.country} onChange={(e) => setEditShForm({ ...editShForm, country: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <input className="form-input" value={editShForm.status} onChange={(e) => setEditShForm({ ...editShForm, status: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacity (girls)</label>
                  <input className="form-input" type="number" value={editShForm.capacityGirls} onChange={(e) => setEditShForm({ ...editShForm, capacityGirls: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacity (staff)</label>
                  <input className="form-input" type="number" value={editShForm.capacityStaff} onChange={(e) => setEditShForm({ ...editShForm, capacityStaff: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Current occupancy</label>
                  <input className="form-input" type="number" value={editShForm.currentOccupancy} onChange={(e) => setEditShForm({ ...editShForm, currentOccupancy: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" rows={2} value={editShForm.notes} onChange={(e) => setEditShForm({ ...editShForm, notes: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', padding: '1rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEditSh(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={saveEditSh}>Save</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={deleteStaffTarget !== null}
        onConfirm={confirmDeleteStaff}
        onCancel={() => setDeleteStaffTarget(null)}
        itemName={deleteStaffTarget ? `${staffName(deleteStaffTarget)} (portal user)` : ''}
      />
      <ConfirmDeleteModal
        isOpen={deleteShTarget !== null}
        onConfirm={confirmDeleteSh}
        onCancel={() => setDeleteShTarget(null)}
        itemName={deleteShTarget ? `safe house ${deleteShTarget.name}` : ''}
      />
    </div>
  );
}
