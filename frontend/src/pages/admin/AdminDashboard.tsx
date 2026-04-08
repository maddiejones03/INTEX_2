import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Heart, FolderOpen, Home, Calendar,
  AlertCircle, CheckCircle, Clock, ArrowRight,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import DonorWatchlist from '../../components/ui/DonorWatchlist';


const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5030';

const recentActivity = [
  { icon: Users, color: 'blue', text: 'New resident admitted', time: '2 hours ago' },
  { icon: Heart, color: 'rose', text: 'Donation received', time: '4 hours ago' },
  { icon: FolderOpen, color: 'amber', text: 'Process recording added', time: 'Yesterday' },
  { icon: Home, color: 'green', text: 'Home visit completed', time: '2 days ago' },
  { icon: Calendar, color: 'purple', text: 'Case conference scheduled', time: '3 days ago' },
];

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

export default function AdminDashboard() {
  const { authSession } = useAuth();
  const [safehouses, setSafehouses] = useState<SafehouseData[]>([]);
  const [donationTrends, setDonationTrends] = useState<{ month: string; monetary: number }[]>([]);
  const [residentSummary, setResidentSummary] = useState<ResidentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [safehouseRes, donationRes, residentRes] = await Promise.all([
          fetch(`${API_BASE}/api/reports/residents-by-safehouse`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/reports/donations-by-month`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/residents?pageSize=5`, { credentials: 'include' }),
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

  const metrics = [
    { icon: Users, label: 'Active Residents', value: activeResidents, sub: `${totalOccupied}/${totalCapacity} capacity`, color: 'blue', to: '/admin/caseload' },
    { icon: CheckCircle, label: 'Total Residents', value: residentSummary?.total ?? '—', sub: 'All time', color: 'green', to: '/admin/caseload' },
    { icon: Heart, label: 'Donation Months', value: donationTrends.length, sub: 'Months with donations', color: 'rose', to: '/admin/donors' },
    { icon: Calendar, label: 'Safehouses', value: safehouses.length, sub: 'Active locations', color: 'amber', to: '/admin/caseload' },
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
            {metrics.map((m) => (
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

          {/* Activity feed */}
          <div className="dashboard-row">
            <div className="dashboard-card">
              <div className="card-header"><h2>Recent Activity</h2></div>
              <div className="activity-feed">
                {recentActivity.map((a, i) => (
                  <div key={i} className="activity-item">
                    <div className={`activity-icon icon-${a.color}`}><a.icon size={14} /></div>
                    <div className="activity-content">
                      <div className="activity-text">{a.text}</div>
                      <div className="activity-time">{a.time}</div>
                    </div>
                  </div>
                ))}
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
           {/* Donor Risk Watchlist — ML Pipeline 1 */}
           <DonorWatchlist topN={10} />
        </>
      )}
    </div>
  );
}
