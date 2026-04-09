import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { logoutUser } from '../../services/authApi';
import { Menu, X, ChevronDown, LogOut, User, Heart, FolderOpen } from 'lucide-react';

export default function Navbar() {
  const { isAuthenticated, authSession, refreshAuthSession } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const path = location.pathname;
  const isAdminArea = path.startsWith('/admin');
  const isCaseManagerArea = path.startsWith('/case-manager');

  const isAdmin = authSession.roles.includes('Admin');
  const isCaseManager = authSession.roles.includes('CaseManager');
  const isDonor = authSession.roles.includes('Donor');

  const handleLogout = async () => {
    await logoutUser();
    await refreshAuthSession();
    navigate('/');
    setProfileOpen(false);
  };

  const publicLinks = [
    { to: '/', label: 'Home' },
    { to: '/donate', label: 'Donate' },
    { to: '/impact', label: 'Our Impact' },
    { to: '/privacy', label: 'Privacy Policy' },
  ];
  const primaryLinks = (isAdmin && !isCaseManagerArea)
    ? [...publicLinks, { to: '/admin', label: 'Dashboard' }]
    : publicLinks;
  const showHeaderLinks = !isCaseManagerArea;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link
          to="/"
          className="navbar-brand"
          aria-label="Laya Foundation"
          onClick={() => setMobileOpen(false)}
        >
          <img
            src="/LayaLogo.png"
            alt=""
            className="navbar-logo"
            decoding="async"
          />
        </Link>

        {showHeaderLinks && (
          <div className="navbar-links">
            {primaryLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`navbar-link ${
                  l.to === '/admin'
                    ? (isAdminArea ? 'active' : '')
                    : (path === l.to ? 'active' : '')
                }`}
              >
                {l.label}
              </Link>
            ))}
            {isAuthenticated && isDonor && (
              <Link
                to="/donor/donations"
                className={`navbar-link ${path === '/donor/donations' ? 'active' : ''}`}
              >
                <Heart size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                My donations
              </Link>
            )}
            {isAuthenticated && isCaseManager && (
              <Link
                to="/case-manager/caseload"
                className={`navbar-link ${path.startsWith('/case-manager') ? 'active' : ''}`}
              >
                <FolderOpen size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                My caseload
              </Link>
            )}
          </div>
        )}

        {isAdmin && <span className="navbar-section-label">Admin portal</span>}
        {isCaseManagerArea && <span className="navbar-section-label">Case manager portal</span>}

        <div className="navbar-actions">
          {isAuthenticated ? (
            <div className="profile-menu-wrapper">
              <button
                className="profile-trigger"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <div className="avatar">
                  {authSession.username?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <span className="profile-name">{authSession.username}</span>
                <ChevronDown size={14} />
              </button>
              {profileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <div className="avatar avatar-lg">
                      {authSession.username?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <div>
                      <div className="profile-dropdown-name">{authSession.username}</div>
                      <div className="profile-dropdown-role">{authSession.roles.join(', ')}</div>
                    </div>
                  </div>
                  <div className="profile-dropdown-divider" />
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="profile-dropdown-item"
                      onClick={() => setProfileOpen(false)}
                    >
                      <User size={14} /> Admin dashboard
                    </Link>
                  )}
                  {isCaseManager && (
                    <Link
                      to="/case-manager/caseload"
                      className="profile-dropdown-item"
                      onClick={() => setProfileOpen(false)}
                    >
                      <FolderOpen size={14} /> My caseload
                    </Link>
                  )}
                  {isDonor && (
                    <Link
                      to="/donor/donations"
                      className="profile-dropdown-item"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Heart size={14} /> My donations
                    </Link>
                  )}
                  <button className="profile-dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Portal login
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
          {showHeaderLinks && (
            <>
              {primaryLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="mobile-menu-link"
                  onClick={() => setMobileOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
              {isAuthenticated && isDonor && (
                <Link
                  to="/donor/donations"
                  className="mobile-menu-link"
                  onClick={() => setMobileOpen(false)}
                >
                  My donations
                </Link>
              )}
              {isAuthenticated && isCaseManager && (
                <Link
                  to="/case-manager/caseload"
                  className="mobile-menu-link"
                  onClick={() => setMobileOpen(false)}
                >
                  My caseload
                </Link>
              )}
            </>
          )}
          {!isAuthenticated && (
            <Link to="/login" className="mobile-menu-link" onClick={() => setMobileOpen(false)}>
              Portal login
            </Link>
          )}
          {isAuthenticated && (
            <button
              className="mobile-menu-link"
              onClick={handleLogout}
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Sign Out
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
