import { useCallback, useEffect, useState } from 'react';
import { Heart, AlertCircle } from 'lucide-react';
import { getApiBaseUrl } from '../../services/authApi';

interface DonationRow {
  donationId: number;
  donationType: string;
  donationDate: string | null;
  amount: number | null;
  currencyCode: string | null;
  campaignName: string | null;
  channelSource: string;
}

export default function MyDonations() {
  const [items, setItems] = useState<DonationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/donations?pageSize=100`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = (await res.json()) as {
        items: DonationRow[];
        total: number;
        message?: string;
      };
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setMessage(typeof data.message === 'string' ? data.message : null);
    } catch {
      setError('Could not load your donations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="section" style={{ paddingTop: '2rem' }}>
      <div className="container-narrow" style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 className="section-title" style={{ marginBottom: '0.5rem' }}>
          Your giving history
        </h1>
        <p className="section-body" style={{ marginBottom: '2rem' }}>
          Thank you for supporting Laya Foundation. Below is a record of donations tied to your account.
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {message && (
          <div className="alert" style={{ marginBottom: '1rem', background: 'var(--gray-100)' }}>
            {message}
          </div>
        )}

        {loading ? (
          <p className="section-body">Loading…</p>
        ) : items.length === 0 ? (
          <p className="section-body">No donations found for this profile yet.</p>
        ) : (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Campaign</th>
                  <th>Channel</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.donationId}>
                    <td>{d.donationDate ? d.donationDate : '—'}</td>
                    <td>{d.donationType}</td>
                    <td>
                      {d.amount != null
                        ? `${d.currencyCode ?? 'PHP'} ${d.amount.toLocaleString()}`
                        : '—'}
                    </td>
                    <td>{d.campaignName ?? '—'}</td>
                    <td>{d.channelSource}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
              <Heart size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {total} record{total === 1 ? '' : 's'} total
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
