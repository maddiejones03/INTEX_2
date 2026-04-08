import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, BellOff } from 'lucide-react';

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

export default function DonorWatchlist({ topN = 10 }: { topN?: number }) {
  const [data, setData]         = useState<WatchlistResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [snoozing, setSnoozing] = useState<number | null>(null);

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
    if (!window.confirm('Mark this donor as contacted and hide from watchlist for 45 days?')) return;
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
                    <button
                      onClick={() => handleSnooze(donor.supporterId)}
                      disabled={snoozing === donor.supporterId}
                      title="Mark as contacted — hides for 45 days"
                      style={snoozeButtonStyle}
                    >
                      <BellOff size={12} />
                      {snoozing === donor.supporterId ? 'Snoozing…' : 'Contacted'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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