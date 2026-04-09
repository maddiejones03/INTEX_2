import { useState, useEffect, useCallback, useMemo } from 'react';
import { CalendarDays, AlertCircle, Check, Plus, Trash2, X, Edit2 } from 'lucide-react';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import { getApiBaseUrl } from '../../services/authApi';

const API_BASE = getApiBaseUrl();
const PAGE_SIZE = 200;
const CONFERENCE_TYPES = ['Initial Assessment', 'Routine Follow-Up', 'Reintegration Review', 'Emergency', 'Case Closure'];
const CONFERENCE_STATUS = ['Scheduled', 'Completed', 'Cancelled'];

interface Resident {
  residentId: number;
  caseControlNo: string;
  assignedSocialWorker?: string | null;
}

interface CaseConference {
  conferenceId: number;
  residentId: number;
  conferenceDate: string;
  conferenceType: string;
  facilitator: string | null;
  agenda: string | null;
  discussionNotes: string | null;
  actionItems: string | null;
  status: string;
}

type Draft = {
  residentId: string;
  conferenceDate: string;
  conferenceType: string;
  agenda: string;
  discussionNotes: string;
  actionItems: string;
  status: string;
};

const emptyDraft = (): Draft => ({
  residentId: '',
  conferenceDate: new Date().toISOString().split('T')[0],
  conferenceType: 'Routine Follow-Up',
  agenda: '',
  discussionNotes: '',
  actionItems: '',
  status: 'Scheduled',
});

function facilitatorFieldsFromName(
  name: string | null | undefined,
  facilitatorNames: string[]
): { select: string; other: string } {
  const f = (name ?? '').trim();
  if (!f) return { select: '', other: '' };
  if (facilitatorNames.includes(f)) return { select: f, other: '' };
  return { select: '__OTHER__', other: f };
}

function buildFacilitatorPayload(select: string, other: string): string {
  return select === '__OTHER__' ? other.trim() : select.trim();
}

