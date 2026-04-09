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

const POST_TYPE_COLORS: Record<string, string> = {
  'ImpactStory':        'rose',
  'FundraisingAppeal':  'amber',
  'Campaign':           'blue',
  'ThankYou':           'green',
  'EducationalContent': 'blue',
  'EventPromotion':     'green',
};

// Normalized targets (midpoints of best-practice ranges)
const POST_TYPE_TARGETS: Record<string, number> = {
  'ImpactStory':        0.319,
  'FundraisingAppeal':  0.171,
  'Campaign':           0.171,
  'ThankYou':           0.147,
  'EducationalContent': 0.122,
  'EventPromotion':     0.073,
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
  const color = POST_TYPE_COLORS[postType ?? ''] ?? 'blue';
  return <span className={`badge badge-${color}`}>{formatLabel(postType)}</span>;
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

  return (
    <button
      onClick={onSelect}
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'space-between',
        aspectRatio:    '1 / 1',
        padding:        '0.6rem 0.4rem',
        background:     isSelected
          ? 'var(--blue-50)'
          : isToday
          ? 'var(--blue-50)'
          : 'var(--white)',
        border:         isSelected
          ? '2px solid var(--blue-500)'
          : isToday
          ? '2px solid var(--blue-300)'
          : '1px solid var(--gray-200)',
        borderRadius:   '0.5rem',
        cursor:         'pointer',
        textAlign:      'center',
        transition:     'background 0.15s, border-color 0.15s',
        minWidth:       0,
      }}
    >
      {/* Weekday */}
      <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {weekday}
      </span>

      {/* Date number */}
      <span style={{
        fontSize:   '1.4rem',
        fontWeight: 700,
        lineHeight: 1,
        color:      isSelected || isToday ? 'var(--blue-600)' : 'var(--gray-800)',
      }}>
        {day}
      </span>

      {/* Month */}
      <span style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>
        {month}
      </span>

      {/* Indicators */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
        <span style={{
          fontSize:        '0.6rem',
          background:      'var(--gray-100)',
          color:           'var(--gray-600)',
          borderRadius:    '999px',
          padding:         '0.1rem 0.4rem',
          fontWeight:      600,
        }}>
          {posts.length} post{posts.length !== 1 ? 's' : ''}
        </span>
        {boostedCount > 0 && (
          <span style={{
            fontSize:     '0.6rem',
            background:   'var(--amber-100)',
            color:        'var(--amber-700)',
            borderRadius: '999px',
            padding:      '0.1rem 0.4rem',
            fontWeight:   600,
            display:      'flex',
            alignItems:   'center',
            gap:          '0.15rem',
          }}>
            <Zap size={8} />
            {boostedCount}
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
            <tr key={post.scheduleId} style={post.isBoosted ? { background: 'var(--amber-50)' } : undefined}>
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

export default function PostingSchedulePage() {
  const [schedule, setSchedule]       = useState<PostingSchedule[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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
  }, []);

  // Group posts by date (ordered)
  const byDate = schedule.reduce<Record<string, PostingSchedule[]>>((acc, post) => {
    (acc[post.scheduleDate] ??= []).push(post);
    return acc;
  }, {});
  const dates    = Object.keys(byDate).sort();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Summary stats
  const totalPosts   = schedule.length;
  const boostedPosts = schedule.filter(p => p.isBoosted).length;
  const avgReferrals = totalPosts > 0
    ? (schedule.reduce((s, p) => s + (p.predictedReferrals ?? 0), 0) / totalPosts).toFixed(1)
    : '—';
  const computedAt = schedule[0]?.computedAt
    ? new Date(schedule[0].computedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  // Post type breakdown
  const postTypeTotals = schedule.reduce<Record<string, number>>((acc, p) => {
    const pt = p.postType ?? 'Unknown';
    acc[pt] = (acc[pt] ?? 0) + 1;
    return acc;
  }, {});

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
            Your 7-day social media plan, optimized to drive donation referrals.
            The two highest-impact posts each week are flagged for boosting.
          </p>
        </div>
        <div className="header-date">
          <Clock size={14} />
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Summary cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="metric-card metric-card-green">
          <div className="metric-icon icon-green"><TrendingUp size={20} /></div>
          <div className="metric-value">{avgReferrals}</div>
          <div className="metric-label">Expected Referrals</div>
          <div className="metric-sub">{computedAt ? `Updated ${computedAt}` : 'From recommendation model'}</div>
        </div>
        <div className="metric-card metric-card-amber">
          <div className="metric-icon icon-amber"><Zap size={20} /></div>
          <div className="metric-value">{boostedPosts}</div>
          <div className="metric-label">Boosted Posts</div>
          <div className="metric-sub">Highest-impact posts this week</div>
        </div>
      </div>

      {/* Content mix */}
      {totalPosts > 0 && (
        <div className="dashboard-card" style={{ marginBottom: '1rem' }}>
          <div className="card-header" style={{ paddingBottom: '0.5rem' }}>
            <h2>Post Type Breakdown</h2>
            <span className="card-sub">How this week's posts are distributed by content type</span>
          </div>

          {/* Stacked bar */}
          <div style={{ padding: '0.5rem 1.25rem 0', display: 'flex', height: '10px', borderRadius: '999px', overflow: 'hidden', gap: '2px' }}>
            {Object.entries(POST_TYPE_TARGETS).map(([pt]) => {
              const count = postTypeTotals[pt] ?? 0;
              const pct   = totalPosts > 0 ? (count / totalPosts) * 100 : 0;
              const color = POST_TYPE_COLORS[pt] ?? 'blue';
              const colorMap: Record<string, string> = {
                blue:  'var(--blue-400)',
                rose:  'var(--rose-400)',
                amber: 'var(--amber-400)',
                green: 'var(--green-400)',
              };
              return pct > 0 ? (
                <div
                  key={pt}
                  style={{ width: `${pct}%`, background: colorMap[color], borderRadius: '999px', flexShrink: 0 }}
                  title={`${formatLabel(pt)}: ${Math.round(pct)}%`}
                />
              ) : null;
            })}
          </div>

          {/* Legend */}
          <div style={{ padding: '0.75rem 1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {Object.entries(POST_TYPE_TARGETS).map(([pt, target]) => {
              const count     = postTypeTotals[pt] ?? 0;
              const actual    = totalPosts > 0 ? count / totalPosts : 0;
              const targetPct = Math.round(target * 100);
              const actualPct = Math.round(actual * 100);
              const onTrack   = Math.abs(actual - target) <= 0.1;
              const color     = POST_TYPE_COLORS[pt] ?? 'blue';
              return (
                <div key={pt} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
                  <span className={`badge badge-${color}`} style={{ minWidth: 110, textAlign: 'center' }}>{formatLabel(pt)}</span>
                  <span style={{ color: 'var(--gray-700)', fontWeight: 600 }}>{count} post{count !== 1 ? 's' : ''}</span>
                  <span style={{ color: 'var(--gray-400)' }}>·</span>
                  <span style={{ color: 'var(--gray-500)' }}>
                    {actualPct}% of week
                    <span style={{ color: 'var(--gray-400)' }}> (target {targetPct}%)</span>
                  </span>
                  {count > 0 && (
                    <span style={{ color: onTrack ? 'var(--green-500)' : 'var(--amber-500)', fontWeight: 600, fontSize: '0.75rem' }}>
                      {onTrack ? '✓' : '!'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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

          {/* Square day tiles */}
          <div style={{
            display:             'grid',
            gridTemplateColumns: `repeat(${dates.length}, 1fr)`,
            gap:                 '0.5rem',
          }}>
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

          {/* Detail table for selected day */}
          {selectedDay && selectedPosts.length > 0 && (
            <DayDetail posts={selectedPosts} />
          )}
        </div>
      )}
    </div>
  );
}
