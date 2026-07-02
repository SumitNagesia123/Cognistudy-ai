import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, RotateCw, X, Check, Brain, Layers, Sparkles,
  ArrowLeft, CheckCircle2, XCircle, Award, Trash2,
  ChevronLeft, ChevronRight, BookOpen, Zap, Target, Trophy
} from 'lucide-react';
import { useToast } from '../App';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const PASTEL_DECKS = [
  { bg: 'var(--clr-sky-bg)',      color: 'var(--clr-sky)',      accent: '#0ea5e9' },
  { bg: 'var(--clr-rose-bg)',     color: 'var(--clr-rose)',     accent: '#f43f5e' },
  { bg: 'var(--clr-mint-bg)',     color: 'var(--clr-mint)',     accent: '#10b981' },
  { bg: 'var(--clr-amber-bg)',    color: 'var(--clr-amber)',    accent: '#f59e0b' },
  { bg: 'var(--clr-lavender-bg)', color: 'var(--clr-lavender)', accent: '#8b5cf6' },
];

export default function Flashcards() {
  const addToast = useToast();
  const { user, updatePoints } = useAuth();
  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hardCards, setHardCards] = useState(new Set());
  const [easyCards, setEasyCards] = useState(new Set());

  // Practice Test
  const [testMode, setTestMode] = useState(false);
  const [testQuestions, setTestQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  const fetchDecks = async () => {
    try {
      const data = await api.get('/history');
      const flashcardHistory = (data || []).filter(item => item.type === 'flashcard');
      const formatted = flashcardHistory.map((item, idx) => {
        let cards = [];
        try { cards = JSON.parse(item.output); } catch (e) {}
        return {
          id: item._id,
          name: item.input || `AI Deck #${idx + 1}`,
          date: new Date(item.createdAt).toLocaleDateString(),
          cards: Array.isArray(cards) ? cards : []
        };
      });
      setDecks(formatted);
      if (formatted.length > 0 && !selectedDeckId) {
        setSelectedDeckId(formatted[0].id);
      }
    } catch (err) {
      addToast('Failed to load flashcard decks', 'error');
    }
  };

  useEffect(() => { fetchDecks(); }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (testMode) return;
      if (e.key === 'ArrowRight') handleNext('Easy');
      if (e.key === 'ArrowLeft')  handleNext('Hard');
      if (e.key === ' ') { e.preventDefault(); setIsFlipped(f => !f); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [testMode, currentCardIndex, isFlipped]);

  const handleCreateDeck = async () => {
    try {
      setLoading(true);
      const data = await api.post('/flashcards');
      if (!data.cards || data.cards.length === 0) {
        addToast('No active study session. Upload a PDF in Documents first!', 'error');
        return;
      }
      addToast('Successfully generated AI flashcards! 🎉');
      await fetchDecks();
      setIsFlipped(false);
      setCurrentCardIndex(0);
    } catch (err) {
      addToast(err.message || 'Failed to create deck', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDeck = async (deckId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this flashcard deck permanently?')) return;
    try {
      await api.delete(`/delete/${deckId}`);
      addToast('Deck deleted');
      const remaining = decks.filter(d => d.id !== deckId);
      setDecks(remaining);
      if (selectedDeckId === deckId) {
        setSelectedDeckId(remaining.length > 0 ? remaining[0].id : null);
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setTestMode(false);
      }
    } catch (err) {
      addToast('Failed to delete deck', 'error');
    }
  };

  const activeDeck = decks.find(d => d.id === selectedDeckId);
  const activeCards = activeDeck?.cards || [];
  const currentCard = activeCards[currentCardIndex];
  const totalCards = activeCards.length;
  const progressPct = totalCards > 0 ? ((currentCardIndex + 1) / totalCards) * 100 : 0;

  const handleSelectDeck = (deck) => {
    setSelectedDeckId(deck.id);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setTestMode(false);
    setHardCards(new Set());
    setEasyCards(new Set());
  };

  const handleNext = (feedback) => {
    if (feedback === 'Hard') {
      setHardCards(prev => new Set([...prev, currentCardIndex]));
    } else {
      setEasyCards(prev => new Set([...prev, currentCardIndex]));
    }
    setIsFlipped(false);
    if (currentCardIndex === totalCards - 1) {
      setTimeout(() => {
        if (window.confirm('You finished the deck! 🎉 Take the Practice Test now?')) {
          startPracticeTest();
        } else {
          setCurrentCardIndex(0);
        }
      }, 300);
    } else {
      setTimeout(() => setCurrentCardIndex(prev => prev + 1), 200);
    }
  };

  const handlePrev = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const startPracticeTest = () => {
    if (activeCards.length === 0) return;
    const maxQs = Math.min(activeCards.length, 5);
    const questionsList = [];
    for (let i = 0; i < maxQs; i++) {
      const card = activeCards[i];
      const isTF = i % 2 === 1;
      if (isTF) {
        const isTrue = Math.random() > 0.5;
        const shownAnswer = isTrue
          ? card.answer
          : (activeCards[(i + 1) % activeCards.length]?.answer || 'an alternate concept');
        questionsList.push({
          id: i, type: 'tf',
          question: `True or False: "${card.question}" — "${shownAnswer}"`,
          correctAnswer: isTrue ? 'True' : 'False',
          options: ['True', 'False']
        });
      } else {
        const distractors = activeCards.filter((_, idx) => idx !== i).map(c => c.answer);
        while (distractors.length < 3) distractors.push(`Distractor ${distractors.length + 1}`);
        const options = [card.answer, ...distractors.slice(0, 3)].sort(() => Math.random() - 0.5);
        questionsList.push({ id: i, type: 'mcq', question: card.question, correctAnswer: card.answer, options });
      }
    }
    setTestQuestions(questionsList);
    setUserAnswers({});
    setTestSubmitted(false);
    setTestScore(0);
    setTestMode(true);
  };

  const handleSubmitTest = () => {
    let correct = 0;
    testQuestions.forEach(q => { if (userAnswers[q.id] === q.correctAnswer) correct++; });
    const score = Math.round((correct / testQuestions.length) * 100);
    setTestScore(score);
    setTestSubmitted(true);
    if (score < 40) {
      addToast(`You scored ${score}%. Review the material and try again! 📚`, 'error');
    } else {
      updatePoints(10);
      addToast(`Great work! You scored ${score}% and earned 10 points! 🪙`, 'success');
    }
  };

  // ── EMPTY STATE ──
  if (decks.length === 0 && !loading) {
    return (
      <div className="fc-layout">
        <div className="fc-deck-list">
          <div className="card fc-sidebar-card">
            <div className="fc-sidebar-header">
              <h3 className="fc-sidebar-title">Your Decks</h3>
            </div>
            <div className="fc-empty-deck-list">
              <Layers size={28} style={{ color: 'var(--clr-text-3)', marginBottom: 8 }} />
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>No decks yet</p>
            </div>
            <button className="btn btn-primary fc-gen-btn" onClick={handleCreateDeck} disabled={loading}>
              <Plus size={15} /> Generate AI Deck
            </button>
          </div>
        </div>
        <div className="fc-arena">
          <div className="fc-empty-state card">
            <div className="fc-empty-icon"><Brain size={36} /></div>
            <h3>No Flashcard Decks</h3>
            <p>Generate your first AI deck from an uploaded PDF or study session.</p>
            <button className="btn btn-primary" onClick={handleCreateDeck} disabled={loading}>
              <Sparkles size={14} /> Generate First Deck
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fc-layout">
      {/* ── Sidebar ── */}
      <div className="fc-deck-list">
        <div className="card fc-sidebar-card">
          <div className="fc-sidebar-header">
            <h3 className="fc-sidebar-title">Your Decks</h3>
            <span className="fc-deck-count">{decks.length}</span>
          </div>

          <div className="fc-deck-scroll">
            {decks.map((deck, idx) => {
              const cfg = PASTEL_DECKS[idx % PASTEL_DECKS.length];
              const isActive = selectedDeckId === deck.id;
              return (
                <div
                  key={deck.id}
                  onClick={() => handleSelectDeck(deck)}
                  className={`fc-deck-item${isActive ? ' active' : ''}`}
                  style={{
                    background: isActive ? cfg.bg : 'transparent',
                    borderColor: isActive ? cfg.color : 'transparent',
                  }}
                >
                  <div className="fc-deck-item__left">
                    <div className="fc-deck-item__dot" style={{ background: cfg.accent }} />
                    <div>
                      <div className="fc-deck-item__title" style={{ color: isActive ? cfg.accent : 'var(--clr-text-1)' }}>
                        {deck.name}
                      </div>
                      <div className="fc-deck-item__meta">{deck.cards.length} cards · {deck.date}</div>
                    </div>
                  </div>
                  <button
                    className="fc-deck-item__del"
                    onClick={(e) => handleDeleteDeck(deck.id, e)}
                    title="Delete deck"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          <button className="btn btn-primary fc-gen-btn" onClick={handleCreateDeck} disabled={loading}>
            {loading
              ? <span className="spin" style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />
              : <><Plus size={15} /> Generate AI Deck</>
            }
          </button>
        </div>

        {/* Stats mini card */}
        {activeDeck && (
          <div className="card fc-stats-card">
            <div className="fc-stat"><BookOpen size={14} /><span>{totalCards} Cards</span></div>
            <div className="fc-stat fc-stat--green"><Check size={14} /><span>{easyCards.size} Easy</span></div>
            <div className="fc-stat fc-stat--red"><X size={14} /><span>{hardCards.size} Hard</span></div>
          </div>
        )}
      </div>

      {/* ── Main Arena ── */}
      <div className="fc-arena">
        {!activeDeck ? (
          <div className="fc-empty-state card">
            <div className="fc-empty-icon"><Brain size={36} /></div>
            <h3>Select a Deck</h3>
            <p>Choose a flashcard deck from the sidebar to start studying.</p>
          </div>
        ) : testMode ? (
          /* ══ PRACTICE TEST ══ */
          <div className="test-container">
            <div className="test-header">
              <button className="btn btn-secondary btn-sm" onClick={() => setTestMode(false)}>
                <ArrowLeft size={14} /> Back
              </button>
              <div style={{ textAlign: 'center' }}>
                <div className="test-badge">Practice Test · {testQuestions.length * 20} Marks</div>
              </div>
              <div style={{ width: 70 }} />
            </div>

            {testSubmitted && (
              <div className="test-score-card">
                {testScore >= 60
                  ? <Trophy size={44} style={{ color: '#f59e0b' }} />
                  : <Target size={44} style={{ color: '#ef4444' }} />
                }
                <div className={`test-score-val ${testScore >= 40 ? 'test-score-val--pass' : 'test-score-val--fail'}`}>
                  {testScore}<span style={{ fontSize: 20, fontWeight: 500 }}>/100</span>
                </div>
                <h3 style={{ margin: 0, fontSize: 'var(--text-md)' }}>
                  {testScore >= 80 ? '🌟 Excellent!' : testScore >= 60 ? '👍 Good Job!' : testScore >= 40 ? '📖 Keep Practicing' : '🔄 Review & Retry'}
                </h3>
                {testScore < 40 ? (
                  <div style={{ fontSize: 'var(--text-xs)', color: '#ef4444', fontWeight: 700, padding: '6px 14px', background: '#fef2f2', borderRadius: 'var(--r-pill)' }}>
                    You scored below 40%. Please review the material and try again!
                  </div>
                ) : (
                  <div className="test-score-award">
                    <span className="test-score-award__coin">🪙</span>
                    <span className="test-score-award__text">+10 Points Earned!</span>
                  </div>
                )}
              </div>
            )}

            {testQuestions.map((q, idx) => {
              const selected = userAnswers[q.id];
              return (
                <div key={q.id} className="test-question-card">
                  <div className="test-question-header">
                    <span>Q{idx + 1} · {q.type === 'mcq' ? 'Multiple Choice' : 'True / False'}</span>
                    <span>20 Marks</span>
                  </div>
                  <div className="test-question-text">{q.question}</div>
                  <div className="test-options-grid">
                    {q.options.map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isSelected = selected === opt;
                      const isCorrect = q.correctAnswer === opt;
                      let cls = 'test-option-btn';
                      if (isSelected) cls += ' test-option-btn--selected';
                      if (testSubmitted && isCorrect) cls += ' test-option-btn--correct';
                      if (testSubmitted && isSelected && !isCorrect) cls += ' test-option-btn--incorrect';
                      return (
                        <button key={opt} className={cls} onClick={() => !testSubmitted && setUserAnswers(p => ({ ...p, [q.id]: opt }))} disabled={testSubmitted}>
                          <span className="test-option-letter">{letter}</span>
                          <span style={{ flex: 1 }}>{opt}</span>
                          {testSubmitted && isCorrect && <CheckCircle2 size={15} style={{ color: '#22c55e' }} />}
                          {testSubmitted && isSelected && !isCorrect && <XCircle size={15} style={{ color: '#ef4444' }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="test-action-row">
              {!testSubmitted ? (
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitTest}
                  disabled={Object.keys(userAnswers).length < testQuestions.length}
                  style={{ padding: '12px 32px' }}
                >
                  <Zap size={15} /> Submit Test
                </button>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={startPracticeTest}>Retake Test</button>
                  <button className="btn btn-primary" onClick={() => setTestMode(false)}>Back to Cards</button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* ══ CARD REVIEW MODE ══ */
          <>
            {/* Deck header bar */}
            <div className="card fc-deck-header-bar">
              <div className="fc-deck-header-bar__left">
                <div className="fc-deck-header-bar__name">{activeDeck.name}</div>
                <div className="fc-deck-header-bar__sub">
                  Card {currentCardIndex + 1} of {totalCards}
                </div>
              </div>
              <div className="fc-deck-header-bar__right">
                <button
                  className="btn btn-secondary btn-sm fc-test-btn"
                  onClick={startPracticeTest}
                >
                  📝 Practice Test
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="fc-progress-bar-wrap">
              <div className="fc-progress-bar-track">
                <div className="fc-progress-bar-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="fc-progress-pct">{Math.round(progressPct)}%</span>
            </div>

            {/* Flip Card */}
            <div className={`flip-card${isFlipped ? ' flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
              <div className="flip-card__inner">
                <div className="flip-card__face">
                  <div className="flip-card__chip">Question</div>
                  <div className="flip-card__text">{currentCard?.question || 'No Question'}</div>
                  <div className="flip-card__footer"><RotateCw size={13} /> Click to reveal answer</div>
                </div>
                <div className="flip-card__face flip-card__back">
                  <div className="flip-card__chip flip-card__chip--answer">Answer</div>
                  <div className="flip-card__text" style={{ color: 'var(--clr-indigo-700)' }}>{currentCard?.answer || 'No Answer'}</div>
                  <div className="flip-card__footer" style={{ color: 'var(--clr-indigo-400)' }}><RotateCw size={13} /> Click to flip back</div>
                </div>
              </div>
            </div>

            {/* Navigation + Rating row */}
            <div className="fc-controls-row">
              <button className="fc-nav-btn" onClick={handlePrev} disabled={currentCardIndex === 0} title="Previous">
                <ChevronLeft size={18} />
              </button>

              <div className="fc-rating">
                <button className="fc-rating-btn fc-rating-btn--hard" onClick={() => handleNext('Hard')}>
                  <X size={14} /> Hard
                </button>
                <button className="fc-rating-btn fc-rating-btn--easy" onClick={() => handleNext('Easy')}>
                  <Check size={14} /> Easy
                </button>
              </div>

              <button className="fc-nav-btn" onClick={() => handleNext('Easy')} title="Next">
                <ChevronRight size={18} />
              </button>
            </div>

            <p className="fc-keyboard-hint">
              Use <kbd>Space</kbd> to flip · <kbd>→</kbd> Easy · <kbd>←</kbd> Hard
            </p>
          </>
        )}
      </div>
    </div>
  );
}
