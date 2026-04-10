import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Users, Heart, BookOpen } from 'lucide-react';
import ImpactChart from '../../components/ui/ImpactChart';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5030';
const COLORS = [
  'var(--primary)',
  'var(--accent)',
  'var(--blue)',
  'var(--teal)',
  'var(--purple)',
  'var(--gray-400)',
];

function formatCurrency(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

interface DonationMonth { year: number; month: number; totalAmount: number; donationCount: number; }
interface SafehouseData { safehouseId: number; name: string; capacityGirls: number; currentOccupancy: number; activeResidents: number; totalResidents: number; highRisk: number; }
interface ReintegrationSummary { caseCategory: string; total: number; completed: number; inProgress: number; notStarted: number; }
interface PublicImpact { totalResidents: number; activeResidents: number; reintegrated: number; reintegrationRate: number; totalSafehouses: number; totalDonationsPhp: number; caseByCategory: { category: string; count: number }[]; }
interface HealthScore { year: number; month: number; avgGeneralHealth: number; recordCount: number; }
interface EducationScore { educationLevel: string; avgProgress: number; recordCount: number; }

export default function Reports() {
  useDocumentTitle('Reports & Analytics');
  const [donationTrends, setDonationTrends] = useState<{ month: string; monetary: number }[]>([]);
  const [safehouses, setSafehouses] = useState<SafehouseData[]>([]);
  const [reintegration, setReintegration] = useState<{ summary: ReintegrationSummary[] }>({ summary: [] });
  const [publicImpact, setPublicImpact] = useState<PublicImpact | null>(null);
  const [healthScores, setHealthScores] = useState<HealthScore[]>([]);
  const [educationScores, setEducationScores] = useState<EducationScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [donRes, safehouseRes, reintRes, impactRes, healthRes, eduRes] = await Promise.all([
          fetch(`${API_BASE}/api/reports/donations-by-month`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/reports/residents-by-safehouse`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/reports/reintegration-success-rates`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/reports/public-impact`),
          fetch(`${API_BASE}/api/reports/avg-health-scores`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/reports/avg-education-scores`, { credentials: 'include' }),
        ]);

        if (donRes.ok) {
          const data: DonationMonth[] = await donRes.json();
          setDonationTrends(data.map(d => ({
            month: new Date(d.year, d.month - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' }),
            monetary: d.totalAmount,
          })));
        }
        if (safehouseRes.ok) setSafehouses(await safehouseRes.json());
        if (reintRes.ok) setReintegration(await reintRes.json());
        if (impactRes.ok) setPublicImpact(await impactRes.json());
        if (healthRes.ok) {
          const data: HealthScore[] = await healthRes.json();
          setHealthScores(data.slice(-6));
        }
        if (eduRes.ok) {
          const data: EducationScore[] = await eduRes.json();
          setEducationScores(data);
        }
      } catch (err) {
        console.error('Failed to fetch reports', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const categoryBreakdown = publicImpact?.caseByCategory.map(c => ({ name: c.category, value: c.count })) ?? [];
  const totalDonations = donationTrends.reduce((s, d) => s + d.monetary, 0);

  const healthChartData = healthScores.map(h => ({
    month: new Date(h.year, h.month - 1).toLocaleString('en-US', { month: 'short' }),
    avgHealth: h.avgGeneralHealth ? Math.round(h.avgGeneralHealth * 10) / 10 : 0,
  }));

  const eduChartData = educationScores.map(e => ({
    level: e.educationLevel || 'Unknown',
    avgProgress: e.avgProgress ? Math.round(e.avgProgress * 10) / 10 : 0,
    count: e.recordCount,
  }));

  const reintChartData = reintegration.summary.map(r => ({
    category: r.caseCategory,
    completed: r.completed,
    inProgress: r.inProgress,
    notStarted: r.notStarted,
  }));

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Reports &amp; Analytics</h1>
          <p>Aggregated insights and trends to support decision-making.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading report data...</div>
      ) : (
        <div>
          {/* KPI summary */}
          <div className="metrics-grid metrics-grid-4">
            <div className="metric-card metric-card-blue">
              <div className="metric-icon icon-blue"><Users size={18} /></div>
              <div className="metric-value">{publicImpact?.totalResidents ?? '—'}</div>
              <div className="metric-label">Total Records</div>
              <div className="metric-sub">{publicImpact?.activeResidents ?? 0} currently active</div>
            </div>
            <div className="metric-card metric-card-green">
              <div className="metric-icon icon-green"><TrendingUp size={18} /></div>
              <div className="metric-value">{publicImpact?.reintegrationRate ?? 0}%</div>
              <div className="metric-label">Reintegration Rate</div>
              <div className="metric-sub">{publicImpact?.reintegrated ?? 0} successfully reintegrated</div>
            </div>
            <div className="metric-card metric-card-rose">
              <div className="metric-icon icon-rose"><Heart size={18} /></div>
              <div className="metric-value">{formatCurrency(totalDonations)}</div>
              <div className="metric-label">Total Donations</div>
              <div className="metric-sub">{donationTrends.length} months of data</div>
            </div>
            <div className="metric-card metric-card-amber">
              <div className="metric-icon icon-amber"><BookOpen size={18} /></div>
              <div className="metric-value">{publicImpact?.totalSafehouses ?? '—'}</div>
              <div className="metric-label">Active Safe Houses</div>
              <div className="metric-sub">Across all regions</div>
            </div>
          </div>

          {/* Charts row */}
          <div className="charts-row">
            <div className="chart-card">
              <h2>Donation Trends (Monthly)</h2>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={donationTrends} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Line type="monotone" dataKey="monetary" name="Monetary" stroke="var(--primary)" strokeWidth={2} dot={false} />
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
          {reintChartData.length > 0 && (
            <div className="chart-card">
              <h2>Reintegration Outcomes by Category</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={reintChartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Completed" fill="var(--primary)" stackId="a" />
                  <Bar dataKey="inProgress" name="In Progress" fill="var(--blue)" stackId="a" />
                  <Bar dataKey="notStarted" name="Not Started" fill="var(--accent-dark)" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Health + Education */}
          <div className="charts-row">
            {healthChartData.length > 0 && (
              <div className="chart-card">
                <h2>Average Health Score (Monthly)</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={healthChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgHealth" name="Avg Health Score" stroke="var(--teal)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {eduChartData.length > 0 && (
              <div className="chart-card">
                <h2>Education Progress by Level</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={eduChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="level" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="avgProgress" name="Avg Progress %" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Safe house performance */}
          <div className="chart-card">
            <h2>Safe House Performance Comparison</h2>
            <div className="safehouse-perf-grid">
              {safehouses.map((sh) => {
                const utilization = sh.capacityGirls > 0 ? Math.round((sh.currentOccupancy / sh.capacityGirls) * 100) : 0;
                return (
                  <div key={sh.safehouseId} className="safehouse-perf-card">
                    <h3>{sh.name}</h3>
                    <div className="perf-stat">
                      <span>Occupancy</span>
                      <strong>{sh.currentOccupancy}/{sh.capacityGirls}</strong>
                    </div>
                    <div className="perf-stat">
                      <span>Active Residents</span>
                      <strong>{sh.activeResidents}</strong>
                    </div>
                    <div className="perf-stat">
                      <span>High Risk</span>
                      <strong style={{ color: sh.highRisk > 0 ? '#ef4444' : 'inherit' }}>{sh.highRisk}</strong>
                    </div>
                    <div className="perf-bar-wrapper">
                      <div className="perf-bar" style={{ width: `${utilization}%`, background: utilization >= 90 ? '#ef4444' : utilization >= 75 ? '#f59e0b' : '#10b981' }} />
                    </div>
                    <div className="perf-pct">{utilization}% utilized</div>
                  </div>
                );
              })}
            </div>
          </div>
           {/* Pipeline 2 — Funding Impact by Program Area */}
           <ImpactChart mode="admin" />
        </div>
      )}
    </div>
  );
}
