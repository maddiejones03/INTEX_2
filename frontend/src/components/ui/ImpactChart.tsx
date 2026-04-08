import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5030';

interface ProgramAreaEntry {
  rank: number;
  program_area: string;
  edu_coef: number;
  health_coef: number;
  avg_impact: number;
}

interface PublicImpactResponse {
  generatedAt: string;
  unit: string;
  topProgramArea: string;
  topEduImpact: number;
  programAreaRanking: ProgramAreaEntry[];
}

interface AdminImpactResponse extends PublicImpactResponse {
  model: string;
  model_fit: {
    education: { r_squared: number; adj_r_squared: number; n_obs: number; f_pvalue: number };
    health:    { r_squared: number; adj_r_squared: number; n_obs: number; f_pvalue: number };
  };
  education_progress_coefficients: Record<string, number>;
  health_score_coefficients:        Record<string, number>;
}

interface ImpactChartProps {
  mode: 'public' | 'admin';
}

function barColor(value: number): string {
  if (value > 0.5)  return '#4f8a68';
  if (value > 0)    return '#9fc5b0';
  if (value > -0.5) return '#f59e0b';
  return '#ef4444';
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload as ProgramAreaEntry;
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0',
      borderRadius: '8px', padding: '10px 14px', fontSize: '13px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: '6px', color: '#1e293b' }}>
        {label}
      </div>
      <div style={{ color: '#475569' }}>
        Education impact:{' '}
        <strong style={{ color: entry.edu_coef >= 0 ? '#4f8a68' : '#ef4444' }}>
          {entry.edu_coef >= 0 ? '+' : ''}{entry.edu_coef.toFixed(2)} pts
        </strong>
      </div>
      <div style={{ color: '#475569' }}>
        Health impact:{' '}
        <strong style={{ color: entry.health_coef >= 0 ? '#4f8a68' : '#ef4444' }}>
          {entry.health_coef >= 0 ? '+' : ''}{entry.health_coef.toFixed(4)} pts
        </strong>
      </div>
      <div style={{ color: '#64748b', marginTop: '4px', fontSize: '11px' }}>
        Per $1,000 allocated (lagged 1 month)
      </div>
    </div>
  );
}

