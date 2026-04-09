import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5030';

interface RiskReason {
  code: string;
  label: string;
  direction: 'increases_risk' | 'decreases_risk';
}

interface DonorRiskEntry {
  supporterId: number;
  displayName: string;
  riskTier: 'High' | 'Medium' | 'Low';
  riskScore: number;
  priorityScore: number;
  lifetimeValuePhp: number;
  daysSinceLastDonation: number;
  gapRatio: number;
  lastScoredAt: string;
  snoozeUntil: string | null;
  riskReasons: RiskReason[];
  email?: string;
}

interface WatchlistResponse {
  total: number;
  scoredAt: string;
  watchlist: DonorRiskEntry[];
}

function RiskBadge({ tier }: { tier: string }) {
  const colorMap: Record<string, string> = {
    High:   'status-badge risk-high',
    Medium: 'status-badge risk-medium',
    Low:    'status-badge risk-low',
  };
  return <span className={colorMap[tier] ?? 'status-badge'}>{tier}</span>;
}

function formatPhp(value: number) {
    return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

function getDaysRemaining(lastScoredAt: string): number {
  const scored = new Date(lastScoredAt);
  const now = new Date();
  const daysSince = Math.floor(
    (now.getTime() - scored.getTime()) / (1000 * 60 * 60 * 24)
  );
  return 7 - daysSince;
}

function CountdownBadge({ lastScoredAt }: { lastScoredAt: string }) {
  const daysRemaining = getDaysRemaining(lastScoredAt);

  if (daysRemaining < 0) {
    return (
      <span style={{
        background: '#fef2f2',
        color: '#dc2626',
        border: '1px solid #fecaca',
        borderRadius: '6px',
        padding: '4px 8px',
        fontSize: '11px',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}>
        ⚠️ OVERDUE! CONTACT NOW
      </span>
    );
  }

  if (daysRemaining === 0) {
    return (
      <span style={{
        background: '#fff7ed',
        color: '#ea580c',
        border: '1px solid #fed7aa',
        borderRadius: '6px',
        padding: '4px 8px',
        fontSize: '11px',
        fontWeight: 700,
      }}>
        Due TODAY
      </span>
    );
  }

  return (
    <span style={{
      background: daysRemaining <= 2 ? '#fff7ed' : '#f0fdf4',
      color: daysRemaining <= 2 ? '#ea580c' : '#16a34a',
      border: `1px solid ${daysRemaining <= 2 ? '#fed7aa' : '#bbf7d0'}`,
      borderRadius: '6px',
      padding: '4px 8px',
      fontSize: '11px',
      fontWeight: 600,
    }}>
      {daysRemaining}d left
    </span>
  );
}

function EmailModal({
  donor,
  onClose,
  onSent,
}: {
  donor: DonorRiskEntry;
  onClose: () => void;
  onSent: () => void;
}) {
  const firstName = donor.displayName?.split(' ')[0] ?? donor.displayName;

  const topReason = donor.riskReasons
    .filter(r => r.direction === 'increases_risk')[0];

  const subject = `Checking in — we'd love to reconnect, ${firstName}`;

  const body =
    `Dear ${donor.displayName},\n\n` +
    `We wanted to reach out personally to thank you for your generous ` +
    `support of the girls in our care at the Laya Foundation.\n\n` +
    `Your contributions have made a real difference. Our data shows that ` +
    `for every $1,000 directed to Wellbeing programs, the girls in our ` +
    `safehouses gain an average of 3.62 points of educational progress ` +
    `the following month — and that impact is possible because of ` +
    `supporters like you.\n\n` +
    `We would love to reconnect and share more about how your past ` +
    `generosity has transformed lives. Please don't hesitate to reach ` +
    `out — we value your partnership deeply.\n\n` +
    `With gratitude,\nThe Laya Foundation Team`;

  const mailtoLink =
    `mailto:${donor.email ?? ''}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)', zIndex: 1000,
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: '12px',
          padding: '1.5rem', width: '100%', maxWidth: '520px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '1rem',
        }}>
          <h2 style={{
            fontSize: '1rem', fontWeight: 700, color: '#1e293b',
          }}>
            Contact {donor.displayName}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              cursor: 'pointer', color: '#94a3b8', fontSize: '18px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Email preview */}
        <div style={{
          background: '#f8fafc', borderRadius: '8px',
          padding: '12px', marginBottom: '1rem', fontSize: '13px',
        }}>
          <div style={{ marginBottom: '4px', color: '#475569' }}>
            <strong>To:</strong>{' '}
            {donor.email ?? (
              <span style={{ color: '#ef4444' }}>No email on file</span>
            )}
          </div>
          <div style={{ marginBottom: '8px', color: '#475569' }}>
            <strong>Subject:</strong> {subject}
          </div>
          <div style={{
            color: '#475569', whiteSpace: 'pre-wrap',
            lineHeight: 1.6, fontSize: '12px',
            maxHeight: '160px', overflowY: 'auto',
          }}>
            {body}
          </div>
        </div>

        {/* Why flagged callout */}
        {topReason && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '6px', padding: '8px 12px',
            fontSize: '12px', color: '#dc2626', marginBottom: '1rem',
          }}>
            <strong>Why flagged:</strong> {topReason.label}
          </div>
        )}

        {/* Priority score context */}
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: '6px', padding: '8px 12px',
          fontSize: '12px', color: '#16a34a', marginBottom: '1.25rem',
        }}>
          <strong>Lifetime value:</strong>{' '}
          ${donor.lifetimeValuePhp.toLocaleString('en-US', {
            maximumFractionDigits: 0
          })}{' '}
          — Priority score: {donor.priorityScore.toLocaleString('en-US', {
            maximumFractionDigits: 0
          })}
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex', gap: '8px', justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: '6px',
              border: '1px solid #e2e8f0', background: '#fff',
              cursor: 'pointer', fontSize: '13px', color: '#475569',
            }}
          >
            Cancel
          </button>
          <a
            href={donor.email ? mailtoLink : '#'}
            onClick={(e) => {
              if (!donor.email) {
                e.preventDefault();
                return;
              }
              onSent();
              onClose();
            }}
            style={{
              padding: '8px 16px', borderRadius: '6px',
              background: donor.email ? '#4f8a68' : '#94a3b8',
              color: '#fff', fontSize: '13px', fontWeight: 600,
              textDecoration: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              pointerEvents: donor.email ? 'auto' : 'none',
            }}
          >
            ✉ Open in Email Client
          </a>
        </div>
      </div>
    </div>
  );
}

export default function DonorWatchlist({ topN = 10 }: { topN?: number }) {
  const [data, setData]         = useState<WatchlistResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [snoozing, setSnoozing] = useState<number | null>(null);
  const [emailDonor, setEmailDonor] = useState<DonorRiskEntry | null>(null);
  const [contactedName, setContactedName] = useState<string | null>(null);

  const fetchWatchlist = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/api/donors/risk-watchlist?topN=${topN}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: WatchlistResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError('Failed to load donor watchlist.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [topN]);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

  const handleSnooze = async (supporterId: number) => {
    try {
      setSnoozing(supporterId);
      const res = await fetch(
        `${API_BASE}/api/donors/${supporterId}/risk/snooze`,
        { method: 'POST', credentials: 'include' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchWatchlist();
    } catch (err) {
      console.error('Failed to snooze donor', err);
    } finally {
      setSnoozing(null);
    }
  };

  const scoredAt = data?.scoredAt
    ? new Date(data.scoredAt).toLocaleDateString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null;

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <div>
          <h2>Donor Risk Watchlist</h2>
          {scoredAt && (
            <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>
              Last scored {scoredAt}
            </span>
          )}
        </div>
        <Link to="/admin/donors" className="card-link">
          View all <ArrowRight size={14} />
        </Link>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#888' }}>
          Loading watchlist...
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && data?.watchlist.length === 0 && (
        <div className="empty-state">
          <AlertCircle size={20} />
          <p>No donors flagged at this time.</p>
        </div>
      )}

      {!loading && !error && data && data.watchlist.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>
                <th style={thStyle}>Donor</th>
                <th style={thStyle}>Risk</th>
                <th style={thStyle}>Days Since Gift</th>
                <th style={thStyle}>Lifetime Value</th>
                <th style={thStyle}>Why Flagged</th>
                <th style={thStyle}>Deadline</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.watchlist.map((donor) => (
                <tr key={donor.supporterId} style={{ borderBottom: '1px solid #f9f9f9' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500 }}>{donor.displayName}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      Priority: {donor.priorityScore.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <RiskBadge tier={donor.riskTier} />
                  </td>
                  <td style={tdStyle}>
                    <div>{donor.daysSinceLastDonation} days</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {donor.gapRatio.toFixed(1)}× usual gap
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {formatPhp(donor.lifetimeValuePhp)}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: '220px' }}>
                    {donor.riskReasons
                      .filter(r => r.direction === 'increases_risk')
                      .slice(0, 2)
                      .map((r, i) => (
                        <div key={i} style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>
                          • {r.label}
                        </div>
                      ))}
                  </td>
                  <td style={tdStyle}>
                    {donor.riskTier === 'High' || donor.riskTier === 'Medium' ? (
                      <CountdownBadge lastScoredAt={donor.lastScoredAt} />
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => setEmailDonor(donor)}
                      disabled={snoozing === donor.supporterId}
                      style={{
                        ...snoozeButtonStyle,
                        background: donor.snoozeUntil ? '#f0fdf4' : 'white',
                        color: donor.snoozeUntil ? '#16a34a' : '#555',
                        border: donor.snoozeUntil
                          ? '1px solid #bbf7d0'
                          : '1px solid #e5e7eb',
                        fontWeight: donor.snoozeUntil ? 600 : 400,
                      }}
                    >
                      {donor.snoozeUntil ? '✓ Contacted' : '✉ Contact'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {emailDonor && (
        <EmailModal
          donor={emailDonor}
          onClose={() => setEmailDonor(null)}
          onSent={() => {
            const name = emailDonor.displayName;
            setEmailDonor(null);
            handleSnooze(emailDonor.supporterId);
            setContactedName(name);
            setTimeout(() => setContactedName(null), 4000);
          }}
        />
      )}

      {contactedName && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: '#4f8a68',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideInRight 0.3s ease',
        }}>
          ✓ {contactedName} marked as contacted — hidden for 45 days
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontWeight: 500,
  fontSize: '11px',
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'top',
};

const snoozeButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '11px',
  padding: '4px 8px',
  borderRadius: '4px',
  border: '1px solid #e5e7eb',
  background: 'white',
  color: '#555',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};