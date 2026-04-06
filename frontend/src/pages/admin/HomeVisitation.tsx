import { useState } from 'react';
import { Plus, Eye, X, Check, AlertCircle, Home, Calendar, Search } from 'lucide-react';
import { mockHomeVisits, mockCaseConferences, mockResidents, mockSocialWorkers } from '../../services/mockData';
import type { HomeVisit, CaseConference, VisitType } from '../../types';

const VISIT_TYPES: VisitType[] = ['Initial Assessment', 'Routine Follow-Up', 'Reintegration Assessment', 'Post-Placement Monitoring', 'Emergency'];
const COOPERATION_LEVELS = ['High', 'Moderate', 'Low', 'Uncooperative'] as const;

function VisitModal({ visit, onClose }: { visit: HomeVisit; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Home Visit Record</h2>
            <p className="modal-subtitle">{visit.residentName} · {new Date(visit.visitDate).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-item"><span>Visit Type</span><span className="category-chip">{visit.visitType}</span></div>
            <div className="detail-item"><span>Social Worker</span><strong>{visit.socialWorkerName}</strong></div>
            <div className="detail-item"><span>Family Cooperation</span>
              <span className={`cooperation-badge coop-${visit.familyCooperationLevel.toLowerCase()}`}>{visit.familyCooperationLevel}</span>
            </div>
          </div>
          <div className="narrative-section">
            <h3>Home Environment Observations</h3>
            <p>{visit.homeEnvironmentObservations}</p>
          </div>
          <div className="narrative-section">
            <h3>Safety Concerns</h3>
            <p>{visit.safetyConcerns || 'None noted.'}</p>
          </div>
          <div className="narrative-section">
            <h3>Follow-Up Actions</h3>
            <p>{visit.followUpActions}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConferenceModal({ conf, onClose }: { conf: CaseConference; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Case Conference</h2>
            <p className="modal-subtitle">{conf.residentName} · {new Date(conf.conferenceDate).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="narrative-section">
            <h3>Participants</h3>
            <ul className="participant-list">
              {conf.participants.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <div className="narrative-section">
            <h3>Agenda</h3>
            <p>{conf.agenda}</p>
          </div>
          <div className="narrative-section">
            <h3>Decisions Made</h3>
            <p>{conf.decisions}</p>
          </div>
          <div className="narrative-section">
            <h3>Follow-Up Actions</h3>
            <p>{conf.followUpActions}</p>
          </div>
          {conf.nextConferenceDate && (
            <div className="detail-item">
              <span>Next Conference</span>
              <strong>{new Date(conf.nextConferenceDate).toLocaleDateString('en-PH')}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomeVisitation() {
  const [visits, setVisits] = useState(mockHomeVisits);
  const [conferences] = useState(mockCaseConferences);
  const [tab, setTab] = useState<'visits' | 'conferences'>('visits');
  const [search, setSearch] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<HomeVisit | null>(null);
  const [selectedConf, setSelectedConf] = useState<CaseConference | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [newVisit, setNewVisit] = useState({
    residentId: mockResidents[0]?.id || 1,
    socialWorkerId: mockSocialWorkers[0]?.id || 1,
    visitDate: new Date().toISOString().split('T')[0],
    visitType: 'Routine Follow-Up' as VisitType,
    homeEnvironmentObservations: '',
    familyCooperationLevel: 'Moderate' as typeof COOPERATION_LEVELS[number],
    safetyConcerns: '',
    followUpActions: '',
  });

  const filteredVisits = visits.filter((v) =>
    v.residentName.toLowerCase().includes(search.toLowerCase()) ||
    v.socialWorkerName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredConfs = conferences.filter((c) =>
    c.residentName.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddVisit = () => {
    if (!newVisit.homeEnvironmentObservations.trim() || !newVisit.followUpActions.trim()) {
      setFormError('Observations and follow-up actions are required.');
      return;
    }
    const resident = mockResidents.find((r) => r.id === newVisit.residentId);
    const sw = mockSocialWorkers.find((s) => s.id === newVisit.socialWorkerId);
    const id = Math.max(...visits.map((v) => v.id)) + 1;
    setVisits([{
      id,
      residentId: newVisit.residentId,
      residentName: resident ? `${resident.firstName} ${resident.lastName}` : '',
      socialWorkerId: newVisit.socialWorkerId,
      socialWorkerName: sw ? `${sw.firstName} ${sw.lastName}` : '',
      visitDate: newVisit.visitDate,
      visitType: newVisit.visitType,
      homeEnvironmentObservations: newVisit.homeEnvironmentObservations,
      familyCooperationLevel: newVisit.familyCooperationLevel,
      safetyConcerns: newVisit.safetyConcerns,
      followUpActions: newVisit.followUpActions,
      createdAt: new Date().toISOString(),
    }, ...visits]);
    setFormError('');
    setShowAddForm(false);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Home Visitation &amp; Case Conferences</h1>
          <p>Log field visits and track case conference history and upcoming meetings.</p>
        </div>
        {tab === 'visits' && (
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus size={16} /> Log Visit
          </button>
        )}
      </div>

      <div className="metrics-grid metrics-grid-4">
        <div className="metric-card metric-card-blue">
          <div className="metric-value">{visits.length}</div>
          <div className="metric-label">Total Home Visits</div>
        </div>
        <div className="metric-card metric-card-amber">
          <div className="metric-value">{visits.filter((v) => v.visitType === 'Emergency').length}</div>
          <div className="metric-label">Emergency Visits</div>
        </div>
        <div className="metric-card metric-card-green">
          <div className="metric-value">{conferences.length}</div>
          <div className="metric-label">Case Conferences</div>
        </div>
        <div className="metric-card metric-card-purple">
          <div className="metric-value">{conferences.filter((c) => c.nextConferenceDate).length}</div>
          <div className="metric-label">Upcoming Conferences</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'visits' ? 'active' : ''}`} onClick={() => setTab('visits')}>
          <Home size={15} /> Home Visits ({visits.length})
        </button>
        <button className={`tab-btn ${tab === 'conferences' ? 'active' : ''}`} onClick={() => setTab('conferences')}>
          <Calendar size={15} /> Case Conferences ({conferences.length})
        </button>
      </div>

      {/* Add visit form */}
      {showAddForm && tab === 'visits' && (
        <div className="inline-form-card">
          <div className="inline-form-header">
            <h3><Home size={16} /> Log Home Visit</h3>
            <button className="btn-icon" onClick={() => setShowAddForm(false)}><X size={16} /></button>
          </div>
          {formError && <div className="alert alert-error"><AlertCircle size={14} /> {formError}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Resident *</label>
              <select className="form-select" value={newVisit.residentId} onChange={(e) => setNewVisit({ ...newVisit, residentId: +e.target.value })}>
                {mockResidents.map((r) => <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Social Worker *</label>
              <select className="form-select" value={newVisit.socialWorkerId} onChange={(e) => setNewVisit({ ...newVisit, socialWorkerId: +e.target.value })}>
                {mockSocialWorkers.map((sw) => <option key={sw.id} value={sw.id}>{sw.firstName} {sw.lastName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Visit Date *</label>
              <input className="form-input" type="date" value={newVisit.visitDate} onChange={(e) => setNewVisit({ ...newVisit, visitDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Visit Type *</label>
              <select className="form-select" value={newVisit.visitType} onChange={(e) => setNewVisit({ ...newVisit, visitType: e.target.value as VisitType })}>
                {VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Family Cooperation Level</label>
              <select className="form-select" value={newVisit.familyCooperationLevel} onChange={(e) => setNewVisit({ ...newVisit, familyCooperationLevel: e.target.value as typeof COOPERATION_LEVELS[number] })}>
                {COOPERATION_LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Home Environment Observations *</label>
            <textarea className="form-textarea" rows={3} value={newVisit.homeEnvironmentObservations} onChange={(e) => setNewVisit({ ...newVisit, homeEnvironmentObservations: e.target.value })} placeholder="Describe the home environment…" />
          </div>
          <div className="form-group">
            <label className="form-label">Safety Concerns</label>
            <textarea className="form-textarea" rows={2} value={newVisit.safetyConcerns} onChange={(e) => setNewVisit({ ...newVisit, safetyConcerns: e.target.value })} placeholder="Note any safety concerns observed…" />
          </div>
          <div className="form-group">
            <label className="form-label">Follow-Up Actions *</label>
            <textarea className="form-textarea" rows={3} value={newVisit.followUpActions} onChange={(e) => setNewVisit({ ...newVisit, followUpActions: e.target.value })} placeholder="Actions to take after this visit…" />
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddVisit}><Check size={14} /> Save Visit</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={16} className="search-icon" />
          <input className="search-input" placeholder="Search by resident name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Visits tab */}
      {tab === 'visits' && (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Resident</th>
                <th>Visit Type</th>
                <th>Social Worker</th>
                <th>Family Cooperation</th>
                <th>Safety Concerns</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisits.map((v) => (
                <tr key={v.id}>
                  <td className="table-secondary">{new Date(v.visitDate).toLocaleDateString('en-PH')}</td>
                  <td><div className="table-name">{v.residentName}</div></td>
                  <td><span className="category-chip">{v.visitType}</span></td>
                  <td className="table-secondary">{v.socialWorkerName}</td>
                  <td><span className={`cooperation-badge coop-${v.familyCooperationLevel.toLowerCase()}`}>{v.familyCooperationLevel}</span></td>
                  <td className="table-secondary">{v.safetyConcerns ? <span className="safety-flag">⚠ {v.safetyConcerns.slice(0, 40)}…</span> : <span className="safety-none">None</span>}</td>
                  <td><button className="btn-icon" onClick={() => setSelectedVisit(v)}><Eye size={15} /></button></td>
                </tr>
              ))}
              {filteredVisits.length === 0 && (
                <tr><td colSpan={7} className="empty-row"><AlertCircle size={16} /> No home visits found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Conferences tab */}
      {tab === 'conferences' && (
        <div className="conference-cards">
          {filteredConfs.map((c) => (
            <div key={c.id} className="conference-card-item">
              <div className="conference-card-date">
                <div className="conf-month">{new Date(c.conferenceDate).toLocaleString('en-PH', { month: 'short' })}</div>
                <div className="conf-day">{new Date(c.conferenceDate).getDate()}</div>
                <div className="conf-year">{new Date(c.conferenceDate).getFullYear()}</div>
              </div>
              <div className="conference-card-body">
                <h3>{c.residentName}</h3>
                <p className="conference-agenda">{c.agenda}</p>
                <div className="conference-participants">
                  {c.participants.slice(0, 2).map((p, i) => <span key={i} className="participant-chip">{p}</span>)}
                  {c.participants.length > 2 && <span className="participant-chip more">+{c.participants.length - 2} more</span>}
                </div>
                {c.nextConferenceDate && (
                  <div className="next-conf">
                    <Calendar size={12} /> Next: {new Date(c.nextConferenceDate).toLocaleDateString('en-PH')}
                  </div>
                )}
              </div>
              <button className="btn-icon" onClick={() => setSelectedConf(c)}><Eye size={15} /></button>
            </div>
          ))}
          {filteredConfs.length === 0 && (
            <div className="empty-state-full"><AlertCircle size={24} /><p>No case conferences found.</p></div>
          )}
        </div>
      )}

      {selectedVisit && <VisitModal visit={selectedVisit} onClose={() => setSelectedVisit(null)} />}
      {selectedConf && <ConferenceModal conf={selectedConf} onClose={() => setSelectedConf(null)} />}
    </div>
  );
}
