import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Users, Heart, Home, BookOpen, Activity } from 'lucide-react';
import { getApiBaseUrl } from '../../services/authApi';
import ImpactChart from '../../components/ui/ImpactChart';

const COLORS = [
  '#2d6a4f',
  '#c9375a',
  '#4f8a68',
  '#e99bb8',
  '#95c8a8',
  '#f7d3e1',
];

type PublicImpactResponse = {
  totalResidents: number;
  activeResidents: number;
  reintegrated: number;
  reintegrationRate: number;
  totalSafehouses: number;
  totalDonationsPhp: number;
  caseByCategory: Array<{ category: string; count: number }>;
  donationsByMonth: Array<{
    year: number;
    month: number;
    monetary: number;
    inKind: number;
    volunteer: number;
    totalAmount: number;
  }>;
  safehouses: Array<{
    name: string;
    city: string;
    capacityGirls: number;
    activeResidents: number;
    reintegratedResidents: number;
  }>;
  outcomeByCategory: Array<{
    category: string;
    reintegrated: number;
    inProgress: number;
    transferred: number;
  }>;
  outcomeByYear: Array<{
    year: number;
    reintegrated: number;
    transferred: number;
    independent: number;
  }>;
};

function formatCurrency(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

function AnimatedNumber({ value, duration = 1500 }: { value: string; duration?: number }) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    const prefix = value.match(/^[^0-9]*/)?.[0] ?? '';
    const suffix = value.match(/[^0-9.]+$/)?.[0] ?? '';
    const numStr = value.replace(prefix, '').replace(suffix, '');
    const num = parseFloat(numStr.replace(/,/g, ''));

    if (isNaN(num)) {
      setDisplay(value);
      return;
    }

    const timeout = setTimeout(() => {
      const startTime = performance.now();

      const tick = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(num * eased);

        if (value.includes(',') && current >= 1000) {
          setDisplay(prefix + current.toLocaleString('en-US') + suffix);
        } else if (value.includes('.') && suffix === 'M') {
          const decimal = (num * eased).toFixed(2);
          setDisplay(prefix + decimal + suffix);
        } else {
          setDisplay(prefix + current + suffix);
        }

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          setDisplay(value);
        }
      };

      requestAnimationFrame(tick);
    }, 100);

    return () => clearTimeout(timeout);
  }, [value, duration]);

  return <>{display}</>;
}

