import { Link } from 'react-router-dom';
import { Heart, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand-col">
            <div className="footer-brand">
              <Heart size={20} fill="currentColor" />
              <span>Kanlungan Foundation</span>
            </div>
            <p className="footer-tagline">
              Providing shelter, healing, and hope to survivors of trafficking and abuse in the Philippines since 2008.
            </p>
            <div className="footer-socials">
              <a href="#" aria-label="Facebook" className="social-icon"><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
              <a href="#" aria-label="Twitter" className="social-icon"><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg></a>
              <a href="#" aria-label="Instagram" className="social-icon"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg></a>
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
            <h4 className="footer-heading">Our Programs</h4>
            <ul className="footer-links">
              <li><a href="#">Crisis Shelter</a></li>
              <li><a href="#">Healing & Therapy</a></li>
              <li><a href="#">Education Support</a></li>
              <li><a href="#">Livelihood Training</a></li>
              <li><a href="#">Reintegration</a></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">Contact Us</h4>
            <ul className="footer-contact">
              <li>
                <MapPin size={14} />
                <span>123 Kanlungan Street, Quezon City, Philippines 1100</span>
              </li>
              <li>
                <Phone size={14} />
                <span>+63 2 8123 4567</span>
              </li>
              <li>
                <Mail size={14} />
                <span>info@kanlungan.org</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Kanlungan Foundation. All rights reserved.</p>
          <p>Registered Non-Profit Organization · SEC Reg. No. CN200800123</p>
        </div>
      </div>
    </footer>
  );
}
