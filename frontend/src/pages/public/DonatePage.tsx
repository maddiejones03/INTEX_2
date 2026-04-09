import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, Clock, Package, ArrowRight, ChevronRight,
  DollarSign, CalendarCheck, Boxes, Plus, Trash2, CheckCircle,
  Users, Home as HomeIcon, TrendingUp, Shield,
} from 'lucide-react';
import { apiFetch, apiPost } from '../../services/apiClient';

type DonationType = 'Monetary' | 'Time' | 'InKind';

interface TypeOption {
  type: DonationType;
  icon: typeof Heart;
  title: string;
  tagline: string;
  description: string;
  examples: string[];
  color: string;
  ctaLabel: string;
}

const donationTypes: TypeOption[] = [
  {
    type: 'Monetary',
    icon: DollarSign,
    title: 'Give Money',
    tagline: 'Fund shelter, therapy, education & reintegration',
    description:
      'Financial donations are directed to the programs that need it most — from daily meals and medical care to school tuition and counseling sessions.',
    examples: [
      'One-time or recurring contributions',
      'Campaign-specific giving',
      'Sponsor a resident\'s education',
    ],
    color: 'green',
    ctaLabel: 'Make a Donation',
  },
  {
    type: 'Time',
    icon: Clock,
    title: 'Give Time',
    tagline: 'Volunteer your skills and hours',
    description:
      'Our residents benefit enormously from volunteers — tutors, mentors, counselors, and professionals who share their time and expertise.',
    examples: [
      'Tutoring and homework help',
      'Arts, sports & life-skills workshops',
      'Professional mentoring sessions',
    ],
    color: 'blue',
    ctaLabel: 'Pledge Hours',
  },
  {
    type: 'InKind',
    icon: Package,
    title: 'Give Goods',
    tagline: 'Donate supplies, equipment & essentials',
    description:
      'In-kind donations directly support day-to-day life in our safe houses — school supplies, hygiene products, clothing, furniture, and more.',
    examples: [
      'School supplies and books',
      'Clothing, shoes & hygiene kits',
      'Furniture, appliances & equipment',
    ],
    color: 'teal',
    ctaLabel: 'Donate Items',
  },
];

const programAreaOptions = [
  'Education', 'Wellbeing', 'Transport', 'Outreach', 'Operations', 'Maintenance',
];

const itemCategoryOptions = [
  'School Supplies', 'Clothing', 'Hygiene', 'Food', 'Furniture', 'Electronics', 'Medical', 'Other',
];

const conditionOptions = ['New', 'Like New', 'Good', 'Fair'];

interface InKindItem {
  itemName: string;
  itemCategory: string;
  quantity: number;
  unitOfMeasure: string;
  estimatedUnitValue: string;
  intendedUse: string;
  receivedCondition: string;
}

const emptyItem = (): InKindItem => ({
  itemName: '', itemCategory: '', quantity: 1, unitOfMeasure: 'pcs',
  estimatedUnitValue: '', intendedUse: '', receivedCondition: 'Good',
});

const programAreas = [
  { name: 'Education', icon: '📚' },
  { name: 'Wellbeing', icon: '💚' },
  { name: 'Transport', icon: '🚐' },
  { name: 'Outreach', icon: '🤝' },
  { name: 'Operations', icon: '🏠' },
  { name: 'Maintenance', icon: '🔧' },
];

interface ImpactData {
  totalResidents: number;
  reintegrated: number;
  reintegrationRate: number;
  totalSafehouses: number;
  totalDonationsPhp: number;
  donationsByMonth: { year: number; month: number; totalAmount: number }[];
}

function formatPeso(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `₱${value.toLocaleString()}`;
}

