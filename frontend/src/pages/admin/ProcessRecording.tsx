import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Eye, Trash2, X, Check, AlertCircle, FileText } from 'lucide-react';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import { getApiBaseUrl } from '../../services/authApi';

const API_BASE = getApiBaseUrl();

const EMOTIONAL_STATES = ['Anxious', 'Angry', 'Withdrawn', 'Sad', 'Stable', 'Engaged', 'Hopeful', 'Distressed', 'Calm', 'Mixed'];
const INTERVENTIONS = ['Trauma-Informed Care', 'Cognitive Behavioral Therapy', 'Narrative Therapy', 'Art Therapy', 'Play Therapy', 'Solution-Focused Therapy', 'Strengths-Based Approach', 'Psychoeducation', 'Relaxation Techniques', 'Family Systems Therapy'];
const PAGE_SIZE = 50;

interface ProcessRecording {
  recordingId: number;
  residentId: number;
  sessionDate: string;
  socialWorker: string;
  sessionType: string;
  sessionDurationMinutes: number;
  emotionalStateObserved: string;
  emotionalStateEnd: string;
  sessionNarrative: string;
  interventionsApplied: string;
  followUpActions: string;
  progressNoted: boolean | number;
  concernsFlagged: boolean | number;
  referralMade: boolean | number;
  interventionsList: string;
}

interface Resident {
  residentId: number;
  caseControlNo: string;
}

function asBool(value: boolean | number | null | undefined): boolean {
  return typeof value === 'boolean' ? value : (value ?? 0) !== 0;
}

