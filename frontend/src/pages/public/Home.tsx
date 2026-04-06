import { Link } from 'react-router-dom';
import {
  Heart, Shield, BookOpen, Users, ArrowRight,
  TrendingUp, Home as HomeIcon, Star, ChevronRight,
} from 'lucide-react';

const stats = [
  { value: '1,200+', label: 'Survivors Served', desc: 'Since our founding in 2008' },
  { value: '3', label: 'Safe Houses', desc: 'Across Metro Manila' },
  { value: '94%', label: 'Reintegration Rate', desc: 'Successfully returned to families or communities' },
  { value: '₱8.2M', label: 'Annual Budget', desc: 'Fully donor-funded' },
];

const programs = [
  {
    icon: Shield,
    title: 'Crisis Shelter',
    desc: 'Immediate, safe, confidential shelter for survivors of trafficking, abuse, and neglect.',
    color: 'blue',
  },
  {
    icon: Heart,
    title: 'Healing & Therapy',
    desc: 'Trauma-informed counseling, individual and group therapy, and psychiatric support.',
    color: 'rose',
  },
  {
    icon: BookOpen,
    title: 'Education Support',
    desc: 'Alternative learning, formal schooling, and vocational training for lasting independence.',
    color: 'amber',
  },
  {
    icon: HomeIcon,
    title: 'Reintegration',
    desc: 'Family reunification, community placement, and post-placement monitoring for every resident.',
    color: 'green',
  },
  {
    icon: Users,
    title: 'Family Strengthening',
    desc: 'Parent support groups, livelihood training, and community case conferences.',
    color: 'purple',
  },
  {
    icon: TrendingUp,
    title: 'Livelihood Training',
    desc: 'Practical skills and micro-enterprise support to help survivors and families thrive.',
    color: 'teal',
  },
];

const testimonials = [
  {
    quote: "Kanlungan gave me back my life. I am now in college studying criminology so I can help others like me.",
    name: 'Survivor, Age 20',
    year: 'Resident 2019–2021',
  },
  {
    quote: "The social workers here did not give up on my daughter. Today our family is together and stronger than ever.",
    name: 'Parent',
    year: 'Family Reintegration 2022',
  },
  {
    quote: "Volunteering at Kanlungan changed how I see the world. These children are resilient beyond imagination.",
    name: 'Volunteer Social Worker',
    year: 'Partner since 2020',
  },
];

const partners = [
  'Department of Social Welfare & Development',
  'Philippine National Police – WCPD',
  'Inter-Agency Council Against Trafficking',
  'International Justice Mission',
  'Ayala Foundation',
  'SM Foundation',
];

export default function Home() {
  return (
    <div className="page-home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="hero-badge">
            <Heart size={14} fill="currentColor" /> Non-Profit Organization since 2008
          </div>
          <h1 className="hero-title">
            Shelter. Healing. <span className="text-accent">Hope.</span>
          </h1>
          <p className="hero-subtitle">
            Kanlungan Foundation provides safety, professional care, and a pathway to a better life
            for children and young women who have survived trafficking, abuse, and neglect in the Philippines.
          </p>
          <div className="hero-actions">
            <a href="#donate" className="btn btn-accent btn-lg">
              Support Our Mission <ArrowRight size={18} />
            </a>
            <Link to="/impact" className="btn btn-outline-light btn-lg">
              See Our Impact
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="stats-bar">
        <div className="container">
          <div className="stats-grid">
            {stats.map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="section">
        <div className="container container-narrow">
          <div className="section-label">Our Mission</div>
          <h2 className="section-title">A refuge for those who need it most</h2>
          <p className="section-body">
            Every child deserves safety, dignity, and the chance to heal. Kanlungan Foundation operates
            residential care facilities — "safe houses" — where survivors of trafficking, physical, sexual,
            and psychological abuse receive holistic care guided by Philippine social welfare standards.
            Our multidisciplinary team of social workers, psychologists, and case managers walks alongside
            each resident on their journey from crisis to recovery and reintegration.
          </p>
          <div className="mission-values">
            {['Dignity', 'Safety', 'Healing', 'Empowerment', 'Community'].map((v) => (
              <span key={v} className="value-chip">{v}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Programs */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-label">What We Do</div>
          <h2 className="section-title">Comprehensive care at every step</h2>
          <div className="programs-grid">
            {programs.map((p) => (
              <div key={p.title} className={`program-card program-card-${p.color}`}>
                <div className={`program-icon program-icon-${p.color}`}>
                  <p.icon size={22} />
                </div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact teaser */}
      <section className="section impact-teaser">
        <div className="container">
          <div className="impact-teaser-inner">
            <div>
              <div className="section-label light">Transparent Impact</div>
              <h2 className="section-title light">Every peso, every person — accounted for.</h2>
              <p className="section-body light">
                We believe in radical transparency. Our public impact dashboard shows real data on
                resident outcomes, donation allocation, and program progress — updated regularly.
              </p>
              <Link to="/impact" className="btn btn-accent btn-lg mt-2">
                View Impact Dashboard <ChevronRight size={18} />
              </Link>
            </div>
            <div className="impact-teaser-visual">
              <div className="impact-number-card">
                <div className="impact-big-number">94<span>%</span></div>
                <div>Reintegration Success Rate</div>
              </div>
              <div className="impact-number-card">
                <div className="impact-big-number">1,200<span>+</span></div>
                <div>Lives Transformed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section">
        <div className="container">
          <div className="section-label">Voices of Hope</div>
          <h2 className="section-title">Stories of resilience</h2>
          <div className="testimonials-grid">
            {testimonials.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="testimonial-stars">
                  {[...Array(5)].map((_, j) => <Star key={j} size={14} fill="currentColor" />)}
                </div>
                <blockquote>"{t.quote}"</blockquote>
                <div className="testimonial-author">
                  <strong>{t.name}</strong>
                  <span>{t.year}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Donate CTA */}
      <section className="section section-donate" id="donate">
        <div className="container container-narrow text-center">
          <Heart size={40} fill="currentColor" className="donate-icon" />
          <h2 className="section-title">Make a difference today</h2>
          <p className="section-body">
            Your support directly funds shelter, therapy, education, and reintegration services.
            100% of donations go directly to our programs.
          </p>
          <div className="donate-amounts">
            {['₱500', '₱1,000', '₱5,000', '₱10,000', 'Custom'].map((amt) => (
              <button key={amt} className="btn btn-outline donate-amt-btn">{amt}</button>
            ))}
          </div>
          <button className="btn btn-accent btn-lg">
            Donate Now <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Partners */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-label">Our Partners</div>
          <h2 className="section-title">Together we do more</h2>
          <div className="partners-grid">
            {partners.map((p) => (
              <div key={p} className="partner-badge">{p}</div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
