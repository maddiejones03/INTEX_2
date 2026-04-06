import { useState } from 'react';
import { Search, Plus, Eye, X, Check, AlertCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { mockProcessRecordings, mockResidents, mockSocialWorkers } from '../../services/mockData';
import type { ProcessRecording } from '../../types';

const EMOTIONAL_STATES = ['Anxious', 'Angry', 'Withdrawn', 'Sad', 'Stable', 'Engaged', 'Hopeful', 'Distressed', 'Calm', 'Mixed'];
const INTERVENTIONS = ['Trauma-Informed Care', 'Cognitive Behavioral Therapy', 'Narrative Therapy', 'Art Therapy', 'Play Therapy', 'Solution-Focused Therapy', 'Strengths-Based Approach', 'Psychoeducation', 'Relaxation Techniques', 'Family Systems Therapy'];

function RecordingModal({ rec, onClose }: { rec: ProcessRecording; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Process Recording</h2>
            <p className="modal-subtitle">{rec.residentName} · {new Date(rec.sessionDate).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-item"><span>Social Worker</span><strong>{rec.socialWorkerName}</strong></div>
            <div className="detail-item"><span>Session Type</span><span className={`type-badge type-${rec.sessionType === 'Individual' ? 'blue' : 'purple'}`}>{rec.sessionType}</span></div>
            <div className="detail-item"><span>Emotional State</span><strong>{rec.emotionalState}</strong></div>
            {rec.nextSessionDate && <div className="detail-item"><span>Next Session</span><strong>{new Date(rec.nextSessionDate).toLocaleDateString('en-PH')}</strong></div>}
          </div>
          <div className="narrative-section">
            <h3>Narrative Summary</h3>
            <p>{rec.narrativeSummary}</p>
          </div>
          <div className="narrative-section">
            <h3>Interventions Applied</h3>
            <div className="tag-list">
              {rec.interventionsApplied.map((i) => <span key={i} className="tag">{i}</span>)}
            </div>
          </div>
          <div className="narrative-section">
            <h3>Follow-Up Actions</h3>
            <p>{rec.followUpActions}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProcessRecordingPage() {
  const [recordings, setRecordings] = useState(mockProcessRecordings);
  const [search, setSearch] = useState('');
  const [filterResident, setFilterResident] = useState<number | 'All'>('All');
  const [selected, setSelected] = useState<ProcessRecording | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedResident, setExpandedResident] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  const [newRec, setNewRec] = useState({
    residentId: mockResidents[0]?.id || 1,
    socialWorkerId: mockSocialWorkers[0]?.id || 1,
    sessionDate: new Date().toISOString().split('T')[0],
    sessionType: 'Individual' as 'Individual' | 'Group',
    emotionalState: '',
    narrativeSummary: '',
    interventionsApplied: [] as string[],
    followUpActions: '',
    nextSessionDate: '',
  });

  const filtered = recordings.filter((r) => {
    const q = search.toLowerCase();
    return (
      (r.residentName.toLowerCase().includes(q) || r.socialWorkerName.toLowerCase().includes(q)) &&
      (filterResident === 'All' || r.residentId === filterResident)
    );
  });

  // Group by resident
  const grouped = filtered.reduce<Record<number, { name: string; records: ProcessRecording[] }>>((acc, r) => {
    if (!acc[r.residentId]) acc[r.residentId] = { name: r.residentName, records: [] };
    acc[r.residentId].records.push(r);
    return acc;
  }, {});

  const toggleIntervention = (i: string) => {
    const cur = newRec.interventionsApplied;
    setNewRec({ ...newRec, interventionsApplied: cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i] });
  };

  const handleAdd = () => {
    if (!newRec.emotionalState || !newRec.narrativeSummary.trim() || !newRec.followUpActions.trim()) {
      setFormError('Emotional state, narrative, and follow-up actions are required.');
      return;
    }
    const resident = mockResidents.find((r) => r.id === newRec.residentId);
    const sw = mockSocialWorkers.find((s) => s.id === newRec.socialWorkerId);
    const id = Math.max(...recordings.map((r) => r.id)) + 1;
    setRecordings([
      {
        id,
        residentId: newRec.residentId,
        residentName: resident ? `${resident.firstName} ${resident.lastName}` : '',
        socialWorkerId: newRec.socialWorkerId,
        socialWorkerName: sw ? `${sw.firstName} ${sw.lastName}` : '',
        sessionDate: newRec.sessionDate,
        sessionType: newRec.sessionType,
        emotionalState: newRec.emotionalState,
        narrativeSummary: newRec.narrativeSummary,
        interventionsApplied: newRec.interventionsApplied,
        followUpActions: newRec.followUpActions,
        nextSessionDate: newRec.nextSessionDate || undefined,
        createdAt: new Date().toISOString(),
      },
      ...recordings,
    ]);
    setFormError('');
    setShowAddForm(false);
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
          <div className="metric-value">{recordings.length}</div>
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
              <select className="form-select" value={newRec.residentId} onChange={(e) => setNewRec({ ...newRec, residentId: +e.target.value })}>
                {mockResidents.map((r) => <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Social Worker *</label>
              <select className="form-select" value={newRec.socialWorkerId} onChange={(e) => setNewRec({ ...newRec, socialWorkerId: +e.target.value })}>
                {mockSocialWorkers.map((sw) => <option key={sw.id} value={sw.id}>{sw.firstName} {sw.lastName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Session Date *</label>
              <input className="form-input" type="date" value={newRec.sessionDate} onChange={(e) => setNewRec({ ...newRec, sessionDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Session Type</label>
              <select className="form-select" value={newRec.sessionType} onChange={(e) => setNewRec({ ...newRec, sessionType: e.target.value as 'Individual' | 'Group' })}>
                <option>Individual</option><option>Group</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Emotional State Observed *</label>
              <select className="form-select" value={newRec.emotionalState} onChange={(e) => setNewRec({ ...newRec, emotionalState: e.target.value })}>
                <option value="">Select…</option>
                {EMOTIONAL_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Next Session Date</label>
              <input className="form-input" type="date" value={newRec.nextSessionDate} onChange={(e) => setNewRec({ ...newRec, nextSessionDate: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Narrative Summary *</label>
            <textarea className="form-textarea" rows={4} value={newRec.narrativeSummary} onChange={(e) => setNewRec({ ...newRec, narrativeSummary: e.target.value })} placeholder="Describe the session…" />
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
            <button className="btn btn-primary" onClick={handleAdd}><Check size={14} /> Save Recording</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={16} className="search-icon" />
          <input className="search-input" placeholder="Search by resident or social worker…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select" value={filterResident} onChange={(e) => setFilterResident(e.target.value === 'All' ? 'All' : +e.target.value)}>
          <option value="All">All Residents</option>
          {mockResidents.map((r) => <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>)}
        </select>
        <span className="results-count">{filtered.length} session{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Grouped by resident */}
      <div className="accordion-list">
        {Object.entries(grouped).map(([rid, group]) => {
          const resId = +rid;
          const isOpen = expandedResident === resId;
          return (
            <div key={rid} className="accordion-item">
              <button className="accordion-header" onClick={() => setExpandedResident(isOpen ? null : resId)}>
                <div className="accordion-title">
                  <FileText size={16} />
                  <span>{group.name}</span>
                  <span className="accordion-count">{group.records.length} session{group.records.length !== 1 ? 's' : ''}</span>
                </div>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {isOpen && (
                <div className="accordion-body">
                  {group.records
                    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
                    .map((r) => (
                      <div key={r.id} className="session-record">
                        <div className="session-record-header">
                          <div>
                            <span className="session-date">{new Date(r.sessionDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <span className={`type-badge type-${r.sessionType === 'Individual' ? 'blue' : 'purple'}`} style={{ marginLeft: '0.5rem' }}>{r.sessionType}</span>
                          </div>
                          <div className="session-meta">
                            <span>{r.socialWorkerName}</span>
                            <span className="session-emotional">{r.emotionalState}</span>
                            <button className="btn-icon" onClick={() => setSelected(r)}><Eye size={15} /></button>
                          </div>
                        </div>
                        <p className="session-preview">{r.narrativeSummary.slice(0, 150)}{r.narrativeSummary.length > 150 ? '…' : ''}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
        {Object.keys(grouped).length === 0 && (
          <div className="empty-state-full"><AlertCircle size={24} /><p>No process recordings found.</p></div>
        )}
      </div>

      {selected && <RecordingModal rec={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
