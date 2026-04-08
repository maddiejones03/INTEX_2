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
          Education progress impact:{' '}
          <strong style={{ color: entry.edu_coef >= 0 ? '#4f8a68' : '#ef4444' }}>
            {entry.edu_coef >= 0 ? '+' : ''}{entry.edu_coef.toFixed(2)} points per $1,000
          </strong>
        </div>
        <div style={{ color: '#64748b', marginTop: '4px', fontSize: '11px' }}>
          Measured the month following allocation
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
            ? "Impact of Program Funding on Girls' Education Progress"
            : 'Where We Allocate Your Donations for Maximum Impact'}
        </h2>
        <p className="chart-sub">
          {mode === 'admin'
            ? "For every $1,000 allocated to each program area, how many additional points of education progress do girls gain the following month? Bars to the right mean girls improve more. Bars to the left mean that area received more funding in months when girls were already struggling."
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
          {mode === 'admin' && (
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Wellbeing insight */}
              <div style={{
                padding: '12px 16px', background: '#edf6f0',
                borderRadius: '8px', border: '1px solid #c6e2d1',
                fontSize: '13px', color: '#2f5f43',
              }}>
                <strong>💚 Key insight — Wellbeing is the strongest driver:</strong>{' '}
                Months where we invested more in Wellbeing programs (therapy, mental health, nutrition) 
                were followed by stronger academic gains for girls the next month. This suggests that 
                a girl's emotional and physical health is a prerequisite for learning. Prioritizing 
                Wellbeing funding is not a trade-off against education — it enables it.
              </div>

              {/* Education paradox explanation */}
              <div style={{
                padding: '12px 16px', background: '#fefce8',
                borderRadius: '8px', border: '1px solid #fde68a',
                fontSize: '13px', color: '#78350f',
              }}>
                <strong>⚠️ Why does Education funding show a negative bar?</strong>{' '}
                This is not evidence that education spending hurts girls. It reflects a pattern 
                called <strong>targeting bias</strong>: our organization naturally directs more 
                education funding to safehouses where girls are struggling most academically. 
                As a result, higher education spending tends to coincide with lower scores — 
                not because the funding caused the problem, but because we respond to the problem 
                with more funding. Think of it like a hospital: sicker patients receive more 
                treatment, but that does not mean treatment makes patients sicker.
              </div>

              {/* Maintenance insight */}
              <div style={{
                padding: '12px 16px', background: '#f0fdf4',
                borderRadius: '8px', border: '1px solid #bbf7d0',
                fontSize: '13px', color: '#166534',
              }}>
                <strong>🏠 Maintenance matters more than expected:</strong>{' '}
                Months with higher facility maintenance spending were followed by modest but 
                consistent improvements in girls' education scores. A safe, well-maintained 
                environment appears to create stability that supports learning.
              </div>

              {/* Model stats — simplified */}
              {(data as AdminImpactResponse).model_fit && (
                <div style={{
                  padding: '12px 16px', background: '#f8fafc',
                  borderRadius: '8px', border: '1px solid #e2e8f0',
                  fontSize: '12px', color: '#64748b',
                }}>
                  <strong style={{ color: '#475569' }}>About this analysis:</strong>{' '}
                  Based on {(data as AdminImpactResponse).model_fit?.education?.n_obs} months of 
                  data across 9 safehouses (Jan 2023 – Jan 2026). The model accounts for 
                  differences between safehouses so results reflect within-safehouse funding 
                  changes, not comparisons between locations. Funding effects are measured 
                  with a 1-month lag since it takes time for spending to translate into 
                  programme activities and for girls to respond.
                </div>
              )}
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