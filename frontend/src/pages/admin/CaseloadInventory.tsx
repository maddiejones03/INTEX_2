import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search, Plus, Filter, AlertCircle, Eye, Edit2, Trash2,
  ChevronLeft, ChevronRight, X, Check,
} from 'lucide-react';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import { getApiBaseUrl } from '../../services/authApi';

const CASE_CATEGORIES = ['Trafficked', 'Physical Abuse', 'Sexual Abuse', 'Neglect', 'Psychological Abuse', 'Economic Abuse', 'Abandoned', 'CICL'];
const CASE_STATUSES = ['Active', 'Reintegrated', 'Transferred', 'Runaway', 'Deceased', 'Closed'];
const PAGE_SIZE = 10;

interface Resident {
  residentId: number;
  caseControlNo: string;
  internalCode: string;
  safehouseId: number;
  caseStatus: string;
  sex: string;
  dateOfBirth: string;
  caseCategory: string;
  currentRiskLevel: string;
  initialRiskLevel: string;
  dateOfAdmission: string;
  reintegrationStatus: string;
  assignedSocialWorker: string;
  createdAt: string;
}

interface Safehouse {
  safehouseId: number;
  name: string;
  city: string;
}

interface ResidentDetail {
  residentId: number;
  caseControlNo: string;
  internalCode: string;
  safehouseId: number;
  caseStatus: string;
  sex: string;
  dateOfBirth: string;
  caseCategory: string;
  currentRiskLevel: string;
  dateOfAdmission: string;
  reintegrationStatus: string;
  assignedSocialWorker: string;
  religion?: string;
  placeOfBirth?: string;
  referralSource?: string;
  familyIs4ps?: boolean;
  familySoloParent?: boolean;
  familyIndigenous?: boolean;
  familyInformalSettler?: boolean;
  isPwd?: boolean;
  pwdType?: string;
  notes_restricted?: number;
  safehouse?: { name: string; city: string };
  safehouseName?: string;
  safehouseCity?: string;
  caseManagerView?: boolean;
}