function RecordingModal({ rec, onClose }: { rec: ProcessRecording; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Process Recording</h2>
            <p className="modal-subtitle">Resident #{rec.residentId} · {new Date(rec.sessionDate).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-item"><span>Social Worker</span><strong>{rec.socialWorker || '—'}</strong></div>
            <div className="detail-item"><span>Session Type</span><span className={`type-badge type-${rec.sessionType === 'Individual' ? 'blue' : 'purple'}`}>{rec.sessionType}</span></div>
            <div className="detail-item"><span>Emotional State (Start)</span><strong>{rec.emotionalStateObserved || '—'}</strong></div>
            <div className="detail-item"><span>Emotional State (End)</span><strong>{rec.emotionalStateEnd || '—'}</strong></div>
            <div className="detail-item"><span>Duration</span><strong>{rec.sessionDurationMinutes ? `${rec.sessionDurationMinutes} min` : '—'}</strong></div>
            <div className="detail-item"><span>Progress Noted</span><strong>{asBool(rec.progressNoted) ? 'Yes' : 'No'}</strong></div>
            <div className="detail-item"><span>Concerns Flagged</span><strong>{asBool(rec.concernsFlagged) ? 'Yes' : 'No'}</strong></div>
            <div className="detail-item"><span>Referral Made</span><strong>{asBool(rec.referralMade) ? 'Yes' : 'No'}</strong></div>
          </div>
          {rec.sessionNarrative && (
            <div className="narrative-section">
              <h3>Narrative Summary</h3>
              <p>{rec.sessionNarrative}</p>
            </div>
          )}
          {rec.interventionsList && (
            <div className="narrative-section">
              <h3>Interventions Applied</h3>
              <div className="tag-list">
                {rec.interventionsList.split(',').map((i) => <span key={i} className="tag">{i.trim()}</span>)}
              </div>
            </div>
          )}
          {rec.followUpActions && (
            <div className="narrative-section">
              <h3>Follow-Up Actions</h3>
              <p>{rec.followUpActions}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProcessRecordingPage() {
  const [recordings, setRecordings] = useState<ProcessRecording[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [filterResident, setFilterResident] = useState('All');
  const [selected, setSelected] = useState<ProcessRecording | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProcessRecording | null>(null);
  const [newRec, setNewRec] = useState({
    residentId: '',
    socialWorker: '',
    sessionDate: new Date().toISOString().split('T')[0],
    sessionType: 'Individual',
    emotionalStateObserved: '',
    sessionNarrative: '',
    interventionsApplied: [] as string[],
    followUpActions: '',
  });

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({ page: '1', pageSize: String(PAGE_SIZE) });
      if (filterResident !== 'All') params.set('residentId', filterResident);

      const res = await fetch(`${API_BASE}/api/processrecordings?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRecordings(data.items ?? []);
        setTotal(data.total ?? 0);
      } else {
        const text = await res.text();
        setLoadError(text || `Failed to load process recordings (${res.status})`);
      }
    } catch (err) {
      console.error('Failed to fetch recordings', err);
      setLoadError('Failed to fetch process recordings. Check API connectivity and your login session.');
    } finally {
      setLoading(false);
    }
  }, [filterResident]);

  useEffect(() => { fetchRecordings(); }, [fetchRecordings]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`${API_BASE}/api/processrecordings/${deleteTarget.recordingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmed: true }),
      });
      setDeleteTarget(null);
      fetchRecordings();
    } catch (err) {
      console.error('Failed to delete recording', err);
    }
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/residents?pageSize=100`, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        setResidents(data.items ?? []);
      })
      .catch(() => {});
  }, []);

  const filtered = recordings.filter((r) => {
    const q = search.toLowerCase();
    return (r.socialWorker?.toLowerCase().includes(q) || String(r.residentId).includes(q));
  });

  const sortedFiltered = [...filtered].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));

  const toggleIntervention = (i: string) => {
    const cur = newRec.interventionsApplied;
    setNewRec({ ...newRec, interventionsApplied: cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i] });
  };

  const handleAdd = async () => {
    if (!newRec.emotionalStateObserved || !newRec.sessionNarrative.trim() || !newRec.followUpActions.trim()) {
      setFormError('Emotional state, narrative, and follow-up actions are required.');
      return;
    }
    if (!newRec.residentId) {
      setFormError('Please select a resident.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch(`${API_BASE}/api/processrecordings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          residentId: Number(newRec.residentId),
          socialWorker: newRec.socialWorker,
          sessionDate: newRec.sessionDate,
          sessionType: newRec.sessionType,
          emotionalStateObserved: newRec.emotionalStateObserved,
          sessionNarrative: newRec.sessionNarrative,
          interventionsApplied: newRec.interventionsApplied.join(', '),
          interventionsList: newRec.interventionsApplied.join(', '),
          followUpActions: newRec.followUpActions,
        }),
      });
      if (res.ok) {
        setShowAddForm(false);
        setNewRec({ residentId: '', socialWorker: '', sessionDate: new Date().toISOString().split('T')[0], sessionType: 'Individual', emotionalStateObserved: '', sessionNarrative: '', interventionsApplied: [], followUpActions: '' });
        fetchRecordings();
      } else {
        setFormError('Failed to save recording.');
      }
    } catch {
      setFormError('Failed to save recording.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Process Recording</h1>
          <p>Document and review counseling session notes for each resident.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          <Plus size={16} /> New Session Record
        </button>
      </div>

      <div className="metrics-grid metrics-grid-3">
        <div className="metric-card metric-card-blue">
          <div className="metric-value">{total}</div>
          <div className="metric-label">Total Sessions Recorded</div>
        </div>
        <div className="metric-card metric-card-green">
          <div className="metric-value">{new Set(recordings.map((r) => r.residentId)).size}</div>
          <div className="metric-label">Residents with Records</div>
        </div>
        <div className="metric-card metric-card-purple">
          <div className="metric-value">{recordings.filter((r) => r.sessionType === 'Group').length}</div>
          <div className="metric-label">Group Sessions</div>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="inline-form-card">
          <div className="inline-form-header">
            <h3><FileText size={16} /> New Process Recording</h3>
            <button className="btn-icon" onClick={() => setShowAddForm(false)}><X size={16} /></button>
          </div>
          {formError && <div className="alert alert-error"><AlertCircle size={14} /> {formError}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Resident *</label>
              <select className="form-select" value={newRec.residentId} onChange={(e) => setNewRec({ ...newRec, residentId: e.target.value })}>
                <option value="">Select resident</option>
                {residents.map((r) => <option key={r.residentId} value={r.residentId}>{r.caseControlNo}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Social Worker</label>
              <input className="form-input" value={newRec.socialWorker} onChange={(e) => setNewRec({ ...newRec, socialWorker: e.target.value })} placeholder="Social worker name" />
            </div>
            <div className="form-group">
              <label className="form-label">Session Date *</label>
              <input className="form-input" type="date" value={newRec.sessionDate} onChange={(e) => setNewRec({ ...newRec, sessionDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Session Type</label>
              <select className="form-select" value={newRec.sessionType} onChange={(e) => setNewRec({ ...newRec, sessionType: e.target.value })}>
                <option>Individual</option><option>Group</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Emotional State Observed *</label>
              <select className="form-select" value={newRec.emotionalStateObserved} onChange={(e) => setNewRec({ ...newRec, emotionalStateObserved: e.target.value })}>
                <option value="">Select…</option>
                {EMOTIONAL_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Narrative Summary *</label>
            <textarea className="form-textarea" rows={4} value={newRec.sessionNarrative} onChange={(e) => setNewRec({ ...newRec, sessionNarrative: e.target.value })} placeholder="Describe the session…" />
          </div>
          <div className="form-group">
            <label className="form-label">Interventions Applied</label>
            <div className="checkbox-grid">
              {INTERVENTIONS.map((i) => (
                <label key={i} className="checkbox-label">
                  <input type="checkbox" checked={newRec.interventionsApplied.includes(i)} onChange={() => toggleIntervention(i)} />
                  {i}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Follow-Up Actions *</label>
            <textarea className="form-textarea" rows={3} value={newRec.followUpActions} onChange={(e) => setNewRec({ ...newRec, followUpActions: e.target.value })} placeholder="Actions to be taken before next session…" />
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}><Check size={14} /> {saving ? 'Saving...' : 'Save Recording'}</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={16} className="search-icon" />
          <input className="search-input" placeholder="Search by social worker…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select" value={filterResident} onChange={(e) => setFilterResident(e.target.value)}>
          <option value="All">All Residents</option>
          {residents.map((r) => <option key={r.residentId} value={r.residentId}>{r.caseControlNo}</option>)}
        </select>
        <span className="results-count">{filtered.length} session{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading recordings...</div>
      ) : (
        <div className="table-card">
          {loadError && (
            <div className="alert alert-error" style={{ margin: '1rem' }}>
              <AlertCircle size={14} /> {loadError}
            </div>
          )}
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Resident</th>
                <th>Session Type</th>
                <th>Social Worker</th>
                <th>Emotional State</th>
                <th>Follow-Up</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedFiltered.map((r) => {
                const caseNo = residents.find((res) => res.residentId === r.residentId)?.caseControlNo ?? `#${r.residentId}`;
                const hasFollowUp = !!r.followUpActions?.trim();
                return (
                  <tr key={r.recordingId}>
                    <td className="table-secondary">
                      {new Date(r.sessionDate).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="table-name">{caseNo}</div>
                    </td>
                    <td>
                      <span className={`type-badge type-${r.sessionType === 'Individual' ? 'blue' : 'purple'}`}>
                        {r.sessionType}
                      </span>
                    </td>
                    <td className="table-secondary">{r.socialWorker || '—'}</td>
                    <td className="table-secondary">{r.emotionalStateObserved || '—'}</td>
                    <td className="table-secondary">
                      {hasFollowUp ? <span className="safety-flag">⚠ Needed</span> : <span className="safety-none">None</span>}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-icon" onClick={() => setSelected(r)}><Eye size={15} /></button>
                        <button className="btn-icon btn-icon-danger" title="Delete" onClick={() => setDeleteTarget(r)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedFiltered.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-row"><AlertCircle size={16} /> No process recordings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && <RecordingModal rec={selected} onClose={() => setSelected(null)} />}
      <ConfirmDeleteModal
        isOpen={deleteTarget !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        itemName={deleteTarget ? `recording on ${new Date(deleteTarget.sessionDate).toLocaleDateString()}` : ''}
      />
    </div>
  );
}
