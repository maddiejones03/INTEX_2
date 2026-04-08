import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, Check } from 'lucide-react';

// ── Cookie helpers ────────────────────────────────────────────────
function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  document.cookie =
    `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

// ─────────────────────────────────────────────────────────────────
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    functional: false,
  });

  useEffect(() => {
    // Show banner only if no browser cookie exists yet
    const consent = getCookie('cookie_consent');
    if (!consent) {
      setTimeout(() => setVisible(true), 1000);
    }

    const handleOpen = () => {
      // Pre-populate toggles from the saved localStorage detail blob
      const saved = localStorage.getItem('kanlungan_cookie_consent');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPreferences({
            necessary: true,
            analytics: !!parsed.analytics,
            functional: !!parsed.functional,
          });
        } catch { /* ignore */ }
      }
      setShowDetails(true);
      setVisible(true);
    };

    window.addEventListener('open-cookie-settings', handleOpen);
    return () => window.removeEventListener('open-cookie-settings', handleOpen);
  }, []);

  const save = (value: 'accepted' | 'declined', prefs: typeof preferences) => {
    // Browser cookie — readable by JS, used by React to gate behaviour
    setCookie('cookie_consent', value, 365);
    // localStorage blob — keeps granular preference details
    localStorage.setItem(
      'kanlungan_cookie_consent',
      JSON.stringify({ ...prefs, timestamp: new Date().toISOString() })
    );
    setVisible(false);
  };

  const acceptAll = () =>
    save('accepted', { necessary: true, analytics: true, functional: true });

  const acceptSelected = () =>
    save(
      preferences.analytics || preferences.functional ? 'accepted' : 'declined',
      preferences
    );

  const rejectAll = () =>
    save('declined', { necessary: true, analytics: false, functional: false });

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
      <div className="cookie-banner-inner">
        <div className="cookie-header">
          <div className="cookie-title">
            <Cookie size={18} />
            <span>Cookie Preferences</span>
          </div>
          <button className="cookie-close" onClick={rejectAll} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <p className="cookie-text">
          We use cookies to improve your experience and analyze site performance. We never sell your data.{' '}
          <Link to="/privacy" onClick={() => setVisible(false)}>Privacy Policy</Link>
        </p>

        {showDetails && (
          <div className="cookie-details">
            <label className="cookie-option">
              <div>
                <strong>Necessary</strong>
                <p>Required for basic site functionality. Cannot be disabled.</p>
              </div>
              <input type="checkbox" checked disabled />
            </label>
            <label className="cookie-option">
              <div>
                <strong>Analytics</strong>
                <p>Help us understand how visitors interact with our site.</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
              />
            </label>
            <label className="cookie-option">
              <div>
                <strong>Functional</strong>
                <p>Remember your preferences and settings.</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.functional}
                onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
              />
            </label>
          </div>
        )}

        <div className="cookie-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Hide options' : 'Manage preferences'}
          </button>
          <div className="cookie-btn-group">
            <button className="btn btn-outline btn-sm" onClick={rejectAll}>
              Decline
            </button>
            {showDetails ? (
              <button className="btn btn-primary btn-sm" onClick={acceptSelected}>
                <Check size={14} /> Save Preferences
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={acceptAll}>
                <Check size={14} /> Accept
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
