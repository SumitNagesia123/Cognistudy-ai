import React, { useState, useEffect } from 'react';
import {
  Brain, ArrowRight, Check, Star, Zap, Sparkles,
  FileText, Layers, MessageSquare, BookOpen,
  BarChart2, Shield, ChevronRight, Play, Pause,
  Terminal, GraduationCap, Trophy, Users
} from 'lucide-react';

const FEATURES = [
  {
    icon: FileText,
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.15)',
    title: 'Instant AI Summarizer',
    desc: 'Transform textbooks, lecture slides, or complex research papers into structured, high-yield study guides in seconds.',
  },
  {
    icon: Layers,
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.15)',
    title: 'Adaptive Flashcards',
    desc: 'Auto-generate smart flashcard decks. Leveraging spaced repetition to optimize your active recall before exams.',
  },
  {
    icon: MessageSquare,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    title: 'Context-Aware Document Chat',
    desc: 'Ask questions directly to your documents. Get instant, cited answers with page references from your syllabus.',
  },
  {
    icon: BookOpen,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    title: 'Dynamic Study Planner',
    desc: 'Map out your exam prep automatically. Our planner adjusts dynamically based on your progress and calendar.',
  },
  {
    icon: BarChart2,
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.15)',
    title: 'Real-time Analytics',
    desc: 'Visualize your study streaks, subject mastery levels, and weak points so you know exactly what to review.',
  },
  {
    icon: Shield,
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.15)',
    title: 'Isolated Data Privacy',
    desc: 'Your uploads and conversations are encrypted and private. We never train AI models on your course materials.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Aryan Kumar',
    role: 'Computer Science, IIT Delhi',
    stars: 5,
    avatarColor: '#a855f7',
    text: 'CogniStudy cut my exam prep time in half. The flashcards it generates from my lecture slides are spot on. Highly recommended!',
  },
  {
    name: 'Priya Sharma',
    role: 'Medical Student, AIIMS',
    avatarColor: '#ec4899',
    stars: 5,
    text: 'Being able to upload a 500-page PDF and chat with it is a superpower. I get instant, accurate citations for my research papers.',
  },
  {
    name: 'Rohan Mehta',
    role: 'MBA Candidate, IIM Bangalore',
    avatarColor: '#3b82f6',
    stars: 5,
    text: 'The automated study plans keep me on track with my intense schedule. It feels like having a personal academic coach 24/7.',
  },
];

const DEMO_TABS = [
  {
    id: 'summary',
    label: 'Summarizer',
    icon: FileText,
    input: 'Upload: Mitochondria_Lecture_Notes.pdf',
    output: [
      '• Mitochondria are double-membrane organelles responsible for ATP generation via oxidative phosphorylation.',
      '• The inner membrane contains folds called cristae, maximizing surface area for electron transport chain proteins.',
      '• They contain their own circular DNA (mtDNA), supporting the endosymbiotic theory of origin.'
    ]
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    icon: Layers,
    input: 'Generate flashcards from: Organic Chemistry Ch 3',
    output: [
      'Q: What is the Markovnikov rule?\nA: In addition reactions, the acid hydrogen adds to the carbon with more hydrogens.',
      'Q: Define a nucleophile.\nA: A chemical species that donates an electron pair to form a chemical bond.',
      'Q: What is steric hindrance?\nA: The prevention of chemical reactions due to spatial crowding of atoms.'
    ]
  },
  {
    id: 'chat',
    label: 'Document Chat',
    icon: MessageSquare,
    input: 'Prompt: Summarize the grading criteria in the syllabus.',
    output: [
      'Based on page 4 of Syllabus_CS101.pdf:',
      '• Midterm Exam: 30% of final grade',
      '• Final Project: 40% of final grade',
      '• Homework & Quizzes: 20% of final grade',
      '• Class Participation: 10% of final grade'
    ]
  }
];

