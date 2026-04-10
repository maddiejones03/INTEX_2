import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Lock, Mail, User, CheckCircle } from 'lucide-react';
import { getApiBaseUrl } from '../../services/authApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function Register() {
  useDocumentTitle('Create account', 'public');
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({
    firstName: false, lastName: false, email: false, password: false, confirm: false,
  });

  const passwordsMatch = password === confirm;
  const passwordLongEnough = password.length >= 14;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ firstName: true, lastName: true, email: true, password: true, confirm: true });
    setError('');

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirm) return;
    if (!passwordLongEnough) { setError('Password must be at least 14 characters.'); return; }
    if (!passwordsMatch) { setError('Passwords do not match.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
          role: 'Donor',
        }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        if (res.status === 409) {
          setError('An account with this email already exists.');
        } else if (data?.details) {
          setError(Array.isArray(data.details) ? data.details[0] : data.details);
        } else {
          setError(data?.error || 'Registration failed. Please try again.');
        }
      }
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <img src="/LayaLogo.png" alt="Laya Foundation" style={{ width: 56, height: 56, objectFit: 'contain' }} />
            </div>
            <h1>Laya Foundation</h1>
          </div>
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <CheckCircle size={48} style={{ color: 'var(--color-success, #22c55e)', marginBottom: '1rem' }} />
            <h2 style={{ marginBottom: '0.5rem' }}>Account created!</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
              You can now sign in with your donor account.
            </p>
            <button className="btn btn-primary btn-full" onClick={() => navigate('/login')}>
              Go to Sign In
            </button>
          </div>
        </div>
        <div className="login-bg-pattern" />
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/LayaLogo.png" alt="Laya Foundation" style={{ width: 56, height: 56, objectFit: 'contain' }} />
          </div>
          <h1>Laya Foundation</h1>
          <p>Create your donor account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {error && (
            <div className="alert alert-error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">First Name</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input
                  id="firstName"
                  type="text"
                  className={`form-input ${touched.firstName && !firstName.trim() ? 'input-error' : ''}`}
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, firstName: true }))}
                  placeholder="First name"
                  autoComplete="given-name"
                  disabled={submitting}
                />
              </div>
              {touched.firstName && !firstName.trim() && (
                <span className="field-error">Required.</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="lastName" className="form-label">Last Name</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input
                  id="lastName"
                  type="text"
                  className={`form-input ${touched.lastName && !lastName.trim() ? 'input-error' : ''}`}
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, lastName: true }))}
                  placeholder="Last name"
                  autoComplete="family-name"
                  disabled={submitting}
                />
              </div>
              {touched.lastName && !lastName.trim() && (
                <span className="field-error">Required.</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="email"
                type="email"
                className={`form-input ${touched.email && !email.trim() ? 'input-error' : ''}`}
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, email: true }))}
                placeholder="Enter your email"
                autoComplete="email"
                disabled={submitting}
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
                className={`form-input ${touched.password && !passwordLongEnough ? 'input-error' : ''}`}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, password: true }))}
                placeholder="At least 14 characters"
                autoComplete="new-password"
                disabled={submitting}
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
            {touched.password && !passwordLongEnough && (
              <span className="field-error">Password must be at least 14 characters.</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirm" className="form-label">Confirm Password</label>
            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                id="confirm"
                type={showConfirm ? 'text' : 'password'}
                className={`form-input ${touched.confirm && !passwordsMatch ? 'input-error' : ''}`}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, confirm: true }))}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                disabled={submitting}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {touched.confirm && !passwordsMatch && (
              <span className="field-error">Passwords do not match.</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={submitting}
          >
            {submitting ? <span className="btn-spinner" /> : 'Create Account'}
          </button>
        </form>

        <div className="login-footer">
          <span>Already have an account?</span>
          <span className="login-footer-sep" aria-hidden>·</span>
          <Link to="/login">Sign in</Link>
        </div>
      </div>

      <div className="login-bg-pattern" />
    </div>
  );
}