export default function ImpactDashboard() {
  const location = useLocation();
  const [impact, setImpact] = useState<PublicImpactResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightsLoaded, setHighlightsLoaded] = useState(false);

  useEffect(() => {
    if (location.hash === '#top') {
      window.scrollTo(0, 0);
    }
  }, [location.hash]);

  useEffect(() => {
    const controller = new AbortController();
    const loadImpact = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${getApiBaseUrl()}/api/reports/public-impact`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }
        const data = (await res.json()) as PublicImpactResponse;
        setImpact(data);
        setHighlightsLoaded(true);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError('Unable to load live impact metrics right now.');
      } finally {
        setLoading(false);
      }
    };
    loadImpact();
    return () => controller.abort();
  }, []);

  const impactHighlights = useMemo(() => {
    const totalResidents = impact?.totalResidents ?? 0;
    const activeResidents = impact?.activeResidents ?? 0;
    const reintegrated = impact?.reintegrated ?? 0;
    const reintegrationRate = impact?.reintegrationRate ?? 0;
    const totalDonations = impact?.totalDonationsPhp ?? 0;
    const totalSafehouses = impact?.totalSafehouses ?? 0;
    const categoryCount = impact?.caseByCategory.length ?? 0;
    const occupiedPct = totalResidents > 0 ? Math.round((activeResidents / totalResidents) * 100) : 0;
    return [
      { icon: Users, label: 'Total Residents Served', value: totalResidents.toLocaleString(), sub: 'All-time residents in records', color: 'blue' },
      { icon: Home, label: 'Currently in Safe Houses', value: activeResidents.toLocaleString(), sub: `Across ${totalSafehouses} active facilities`, color: 'green' },
      { icon: Heart, label: 'Total Reintegrated', value: reintegrated.toLocaleString(), sub: `${reintegrationRate}% reintegration rate`, color: 'rose' },
      { icon: TrendingUp, label: 'Total Donations', value: formatCurrency(totalDonations), sub: 'Aggregated donations in database', color: 'amber' },
      { icon: BookOpen, label: 'Case Categories Tracked', value: categoryCount.toLocaleString(), sub: 'Distinct categories in resident data', color: 'purple' },
      { icon: Activity, label: 'Current Occupancy Ratio', value: `${occupiedPct}%`, sub: 'Active residents / total residents', color: 'teal' },
    ];
  }, [impact]);

  const caseDistribution = useMemo(
    () => (impact?.caseByCategory ?? []).map((c) => ({ name: c.category || 'Unknown', value: c.count })),
    [impact]
  );

  const donationTrendData = useMemo(
    () =>
      (impact?.donationsByMonth ?? []).map((d) => ({
        month: `${String(d.month).padStart(2, '0')}/${String(d.year).slice(-2)}`,
        monetary: d.monetary,
        inKind: d.inKind,
        volunteer: d.volunteer,
      })),
    [impact]
  );

  const safeHouseData = useMemo(
    () =>
      (impact?.safehouses ?? []).map((s) => ({
        name: s.name,
        capacity: s.capacityGirls,
        occupied: s.activeResidents,
        reintegrated: s.reintegratedResidents,
      })),
    [impact]
  );

  const outcomeMetrics = useMemo(
    () => (impact?.outcomeByCategory ?? []).map((c) => ({ ...c, category: c.category || 'General' })),
    [impact]
  );

  const outcomeProgressData = useMemo(
    () => (impact?.outcomeByYear ?? []).map((x) => ({ ...x, year: String(x.year) })),
    [impact]
  );

  return (
    <div className="page-impact" id="top">
      <div className="impact-hero">
        <div className="container">
          <div className="section-label light">Transparent Impact</div>
          <h1>Our Impact in Numbers</h1>
          <p>
            Real, anonymized, aggregated data on how your support transforms lives.
            Data is loaded live from the production database.
          </p>
        </div>
      </div>

      <div className="container">
        {loading && (
          <div className="data-note">
            Loading live impact metrics...
          </div>
        )}
        {error && (
          <div className="data-note">
            <strong>Live Data Error:</strong> {error}
          </div>
        )}

        {/* Highlight cards */}
        <div className="impact-highlights-grid">
          {!highlightsLoaded
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="impact-highlight-card">
                  <div className="skeleton skeleton-value" />
                  <div className="skeleton skeleton-label" />
                  <div className="skeleton skeleton-sub" />
                </div>
              ))
            : impactHighlights.map((h) => (
                <div
                  key={h.label}
                  className={`impact-highlight-card impact-card-${h.color}`}
                >
                  <div className={`impact-card-icon icon-${h.color}`}>
                    <h.icon size={20} />
                  </div>
                  <div className="impact-card-value">
                    <AnimatedNumber value={h.value} />
                  </div>
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
              <AreaChart data={donationTrendData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMonetary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2d6a4f" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2d6a4f" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInKind" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c9375a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#c9375a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorVolunteer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#95c8a8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#95c8a8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Area type="monotone" dataKey="monetary" name="Monetary" stroke="#2d6a4f" fill="url(#colorMonetary)" strokeWidth={2} />
                <Area type="monotone" dataKey="inKind" name="In-Kind" stroke="#c9375a" fill="url(#colorInKind)" strokeWidth={2} />
                <Area type="monotone" dataKey="volunteer" name="Volunteer" stroke="#95c8a8" fill="url(#colorVolunteer)" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline 2 — Funding Impact by Program Area */}
        <div className="chart-section">
          <div className="chart-header">
            <h2>Where Your Money Has the Most Impact</h2>
            <p>Based on 3 years of data across 9 safehouses</p>
          </div>
          <ImpactChart mode="public" />
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
              <BarChart data={safeHouseData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={false} height={10} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: '8px' }} />
                <Bar dataKey="capacity" name="Capacity" fill="#95c8a8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="occupied" name="Occupied" fill="#2d6a4f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reintegrated" name="Reintegrated (All Time)" fill="#c9375a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '4px' }}>
              9 safehouses — hover over bars for details
            </p>
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
              <BarChart data={outcomeMetrics} margin={{ top: 5, right: 20, left: 0, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} width={110} />
                <Tooltip />
                <Legend />
                <Bar dataKey="reintegrated" name="Reintegrated" fill="#2d6a4f" stackId="a" />
                <Bar dataKey="inProgress" name="In Progress" fill="#95c8a8" stackId="a" />
                <Bar dataKey="transferred" name="Transferred" fill="#c9375a" stackId="a" />
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
                <Bar dataKey="reintegrated" name="Reintegrated" fill="#2d6a4f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="transferred" name="Transferred" fill="#c9375a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="independent" name="Independent Living" fill="#95c8a8" radius={[4, 4, 0, 0]} />
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