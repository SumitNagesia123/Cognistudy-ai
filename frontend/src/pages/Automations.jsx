import React, { useState } from 'react';
import { Play, Settings2, Zap, Clock, Calendar, RefreshCw, ToggleRight, ToggleLeft } from 'lucide-react';
import { useToast } from '../App';

export default function Automations() {
  const addToast = useToast();
  const [workflows, setWorkflows] = useState([
    { id: 1, name: 'Auto-Summarize Uploads', description: 'Automatically generate a summary as soon as a new PDF is uploaded.', active: true, icon: Zap, color: 'var(--clr-amber)', bg: 'var(--clr-amber-bg)' },
    { id: 2, name: 'Smart Flashcard Sync', description: 'Generate study cards automatically from highlighted document sections.', active: false, icon: RefreshCw, color: 'var(--clr-rose)', bg: 'var(--clr-rose-bg)' },
    { id: 3, name: 'Daily Review Reminder', description: 'Schedule a 5-minute recap of your flashcards every morning at 8:00 AM.', active: true, icon: Clock, color: 'var(--clr-sky)', bg: 'var(--clr-sky-bg)' },
    { id: 4, name: 'Google Drive Watcher', description: 'Automatically sync and process files from your "Study Material" drive folder.', active: false, icon: Calendar, color: 'var(--clr-mint)', bg: 'var(--clr-mint-bg)' }
  ]);

  const toggleWorkflow = (id) => {
    setWorkflows(prev => prev.map(w => {
      if (w.id === id) {
        const newState = !w.active;
        addToast(`${w.name} ${newState ? 'enabled' : 'disabled'}.`);
        return { ...w, active: newState };
      }
      return w;
    }));
  };

  return (
    <div className="automations-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <div className="grid-2" style={{ gap: 'var(--sp-6)' }}>
        {workflows.map(w => (
          <div key={w.id} className={`card automation-card ${w.active ? 'active' : ''}`} style={{ padding: 'var(--sp-6)', transition: 'all var(--duration-base) var(--ease)', border: w.active ? `1.5px solid ${w.color}` : '1.5px solid var(--clr-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
                <div style={{ 
                  width: '48px', height: '48px', borderRadius: 'var(--r-md)', 
                  background: w.bg, color: w.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <w.icon size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--clr-text-1)', margin: 0 }}>{w.name}</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-3)', marginTop: '4px', margin: 0 }}>{w.description}</p>
                </div>
              </div>
              <button 
                onClick={() => toggleWorkflow(w.id)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: w.active ? 'var(--clr-indigo-500)' : 'var(--clr-text-3)', padding: 0 }}
              >
                {w.active ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
              </button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--sp-5)', paddingTop: 'var(--sp-4)', borderTop: '1px solid var(--clr-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', color: 'var(--clr-text-3)', fontSize: 'var(--text-xs)' }}>
                <Clock size={13} />
                <span>Last run: {w.active ? '2 hours ago' : 'Never'}</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => addToast('Settings for ' + w.name)} style={{ padding: '6px 10px' }}><Settings2 size={14} /></button>
                <button className="btn btn-primary btn-sm" onClick={() => addToast('Running ' + w.name + ' manually...')} style={{ padding: '6px 12px' }}><Play size={12} style={{ marginRight: 4 }} /> Run Now</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ background: 'linear-gradient(135deg, var(--clr-indigo-50) 0%, var(--clr-surface) 100%)', border: '1.5px dashed var(--clr-indigo-200)', padding: 'var(--sp-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--clr-indigo-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: 'var(--shadow-indigo)' }}>
            <Settings2 color="#fff" size={26} />
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--clr-text-1)', margin: '0 0 4px 0' }}>Custom Workflow Builder</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-2)', margin: 0 }}>Create your own study automation by combining different triggers (upload, time, highlights) with AI actions.</p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              const name = window.prompt("Enter a name for your custom workflow:");
              if (!name) return;
              const desc = window.prompt("Enter a brief description for what it should do:");
              if (!desc) return;
              
              const newWorkflow = {
                id: workflows.length + 1,
                name: name,
                description: desc,
                active: true,
                icon: Zap,
                color: 'var(--clr-primary)',
                bg: 'var(--clr-primary-light)'
              };
              setWorkflows(prev => [...prev, newWorkflow]);
              addToast("Custom workflow created successfully!", "success");
            }}
          >
            Build Workflow
          </button>
        </div>
      </div>
    </div>
  );
}
