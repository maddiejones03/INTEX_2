import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Eye,
  Trash2,
  X,
  Check,
  AlertCircle,
  Home,
  Search,
  CalendarClock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import { getApiBaseUrl } from '../../services/authApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const API_BASE = getApiBaseUrl();

const VISIT_TYPES = ['Initial Assessment', 'Routine Follow-Up', 'Reintegration Assessment', 'Post-Placement Monitoring', 'Emergency'];
const COOPERATION_LEVELS = ['High', 'Moderate', 'Low', 'Uncooperative'];
const PAGE_SIZE = 100;
const TABLE_PREVIEW_ROWS = 10;

interface HomeVisit {
  visitationId: number;
  residentId: number;
  visitDate: string | null;
  socialWorker?: string | null;
  visitType?: string | null;
  locationVisited?: string | null;
  familyMembersPresent?: string | null;
  purpose?: string | null;
  observations?: string | null;
  familyCooperationLevel?: string | null;
  safetyConcernsNoted?: boolean | number | null;
  followUpNeeded?: boolean | number | null;
  followUpNotes?: string | null;
  visitOutcome?: string | null;
  cooperationNumeric?: number | null;
  outcomeNumeric?: number | null;
}

function asBool(value: boolean | number | null | undefined): boolean {
  if (typeof value === 'boolean') return value;
  return (value ?? 0) !== 0;
}

