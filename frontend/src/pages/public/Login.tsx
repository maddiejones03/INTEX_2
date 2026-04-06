import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Heart, AlertCircle, Lock, User } from 'lucide-react';

export default function Login() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname || '/admin';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({ username: false, password: false });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setTouched({ username: true, password: true });

    if (!username.trim() || !password) return;

    const result = await login(username.trim(), password);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Login failed.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Heart size={28} fill="currentColor" />
          </div>
          <h1>Kanlungan Foundation</h1>
          <p>Staff &amp; Admin Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {error && (
            <div className="alert alert-error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username" className="form-label">Username</label>
            <div className="input-wrapper">
              <User size={16} className="input-icon" />
              <input
                id="username"
                type="text"
                className={`form-input ${touched.username && !username.trim() ? 'input-error' : ''}`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                placeholder="Enter your username"
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
            {touched.username && !username.trim() && (
              <span className="field-error">Username is required.</span>
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
                disabled={isLoading}
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
            disabled={isLoading}
          >
            {isLoading ? <span className="btn-spinner" /> : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/">← Back to public site</Link>
          <p className="login-hint">
            Demo: <code>admin / admin123</code>
          </p>
        </div>
      </div>

      <div className="login-bg-pattern" />
    </div>
  );
}
