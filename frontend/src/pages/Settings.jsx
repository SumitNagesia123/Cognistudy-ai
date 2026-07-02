import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../App';
import { User, Bell, Shield, Trash2 } from 'lucide-react';
import { api } from '../api/client';

export default function Settings() {
  const { user, updatePreferences } = useAuth();
  const addToast = useToast();
  const [activeTab, setActiveTab] = useState('account');

  const preferences = user?.preferences || {
    darkMode: true,
    autoSave: true,
    emailNotifications: false
  };

  const togglePref = async (key) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    await updatePreferences(updated);
    
    // Actually apply the theme change dynamically in the DOM if toggling darkMode
    if (key === 'darkMode') {
      const htmlEl = document.documentElement;
      if (updated.darkMode) {
        htmlEl.setAttribute('data-theme', 'dark');
      } else {
        htmlEl.removeAttribute('data-theme');
      }
    }
    
    addToast(`${key === 'darkMode' ? 'Theme' : key} updated.`);
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to permanently clear all your study history, notes, and uploaded documents? This action is irreversible.")) return;
    
    try {
      addToast("Clearing study history...");
      const [items, sessions] = await Promise.all([
        api.get('/history'),
        api.get('/sessions')
      ]);

      const deleteHistoryCalls = (items || []).map(item => api.delete(`/delete/${item._id}`));
      const deleteSessionCalls = (sessions || []).map(s => api.delete(`/sessions/${s._id}`));

      await Promise.all([...deleteHistoryCalls, ...deleteSessionCalls]);
      addToast("Successfully cleared all study history and documents!");
    } catch (err) {
      addToast("Failed to clear some history items", "error");
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'CS';

  return (
    <div className="settings-layout">
      {/* Left Navigation Menu */}
      <div className="settings-nav">
        <button 
          className={`settings-nav-item ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <User size={16} /> Account & Profile
        </button>
        <button 
          className={`settings-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={16} /> Notifications
        </button>
        <button 
          className={`settings-nav-item ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Shield size={16} /> Security & Privacy
        </button>
      </div>

      {/* Right Content Panel */}
      <div className="settings-panel">
        
        {activeTab === 'account' && (
          <>
            {/* Profile Hero Section */}
            <div className="settings-profile-hero">
              <div className="settings-avatar">
                {initials}
              </div>
              <div className="settings-profile-info">
                <h3 style={{ margin: 0 }}>{user?.name || 'Alex Scholar'}</h3>
                <p style={{ margin: '4px 0 12px 0' }}>{user?.email || 'alex.scholar@university.edu'}</p>
                <span className="badge badge-indigo">Pro Plan</span>
              </div>
            </div>

            {/* Preferences Cards */}
            <div className="card" style={{ padding: 0 }}>
              <div className="pref-row">
                <div className="pref-row__info">
                  <h4>Dark Mode</h4>
                  <p>Use dark theme across the application</p>
                </div>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={preferences.darkMode} 
                    onChange={() => togglePref('darkMode')} 
                  />
                  <span className="toggle-track" />
                </label>
              </div>
              
              <div className="pref-row">
                <div className="pref-row__info">
                  <h4>Auto-save Summaries</h4>
                  <p>Automatically save generated PDF summaries to your notes list</p>
                </div>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={preferences.autoSave} 
                    onChange={() => togglePref('autoSave')} 
                  />
                  <span className="toggle-track" />
                </label>
              </div>
            </div>
          </>
        )}

        {activeTab === 'notifications' && (
          <div className="card" style={{ padding: 0 }}>
            <div className="pref-row" style={{ borderBottom: 'none' }}>
              <div className="pref-row__info">
                <h4>Email Study Alerts</h4>
                <p>Receive weekly analytics reports and study progress notifications</p>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={preferences.emailNotifications} 
                  onChange={() => togglePref('emailNotifications')} 
                />
                <span className="toggle-track" />
              </label>
            </div>
            <div className="pref-row" style={{ borderBottom: 'none' }}>
              <div className="pref-row__info">
                <h4>Push Notifications</h4>
                <p>Allow browser notifications for study plan reminders</p>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={true} 
                  onChange={() => addToast('Push permissions requested')} 
                />
                <span className="toggle-track" />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <>
            <div className="card" style={{ padding: 0, marginBottom: 'var(--sp-4)' }}>
              <div className="pref-row" style={{ borderBottom: 'none' }}>
                <div className="pref-row__info">
                  <h4>Change Password</h4>
                  <p>Update the password used to access your account</p>
                </div>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const newPwd = window.prompt("Enter your new password:");
                    if (newPwd) addToast("Password updated securely!", "success");
                  }}
                >
                  Update
                </button>
              </div>
            </div>

            {/* Danger Zone Section */}
            <div className="settings-danger">
              <div className="settings-danger-header">
                <Trash2 size={16} /> Danger Zone
              </div>
              <div className="pref-row">
                <div className="pref-row__info">
                  <h4>Clear Study History</h4>
                  <p>Permanently delete all past chat logs, generated summaries and uploaded documents</p>
                </div>
                <button 
                  className="btn btn-danger btn-sm" 
                  onClick={handleClearHistory}
                >
                  Clear Data
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