function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function parseVisitDate(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatVisitDate(iso: string | null | undefined): string {
  const d = parseVisitDate(iso);
  return d ? d.toLocaleDateString() : '—';
}

function visitDayMs(iso: string | null | undefined): number | null {
  const d = parseVisitDate(iso);
  if (!d) return null;
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** Scheduled today/future, or open follow-up from a past (or undated) visit. */
function isUpcomingVisit(v: HomeVisit): boolean {
  const day = visitDayMs(v.visitDate);
  const today = startOfTodayMs();
  if (day != null && day >= today) return true;
  if (asBool(v.followUpNeeded)) {
    if (day == null) return true;
    return day < today;
  }
  return false;
}

function coopBadgeClass(level: string | null | undefined): string {
  const slug = (level ?? 'unknown').toLowerCase().replace(/\s+/g, '-');
  return `cooperation-badge coop-${slug}`;
}

interface Resident {
  residentId: number;
  caseControlNo: string;
}

function VisitModal({ visit, onClose }: { visit: HomeVisit; onClose: () => void }) {
  const visitD = parseVisitDate(visit.visitDate);
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal modal-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-visit-modal-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="home-visit-modal-title">Home Visit Record</h2>
            <p className="modal-subtitle">
              Resident #{visit.residentId} ·{' '}
              {visitD
                ? visitD.toLocaleDateString('en-PH', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'No date'}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog"><X size={18} aria-hidden /></button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-item"><span>Visit Type</span><span className="category-chip">{visit.visitType ?? '—'}</span></div>
            <div className="detail-item"><span>Social Worker</span><strong>{visit.socialWorker || '—'}</strong></div>
            <div className="detail-item"><span>Location</span><strong>{visit.locationVisited || '—'}</strong></div>
            <div className="detail-item"><span>Family Members Present</span><strong>{visit.familyMembersPresent || '—'}</strong></div>
            <div className="detail-item">
              <span>Family Cooperation</span>
              <span className={coopBadgeClass(visit.familyCooperationLevel)}>{visit.familyCooperationLevel ?? '—'}</span>
            </div>
            <div className="detail-item"><span>Safety Concerns</span><strong>{asBool(visit.safetyConcernsNoted) ? 'Yes' : 'None'}</strong></div>
            <div className="detail-item"><span>Follow-Up Needed</span><strong>{asBool(visit.followUpNeeded) ? 'Yes' : 'No'}</strong></div>
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
  useDocumentTitle('Home Visitation');
  const [visits, setVisits] = useState<HomeVisit[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [selectedVisit, setSelectedVisit] = useState<HomeVisit | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HomeVisit | null>(null);
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
  const [upcomingLimit, setUpcomingLimit] = useState(TABLE_PREVIEW_ROWS);
  const [pastLimit, setPastLimit] = useState(TABLE_PREVIEW_ROWS);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({ page: '1', pageSize: String(PAGE_SIZE) });
      const res = await fetch(`${API_BASE}/api/homevisitations?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setVisits(data.items ?? []);
        setTotal(data.total ?? 0);
      } else {
        const text = await res.text();
        setLoadError(text || `Failed to load home visitations (${res.status})`);
      }
    } catch (err) {
      console.error('Failed to fetch visits', err);
      setLoadError('Failed to fetch home visitations. Check API connectivity and your login session.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`${API_BASE}/api/homevisitations/${deleteTarget.visitationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmed: true }),
      });
      setDeleteTarget(null);
      fetchVisits();
    } catch (err) {
      console.error('Failed to delete visit', err);
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

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visits.filter((v) => {
      if (filterType !== 'All' && v.visitType !== filterType) return false;
      if (!q) return true;
      const caseNo = residents.find((r) => r.residentId === v.residentId)?.caseControlNo?.toLowerCase() ?? '';
      return (
        (v.socialWorker?.toLowerCase().includes(q) ?? false) ||
        String(v.residentId).includes(q) ||
        caseNo.includes(q)
      );
    });
  }, [visits, search, filterType, residents]);

  const upcomingVisits = useMemo(() => {
    const list = baseFiltered.filter(isUpcomingVisit);
    const today = startOfTodayMs();
    list.sort((a, b) => {
      const overdue = (x: HomeVisit) => {
        if (!asBool(x.followUpNeeded)) return 1;
        const d = visitDayMs(x.visitDate);
        if (d == null) return 0;
        return d < today ? 0 : 1;
      };
      const o = overdue(a) - overdue(b);
      if (o !== 0) return o;
      const da = visitDayMs(a.visitDate) ?? Number.MAX_SAFE_INTEGER;
      const db = visitDayMs(b.visitDate) ?? Number.MAX_SAFE_INTEGER;
      return da - db;
    });
    return list;
  }, [baseFiltered]);

  const pastVisits = useMemo(() => {
    const list = baseFiltered.filter((v) => !isUpcomingVisit(v));
    list.sort((a, b) => (visitDayMs(b.visitDate) ?? 0) - (visitDayMs(a.visitDate) ?? 0));
    return list;
  }, [baseFiltered]);

  const upcomingVisible = useMemo(
    () => upcomingVisits.slice(0, upcomingLimit),
    [upcomingVisits, upcomingLimit]
  );
  const pastVisible = useMemo(() => pastVisits.slice(0, pastLimit), [pastVisits, pastLimit]);

  useEffect(() => {
    setUpcomingLimit((prev) => {
      if (upcomingVisits.length === 0) return TABLE_PREVIEW_ROWS;
      return Math.min(Math.max(TABLE_PREVIEW_ROWS, prev), upcomingVisits.length);
    });
  }, [upcomingVisits.length]);

  useEffect(() => {
    setPastLimit((prev) => {
      if (pastVisits.length === 0) return TABLE_PREVIEW_ROWS;
      return Math.min(Math.max(TABLE_PREVIEW_ROWS, prev), pastVisits.length);
    });
  }, [pastVisits.length]);

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
          followUpNeeded: newVisit.followUpNotes.trim() ? 1 : 0,
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

  const emergencyCount = visits.filter((v) => v.visitType === 'Emergency').length;

  function upcomingKind(v: HomeVisit): { label: string; className: string } {
    const day = visitDayMs(v.visitDate);
    const today = startOfTodayMs();
    if (day != null && day >= today) return { label: 'Scheduled', className: 'status-badge status-scheduled' };
    if (asBool(v.followUpNeeded)) return { label: 'Follow-up due', className: 'status-badge' };
    return { label: '—', className: 'table-secondary' };
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Home Visitation</h1>
          <p>
            Log field visits and review history. <strong>Upcoming</strong> lists visits scheduled for today or later, plus
            older visits that still have follow-up flagged. <strong>Past visitations</strong> is everything else (completed
            history).
          </p>
          {total > PAGE_SIZE && (
            <p className="table-secondary" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Database has {total} visits; this screen loads the {PAGE_SIZE} most recent rows.
            </p>
          )}
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
          <div className="metric-value">{upcomingVisits.length}</div>
          <div className="metric-label">Due / upcoming (in view)</div>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="inline-form-card">
          <div className="inline-form-header">
            <h3><Home size={16} /> Log Home Visit</h3>
            <button type="button" className="btn-icon" onClick={() => setShowAddForm(false)} aria-label="Close log visit form"><X size={16} aria-hidden /></button>
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

      {/* Search and filter — applies to both tables */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={16} className="search-icon" aria-hidden />
          <input
            className="search-input"
            placeholder="Search worker, case no., resident ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="All">All Visit Types</option>
          {VISIT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="results-count">
          {upcomingVisits.length} upcoming · {pastVisits.length} past
        </span>
      </div>

      {loadError && (
        <div className="alert alert-error" style={{ margin: '0 0 1rem' }}>
          <AlertCircle size={14} /> {loadError}
        </div>
      )}

      {loading ? (
        <div className="table-card" style={{ textAlign: 'center', padding: '2rem' }}>
          Loading visits…
        </div>
      ) : (
        <>
          <div className="table-card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ padding: '1rem 1rem 0', borderBottom: 'none' }}>
              <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarClock size={20} aria-hidden />
                Upcoming visits &amp; follow-ups
              </h2>
              <p className="table-secondary" style={{ fontSize: '0.875rem', margin: '0.35rem 0 0', lineHeight: 1.45 }}>
                Scheduled on or after today, or past visits still flagged for follow-up.
              </p>
              {upcomingVisits.length > 0 && (
                <p className="table-secondary" style={{ fontSize: '0.8125rem', margin: '0.5rem 0 0' }}>
                  Showing {upcomingVisible.length} of {upcomingVisits.length}
                </p>
              )}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Status</th>
                  <th scope="col">Visit date</th>
                  <th scope="col">Resident</th>
                  <th scope="col">Visit type</th>
                  <th scope="col">Social worker</th>
                  <th scope="col">Family cooperation</th>
                  <th scope="col">Follow-up notes</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingVisible.map((v) => {
                  const kind = upcomingKind(v);
                  return (
                    <tr key={v.visitationId}>
                      <td>
                        {kind.label === '—' ? (
                          <span className="table-secondary">—</span>
                        ) : (
                          <span
                            className={kind.className}
                            style={
                              kind.label === 'Follow-up due'
                                ? { background: 'var(--amber-100, #fef3c7)', color: 'var(--gray-900)' }
                                : undefined
                            }
                          >
                            {kind.label}
                          </span>
                        )}
                      </td>
                      <td className="table-secondary">{formatVisitDate(v.visitDate)}</td>
                      <td>
                        <div className="table-name">
                          {residents.find((r) => r.residentId === v.residentId)?.caseControlNo ?? `#${v.residentId}`}
                        </div>
                      </td>
                      <td>
                        <span className="category-chip">{v.visitType ?? '—'}</span>
                      </td>
                      <td className="table-secondary">{v.socialWorker || '—'}</td>
                      <td>
                        <span className={coopBadgeClass(v.familyCooperationLevel)}>{v.familyCooperationLevel ?? '—'}</span>
                      </td>
                      <td className="table-secondary" style={{ maxWidth: 200 }}>
                        {(v.followUpNotes || '—').slice(0, 80)}
                        {(v.followUpNotes?.length ?? 0) > 80 ? '…' : ''}
                      </td>
                      <td>
                        <div className="action-btns">
                          <button type="button" className="btn-icon" title="View" aria-label={`View visit ${formatVisitDate(v.visitDate)}`} onClick={() => setSelectedVisit(v)}>
                            <Eye size={15} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            title="Delete"
                            aria-label={`Delete visit ${formatVisitDate(v.visitDate)}`}
                            onClick={() => setDeleteTarget(v)}
                          >
                            <Trash2 size={15} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {upcomingVisits.length === 0 && (
                  <tr>
                    <td colSpan={8} className="empty-row">
                      <AlertCircle size={16} /> Nothing due in this view. Log a future-dated visit or flag follow-up on a
                      past visit.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {upcomingVisits.length > TABLE_PREVIEW_ROWS && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem 1rem',
                  borderTop: '1px solid var(--gray-200, #e5e7eb)',
                }}
              >
                {upcomingLimit < upcomingVisits.length ? (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      setUpcomingLimit((n) => Math.min(n + TABLE_PREVIEW_ROWS, upcomingVisits.length))
                    }
                  >
                    <ChevronDown size={16} /> Show more (
                    {Math.min(TABLE_PREVIEW_ROWS, upcomingVisits.length - upcomingLimit)} more)
                  </button>
                ) : null}
                {upcomingLimit > TABLE_PREVIEW_ROWS ? (
                  <button type="button" className="btn btn-ghost" onClick={() => setUpcomingLimit(TABLE_PREVIEW_ROWS)}>
                    <ChevronUp size={16} /> Show less
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <div className="table-card">
            <div className="card-header" style={{ padding: '1rem 1rem 0', borderBottom: 'none' }}>
              <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Past visitations</h2>
              <p className="table-secondary" style={{ fontSize: '0.875rem', margin: '0.35rem 0 0', lineHeight: 1.45 }}>
                Historical visits (no open follow-up queue item for these rows in this view).
              </p>
              {pastVisits.length > 0 && (
                <p className="table-secondary" style={{ fontSize: '0.8125rem', margin: '0.5rem 0 0' }}>
                  Showing {pastVisible.length} of {pastVisits.length}
                </p>
              )}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Resident</th>
                  <th scope="col">Visit type</th>
                  <th scope="col">Social worker</th>
                  <th scope="col">Family cooperation</th>
                  <th scope="col">Follow-up</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pastVisible.map((v) => (
                  <tr key={v.visitationId}>
                    <td className="table-secondary">{formatVisitDate(v.visitDate)}</td>
                    <td>
                      <div className="table-name">
                        {residents.find((r) => r.residentId === v.residentId)?.caseControlNo ?? `#${v.residentId}`}
                      </div>
                    </td>
                    <td>
                      <span className="category-chip">{v.visitType ?? '—'}</span>
                    </td>
                    <td className="table-secondary">{v.socialWorker || '—'}</td>
                    <td>
                      <span className={coopBadgeClass(v.familyCooperationLevel)}>{v.familyCooperationLevel ?? '—'}</span>
                    </td>
                    <td className="table-secondary">
                      {asBool(v.followUpNeeded) ? (
                        <span className="safety-flag">Needed</span>
                      ) : (
                        <span className="safety-none">None</span>
                      )}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button type="button" className="btn-icon" title="View" aria-label={`View visit ${formatVisitDate(v.visitDate)}`} onClick={() => setSelectedVisit(v)}>
                          <Eye size={15} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          title="Delete"
                          aria-label={`Delete visit ${formatVisitDate(v.visitDate)}`}
                          onClick={() => setDeleteTarget(v)}
                        >
                          <Trash2 size={15} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pastVisits.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      <AlertCircle size={16} /> No past visits in this view (try clearing search or visit type).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {pastVisits.length > TABLE_PREVIEW_ROWS && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem 1rem',
                  borderTop: '1px solid var(--gray-200, #e5e7eb)',
                }}
              >
                {pastLimit < pastVisits.length ? (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setPastLimit((n) => Math.min(n + TABLE_PREVIEW_ROWS, pastVisits.length))}
                  >
                    <ChevronDown size={16} /> Show more (
                    {Math.min(TABLE_PREVIEW_ROWS, pastVisits.length - pastLimit)} more)
                  </button>
                ) : null}
                {pastLimit > TABLE_PREVIEW_ROWS ? (
                  <button type="button" className="btn btn-ghost" onClick={() => setPastLimit(TABLE_PREVIEW_ROWS)}>
                    <ChevronUp size={16} /> Show less
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </>
      )}

      {selectedVisit && <VisitModal visit={selectedVisit} onClose={() => setSelectedVisit(null)} />}
      <ConfirmDeleteModal
        isOpen={deleteTarget !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        itemName={deleteTarget ? `visit on ${formatVisitDate(deleteTarget.visitDate)}` : ''}
      />
    </div>
  );
}
