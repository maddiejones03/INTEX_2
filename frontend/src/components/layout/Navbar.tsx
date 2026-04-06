import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, Heart, ChevronDown, LogOut, User } from 'lucide-react';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isAdmin = location.pathname.startsWith('/admin');

  const handleLogout = () => {
    logout();
    navigate('/');
    setProfileOpen(false);
  };

  const publicLinks = [
    { to: '/', label: 'Home' },
    { to: '/impact', label: 'Our Impact' },
    { to: '/privacy', label: 'Privacy Policy' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" onClick={() => setMobileOpen(false)}>
          <Heart size={22} fill="currentColor" />
          <span>Kanlungan Foundation</span>
        </Link>

        {!isAdmin && (
          <div className="navbar-links">
            {publicLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`navbar-link ${location.pathname === l.to ? 'active' : ''}`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}

        {isAdmin && (
          <span className="navbar-section-label">Admin Portal</span>
        )}

        <div className="navbar-actions">
          {isAuthenticated ? (
            <div className="profile-menu-wrapper">
              <button
                className="profile-trigger"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <div className="avatar">
                  {user?.firstName[0]}{user?.lastName[0]}
                </div>
                <span className="profile-name">{user?.firstName}</span>
                <ChevronDown size={14} />
              </button>
              {profileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <div className="avatar avatar-lg">{user?.firstName[0]}{user?.lastName[0]}</div>
                    <div>
                      <div className="profile-dropdown-name">{user?.firstName} {user?.lastName}</div>
                      <div className="profile-dropdown-role">{user?.role}</div>
                    </div>
                  </div>
                  <div className="profile-dropdown-divider" />
                  <Link
                    to="/admin"
                    className="profile-dropdown-item"
                    onClick={() => setProfileOpen(false)}
                  >
                    <User size={14} /> Dashboard
                  </Link>
                  <button className="profile-dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Staff Login
            </Link>
          )}

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-menu">
          {publicLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="mobile-menu-link"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {!isAuthenticated && (
            <Link to="/login" className="mobile-menu-link" onClick={() => setMobileOpen(false)}>
              Staff Login
            </Link>
          )}
          {isAuthenticated && (
            <button className="mobile-menu-link" onClick={handleLogout} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
              Sign Out
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
