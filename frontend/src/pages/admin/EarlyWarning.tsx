import { useEffect, useState } from 'react';
import { AlertCircle, TrendingDown, TrendingUp, Minus, Clock } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { apiFetch } from '../../services/apiClient';
import type { ResidentEarlyWarning, RiskAlert } from '../../types/index';

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

function TrendIcon({ direction }: { direction: string | null }) {
  if (direction === 'Improving') return <TrendingUp size={14} className="trend-icon trend-improving" />;
  if (direction === 'Declining') return <TrendingDown size={14} className="trend-icon trend-declining" />;
  return <Minus size={14} className="trend-icon trend-stable" />;
}

function RiskBadge({ category }: { category: string | null }) {
  const color = RISK_COLORS[category ?? ''] ?? 'blue';
  return <span className={`badge badge-${color}`}>{category ?? '—'}</span>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const color = severity === 'High' ? 'rose' : severity === 'Medium' ? 'amber' : 'green';
  return <span className={`badge badge-${color}`}>{severity}</span>;
}

// Slope-based sparkline: generate fake monthly points from current score + slope
function buildSparklineData(row: ResidentEarlyWarning) {
  const base = row.currentCooperationScore ?? 2;
  const slope = row.cooperationSlopeAll ?? 0;
  return Array.from({ length: 6 }, (_, i) => ({
    month: `M${i + 1}`,
    score: parseFloat(Math.max(1, Math.min(4, base + slope * (i - 5))).toFixed(2)),
  }));
}