export default function DonatePage() {
  const [selectedType, setSelectedType] = useState<DonationType | null>(null);
  const [impact, setImpact] = useState<ImpactData | null>(null);

  useEffect(() => {
    apiFetch<ImpactData>('/api/reports/public-impact')
      .then(setImpact)
      .catch(() => {});
  }, []);

  // Shared fields
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [programArea, setProgramArea] = useState('');

  // Time-specific
  const [hours, setHours] = useState('');

  // InKind-specific
  const [items, setItems] = useState<InKindItem[]>([emptyItem()]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [error, setError] = useState('');

  function resetForm() {
    setDonorName(''); setDonorEmail(''); setNotes(''); setProgramArea('');
    setHours('');
    setItems([emptyItem()]);
    setError('');
  }

  function handleTypeChange(type: DonationType) {
    if (selectedType === type) { setSelectedType(null); return; }
    setSelectedType(type);
    setSuccess(false);
    resetForm();
  }

  function updateItem(idx: number, patch: Partial<InKindItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!donorName.trim() || !donorEmail.trim()) {
      setError('Name and email are required.');
      return;
    }

    if (selectedType === 'Time' && (!hours || Number(hours) <= 0)) {
      setError('Please enter a valid number of hours.');
      return;
    }

    if (selectedType === 'InKind' && items.some((it) => !it.itemName.trim() || !it.itemCategory)) {
      setError('Each item needs a name and category.');
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        donorName: donorName.trim(),
        donorEmail: donorEmail.trim(),
        donationType: selectedType,
        programArea: programArea || null,
        notes: notes.trim() || null,
      };

      if (selectedType === 'Time') {
        body.estimatedHours = Number(hours);
      }

      if (selectedType === 'InKind') {
        body.inKindItems = items.map((it) => ({
          itemName: it.itemName.trim(),
          itemCategory: it.itemCategory,
          quantity: it.quantity,
          unitOfMeasure: it.unitOfMeasure || null,
          estimatedUnitValue: it.estimatedUnitValue ? Number(it.estimatedUnitValue) : null,
          intendedUse: it.intendedUse || null,
          receivedCondition: it.receivedCondition || null,
        }));
      }

      await apiPost('/api/donations/public', body);
      setSubmittedEmail(donorEmail.trim());
      setSuccess(true);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-donate">
      {/* Hero */}
      <div className="donate-hero">
        <div className="container">
          <div className="section-label light">Support Laya Foundation</div>
          <h1>Every Gift Changes a Life</h1>
          <p>
            Whether it's money, time, or goods — your generosity directly funds shelter,
            healing, and hope for survivors of abuse and trafficking.
          </p>
        </div>
      </div>

      <div className="container">
        {/* Type selector cards */}
        <div className="donate-type-section">
          <h2 className="donate-section-heading">Choose How You'd Like to Help</h2>
          <p className="donate-section-sub">
            We accept three kinds of donations. Select one to get started.
          </p>

          <div className="donate-type-grid">
            {donationTypes.map((dt) => {
              const isActive = selectedType === dt.type;
              return (
                <button
                  key={dt.type}
                  className={`donate-type-card donate-type-card-${dt.color}${isActive ? ' active' : ''}`}
                  onClick={() => handleTypeChange(dt.type)}
                >
                  <div className={`donate-type-icon icon-${dt.color}`}>
                    <dt.icon size={24} />
                  </div>
                  <h3>{dt.title}</h3>
                  <p className="donate-type-tagline">{dt.tagline}</p>
                  <ChevronRight
                    size={18}
                    className={`donate-type-chevron${isActive ? ' rotate' : ''}`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Monetary panel (PayPal link) ── */}
        {selectedType === 'Monetary' && (
          <div className="donate-detail-panel donate-detail-green">
            <div className="donate-detail-inner">
              <div className="donate-detail-info">
                <h3>Give Money</h3>
                <p>{donationTypes[0].description}</p>
                <ul className="donate-example-list">
                  {donationTypes[0].examples.map((ex) => (
                    <li key={ex}><ArrowRight size={14} /><span>{ex}</span></li>
                  ))}
                </ul>
              </div>
              <div className="donate-detail-action">
                <div className="donate-detail-cta-card">
                  <CalendarCheck size={20} className="donate-cta-icon" />
                  <span className="donate-cta-note">One-time or recurring</span>
                  <a
                    href="https://www.paypal.com/donate/?cmd=_s-xclick&hosted_button_id=QRPP8FYHJWLZY"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-accent btn-lg btn-full"
                  >
                    Make a Donation <ArrowRight size={18} />
                  </a>
                  <p className="donate-cta-fine">
                    You'll be taken to PayPal to complete your donation securely.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Time / InKind form panels ── */}
        {(selectedType === 'Time' || selectedType === 'InKind') && (
          <div className={`donate-detail-panel donate-detail-${selectedType === 'Time' ? 'blue' : 'teal'}`}>
            {success ? (
              <div className="donate-success">
                <CheckCircle size={40} />
                <h3>Thank you for your generosity!</h3>
                <p>
                  {selectedType === 'Time'
                    ? 'Your volunteer hours have been pledged successfully.'
                    : 'Your item donation has been submitted successfully.'}
                </p>
                <p className="donate-success-detail">
                  A confirmation has been sent to <strong>{submittedEmail || 'your email'}</strong>.
                  Our team will contact you within 2 business days to
                  {selectedType === 'Time'
                    ? ' coordinate scheduling and program assignment.'
                    : ' arrange drop-off or pick-up logistics.'}
                </p>
                <button className="btn btn-primary" onClick={() => { setSuccess(false); setSelectedType(null); }}>
                  Back to Options
                </button>
              </div>
            ) : (
              <form className="donate-form" onSubmit={handleSubmit}>
                <h3 className="donate-form-title">
                  {selectedType === 'Time' ? 'Pledge Your Time' : 'Donate Items'}
                </h3>

                {error && <div className="alert alert-error">{error}</div>}

                {/* Donor info row */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Your Name *</label>
                    <input
                      className="form-input"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="Mary Jane"
                      required
                      style={{ paddingLeft: '0.75rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input
                      className="form-input"
                      type="email"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                      placeholder="maryjane@example.com"
                      required
                      style={{ paddingLeft: '0.75rem' }}
                    />
                  </div>
                </div>

                {/* Time-specific fields */}
                {selectedType === 'Time' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Hours You'd Like to Volunteer *</label>
                      <input
                        className="form-input"
                        type="number"
                        min="1"
                        step="0.5"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        placeholder="e.g. 4"
                        required
                        style={{ paddingLeft: '0.75rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Program Area</label>
                      <select
                        className="form-select"
                        value={programArea}
                        onChange={(e) => setProgramArea(e.target.value)}
                      >
                        <option value="">Any / No preference</option>
                        {programAreaOptions.map((pa) => (
                          <option key={pa} value={pa}>{pa}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* InKind items list */}
                {selectedType === 'InKind' && (
                  <div className="donate-items-section">
                    <div className="donate-items-header">
                      <label className="form-label">Items to Donate</label>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setItems((prev) => [...prev, emptyItem()])}
                      >
                        <Plus size={14} /> Add Item
                      </button>
                    </div>
                    {items.map((item, idx) => (
                      <div key={idx} className="donate-item-card">
                        <div className="donate-item-row">
                          <div className="form-group" style={{ flex: 2 }}>
                            <label className="form-label">Item Name *</label>
                            <input
                              className="form-input"
                              value={item.itemName}
                              onChange={(e) => updateItem(idx, { itemName: e.target.value })}
                              placeholder="e.g. School backpacks"
                              required
                              style={{ paddingLeft: '0.75rem' }}
                            />
                          </div>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Category *</label>
                            <select
                              className="form-select"
                              value={item.itemCategory}
                              onChange={(e) => updateItem(idx, { itemCategory: e.target.value })}
                              required
                            >
                              <option value="">Select...</option>
                              {itemCategoryOptions.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group" style={{ flex: 0.5 }}>
                            <label className="form-label">Qty</label>
                            <input
                              className="form-input"
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                              style={{ paddingLeft: '0.75rem' }}
                            />
                          </div>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Condition</label>
                            <select
                              className="form-select"
                              value={item.receivedCondition}
                              onChange={(e) => updateItem(idx, { receivedCondition: e.target.value })}
                            >
                              {conditionOptions.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                          {items.length > 1 && (
                            <button
                              type="button"
                              className="btn-icon btn-icon-danger donate-item-remove"
                              onClick={() => removeItem(idx)}
                              title="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">
                    {selectedType === 'Time' ? 'Skills or Availability Notes' : 'Additional Notes'}
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      selectedType === 'Time'
                        ? 'e.g. Available weekends, experienced in tutoring math...'
                        : 'e.g. Items are packed and ready for pick-up...'
                    }
                  />
                </div>

                {/* Submit */}
                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-accent btn-lg"
                    disabled={submitting}
                  >
                    {submitting && <span className="btn-spinner" />}
                    {selectedType === 'Time' ? 'Pledge Hours' : 'Submit Donation'}
                    <ArrowRight size={18} />
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Impact stats */}
        {impact && (
          <div className="donate-impact-section">
            <h2 className="donate-section-heading">Your Donations at Work</h2>
            <p className="donate-section-sub">
              Real numbers from our programs — updated from live data.
            </p>
            <div className="donate-impact-grid">
              <div className="donate-impact-card donate-impact-card-green">
                <div className="donate-impact-icon icon-green"><Users size={20} /></div>
                <div className="donate-impact-value">{impact.totalResidents.toLocaleString()}</div>
                <div className="donate-impact-label">Lives Served</div>
              </div>
              <div className="donate-impact-card donate-impact-card-blue">
                <div className="donate-impact-icon icon-blue"><Shield size={20} /></div>
                <div className="donate-impact-value">{impact.reintegrationRate}%</div>
                <div className="donate-impact-label">Reintegration Rate</div>
              </div>
              <div className="donate-impact-card donate-impact-card-rose">
                <div className="donate-impact-icon icon-rose"><TrendingUp size={20} /></div>
                <div className="donate-impact-value">{formatPeso(impact.totalDonationsPhp)}</div>
                <div className="donate-impact-label">Total Donations</div>
              </div>
              <div className="donate-impact-card donate-impact-card-teal">
                <div className="donate-impact-icon icon-teal"><HomeIcon size={20} /></div>
                <div className="donate-impact-value">{impact.totalSafehouses}</div>
                <div className="donate-impact-label">Active Safe Houses</div>
              </div>
            </div>

            {impact.donationsByMonth.length > 0 && (
              <div className="donate-trend-bar">
                <span className="donate-trend-label">Recent monthly donations</span>
                <div className="donate-trend-months">
                  {impact.donationsByMonth.slice(-6).map((m) => {
                    const max = Math.max(...impact.donationsByMonth.slice(-6).map((d) => d.totalAmount));
                    const pct = max > 0 ? (m.totalAmount / max) * 100 : 0;
                    const monthName = new Date(m.year, m.month - 1).toLocaleString('default', { month: 'short' });
                    return (
                      <div key={`${m.year}-${m.month}`} className="donate-trend-col">
                        <div className="donate-trend-bar-track">
                          <div className="donate-trend-bar-fill" style={{ height: `${pct}%` }} />
                        </div>
                        <span className="donate-trend-month">{monthName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Where donations go */}
        <div className="donate-programs-section">
          <h2 className="donate-section-heading">Where Your Support Goes</h2>
          <p className="donate-section-sub">
            Every donation is allocated to one of our core program areas.
          </p>
          <div className="donate-program-chips">
            {programAreas.map((pa) => (
              <div key={pa.name} className="donate-program-chip">
                <span className="donate-program-emoji">{pa.icon}</span>
                <span>{pa.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="donate-bottom-cta">
          <Boxes size={28} />
          <div>
            <h3>Want to see how donations make a difference?</h3>
            <p>Our Impact Dashboard shows real data on where funds go and the outcomes they create.</p>
          </div>
          <Link to="/impact" className="btn btn-primary">
            View Impact Dashboard <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
