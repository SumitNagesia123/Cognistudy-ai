import React, { useState, createContext, useContext, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Flashcards from './pages/Flashcards';
import History from './pages/History';
import Notes from './pages/Notes';
import Settings from './pages/Settings';
import Landing from './pages/Landing';
import Automations from './pages/Automations';
import StudyPlans from './pages/StudyPlans';
import LetsChat from './pages/LetsChat';

import { X, CheckCircle, FileText, Layers, PenTool, Brain } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';

// ── Toast context (unchanged) ──────────────────────────────
export const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast${t.type === 'error' ? ' toast--error' : ''}`}
            role="alert"
          >
            <CheckCircle
              size={16}
              color={t.type === 'error' ? 'var(--clr-danger)' : 'var(--clr-indigo-500)'}
              style={{ flexShrink: 0 }}
            />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// ── AppContent ─────────────────────────────────────────────
function AppContent() {
  const [currentRoute, setCurrentRoute] = useState('landing');
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const addToast = useToast();
  const { isAuthenticated, loading, user } = useAuth();

  // Force light mode for SIMBI premium look
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  const handleNavigate = (route) => {
    if (route === 'documents') route = 'docs';
    setCurrentRoute(route);
    setSidebarOpen(false);
  };

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-screen__ring" />
        <div className="loading-screen__text">Loading CogniStudy…</div>
      </div>
    );
  }

  // Render Landing Page directly if on landing route
  if (currentRoute === 'landing') {
    return <Landing onNavigate={handleNavigate} />;
  }

  // ── Auth gate ────────────────────────────────────────────
  if (!isAuthenticated) return <AuthPage />;

  // ── Page rendering ───────────────────────────────────────
  const renderContent = () => {
    switch (currentRoute) {
      case 'dashboard':  return <Dashboard onNavigate={handleNavigate} />;
      case 'docs':
      case 'documents':  return <Documents />;
      case 'chat':       return <LetsChat />;
      case 'plans':      return <StudyPlans />;
      case 'history':    return <History />;
      case 'flashcards': return <Flashcards />;
      case 'notes':      return <Notes />;
      case 'automations': return <Automations />;
      case 'settings':   return <Settings />;
      default:           return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  const PAGE_META = {
    dashboard:  { title: 'Dashboard Overview',  subtitle: `Welcome back, ${user?.name || 'Student'}. Here's what's happening with your studies.` },
    docs:       { title: 'Document Library',     subtitle: 'Upload, manage, and chat with your PDFs and study materials.' },
    documents:  { title: 'Document Library',     subtitle: 'Upload, manage, and chat with your PDFs and study materials.' },
    chat:       { title: "Let's Chat",           subtitle: 'Ask general academic questions, explore concepts, or get help with homework.' },
    plans:      { title: 'Study Plans',          subtitle: 'Plan, generate, and track your active study sessions.' },
    history:    { title: 'Interaction History',  subtitle: 'Search and review all your past AI interactions and generated content.' },
    flashcards: { title: 'Flashcards',           subtitle: 'Review your AI-generated study decks and test your knowledge.' },
    notes:      { title: 'My Notes',             subtitle: 'Organize and edit your AI-assisted study notes.' },
    automations: { title: 'Study Automations',    subtitle: 'Configure smart workflows to handle your study materials automatically.' },
    settings:   { title: 'Account Settings',     subtitle: 'Manage your profile, subscription, and application preferences.' },
  };


  const meta = PAGE_META[currentRoute] || PAGE_META.dashboard;

  return (
    <div className="app-shell">
      <Sidebar
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-area">
        <Topbar
          onOpenModal={() => setIsModalOpen(true)}
          onOpenSidebar={() => setSidebarOpen(true)}
          onNavigate={handleNavigate}
        />

        <main className="content-area" id="main-content">
          {/* Page header */}
          {currentRoute !== 'dashboard' && currentRoute !== 'plans' && (
            <div className="page-header">
              <h1 className="page-title">{meta.title}</h1>
              <p className="page-subtitle">{meta.subtitle}</p>
            </div>
          )}

          {/* Page content */}
          <div className="fade-up">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* New Material Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Create new material">
            <button className="modal-close" onClick={() => setIsModalOpen(false)} aria-label="Close">
              <X size={18} />
            </button>

            <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--sp-1)' }}>
              Create New Material
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-3)', marginBottom: 'var(--sp-6)' }}>
              What would you like to generate today?
            </p>

            <div className="grid-3" style={{ marginBottom: 'var(--sp-6)' }}>
              {[
                { icon: FileText,  label: 'Summary',    color: 'var(--clr-sky)',     bg: 'var(--clr-sky-bg)',      route: 'dashboard'  },
                { icon: Layers,    label: 'Flashcards', color: 'var(--clr-amber)',   bg: 'var(--clr-amber-bg)',    route: 'flashcards' },
                { icon: PenTool,   label: 'New Note',   color: 'var(--clr-mint)',    bg: 'var(--clr-mint-bg)',     route: 'notes'      },
              ].map(({ icon: Icon, label, color, bg, route }) => (
                <button
                  key={label}
                  onClick={() => { setIsModalOpen(false); handleNavigate(route); addToast(`${label} opened.`); }}
                  style={{
                    background: bg, border: `1.5px solid ${color}33`,
                    borderRadius: 'var(--r-lg)', padding: 'var(--sp-6) var(--sp-4)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-3)',
                    cursor: 'pointer', transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 'var(--r-sm)',
                    background: `${color}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color
                  }}>
                    <Icon size={22} />
                  </div>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--clr-text-1)' }}>
                    {label}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Auth consumer wrapper (unchanged) ──────────────────────
function AuthConsumerWrapper() {
  const addToast = useToast();
  return (
    <AuthProvider addToast={addToast}>
      <AppContent />
    </AuthProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthConsumerWrapper />
    </ToastProvider>
  );
}