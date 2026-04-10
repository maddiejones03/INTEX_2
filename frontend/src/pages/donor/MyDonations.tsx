import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, AlertCircle, ArrowRight } from 'lucide-react';
import { getApiBaseUrl } from '../../services/authApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

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
  useDocumentTitle('My donations', 'public');
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
        <header className="my-donations-header">
          <div className="my-donations-header-text">
            <h1 className="section-title" style={{ marginBottom: '0.5rem' }}>
              Your Giving History
            </h1>
            <p className="section-body" style={{ marginBottom: 0 }}>
              Thank you for supporting Laya Foundation. Below is a record of donations tied to your account.
            </p>
          </div>
          <div className="my-donations-header-cta">
            <Link to="/donate" className="btn btn-accent">
              Donate now <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
        </header>

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
          <div className="my-donations-empty">
            <p className="section-body" style={{ marginBottom: '1rem' }}>
              No donations found for this profile yet.
            </p>
            <Link to="/donate" className="btn btn-accent btn-lg">
              Make your first gift <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
        ) : (
          <div className="table-card my-donations-table-card">
            <div className="table-scroll">
              <table className="data-table my-donations-table">
                <colgroup>
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '36%' }} />
                  <col style={{ width: '16%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Type</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Campaign</th>
                    <th scope="col">Channel</th>
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
            </div>
            <p className="table-card-footer my-donations-footer">
              <Heart size={14} style={{ flexShrink: 0 }} aria-hidden />
              <span>
                {total} record{total === 1 ? '' : 's'} total
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
