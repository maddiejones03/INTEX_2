import { useEffect, useState } from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { apiFetch } from '../../services/apiClient';
import type { ResidentEarlyWarning, RiskAlert } from '../../types/index';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

// ---- Types for API responses ----
interface DashboardResponse {
  alertCounts: { severity: string; count: number }[];
  trendCounts: { trendDirection: string; count: number }[];
  topAtRisk: ResidentEarlyWarning[];
}

interface PagedResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

// ---- Helpers ----
const RISK_COLORS: Record<string, string> = {
  Critical: 'rose',
  High:     'amber',
  Moderate: 'blue',
  Low:      'green',
};

const SEVERITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

const FACTOR_LABELS: Record<string, string> = {
  cooperation_slope:         'Family cooperation has been declining recently',
  cooperation_mean:          'Family cooperation levels have been consistently low',
  health_slope:       'Health scores have been declining over recent months',
  health_mean:        'Health scores have been consistently below average',
  session_count_mean:    'Session attendance has been low or irregular',
  concerns_mean:      'Concerns have been frequently flagged during sessions',
  emotional_imp_mean: 'Sessions show little emotional improvement',
  attendance_mean:    'School attendance has been low',
  safety_mean:        'Safety concerns have been noted during home visits',
  ri_count:           'Recent incidents have been reported',
  risk_numeric:       'Resident has an elevated initial risk classification',
  pct_concerns_mean:        'A high percentage of sessions have flagged concerns',

};

function factorLabel(key: string | null): string {
  if (!key) return '';
  return FACTOR_LABELS[key] ?? key.replace(/_/g, ' ');
}

function likelihoodLabel(prob: number | null): string {
  if (prob == null) return '—';
  const pct = Math.round(prob * 100);
  const label = pct >= 65 ? 'Very Likely' : pct >= 40 ? 'Likely' : 'Unlikely';
  return `${pct}% — ${label}`;
}

function formatAlertType(type: string): string {
  return type.replace(/([A-Z])/g, ' $1').trim();
}

function cleanDetail(detail: string): string {
  return detail
    .replace(/\s*\(slope=[^)]+\)/gi, '')
    .replace(/\s*\(slope\s*[^)]+\)/gi, '')
    .replace(/severity\s*>=\s*Medium/gi, 'medium or high severity')
    .replace(/(\d+)\s+incident\(s\)/gi, (_, n) => `${n} ${n === '1' ? 'incident' : 'incidents'}`)
    .replace(/\bCooperation declining\b/g, 'Family cooperation declining')
    .replace(/\b(High|Critical|Medium|Low)\b(?= risk level)/g, (m) => m.toLowerCase())
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function RiskBadge({ category }: { category: string | null }) {
  const color = RISK_COLORS[category ?? ''] ?? 'blue';
  return <span className={`badge badge-${color}`}>{category ?? '—'}</span>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const color = severity === 'High' ? 'rose' : severity === 'Medium' ? 'amber' : 'green';
  return <span className={`badge badge-${color}`}>{severity}</span>;
}

