import { Link } from 'react-router-dom';
import {
  Heart, Shield, BookOpen, Users, ArrowRight,
  TrendingUp, Home as HomeIcon, Star, ChevronRight, Quote, Leaf,
} from 'lucide-react';

const stats = [
  { value: '1,200+', label: 'Survivors Served', desc: 'Since our founding in 2008' },
  { value: '3', label: 'Safe Houses', desc: 'Across Metro Manila' },
  { value: '94%', label: 'Reintegration Rate', desc: 'Successfully returned to families or communities' },
  { value: '$8.2M', label: 'Annual Budget', desc: 'Fully donor-funded' },
];

const programs: Array<{
  icon: typeof Shield;
  title: string;
  desc: string;
  color: string;
  image: string;
  objectPosition?: string;
}> = [
  {
    icon: Shield,
    title: 'Crisis Shelter',
    desc: 'Immediate, safe, confidential shelter for survivors of trafficking, abuse, and neglect.',
    color: 'blue',
    image: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80',
    objectPosition: 'center 38%',
  },
  {
    icon: Heart,
    title: 'Healing & Therapy',
    desc: 'Trauma-informed counseling, individual and group therapy, and psychiatric support.',
    color: 'rose',
    image: '/therapy.webp',
    objectPosition: 'center center',
  },
  {
    icon: BookOpen,
    title: 'Education Support',
    desc: 'Alternative learning, formal schooling, and vocational training for lasting independence.',
    color: 'amber',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80',
    objectPosition: 'center center',
  },
  {
    icon: HomeIcon,
    title: 'Reintegration',
    desc: 'Family reunification, community placement, and post-placement monitoring for every resident.',
    color: 'green',
    image: '/reintegration.jpg',
    objectPosition: 'center center',
  },
  {
    icon: Users,
    title: 'Family Strengthening',
    desc: 'Parent support groups, livelihood training, and community case conferences.',
    color: 'purple',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
    objectPosition: 'center center',
  },
  {
    icon: TrendingUp,
    title: 'Livelihood Training',
    desc: 'Practical skills and micro-enterprise support to help survivors and families thrive.',
    color: 'teal',
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
    objectPosition: 'center center',
  },
];

const testimonials = [
  {
    quote: "Laya gave me back my life. I am now in college studying criminology so I can help others like me.",
    name: 'Survivor, Age 20',
    year: 'Resident 2019–2021',
    image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=600&q=80',
  },
  {
    quote: "The social workers here did not give up on my daughter. Today our family is together and stronger than ever.",
    name: 'Parent',
    year: 'Family Reintegration 2022',
    image: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=600&q=80',
  },
  {
    quote: "Volunteering at Laya changed how I see the world. These children are resilient beyond imagination.",
    name: 'Volunteer Social Worker',
    year: 'Partner since 2020',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
  },
];

const stories: Array<{
  image: string;
  alt: string;
  quote: string;
  name: string;
  tag: string;
  objectPosition?: string;
}> = [
  {
    image: '/community-image.jpg',
    alt: 'Diverse community members in a circle with hands together in unity',
    quote: "I used to think freedom was just a word. Now I live it every day.",
    name: 'Maria, Age 22',
    tag: 'Education Graduate',
    objectPosition: 'center center',
  },
  {
    image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80',
    alt: 'A family reuniting outdoors',
    quote: "The Laya team helped us become a family again. We are healing together.",
    name: 'Elena & Family',
    tag: 'Family Reintegration',
    objectPosition: 'center 52%',
  },
];

const galleryImages = [
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1459183885421-5cc683b8dbba?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1200&q=80',
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
        <div className="hero-image-overlay" aria-hidden="true" />
        <div className="hero-content">
          <div className="hero-lead">
            <h1 className="hero-title hero-title--one-line">Laya{'\u00A0'}Foundation</h1>
            <p className="hero-tagline">A refuge for those who need it most</p>
          </div>
          <div className="hero-actions">
            <Link to="/donate" className="btn btn-accent btn-lg">
              Support Our Mission <ArrowRight size={18} />
            </Link>
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

      {/* Our Mission */}
      <section className="section">
        <div className="container container-narrow">
          <div className="section-label">Our Mission</div>
          <h2 className="section-title">A refuge for those who need it most</h2>
          <p className="section-body">
            Every child deserves safety, dignity, and the chance to heal. Laya Foundation operates
            residential care facilities — "safe houses" — where survivors of trafficking, physical, sexual,
            and psychological abuse receive holistic care guided by Philippine social welfare standards.
            Our multidisciplinary team of social workers, psychologists, and case managers walks alongside
            each resident on their journey from crisis to recovery and reintegration.
          </p>
          <div className="mission-values">
            {['Dignity', 'Safety', 'Healing', 'Empowerment', 'Community'].map((v) => (
              <span key={v} className="value-chip"><Leaf size={13} /> {v}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Programs */}
      <section className="section section-alt" style={{ paddingTop: '2rem' }}>
        <div className="container">
          <div className="section-label">What We Do</div>
          <h2 className="section-title">Comprehensive care at every step</h2>
          <div className="programs-grid">
            {programs.map((p) => (
              <div key={p.title} className={`program-card program-card-${p.color}`}>
                <div className="program-photo-wrap">
                  <img
                    src={p.image}
                    alt=""
                    className="program-photo"
                    loading="lazy"
                    style={
                      p.objectPosition ? { objectPosition: p.objectPosition } : undefined
                    }
                  />
                </div>
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

      {/* Stories of Hope */}
      <section className="section" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
        <div className="container">
          <div className="section-label">Stories of Hope</div>
          <h2 className="section-title">Lives transformed by freedom</h2>
          <div className="stories-grid">
            {stories.map((s) => (
              <div key={s.name} className="story-card">
                <div className="story-image-wrap">
                  <img
                    src={s.image}
                    alt={s.alt}
                    className="story-image"
                    style={
                      s.objectPosition ? { objectPosition: s.objectPosition } : undefined
                    }
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="story-image-placeholder">
                    <Heart size={32} style={{ color: 'var(--primary-light)', opacity: 0.5 }} />
                  </div>
                </div>
                <div className="story-body">
                  <Quote size={20} className="story-quote-icon" />
                  <p className="story-quote">"{s.quote}"</p>
                  <div className="story-author">
                    <strong>{s.name}</strong>
                    <span className="value-chip" style={{ fontSize: '0.75rem' }}>{s.tag}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-label">In the Field</div>
          <h2 className="section-title">A closer look at daily impact</h2>
          <div className="photo-grid">
            {galleryImages.map((src, i) => (
              <img key={i} src={src} alt="Laya Foundation outreach and care work" className="gallery-photo" loading="lazy" />
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
              <Link to="/impact#top" className="btn btn-accent btn-lg mt-2">
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
                <img src={t.image} alt={t.name} className="testimonial-photo" loading="lazy" />
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
          <img src="/LayaLogo.png" alt="Laya Foundation" className="donate-icon" style={{ width: 64, height: 64, objectFit: 'contain' }} />
          <h2 className="section-title">Make a difference today</h2>
          <p className="section-body">
            Your support directly funds shelter, therapy, education, and reintegration services.
            Give money, volunteer your time, or donate goods — every contribution matters.
          </p>
          <Link to="/donate" className="btn btn-accent btn-lg" style={{ marginTop: '1.5rem' }}>
            Donate Now <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Partners */}
      <section className="section section-alt section-partners">
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
