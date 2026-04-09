import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, AlertCircle, Check, Plus, Trash2, X } from 'lucide-react';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import { getApiBaseUrl } from '../../services/authApi';

const API_BASE = getApiBaseUrl();
const PAGE_SIZE = 50;
const CONFERENCE_TYPES = ['Initial Assessment', 'Routine Follow-Up', 'Reintegration Review', 'Emergency', 'Case Closure'];
const CONFERENCE_STATUS = ['Scheduled', 'Completed', 'Cancelled'];

interface Resident {
  residentId: number;
  caseControlNo: string;
}

interface CaseConference {
  conferenceId: number;
  residentId: number;
  conferenceDate: string;
  conferenceType: string;
  facilitator: string;
  agenda: string;
  discussionNotes: string;
  actionItems: string;
  status: string;
}

export default function CaseConferences() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [conferences, setConferences] = useState<CaseConference[]>([]);
  const [totalFromApi, setTotalFromApi] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CaseConference | null>(null);
  const [newConference, setNewConference] = useState({
    residentId: '',
    conferenceDate: new Date().toISOString().split('T')[0],
    conferenceType: 'Routine Follow-Up',
    facilitator: '',
    agenda: '',
    discussionNotes: '',
    actionItems: '',
    status: 'Scheduled',
  });

  const fetchConferences = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch(`${API_BASE}/api/caseconferences?page=1&pageSize=${PAGE_SIZE}`, { credentials: 'include' });
      if (!res.ok) {
        const text = await res.text();
        setLoadError(text || `Failed to load case conferences (${res.status})`);
        return;
      }
      const data = await res.json();
      setConferences(Array.isArray(data.items) ? data.items : []);
      setTotalFromApi(typeof data.total === 'number' ? data.total : null);
    } catch (err) {
      console.error('Failed to fetch case conferences', err);
      setLoadError('Failed to fetch case conferences. Check API connectivity and your login session.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConferences();
  }, [fetchConferences]);

  useEffect(() => {
    fetch(`${API_BASE}/api/residents?pageSize=200`, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        setResidents(data.items ?? []);
      })
      .catch(() => {});
  }, []);

  const handleAdd = async () => {
    if (!newConference.residentId) {
      setFormError('Please select a resident.');
      return;
    }
    if (!newConference.agenda.trim()) {
      setFormError('Agenda is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch(`${API_BASE}/api/caseconferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          residentId: Number(newConference.residentId),
          conferenceDate: newConference.conferenceDate,
          conferenceType: newConference.conferenceType,
          facilitator: newConference.facilitator,
          agenda: newConference.agenda,
          discussionNotes: newConference.discussionNotes,
          actionItems: newConference.actionItems,
          status: newConference.status,
        }),
      });
      if (!res.ok) {
        setFormError('Failed to save case conference.');
        return;
      }
      setShowAddForm(false);
      setNewConference({
        residentId: '',
        conferenceDate: new Date().toISOString().split('T')[0],
        conferenceType: 'Routine Follow-Up',
        facilitator: '',
        agenda: '',
        discussionNotes: '',
        actionItems: '',
        status: 'Scheduled',
      });
      fetchConferences();
    } catch {
      setFormError('Failed to save case conference.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`${API_BASE}/api/caseconferences/${deleteTarget.conferenceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmed: true }),
      });
      setDeleteTarget(null);
      fetchConferences();
    } catch (err) {
      console.error('Failed to delete conference', err);
    }
  };

  const todayIso = new Date().toISOString().split('T')[0];
  const upcoming = conferences
    .filter((c) => c.conferenceDate >= todayIso && c.status !== 'Cancelled')
    .sort((a, b) => a.conferenceDate.localeCompare(b.conferenceDate));
  const history = conferences
    .filter((c) => c.conferenceDate < todayIso || c.status !== 'Scheduled')
    .sort((a, b) => b.conferenceDate.localeCompare(a.conferenceDate));

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Case Conferences</h1>
          <p>
            Schedule, track, and review case conference history by resident.
            {totalFromApi !== null && !loading && (
              <span className="table-secondary" style={{ marginLeft: '0.5rem' }}>
                ({totalFromApi} {totalFromApi === 1 ? 'record' : 'records'} from database)
              </span>
            )}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          <Plus size={16} /> Schedule Conference
        </button>
      </div>

      <div className="metrics-grid metrics-grid-3">
        <div className="metric-card metric-card-blue">
          <div className="metric-value">{upcoming.length}</div>
          <div className="metric-label">Upcoming</div>
        </div>
        <div className="metric-card metric-card-green">
          <div className="metric-value">{history.filter((c) => c.status === 'Completed').length}</div>
          <div className="metric-label">Completed</div>
        </div>
        <div className="metric-card metric-card-amber">
          <div className="metric-value">{history.length}</div>
          <div className="metric-label">History Records</div>
        </div>
      </div>

      {showAddForm && (
        <div className="inline-form-card">
          <div className="inline-form-header">
            <h3><CalendarDays size={16} /> New Case Conference</h3>
            <button className="btn-icon" onClick={() => setShowAddForm(false)}><X size={16} /></button>
          </div>
          {formError && <div className="alert alert-error"><AlertCircle size={14} /> {formError}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Resident *</label>
              <select className="form-select" value={newConference.residentId} onChange={(e) => setNewConference({ ...newConference, residentId: e.target.value })}>
                <option value="">Select resident</option>
                {residents.map((r) => <option key={r.residentId} value={r.residentId}>{r.caseControlNo}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input className="form-input" type="date" value={newConference.conferenceDate} onChange={(e) => setNewConference({ ...newConference, conferenceDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select className="form-select" value={newConference.conferenceType} onChange={(e) => setNewConference({ ...newConference, conferenceType: e.target.value })}>
                {CONFERENCE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={newConference.status} onChange={(e) => setNewConference({ ...newConference, status: e.target.value })}>
                {CONFERENCE_STATUS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Facilitator</label>
              <input className="form-input" value={newConference.facilitator} onChange={(e) => setNewConference({ ...newConference, facilitator: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Agenda *</label>
            <textarea className="form-textarea" rows={2} value={newConference.agenda} onChange={(e) => setNewConference({ ...newConference, agenda: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Discussion Notes</label>
            <textarea className="form-textarea" rows={2} value={newConference.discussionNotes} onChange={(e) => setNewConference({ ...newConference, discussionNotes: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Action Items</label>
            <textarea className="form-textarea" rows={2} value={newConference.actionItems} onChange={(e) => setNewConference({ ...newConference, actionItems: e.target.value })} />
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}><Check size={14} /> {saving ? 'Saving...' : 'Save Conference'}</button>
          </div>
        </div>
      )}

      <div className="table-card">
        {loadError && (
          <div className="alert alert-error" style={{ margin: '1rem' }}>
            <AlertCircle size={14} /> {loadError}
          </div>
        )}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading conferences...</div>
        ) : (
          <>
            <div style={{ padding: '1rem 1rem 0', fontWeight: 600 }}>Upcoming Conferences</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Resident</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Facilitator</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((c) => (
                  <tr key={c.conferenceId}>
                    <td className="table-secondary">{new Date(c.conferenceDate).toLocaleDateString()}</td>
                    <td>{residents.find(r => r.residentId === c.residentId)?.caseControlNo ?? `#${c.residentId}`}</td>
                    <td><span className="category-chip">{c.conferenceType}</span></td>
                    <td><span className={`status-badge status-${c.status.toLowerCase()}`}>{c.status}</span></td>
                    <td className="table-secondary">{c.facilitator || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-icon btn-icon-danger"
                        title="Delete"
                        aria-label="Delete conference"
                        onClick={() => setDeleteTarget(c)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {upcoming.length === 0 && (
                  <tr><td colSpan={6} className="empty-row"><AlertCircle size={16} /> No upcoming conferences.</td></tr>
                )}
              </tbody>
            </table>

            <div style={{ padding: '1rem 1rem 0', fontWeight: 600 }}>Conference History</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Resident</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Agenda</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 25).map((c) => (
                  <tr key={`history-${c.conferenceId}`}>
                    <td className="table-secondary">{new Date(c.conferenceDate).toLocaleDateString()}</td>
                    <td>{residents.find(r => r.residentId === c.residentId)?.caseControlNo ?? `#${c.residentId}`}</td>
                    <td><span className="category-chip">{c.conferenceType}</span></td>
                    <td><span className={`status-badge status-${c.status.toLowerCase()}`}>{c.status}</span></td>
                    <td className="table-secondary">{c.agenda || '—'}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan={5} className="empty-row"><AlertCircle size={16} /> No conference history yet.</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={deleteTarget !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        itemName={deleteTarget ? `conference on ${new Date(deleteTarget.conferenceDate).toLocaleDateString()}` : ''}
      />
    </div>
  );
}
