import React from 'react';
import {
  LayoutDashboard, CalendarDays, Trophy, Gift,
  MessageCircle, LogOut, Zap, BookOpen, Clock, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'docs',       label: 'Documents',    icon: FileText },
  { id: 'plans',      label: 'Study plans',  icon: BookOpen },
  { id: 'history',    label: 'Schedule',     icon: CalendarDays },
  { id: 'flashcards', label: 'Milestone',    icon: Trophy },
  { id: 'notes',      label: 'Rewards',      icon: Gift },
  { id: 'chat',       label: "Let's Chat",   icon: MessageCircle },
];

export default function Sidebar({ currentRoute, onNavigate, isOpen, onClose }) {
  const { logout } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${isOpen ? ' sidebar-overlay--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <nav className={`sidebar${isOpen ? ' sidebar--open' : ''}`} aria-label="Main navigation">

        {/* ── Logo ──────────────────────── */}
        <div className="sidebar__logo" onClick={() => { onNavigate('landing'); onClose?.(); }} role="button" tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter') { onNavigate('landing'); onClose?.(); } }}>
          <div className="sidebar__logo-icon">
            <Zap size={18} />
          </div>
          <span className="sidebar__logo-name">CogniStudy</span>
        </div>

        {/* ── Nav items ─────────────────── */}
        <div className="sidebar__nav">
          {NAV.map(item => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar__item${isActive ? ' active' : ''}`}
                onClick={() => { onNavigate(item.id); onClose?.(); }}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                {item.label}
              </button>
            );
          })}

          <button
            className="sidebar__item sidebar__item--logout"
            onClick={logout}
          >
            <LogOut size={18} strokeWidth={1.8} />
            Log out
          </button>
        </div>

        {/* ── Mascot + Upgrade ──────────── */}
        <div className="sidebar__footer">
          {/* Mascot character */}
          <div className="sidebar__mascot">
            <img
              src="/mascot-sidebar.png"
              alt="CogniStudy AI Companion"
              style={{ width: '100%', maxWidth: 120, display: 'block', margin: '0 auto' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* Upgrade card */}
          <div className="sidebar__upgrade">
            <div className="sidebar__upgrade-title">Upgrade your plan</div>
            <div className="sidebar__upgrade-sub">
              Unlock AI features, join study groups
            </div>
            <button className="sidebar__sync-btn" onClick={() => onNavigate('settings')}>
              Sync Account
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}