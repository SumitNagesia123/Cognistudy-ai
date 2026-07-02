import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Calendar, Clock, Plus, Trash2, CheckCircle, 
  AlertTriangle, Sparkles, X, ChevronRight, ChevronLeft, 
  ChevronDown, Filter, CalendarDays, List 
} from 'lucide-react';
import { useToast } from '../App';
import { api } from '../api/client';

// Dynamic subject color and icon mappings
const getCardStyle = (subject = '', type = '', index) => {
  const sub = subject.toLowerCase();
  const t = type.toLowerCase();
  
  if (sub.includes('chemistry')) {
    return { cls: 'simbi-plan-card--pink', icon: '🧪' };
  }
  if (sub.includes('mathematics') || sub.includes('math')) {
    return { cls: 'simbi-plan-card--green', icon: '✍️' };
  }
  if (sub.includes('economics')) {
    return { cls: 'simbi-plan-card--orange', icon: '📊' };
  }
  if (sub.includes('physics')) {
    return { cls: 'simbi-plan-card--grey', icon: '🔬' };
  }
  if (sub.includes('money') || sub.includes('finance')) {
    return { cls: 'simbi-plan-card--grey', icon: '💰' };
  }
  if (sub.includes('english')) {
    return { cls: 'simbi-plan-card--pink', icon: '📖' };
  }
  if (sub.includes('history')) {
    return { cls: 'simbi-plan-card--purple', icon: '🏛️' };
  }
  if (sub.includes('computer') || sub.includes('algorithm') || sub.includes('code')) {
    return { cls: 'simbi-plan-card--sky', icon: '💻' };
  }

  // Fallback by type
  if (t === 'test') {
    return { cls: 'simbi-plan-card--green', icon: '📝' };
  }
  if (t === 'review') {
    return { cls: 'simbi-plan-card--purple', icon: '🔄' };
  }

  // General fallbacks based on index
  const styles = [
    { cls: 'simbi-plan-card--pink', icon: '📖' },
    { cls: 'simbi-plan-card--green', icon: '✍️' },
    { cls: 'simbi-plan-card--orange', icon: '📝' },
    { cls: 'simbi-plan-card--grey', icon: '🔬' },
    { cls: 'simbi-plan-card--purple', icon: '📚' },
    { cls: 'simbi-plan-card--sky', icon: '💻' }
  ];
  return styles[index % styles.length];
};

