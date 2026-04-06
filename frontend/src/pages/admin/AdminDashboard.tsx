import { Link } from 'react-router-dom';
import {
  Users, Heart, FolderOpen, Home, Calendar,
  AlertCircle, CheckCircle, Clock, ArrowRight,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { mockResidents, mockDonations, mockSafeHouses, mockCaseConferences, mockDonationTrends } from '../../services/mockData';
import { useAuth } from '../../context/AuthContext';

const recentActivity = [
  { icon: Users, color: 'blue', text: 'New resident admitted: KF-2024-005', time: '2 hours ago' },
  { icon: Heart, color: 'rose', text: 'Donation received: ₱50,000 from Roberto Tan', time: '4 hours ago' },
  { icon: FolderOpen, color: 'amber', text: 'Process recording added for Grace Flores', time: 'Yesterday' },
  { icon: Home, color: 'green', text: 'Home visit completed for Sofia Ramos', time: '2 days ago' },
  { icon: Calendar, color: 'purple', text: 'Case conference scheduled: Grace Flores, Apr 5', time: '3 days ago' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const activeResidents = mockResidents.filter((r) => r.caseStatus === 'Active').length;
  const reintegratedCount = mockResidents.filter((r) => r.caseStatus === 'Reintegrated').length;
  const totalCapacity = mockSafeHouses.reduce((s, h) => s + h.capacity, 0);
  const totalOccupied = mockSafeHouses.reduce((s, h) => s + h.currentOccupancy, 0);
  const upcomingConferences = mockCaseConferences.filter((c) => c.nextConferenceDate).length;
  const recentDonationsTotal = mockDonations
    .filter((d) => d.type === 'Monetary' && d.amount)
    .reduce((s, d) => s + (d.amount ?? 0), 0);

  const metrics = [
    { icon: Users, label: 'Active Residents', value: activeResidents, sub: `${totalOccupied}/${totalCapacity} capacity`, color: 'blue', to: '/admin/caseload' },
    { icon: CheckCircle, label: 'Reintegrated (2024)', value: reintegratedCount, sub: 'Successful exits', color: 'green', to: '/admin/caseload' },
    { icon: Heart, label: 'Donations (YTD)', value: `₱${(recentDonationsTotal / 1000).toFixed(0)}K`, sub: `${mockDonations.length} contributions`, color: 'rose', to: '/admin/donors' },
    { icon: Calendar, label: 'Upcoming Conferences', value: upcomingConferences, sub: 'Next 30 days', color: 'amber', to: '/admin/visitation' },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Welcome back, <strong>{user?.firstName}</strong>. Here's today's overview.</p>
        </div>
        <div className="header-date">
          <Clock size={14} /> {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

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
            {mockSafeHouses.map((sh) => {
              const pct = Math.round((sh.currentOccupancy / sh.capacity) * 100);
              const colorClass = pct >= 90 ? 'danger' : pct >= 75 ? 'warning' : 'good';
              return (
                <div key={sh.id} className="safehouse-item">
                  <div className="safehouse-name">{sh.name}</div>
                  <div className="safehouse-location">{sh.location}</div>
                  <div className="safehouse-capacity">
                    <span>{sh.currentOccupancy}/{sh.capacity}</span>
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
            {mockResidents.slice(0, 5).map((r) => (
              <div key={r.id} className="resident-item">
                <div className="resident-avatar">
                  {r.firstName[0]}{r.lastName[0]}
                </div>
                <div className="resident-info">
                  <div className="resident-name">{r.firstName} {r.lastName}</div>
                  <div className="resident-meta">{r.caseNumber} · {r.caseCategory}</div>
                </div>
                <span className={`status-badge status-${r.caseStatus.toLowerCase().replace(' ', '-')}`}>
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
          <AreaChart data={mockDonationTrends} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gMon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v) => [`₱${Number(v).toLocaleString()}`, '']} />
            <Area type="monotone" dataKey="monetary" name="Monetary" stroke="#3b82f6" fill="url(#gMon)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Activity feed + upcoming */}
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
            <h2>Upcoming Conferences</h2>
            <Link to="/admin/visitation" className="card-link">View all <ArrowRight size={14} /></Link>
          </div>
          <div className="conference-list">
            {mockCaseConferences.filter((c) => c.nextConferenceDate).map((c) => (
              <div key={c.id} className="conference-item">
                <div className="conference-date">
                  <div className="conf-month">{new Date(c.nextConferenceDate!).toLocaleString('en-PH', { month: 'short' })}</div>
                  <div className="conf-day">{new Date(c.nextConferenceDate!).getDate()}</div>
                </div>
                <div>
                  <div className="conference-resident">{c.residentName}</div>
                  <div className="conference-agenda">{c.agenda}</div>
                </div>
              </div>
            ))}
            {mockCaseConferences.filter((c) => c.nextConferenceDate).length === 0 && (
              <div className="empty-state">
                <AlertCircle size={20} />
                <p>No upcoming conferences</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
