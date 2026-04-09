import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, Filter, Heart, ChevronDown, ChevronUp,
  Edit2, Eye, Trash2, X, Check, AlertCircle,
} from 'lucide-react';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5030';

const SUPPORTER_TYPES = ['Individual', 'Corporate', 'Foundation', 'Government', 'NGO', 'Church'];
const RELATIONSHIP_TYPES = ['Local', 'International', 'Donor', 'PartnerOrganization'];
const STATUS_OPTIONS = ['Active', 'Inactive'];
const PAGE_SIZE = 20;

interface Supporter {
  supporterId: number;
  supporterType: string;
  displayName: string;
  organizationName: string;
  firstName: string;
  lastName: string;
  relationshipType: string;
  region: string;
  country: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  firstDonationDate: string;
  acquisitionChannel: string;
  donations?: Donation[];
}

interface Donation {
  donationId: number;
  donationType: string;
  donationDate: string;
  amount: number;
  currencyCode: string;
  campaignName: string;
}

function SupporterModal({ supporterId, onClose }: { supporterId: number; onClose: () => void }) {
  const [supporter, setSupporter] = useState<Supporter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/supporters/${supporterId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setSupporter(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [supporterId]);

  if (loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      </div>
    </div>
  );

  if (!supporter) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{supporter.displayName}</h2>
          {supporter.organizationName && <p className="modal-subtitle">{supporter.organizationName}</p>}
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-item"><span>Email</span><strong>{supporter.email || '—'}</strong></div>
            <div className="detail-item"><span>Phone</span><strong>{supporter.phone || '—'}</strong></div>
            <div className="detail-item"><span>Type</span><strong>{supporter.supporterType}</strong></div>
            <div className="detail-item"><span>Relationship</span><strong>{supporter.relationshipType || '—'}</strong></div>
            <div className="detail-item"><span>Status</span><span className={`status-badge status-${supporter.status?.toLowerCase()}`}>{supporter.status}</span></div>
            <div className="detail-item"><span>Region</span><strong>{supporter.region || '—'}</strong></div>
            <div className="detail-item"><span>Country</span><strong>{supporter.country || '—'}</strong></div>
            <div className="detail-item"><span>First Donation</span><strong>{supporter.firstDonationDate ? new Date(supporter.firstDonationDate).toLocaleDateString() : '—'}</strong></div>
            <div className="detail-item"><span>Acquisition Channel</span><strong>{supporter.acquisitionChannel || '—'}</strong></div>
          </div>
          {supporter.donations && supporter.donations.length > 0 && (
            <>
              <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>Donation History</h3>
              <div className="mini-table">
                <div className="mini-table-header">
                  <span>Date</span><span>Type</span><span>Campaign</span><span>Amount</span>
                </div>
                {supporter.donations.map((d) => (
                  <div key={d.donationId} className="mini-table-row">
                    <span>{new Date(d.donationDate).toLocaleDateString()}</span>
                    <span>{d.donationType}</span>
                    <span>{d.campaignName || '—'}</span>
                    <span>{d.amount ? `${d.currencyCode} ${d.amount.toLocaleString()}` : 'In-kind'}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EditSupporterModal({ supporter, onClose, onSaved }: { supporter: Supporter; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    displayName: supporter.displayName || '',
    firstName: supporter.firstName || '',
    lastName: supporter.lastName || '',
    organizationName: supporter.organizationName || '',
    email: supporter.email || '',
    phone: supporter.phone || '',
    supporterType: supporter.supporterType || 'Individual',
    relationshipType: supporter.relationshipType || 'Local',
    region: supporter.region || '',
    country: supporter.country || '',
    status: supporter.status || 'Active',
    acquisitionChannel: supporter.acquisitionChannel || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.displayName.trim()) { setError('Display name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/supporters/${supporter.supporterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          supporterId: supporter.supporterId,
          createdAt: supporter.createdAt,
          firstDonationDate: supporter.firstDonationDate,
        }),
      });
      if (res.ok) { onSaved(); onClose(); }
      else { setError('Failed to update supporter.'); }
    } catch {
      setError('Failed to update supporter.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Supporter</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error"><AlertCircle size={14} />{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Display Name *</label>
              <input className="form-input" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-input" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-input" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Organization Name</label>
              <input className="form-input" value={form.organizationName} onChange={e => setForm({ ...form, organizationName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Supporter Type</label>
              <select className="form-select" value={form.supporterType} onChange={e => setForm({ ...form, supporterType: e.target.value })}>
                {SUPPORTER_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Relationship Type</label>
              <select className="form-select" value={form.relationshipType} onChange={e => setForm({ ...form, relationshipType: e.target.value })}>
                {RELATIONSHIP_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Region</label>
              <input className="form-input" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Country</label>
              <input className="form-input" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Acquisition Channel</label>
              <input className="form-input" value={form.acquisitionChannel} onChange={e => setForm({ ...form, acquisitionChannel: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="modal-footer" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Check size={14} /> {saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Donors() {
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortField, setSortField] = useState<'name' | 'date'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<Supporter | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSupporter, setNewSupporter] = useState({
    displayName: '', email: '', supporterType: 'Individual', relationshipType: 'Local', firstName: '', lastName: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Supporter | null>(null);

  const fetchSupporters = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      if (filterType !== 'All') params.set('supporterType', filterType);
      if (filterStatus !== 'All') params.set('status', filterStatus);
      const res = await fetch(`${API_BASE}/api/supporters?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSupporters(data.items);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch supporters', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterType, filterStatus]);

  useEffect(() => { fetchSupporters(); }, [fetchSupporters]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sorted = [...supporters].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') cmp = a.displayName.localeCompare(b.displayName);
    else cmp = (a.firstDonationDate || '').localeCompare(b.firstDonationDate || '');
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleAdd = async () => {
    if (!newSupporter.displayName.trim()) { setFormError('Display name is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch(`${API_BASE}/api/supporters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          displayName: newSupporter.displayName,
          email: newSupporter.email,
          supporterType: newSupporter.supporterType,
          relationshipType: newSupporter.relationshipType,
          firstName: newSupporter.firstName,
          lastName: newSupporter.lastName,
          status: 'Active',
        }),
      });
      if (res.ok) {
        setShowAddForm(false);
        setNewSupporter({ displayName: '', email: '', supporterType: 'Individual', relationshipType: 'Local', firstName: '', lastName: '' });
        fetchSupporters();
      } else {
        setFormError('Failed to create supporter.');
      }
    } catch {
      setFormError('Failed to create supporter.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`${API_BASE}/api/supporters/${deleteTarget.supporterId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmed: true }),
      });
      setDeleteTarget(null);
      fetchSupporters();
    } catch (err) {
      console.error('Failed to delete supporter', err);
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field ? sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} /> : null;

  const activeCount = supporters.filter(s => s.status === 'Active').length;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Donors &amp; Contributions</h1>
          <p>Manage supporter profiles and track all contributions.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          <Plus size={16} /> Add Donor
        </button>
      </div>

      <div className="metrics-grid metrics-grid-4">
        <div className="metric-card metric-card-blue">
          <div className="metric-value">{total}</div>
          <div className="metric-label">Total Supporters</div>
        </div>
        <div className="metric-card metric-card-green">
          <div className="metric-value">{activeCount}</div>
          <div className="metric-label">Active (this page)</div>
        </div>
        <div className="metric-card metric-card-amber">
          <div className="metric-value">{supporters.filter(s => s.supporterType === 'Corporate').length}</div>
          <div className="metric-label">Corporate (this page)</div>
        </div>
        <div className="metric-card metric-card-rose">
          <div className="metric-value">{totalPages}</div>
          <div className="metric-label">Pages</div>
        </div>
      </div>

      {showAddForm && (
        <div className="inline-form-card">
          <div className="inline-form-header">
            <h3><Plus size={16} /> Add New Donor</h3>
            <button className="btn-icon" onClick={() => setShowAddForm(false)}><X size={16} /></button>
          </div>
          {formError && <div className="alert alert-error"><AlertCircle size={14} />{formError}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Display Name *</label>
              <input className="form-input" value={newSupporter.displayName} onChange={(e) => setNewSupporter({ ...newSupporter, displayName: e.target.value })} placeholder="Full name or org name" />
            </div>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-input" value={newSupporter.firstName} onChange={(e) => setNewSupporter({ ...newSupporter, firstName: e.target.value })} placeholder="First name" />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-input" value={newSupporter.lastName} onChange={(e) => setNewSupporter({ ...newSupporter, lastName: e.target.value })} placeholder="Last name" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={newSupporter.email} onChange={(e) => setNewSupporter({ ...newSupporter, email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Supporter Type</label>
              <select className="form-select" value={newSupporter.supporterType} onChange={(e) => setNewSupporter({ ...newSupporter, supporterType: e.target.value })}>
                {SUPPORTER_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Relationship Type</label>
              <select className="form-select" value={newSupporter.relationshipType} onChange={(e) => setNewSupporter({ ...newSupporter, relationshipType: e.target.value })}>
                {RELATIONSHIP_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}><Check size={14} /> {saving ? 'Saving...' : 'Save Donor'}</button>
          </div>
        </div>
      )}

      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={16} className="search-icon" />
          <input className="search-input" placeholder="Search by name or organization…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="filter-group">
          <Filter size={14} />
          <select className="form-select" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
            <option value="All">All Types</option>
            {SUPPORTER_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select className="form-select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="All">All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
        <span className="results-count">{total} result{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading supporters...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('name')}>Name <SortIcon field="name" /></th>
                <th>Type</th>
                <th>Email</th>
                <th>Region</th>
                <th className="sortable" onClick={() => handleSort('date')}>First Donation <SortIcon field="date" /></th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.supporterId}>
                  <td>
                    <div className="table-name-cell">
                      <div className="table-avatar"><Heart size={12} fill="currentColor" /></div>
                      <div>
                        <div className="table-name">{s.displayName}</div>
                        {s.organizationName && <div className="table-sub">{s.organizationName}</div>}
                      </div>
                    </div>
                  </td>
                  <td><span className="category-chip">{s.supporterType}</span></td>
                  <td className="table-secondary">{s.email || '—'}</td>
                  <td className="table-secondary">{s.region || s.country || '—'}</td>
                  <td className="table-secondary">{s.firstDonationDate ? new Date(s.firstDonationDate).toLocaleDateString() : '—'}</td>
                  <td><span className={`status-badge status-${s.status?.toLowerCase()}`}>{s.status}</span></td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-icon" title="Edit" onClick={() => setEditTarget(s)}><Edit2 size={15} /></button>
                      <button className="btn-icon btn-icon-danger" title="Delete" onClick={() => setDeleteTarget(s)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={7} className="empty-row"><AlertCircle size={16} /> No donors found.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn-icon" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}><ChevronDown size={16} /></button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn-icon" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}><ChevronUp size={16} /></button>
          </div>
        )}
      </div>

      {selectedId !== null && <SupporterModal supporterId={selectedId} onClose={() => setSelectedId(null)} />}
      {editTarget !== null && <EditSupporterModal supporter={editTarget} onClose={() => setEditTarget(null)} onSaved={fetchSupporters} />}
      <ConfirmDeleteModal
        isOpen={deleteTarget !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        itemName={deleteTarget?.displayName ?? ''}
      />
    </div>
  );
}