export default function CaseConferences() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [conferences, setConferences] = useState<CaseConference[]>([]);
  const [totalFromApi, setTotalFromApi] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [editFormError, setEditFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CaseConference | null>(null);
  const [newConference, setNewConference] = useState<Draft>(() => emptyDraft());
  const [facilitatorSelect, setFacilitatorSelect] = useState('');
  const [facilitatorOther, setFacilitatorOther] = useState('');
  const [editingConference, setEditingConference] = useState<CaseConference | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(() => emptyDraft());
  const [editFacilitatorSelect, setEditFacilitatorSelect] = useState('');
  const [editFacilitatorOther, setEditFacilitatorOther] = useState('');

  const facilitatorNames = useMemo(() => {
    const set = new Set<string>();
    for (const r of residents) {
      const w = r.assignedSocialWorker?.trim();
      if (w) set.add(w);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [residents]);

  useEffect(() => {
    if (!newConference.residentId) {
      setFacilitatorSelect('');
      setFacilitatorOther('');
      return;
    }
    const res = residents.find((r) => String(r.residentId) === newConference.residentId);
    const sw = res?.assignedSocialWorker?.trim();
    if (!sw) {
      setFacilitatorSelect('');
      setFacilitatorOther('');
      return;
    }
    if (facilitatorNames.includes(sw)) {
      setFacilitatorSelect(sw);
      setFacilitatorOther('');
    } else {
      setFacilitatorSelect('__OTHER__');
      setFacilitatorOther(sw);
    }
  }, [newConference.residentId, residents, facilitatorNames]);

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

  const openEdit = (c: CaseConference) => {
    setEditFormError('');
    setEditingConference(c);
    const dateStr = c.conferenceDate?.includes('T') ? c.conferenceDate.slice(0, 10) : (c.conferenceDate ?? '').slice(0, 10);
    setEditDraft({
      residentId: String(c.residentId),
      conferenceDate: dateStr || new Date().toISOString().split('T')[0],
      conferenceType: c.conferenceType,
      agenda: c.agenda ?? '',
      discussionNotes: c.discussionNotes ?? '',
      actionItems: c.actionItems ?? '',
      status: c.status,
    });
    const { select, other } = facilitatorFieldsFromName(c.facilitator, facilitatorNames);
    setEditFacilitatorSelect(select);
    setEditFacilitatorOther(other);
  };

  const closeEdit = () => {
    setEditingConference(null);
    setEditFormError('');
    setEditDraft(emptyDraft());
    setEditFacilitatorSelect('');
    setEditFacilitatorOther('');
  };

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
    const facilitatorValue = buildFacilitatorPayload(facilitatorSelect, facilitatorOther);
    try {
      const res = await fetch(`${API_BASE}/api/caseconferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          residentId: Number(newConference.residentId),
          conferenceDate: newConference.conferenceDate,
          conferenceType: newConference.conferenceType,
          facilitator: facilitatorValue,
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
      setNewConference(emptyDraft());
      setFacilitatorSelect('');
      setFacilitatorOther('');
      fetchConferences();
    } catch {
      setFormError('Failed to save case conference.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingConference) return;
    if (!editDraft.residentId) {
      setEditFormError('Please select a resident.');
      return;
    }
    if (!editDraft.agenda.trim()) {
      setEditFormError('Agenda is required.');
      return;
    }
    setSavingEdit(true);
    setEditFormError('');
    const facilitatorValue = buildFacilitatorPayload(editFacilitatorSelect, editFacilitatorOther);
    try {
      const res = await fetch(`${API_BASE}/api/caseconferences/${editingConference.conferenceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          conferenceId: editingConference.conferenceId,
          residentId: Number(editDraft.residentId),
          conferenceDate: editDraft.conferenceDate,
          conferenceType: editDraft.conferenceType,
          facilitator: facilitatorValue,
          agenda: editDraft.agenda,
          discussionNotes: editDraft.discussionNotes,
          actionItems: editDraft.actionItems,
          status: editDraft.status,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        setEditFormError(text || 'Failed to update case conference.');
        return;
      }
      closeEdit();
      fetchConferences();
    } catch {
      setEditFormError('Failed to update case conference.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`${API_BASE}/api/caseconferences/${deleteTarget.conferenceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmed: true }),
      });
      if (!res.ok) {
        console.error('Delete failed', await res.text());
      }
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

  const renderFacilitatorBlock = (
    select: string,
    setSelect: (v: string) => void,
    other: string,
    setOther: (v: string) => void,
    idPrefix: string
  ) => (
    <div className="form-row">
      <div className="form-group" style={{ flex: '1 1 280px' }}>
        <label className="form-label" htmlFor={`${idPrefix}-facilitator`}>
          Facilitator (who leads the meeting)
        </label>
        <select
          id={`${idPrefix}-facilitator`}
          className="form-select"
          value={select}
          onChange={(e) => {
            setSelect(e.target.value);
            if (e.target.value !== '__OTHER__') setOther('');
          }}
        >
          <option value="">— Optional —</option>
          {facilitatorNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value="__OTHER__">Other (type name)…</option>
        </select>
        <p className="table-secondary" style={{ fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: 0 }}>
          List is built from <strong>Assigned social worker</strong> values on resident records.
        </p>
      </div>
      {select === '__OTHER__' && (
        <div className="form-group" style={{ flex: '1 1 220px' }}>
          <label className="form-label" htmlFor={`${idPrefix}-facilitator-other`}>
            Facilitator name
          </label>
          <input
            id={`${idPrefix}-facilitator-other`}
            className="form-input"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="e.g. supervisor or partner agency"
          />
        </div>
      )}
    </div>
  );

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
          <details className="case-conf-help" style={{ marginTop: '0.75rem', maxWidth: '52rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>What is a case conference?</summary>
            <div className="section-body" style={{ marginTop: '0.5rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
              <p style={{ margin: '0 0 0.5rem' }}>
                A <strong>case conference</strong> is a structured team meeting to review a resident&apos;s progress,
                safety, case plan, and next steps—similar to practice used in Philippine social-welfare case management.
              </p>
              <p style={{ margin: '0 0 0.5rem' }}>
                <strong>Facilitator</strong> is whoever <strong>leads the meeting</strong>. That is often the{' '}
                <strong>assigned social worker</strong>, but it can also be a supervisor or another specialist. Use the
                dropdown to pick from names already recorded on residents, or <em>Other</em> to type someone else.
              </p>
              <p style={{ margin: 0 }}>
                <strong>Action items</strong> are follow-up tasks everyone agrees on at the meeting (e.g. referrals,
                home visits, updates to the care plan)—not the same as the agenda.
              </p>
            </div>
          </details>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowAddForm(true)}>
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
            <h3>
              <CalendarDays size={16} /> New Case Conference
            </h3>
            <button type="button" className="btn-icon" onClick={() => setShowAddForm(false)}>
              <X size={16} />
            </button>
          </div>
          {formError && (
            <div className="alert alert-error">
              <AlertCircle size={14} /> {formError}
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Resident *</label>
              <select
                className="form-select"
                value={newConference.residentId}
                onChange={(e) => setNewConference({ ...newConference, residentId: e.target.value })}
              >
                <option value="">Select resident</option>
                {residents.map((r) => (
                  <option key={r.residentId} value={r.residentId}>
                    {r.caseControlNo}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                className="form-input"
                type="date"
                value={newConference.conferenceDate}
                onChange={(e) => setNewConference({ ...newConference, conferenceDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select
                className="form-select"
                value={newConference.conferenceType}
                onChange={(e) => setNewConference({ ...newConference, conferenceType: e.target.value })}
              >
                {CONFERENCE_TYPES.map((t) => (
                  <option key={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={newConference.status}
                onChange={(e) => setNewConference({ ...newConference, status: e.target.value })}
              >
                {CONFERENCE_STATUS.map((s) => (
                  <option key={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {renderFacilitatorBlock(facilitatorSelect, setFacilitatorSelect, facilitatorOther, setFacilitatorOther, 'new')}
          <div className="form-group">
            <label className="form-label">Agenda *</label>
            <p className="table-secondary" style={{ fontSize: '0.85rem', marginTop: 0, marginBottom: '0.35rem' }}>
              What will be discussed in this meeting (topics, reports to review).
            </p>
            <textarea
              className="form-textarea"
              rows={2}
              value={newConference.agenda}
              onChange={(e) => setNewConference({ ...newConference, agenda: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Discussion notes</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={newConference.discussionNotes}
              onChange={(e) => setNewConference({ ...newConference, discussionNotes: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Action items</label>
            <p className="table-secondary" style={{ fontSize: '0.85rem', marginTop: 0, marginBottom: '0.35rem' }}>
              Concrete follow-ups agreed at the conference (who does what, by when).
            </p>
            <textarea
              className="form-textarea"
              rows={2}
              value={newConference.actionItems}
              onChange={(e) => setNewConference({ ...newConference, actionItems: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleAdd} disabled={saving}>
              <Check size={14} /> {saving ? 'Saving...' : 'Save Conference'}
            </button>
          </div>
        </div>
      )}

      {editingConference && (
        <div className="modal-overlay" role="presentation" onClick={closeEdit}>
          <div className="modal confirm-delete-modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="inline-form-header" style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>
                <Edit2 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Edit case conference
              </h3>
              <button type="button" className="btn-icon" onClick={closeEdit} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            {editFormError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={14} /> {editFormError}
              </div>
            )}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Resident *</label>
                <select
                  className="form-select"
                  value={editDraft.residentId}
                  onChange={(e) => setEditDraft({ ...editDraft, residentId: e.target.value })}
                >
                  <option value="">Select resident</option>
                  {residents.map((r) => (
                    <option key={r.residentId} value={r.residentId}>
                      {r.caseControlNo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  className="form-input"
                  type="date"
                  value={editDraft.conferenceDate}
                  onChange={(e) => setEditDraft({ ...editDraft, conferenceDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Type *</label>
                <select
                  className="form-select"
                  value={editDraft.conferenceType}
                  onChange={(e) => setEditDraft({ ...editDraft, conferenceType: e.target.value })}
                >
                  {CONFERENCE_TYPES.map((t) => (
                    <option key={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={editDraft.status}
                  onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value })}
                >
                  {CONFERENCE_STATUS.map((s) => (
                    <option key={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {renderFacilitatorBlock(
              editFacilitatorSelect,
              setEditFacilitatorSelect,
              editFacilitatorOther,
              setEditFacilitatorOther,
              'edit'
            )}
            <div className="form-group">
              <label className="form-label">Agenda *</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={editDraft.agenda}
                onChange={(e) => setEditDraft({ ...editDraft, agenda: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Discussion notes</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={editDraft.discussionNotes}
                onChange={(e) => setEditDraft({ ...editDraft, discussionNotes: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Action items</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={editDraft.actionItems}
                onChange={(e) => setEditDraft({ ...editDraft, actionItems: e.target.value })}
              />
            </div>
            <div className="confirm-delete-actions" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-ghost" onClick={closeEdit}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleUpdate} disabled={savingEdit}>
                <Check size={14} /> {savingEdit ? 'Saving...' : 'Save changes'}
              </button>
            </div>
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
                    <td>{residents.find((r) => r.residentId === c.residentId)?.caseControlNo ?? `#${c.residentId}`}</td>
                    <td>
                      <span className="category-chip">{c.conferenceType}</span>
                    </td>
                    <td>
                      <span className={`status-badge status-${c.status.toLowerCase()}`}>{c.status}</span>
                    </td>
                    <td className="table-secondary">{c.facilitator || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Edit"
                        aria-label="Edit conference"
                        onClick={() => openEdit(c)}
                      >
                        <Edit2 size={15} />
                      </button>
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
                  <tr>
                    <td colSpan={6} className="empty-row">
                      <AlertCircle size={16} /> No upcoming conferences.
                    </td>
                  </tr>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((c) => (
                  <tr key={`history-${c.conferenceId}`}>
                    <td className="table-secondary">{new Date(c.conferenceDate).toLocaleDateString()}</td>
                    <td>{residents.find((r) => r.residentId === c.residentId)?.caseControlNo ?? `#${c.residentId}`}</td>
                    <td>
                      <span className="category-chip">{c.conferenceType}</span>
                    </td>
                    <td>
                      <span className={`status-badge status-${c.status.toLowerCase()}`}>{c.status}</span>
                    </td>
                    <td className="table-secondary">{c.agenda || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Edit"
                        aria-label="Edit conference"
                        onClick={() => openEdit(c)}
                      >
                        <Edit2 size={15} />
                      </button>
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
                {history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      <AlertCircle size={16} /> No conference history yet.
                    </td>
                  </tr>
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