// ---- Main Component ----
export default function EarlyWarning() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [residents, setResidents] = useState<ResidentEarlyWarning[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendFilter, setTrendFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

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
    if (trendFilter && r.trendDirection !== trendFilter) return false;
    if (riskFilter && r.riskCategory !== riskFilter) return false;
    return true;
  });

  const alertCount = (sev: string) =>
    (dashboard?.alertCounts ?? []).find((a) => a.severity === sev)?.count ?? 0;

  const trendCount = (dir: string) =>
    (dashboard?.trendCounts ?? []).find((t) => t.trendDirection === dir)?.count ?? 0;

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
          <p>ML-powered regression risk detection and cooperation trend monitoring.</p>
        </div>
        <div className="header-date">
          <Clock size={14} />
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* ── Panel 1: Alert Summary ── */}
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
        <div className="metric-card metric-card-green">
          <div className="metric-icon icon-green"><AlertCircle size={20} /></div>
          <div className="metric-value">{alertCount('Low')}</div>
          <div className="metric-label">Low Severity Alerts</div>
          <div className="metric-sub">Informational</div>
        </div>
        <div className="metric-card metric-card-blue">
          <div className="metric-icon icon-blue"><TrendingDown size={20} /></div>
          <div className="metric-value">{trendCount('Declining')}</div>
          <div className="metric-label">Declining Cooperation</div>
          <div className="metric-sub">Slope &lt; −0.05/month</div>
        </div>
      </div>

      {/* Alert table */}
      {alerts.length > 0 && (
        <div className="dashboard-card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2>Active Alerts</h2>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Resident ID</th>
                  <th>Alert Type</th>
                  <th>Severity</th>
                  <th>Current Risk</th>
                  <th>Detail</th>
                  <th>Computed</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.alertId}>
                    <td>#{a.residentId}</td>
                    <td>{a.alertType}</td>
                    <td><SeverityBadge severity={a.severity} /></td>
                    <td>{a.currentRiskLevel ?? '—'}</td>
                    <td>{a.detail}</td>
                    <td>{a.computedAt ? new Date(a.computedAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Panel 2: Regression Risk Scores ── */}
      <div className="dashboard-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2>Regression Risk Scores</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              className="filter-select"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="">All risk categories</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Moderate">Moderate</option>
              <option value="Low">Low</option>
            </select>
            <select
              className="filter-select"
              value={trendFilter}
              onChange={(e) => setTrendFilter(e.target.value)}
            >
              <option value="">All trends</option>
              <option value="Declining">Declining</option>
              <option value="Stable">Stable</option>
              <option value="Improving">Improving</option>
            </select>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Resident</th>
                <th>Risk Category</th>
                <th>Probability</th>
                <th>Cooperation Trend</th>
                <th>Top Risk Factors</th>
                <th>Model</th>
              </tr>
            </thead>
            <tbody>
              {filteredResidents.map((r) => (
                <tr key={r.residentId}>
                  <td>#{r.residentId}</td>
                  <td><RiskBadge category={r.riskCategory} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="prob-bar-track">
                        <div
                          className="prob-bar-fill"
                          style={{ width: `${((r.riskRegressionProbability ?? 0) * 100).toFixed(0)}%` }}
                        />
                      </div>
                      <span className="prob-label">
                        {r.riskRegressionProbability != null
                          ? `${(r.riskRegressionProbability * 100).toFixed(0)}%`
                          : '—'}
                      </span>
                    </div>
                  </td>
                  <td style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <TrendIcon direction={r.trendDirection} />
                    {r.trendDirection ?? '—'}
                  </td>
                  <td>
                    <div className="factor-list">
                      {[r.topRiskFactor1, r.topRiskFactor2, r.topRiskFactor3]
                        .filter(Boolean)
                        .map((f) => <span key={f} className="factor-tag">{f}</span>)}
                    </div>
                  </td>
                  <td>{r.modelName ?? '—'}</td>
                </tr>
              ))}
              {filteredResidents.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No residents match the selected filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Panel 3: Cooperation Trajectories ── */}
      <div className="dashboard-card">
        <div className="card-header">
          <h2>Cooperation Trajectories</h2>
          <span className="card-sub">OKR target: +0.5 pts/quarter upward trend</span>
        </div>
        <div className="trajectory-grid">
          {residents
            .filter((r) => r.currentCooperationScore != null)
            .sort((a, b) => (a.cooperationSlope3m ?? 0) - (b.cooperationSlope3m ?? 0))
            .map((r) => {
              const data = buildSparklineData(r);
              const lineColor =
                r.trendDirection === 'Improving' ? '#22c55e' :
                r.trendDirection === 'Declining' ? '#ef4444' : '#f59e0b';

              return (
                <div key={r.residentId} className="trajectory-card">
                  <div className="trajectory-header">
                    <span className="trajectory-title">Resident #{r.residentId}</span>
                    <TrendIcon direction={r.trendDirection} />
                  </div>
                  <div className="trajectory-meta">
                    Slope (3m): <strong>{r.cooperationSlope3m?.toFixed(3) ?? '—'}</strong>
                    &nbsp;·&nbsp;
                    Score: <strong>{r.currentCooperationScore?.toFixed(1) ?? '—'}</strong>
                  </div>
                  <ResponsiveContainer width="100%" height={80}>
                    <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                      <YAxis domain={[1, 4]} tick={{ fontSize: 9 }} />
                      <Tooltip
                        contentStyle={{ fontSize: '11px' }}
                        formatter={(v) => [v != null ? Number(v).toFixed(2) : '', 'Cooperation']}
                      />
                      {/* OKR reference: target slope of +0.5/quarter ≈ +0.167/month */}
                      <ReferenceLine
                        stroke="#94a3b8"
                        strokeDasharray="4 2"
                        segment={[
                          { x: 'M1', y: Math.max(1, (r.currentCooperationScore ?? 2) - 5 * 0.167) },
                          { x: 'M6', y: Math.min(4, (r.currentCooperationScore ?? 2) + 0 * 0.167) },
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke={lineColor}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          {residents.filter((r) => r.currentCooperationScore != null).length === 0 && (
            <p style={{ color: 'var(--text-muted)' }}>No trajectory data available yet. Run the batch pipeline to generate scores.</p>
          )}
        </div>
      </div>
    </div>
  );
}