export default function ImpactChart({ mode }: ImpactChartProps) {
  const [data, setData]       = useState<PublicImpactResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const endpoint = mode === 'admin'
      ? `${API_BASE}/api/reports/program-impact`
      : `${API_BASE}/api/reports/public-program-impact`;

    const fetchData = async () => {
      try {
        const res = await fetch(endpoint, {
          credentials: mode === 'admin' ? 'include' : 'omit',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (mode === 'admin') {
          setData({
            generatedAt:        json.generated_at,
            unit:               json.unit,
            topProgramArea:     json.top_program_area,
            topEduImpact:       json.top_edu_impact,
            programAreaRanking: json.program_area_ranking,
          });
        } else {
          setData(json);
        }
        setError(null);
      } catch (err) {
        setError('Failed to load program impact data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mode]);

  // Public mode: only show program areas with positive avg_impact
  const chartData = mode === 'public'
    ? (data?.programAreaRanking ?? []).filter(d => d.avg_impact > 0)
    : (data?.programAreaRanking ?? []);

  const topArea   = data?.topProgramArea ?? 'Wellbeing';
  const topImpact = data?.topEduImpact ?? 0;

  return (
    <div className="chart-card">
      <div style={{ marginBottom: '1rem' }}>
        <h2>
          {mode === 'admin'
            ? 'Funding Impact by Program Area (OLS Model)'
            : 'Where We Allocate Your Donations for Maximum Impact'}
        </h2>
        <p className="chart-sub">
          {mode === 'admin'
            ? 'Change in resident education progress per $1,000 allocated, controlling for safehouse differences (lagged 1 month). Model B — OLS with safehouse fixed effects.'
            : 'Our allocation decisions are guided by 3 years of outcome data across 9 safehouses. Here is where your donations create the most measurable impact.'}
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
          Loading impact data...
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Donor-friendly headline card (public only) */}
          {mode === 'public' && (
            <div style={{
              background: '#edf6f0',
              border: '1px solid #c6e2d1',
              borderRadius: '10px',
              padding: '16px 20px',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
            }}>
              <div style={{
                fontSize: '28px', lineHeight: 1,
                flexShrink: 0, marginTop: '2px',
              }}>
                💚
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#2f5f43', marginBottom: '4px' }}>
                  Your donation moves girls forward in school
                </div>
                <div style={{ fontSize: '14px', color: '#3d7a57', lineHeight: 1.6 }}>
                  When we invest in <strong>{topArea}</strong> programs, each girl
                  in our care gains an average of{' '}
                  <strong>+{topImpact.toFixed(2)} points</strong> of academic
                  progress the following month — roughly one full month of
                  measurable learning. Across a safehouse of 20 girls, a single
                  $1,000 allocation generates over{' '}
                  <strong>{Math.round(topImpact * 20)} points</strong> of combined
                  educational progress. Your generosity directly funds the programs
                  where evidence shows girls thrive most.
                </div>
              </div>
            </div>
          )}

          {/* Admin headline (admin only) */}
          {mode === 'admin' && (
            <div style={{
              background: '#edf6f0', border: '1px solid #c6e2d1',
              borderRadius: '8px', padding: '12px 16px',
              marginBottom: '1.25rem', fontSize: '14px', color: '#2f5f43',
            }}>
              <strong>Top finding:</strong> For every $1,000 allocated to{' '}
              <strong>{topArea}</strong>, resident education progress improves
              by an average of <strong>+{topImpact.toFixed(2)} points</strong>{' '}
              the following month.
            </div>
          )}

          {/* Bar chart */}
          <ResponsiveContainer width="100%" height={mode === 'public' ? 180 : 280}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 20 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`}
                label={{
                  value: 'Points per $1,000 (education progress)',
                  position: 'insideBottom',
                  offset: -12,
                  fontSize: 11,
                  fill: '#94a3b8',
                }}
              />
              <YAxis
                type="category"
                dataKey="program_area"
                tick={{ fontSize: 12 }}
                width={90}
              />
              <Tooltip content={<CustomTooltip />} />
              {mode === 'admin' && (
                <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1} />
              )}
              <Bar dataKey="edu_coef" name="Education impact" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={barColor(entry.edu_coef)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Color legend — admin only */}
          {mode === 'admin' && (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem', fontSize: '11px', color: '#64748b' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#4f8a68', borderRadius: 2, marginRight: 4 }} />Strong positive</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#9fc5b0', borderRadius: 2, marginRight: 4 }} />Mild positive</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#f59e0b', borderRadius: 2, marginRight: 4 }} />Mild negative</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ef4444', borderRadius: 2, marginRight: 4 }} />Strong negative</span>
            </div>
          )}

          {/* Admin model fit stats */}
          {mode === 'admin' && (data as AdminImpactResponse).model_fit && (
            <div style={{
              marginTop: '1.25rem', padding: '12px 16px',
              background: '#f8fafc', borderRadius: '8px',
              border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b',
            }}>
              <strong style={{ color: '#475569' }}>Model fit (OLS with safehouse fixed effects):</strong>
              <span style={{ marginLeft: '12px' }}>
                Education R² = {(data as AdminImpactResponse).model_fit?.education?.r_squared?.toFixed(3)}
              </span>
              <span style={{ marginLeft: '12px' }}>
                Health R² = {(data as AdminImpactResponse).model_fit?.health?.r_squared?.toFixed(3)}
              </span>
              <span style={{ marginLeft: '12px' }}>
                n = {(data as AdminImpactResponse).model_fit?.education?.n_obs} safehouse-months
              </span>
              <div style={{ marginTop: '6px', color: '#94a3b8', fontStyle: 'italic' }}>
                Note: Negative Education coefficient reflects targeting bias — struggling safehouses receive more education funding because they need it most, not because funding is harmful.
              </div>
            </div>
          )}

          <div style={{ marginTop: '0.5rem', fontSize: '11px', color: '#94a3b8' }}>
            Last updated: {new Date(data.generatedAt).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </div>
        </>
      )}
    </div>
  );
}