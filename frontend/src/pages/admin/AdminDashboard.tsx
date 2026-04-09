import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, FolderOpen, Calendar,
  AlertCircle, CheckCircle, Clock, ArrowRight,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import DonorWatchlist from '../../components/ui/DonorWatchlist';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';


const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5030';

interface SafehouseData {
  safehouseId: number;
  name: string;
  city: string;
  capacityGirls: number;
  currentOccupancy: number;
  activeResidents: number;
  totalResidents: number;
  highRisk: number;
}

interface DonationMonth {
  year: number;
  month: number;
  totalAmount: number;
  donationCount: number;
}

interface ResidentSummary {
  total: number;
  items: {
    residentId: number;
    caseControlNo: string;
    caseStatus: string;
    caseCategory: string;
    dateOfAdmission: string;
  }[];
}

interface ProcessSummary {
  total: number;
  items: {
    recordingId: number;
    residentId: number;
    socialWorker: string;
    sessionDate: string;
    sessionType: string;
    emotionalStateObserved: string;
  }[];
}

interface HomeVisitSummary {
  total: number;
  items: {
    visitationId: number;
    residentId: number;
    socialWorker: string;
    visitDate: string;
    visitType: string;
    followUpNeeded: boolean | number;
    followUpNotes: string;
  }[];
}

interface ReintegrationSummaryResponse {
  summary: {
    completed: number;
    inProgress: number;
    notStarted: number;
  }[];
}

function asBool(value: boolean | number | null | undefined): boolean {
  if (typeof value === 'boolean') return value;
  return (value ?? 0) !== 0;
}

