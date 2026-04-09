import { Link } from 'react-router-dom';
import { Mail, Phone, FileText } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand-col">
            <Link to="/" className="footer-brand" aria-label="Laya Foundation">
              <img
                src="/LayaLogo.png"
                alt=""
                className="footer-logo"
                decoding="async"
              />
            </Link>
            <p className="footer-tagline">
              Restoring freedom, healing, and hope to survivors of trafficking and abuse in the Philippines since 2008.
            </p>
            <div className="footer-socials">
              {/* Facebook Link */}
              <a 
                href="https://www.facebook.com/LighthouseSanctuary" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Facebook" 
                className="social-icon"
              >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>

              {/* YouTube Link */}
              <a 
                href="https://www.youtube.com/@LighthouseSanctuary" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="YouTube" 
                className="social-icon"
              >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/>
                  <polygon fill="#FFF" points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="footer-heading">Quick Links</h4>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/impact">Our Impact</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/login">Staff Login</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">Contact Us</h4>
            <ul className="footer-contact">
              <li>
                <Phone size={14} aria-hidden />
                <a href="tel:+18018313323">(801) 831-3323</a>
              </li>
              <li>
                <Mail size={14} aria-hidden />
                <a href="mailto:Info@LighthouseSanctuary.org">Info@LighthouseSanctuary.org</a>
              </li>
              <li>
                <FileText size={14} aria-hidden />
                <span>EIN: 81-3220618</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-closing">Every child deserves to be free.</p>
          <p>© {new Date().getFullYear()} Laya Foundation. All rights reserved.</p>
          <p>
            <button
              className="footer-cookie-btn"
              onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}
            >
              Cookie Settings
            </button>
          </p>
        </div>
      </div>
    </footer>
  );
}
