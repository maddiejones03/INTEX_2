import { useEffect, useState } from 'react';
import { Clock, AlertCircle, ChevronRight, Zap, TrendingUp } from 'lucide-react';
import { apiFetch } from '../../services/apiClient';
import type { PostingSchedule } from '../../types/index';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: 'rose',
  TikTok:    'blue',
  Facebook:  'blue',
  LinkedIn:  'green',
  WhatsApp:  'green',
  YouTube:   'rose',
  Twitter:   'blue',
};


function formatLabel(val: string | null): string {
  if (!val) return '—';
  return val.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function formatHour(hour: number | null): string {
  if (hour == null) return '—';
  const period = hour >= 12 ? 'pm' : 'am';
  const h = hour % 12 || 12;
  return `${h}${period}`;
}

function formatDayParts(dateStr: string): { weekday: string; day: string; month: string } {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    weekday: d.toLocaleDateString('en-PH', { weekday: 'short' }),
    day:     d.toLocaleDateString('en-PH', { day: 'numeric' }),
    month:   d.toLocaleDateString('en-PH', { month: 'short' }),
  };
}

function PlatformBadge({ platform }: { platform: string | null }) {
  const color = PLATFORM_COLORS[platform ?? ''] ?? 'blue';
  return <span className={`badge badge-${color}`}>{platform ?? '—'}</span>;
}

function PostTypeBadge({ postType }: { postType: string | null }) {
  return (
    <span style={{
      display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '999px',
      fontSize: '0.75rem', fontWeight: 600,
      background: 'var(--gray-100)', color: 'var(--gray-600)', border: '1px solid var(--gray-200)',
    }}>
      {formatLabel(postType)}
    </span>
  );
}

// ─── Calendar Day Tile ────────────────────────────────────────────────────────

interface DayTileProps {
  dateStr:    string;
  posts:      PostingSchedule[];
  isToday:    boolean;
  isSelected: boolean;
  onSelect:   () => void;
}

