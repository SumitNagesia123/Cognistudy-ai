import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud, FileText, MessageSquare, Search,
  Trash2, ExternalLink, X, Send, HardDrive, ChevronDown
} from 'lucide-react';
import { useToast } from '../App';
import { api } from '../api/client';

const PASTEL = [
  { bg: 'var(--clr-sky-bg)',      color: 'var(--clr-sky)'      },
  { bg: 'var(--clr-rose-bg)',     color: 'var(--clr-rose)'     },
  { bg: 'var(--clr-mint-bg)',     color: 'var(--clr-mint)'     },
  { bg: 'var(--clr-amber-bg)',    color: 'var(--clr-amber)'    },
  { bg: 'var(--clr-lavender-bg)', color: 'var(--clr-lavender)' },
];

export default function Documents() {
  const addToast = useToast();

  const [docs,         setDocs]         = useState([]);
  const [search,       setSearch]       = useState('');
  const [showAll,      setShowAll]      = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging,   setIsDragging]   = useState(false);
  const [activeDoc,    setActiveDoc]    = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [chatInput,    setChatInput]    = useState('');
  const [isSending,    setIsSending]    = useState(false);
  const [isUploading,  setIsUploading]  = useState(false);
  const messagesEndRef = useRef(null);

  // ── Storage calculation ───────────────────────────────────
  const STORAGE_LIMIT_MB = 500; // 500 MB plan limit
  const AVG_PDF_MB = 2.4;       // average PDF size estimate

  const usedMB = docs.length * AVG_PDF_MB;
  const usedPct = Math.min((usedMB / STORAGE_LIMIT_MB) * 100, 100);
  const formatSize = (mb) => mb >= 1000 ? `${(mb/1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
  const barColor = usedPct > 80 ? '#ef4444' : usedPct > 60 ? '#f59e0b' : 'var(--clr-primary)';

  // ── Fetch user sessions ──────────────────────────────────
  const fetchSessions = async () => {
    try {
      const data = await api.get('/sessions');
      const formatted = (data || []).map((item) => ({
        id:   item._id,
        name: item.fileName || 'Document Note',
        date: new Date(item.createdAt).toLocaleDateString(),
        summary: item.summary,
        raw:  item,
      }));
      setDocs(formatted);
    } catch (err) {
      addToast('Failed to load documents', 'error');
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── File upload ──────────────────────────────────────────
  const handleFileUpload = async (file) => {
    if (!file) return;
    setSelectedFile(file);
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const data = await api.post('/upload-pdf', form);
      const newDoc = {
        id: data._id || data.session?._id,
        name: file.name,
        date: new Date().toLocaleDateString(),
        summary: data.summary,
        raw: data.session || data,
      };
      setDocs(prev => [newDoc, ...prev]);
      setActiveDoc(newDoc);
      setMessages([]);
      addToast('PDF uploaded & summarized!');
    } catch (err) {
      addToast(err.message || 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // ── Delete session ───────────────────────────────────────
  const handleDelete = async (doc, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this document? All chat history and generated flashcards will be cleared.")) return;
    try {
      await api.delete(`/sessions/${doc.id}`);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      if (activeDoc?.id === doc.id) setActiveDoc(null);
      addToast('Deleted successfully');
    } catch (err) {
      addToast('Delete failed', 'error');
    }
  };

  // ── Select document & load chat history ──────────────────
  const handleSelectDoc = async (doc) => {
    setActiveDoc(doc);
    setMessages([]);
    try {
      // Pre-populate with document summary as the first system/AI message
      const systemMessages = doc.summary ? [{ type: 'ai', content: `📄 Document Summary:\n\n${doc.summary}` }] : [];
      setMessages(systemMessages);

      const history = await api.get('/history');
      const chatLogs = (history || [])
        .filter(item => item.type === 'chat' && item.sessionId === doc.id)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // chronological order

      const formattedLogs = chatLogs.map(item => [
        { type: 'user', content: item.input },
        { type: 'ai', content: item.output }
      ]).flat();

      setMessages(prev => [...prev, ...formattedLogs]);
    } catch (err) {
      console.error(err);
      addToast('Failed to load conversation logs', 'error');
    }
  };

  // ── Chat sending ─────────────────────────────────────────
  const handleSend = async () => {
    if (!chatInput.trim() || !activeDoc) return;
    const q = chatInput.trim();
    setMessages(prev => [...prev, { type: 'user', content: q }]);
    setChatInput('');
    setIsSending(true);
    try {
      const data = await api.post('/ask-pdf', {
        question:  q,
        sessionId: activeDoc.id,
      });
      setMessages(prev => [...prev, { type: 'ai', content: data.result || 'No response' }]);
    } catch (err) {
      addToast(err.message || 'AI failed to respond', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const filteredDocs  = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
  const visibleDocs   = showAll ? filteredDocs : filteredDocs.slice(0, 6);

  return (
    <div className="docs-layout">

      {/* ── Left: Upload + Library ──────────────────── */}
      <div className="flex-col gap-4">

        {/* Drop zone */}
        <div
          className={`drop-zone${isDragging ? ' drop-zone--active' : ''}`}
          onClick={() => document.getElementById('doc-file-input').click()}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => {
            e.preventDefault(); setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFileUpload(file);
          }}
        >
          <UploadCloud size={40} />
          <div>
            <strong style={{ color: 'var(--clr-indigo-500)', display: 'block', marginBottom: 4 }}>
              {isUploading ? 'Uploading…' : 'Click to upload or drag & drop'}
            </strong>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-3)' }}>
              PDF only · Max 10 MB
            </span>
          </div>
          {selectedFile && (
            <div style={{
              background: 'var(--clr-indigo-100)', color: 'var(--clr-indigo-700)',
              borderRadius: 'var(--r-pill)', padding: '4px 14px',
              fontSize: 'var(--text-xs)', fontWeight: 600,
            }}>
              📄 {selectedFile.name}
            </div>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={e => { e.stopPropagation(); document.getElementById('doc-file-input').click(); }}
          >
            Select File
          </button>
          <input
            id="doc-file-input" type="file" accept="application/pdf" hidden
            onChange={e => handleFileUpload(e.target.files[0])}
          />
        </div>

        {/* Storage bar — live */}
        <div className="card" style={{ padding: 'var(--sp-5) var(--sp-6)' }}>
          <div className="flex items-center justify-between mb-2">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
              <HardDrive size={16} color="var(--clr-indigo-500)" /> Storage
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: usedPct > 80 ? '#ef4444' : 'var(--clr-text-3)', fontWeight: 600 }}>
              {usedPct.toFixed(0)}% used
            </span>
          </div>
          <div className="storage-bar">
            <div className="storage-bar__fill" style={{ width: `${usedPct}%`, background: barColor, transition: 'width 0.5s ease' }} />
          </div>
          <div className="flex items-center justify-between mt-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>
            <span>{formatSize(usedMB)} used · {docs.length} document{docs.length !== 1 ? 's' : ''}</span>
            <span>{formatSize(STORAGE_LIMIT_MB)} total</span>
          </div>
        </div>

        {/* Library list */}
        <div className="card">
          <div className="docs-library-header">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Your Library</h3>
            <div className="search-bar" style={{ width: 200 }}>
              <Search size={14} />
              <input
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="empty-state">
              <FileText size={32} />
              <h4>No documents yet</h4>
              <p>Upload your first PDF above</p>
            </div>
          ) : (
            <div className="docs-list">
              {visibleDocs.map((doc, i) => {
                const p = PASTEL[i % PASTEL.length];
                return (
                  <div
                    key={doc.id}
                    className={`doc-item card--pastel${activeDoc?.id === doc.id ? ' active' : ''}`}
                    style={{ background: p.bg }}
                    onClick={() => handleSelectDoc(doc)}
                  >
                    <div className="doc-item__icon" style={{ background: `${p.color}22`, color: p.color }}>
                      <FileText size={20} />
                    </div>
                    <div className="doc-item__info">
                      <div className="doc-item__name">{doc.name}</div>
                      <div className="doc-item__meta">{doc.date}</div>
                    </div>
                    <div className="flex gap-2" style={{ flexShrink: 0 }}>
                      <button
                        className="btn-icon"
                        onClick={e => { e.stopPropagation(); handleSelectDoc(doc); }}
                      >
                        <MessageSquare size={15} />
                      </button>
                      <button
                        className="btn-icon"
                        style={{ color: 'var(--clr-danger)' }}
                        onClick={e => handleDelete(doc, e)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredDocs.length > 6 && (
            <div style={{ textAlign: 'center', marginTop: 'var(--sp-4)' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAll(!showAll)}>
                <ChevronDown size={14} style={{ transform: showAll ? 'rotate(180deg)' : 'none' }} />
                {showAll ? 'Show less' : `Show ${filteredDocs.length - 6} more`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Chat panel ──────────────────────── */}
      {activeDoc ? (
        <div className="card docs-chat" style={{ padding: 0 }}>
          {/* Chat header */}
          <div style={{
            padding: 'var(--sp-5) var(--sp-6)',
            borderBottom: '1px solid var(--clr-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>AI Chat Assistant</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>{activeDoc.name}</div>
            </div>
            <button className="btn-icon" onClick={() => setActiveDoc(null)}><X size={18} /></button>
          </div>

          {/* Messages */}
          <div className="docs-chat__messages" style={{ padding: 'var(--sp-5)' }}>
            {messages.length === 0 && (
              <div className="empty-state">
                <MessageSquare size={28} />
                <h4>Ask anything</h4>
                <p>Questions are answered using only your document's content.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble chat-bubble--${m.type}`}>
                <div className="chat-bubble__avatar">
                  {m.type === 'ai' ? 'AI' : 'You'}
                </div>
                <div className="chat-bubble__text">{m.content}</div>
              </div>
            ))}
            {isSending && (
              <div className="chat-bubble chat-bubble--ai">
                <div className="chat-bubble__avatar">AI</div>
                <div className="chat-bubble__text text-3">Thinking…</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input row */}
          <div className="docs-chat__input-row" style={{ padding: 'var(--sp-4) var(--sp-5)' }}>
            <input
              placeholder="Ask a question about this document…"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button className="btn btn-primary" onClick={handleSend} disabled={isSending}>
              <Send size={15} />
            </button>
          </div>
        </div>
      ) : (
        /* How it works panel */
        <div className="card" style={{ background: 'var(--clr-indigo-50)', border: '1.5px solid var(--clr-indigo-100)' }}>
          <div style={{ textAlign: 'center', padding: 'var(--sp-8)' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 'var(--r-xl)',
              background: 'var(--clr-indigo-100)', color: 'var(--clr-indigo-500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--sp-5)',
            }}>
              <MessageSquare size={28} />
            </div>
            <h3 style={{ marginBottom: 'var(--sp-3)', fontSize: 'var(--text-md)' }}>Chat with your PDFs</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-3)', lineHeight: 1.8 }}>
              Select a document from your library to start an AI-powered conversation. Our system answers questions using only the content from your file for maximum accuracy.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}