// ---- Main Component ----
export default function EarlyWarning() {
  useDocumentTitle('Early Warning');
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [residents, setResidents] = useState<ResidentEarlyWarning[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState('');
  const [lowRiskExpanded, setLowRiskExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [dash, res, alrt] = await Promise.all([
          apiFetch<DashboardResponse>('/api/earlywarning/dashboard'),
          apiFetch<PagedResponse<ResidentEarlyWarning>>('/api/earlywarning/residents?pageSize=100'),
          apiFetch<PagedResponse<RiskAlert>>('/api/earlywarning/alerts?pageSize=200'),
        ]);
        setDashboard(dash);
        setResidents(res.items);
        setAlerts(alrt.items.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load early warning data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredResidents = residents.filter((r) => {
    if (riskFilter && r.riskCategory !== riskFilter) return false;
    return true;
  });

  const alertCount = (sev: string) =>
    (dashboard?.alertCounts ?? []).find((a) => a.severity === sev)?.count ?? 0;

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-page-header"><h1>Early Warning System</h1></div>
        <p className="loading-text">Loading early warning data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <div className="admin-page-header"><h1>Early Warning System</h1></div>
        <div className="error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1>Early Warning System</h1>
          <p>Rule-based alerts and risk assessments to help prioritise resident attention.</p>
        </div>
        <div className="header-date">
          <Clock size={14} />
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* ── Alert Summary Cards ── */}
      <div className="metrics-grid">
        <div className="metric-card metric-card-rose">
          <div className="metric-icon icon-rose"><AlertCircle size={20} /></div>
          <div className="metric-value">{alertCount('High')}</div>
          <div className="metric-label">High Severity Alerts</div>
          <div className="metric-sub">Requires immediate attention</div>
        </div>
        <div className="metric-card metric-card-amber">
          <div className="metric-icon icon-amber"><AlertCircle size={20} /></div>
          <div className="metric-value">{alertCount('Medium')}</div>
          <div className="metric-label">Medium Severity Alerts</div>
          <div className="metric-sub">Monitor closely</div>
        </div>
      </div>

      {/* ── Active Alerts Table ── */}
      {alerts.length > 0 && (
        <div className="dashboard-card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2>Active Alerts</h2>
          </div>
          <p style={{ padding: '0 1.5rem 1rem', color: 'var(--gray-500)', fontSize: '0.875rem' }}>
            Real-time flags for residents showing signs of risk or declining progress.
          </p>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Resident ID</th>
                  <th scope="col">Alert Type</th>
                  <th scope="col">Severity</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.alertId}>
                    <td>{a.residentId}</td>
                    <td>{formatAlertType(a.alertType)}</td>
                    <td><SeverityBadge severity={a.severity} /></td>
                    <td>{cleanDetail(a.detail)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Resident Risk Assessment ── */}
      <div className="dashboard-card">
        <div className="card-header">
          <h2>Resident Risk Assessment</h2>
          <select
            className="filter-select"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="">All risk levels</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Moderate">Moderate</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <p style={{ padding: '0 1.5rem 1rem', color: 'var(--gray-500)', fontSize: '0.875rem' }}>
          Likelihood of a resident's risk level worsening, based on recent family cooperation, health, counseling sessions, and incident trends.
        </p>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Resident ID</th>
                <th scope="col">Risk Level</th>
                <th scope="col">Likelihood</th>
                <th scope="col">Key Concerns</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const elevated = filteredResidents.filter(r => r.riskCategory !== 'Low');
                const lowRisk  = filteredResidents.filter(r => r.riskCategory === 'Low');

                return (
                  <>
                    {elevated.map((r) => {
                      const factors = [r.topRiskFactor1, r.topRiskFactor2, r.topRiskFactor3].filter(Boolean);
                      return (
                        <tr key={r.residentId}>
                          <td>{r.residentId}</td>
                          <td><RiskBadge category={r.riskCategory} /></td>
                          <td>{likelihoodLabel(r.riskRegressionProbability)}</td>
                          <td>
                            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem', lineHeight: '1.6', listStyle: 'disc' }}>
                              {factors.map((f) => <li key={f}>{factorLabel(f)}</li>)}
                            </ul>
                          </td>
                        </tr>
                      );
                    })}

                    {lowRisk.length > 0 && (
                      <>
                        <tr
                          onClick={() => setLowRiskExpanded(x => !x)}
                          style={{ cursor: 'pointer', background: 'var(--gray-50)' }}
                        >
                          <td colSpan={4} style={{ padding: '0.65rem 1rem', color: 'var(--gray-500)', fontStyle: 'italic' }}>
                            {lowRiskExpanded ? '▾' : '▸'} {lowRisk.length} Low Risk Resident{lowRisk.length !== 1 ? 's' : ''} — click to {lowRiskExpanded ? 'collapse' : 'expand'}
                          </td>
                        </tr>
                        {lowRiskExpanded && lowRisk.map((r) => (
                          <tr key={r.residentId} style={{ background: 'var(--gray-50)' }}>
                            <td>{r.residentId}</td>
                            <td><RiskBadge category={r.riskCategory} /></td>
                            <td>{likelihoodLabel(r.riskRegressionProbability)}</td>
                            <td style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>No significant concerns</td>
                          </tr>
                        ))}
                      </>
                    )}

                    {filteredResidents.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          No residents match the selected filters.
                        </td>
                      </tr>
                    )}
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
