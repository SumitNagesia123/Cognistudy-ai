import React, { useState, useEffect } from 'react';
import { Search, Sparkles, FileText, Save, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../App';
import { api } from '../api/client';

const NOTE_DOTS = [
  'var(--clr-rose)',
  'var(--clr-amber)',
  'var(--clr-mint)',
  'var(--clr-sky)',
  'var(--clr-lavender)'
];

export default function Notes() {
  const addToast = useToast();
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  
  // Editing state
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [improving, setImproving] = useState(false);

  const fetchNotes = async (selectId = null) => {
    try {
      const data = await api.get('/history');
      const summaryNotes = (data || []).filter(item => item.type === "summary" || item.type === "note");
      
      const formatted = summaryNotes.map(item => ({
        id: item._id,
        title: item.input || "Untitled Note",
        body: item.output || "",
        date: new Date(item.createdAt).toLocaleDateString(),
        raw: item
      }));

      setNotes(formatted);
      
      const idToSelect = selectId || (formatted.length > 0 ? formatted[0].id : null);
      if (idToSelect) {
        const found = formatted.find(n => n.id === idToSelect);
        if (found) {
          setActiveNoteId(found.id);
          setEditTitle(found.title);
          setEditBody(found.body);
        }
      } else {
        setActiveNoteId(null);
        setEditTitle("");
        setEditBody("");
      }
    } catch (err) {
      console.error(err);
      addToast("Failed to load study notes", "error");
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSelectNote = (note) => {
    setActiveNoteId(note.id);
    setEditTitle(note.title);
    setEditBody(note.body);
  };

  const handleCreateNote = async () => {
    try {
      const newNote = await api.post('/history', {
        type: 'note',
        input: 'Untitled Note',
        output: ''
      });
      addToast('Created new note');
      await fetchNotes(newNote._id);
    } catch (err) {
      addToast('Failed to create new note', 'error');
    }
  };

  const handleSave = async () => {
    if (!activeNoteId) return;
    try {
      setSaving(true);
      await api.put(`/history/${activeNoteId}`, {
        input: editTitle,
        output: editBody
      });
      addToast("Note saved successfully!");
      setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, title: editTitle, body: editBody } : n));
    } catch (err) {
      addToast("Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this note permanently?')) return;
    try {
      await api.delete(`/delete/${noteId}`);
      addToast('Note deleted');
      const remaining = notes.filter(n => n.id !== noteId);
      setNotes(remaining);
      if (activeNoteId === noteId) {
        if (remaining.length > 0) {
          handleSelectNote(remaining[0]);
        } else {
          setActiveNoteId(null);
          setEditTitle('');
          setEditBody('');
        }
      }
    } catch (err) {
      addToast('Failed to delete note', 'error');
    }
  };

  const handleAIImprove = async () => {
    if (!editBody.trim()) {
      addToast("Enter some notes first to improve!", "error");
      return;
    }

    try {
      setImproving(true);
      addToast("AI is polishing your notes...");
      const data = await api.post('/improve', { text: editBody });
      setEditBody(data.result);
      addToast("Notes improved by AI!");
    } catch (err) {
      addToast(err.message || "Failed to improve note", "error");
    } finally {
      setImproving(false);
    }
  };

  // Filter notes by search
  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.body.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="notes-layout">
      {/* Notes List Panel */}
      <div className="notes-list-panel">
        <div className="notes-list-header" style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search notes..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleCreateNote} title="New Note" style={{ padding: '8px 10px', height: '36px' }}>
            <Plus size={16} />
          </button>
        </div>
        
        <div className="notes-list-scroll">
          {filteredNotes.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--sp-6) var(--sp-2)' }}>
              <FileText size={28} />
              <h4>No notes</h4>
              <p style={{ fontSize: 'var(--text-xs)' }}>Create summaries first</p>
            </div>
          ) : (
            filteredNotes.map((note, index) => {
              const isActive = activeNoteId === note.id;
              const dotColor = NOTE_DOTS[index % NOTE_DOTS.length];
              return (
                <div 
                  key={note.id}
                  className={`note-item${isActive ? ' active' : ''}`}
                  onClick={() => handleSelectNote(note)}
                  style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start', position: 'relative' }}
                >
                  <span 
                    className="note-item__type-dot" 
                    style={{ background: dotColor }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 className="note-item__title" style={{ fontWeight: isActive ? 700 : 600 }}>
                      {note.title}
                    </h4>
                    <p className="note-item__preview">
                      {note.body || "Empty note content..."}
                    </p>
                    <div className="note-item__date">{note.date}</div>
                  </div>
                  <button
                    className="note-item__delete-btn"
                    onClick={(e) => handleDeleteNote(note.id, e)}
                    title="Delete note"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Note Editor Panel */}
      <div className="notes-editor-panel">
        {!activeNoteId ? (
          <div className="notes-empty">
            <div style={{ background: 'var(--clr-indigo-50)', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clr-indigo-500)' }}>
              <FileText size={32} />
            </div>
            <h3 style={{ fontSize: 'var(--text-lg)' }}>No Note Selected</h3>
            <p style={{ fontSize: 'var(--text-sm)' }}>Select a study note on the left or generate a summary to edit.</p>
          </div>
        ) : (
          <>
            <div className="notes-editor-header">
              <input 
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Note Title"
              />
              <div className="flex gap-2">
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={handleAIImprove}
                  disabled={improving}
                >
                  {improving ? (
                    <span className="spin" style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid var(--clr-indigo-500)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  ) : (
                    <>
                      <Sparkles size={14} /> AI Improve
                    </>
                  )}
                </button>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save size={14} /> Save
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="notes-editor-body">
              <textarea 
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="Start typing your study notes here..."
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