export default function Landing({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [typedOutput, setTypedOutput] = useState([]);
  const [typingIndex, setTypingIndex] = useState(0);

  // Simulate typing effect when active tab changes
  useEffect(() => {
    setTypedOutput([]);
    setTypingIndex(0);
    const targetOutput = DEMO_TABS.find(t => t.id === activeTab).output;
    
    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < targetOutput.length) {
        setTypedOutput(prev => [...prev, targetOutput[currentLine]]);
        currentLine++;
      } else {
        clearInterval(interval);
      }
    }, 450);

    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <div className="lp-premium">
      
      {/* BACKGROUND EFFECTS */}
      <div className="lp-bg-grid" />
      <div className="lp-glow lp-glow--1" />
      <div className="lp-glow lp-glow--2" />
      <div className="lp-glow lp-glow--3" />

      {/* ─── NAVBAR ──────────────────────────────────────────── */}
      <header className="lp-nav">
        <div className="lp-nav__container">
          <div className="lp-nav__logo">
            <div className="lp-logo-mark">
              <Brain size={18} className="lp-logo-icon" />
            </div>
            <span className="lp-logo-text">CogniStudy</span>
          </div>
          
          <nav className="lp-nav__menu">
            <a href="#features" className="lp-nav__link">Features</a>
            <a href="#demo" className="lp-nav__link">Interactive Demo</a>
            <a href="#testimonials" className="lp-nav__link">Reviews</a>
            <a href="#pricing" className="lp-nav__link">Pricing</a>
          </nav>

          <div className="lp-nav__actions">
            <button className="lp-btn-login" onClick={() => onNavigate('dashboard')}>Log in</button>
            <button className="lp-btn-primary lp-btn-nav" onClick={() => onNavigate('dashboard')}>
              Get Started Free <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION ────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero__content">
          <div className="lp-badge">
            <Sparkles size={12} className="lp-badge-icon" />
            <span>Next-Generation AI Learning Platform</span>
          </div>

          <h1 className="lp-hero__title">
            Supercharge your learning.<br />
            <span className="lp-hero__title-gradient">Master any subject.</span>
          </h1>

          <p className="lp-hero__subtitle">
            CogniStudy uses advanced AI to instantly convert your lectures, PDFs, and notes into structured study guides, flashcard decks, and interactive quizzes.
          </p>

          <div className="lp-hero__ctas">
            <button className="lp-btn-primary lp-btn-hero" onClick={() => onNavigate('dashboard')}>
              Start Studying Free <ArrowRight size={16} />
            </button>
            <a href="#demo" className="lp-btn-secondary lp-btn-hero">
              <Play size={14} /> Try Live Demo
            </a>
          </div>

          <div className="lp-hero__trust">
            <div className="lp-trust-item">
              <Check size={14} /> <span>No credit card required</span>
            </div>
            <div className="lp-trust-dot" />
            <div className="lp-trust-item">
              <Check size={14} /> <span>Free tier forever</span>
            </div>
            <div className="lp-trust-dot" />
            <div className="lp-trust-item">
              <Check size={14} /> <span>Instant setup</span>
            </div>
          </div>
        </div>

        {/* Floating App Preview */}
        <div className="lp-hero__preview-container">
          <div className="lp-glass-card lp-hero__preview">
            <div className="lp-preview__header">
              <div className="lp-preview__dots">
                <span /><span /><span />
              </div>
              <div className="lp-preview__address">app.cognistudy.ai/dashboard</div>
            </div>
            <div className="lp-preview__body">
              {/* Dashboard Simulation */}
              <div className="lp-sim-sidebar">
                <div className="lp-sim-logo-row">
                  <div className="lp-sim-logo-dot" />
                  <div className="lp-sim-skeleton" style={{ width: '60px', height: '8px' }} />
                </div>
                <div className="lp-sim-nav">
                  <div className="lp-sim-nav-item active">
                    <span className="lp-sim-nav-dot" />
                    <div className="lp-sim-skeleton" style={{ width: '70px', height: '6px' }} />
                  </div>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="lp-sim-nav-item">
                      <span className="lp-sim-nav-dot" />
                      <div className="lp-sim-skeleton" style={{ width: '50px', height: '6px' }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="lp-sim-content">
                <div className="lp-sim-header-row">
                  <div className="lp-sim-skeleton" style={{ width: '120px', height: '14px' }} />
                  <div className="lp-sim-badge">Active Session</div>
                </div>
                <div className="lp-sim-stats">
                  <div className="lp-sim-stat-card">
                    <div className="lp-sim-stat-val">12</div>
                    <div className="lp-sim-stat-label">Documents</div>
                  </div>
                  <div className="lp-sim-stat-card">
                    <div className="lp-sim-stat-val">248</div>
                    <div className="lp-sim-stat-label">Flashcards</div>
                  </div>
                  <div className="lp-sim-stat-card">
                    <div className="lp-sim-stat-val">94%</div>
                    <div className="lp-sim-stat-label">Mastery</div>
                  </div>
                </div>
                <div className="lp-sim-activity">
                  <div className="lp-sim-activity-title">
                    <Sparkles size={12} style={{ color: '#a855f7' }} />
                    <span>AI Analysis Progress</span>
                  </div>
                  <div className="lp-sim-progress-bar">
                    <div className="lp-sim-progress-fill" />
                  </div>
                  <div className="lp-sim-activity-row">
                    <div className="lp-sim-skeleton" style={{ width: '180px', height: '8px' }} />
                    <div className="lp-sim-skeleton" style={{ width: '40px', height: '8px' }} />
                  </div>
                  <div className="lp-sim-activity-row">
                    <div className="lp-sim-skeleton" style={{ width: '140px', height: '8px' }} />
                    <div className="lp-sim-skeleton" style={{ width: '50px', height: '8px' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS BAND ──────────────────────────────────────── */}
      <section className="lp-stats-band">
        <div className="lp-stats-band__inner">
          <div className="lp-stats-item">
            <div className="lp-stats-number">50k+</div>
            <div className="lp-stats-label">Active Students</div>
          </div>
          <div className="lp-stats-divider" />
          <div className="lp-stats-item">
            <div className="lp-stats-number">2.4M+</div>
            <div className="lp-stats-label">Flashcards Created</div>
          </div>
          <div className="lp-stats-divider" />
          <div className="lp-stats-item">
            <div className="lp-stats-number">98%</div>
            <div className="lp-stats-label">Satisfaction Rate</div>
          </div>
        </div>
      </section>

      {/* ─── INTERACTIVE DEMO PLAYGROUND ──────────────────────── */}
      <section className="lp-demo-section" id="demo">
        <div className="lp-section-header">
          <div className="lp-badge-purple">Interactive Playground</div>
          <h2 className="lp-section-title">See the AI Study Engine in Action</h2>
          <p className="lp-section-subtitle">Click the tabs below to experience how CogniStudy processes course material instantly.</p>
        </div>

        <div className="lp-demo-container">
          <div className="lp-demo-tabs">
            {DEMO_TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`lp-demo-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="lp-glass-card lp-demo-window">
            <div className="lp-demo-window__header">
              <div className="lp-demo-window__dot-group">
                <span /><span /><span />
              </div>
              <div className="lp-demo-window__title">CogniStudy AI Sandbox</div>
            </div>
            <div className="lp-demo-window__body">
              <div className="lp-demo-input-line">
                <span className="lp-prompt-symbol">&gt;</span>
                <span className="lp-input-text">{DEMO_TABS.find(t => t.id === activeTab).input}</span>
              </div>
              <div className="lp-demo-divider" />
              <div className="lp-demo-output">
                {typedOutput.map((line, idx) => (
                  <div key={idx} className="lp-output-line animate-fade-in">
                    {line}
                  </div>
                ))}
                <span className="lp-terminal-cursor" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ────────────────────────────────────── */}
      <section className="lp-features-section" id="features">
        <div className="lp-section-header">
          <div className="lp-badge-purple">Product Features</div>
          <h2 className="lp-section-title">Everything You Need to Ace Your Exams</h2>
          <p className="lp-section-subtitle">A comprehensive suite of cognitive study tools designed to maximize retention and comprehension.</p>
        </div>

        <div className="lp-features-grid">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="lp-glass-card lp-feature-card">
                <div className="lp-feature-card__icon-wrap" style={{ backgroundColor: feat.bg }}>
                  <Icon size={24} style={{ color: feat.color }} />
                </div>
                <h3 className="lp-feature-card__title">{feat.title}</h3>
                <p className="lp-feature-card__desc">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────────────────── */}
      <section className="lp-hiw-section">
        <div className="lp-section-header">
          <div className="lp-badge-purple">Simple Workflow</div>
          <h2 className="lp-section-title">How CogniStudy Works</h2>
          <p className="lp-section-subtitle">Get started in three simple steps. No complex configuration required.</p>
        </div>

        <div className="lp-hiw-steps">
          {[
            { num: '01', title: 'Upload Material', desc: 'Drag and drop your syllabus, lecture slides, notes, or textbooks.' },
            { num: '02', title: 'AI Processing', desc: 'Our cognitive engine analyzes the structure and key concepts.' },
            { num: '03', title: 'Study Smarter', desc: 'Review custom summaries, quiz yourself with flashcards, or ask questions.' }
          ].map((step, idx) => (
            <div key={idx} className="lp-hiw-step-card">
              <div className="lp-hiw-step-num">{step.num}</div>
              <h3 className="lp-hiw-step-title">{step.title}</h3>
              <p className="lp-hiw-step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TESTIMONIALS ────────────────────────────────────── */}
      <section className="lp-testimonials-section" id="testimonials">
        <div className="lp-section-header">
          <div className="lp-badge-purple">User Testimonials</div>
          <h2 className="lp-section-title">Loved by High-Achieving Students</h2>
          <p className="lp-section-subtitle">See how students are transforming their grades and study habits.</p>
        </div>

        <div className="lp-testimonials-grid">
          {TESTIMONIALS.map((t, idx) => (
            <div key={idx} className="lp-glass-card lp-testimonial-card">
              <div className="lp-testimonial-rating">
                {[...Array(t.stars)].map((_, i) => (
                  <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
              <p className="lp-testimonial-text">"{t.text}"</p>
              <div className="lp-testimonial-user">
                <div className="lp-testimonial-avatar" style={{ backgroundColor: t.avatarColor }}>
                  {t.name.charAt(0)}
                </div>
                <div className="lp-testimonial-info">
                  <div className="lp-testimonial-name">{t.name}</div>
                  <div className="lp-testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PRICING ─────────────────────────────────────────── */}
      <section className="lp-pricing-section" id="pricing">
        <div className="lp-section-header">
          <div className="lp-badge-purple">Flexible Pricing</div>
          <h2 className="lp-section-title">Simple, Transparent Plans</h2>
          <p className="lp-section-subtitle">No hidden fees. Choose the plan that fits your study needs.</p>
        </div>

        <div className="lp-pricing-grid">
          <div className="lp-glass-card lp-price-card">
            <h3 className="lp-price-card__title">Free Plan</h3>
            <div className="lp-price-card__price">$0</div>
            <p className="lp-price-card__desc">Perfect for testing the platform and basic course review.</p>
            <div className="lp-price-card__divider" />
            <ul className="lp-price-card__features">
              <li><Check size={14} /> <span>5 PDF Uploads / Month</span></li>
              <li><Check size={14} /> <span>Basic AI Summaries</span></li>
              <li><Check size={14} /> <span>50 Generated Flashcards</span></li>
              <li><Check size={14} /> <span>Standard Chat Support</span></li>
            </ul>
            <button className="lp-btn-secondary lp-btn-price" onClick={() => onNavigate('dashboard')}>
              Get Started Free
            </button>
          </div>

          <div className="lp-glass-card lp-price-card lp-price-card--popular">
            <div className="lp-price-popular-badge">Most Popular</div>
            <h3 className="lp-price-card__title">Pro Plan</h3>
            <div className="lp-price-card__price">$9<span className="lp-price-period">/mo</span></div>
            <p className="lp-price-card__desc">For dedicated students who need unlimited study capabilities.</p>
            <div className="lp-price-card__divider" />
            <ul className="lp-price-card__features">
              <li><Check size={14} /> <span>Unlimited PDF Uploads</span></li>
              <li><Check size={14} /> <span>Advanced Study Guides</span></li>
              <li><Check size={14} /> <span>Unlimited Smart Flashcards</span></li>
              <li><Check size={14} /> <span>Contextual Syllabus Chat</span></li>
              <li><Check size={14} /> <span>Priority AI Processing</span></li>
            </ul>
            <button className="lp-btn-primary lp-btn-price" onClick={() => onNavigate('dashboard')}>
              Upgrade to Pro
            </button>
          </div>
        </div>
      </section>

      {/* ─── CTA BAND ───────────────────────────────────────── */}
      <section className="lp-cta-band">
        <div className="lp-cta-band__content">
          <h2 className="lp-cta-title">Ready to Transform Your Grades?</h2>
          <p className="lp-cta-subtitle">Join thousands of students who are mastering their courses with AI.</p>
          <button className="lp-btn-primary lp-btn-cta" onClick={() => onNavigate('dashboard')}>
            Get Started for Free <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer__container">
          <div className="lp-footer__brand">
            <div className="lp-nav__logo">
              <div className="lp-logo-mark">
                <Brain size={16} className="lp-logo-icon" />
              </div>
              <span className="lp-logo-text">CogniStudy</span>
            </div>
            <p className="lp-footer__desc">Next-generation AI learning tools for high-performing students.</p>
          </div>
          <div className="lp-footer__links-group">
            <div className="lp-footer__links-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#demo">Demo</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="lp-footer__links-col">
              <h4>Company</h4>
              <a href="#">About Us</a>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>
        <div className="lp-footer__bottom">
          <p>© 2026 CogniStudy AI. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
