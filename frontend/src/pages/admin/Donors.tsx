import { useState } from 'react';
import {
  Search, Plus, Filter, Heart, ChevronDown, ChevronUp,
  Edit2, Eye, Trash2, X, Check, AlertCircle,
} from 'lucide-react';
import { mockDonors, mockDonations } from '../../services/mockData';
import type { Donor, DonorType } from '../../types';

const DONOR_TYPES: DonorType[] = ['Monetary', 'In-Kind', 'Volunteer', 'Skills', 'Social Media', 'Corporate'];

const typeColors: Record<DonorType, string> = {
  Monetary: 'green',
  'In-Kind': 'blue',
  Volunteer: 'amber',
  Skills: 'purple',
  'Social Media': 'rose',
  Corporate: 'teal',
};

function DonorModal({ donor, onClose }: { donor: Donor | null; onClose: () => void }) {
  const donations = mockDonations.filter((d) => d.donorId === donor?.id);
  if (!donor) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{donor.firstName} {donor.lastName}</h2>
          {donor.organizationName && <p className="modal-subtitle">{donor.organizationName}</p>}
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-item"><span>Email</span><strong>{donor.email}</strong></div>
            <div className="detail-item"><span>Phone</span><strong>{donor.phone || '—'}</strong></div>
            <div className="detail-item"><span>Type</span><span className={`type-badge type-${typeColors[donor.donorType]}`}>{donor.donorType}</span></div>
            <div className="detail-item"><span>Status</span><span className={`status-badge status-${donor.status.toLowerCase()}`}>{donor.status}</span></div>
            <div className="detail-item"><span>Total Contributions</span><strong>₱{donor.totalContributions.toLocaleString()}</strong></div>
            <div className="detail-item"><span>Last Donation</span><strong>{donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString('en-PH') : '—'}</strong></div>
          </div>
          {donations.length > 0 && (
            <>
              <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>Contribution History</h3>
              <div className="mini-table">
                <div className="mini-table-header">
                  <span>Date</span><span>Type</span><span>Description</span><span>Amount</span>
                </div>
                {donations.map((d) => (
                  <div key={d.id} className="mini-table-row">
                    <span>{new Date(d.date).toLocaleDateString('en-PH')}</span>
                    <span><span className={`type-badge type-${typeColors[d.type]}`}>{d.type}</span></span>
                    <span>{d.description}</span>
                    <span>{d.amount ? `₱${d.amount.toLocaleString()}` : 'In-kind'}</span>
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

export default function Donors() {
  const [donors, setDonors] = useState(mockDonors);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<DonorType | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [sortField, setSortField] = useState<'name' | 'total' | 'date'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDonor, setNewDonor] = useState({ firstName: '', lastName: '', email: '', donorType: 'Monetary' as DonorType });
  const [formError, setFormError] = useState('');

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = donors
    .filter((d) => {
      const name = `${d.firstName} ${d.lastName} ${d.organizationName || ''}`.toLowerCase();
      return (
        name.includes(search.toLowerCase()) &&
        (filterType === 'All' || d.donorType === filterType) &&
        (filterStatus === 'All' || d.status === filterStatus)
      );
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = `${a.firstName}${a.lastName}`.localeCompare(`${b.firstName}${b.lastName}`);
      else if (sortField === 'total') cmp = a.totalContributions - b.totalContributions;
      else cmp = (a.lastDonationDate || '').localeCompare(b.lastDonationDate || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const handleAdd = () => {
    if (!newDonor.firstName.trim() || !newDonor.email.trim()) {
      setFormError('First name and email are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newDonor.email)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    const id = Math.max(...donors.map((d) => d.id)) + 1;
    setDonors([...donors, { ...newDonor, id, lastName: newDonor.lastName || '', status: 'Active', totalContributions: 0, createdAt: new Date().toISOString() }]);
    setNewDonor({ firstName: '', lastName: '', email: '', donorType: 'Monetary' });
    setFormError('');
    setShowAddForm(false);
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
      : null;

  const totalDonations = donors.filter((d) => d.status === 'Active').reduce((s, d) => s + d.totalContributions, 0);

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

      {/* Summary row */}
      <div className="metrics-grid metrics-grid-4">
        <div className="metric-card metric-card-green">
          <div className="metric-value">₱{(totalDonations / 1000000).toFixed(2)}M</div>
          <div className="metric-label">Total Contributions</div>
        </div>
        <div className="metric-card metric-card-blue">
          <div className="metric-value">{donors.filter((d) => d.status === 'Active').length}</div>
          <div className="metric-label">Active Donors</div>
        </div>
        <div className="metric-card metric-card-amber">
          <div className="metric-value">{donors.filter((d) => d.donorType === 'Corporate').length}</div>
          <div className="metric-label">Corporate Partners</div>
        </div>
        <div className="metric-card metric-card-rose">
          <div className="metric-value">{mockDonations.length}</div>
          <div className="metric-label">Total Transactions</div>
        </div>
      </div>

      {/* Add donor form */}
      {showAddForm && (
        <div className="inline-form-card">
          <div className="inline-form-header">
            <h3><Plus size={16} /> Add New Donor</h3>
            <button className="btn-icon" onClick={() => setShowAddForm(false)}><X size={16} /></button>
          </div>
          {formError && (
            <div className="alert alert-error"><AlertCircle size={14} />{formError}</div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input className="form-input" value={newDonor.firstName} onChange={(e) => setNewDonor({ ...newDonor, firstName: e.target.value })} placeholder="First name" />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-input" value={newDonor.lastName} onChange={(e) => setNewDonor({ ...newDonor, lastName: e.target.value })} placeholder="Last name" />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" value={newDonor.email} onChange={(e) => setNewDonor({ ...newDonor, email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Donor Type</label>
              <select className="form-select" value={newDonor.donorType} onChange={(e) => setNewDonor({ ...newDonor, donorType: e.target.value as DonorType })}>
                {DONOR_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd}><Check size={14} /> Save Donor</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={16} className="search-icon" />
          <input className="search-input" placeholder="Search by name or organization…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-group">
          <Filter size={14} />
          <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value as typeof filterType)}>
            <option value="All">All Types</option>
            {DONOR_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}>
            <option value="All">All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
        <span className="results-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('name')}>Name <SortIcon field="name" /></th>
              <th>Type</th>
              <th>Email</th>
              <th className="sortable" onClick={() => handleSort('total')}>Total <SortIcon field="total" /></th>
              <th className="sortable" onClick={() => handleSort('date')}>Last Donation <SortIcon field="date" /></th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td>
                  <div className="table-name-cell">
                    <div className="table-avatar"><Heart size={12} fill="currentColor" /></div>
                    <div>
                      <div className="table-name">{d.firstName} {d.lastName}</div>
                      {d.organizationName && <div className="table-sub">{d.organizationName}</div>}
                    </div>
                  </div>
                </td>
                <td><span className={`type-badge type-${typeColors[d.donorType]}`}>{d.donorType}</span></td>
                <td className="table-secondary">{d.email}</td>
                <td><strong>₱{d.totalContributions.toLocaleString()}</strong></td>
                <td className="table-secondary">{d.lastDonationDate ? new Date(d.lastDonationDate).toLocaleDateString('en-PH') : '—'}</td>
                <td><span className={`status-badge status-${d.status.toLowerCase()}`}>{d.status}</span></td>
                <td>
                  <div className="action-btns">
                    <button className="btn-icon" title="View" onClick={() => setSelectedDonor(d)}><Eye size={15} /></button>
                    <button className="btn-icon" title="Edit"><Edit2 size={15} /></button>
                    <button className="btn-icon btn-icon-danger" title="Delete"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="empty-row"><AlertCircle size={16} /> No donors found matching your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedDonor && <DonorModal donor={selectedDonor} onClose={() => setSelectedDonor(null)} />}
    </div>
  );
}
