import { useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { signInWithPortal, type AuthPortal } from '../../services/authApi';
import { Eye, EyeOff, AlertCircle, Lock, Mail } from 'lucide-react';

const PORTAL_OPTIONS: { value: AuthPortal; label: string; description: string }[] = [
  { value: 'Admin', label: 'Admin', description: 'Full organization tools' },
  { value: 'CaseManager', label: 'Case manager', description: 'Assigned caseload' },
  { value: 'Donor', label: 'Donor', description: 'Your giving history' },
];

export default function Login() {
  const { refreshAuthSession, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname || '/admin';

  const [portal, setPortal] = useState<AuthPortal>('Admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const onPortalButtonKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const i = PORTAL_OPTIONS.findIndex((p) => p.value === portal);
    const delta = e.key === 'ArrowDown' ? 1 : -1;
    const next = (i + delta + PORTAL_OPTIONS.length) % PORTAL_OPTIONS.length;
    setPortal(PORTAL_OPTIONS[next].value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setTouched({ email: true, password: true });

    if (!email.trim() || !password) return;

    setSubmitting(true);
    try {
      await signInWithPortal(email.trim(), password, portal);
      await refreshAuthSession();

      if (portal === 'Admin') {
        const dest = from.startsWith('/admin') ? from : '/admin';
        navigate(dest, { replace: true });
      } else if (portal === 'CaseManager') {
        const dest = from.startsWith('/case-manager') ? from : '/case-manager/caseload';
        navigate(dest, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/LayaLogo.png" alt="Laya Foundation" style={{ width: 56, height: 56, objectFit: "contain" }} />
          </div>
          <h1>Laya Foundation</h1>
          <p>Sign in to your portal</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="form-group">
            <span id="portal-label" className="form-label">
              Sign in as
            </span>
            <div
              className="portal-segment"
              role="radiogroup"
              aria-labelledby="portal-label"
            >
              {PORTAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={portal === opt.value}
                  className={`portal-segment-btn${portal === opt.value ? ' portal-segment-btn--active' : ''}`}
                  onClick={() => setPortal(opt.value)}
                  onKeyDown={onPortalButtonKeyDown}
                  disabled={submitting || isLoading}
                >
                  <span className="portal-segment-btn-label">{opt.label}</span>
                  <span className="portal-segment-btn-hint">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="email"
                type="email"
                className={`form-input ${touched.email && !email.trim() ? 'input-error' : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder="Enter your email"
                autoComplete="email"
                disabled={submitting || isLoading}
              />
            </div>
            {touched.email && !email.trim() && (
              <span className="field-error">Email is required.</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${touched.password && !password ? 'input-error' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={submitting || isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {touched.password && !password && (
              <span className="field-error">Password is required.</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={submitting || isLoading}
          >
            {submitting ? <span className="btn-spinner" /> : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/">← Back to public site</Link>
        </div>
      </div>

      <div className="login-bg-pattern" />
    </div>
  );
}