export default function AdminDashboard() {
  useDocumentTitle('Dashboard');
  const { authSession } = useAuth();
  const [safehouses, setSafehouses] = useState<SafehouseData[]>([]);
  const [donationTrends, setDonationTrends] = useState<{ month: string; monetary: number }[]>([]);
  const [residentSummary, setResidentSummary] = useState<ResidentSummary | null>(null);
  const [processSummary, setProcessSummary] = useState<ProcessSummary | null>(null);
  const [homeVisits, setHomeVisits] = useState<HomeVisitSummary | null>(null);
  const [reintegrationSummary, setReintegrationSummary] = useState<ReintegrationSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const watchlistRef = useRef<HTMLDivElement>(null);

  const scrollToWatchlist = () => {
    watchlistRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [safehouseRes, donationRes, residentRes, processRes, homeVisitRes, reintegrationRes] = await Promise.all([
          fetch(`${API_BASE}/api/reports/residents-by-safehouse`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/reports/donations-by-month`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/residents?pageSize=100`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/processrecordings?pageSize=100`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/homevisitations?pageSize=100`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/reports/reintegration-success-rates`, { credentials: 'include' }),
        ]);

        if (safehouseRes.ok) {
          const data = await safehouseRes.json();
          setSafehouses(data);
        }

        if (donationRes.ok) {
          const data: DonationMonth[] = await donationRes.json();
          const formatted = data.map(d => ({
            month: new Date(d.year, d.month - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' }),
            monetary: d.totalAmount,
          }));
          setDonationTrends(formatted);
        }

        if (residentRes.ok) {
          const data = await residentRes.json();
          setResidentSummary(data);
        }

        if (processRes.ok) {
          const data = await processRes.json();
          setProcessSummary(data);
        }

        if (homeVisitRes.ok) {
          const data = await homeVisitRes.json();
          setHomeVisits(data);
        }

        if (reintegrationRes.ok) {
          const data = await reintegrationRes.json();
          setReintegrationSummary(data);
        }

        const watchlistRes = await fetch(
          `${API_BASE}/api/donors/risk-watchlist?topN=50`,
          { credentials: 'include' }
        );
        if (watchlistRes.ok) {
          const watchlistData = await watchlistRes.json();
          const watchlist = watchlistData?.watchlist ?? [];

          console.log('Watchlist count:', watchlist.length);
          console.log('First donor:', watchlist[0]);

          const atRisk = watchlist.filter((d: any) =>
            (d.riskTier === 'High' || d.riskTier === 'Medium') &&
            !d.snoozeUntil
          );

          console.log('At risk count:', atRisk.length);

          const overdue = atRisk.filter((d: any) => {
            const scored = new Date(d.lastScoredAt);
            const now = new Date();
            const daysSince = Math.floor(
              (now.getTime() - scored.getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysSince > 7;
          }).length;

          setPendingCount(atRisk.length);
          setOverdueCount(overdue);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activeResidents = safehouses.reduce((s, h) => s + h.activeResidents, 0);
  const totalCapacity = safehouses.reduce((s, h) => s + h.capacityGirls, 0);
  const totalOccupied = safehouses.reduce((s, h) => s + h.currentOccupancy, 0);
  const followUpQueue = (homeVisits?.items ?? [])
    .filter((visit) => asBool(visit.followUpNeeded))
    .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
    .slice(0, 5);
  const recentProcess = (processSummary?.items ?? [])
    .slice()
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
    .slice(0, 5);

  const residentCaseById = new Map((residentSummary?.items ?? []).map((r) => [r.residentId, r.caseControlNo]));
  const reintegrationCompleted = (reintegrationSummary?.summary ?? []).reduce((sum, row) => sum + row.completed, 0);
  const reintegrationInProgress = (reintegrationSummary?.summary ?? []).reduce((sum, row) => sum + row.inProgress, 0);
  const reintegrationNotStarted = (reintegrationSummary?.summary ?? []).reduce((sum, row) => sum + row.notStarted, 0);

  const metricsBeforeOutreach = [
    { icon: Users, label: 'Active Residents', value: activeResidents, sub: `${totalOccupied}/${totalCapacity} capacity`, color: 'blue', to: '/admin/caseload' },
    { icon: CheckCircle, label: 'Total Residents', value: residentSummary?.total ?? '—', sub: 'All time', color: 'green', to: '/admin/caseload' },
  ];
  const metricsAfterOutreach = [
    { icon: FolderOpen, label: 'Recent Sessions', value: recentProcess.length, sub: 'Latest process recordings', color: 'amber', to: '/admin/process-recording' },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Welcome back, <strong>{authSession?.username}</strong>. Here's today's overview.</p>
        </div>
        <div className="header-date">
          <Clock size={14} /> {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading dashboard data...</div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="metrics-grid">
            {metricsBeforeOutreach.map((m) => (
              <Link key={m.label} to={m.to} className={`metric-card metric-card-${m.color}`}>
                <div className={`metric-icon icon-${m.color}`}><m.icon size={20} /></div>
                <div className="metric-value">{m.value}</div>
                <div className="metric-label">{m.label}</div>
                <div className="metric-sub">{m.sub}</div>
              </Link>
            ))}
            <div
              className="metric-card"
              onClick={scrollToWatchlist}
              style={{
                borderTop: overdueCount > 0
                  ? '3px solid #dc2626'
                  : pendingCount > 0
                  ? '3px solid #f59e0b'
                  : '3px solid #16a34a',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '';
              }}
            >
              <div
                className="metric-icon"
                style={{
                  background: overdueCount > 0 ? '#fef2f2'
                    : pendingCount > 0 ? '#fffbeb'
                    : '#f0fdf4',
                  color: overdueCount > 0 ? '#dc2626'
                    : pendingCount > 0 ? '#d97706'
                    : '#16a34a',
                  width: 36, height: 36,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.75rem',
                  fontSize: '16px',
                }}
              >
                ✉
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <div
                  className="metric-value"
                  style={{
                    color: pendingCount > 0 ? '#d97706' : '#16a34a',
                    fontSize: '1.75rem',
                  }}
                >
                  {pendingCount}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  pending
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>|</div>
                <div
                  className="metric-value"
                  style={{
                    color: overdueCount > 0 ? '#dc2626' : '#16a34a',
                    fontSize: '1.75rem',
                  }}
                >
                  {overdueCount}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  overdue
                </div>
              </div>

              <div className="metric-label" style={{ marginTop: '0.25rem' }}>
                Donor Outreach Status
              </div>

              <div className="metric-sub">
                {overdueCount > 0
                  ? `⚠️ ${overdueCount} donor${overdueCount > 1 ? 's' : ''} past 7-day window`
                  : pendingCount > 0
                  ? `${pendingCount} at-risk donor${pendingCount > 1 ? 's' : ''} awaiting contact`
                  : '✓ All at-risk donors contacted'}
              </div>
            </div>
            {metricsAfterOutreach.map((m) => (
              <Link key={m.label} to={m.to} className={`metric-card metric-card-${m.color}`}>
                <div className={`metric-icon icon-${m.color}`}><m.icon size={20} /></div>
                <div className="metric-value">{m.value}</div>
                <div className="metric-label">{m.label}</div>
                <div className="metric-sub">{m.sub}</div>
              </Link>
            ))}
          </div>

          <div className="dashboard-row">
            {/* Safe house status */}
            <div className="dashboard-card">
              <div className="card-header">
                <h2>Safe House Status</h2>
                <Link to="/admin/caseload" className="card-link">View all <ArrowRight size={14} /></Link>
              </div>
              <div className="safehouse-list">
                {safehouses.map((sh) => {
                  const pct = sh.capacityGirls > 0
                    ? Math.round((sh.currentOccupancy / sh.capacityGirls) * 100)
                    : 0;
                  const colorClass = pct >= 90 ? 'danger' : pct >= 75 ? 'warning' : 'good';
                  return (
                    <div key={sh.safehouseId} className="safehouse-item">
                      <div className="safehouse-name">{sh.name}</div>
                      <div className="safehouse-location">{sh.city}</div>
                      <div className="safehouse-capacity">
                        <span>{sh.currentOccupancy}/{sh.capacityGirls}</span>
                        <div className="capacity-bar">
                          <div className={`capacity-fill ${colorClass}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`capacity-pct ${colorClass}`}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent residents */}
            <div className="dashboard-card">
              <div className="card-header">
                <h2>Recent Residents</h2>
                <Link to="/admin/caseload" className="card-link">View all <ArrowRight size={14} /></Link>
              </div>
              <div className="resident-list">
                {residentSummary?.items.slice(0, 5).map((r) => (
                  <div key={r.residentId} className="resident-item">
                    <div className="resident-avatar">
                      {r.caseControlNo?.[0] ?? '?'}
                    </div>
                    <div className="resident-info">
                      <div className="resident-name">{r.caseControlNo}</div>
                      <div className="resident-meta">{r.caseCategory}</div>
                    </div>
                    <span className={`status-badge status-${r.caseStatus?.toLowerCase().replace(' ', '-')}`}>
                      {r.caseStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Donation chart */}
          <div className="dashboard-card">
            <div className="card-header">
              <h2>Donation Trends (Monthly)</h2>
              <Link to="/admin/donors" className="card-link">View details <ArrowRight size={14} /></Link>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={donationTrends} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gMon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, '']} />
                <Area type="monotone" dataKey="monetary" name="Monetary" stroke="#3b82f6" fill="url(#gMon)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Operations + Risk */}
          <div className="dashboard-row">
            <div className="dashboard-card">
              <div className="card-header">
                <h2>Upcoming Case Conferences (Follow-Up Queue)</h2>
                <Link to="/admin/visitation" className="card-link">Open queue <ArrowRight size={14} /></Link>
              </div>
              <div className="conference-list">
                {followUpQueue.map((v) => {
                  const conferenceDate = new Date(v.visitDate);
                  conferenceDate.setDate(conferenceDate.getDate() + 14);
                  return (
                    <div key={v.visitationId} className="conference-item">
                      <div className="conference-date">
                        <div className="conf-month">
                          {conferenceDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                        </div>
                        <div className="conf-day">{conferenceDate.getDate()}</div>
                      </div>
                      <div>
                        <div className="conference-resident">
                          {residentCaseById.get(v.residentId) ?? `Resident #${v.residentId}`}
                        </div>
                        <div className="conference-agenda">
                          {v.visitType} follow-up with {v.socialWorker || 'assigned worker'}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {followUpQueue.length === 0 && (
                  <div className="empty-state">
                    <AlertCircle size={20} />
                    <p>No pending follow-up conferences</p>
                  </div>
                )}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-header">
                <h2>High Risk Residents by Safehouse</h2>
              </div>
              <div className="conference-list">
                {safehouses.filter(sh => sh.highRisk > 0).map((sh) => (
                  <div key={sh.safehouseId} className="conference-item">
                    <div className="conference-date">
                      <div className="conf-month" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ef4444' }}>{sh.highRisk}</div>
                      <div style={{ fontSize: '10px' }}>high risk</div>
                    </div>
                    <div>
                      <div className="conference-resident">{sh.name}</div>
                      <div className="conference-agenda">{sh.activeResidents} active residents</div>
                    </div>
                  </div>
                ))}
                {safehouses.filter(sh => sh.highRisk > 0).length === 0 && (
                  <div className="empty-state">
                    <AlertCircle size={20} />
                    <p>No high risk residents</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="dashboard-row">
            <div className="dashboard-card">
              <div className="card-header">
                <h2>Progress Snapshot</h2>
                <Link to="/admin/reports" className="card-link">View analytics <ArrowRight size={14} /></Link>
              </div>
              <div className="metrics-grid metrics-grid-3">
                <div className="metric-card metric-card-green">
                  <div className="metric-value">{reintegrationCompleted}</div>
                  <div className="metric-label">Reintegrated</div>
                </div>
                <div className="metric-card metric-card-blue">
                  <div className="metric-value">{reintegrationInProgress}</div>
                  <div className="metric-label">In Progress</div>
                </div>
                <div className="metric-card metric-card-amber">
                  <div className="metric-value">{reintegrationNotStarted}</div>
                  <div className="metric-label">Not Started</div>
                </div>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-header">
                <h2>Recent Process Notes</h2>
                <Link to="/admin/process-recording" className="card-link">View all <ArrowRight size={14} /></Link>
              </div>
              <div className="activity-feed">
                {recentProcess.map((entry) => (
                  <div key={entry.recordingId} className="activity-item">
                    <div className="activity-icon icon-amber"><FolderOpen size={14} /></div>
                    <div className="activity-content">
                      <div className="activity-text">
                        {residentCaseById.get(entry.residentId) ?? `Resident #${entry.residentId}`} - {entry.sessionType}
                      </div>
                      <div className="activity-time">
                        {new Date(entry.sessionDate).toLocaleDateString()} - {entry.emotionalStateObserved || 'No mood noted'}
                      </div>
                    </div>
                  </div>
                ))}
                {recentProcess.length === 0 && (
                  <div className="empty-state">
                    <AlertCircle size={20} />
                    <p>No recent process recordings</p>
                  </div>
                )}
              </div>
            </div>
          </div>
           {/* Donor Risk Watchlist — ML Pipeline 1 */}
           <div ref={watchlistRef}>
             <DonorWatchlist topN={10} />
           </div>
        </>
      )}
    </div>
  );
}
