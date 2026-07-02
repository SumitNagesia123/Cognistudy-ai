import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, User, Settings, LogOut, Menu, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../App';

export default function Topbar({ onOpenModal, onOpenSidebar, onNavigate }) {
  const { user, logout } = useAuth();
  const addToast = useToast();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropRef = useRef(null);
  const notifRef = useRef(null);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'CS';

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="topbar" role="banner">
      {/* Mobile hamburger */}
      <button
        className="sidebar__hamburger"
        onClick={onOpenSidebar}
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="topbar__left">
        <div className="search-bar" role="search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search across your workspace..."
            aria-label="Search workspace"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addToast(`Searching for "${e.target.value}"...`);
                setTimeout(() => onNavigate('history'), 500);
                e.target.value = '';
              }
            }}
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="topbar__right">
        {/* New action button */}
        <button
          className="btn btn-primary btn-sm"
          onClick={onOpenModal}
          aria-label="Create new material"
        >
          <Plus size={15} />
          <span className="topbar__new-txt">New</span>
        </button>

        {/* Points Chip */}
        <div className="topbar__points" title="Your study points! Earn more by passing practice tests.">
          <span className="topbar__points-coin">🪙</span>
          <span className="topbar__points-value">{user?.points ?? 100} pts</span>
        </div>

        {/* Bell */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button 
            className="topbar__bell" 
            aria-label="Notifications"
            onClick={() => setNotifOpen(o => !o)}
          >
            <Bell size={18} />
            <span className="topbar__bell-dot" aria-hidden="true" />
          </button>
          
          {notifOpen && (
            <div className="topbar__dropdown" role="menu" style={{ width: '300px', right: '-10px', padding: 0 }}>
              <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--clr-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--clr-text-1)' }}>Notifications</span>
              </div>
              <div style={{ padding: 'var(--sp-6) var(--sp-5)', textAlign: 'center' }}>
                <Bell size={24} style={{ color: 'var(--clr-text-3)', margin: '0 auto var(--sp-2)' }} />
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-2)', fontWeight: 500 }}>You're all caught up!</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', marginTop: 4 }}>No new notifications right now.</div>
              </div>
            </div>
          )}
        </div>

        {/* Profile chip + dropdown */}
        <div className="topbar__profile" ref={dropRef} onClick={() => setDropdownOpen(o => !o)}>
          <div className="topbar__profile-avatar" aria-hidden="true">{initials}</div>
          <div className="topbar__profile-info">
            <div className="topbar__profile-name">{user?.name || 'Student'}</div>
            <div className="topbar__profile-plan">Pro Member</div>
          </div>
          <ChevronDown
            size={15}
            style={{
              color: 'var(--clr-text-3)',
              transform: dropdownOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s'
            }}
          />

          {dropdownOpen && (
            <div className="topbar__dropdown" role="menu">
              <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--clr-border)' }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--clr-text-1)' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>
                  {user?.email}
                </div>
              </div>

              <button 
                className="topbar__dropdown-item" 
                role="menuitem"
                onClick={(e) => { e.stopPropagation(); onNavigate('settings'); setDropdownOpen(false); }}
              >
                <User size={15} /> Profile
              </button>
              <button 
                className="topbar__dropdown-item" 
                role="menuitem"
                onClick={(e) => { e.stopPropagation(); onNavigate('settings'); setDropdownOpen(false); }}
              >
                <Settings size={15} /> Preferences
              </button>

              <div className="topbar__dropdown-divider" />

              <button
                className="topbar__dropdown-item topbar__dropdown-item--danger"
                role="menuitem"
                onClick={(e) => { e.stopPropagation(); logout(); }}
              >
                <LogOut size={15} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}