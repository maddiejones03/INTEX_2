import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, FolderOpen,
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

interface CaseConferenceRow {
  conferenceId: number;
  residentId: number;
  conferenceDate: string;
  conferenceType: string;
  facilitator: string | null;
  agenda: string | null;
  status: string;
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
  const [loading, setLoading] = useState(true);
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [caseConferenceUpcoming, setCaseConferenceUpcoming] = useState<CaseConferenceRow[]>([]);
  const [caseConferenceTotal, setCaseConferenceTotal] = useState<number>(0);
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
        const [safehouseRes, donationRes, residentRes, processRes, homeVisitRes, conferenceRes] =
          await Promise.all([
          fetch(`${API_BASE}/api/reports/residents-by-safehouse`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/reports/donations-by-month`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/residents?pageSize=100`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/processrecordings?pageSize=100`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/homevisitations?pageSize=100`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/caseconferences?upcoming=true&pageSize=100`, { credentials: 'include' }),
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

        if (conferenceRes.ok) {
          const data = (await conferenceRes.json()) as { total?: number; items?: CaseConferenceRow[] };
          const items = data.items ?? [];
          const filtered = items
            .filter((c) => (c.status ?? '').toLowerCase() !== 'cancelled')
            .slice()
            .sort((a, b) => a.conferenceDate.localeCompare(b.conferenceDate));
          setCaseConferenceUpcoming(filtered.slice(0, 5));
          setCaseConferenceTotal(typeof data.total === 'number' ? data.total : filtered.length);
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
                {safehouses.slice(0, 5).map((sh) => {
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
                <h2>Scheduled case conferences</h2>
                <Link to="/admin/visitation" className="card-link">
                  View all ({caseConferenceTotal}) <ArrowRight size={14} />
                </Link>
              </div>
              <p className="table-secondary" style={{ fontSize: '0.8125rem', margin: '0 0 0.75rem', padding: '0 1.25rem' }}>
                From the case conferences table (next five by date).
              </p>
              <div className="conference-list">
                {caseConferenceUpcoming.map((c) => {
                  const d = new Date(
                    c.conferenceDate.includes('T') ? c.conferenceDate : `${c.conferenceDate}T12:00:00`
                  );
                  return (
                    <div key={c.conferenceId} className="conference-item">
                      <div className="conference-date">
                        <div className="conf-month">
                          {d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                        </div>
                        <div className="conf-day">{d.getDate()}</div>
                      </div>
                      <div>
                        <div className="conference-resident">
                          {residentCaseById.get(c.residentId) ?? `Resident #${c.residentId}`}
                        </div>
                        <div className="conference-agenda">
                          {c.conferenceType}
                          {c.facilitator ? ` · ${c.facilitator}` : ''}
                          {c.agenda ? ` — ${c.agenda.slice(0, 80)}${c.agenda.length > 80 ? '…' : ''}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {caseConferenceUpcoming.length === 0 && (
                  <div className="empty-state">
                    <AlertCircle size={20} />
                    <p>No upcoming case conferences on file</p>
                  </div>
                )}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-header">
                <h2>Visit follow-up reminders</h2>
                <Link to="/admin/visitation" className="card-link">Open visits <ArrowRight size={14} /></Link>
              </div>
              <p className="table-secondary" style={{ fontSize: '0.8125rem', margin: '0 0 0.75rem', padding: '0 1.25rem' }}>
                Home visits flagged for follow-up (suggested review date: visit + 14 days).
              </p>
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
                    <p>No visits flagged for follow-up</p>
                  </div>
                )}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-header">
                <h2>
                  Girls Requiring Immediate Attention
                  <span style={{
                    marginLeft: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: '20px',
                    padding: '2px 10px',
                  }}>
                    {safehouses
                      .filter(sh => sh.highRisk > 0)
                      .reduce((sum, sh) => sum + sh.highRisk, 0)
                    }
                  </span>
                </h2>
              </div>
              <div className="conference-list">
                {safehouses
                  .filter(sh => sh.highRisk > 0)
                  .sort((a, b) => b.highRisk - a.highRisk)
                  .map((sh) => (
                  <div
                    key={sh.safehouseId}
                    className="conference-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}>
                      <div className="conference-date">
                        <div className="conf-month" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ef4444' }}>{sh.highRisk}</div>
                        <div style={{ fontSize: '10px' }}>need attention</div>
                      </div>
                      <div>
                        <div className="conference-resident">{sh.name}</div>
                        <div className="conference-agenda">
                          {sh.highRisk} of {sh.activeResidents} girls
                          at risk
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: sh.activeResidents > 0 &&
                              (sh.highRisk / sh.activeResidents) > 0.4
                              ? '#dc2626' : '#f59e0b',
                          }}>
                            ({sh.activeResidents > 0
                              ? Math.round((sh.highRisk / sh.activeResidents) * 100)
                              : 0}%)
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/admin/caseload?safehouse=${sh.safehouseId}&risk=High`}
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#4f8a68',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        padding: '4px 10px',
                        border: '1px solid #95c8a8',
                        borderRadius: '6px',
                        background: '#f0fdf4',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLAnchorElement)
                          .style.background = '#dcfce7';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLAnchorElement)
                          .style.background = '#f0fdf4';
                      }}
                    >
                      View Girls →
                    </Link>
                  </div>
                ))}
                {safehouses
                  .filter(sh => sh.highRisk > 0)
                  .sort((a, b) => b.highRisk - a.highRisk)
                  .length === 0 && (
                  <div className="empty-state">
                    <AlertCircle size={20} />
                    <p>No high risk residents</p>
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
