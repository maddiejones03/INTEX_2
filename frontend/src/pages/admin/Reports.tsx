import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Download, TrendingUp, Users, Heart, BookOpen } from 'lucide-react';
import { mockDonationTrends, mockOutcomeMetrics, mockResidents, mockSafeHouses } from '../../services/mockData';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

const educationData = [
  { level: 'Not Enrolled', count: 18 },
  { level: 'Elementary', count: 24 },
  { level: 'High School', count: 31 },
  { level: 'Alt. Learning', count: 15 },
  { level: 'Vocational', count: 8 },
  { level: 'College', count: 4 },
];

const healthData = [
  { month: 'Jan', medicalCheckups: 28, mentalHealthSessions: 45, dental: 12 },
  { month: 'Feb', medicalCheckups: 31, mentalHealthSessions: 52, dental: 8 },
  { month: 'Mar', medicalCheckups: 26, mentalHealthSessions: 48, dental: 14 },
  { month: 'Apr', medicalCheckups: 33, mentalHealthSessions: 61, dental: 10 },
];

const annualReport = {
  year: 2023,
  caring: { residents: 127, newAdmissions: 48, transferred: 8, reintegrated: 71 },
  healing: { counselingSessions: 1284, groupSessions: 96, psychiatricConsultations: 42 },
  teaching: { enrolled: 89, graduated: 12, vocationalCompleted: 7 },
  reintegration: { family: 52, community: 11, independent: 8 },
};

function formatCurrency(value: number) {
  if (value >= 1000000) return `₱${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₱${(value / 1000).toFixed(0)}K`;
  return `₱${value}`;
}

