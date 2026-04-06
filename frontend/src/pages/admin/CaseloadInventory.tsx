import { useState } from 'react';
import {
  Search, Plus, Filter, AlertCircle, Eye, Edit2,
  ChevronLeft, ChevronRight, X, Check, User,
} from 'lucide-react';
import { mockResidents, mockSafeHouses, mockSocialWorkers } from '../../services/mockData';
import type { Resident, CaseCategory, CaseStatus } from '../../types';

const CASE_CATEGORIES: CaseCategory[] = ['Trafficked', 'Physical Abuse', 'Sexual Abuse', 'Neglect', 'Psychological Abuse', 'Economic Abuse', 'Abandoned', 'CICL'];
const CASE_STATUSES: CaseStatus[] = ['Active', 'Reintegrated', 'Transferred', 'Runaway', 'Deceased', 'Closed'];
const PAGE_SIZE = 10;

function ResidentModal({ resident, onClose }: { resident: Resident; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{resident.firstName} {resident.middleName ? resident.middleName + ' ' : ''}{resident.lastName}</h2>
            <p className="modal-subtitle">{resident.caseNumber} · {resident.safeHouseName}</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="modal-section-grid">
            <section className="modal-section">
              <h3>Demographics</h3>
              <div className="detail-grid">
                <div className="detail-item"><span>Date of Birth</span><strong>{new Date(resident.dateOfBirth).toLocaleDateString('en-PH')}</strong></div>
                <div className="detail-item"><span>Age</span><strong>{resident.age}</strong></div>
                <div className="detail-item"><span>Gender</span><strong>{resident.gender}</strong></div>
                <div className="detail-item"><span>Civil Status</span><strong>{resident.civilStatus}</strong></div>
                <div className="detail-item"><span>Nationality</span><strong>{resident.nationality}</strong></div>
                <div className="detail-item"><span>Religion</span><strong>{resident.religion || '—'}</strong></div>
                <div className="detail-item"><span>Education</span><strong>{resident.educationLevel}</strong></div>
                <div className="detail-item"><span>Address</span><strong>{resident.address}</strong></div>
              </div>
            </section>
            <section className="modal-section">
              <h3>Case Information</h3>
              <div className="detail-grid">
                <div className="detail-item"><span>Case Category</span><strong>{resident.caseCategory}</strong></div>
                <div className="detail-item"><span>Sub-Categories</span><strong>{resident.caseSubCategory.join(', ')}</strong></div>
                <div className="detail-item"><span>Status</span><span className={`status-badge status-${resident.caseStatus.toLowerCase().replace(' ', '-')}`}>{resident.caseStatus}</span></div>
                <div className="detail-item"><span>Admission Date</span><strong>{new Date(resident.admissionDate).toLocaleDateString('en-PH')}</strong></div>
                <div className="detail-item"><span>Referral Source</span><strong>{resident.referralSource}</strong></div>
                <div className="detail-item"><span>Social Worker</span><strong>{resident.assignedSocialWorkerName}</strong></div>
              </div>
            </section>
            <section className="modal-section">
              <h3>Socio-Demographic Profile</h3>
              <div className="flag-list">
                <div className={`flag-item ${resident.is4PsBeneficiary ? 'flag-yes' : 'flag-no'}`}>
                  {resident.is4PsBeneficiary ? '✓' : '✗'} 4Ps Beneficiary
                </div>
                <div className={`flag-item ${resident.isSoloParent ? 'flag-yes' : 'flag-no'}`}>
                  {resident.isSoloParent ? '✓' : '✗'} Solo Parent Household
                </div>
                <div className={`flag-item ${resident.isIndigenousGroup ? 'flag-yes' : 'flag-no'}`}>
                  {resident.isIndigenousGroup ? '✓' : '✗'} Indigenous Group {resident.indigenousGroupName ? `(${resident.indigenousGroupName})` : ''}
                </div>
                <div className={`flag-item ${resident.isInformalSettler ? 'flag-yes' : 'flag-no'}`}>
                  {resident.isInformalSettler ? '✓' : '✗'} Informal Settler
                </div>
                <div className={`flag-item ${resident.hasDisability ? 'flag-yes' : 'flag-no'}`}>
                  {resident.hasDisability ? '✓' : '✗'} Person with Disability {resident.disabilityType ? `(${resident.disabilityType})` : ''}
                </div>
              </div>
            </section>
            <section className="modal-section">
              <h3>Reintegration</h3>
              <div className="detail-grid">
                <div className="detail-item"><span>Status</span><strong>{resident.reintegrationStatus}</strong></div>
                {resident.reintegrationDate && <div className="detail-item"><span>Date</span><strong>{new Date(resident.reintegrationDate).toLocaleDateString('en-PH')}</strong></div>}
                {resident.exitReason && <div className="detail-item full-width"><span>Exit Reason</span><strong>{resident.exitReason}</strong></div>}
              </div>
            </section>
          </div>
          {resident.notes && (
            <div className="notes-section">
              <strong>Notes:</strong> {resident.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CaseloadInventory() {
  const [residents] = useState(mockResidents);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<CaseStatus | 'All'>('All');
  const [filterCategory, setFilterCategory] = useState<CaseCategory | 'All'>('All');
  const [filterSafeHouse, setFilterSafeHouse] = useState<number | 'All'>('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Resident | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newResident, setNewResident] = useState({ firstName: '', lastName: '', gender: 'Female', dateOfBirth: '', caseCategory: 'Neglect' as CaseCategory, safeHouseId: 1, socialWorkerId: 1 });
  const [formError, setFormError] = useState('');

  const filtered = residents.filter((r) => {
    const name = `${r.firstName} ${r.lastName} ${r.caseNumber}`.toLowerCase();
    return (
      name.includes(search.toLowerCase()) &&
      (filterStatus === 'All' || r.caseStatus === filterStatus) &&
      (filterCategory === 'All' || r.caseCategory === filterCategory) &&
      (filterSafeHouse === 'All' || r.safeHouseId === filterSafeHouse)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = () => {
    if (!newResident.firstName.trim() || !newResident.dateOfBirth) {
      setFormError('First name and date of birth are required.');
      return;
    }
    setFormError('');
    setShowAddForm(false);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Caseload Inventory</h1>
          <p>Manage and track all resident records across safe houses.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          <Plus size={16} /> New Resident
        </button>
      </div>

      {/* Summary */}
      <div className="metrics-grid metrics-grid-4">
        <div className="metric-card metric-card-blue">
          <div className="metric-value">{residents.filter((r) => r.caseStatus === 'Active').length}</div>
          <div className="metric-label">Active Cases</div>
        </div>
        <div className="metric-card metric-card-green">
          <div className="metric-value">{residents.filter((r) => r.caseStatus === 'Reintegrated').length}</div>
          <div className="metric-label">Reintegrated</div>
        </div>
        <div className="metric-card metric-card-amber">
          <div className="metric-value">{residents.filter((r) => r.caseStatus === 'Transferred').length}</div>
          <div className="metric-label">Transferred</div>
        </div>
        <div className="metric-card metric-card-purple">
          <div className="metric-value">{residents.length}</div>
          <div className="metric-label">Total Records</div>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="inline-form-card">
          <div className="inline-form-header">
            <h3><Plus size={16} /> New Resident Record</h3>
            <button className="btn-icon" onClick={() => setShowAddForm(false)}><X size={16} /></button>
          </div>
          {formError && <div className="alert alert-error"><AlertCircle size={14} /> {formError}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input className="form-input" value={newResident.firstName} onChange={(e) => setNewResident({ ...newResident, firstName: e.target.value })} placeholder="First name" />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input className="form-input" value={newResident.lastName} onChange={(e) => setNewResident({ ...newResident, lastName: e.target.value })} placeholder="Last name" />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth *</label>
              <input className="form-input" type="date" value={newResident.dateOfBirth} onChange={(e) => setNewResident({ ...newResident, dateOfBirth: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-select" value={newResident.gender} onChange={(e) => setNewResident({ ...newResident, gender: e.target.value })}>
                <option>Female</option><option>Male</option><option>Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Case Category</label>
              <select className="form-select" value={newResident.caseCategory} onChange={(e) => setNewResident({ ...newResident, caseCategory: e.target.value as CaseCategory })}>
                {CASE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Safe House</label>
              <select className="form-select" value={newResident.safeHouseId} onChange={(e) => setNewResident({ ...newResident, safeHouseId: +e.target.value })}>
                {mockSafeHouses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assigned Social Worker</label>
              <select className="form-select" value={newResident.socialWorkerId} onChange={(e) => setNewResident({ ...newResident, socialWorkerId: +e.target.value })}>
                {mockSocialWorkers.map((sw) => <option key={sw.id} value={sw.id}>{sw.firstName} {sw.lastName}</option>)}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd}><Check size={14} /> Create Record</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={16} className="search-icon" />
          <input className="search-input" placeholder="Search by name or case number…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="filter-group">
          <Filter size={14} />
          <select className="form-select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as typeof filterStatus); setPage(1); }}>
            <option value="All">All Status</option>
            {CASE_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="form-select" value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value as typeof filterCategory); setPage(1); }}>
            <option value="All">All Categories</option>
            {CASE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="form-select" value={filterSafeHouse} onChange={(e) => { setFilterSafeHouse(e.target.value === 'All' ? 'All' : +e.target.value); setPage(1); }}>
            <option value="All">All Safe Houses</option>
            {mockSafeHouses.map((sh) => <option key={sh.id} value={sh.id}>{sh.name}</option>)}
          </select>
        </div>
        <span className="results-count">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Case #</th>
              <th>Name</th>
              <th>Age / Gender</th>
              <th>Category</th>
              <th>Safe House</th>
              <th>Social Worker</th>
              <th>Admission</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => (
              <tr key={r.id}>
                <td className="table-mono">{r.caseNumber}</td>
                <td>
                  <div className="table-name-cell">
                    <div className="table-avatar"><User size={12} /></div>
                    <div className="table-name">{r.firstName} {r.lastName}</div>
                  </div>
                </td>
                <td className="table-secondary">{r.age} · {r.gender}</td>
                <td><span className="category-chip">{r.caseCategory}</span></td>
                <td className="table-secondary">{r.safeHouseName}</td>
                <td className="table-secondary">{r.assignedSocialWorkerName}</td>
                <td className="table-secondary">{new Date(r.admissionDate).toLocaleDateString('en-PH')}</td>
                <td><span className={`status-badge status-${r.caseStatus.toLowerCase().replace(' ', '-')}`}>{r.caseStatus}</span></td>
                <td>
                  <div className="action-btns">
                    <button className="btn-icon" title="View" onClick={() => setSelected(r)}><Eye size={15} /></button>
                    <button className="btn-icon" title="Edit"><Edit2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={9} className="empty-row"><AlertCircle size={16} /> No records match your filters.</td></tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn-icon" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}><ChevronLeft size={16} /></button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn-icon" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {selected && <ResidentModal resident={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
