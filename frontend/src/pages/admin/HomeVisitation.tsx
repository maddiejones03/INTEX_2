import { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, X, Check, AlertCircle, Home, Search } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5030';

const VISIT_TYPES = ['Initial Assessment', 'Routine Follow-Up', 'Reintegration Assessment', 'Post-Placement Monitoring', 'Emergency'];
const COOPERATION_LEVELS = ['High', 'Moderate', 'Low', 'Uncooperative'];
const PAGE_SIZE = 50;

interface HomeVisit {
  visitationId: number;
  residentId: number;
  visitDate: string;
  socialWorker: string;
  visitType: string;
  locationVisited: string;
  familyMembersPresent: string;
  purpose: string;
  observations: string;
  familyCooperationLevel: string;
  safetyConcerosNoted: boolean;
  followUpNeeded: boolean;
  followUpNotes: string;
  visitOutcome: string;
  cooperationNumeric: number;
  outcomeNumeric: number;
}

interface Resident {
  residentId: number;
  caseControlNo: string;
}

function VisitModal({ visit, onClose }: { visit: HomeVisit; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Home Visit Record</h2>
            <p className="modal-subtitle">Resident #{visit.residentId} · {new Date(visit.visitDate).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-item"><span>Visit Type</span><span className="category-chip">{visit.visitType}</span></div>
            <div className="detail-item"><span>Social Worker</span><strong>{visit.socialWorker || '—'}</strong></div>
            <div className="detail-item"><span>Location</span><strong>{visit.locationVisited || '—'}</strong></div>
            <div className="detail-item"><span>Family Members Present</span><strong>{visit.familyMembersPresent || '—'}</strong></div>
            <div className="detail-item"><span>Family Cooperation</span><span className={`cooperation-badge coop-${visit.familyCooperationLevel?.toLowerCase()}`}>{visit.familyCooperationLevel}</span></div>
            <div className="detail-item"><span>Safety Concerns</span><strong>{visit.safetyConcerosNoted ? 'Yes' : 'None'}</strong></div>
            <div className="detail-item"><span>Follow-Up Needed</span><strong>{visit.followUpNeeded ? 'Yes' : 'No'}</strong></div>
            <div className="detail-item"><span>Visit Outcome</span><strong>{visit.visitOutcome || '—'}</strong></div>
          </div>
          {visit.purpose && (
            <div className="narrative-section">
              <h3>Purpose</h3>
              <p>{visit.purpose}</p>
            </div>
          )}
          {visit.observations && (
            <div className="narrative-section">
              <h3>Observations</h3>
              <p>{visit.observations}</p>
            </div>
          )}
          {visit.followUpNotes && (
            <div className="narrative-section">
              <h3>Follow-Up Notes</h3>
              <p>{visit.followUpNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomeVisitation() {
  const [visits, setVisits] = useState<HomeVisit[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [selectedVisit, setSelectedVisit] = useState<HomeVisit | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [newVisit, setNewVisit] = useState({
    residentId: '',
    socialWorker: '',
    visitDate: new Date().toISOString().split('T')[0],
    visitType: 'Routine Follow-Up',
    observations: '',
    familyCooperationLevel: 'Moderate',
    followUpNotes: '',
    purpose: '',
  });

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: String(PAGE_SIZE) });
      if (filterType !== 'All') params.set('visitType', filterType);

      const res = await fetch(`${API_BASE}/api/homevisitations?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setVisits(data.items);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch visits', err);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  useEffect(() => {
    fetch(`${API_BASE}/api/residents?pageSize=100`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setResidents(data.items))
      .catch(() => {});
  }, []);

  const filteredVisits = visits.filter((v) => {
    const q = search.toLowerCase();
    return (v.socialWorker?.toLowerCase().includes(q) || String(v.residentId).includes(q));
  });

  const handleAddVisit = async () => {
    if (!newVisit.observations.trim()) {
      setFormError('Observations are required.');
      return;
    }
    if (!newVisit.residentId) {
      setFormError('Please select a resident.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch(`${API_BASE}/api/homevisitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          residentId: Number(newVisit.residentId),
          socialWorker: newVisit.socialWorker,
          visitDate: newVisit.visitDate,
          visitType: newVisit.visitType,
          observations: newVisit.observations,
          familyCooperationLevel: newVisit.familyCooperationLevel,
          followUpNotes: newVisit.followUpNotes,
          purpose: newVisit.purpose,
          followUpNeeded: !!newVisit.followUpNotes,
        }),
      });
      if (res.ok) {
        setShowAddForm(false);
        setNewVisit({ residentId: '', socialWorker: '', visitDate: new Date().toISOString().split('T')[0], visitType: 'Routine Follow-Up', observations: '', familyCooperationLevel: 'Moderate', followUpNotes: '', purpose: '' });
        fetchVisits();
      } else {
        setFormError('Failed to save visit.');
      }
    } catch {
      setFormError('Failed to save visit.');
    } finally {
      setSaving(false);
    }
  };

  const emergencyCount = visits.filter(v => v.visitType === 'Emergency').length;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Home Visitation</h1>
          <p>Log field visits and track home visitation history.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          <Plus size={16} /> Log Visit
        </button>
      </div>

      <div className="metrics-grid metrics-grid-4">
        <div className="metric-card metric-card-blue">
          <div className="metric-value">{total}</div>
          <div className="metric-label">Total Home Visits</div>
        </div>
        <div className="metric-card metric-card-amber">
          <div className="metric-value">{emergencyCount}</div>
          <div className="metric-label">Emergency Visits</div>
        </div>
        <div className="metric-card metric-card-green">
          <div className="metric-value">{new Set(visits.map(v => v.residentId)).size}</div>
          <div className="metric-label">Residents Visited</div>
        </div>
        <div className="metric-card metric-card-purple">
          <div className="metric-value">{visits.filter(v => v.followUpNeeded).length}</div>
          <div className="metric-label">Follow-Ups Needed</div>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="inline-form-card">
          <div className="inline-form-header">
            <h3><Home size={16} /> Log Home Visit</h3>
            <button className="btn-icon" onClick={() => setShowAddForm(false)}><X size={16} /></button>
          </div>
          {formError && <div className="alert alert-error"><AlertCircle size={14} /> {formError}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Resident *</label>
              <select className="form-select" value={newVisit.residentId} onChange={(e) => setNewVisit({ ...newVisit, residentId: e.target.value })}>
                <option value="">Select resident</option>
                {residents.map((r) => <option key={r.residentId} value={r.residentId}>{r.caseControlNo}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Social Worker</label>
              <input className="form-input" value={newVisit.socialWorker} onChange={(e) => setNewVisit({ ...newVisit, socialWorker: e.target.value })} placeholder="Social worker name" />
            </div>
            <div className="form-group">
              <label className="form-label">Visit Date *</label>
              <input className="form-input" type="date" value={newVisit.visitDate} onChange={(e) => setNewVisit({ ...newVisit, visitDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Visit Type *</label>
              <select className="form-select" value={newVisit.visitType} onChange={(e) => setNewVisit({ ...newVisit, visitType: e.target.value })}>
                {VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Family Cooperation Level</label>
              <select className="form-select" value={newVisit.familyCooperationLevel} onChange={(e) => setNewVisit({ ...newVisit, familyCooperationLevel: e.target.value })}>
                {COOPERATION_LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Purpose</label>
              <input className="form-input" value={newVisit.purpose} onChange={(e) => setNewVisit({ ...newVisit, purpose: e.target.value })} placeholder="Purpose of visit" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Observations *</label>
            <textarea className="form-textarea" rows={3} value={newVisit.observations} onChange={(e) => setNewVisit({ ...newVisit, observations: e.target.value })} placeholder="Describe the home environment…" />
          </div>
          <div className="form-group">
            <label className="form-label">Follow-Up Notes</label>
            <textarea className="form-textarea" rows={2} value={newVisit.followUpNotes} onChange={(e) => setNewVisit({ ...newVisit, followUpNotes: e.target.value })} placeholder="Actions to take after this visit…" />
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddVisit} disabled={saving}><Check size={14} /> {saving ? 'Saving...' : 'Save Visit'}</button>
          </div>
        </div>
      )}

      {/* Search and filter */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={16} className="search-icon" />
          <input className="search-input" placeholder="Search by social worker…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="All">All Visit Types</option>
          {VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <span className="results-count">{filteredVisits.length} visit{filteredVisits.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Visits table */}
      <div className="table-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading visits...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Resident</th>
                <th>Visit Type</th>
                <th>Social Worker</th>
                <th>Family Cooperation</th>
                <th>Follow-Up</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisits.map((v) => (
                <tr key={v.visitationId}>
                  <td className="table-secondary">{new Date(v.visitDate).toLocaleDateString()}</td>
                  <td>
                    <div className="table-name">
                      {residents.find(r => r.residentId === v.residentId)?.caseControlNo ?? `#${v.residentId}`}
                    </div>
                  </td>
                  <td><span className="category-chip">{v.visitType}</span></td>
                  <td className="table-secondary">{v.socialWorker || '—'}</td>
                  <td><span className={`cooperation-badge coop-${v.familyCooperationLevel?.toLowerCase()}`}>{v.familyCooperationLevel}</span></td>
                  <td className="table-secondary">{v.followUpNeeded ? <span className="safety-flag">⚠ Needed</span> : <span className="safety-none">None</span>}</td>
                  <td><button className="btn-icon" onClick={() => setSelectedVisit(v)}><Eye size={15} /></button></td>
                </tr>
              ))}
              {filteredVisits.length === 0 && (
                <tr><td colSpan={7} className="empty-row"><AlertCircle size={16} /> No home visits found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedVisit && <VisitModal visit={selectedVisit} onClose={() => setSelectedVisit(null)} />}
    </div>
  );
}