export default function Reports() {
  const totalResidents = mockResidents.length;
  const activeResidents = mockResidents.filter((r) => r.caseStatus === 'Active').length;
  const reintegrated = mockResidents.filter((r) => r.caseStatus === 'Reintegrated').length;
  const reintegrationRate = Math.round((reintegrated / (reintegrated + activeResidents)) * 100);

  const categoryBreakdown = Object.entries(
    mockResidents.reduce<Record<string, number>>((acc, r) => {
      acc[r.caseCategory] = (acc[r.caseCategory] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const safeHousePerf = mockSafeHouses.map((sh) => ({
    name: sh.name.split(' ').slice(0, 2).join(' '),
    capacity: sh.capacity,
    occupancy: sh.currentOccupancy,
    utilization: Math.round((sh.currentOccupancy / sh.capacity) * 100),
  }));

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Reports &amp; Analytics</h1>
          <p>Aggregated insights and trends to support decision-making.</p>
        </div>
        <button className="btn btn-outline">
          <Download size={16} /> Export Report
        </button>
      </div>

      {/* KPI summary */}
      <div className="metrics-grid metrics-grid-4">
        <div className="metric-card metric-card-blue">
          <div className="metric-icon icon-blue"><Users size={18} /></div>
          <div className="metric-value">{totalResidents}</div>
          <div className="metric-label">Total Records</div>
          <div className="metric-sub">{activeResidents} currently active</div>
        </div>
        <div className="metric-card metric-card-green">
          <div className="metric-icon icon-green"><TrendingUp size={18} /></div>
          <div className="metric-value">{reintegrationRate}%</div>
          <div className="metric-label">Reintegration Rate</div>
          <div className="metric-sub">{reintegrated} successfully reintegrated</div>
        </div>
        <div className="metric-card metric-card-rose">
          <div className="metric-icon icon-rose"><Heart size={18} /></div>
          <div className="metric-value">₱6.44M</div>
          <div className="metric-label">Donations (2024)</div>
          <div className="metric-sub">+12% from 2023</div>
        </div>
        <div className="metric-card metric-card-amber">
          <div className="metric-icon icon-amber"><BookOpen size={18} /></div>
          <div className="metric-value">89</div>
          <div className="metric-label">In Education Programs</div>
          <div className="metric-sub">12 graduated in 2023</div>
        </div>
      </div>

      {/* Annual Accomplishment Report */}
      <div className="report-section">
        <h2 className="report-section-title">Annual Accomplishment Report — {annualReport.year}</h2>
        <p className="report-section-sub">Aligned with DSWD Annual Accomplishment Report format (Caring, Healing, Teaching)</p>
        <div className="aar-grid">
          <div className="aar-card aar-blue">
            <h3>CARING</h3>
            <div className="aar-stats">
              <div className="aar-stat"><span>{annualReport.caring.residents}</span><p>Total Residents Served</p></div>
              <div className="aar-stat"><span>{annualReport.caring.newAdmissions}</span><p>New Admissions</p></div>
              <div className="aar-stat"><span>{annualReport.caring.reintegrated}</span><p>Reintegrated</p></div>
              <div className="aar-stat"><span>{annualReport.caring.transferred}</span><p>Transferred</p></div>
            </div>
          </div>
          <div className="aar-card aar-green">
            <h3>HEALING</h3>
            <div className="aar-stats">
              <div className="aar-stat"><span>{annualReport.healing.counselingSessions}</span><p>Individual Sessions</p></div>
              <div className="aar-stat"><span>{annualReport.healing.groupSessions}</span><p>Group Sessions</p></div>
              <div className="aar-stat"><span>{annualReport.healing.psychiatricConsultations}</span><p>Psych Consultations</p></div>
            </div>
          </div>
          <div className="aar-card aar-amber">
            <h3>TEACHING</h3>
            <div className="aar-stats">
              <div className="aar-stat"><span>{annualReport.teaching.enrolled}</span><p>Enrolled in School</p></div>
              <div className="aar-stat"><span>{annualReport.teaching.graduated}</span><p>Graduated</p></div>
              <div className="aar-stat"><span>{annualReport.teaching.vocationalCompleted}</span><p>Vocational Completed</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="charts-row">
        <div className="chart-card">
          <h2>Donation Trends (2024)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={mockDonationTrends} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="monetary" name="Monetary" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="inKind" name="In-Kind" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="volunteer" name="Volunteer" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h2>Case Category Breakdown</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categoryBreakdown} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Reintegration outcomes */}
      <div className="chart-card">
        <h2>Reintegration Outcomes by Category</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={mockOutcomeMetrics} margin={{ top: 5, right: 20, left: 0, bottom: 0 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} width={120} />
            <Tooltip />
            <Legend />
            <Bar dataKey="reintegrated" name="Reintegrated" fill="#10b981" stackId="a" />
            <Bar dataKey="inProgress" name="In Progress" fill="#3b82f6" stackId="a" />
            <Bar dataKey="transferred" name="Transferred" fill="#f59e0b" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Education + Health */}
      <div className="charts-row">
        <div className="chart-card">
          <h2>Education Enrollment</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={educationData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="level" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Residents" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h2>Health Services (Monthly)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={healthData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="medicalCheckups" name="Medical Checkups" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="mentalHealthSessions" name="Mental Health Sessions" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="dental" name="Dental" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Safe house performance */}
      <div className="chart-card">
        <h2>Safe House Performance Comparison</h2>
        <div className="safehouse-perf-grid">
          {safeHousePerf.map((sh) => (
            <div key={sh.name} className="safehouse-perf-card">
              <h3>{sh.name}</h3>
              <div className="perf-stat">
                <span>Occupancy</span>
                <strong>{sh.occupancy}/{sh.capacity}</strong>
              </div>
              <div className="perf-bar-wrapper">
                <div className="perf-bar" style={{ width: `${sh.utilization}%`, background: sh.utilization >= 90 ? '#ef4444' : sh.utilization >= 75 ? '#f59e0b' : '#10b981' }} />
              </div>
              <div className="perf-pct">{sh.utilization}% utilized</div>
            </div>
          ))}
        </div>
      </div>

      {/* Reintegration breakdown */}
      <div className="report-section">
        <h2 className="report-section-title">Reintegration Pathways ({annualReport.year})</h2>
        <div className="reint-grid">
          <div className="reint-card">
            <div className="reint-number">{annualReport.reintegration.family}</div>
            <div>Reintegrated with Family</div>
          </div>
          <div className="reint-card">
            <div className="reint-number">{annualReport.reintegration.community}</div>
            <div>Community Placement</div>
          </div>
          <div className="reint-card">
            <div className="reint-number">{annualReport.reintegration.independent}</div>
            <div>Independent Living</div>
          </div>
          <div className="reint-card">
            <div className="reint-number">71</div>
            <div>Total Successful Exits</div>
          </div>
        </div>
      </div>
    </div>
  );
}