function ResidentModal({
  residentId,
  onClose,
  caseManagerUi,
}: {
  residentId: number;
  onClose: () => void;
  caseManagerUi: boolean;
}) {
  const [resident, setResident] = useState<ResidentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getApiBaseUrl()}/api/residents/${residentId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setResident(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [residentId]);

  if (loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      </div>
    </div>
  );

  if (!resident) return null;

  const shLabel =
    resident.safehouse?.name ??
    resident.safehouseName ??
    `Safehouse ${resident.safehouseId}`;
  const cm = resident.caseManagerView || caseManagerUi;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{resident.caseControlNo}</h2>
            <p className="modal-subtitle">{resident.internalCode} · {shLabel}</p>
            {cm && (
              <p className="login-hint" style={{ marginTop: '0.35rem' }}>
                Case manager view — limited fields by design.
              </p>
            )}
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="modal-section-grid">
            <section className="modal-section">
              <h3>Demographics</h3>
              <div className="detail-grid">
                <div className="detail-item"><span>Date of Birth</span><strong>{resident.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString() : '—'}</strong></div>
                <div className="detail-item"><span>Sex</span><strong>{resident.sex}</strong></div>
                {!cm && (
                  <>
                    <div className="detail-item"><span>Place of Birth</span><strong>{resident.placeOfBirth || '—'}</strong></div>
                    <div className="detail-item"><span>Religion</span><strong>{resident.religion || '—'}</strong></div>
                  </>
                )}
              </div>
            </section>
            <section className="modal-section">
              <h3>Case Information</h3>
              <div className="detail-grid">
                <div className="detail-item"><span>Case Category</span><strong>{resident.caseCategory}</strong></div>
                <div className="detail-item"><span>Status</span><span className={`status-badge status-${resident.caseStatus?.toLowerCase().replace(' ', '-')}`}>{resident.caseStatus}</span></div>
                <div className="detail-item"><span>Risk Level</span><strong>{resident.currentRiskLevel || '—'}</strong></div>
                <div className="detail-item"><span>Admission Date</span><strong>{resident.dateOfAdmission ? new Date(resident.dateOfAdmission).toLocaleDateString() : '—'}</strong></div>
                {!cm && (
                  <div className="detail-item"><span>Referral Source</span><strong>{resident.referralSource || '—'}</strong></div>
                )}
                <div className="detail-item"><span>Social Worker</span><strong>{resident.assignedSocialWorker || '—'}</strong></div>
              </div>
            </section>
            {!cm && (
              <section className="modal-section">
                <h3>Socio-Demographic Profile</h3>
                <div className="flag-list">
                  <div className={`flag-item ${resident.familyIs4ps ? 'flag-yes' : 'flag-no'}`}>{resident.familyIs4ps ? '✓' : '✗'} 4Ps Beneficiary</div>
                  <div className={`flag-item ${resident.familySoloParent ? 'flag-yes' : 'flag-no'}`}>{resident.familySoloParent ? '✓' : '✗'} Solo Parent Household</div>
                  <div className={`flag-item ${resident.familyIndigenous ? 'flag-yes' : 'flag-no'}`}>{resident.familyIndigenous ? '✓' : '✗'} Indigenous Group</div>
                  <div className={`flag-item ${resident.familyInformalSettler ? 'flag-yes' : 'flag-no'}`}>{resident.familyInformalSettler ? '✓' : '✗'} Informal Settler</div>
                  <div className={`flag-item ${resident.isPwd ? 'flag-yes' : 'flag-no'}`}>{resident.isPwd ? '✓' : '✗'} Person with Disability {resident.pwdType ? `(${resident.pwdType})` : ''}</div>
                </div>
              </section>
            )}
            <section className="modal-section">
              <h3>Reintegration</h3>
              <div className="detail-grid">
                <div className="detail-item"><span>Status</span><strong>{resident.reintegrationStatus || '—'}</strong></div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CaseloadInventory() {
  const location = useLocation();
  const readOnly = location.pathname.startsWith('/case-manager');

  const [residents, setResidents] = useState<Resident[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterSafehouse, setFilterSafehouse] = useState('All');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newResident, setNewResident] = useState({
    caseControlNo: '',
    sex: 'F',
    dateOfBirth: '',
    caseCategory: 'Neglect',
    safehouseId: '',
    referralSource: '',
    assignedSocialWorker: '',
    initialRiskLevel: 'Medium',
    currentRiskLevel: 'Medium',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Resident | null>(null);

  const fetchResidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      if (filterStatus !== 'All') params.set('caseStatus', filterStatus);
      if (filterCategory !== 'All') params.set('caseCategory', filterCategory);
      if (filterSafehouse !== 'All') params.set('safehouseId', filterSafehouse);

      const res = await fetch(`${getApiBaseUrl()}/api/residents?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setResidents(data.items);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch residents', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterCategory, filterSafehouse]);

  useEffect(() => { fetchResidents(); }, [fetchResidents]);

  useEffect(() => {
    if (readOnly) {
      setSafehouses([]);
      return;
    }
    fetch(`${getApiBaseUrl()}/api/reports/residents-by-safehouse`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setSafehouses(data.map((s: { safehouseId: number; name: string; city: string }) => ({ safehouseId: s.safehouseId, name: s.name, city: s.city }))))
      .catch(() => {});
  }, [readOnly]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleAdd = async () => {
    if (!newResident.caseControlNo.trim() || !newResident.dateOfBirth || !newResident.safehouseId) {
      setFormError('Case control number, date of birth, and safe house are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/residents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          caseControlNo: newResident.caseControlNo,
          sex: newResident.sex,
          dateOfBirth: newResident.dateOfBirth || null,
          caseCategory: newResident.caseCategory,
          safehouseId: Number(newResident.safehouseId),
          caseStatus: 'Active',
          referralSource: newResident.referralSource || '',
          assignedSocialWorker: newResident.assignedSocialWorker || '',
          initialRiskLevel: newResident.initialRiskLevel,
          currentRiskLevel: newResident.currentRiskLevel,
          dateOfAdmission: new Date().toISOString().split('T')[0],
        }),
      });
      if (res.ok) {
        setShowAddForm(false);
        setNewResident({ caseControlNo: '', sex: 'F', dateOfBirth: '', caseCategory: 'Neglect', safehouseId: '', referralSource: '', assignedSocialWorker: '', initialRiskLevel: 'Medium', currentRiskLevel: 'Medium' });
        fetchResidents();
      } else {
        let message = 'Failed to create resident.';
        try {
          const err = await res.json();
          message = err?.message || err?.detail || message;
        } catch {
          // keep fallback message
        }
        setFormError(message);
      }
    } catch {
      setFormError('Failed to create resident.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`${getApiBaseUrl()}/api/residents/${deleteTarget.residentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmed: true }),
      });
      setDeleteTarget(null);
      fetchResidents();
    } catch (err) {
      console.error('Failed to delete resident', err);
    }
  };

  // Summary counts from current page — for accurate counts fetch all
  const activeCount = residents.filter(r => r.caseStatus === 'Active').length;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>{readOnly ? 'My caseload' : 'Caseload Inventory'}</h1>
          <p>
            {readOnly
              ? 'Residents assigned to you. Detail views omit sensitive socio-demographic fields available to admins.'
              : 'Manage and track all resident records across safe houses.'}
          </p>
        </div>
        {!readOnly && (
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus size={16} /> New Resident
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="metrics-grid metrics-grid-4">
        <div className="metric-card metric-card-blue">
          <div className="metric-value">{total}</div>
          <div className="metric-label">Total Records</div>
        </div>
        <div className="metric-card metric-card-green">
          <div className="metric-value">{safehouses.length}</div>
          <div className="metric-label">Safe Houses</div>
        </div>
        <div className="metric-card metric-card-amber">
          <div className="metric-value">{activeCount}</div>
          <div className="metric-label">Active (this page)</div>
        </div>
        <div className="metric-card metric-card-purple">
          <div className="metric-value">{totalPages}</div>
          <div className="metric-label">Pages</div>
        </div>
      </div>

      {/* Add form */}
      {!readOnly && showAddForm && (
        <div className="inline-form-card">
          <div className="inline-form-header">
            <h3><Plus size={16} /> New Resident Record</h3>
            <button className="btn-icon" onClick={() => setShowAddForm(false)}><X size={16} /></button>
          </div>
          {formError && <div className="alert alert-error"><AlertCircle size={14} /> {formError}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Case Control No. *</label>
              <input className="form-input" value={newResident.caseControlNo} onChange={(e) => setNewResident({ ...newResident, caseControlNo: e.target.value })} placeholder="e.g. KF-2024-006" />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth *</label>
              <input className="form-input" type="date" value={newResident.dateOfBirth} onChange={(e) => setNewResident({ ...newResident, dateOfBirth: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Sex</label>
              <select className="form-select" value={newResident.sex} onChange={(e) => setNewResident({ ...newResident, sex: e.target.value })}>
                <option value="F">Female</option><option value="M">Male</option><option value="O">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Case Category</label>
              <select className="form-select" value={newResident.caseCategory} onChange={(e) => setNewResident({ ...newResident, caseCategory: e.target.value })}>
                {CASE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Safe House *</label>
              <select className="form-select" value={newResident.safehouseId} onChange={(e) => setNewResident({ ...newResident, safehouseId: e.target.value })}>
                <option value="">Select safehouse</option>
                {safehouses.map((s) => <option key={s.safehouseId} value={s.safehouseId}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Initial Risk Level</label>
              <select className="form-select" value={newResident.initialRiskLevel} onChange={(e) => setNewResident({ ...newResident, initialRiskLevel: e.target.value })}>
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Current Risk Level</label>
              <select className="form-select" value={newResident.currentRiskLevel} onChange={(e) => setNewResident({ ...newResident, currentRiskLevel: e.target.value })}>
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assigned Social Worker</label>
              <input className="form-input" value={newResident.assignedSocialWorker} onChange={(e) => setNewResident({ ...newResident, assignedSocialWorker: e.target.value })} placeholder="Social worker name" />
            </div>
            <div className="form-group">
              <label className="form-label">Referral Source</label>
              <input className="form-input" value={newResident.referralSource} onChange={(e) => setNewResident({ ...newResident, referralSource: e.target.value })} placeholder="e.g. DSWD, Police, Hospital" />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}><Check size={14} /> {saving ? 'Saving...' : 'Create Record'}</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={16} className="search-icon" />
          <input className="search-input" placeholder="Search by case number…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="filter-group">
          <Filter size={14} />
          <select className="form-select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="All">All Status</option>
            {CASE_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="form-select" value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}>
            <option value="All">All Categories</option>
            {CASE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select
            className="form-select"
            value={filterSafehouse}
            onChange={(e) => { setFilterSafehouse(e.target.value); setPage(1); }}
            disabled={readOnly && safehouses.length === 0}
          >
            <option value="All">All Safe Houses</option>
            {safehouses.map((sh) => <option key={sh.safehouseId} value={sh.safehouseId}>{sh.name}</option>)}
          </select>
        </div>
        <span className="results-count">{total} record{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="table-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading residents...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Case #</th>
                <th>Internal Code</th>
                <th>Sex</th>
                <th>Category</th>
                <th>Safe House</th>
                <th>Social Worker</th>
                <th>Admission</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {residents.map((r) => (
                <tr key={r.residentId}>
                  <td className="table-mono">{r.caseControlNo}</td>
                  <td className="table-secondary">{r.internalCode || '—'}</td>
                  <td className="table-secondary">{r.sex}</td>
                  <td><span className="category-chip">{r.caseCategory}</span></td>
                  <td className="table-secondary">{safehouses.find(s => s.safehouseId === r.safehouseId)?.name ?? `#${r.safehouseId}`}</td>
                  <td className="table-secondary">{r.assignedSocialWorker || '—'}</td>
                  <td className="table-secondary">{r.dateOfAdmission ? new Date(r.dateOfAdmission).toLocaleDateString() : '—'}</td>
                  <td><span className={`status-badge ${r.currentRiskLevel === 'High' || r.currentRiskLevel === 'Critical' ? 'status-danger' : ''}`}>{r.currentRiskLevel || '—'}</span></td>
                  <td><span className={`status-badge status-${r.caseStatus?.toLowerCase().replace(' ', '-')}`}>{r.caseStatus}</span></td>
                  <td>
                    <div className="action-btns">
                      <button type="button" className="btn-icon" title="View" onClick={() => setSelectedId(r.residentId)}><Eye size={15} /></button>
                      {!readOnly && (
                        <>
                          <button type="button" className="btn-icon" title="Edit"><Edit2 size={15} /></button>
                          <button type="button" className="btn-icon btn-icon-danger" title="Delete" onClick={() => setDeleteTarget(r)}><Trash2 size={15} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {residents.length === 0 && (
                <tr><td colSpan={10} className="empty-row"><AlertCircle size={16} /> No records match your filters.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn-icon" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}><ChevronLeft size={16} /></button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn-icon" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {selectedId !== null && (
        <ResidentModal
          residentId={selectedId}
          onClose={() => setSelectedId(null)}
          caseManagerUi={readOnly}
        />
      )}
      <ConfirmDeleteModal
        isOpen={deleteTarget !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        itemName={deleteTarget?.caseControlNo ?? ''}
      />
    </div>
  );
}
