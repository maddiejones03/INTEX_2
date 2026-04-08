import { useEffect, useState } from 'react';
import { Calendar, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { apiFetch } from '../../services/apiClient';
import type { PostingSchedule } from '../../types/index';

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: 'rose',
  TikTok:    'blue',
  Facebook:  'blue',
  LinkedIn:  'green',
  WhatsApp:  'green',
  YouTube:   'rose',
};

function PlatformBadge({ platform }: { platform: string | null }) {
  const color = PLATFORM_COLORS[platform ?? ''] ?? 'blue';
  return <span className={`badge badge-${color}`}>{platform ?? '—'}</span>;
}

function ProbBar({ value }: { value: number | null }) {
  const pct = value != null ? Math.round(value * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div className="prob-bar-track" style={{ width: 60 }}>
        <div className="prob-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="prob-label">{value != null ? `${pct}%` : '—'}</span>
    </div>
  );
}

function formatHour(hour: number | null): string {
  if (hour == null) return '—';
  const period = hour >= 12 ? 'pm' : 'am';
  const h = hour % 12 || 12;
  return `${h}${period}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function PostingSchedule() {
  const [schedule, setSchedule] = useState<PostingSchedule[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    apiFetch<PostingSchedule[]>('/api/postingschedule')
      .then(setSchedule)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load schedule.'))
      .finally(() => setLoading(false));
  }, []);

  const avgReferrals = schedule.length > 0
    ? (schedule.reduce((s, r) => s + (r.predictedReferrals ?? 0), 0) / schedule.length).toFixed(1)
    : '—';

  const bestDay = schedule.reduce<PostingSchedule | null>((best, row) =>
    (row.predictedReferrals ?? 0) > (best?.predictedReferrals ?? -1) ? row : best, null
  );

  const computedAt = schedule[0]?.computedAt
    ? new Date(schedule[0].computedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-page-header"><h1>Posting Schedule</h1></div>
        <p className="loading-text">Loading schedule...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <div className="admin-page-header"><h1>Posting Schedule</h1></div>
        <div className="error-banner"><AlertCircle size={16} /><span>{error}</span></div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1>Posting Schedule</h1>
          <p>ML-recommended post configurations to maximise donation referrals over the next 7 days.</p>
        </div>
        <div className="header-date">
          <Clock size={14} />
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Summary cards */}
      <div className="metrics-grid">
        <div className="metric-card metric-card-blue">
          <div className="metric-icon icon-blue"><Calendar size={20} /></div>
          <div className="metric-value">{schedule.length}</div>
          <div className="metric-label">Days Scheduled</div>
          <div className="metric-sub">{computedAt ? `Computed ${computedAt}` : 'From ML model'}</div>
        </div>
        <div className="metric-card metric-card-green">
          <div className="metric-icon icon-green"><TrendingUp size={20} /></div>
          <div className="metric-value">{avgReferrals}</div>
          <div className="metric-label">Avg Predicted Referrals</div>
          <div className="metric-sub">Per recommended post</div>
        </div>
        <div className="metric-card metric-card-rose">
          <div className="metric-icon icon-rose"><TrendingUp size={20} /></div>
          <div className="metric-value">{bestDay?.predictedReferrals?.toFixed(1) ?? '—'}</div>
          <div className="metric-label">Best Day</div>
          <div className="metric-sub">
            {bestDay ? `${bestDay.dayOfWeek} on ${bestDay.platform ?? '?'}` : '—'}
          </div>
        </div>
        <div className="metric-card metric-card-amber">
          <div className="metric-icon icon-amber"><Calendar size={20} /></div>
          <div className="metric-value">
            {schedule.filter(r => (r.pAnyReferral ?? 0) >= 0.7).length}
          </div>
          <div className="metric-label">High-Confidence Days</div>
          <div className="metric-sub">P(referral) ≥ 70%</div>
        </div>
      </div>

      {/* Schedule table */}
      <div className="dashboard-card">
        <div className="card-header">
          <h2>7-Day Recommended Schedule</h2>
          <span className="card-sub">One optimal post config per day, ranked by predicted referrals</span>
        </div>

        {schedule.length === 0 ? (
          <p style={{ padding: '1.5rem', color: 'var(--gray-500)' }}>
            No schedule available. Run <code>run_referral_inference.py</code> to generate recommendations.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Platform</th>
                  <th>Best Time</th>
                  <th>Post Type</th>
                  <th>Media</th>
                  <th>Tone</th>
                  <th>CTA</th>
                  <th>Boosted</th>
                  <th>Resident Story</th>
                  <th>P(Any Referral)</th>
                  <th>Predicted Referrals</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr key={row.scheduleDate}>
                    <td><strong>{formatDate(row.scheduleDate)}</strong></td>
                    <td><PlatformBadge platform={row.platform} /></td>
                    <td>{formatHour(row.postHour)}</td>
                    <td>{row.postType ?? '—'}</td>
                    <td>{row.mediaType ?? '—'}</td>
                    <td>{row.sentimentTone ?? '—'}</td>
                    <td>
                      {row.hasCallToAction
                        ? <span className="badge badge-green">{row.callToActionType ?? 'Yes'}</span>
                        : <span style={{ color: 'var(--gray-400)' }}>None</span>}
                    </td>
                    <td>
                      {row.isBoosted
                        ? <span className="badge badge-amber">Boosted</span>
                        : <span style={{ color: 'var(--gray-400)' }}>No</span>}
                    </td>
                    <td>
                      {row.featuresResidentStory
                        ? <span className="badge badge-rose">Yes</span>
                        : <span style={{ color: 'var(--gray-400)' }}>No</span>}
                    </td>
                    <td><ProbBar value={row.pAnyReferral} /></td>
                    <td>
                      <strong>{row.predictedReferrals?.toFixed(1) ?? '—'}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
