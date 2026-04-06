import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Users, Heart, Home, BookOpen, Activity } from 'lucide-react';
import { mockDonationTrends, mockOutcomeMetrics } from '../../services/mockData';

const impactHighlights = [
  { icon: Users, label: 'Total Residents Served (2024)', value: '147', sub: '+18% from 2023', color: 'blue' },
  { icon: Home, label: 'Currently in Safe Houses', value: '55', sub: 'Across 3 facilities', color: 'green' },
  { icon: Heart, label: 'Total Reintegrated (All Time)', value: '1,089', sub: '94% success rate', color: 'rose' },
  { icon: TrendingUp, label: 'Donations This Year', value: '₱6.44M', sub: '+12% from last year', color: 'amber' },
  { icon: BookOpen, label: 'In Education Programs', value: '82', sub: '56% enrolled in formal schooling', color: 'purple' },
  { icon: Activity, label: 'Counseling Sessions (YTD)', value: '1,340', sub: 'Avg. 9 sessions per resident', color: 'teal' },
];

const caseDistribution = [
  { name: 'Physical Abuse', value: 31 },
  { name: 'Sexual Abuse', value: 23 },
  { name: 'Trafficking', value: 18 },
  { name: 'Neglect', value: 32 },
  { name: 'CICL', value: 11 },
  { name: 'Abandoned', value: 8 },
];

const COLORS = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'];

const safeHouseData = [
  { name: 'Tahanan ng Pag-asa', capacity: 30, occupied: 22, reintegrated: 48 },
  { name: 'Bahay Kalinga', capacity: 25, occupied: 19, reintegrated: 39 },
  { name: 'Kanlungan Center', capacity: 20, occupied: 14, reintegrated: 31 },
];

const outcomeProgressData = [
  { year: '2020', reintegrated: 58, transferred: 12, independent: 8 },
  { year: '2021', reintegrated: 72, transferred: 10, independent: 11 },
  { year: '2022', reintegrated: 81, transferred: 9, independent: 14 },
  { year: '2023', reintegrated: 94, transferred: 8, independent: 18 },
  { year: '2024 (YTD)', reintegrated: 67, transferred: 5, independent: 12 },
];

function formatCurrency(value: number) {
  if (value >= 1000000) return `₱${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₱${(value / 1000).toFixed(0)}K`;
  return `₱${value}`;
}

export default function ImpactDashboard() {
  return (
    <div className="page-impact">
      <div className="impact-hero">
        <div className="container">
          <div className="section-label light">Transparent Impact</div>
          <h1>Our Impact in Numbers</h1>
          <p>
            Real, anonymized, aggregated data on how your support transforms lives.
            Updated quarterly. Last updated: April 2024.
          </p>
        </div>
      </div>

      <div className="container">
        {/* Highlight cards */}
        <div className="impact-highlights-grid">
          {impactHighlights.map((h) => (
            <div key={h.label} className={`impact-highlight-card impact-card-${h.color}`}>
              <div className={`impact-card-icon icon-${h.color}`}>
                <h.icon size={20} />
              </div>
              <div className="impact-card-value">{h.value}</div>
              <div className="impact-card-label">{h.label}</div>
              <div className="impact-card-sub">{h.sub}</div>
            </div>
          ))}
        </div>

        {/* Donation trends */}
        <div className="chart-section">
          <div className="chart-header">
            <h2>Donation Trends (2024)</h2>
            <p>Monthly breakdown of monetary, in-kind, and volunteer contributions</p>
          </div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockDonationTrends} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMonetary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInKind" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Area type="monotone" dataKey="monetary" name="Monetary" stroke="#3b82f6" fill="url(#colorMonetary)" strokeWidth={2} />
                <Area type="monotone" dataKey="inKind" name="In-Kind" stroke="#10b981" fill="url(#colorInKind)" strokeWidth={2} />
                <Area type="monotone" dataKey="volunteer" name="Volunteer" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2-col charts */}
        <div className="charts-row">
          {/* Case distribution */}
          <div className="chart-card">
            <h2>Case Categories (Active Residents)</h2>
            <p className="chart-sub">Anonymized breakdown of case types currently in care</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={caseDistribution} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {caseDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Safe house capacity */}
          <div className="chart-card">
            <h2>Safe House Occupancy</h2>
            <p className="chart-sub">Current capacity vs. occupancy and total reintegrated per facility</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={safeHouseData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="capacity" name="Capacity" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="occupied" name="Occupied" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reintegrated" name="Reintegrated (All Time)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reintegration outcomes by category */}
        <div className="chart-section">
          <div className="chart-header">
            <h2>Reintegration Outcomes by Case Category</h2>
            <p>Breakdown of how residents leave care, by case type</p>
          </div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={mockOutcomeMetrics} margin={{ top: 5, right: 20, left: 0, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} width={110} />
                <Tooltip />
                <Legend />
                <Bar dataKey="reintegrated" name="Reintegrated" fill="#10b981" stackId="a" />
                <Bar dataKey="inProgress" name="In Progress" fill="#3b82f6" stackId="a" />
                <Bar dataKey="transferred" name="Transferred" fill="#f59e0b" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Outcome trends over years */}
        <div className="chart-section">
          <div className="chart-header">
            <h2>Reintegration Outcomes Over Time</h2>
            <p>Annual reintegration, transfer, and independent living counts</p>
          </div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={outcomeProgressData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="reintegrated" name="Reintegrated" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="transferred" name="Transferred" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="independent" name="Independent Living" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data note */}
        <div className="data-note">
          <strong>Data Privacy Notice:</strong> All data displayed is aggregated and fully anonymized.
          No personally identifiable information is shown. Individual resident data is protected under
          our Privacy Policy and the Philippine Data Privacy Act of 2012 (R.A. 10173).
        </div>
      </div>
    </div>
  );
}
