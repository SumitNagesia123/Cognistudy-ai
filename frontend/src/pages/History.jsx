import React, { useState, useEffect } from 'react';
import { Search, Trash2, Download, AlignLeft, CheckCircle, Eye, MessageSquare, BookOpen, FileText, X } from 'lucide-react';
import { useToast } from '../App';
import { api } from '../api/client';

export default function History() {
  const [activeTab, setActiveTab] = useState('All');
  const [historyItems, setHistoryItems] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const addToast = useToast();

  const fetchHistory = async () => {
    try {
      const data = await api.get('/history');
      setHistoryItems(data || []);
    } catch (err) {
      console.error(err);
      addToast("Failed to fetch history list", "error");
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this interaction?")) return;
    try {
      await api.delete(`/delete/${id}`);
      addToast("Interaction deleted");
      setHistoryItems(prev => prev.filter(item => item._id !== id));
      if (selectedItem?._id === id) setSelectedItem(null);
    } catch (err) {
      addToast("Delete failed", "error");
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(historyItems, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `cognistudy_history_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast("Exported history as JSON!");
  };

  // Filter based on tab & search query
  const filteredItems = historyItems.filter(item => {
    // 1. Tab filter
    if (activeTab === 'Summaries' && item.type !== 'summary') return false;
    if (activeTab === 'Flashcards' && item.type !== 'flashcard') return false;
    if (activeTab === 'PDF Chats' && item.type !== 'chat') return false;

    // 2. Search filter
    const matchesSearch = 
      (item.input || "").toLowerCase().includes(search.toLowerCase()) || 
      (item.output || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.type || "").toLowerCase().includes(search.toLowerCase());

    return matchesSearch;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'summary':
        return <AlignLeft size={16} />;
      case 'flashcard':
        return <BookOpen size={16} />;
      case 'chat':
        return <MessageSquare size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const getBadgeClass = (type) => {
    switch (type) {
      case 'summary': return 'badge-summary';
      case 'flashcard': return 'badge-flashcard';
      case 'chat': return 'badge-chat';
      default: return 'badge-indigo';
    }
  };

  const getPastelColor = (type) => {
    switch (type) {
      case 'summary': return { bg: 'var(--clr-sky-bg)', color: 'var(--clr-sky)' };
      case 'flashcard': return { bg: 'var(--clr-amber-bg)', color: 'var(--clr-amber)' };
      case 'chat': return { bg: 'var(--clr-rose-bg)', color: 'var(--clr-rose)' };
      default: return { bg: 'var(--clr-lavender-bg)', color: 'var(--clr-lavender)' };
    }
  };

  return (
    <div className="flex-col gap-4">
      {/* Search and Filters Header */}
      <div className="card" style={{ padding: 'var(--sp-4) var(--sp-6)' }}>
        <div className="history-header">
          {/* Tabs using pill-tabs */}
          <div className="pill-tabs">
            {['All', 'Summaries', 'Flashcards', 'PDF Chats'].map(tab => (
              <button 
                key={tab} 
                className={`pill-tab${activeTab === tab ? ' active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-3)', flex: 1, justifyContent: 'flex-end', minWidth: 260 }}>
            <div className="search-bar" style={{ width: '100%', maxWidth: 280 }}>
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search history..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>
              <Download size={14} /> Export
            </button>
          </div>
        </div>
      </div>

      {/* History Items list */}
      <div className="card">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <FileText size={36} />
            <h4>No logs found</h4>
            <p>Your search or filter returned no records.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Interaction details</th>
                  <th>Type</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const colors = getPastelColor(item.type);
                  return (
                    <tr key={item._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', fontWeight: 600 }}>
                          <div 
                            style={{ 
                              width: 34, height: 34, borderRadius: 'var(--r-sm)', 
                              background: colors.bg, color: colors.color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {getIcon(item.type)}
                          </div>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '320px' }}>
                            <div className="truncate" style={{ fontSize: 'var(--text-sm)' }}>
                              {item.input || 'AI Generation'}
                            </div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', fontWeight: 400 }} className="truncate">
                              {item.type === 'flashcard' ? 'Interactive Flashcard Deck' : item.output}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getBadgeClass(item.type)}`}>
                          {item.type}
                        </span>
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span style={{ color: 'var(--clr-success)', fontSize: 'var(--text-xs)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                          <CheckCircle size={12} /> Completed
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn-icon" onClick={() => setSelectedItem(item)}>
                            <Eye size={15} />
                          </button>
                          <button className="btn-icon" style={{ color: 'var(--clr-danger)' }} onClick={(e) => handleDelete(item._id, e)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedItem && (
        <div className="modal-backdrop" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Interaction Record">
            <button className="modal-close" onClick={() => setSelectedItem(null)} aria-label="Close">
              <X size={18} />
            </button>
            
            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--sp-1)' }}>Interaction Details</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', marginBottom: 'var(--sp-5)' }}>
              Type: {selectedItem.type.toUpperCase()} • Created on {new Date(selectedItem.createdAt).toLocaleString()}
            </p>

            <div className="flex-col gap-4">
              <div>
                <div className="history-modal__label">Input Source / Query</div>
                <div className="history-modal__value" style={{ fontWeight: 500 }}>
                  {selectedItem.input}
                </div>
              </div>

              <div>
                <div className="history-modal__label">Response / Output</div>
                <div className="history-modal__value">
                  {selectedItem.type === 'flashcard' ? (() => {
                    try {
                      const cards = JSON.parse(selectedItem.output || '[]');
                      if (!Array.isArray(cards) || cards.length === 0) {
                        return <p style={{ whiteSpace: 'pre-wrap' }}>{selectedItem.output}</p>;
                      }
                      return (
                        <div className="flex-col gap-3">
                          {cards.map((card, cardIdx) => (
                            <div key={cardIdx} style={{ paddingBottom: 'var(--sp-2)', borderBottom: '1px solid var(--clr-border)' }}>
                              <span style={{ fontWeight: 700, color: 'var(--clr-primary)' }}>Q: </span>{card.question || card.front || ''} <br />
                              <span style={{ fontWeight: 700, color: 'var(--clr-mint)' }}>A: </span>{card.answer || card.back || ''}
                            </div>
                          ))}
                        </div>
                      );
                    } catch (e) {
                      return <p style={{ whiteSpace: 'pre-wrap' }}>{selectedItem.output}</p>;
                    }
                  })() : (
                    selectedItem.output
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'var(--sp-6)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
