import { Shield, Mail, Phone } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="page-privacy">
      <div className="privacy-hero">
        <div className="container container-narrow">
          <Shield size={40} />
          <h1>Privacy Policy</h1>
          <p>Last updated: April 6, 2024 · Effective: April 6, 2024</p>
        </div>
      </div>

      <div className="container container-narrow privacy-body">
        <div className="privacy-intro">
          Kanlungan Foundation (<strong>"we," "us," or "our"</strong>) is committed to protecting your
          privacy in accordance with the Philippine Data Privacy Act of 2012 (R.A. 10173), its
          Implementing Rules and Regulations, and the General Data Protection Regulation (GDPR) where
          applicable. This Privacy Policy explains how we collect, use, disclose, and safeguard information
          about visitors to our website and individuals who engage with our services.
        </div>

        <section>
          <h2>1. Information We Collect</h2>
          <h3>1.1 Automatically Collected Information</h3>
          <p>
            When you visit our website, we may automatically collect certain information through cookies
            and similar technologies, including your IP address (anonymized), browser type and version,
            pages visited and time spent, and referring URLs.
          </p>
          <h3>1.2 Information You Provide</h3>
          <p>
            We collect information you voluntarily provide when you contact us, make a donation, sign up
            for newsletters, or register as a volunteer. This may include your name, email address, phone
            number, and donation details.
          </p>
          <h3>1.3 Sensitive Personal Data</h3>
          <p>
            Information about residents of our safe houses constitutes sensitive personal information
            under R.A. 10173. Such information is collected only with the consent of the individual
            (or their legal guardian), strictly for the purpose of delivering social welfare services,
            and is never displayed publicly. All resident data shown on public pages is fully aggregated
            and anonymized.
          </p>
        </section>

        <section>
          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To deliver, improve, and personalize our website and services</li>
            <li>To process donations and send donation receipts</li>
            <li>To communicate program updates, events, and impact reports (with your consent)</li>
            <li>To comply with legal obligations, including mandatory reporting under R.A. 9262 and R.A. 9208</li>
            <li>To analyze aggregate website usage for service improvement</li>
            <li>To operate our staff portal and case management system</li>
          </ul>
        </section>

        <section>
          <h2>3. Legal Basis for Processing (GDPR)</h2>
          <p>For individuals in the European Economic Area, we process personal data under the following legal bases:</p>
          <ul>
            <li><strong>Consent:</strong> Newsletter subscriptions, marketing communications, and non-essential cookies</li>
            <li><strong>Contract:</strong> Processing donations and maintaining donor records</li>
            <li><strong>Legitimate Interest:</strong> Website analytics, fraud prevention, and security</li>
            <li><strong>Legal Obligation:</strong> Compliance with Philippine social welfare laws, tax regulations, and mandatory reporting</li>
          </ul>
        </section>

        <section>
          <h2>4. Cookies and Tracking Technologies</h2>
          <p>We use the following categories of cookies:</p>
          <div className="cookie-table">
            <div className="cookie-table-row header">
              <span>Category</span>
              <span>Purpose</span>
              <span>Can Opt Out?</span>
            </div>
            <div className="cookie-table-row">
              <span><strong>Necessary</strong></span>
              <span>Site functionality, security, session management</span>
              <span>No</span>
            </div>
            <div className="cookie-table-row">
              <span><strong>Analytics</strong></span>
              <span>Aggregate usage statistics (no personal data)</span>
              <span>Yes</span>
            </div>
            <div className="cookie-table-row">
              <span><strong>Functional</strong></span>
              <span>User preferences (language, display settings)</span>
              <span>Yes</span>
            </div>
          </div>
          <p>
            You can manage your cookie preferences at any time using our cookie consent tool, accessible
            by clearing your browser cookies and revisiting the site.
          </p>
        </section>

        <section>
          <h2>5. Data Sharing and Disclosure</h2>
          <p>We do not sell, rent, or trade your personal information. We may share information with:</p>
          <ul>
            <li><strong>Government agencies</strong> as required by law (DSWD, PNP, courts)</li>
            <li><strong>Partner NGOs and inter-agency bodies</strong> with your explicit consent for case coordination</li>
            <li><strong>Service providers</strong> (payment processors, cloud hosting) under strict data processing agreements</li>
            <li><strong>Legal counsel</strong> where necessary to protect the safety of residents</li>
          </ul>
        </section>

        <section>
          <h2>6. Data Retention</h2>
          <p>
            Resident case files are retained for a minimum of 10 years after case closure, as required
            by DSWD standards. Donor records are retained for 7 years for tax compliance. Website
            analytics data is retained for 26 months in aggregate form only.
          </p>
        </section>

        <section>
          <h2>7. Your Rights</h2>
          <p>Under R.A. 10173 and GDPR, you have the right to:</p>
          <ul>
            <li><strong>Access</strong> a copy of the personal data we hold about you</li>
            <li><strong>Correct</strong> inaccurate or incomplete personal data</li>
            <li><strong>Erasure</strong> of your personal data where legally permitted</li>
            <li><strong>Restrict</strong> processing of your data in certain circumstances</li>
            <li><strong>Data portability</strong> in a machine-readable format</li>
            <li><strong>Object</strong> to processing based on legitimate interest</li>
            <li><strong>Withdraw consent</strong> at any time without affecting prior processing</li>
          </ul>
          <p>To exercise any of these rights, contact our Data Privacy Officer (see Section 9).</p>
        </section>

        <section>
          <h2>8. Security</h2>
          <p>
            We implement administrative, technical, and physical safeguards to protect your information,
            including encrypted data transmission (TLS), role-based access controls, regular security
            assessments, and staff training on data privacy. Resident data is stored in isolated,
            access-controlled systems separate from our public website infrastructure.
          </p>
        </section>

        <section>
          <h2>9. Contact &amp; Data Privacy Officer</h2>
          <div className="contact-cards">
            <div className="contact-card">
              <Mail size={18} />
              <div>
                <strong>Email</strong>
                <a href="mailto:dpo@kanlungan.org">dpo@kanlungan.org</a>
              </div>
            </div>
            <div className="contact-card">
              <Phone size={18} />
              <div>
                <strong>Phone</strong>
                <a href="tel:+6328123456">+63 2 8123 4567</a>
              </div>
            </div>
          </div>
          <p>
            You may also file a complaint with the Philippine National Privacy Commission at{' '}
            <strong>privacy.gov.ph</strong>.
          </p>
        </section>

        <section>
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically. We will notify you of material changes by
            posting a prominent notice on our website and, where required by law, obtaining your renewed
            consent. Continued use of our site after changes constitutes acceptance of the updated policy.
          </p>
        </section>
      </div>
    </div>
  );
}
