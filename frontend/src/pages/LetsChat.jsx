import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Sparkles, Trash2, Bot, User, Copy, CheckCircle } from 'lucide-react';
import { useToast } from '../App';
import { api } from '../api/client';

export default function LetsChat() {
  const addToast = useToast();
  const [messages, setMessages] = useState(() => {
    // Restore past chats from local storage if available
    const saved = localStorage.getItem('cognistudy_general_chat');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('cognistudy_general_chat', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend = input) => {
    const query = textToSend.trim();
    if (!query) return;

    // Add user message to state
    const userMsg = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      // Map frontend messages into history format for backend
      const history = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await api.post('/chat', {
        message: query,
        history
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.result }]);
    } catch (err) {
      addToast(err.message || 'AI assistant offline. Try again.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    addToast('Message copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClear = () => {
    if (window.confirm('Clear all chat messages?')) {
      setMessages([]);
      localStorage.removeItem('cognistudy_general_chat');
      addToast('Conversation cleared');
    }
  };

  const PRESETS = [
    "Explain quantum physics in simple terms",
    "Give me a 5-step study guide for calculus",
    "Compare mitosis and meiosis",
    "Write a short essay outline about renewable energy"
  ];

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <Bot size={20} color="var(--clr-primary)" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>CogniStudy AI Companion</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>Powered by Llama 3.3 · Unrestricted General Knowledge</div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            className="btn btn-danger btn-sm"
            onClick={handleClear}
          >
            <Trash2 size={13} /> Clear Chat
          </button>
        )}
      </div>

      {/* Main chat flow */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
        overflow: 'hidden'
      }}>
        {/* Messages list */}
        <div className="chat-messages-container">
          {messages.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              maxWidth: 480,
              margin: 'auto'
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--clr-primary-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--clr-primary)', marginBottom: 'var(--sp-4)'
              }}>
                <Sparkles size={24} />
              </div>
              <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--sp-2)' }}>Ask me anything!</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-3)', lineHeight: 1.6, marginBottom: 'var(--sp-5)' }}>
                I am your general-purpose study companion. Ask academic questions, generate study structures, or get homework advice.
              </p>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p)}
                    style={{
                      background: 'var(--clr-bg-2)',
                      border: '1px solid var(--clr-border)',
                      borderRadius: 'var(--r-lg)',
                      padding: 'var(--sp-3)',
                      textAlign: 'left',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--clr-text-2)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--clr-primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--clr-border)'}
                  >
                    💡 "{p}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className="chat-bubble-wrap"
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  flexDirection: m.role === 'user' ? 'row-reverse' : 'row'
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: m.role === 'user' ? 'var(--clr-primary)' : 'var(--clr-bg-3)',
                  color: m.role === 'user' ? '#fff' : 'var(--clr-text-1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, border: '1px solid var(--clr-border)',
                  flexShrink: 0
                }}>
                  {m.role === 'user' ? <User size={13} /> : <Bot size={13} />}
                </div>

                {/* Bubble content */}
                <div style={{
                  background: m.role === 'user' ? 'var(--clr-primary-light)' : 'var(--clr-bg-2)',
                  border: `1px solid ${m.role === 'user' ? 'var(--clr-primary-border)' : 'var(--clr-border)'}`,
                  borderRadius: m.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                  padding: 'var(--sp-3) var(--sp-4)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--clr-text-1)',
                  lineHeight: 1.7,
                  position: 'relative'
                }}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>

                  {/* Copy helper for AI messages */}
                  {m.role !== 'user' && (
                    <button
                      onClick={() => handleCopy(m.content, i)}
                      style={{
                        position: 'absolute', right: -30, top: 4,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: copiedIndex === i ? 'var(--clr-primary)' : 'var(--clr-text-3)'
                      }}
                      title="Copy response"
                    >
                      {copiedIndex === i ? <CheckCircle size={13} /> : <Copy size={13} />}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {isSending && (
            <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start', alignSelf: 'flex-start' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--clr-bg-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--clr-border)'
              }}>
                <Bot size={13} />
              </div>
              <div style={{
                background: 'var(--clr-bg-2)', border: '1px solid var(--clr-border)',
                borderRadius: '4px 18px 18px 18px', padding: 'var(--sp-3) var(--sp-4)'
              }}>
                <span className="spin" style={{ display:'inline-block', width:12, height:12, border:'2px solid var(--clr-primary)', borderTopColor:'transparent', borderRadius:'50%', marginRight:8 }} />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>Thinking…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="chat-input-area">
          <input
            placeholder="Type your study question here..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isSending && handleSend()}
            style={{
              flex: 1,
              borderRadius: 'var(--r-pill)',
              padding: 'var(--sp-3) var(--sp-5)',
              border: '1.5px solid var(--clr-border)',
              outline: 'none'
            }}
            disabled={isSending}
          />
          <button
            className="btn btn-primary"
            onClick={() => handleSend()}
            disabled={isSending || !input.trim()}
            style={{ borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