function DayTile({ dateStr, posts, isToday, isSelected, onSelect }: DayTileProps) {
  const { weekday, day, month } = formatDayParts(dateStr);
  const boostedCount = posts.filter(p => p.isBoosted).length;

  const bg         = isSelected ? 'var(--green)'               : isToday ? 'var(--green-light)'    : '#fff';
  const border     = isSelected ? '2px solid var(--green)'     : isToday ? '2px solid var(--green)' : '1px solid var(--gray-200)';
  const textColor  = isSelected ? 'rgba(255,255,255,0.85)'    : 'var(--gray-500)';
  const dayColor   = isSelected ? 'white'                     : isToday ? 'var(--green)'           : 'var(--gray-800)';
  const monthColor = isSelected ? 'rgba(255,255,255,0.75)'    : 'var(--gray-400)';
  const chipBg     = isSelected ? 'rgba(255,255,255,0.2)'     : 'var(--gray-100)';
  const chipColor  = isSelected ? 'white'                     : 'var(--gray-600)';

  return (
    <button onClick={onSelect} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'space-between', aspectRatio: '1 / 1', padding: '0.6rem 0.4rem',
      background: bg, border, borderRadius: '0.5rem', cursor: 'pointer',
      textAlign: 'center', transition: 'background 0.15s, border-color 0.15s', minWidth: 0,
    }}>
      <span style={{ fontSize: '0.7rem', color: textColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {weekday}
      </span>
      <span style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1, color: dayColor }}>
        {day}
      </span>
      <span style={{ fontSize: '0.65rem', color: monthColor }}>{month}</span>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
        <span style={{ fontSize: '0.6rem', background: chipBg, color: chipColor, borderRadius: '999px', padding: '0.1rem 0.4rem', fontWeight: 600 }}>
          {posts.length} post{posts.length !== 1 ? 's' : ''}
        </span>
        {boostedCount > 0 && (
          <span style={{ fontSize: '0.6rem', background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--gray-100)', color: isSelected ? 'white' : 'var(--gray-500)', borderRadius: '999px', padding: '0.1rem 0.4rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
            <Zap size={8} />{boostedCount}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Day Detail Panel ─────────────────────────────────────────────────────────

function DayDetail({ posts }: { posts: PostingSchedule[] }) {
  return (
    <div className="dashboard-card" style={{ marginTop: '0.75rem', overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Platform</th>
            <th>Time</th>
            <th>Post Type</th>
            <th>Media</th>
            <th>Tone</th>
            <th>Call to Action</th>
            <th>Boosted</th>
            <th>Resident Story</th>
          </tr>
        </thead>
        <tbody>
          {posts.map(post => (
            <tr key={post.scheduleId}>
              <td><PlatformBadge platform={post.platform} /></td>
              <td>{formatHour(post.postHour)}</td>
              <td><PostTypeBadge postType={post.postType} /></td>
              <td>{formatLabel(post.mediaType)}</td>
              <td>{formatLabel(post.sentimentTone)}</td>
              <td>
                {post.hasCallToAction
                  ? <span className="badge badge-green">{formatLabel(post.callToActionType)}</span>
                  : <span style={{ color: 'var(--gray-400)' }}>None</span>}
              </td>
              <td>
                {post.isBoosted
                  ? <span className="badge badge-amber"><Zap size={11} style={{ marginRight: 2 }} />Boosted</span>
                  : <span style={{ color: 'var(--gray-400)' }}>—</span>}
              </td>
              <td>
                {post.featuresResidentStory
                  ? <span className="badge badge-rose">Yes</span>
                  : <span style={{ color: 'var(--gray-400)' }}>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

interface BoostOkr {
  totalBoostBudgetPhp: number;
  totalDonationsPhp:   number;
  roi:                 number | null;
}

export default function PostingSchedulePage() {
  const [schedule, setSchedule]       = useState<PostingSchedule[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [okr, setOkr]                 = useState<BoostOkr | null>(null);

  useEffect(() => {
    apiFetch<PostingSchedule[]>('/api/postingschedule')
      .then(data => {
        setSchedule(data);
        const today = new Date().toISOString().slice(0, 10);
        const hasToday = data.some(p => p.scheduleDate === today);
        setSelectedDay(hasToday ? today : (data[0]?.scheduleDate ?? null));
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load schedule.'))
      .finally(() => setLoading(false));

    apiFetch<BoostOkr>('/api/postingschedule/boost-okr')
      .then(setOkr)
      .catch(() => setOkr(null));
  }, []);

  const byDate = schedule.reduce<Record<string, PostingSchedule[]>>((acc, post) => {
    (acc[post.scheduleDate] ??= []).push(post);
    return acc;
  }, {});
  const dates    = Object.keys(byDate).sort();
  const todayStr = new Date().toISOString().slice(0, 10);

  const totalPosts   = schedule.length;
  const boostedPosts = schedule.filter(p => p.isBoosted).length;
  const avgReferrals = totalPosts > 0
    ? (schedule.reduce((s, p) => s + (p.predictedReferrals ?? 0), 0) / totalPosts).toFixed(1)
    : '—';
  const computedAt = schedule[0]?.computedAt
    ? new Date(schedule[0].computedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;


  // ROI label
  const roiLabel = (() => {
    if (!okr || okr.totalBoostBudgetPhp === 0) return null;
    const perPeso = okr.totalDonationsPhp / okr.totalBoostBudgetPhp;
    return `₱${perPeso.toFixed(2)}`;
  })();

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-page-header"><h1>Posting Schedule</h1></div>
        <p className="loading-text">Building your posting schedule — selecting best posts for boosting...</p>
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

  const selectedPosts = selectedDay ? (byDate[selectedDay] ?? []) : [];

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1>Posting Schedule</h1>
          <p>
            Your 7-day recommended posting plan across all platformm to maximize donation referrals.
            The two posts predicted to generate the most referrals each week are flagged for paid boosting.
          </p>
        </div>
        <div className="header-date">
          <Clock size={14} />
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Top stats row — 3 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>

        {/* Boosted Post ROI */}
        <div className="metric-card metric-card-green" style={{ justifyContent: 'center', gap: '0.4rem' }}>
          <div className="metric-icon icon-green"><TrendingUp size={20} /></div>
          <div className="metric-value">{roiLabel ?? '₱0.00'}</div>
          <div className="metric-label">Boosted Post ROI</div>
          <div className="metric-sub">in donations for every ₱1 spent on boosting</div>
        </div>

        {/* Expected Referrals */}
        <div className="metric-card metric-card-blue">
          <div className="metric-icon icon-blue"><TrendingUp size={20} /></div>
          <div className="metric-value">{avgReferrals}</div>
          <div className="metric-label">Expected Referrals per post</div>
          <div className="metric-sub">{computedAt ? `Updated ${computedAt}` : 'From recommendation model'}</div>
        </div>

        {/* Boosted Posts */}
        <div className="metric-card metric-card-amber">
          <div className="metric-icon icon-amber"><Zap size={20} /></div>
          <div className="metric-value">{boostedPosts}</div>
          <div className="metric-label">Boosted Posts</div>
          <div className="metric-sub">Highest-impact posts this week</div>
        </div>

      </div>

      {/* 7-day calendar */}
      {dates.length === 0 ? (
        <div className="dashboard-card" style={{ padding: '1.5rem', color: 'var(--gray-500)' }}>
          No schedule available. The recommendation model hasn't run yet for this week.
        </div>
      ) : (
        <div className="dashboard-card" style={{ padding: '1rem 1.25rem 1.25rem' }}>
          <div className="card-header" style={{ paddingBottom: '0.75rem' }}>
            <h2>This Week</h2>
            {selectedDay && (
              <span className="card-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <ChevronRight size={13} />
                {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${dates.length}, 1fr)`, gap: '0.5rem' }}>
            {dates.map(dateStr => (
              <DayTile
                key={dateStr}
                dateStr={dateStr}
                posts={byDate[dateStr]}
                isToday={dateStr === todayStr}
                isSelected={selectedDay === dateStr}
                onSelect={() => setSelectedDay(dateStr)}
              />
            ))}
          </div>

          {selectedDay && selectedPosts.length > 0 && (
            <DayDetail posts={selectedPosts} />
          )}
        </div>
      )}
    </div>
  );
}