export default function StudyPlans() {
  const addToast = useToast();
  const [plans, setPlans] = useState([]);
  const [deadlines, setDeadlines] = useState({ upcoming: [], missed: [] });
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState('plans');

  // Form states
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('reading');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [selectedSessionId, setSelectedSessionId] = useState('');

  // ── Pomodoro Timer States ──
  const [timerMode, setTimerMode] = useState('focus'); // focus, short, long
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  // ── Daily Habits Checklist States ──
  const [habits, setHabits] = useState([
    { id: 1, name: '📖 Read course material (30m)', done: false },
    { id: 2, name: '📝 Practice active recall flashcards', done: true },
    { id: 3, name: '✍️ Solve practice exam questions', done: false },
    { id: 4, name: '🔄 Review yesterday\'s study summary', done: false },
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansData, deadlinesData, sessionsData] = await Promise.all([
        api.get('/study-plans'),
        api.get('/study-plans/deadlines'),
        api.get('/sessions')
      ]);

      setPlans(plansData || []);
      setDeadlines({
        upcoming: deadlinesData?.urgent || [],
        missed: deadlinesData?.missed || []
      });
      setDocs((sessionsData || []).map(item => ({
        id: item._id,
        name: item.fileName || 'Untitled Document'
      })));
    } catch (err) {
      console.error(err);
      addToast('Failed to sync study plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Pomodoro Ticking Effect ──
  useEffect(() => {
    let interval = null;
    if (timerRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setTimerRunning(false);
      addToast(timerMode === 'focus' ? '🎉 Focus session finished! Take a break.' : '⏰ Break time over! Ready to focus?', 'success');
      resetTimer(timerMode === 'focus' ? 'short' : 'focus');
    }
    return () => clearInterval(interval);
  }, [timerRunning, secondsLeft, timerMode]);

  const resetTimer = (mode) => {
    setTimerMode(mode);
    setTimerRunning(false);
    if (mode === 'focus') setSecondsLeft(25 * 60);
    else if (mode === 'short') setSecondsLeft(5 * 60);
    else if (mode === 'long') setSecondsLeft(15 * 60);
  };

  const handleToggleHabit = (id) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, done: !h.done } : h));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      addToast('Please enter a subject', 'error');
      return;
    }

    try {
      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);

      if (end <= start) {
        addToast('End time must be after start time', 'error');
        return;
      }

      const body = {
        subject,
        type,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        sessionId: selectedSessionId || undefined
      };

      const newPlan = await api.post('/study-plans', body);
      setPlans(prev => [newPlan, ...prev]);
      setModalOpen(false);
      setSubject('');
      setType('reading');
      setSelectedSessionId('');
      addToast('Study plan scheduled!');
      fetchData();
    } catch (err) {
      addToast(err.message || 'Failed to schedule plan', 'error');
    }
  };

  const handleToggleStatus = async (plan) => {
    const nextStatus = plan.status === 'completed' ? 'upcoming' : 'completed';
    setPlans(prev => prev.map(p => p._id === plan._id ? { ...p, status: nextStatus } : p));

    try {
      await api.patch(`/study-plans/${plan._id}/status`, { status: nextStatus });
      addToast(`Plan marked as ${nextStatus}!`);
      fetchData();
    } catch (err) {
      addToast('Failed to update plan status', 'error');
      setPlans(prev => prev.map(p => p._id === plan._id ? { ...p, status: plan.status } : p));
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm("Delete this study plan?")) return;
    try {
      await api.delete(`/study-plans/${id}`);
      setPlans(prev => prev.filter(p => p._id !== id));
      addToast('Study plan deleted');
      fetchData();
    } catch (err) {
      addToast('Failed to delete study plan', 'error');
    }
  };

  const getGroupedPlans = () => {
    const today = new Date().toDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toDateString();

    const todayList = [];
    const tomorrowList = [];
    const upcomingList = [];
    const pastList = [];

    plans.forEach(plan => {
      const planDate = new Date(plan.startTime);
      const planDateStr = planDate.toDateString();

      if (planDateStr === today) {
        todayList.push(plan);
      } else if (planDateStr === tomorrowStr) {
        tomorrowList.push(plan);
      } else if (planDate > new Date()) {
        upcomingList.push(plan);
      } else {
        pastList.push(plan);
      }
    });

    const sortPlans = (list) => list.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    return [
      { title: 'Today', items: sortPlans(todayList) },
      { title: 'Tomorrow', items: sortPlans(tomorrowList) },
      { title: 'Upcoming Sessions', items: sortPlans(upcomingList) },
      { title: 'Completed & Past', items: pastList.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)) }
    ];
  };

  if (loading && plans.length === 0) {
    return (
      <div className="loading-screen" style={{ height: '50vh', position: 'relative', background: 'transparent' }}>
        <div className="loading-screen__ring" />
      </div>
    );
  }

  const grouped = getGroupedPlans();

  // ── Calculate Stats for Tracker ──
  const totalMinutes = plans.reduce((acc, plan) => {
    if (plan.status !== 'completed') return acc;
    const start = new Date(plan.startTime);
    const end = new Date(plan.endTime);
    return acc + (end - start) / (1000 * 60);
  }, 0);
  const totalHours = (totalMinutes > 0 ? (totalMinutes / 60) : 4.5).toFixed(1);

  const completedCount = plans.filter(p => p.status === 'completed').length;
  const totalCount = plans.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 75;

  const habitDoneCount = habits.filter(h => h.done).length;
  const habitProgress = Math.round((habitDoneCount / habits.length) * 100);

  return (
    <div className="studyplans-page">
      
      {/* ── Custom Header ── */}
      <div className="studyplans-header">
        <div className="studyplans-header__left">
          <div className="studyplans-header__title-wrap" onClick={fetchData}>
            <h1 className="studyplans-header__title">Study Plans</h1>
            <ChevronDown className="studyplans-header__chevron" size={20} />
          </div>
          <div className="studyplans-tabs">
            <button 
              className={`studyplans-tab${currentTab === 'plans' ? ' studyplans-tab--active' : ''}`}
              onClick={() => setCurrentTab('plans')}
            >
              Study Plans
            </button>
            <button 
              className={`studyplans-tab${currentTab === 'tracker' ? ' studyplans-tab--active' : ''}`}
              onClick={() => setCurrentTab('tracker')}
            >
              Study Plan Tracker
            </button>
          </div>
        </div>
        <div className="studyplans-header__right">
          <button className="btn-filter">
            <Filter size={14} /> Filter
          </button>
          <button className="btn-start-session" onClick={() => setModalOpen(true)}>
            Start a Study Session
          </button>
        </div>
      </div>

      {/* ── Toolbar / Controls ── */}
      <div className="studyplans-toolbar">
        <div className="studyplans-toolbar__left">
          <button className="toolbar-calendar-btn">
            <CalendarDays size={16} />
            Today, {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            <ChevronDown size={14} />
          </button>
          <div className="toolbar-nav">
            <button className="toolbar-nav__arrow"><ChevronLeft size={13} /></button>
            <button className="toolbar-nav__today">Today</button>
            <button className="toolbar-nav__arrow"><ChevronRight size={13} /></button>
          </div>
        </div>
        <div className="studyplans-toolbar__right">
          <div className="view-toggles">
            <button className="view-toggle-btn view-toggle-btn--active">
              <CalendarDays size={15} />
            </button>
            <button className="view-toggle-btn">
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {currentTab === 'plans' ? (
        /* ── Main Grid Content (Study Plans Tab) ── */
        <div className="studyplans-body">
          
          {/* Left column: Study plans list grouped */}
          <div className="studyplans-grid-col">
            {grouped.every(g => g.items.length === 0) ? (
              <div className="card" style={{ padding: 'var(--sp-10)', textAlign: 'center', borderRadius: 'var(--r-2xl)' }}>
                <Calendar size={48} style={{ color: 'var(--clr-indigo-300)', marginBottom: 'var(--sp-4)' }} />
                <h4>No study plans scheduled</h4>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-3)', maxWidth: 360, margin: '0 auto var(--sp-5)' }}>
                  Stay on track by organizing your study timetable. Select documents and set smart alerts.
                </p>
                <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                  Schedule First Session
                </button>
              </div>
            ) : (
              grouped.map(group => {
                if (group.items.length === 0) return null;
                return (
                  <div key={group.title} className="flex-col gap-3">
                    <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--clr-text-3)', margin: 'var(--sp-2) var(--sp-1) 0 var(--sp-1)' }}>
                      {group.title}
                    </h4>
                    
                    <div className="studyplans-cards-grid">
                      {group.items.map((plan, index) => {
                        const isCompleted = plan.status === 'completed';
                        const { cls, icon } = getCardStyle(plan.subject, plan.type, index);
                        
                        return (
                          <div 
                            key={plan._id} 
                            className={`simbi-plan-card ${cls}`}
                            style={{ opacity: isCompleted ? 0.75 : 1 }}
                          >
                            <div className="simbi-plan-card__icon-box">
                              {icon}
                            </div>
                            
                            <div className="simbi-plan-card__info">
                              <h4 className="simbi-plan-card__title">
                                {plan.subject}
                              </h4>
                              <p className="simbi-plan-card__time">
                                {new Date(plan.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(plan.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            
                            <button 
                              className="simbi-plan-card__menu" 
                              onClick={() => handleDeletePlan(plan._id)}
                              title="Delete plan"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right column: pep-talk & deadlines */}
          <div className="studyplans-sidebar">
            {/* Simbi's Pep talk */}
            <div className="simbi-peptalk">
              <div className="simbi-peptalk__content">
                <h3 className="simbi-peptalk__title">Simbi's Pep talk</h3>
                <p className="simbi-peptalk__text">
                  Study Plan - let's pretend you'll stick to it 😅
                </p>
              </div>
              <div className="simbi-peptalk__mascot">
                <img src="/mascot-sidebar.png" alt="Simbi Mascot" />
              </div>
            </div>

            {/* Urgent deadlines */}
            <div className="sidebar-deadline-card">
              <div className="sidebar-deadline-card__title sidebar-deadline-card__title--urgent">
                Urgent deadlines
              </div>
              <div className="sidebar-deadline-card__list">
                {deadlines.upcoming.length === 0 ? (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', margin: 0 }}>No urgent deadlines within 24h.</p>
                ) : (
                  deadlines.upcoming.map(plan => (
                    <div key={plan._id} className="sidebar-plan-mini sidebar-plan-mini--yellow">
                      <div className="sidebar-plan-mini__icon">
                        ✍️
                      </div>
                      <div className="sidebar-plan-mini__info">
                        <h4 className="sidebar-plan-mini__title">{plan.subject}</h4>
                        <p className="sidebar-plan-mini__sub">Today</p>
                      </div>
                      <button className="sidebar-plan-mini__menu" onClick={() => handleToggleStatus(plan)} title="Complete">
                        <CheckCircle size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Missed deadlines */}
            <div className="sidebar-deadline-card">
              <div className="sidebar-deadline-card__title sidebar-deadline-card__title--missed">
                Missed deadlines
              </div>
              <div className="sidebar-deadline-card__list">
                {deadlines.missed.length === 0 ? (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', margin: 0 }}>No missed sessions. Great job!</p>
                ) : (
                  deadlines.missed.map(plan => (
                    <div key={plan._id} className="sidebar-plan-mini sidebar-plan-mini--rose">
                      <div className="sidebar-plan-mini__icon">
                        📝
                      </div>
                      <div className="sidebar-plan-mini__info">
                        <h4 className="sidebar-plan-mini__title">{plan.subject}</h4>
                        <p className="sidebar-plan-mini__sub">Today</p>
                      </div>
                      <button className="sidebar-plan-mini__menu" onClick={() => handleToggleStatus(plan)} title="Complete">
                        <CheckCircle size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Inline Graphic: Double Chat bubbles */}
            <div className="sidebar-footer-graphic">
              <svg width="58" height="58" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M42 36C42 42.6274 36.6274 48 30 48C28.3243 48 26.7335 47.6565 25.2917 47.037L16 50L19 41.5641C17.1352 39.7547 16 37.1264 16 34C16 27.3726 21.3726 22 28 22C30.2 22 32.5 22.8 34.5 24" stroke="#ffaa40" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 28C22 21.3726 27.3726 16 34 16C40.6274 16 46 21.3726 46 28C46 31.1264 44.8648 33.7547 43 35.5641L46 44L36.7083 41.037C35.2665 41.6565 33.6757 42 32 42C29.8 42 27.5 41.2 25.5 39.6" stroke="#7c5cfc" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="30" cy="28" r="1.5" fill="#7c5cfc" />
                <circle cx="34" cy="28" r="1.5" fill="#7c5cfc" />
                <circle cx="38" cy="28" r="1.5" fill="#7c5cfc" />
              </svg>
            </div>

          </div>
        </div>
      ) : (
        /* ── Study Plan Tracker Content Tab ── */
        <div className="studyplans-body">
          
          <div className="studyplans-grid-col">
            
            {/* Stats Row */}
            <div className="tracker-stats">
              <div className="tracker-stat-card">
                <span className="tracker-stat-card__lbl">Hours Studied</span>
                <span className="tracker-stat-card__val">{totalHours}h</span>
              </div>
              <div className="tracker-stat-card">
                <span className="tracker-stat-card__lbl">Completion Rate</span>
                <span className="tracker-stat-card__val">{completionRate}%</span>
              </div>
              <div className="tracker-stat-card">
                <span className="tracker-stat-card__lbl">Sessions Active</span>
                <span className="tracker-stat-card__val">{plans.filter(p => p.status !== 'completed').length} left</span>
              </div>
              <div className="tracker-stat-card">
                <span className="tracker-stat-card__lbl">Habit Progress</span>
                <span className="tracker-stat-card__val">{habitProgress}%</span>
              </div>
            </div>

            {/* Pomodoro Timer and Habits Grid */}
            <div className="tracker-main">
              
              {/* Pomodoro Timer */}
              <div className="pomodoro-card">
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--clr-text-2)' }}>⏱️ Study Focus Timer</span>
                  <span style={{ fontSize: '10px', color: 'var(--clr-primary)', fontWeight: 700 }}>Active Pomodoro</span>
                </div>
                
                <div className="pomodoro-modes">
                  <button 
                    className={`pomodoro-mode-btn${timerMode === 'focus' ? ' pomodoro-mode-btn--active' : ''}`}
                    onClick={() => resetTimer('focus')}
                  >
                    Focus (25m)
                  </button>
                  <button 
                    className={`pomodoro-mode-btn${timerMode === 'short' ? ' pomodoro-mode-btn--active' : ''}`}
                    onClick={() => resetTimer('short')}
                  >
                    Short Break
                  </button>
                  <button 
                    className={`pomodoro-mode-btn${timerMode === 'long' ? ' pomodoro-mode-btn--active' : ''}`}
                    onClick={() => resetTimer('long')}
                  >
                    Long Break
                  </button>
                </div>

                <div className="pomodoro-display">
                  <svg width="140" height="140" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                    <circle cx="70" cy="70" r="62" fill="none" stroke="var(--clr-border)" strokeWidth="6" />
                    <circle 
                      cx="70" 
                      cy="70" 
                      r="62" 
                      fill="none" 
                      stroke="var(--clr-primary)" 
                      strokeWidth="6" 
                      strokeDasharray={2 * Math.PI * 62}
                      strokeDashoffset={2 * Math.PI * 62 * (1 - secondsLeft / (timerMode === 'focus' ? 25*60 : timerMode === 'short' ? 5*60 : 15*60))}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <span className="pomodoro-time-text">{formatTime(secondsLeft)}</span>
                </div>

                <div className="pomodoro-controls">
                  <button 
                    className={`pomodoro-btn ${timerRunning ? 'pomodoro-btn--pause' : 'pomodoro-btn--start'}`}
                    onClick={() => setTimerRunning(prev => !prev)}
                  >
                    {timerRunning ? 'Pause' : 'Start Focus'}
                  </button>
                  <button 
                    className="pomodoro-btn pomodoro-btn--reset"
                    onClick={() => resetTimer(timerMode)}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Daily Habits Checklist */}
              <div className="habits-card">
                <div className="habits-header">
                  <h4 className="habits-title">🎯 Daily Habit Goals</h4>
                  <span style={{ fontSize: '11px', color: 'var(--clr-text-3)', fontWeight: 700 }}>
                    {habitDoneCount} / {habits.length}
                  </span>
                </div>

                <div className="habits-progress-container">
                  <div className="habits-progress-bar">
                    <div className="habits-progress-fill" style={{ width: `${habitProgress}%` }} />
                  </div>
                </div>

                <div className="habits-list">
                  {habits.map(habit => (
                    <div 
                      key={habit.id} 
                      className={`habit-item${habit.done ? ' habit-item--done' : ''}`}
                      onClick={() => handleToggleHabit(habit.id)}
                    >
                      <div className="habit-item__checkbox">
                        {habit.done && <CheckCircle size={12} fill="#34c991" style={{ color: 'white' }} />}
                      </div>
                      <span className="habit-item__name">{habit.name}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Subject Distribution */}
            <div className="subject-dist-card">
              <h4 className="subject-dist-title">📊 Study Time Distribution by Subject</h4>
              <div className="subject-bars-list">
                <div className="subject-bar-row">
                  <div className="subject-bar-header">
                    <span>Chemistry</span>
                    <span>4.0 hrs (40%)</span>
                  </div>
                  <div className="subject-bar-track">
                    <div className="subject-bar-fill" style={{ width: '40%', backgroundColor: '#ff6b9d' }} />
                  </div>
                </div>
                <div className="subject-bar-row">
                  <div className="subject-bar-header">
                    <span>Mathematics</span>
                    <span>3.5 hrs (35%)</span>
                  </div>
                  <div className="subject-bar-track">
                    <div className="subject-bar-fill" style={{ width: '35%', backgroundColor: '#34c991' }} />
                  </div>
                </div>
                <div className="subject-bar-row">
                  <div className="subject-bar-header">
                    <span>Physics</span>
                    <span>1.5 hrs (15%)</span>
                  </div>
                  <div className="subject-bar-track">
                    <div className="subject-bar-fill" style={{ width: '15%', backgroundColor: '#555577' }} />
                  </div>
                </div>
                <div className="subject-bar-row">
                  <div className="subject-bar-header">
                    <span>Other / Reading</span>
                    <span>1.0 hrs (10%)</span>
                  </div>
                  <div className="subject-bar-track">
                    <div className="subject-bar-fill" style={{ width: '10%', backgroundColor: '#7c5cfc' }} />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right sidebar tracker */}
          <div className="studyplans-sidebar">
            <div className="simbi-peptalk">
              <div className="simbi-peptalk__content">
                <h3 className="simbi-peptalk__title">Simbi's Pep talk</h3>
                <p className="simbi-peptalk__text">
                  Tracker - shows you where all that "study time" actually went 🤓
                </p>
              </div>
              <div className="simbi-peptalk__mascot">
                <img src="/mascot-sidebar.png" alt="Simbi Mascot" />
              </div>
            </div>

            {/* Urgent deadlines */}
            <div className="sidebar-deadline-card">
              <div className="sidebar-deadline-card__title sidebar-deadline-card__title--urgent">
                Urgent deadlines
              </div>
              <div className="sidebar-deadline-card__list">
                {deadlines.upcoming.length === 0 ? (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', margin: 0 }}>No urgent deadlines within 24h.</p>
                ) : (
                  deadlines.upcoming.map(plan => (
                    <div key={plan._id} className="sidebar-plan-mini sidebar-plan-mini--yellow">
                      <div className="sidebar-plan-mini__icon">
                        ✍️
                      </div>
                      <div className="sidebar-plan-mini__info">
                        <h4 className="sidebar-plan-mini__title">{plan.subject}</h4>
                        <p className="sidebar-plan-mini__sub">Today</p>
                      </div>
                      <button className="sidebar-plan-mini__menu" onClick={() => handleToggleStatus(plan)} title="Complete">
                        <CheckCircle size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Missed deadlines */}
            <div className="sidebar-deadline-card">
              <div className="sidebar-deadline-card__title sidebar-deadline-card__title--missed">
                Missed deadlines
              </div>
              <div className="sidebar-deadline-card__list">
                {deadlines.missed.length === 0 ? (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', margin: 0 }}>No missed sessions. Great job!</p>
                ) : (
                  deadlines.missed.map(plan => (
                    <div key={plan._id} className="sidebar-plan-mini sidebar-plan-mini--rose">
                      <div className="sidebar-plan-mini__icon">
                        📝
                      </div>
                      <div className="sidebar-plan-mini__info">
                        <h4 className="sidebar-plan-mini__title">{plan.subject}</h4>
                        <p className="sidebar-plan-mini__sub">Today</p>
                      </div>
                      <button className="sidebar-plan-mini__menu" onClick={() => handleToggleStatus(plan)} title="Complete">
                        <CheckCircle size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Graphic SVG */}
            <div className="sidebar-footer-graphic">
              <svg width="58" height="58" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M42 36C42 42.6274 36.6274 48 30 48C28.3243 48 26.7335 47.6565 25.2917 47.037L16 50L19 41.5641C17.1352 39.7547 16 37.1264 16 34C16 27.3726 21.3726 22 28 22C30.2 22 32.5 22.8 34.5 24" stroke="#ffaa40" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 28C22 21.3726 27.3726 16 34 16C40.6274 16 46 21.3726 46 28C46 31.1264 44.8648 33.7547 43 35.5641L46 44L36.7083 41.037C35.2665 41.6565 33.6757 42 32 42C29.8 42 27.5 41.2 25.5 39.6" stroke="#7c5cfc" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="30" cy="28" r="1.5" fill="#7c5cfc" />
                <circle cx="34" cy="28" r="1.5" fill="#7c5cfc" />
                <circle cx="38" cy="28" r="1.5" fill="#7c5cfc" />
              </svg>
            </div>

          </div>

        </div>
      )}

      {/* Schedule Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Schedule study session">
            <button className="modal-close" onClick={() => setModalOpen(false)} aria-label="Close">
              <X size={18} />
            </button>

            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--sp-1)' }}>Schedule Study Session</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', marginBottom: 'var(--sp-5)' }}>
              Set goals and keep consistency in your study routine.
            </p>

            <form onSubmit={handleCreatePlan} className="flex-col gap-4">
              <div className="flex-col gap-1">
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Subject / Topic</label>
                <input 
                  type="text" 
                  placeholder="e.g. Organic Chemistry, Algorithms" 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)} 
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
                <div className="flex-col gap-1">
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Session Type</label>
                  <select value={type} onChange={e => setType(e.target.value)} style={{ padding: '8px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--clr-border)' }}>
                    <option value="reading">📖 Reading</option>
                    <option value="test">📝 Mock Test</option>
                    <option value="review">🔄 Revision</option>
                  </select>
                </div>

                <div className="flex-col gap-1">
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Link PDF Document (Optional)</label>
                  <select value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)} style={{ padding: '8px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--clr-border)' }}>
                    <option value="">No Document Link</option>
                    {docs.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--sp-4)' }}>
                <div className="flex-col gap-1">
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div className="flex-col gap-1">
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Start</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                </div>
                <div className="flex-col gap-1">
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>End</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                </div>
              </div>

              <div style={{ marginTop: 'var(--sp-4)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule Plan</button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
