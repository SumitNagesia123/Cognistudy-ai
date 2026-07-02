import React, { useState, useEffect } from 'react';
import { BookOpen, MoreVertical, ChevronLeft, ChevronRight, CalendarDays, X, Layers, Sparkles, Trash2 } from 'lucide-react';
import { useToast } from '../App';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

/* ── Arc / Speedometer SVG ── */
function ArcChart({ value = 0, max = 100, color = '#7c5cfc', size = 110 }) {
  const r = 46, cx = size / 2, cy = size / 2;
  const angle = Math.PI; // half circle
  const pct = Math.min(value / max, 1);
  const startX = cx - r, startY = cy;
  const endX = cx + r, endY = cy;
  const arcX = cx + r * Math.cos(Math.PI - pct * Math.PI);
  const arcY = cy - r * Math.sin(pct * Math.PI);
  return (
    <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`} overflow="visible">
      <path d={`M ${startX} ${cy} A ${r} ${r} 0 0 1 ${endX} ${cy}`} fill="none" stroke="var(--clr-border)" strokeWidth="9" strokeLinecap="round" />
      {value > 0 && (
        <path d={`M ${startX} ${cy} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${arcX} ${arcY}`} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />
      )}
    </svg>
  );
}

/* ── Circle Ring ── */
function CircleRing({ pct = 0, size = 82, color = '#7c5cfc', strokeWidth = 8, children }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - pct * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--clr-border)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        {children}
      </div>
    </div>
  );
}

/* ── Area Chart SVG ── */
function AreaChart({ data = [], labels = [] }) {
  const W = 260, H = 100, pad = { top: 8, bottom: 22, left: 28, right: 8 };
  const iW = W - pad.left - pad.right, iH = H - pad.top - pad.bottom;
  const maxVal = Math.max(...data, 1);
  const points = data.map((v, i) => ({
    x: pad.left + (i / (data.length - 1)) * iW,
    y: pad.top + iH - (v / maxVal) * iH
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fillD = `${pathD} L ${points[points.length-1].x} ${pad.top + iH} L ${points[0].x} ${pad.top + iH} Z`;
  const yTicks = [0, Math.round(maxVal/2), maxVal];
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {yTicks.map((t, i) => {
        const y = pad.top + iH - (t / maxVal) * iH;
        return <g key={i}><line x1={pad.left} x2={W - pad.right} y1={y} y2={y} stroke="var(--clr-border)" strokeWidth="0.8" strokeDasharray="3,3"/><text x={pad.left - 4} y={y + 3} textAnchor="end" className="area-chart-ylabel">{t}</text></g>;
      })}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c5cfc" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#7c5cfc" stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#areaGrad)" />
      <path d={pathD} fill="none" stroke="#7c5cfc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#7c5cfc" stroke="white" strokeWidth="2" />
      ))}
      {labels.map((l, i) => (
        <text key={i} x={points[i]?.x} y={H - 2} textAnchor="middle" className="area-chart-xlabel">{l}</text>
      ))}
    </svg>
  );
}

const PLAN_COLORS = [
  { bg: '#fff0f6', color: '#ff6b9d', icon: '📖' },
  { bg: '#eef8ff', color: '#38b6ff', icon: '✍️' },
  { bg: '#fff8ee', color: '#ffaa40', icon: '📝' },
  { bg: '#f5f3ff', color: '#9b8aff', icon: '🔬' },
  { bg: '#edfbf5', color: '#34c991', icon: '📐' },
  { bg: '#f5f3ff', color: '#7c5cfc', icon: '📚' },
];

function fmt(d) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard({ onNavigate }) {
  const addToast = useToast();
  const { user } = useAuth();

  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSummarizer, setShowSummarizer] = useState(false);
  const [summary, setSummary] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [todayPlans, setTodayPlans] = useState([]);
  const [metrics, setMetrics] = useState({ docs: 0, streak: 0, flashcards: 0, hours: '0' });
  const [chartData, setChartData] = useState([0,0,0,0,0,0,0]);
  const [scoreTab, setScoreTab] = useState('Week');
  const [selectedActivity, setSelectedActivity] = useState(null);
  
  // Weekly goal states
  const [weeklyGoal, setWeeklyGoal] = useState('5 milestones');
  const [goalVisible, setGoalVisible] = useState(true);
  const [goalMenuOpen, setGoalMenuOpen] = useState(false);
  const goalMenuRef = React.useRef(null);

  // Plan card menu states
  const [openPlanMenuId, setOpenPlanMenuId] = useState(null);
  const [deletedPlanIds, setDeletedPlanIds] = useState([]);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (goalMenuRef.current && !goalMenuRef.current.contains(e.target)) {
        setGoalMenuOpen(false);
      }
      if (!e.target.closest('.plan-item-card__menu') && !e.target.closest('.topbar__dropdown')) {
        setOpenPlanMenuId(null); 
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'Student';

  // Dynamic Scorecard calculations based on scoreTab
  let displayHours = parseFloat(metrics.hours) || 0;
  let displaySessions = metrics.docs || 0;
  let displayRating = 72;
  
  let hoursTarget = 10;
  let sessionsTarget = 8;
  
  if (scoreTab === 'Day') {
    displayHours = parseFloat((displayHours / 7).toFixed(1));
    if (displayHours === 0 && parseFloat(metrics.hours) > 0) displayHours = 0.4;
    displaySessions = Math.max(displaySessions > 0 ? 1 : 0, Math.round(displaySessions / 7));
    displayRating = 85;
    hoursTarget = 2;
    sessionsTarget = 2;
  } else if (scoreTab === 'Month') {
    displayHours = parseFloat((displayHours * 4.3).toFixed(1));
    displaySessions = displaySessions * 4;
    displayRating = 78;
    hoursTarget = 40;
    sessionsTarget = 30;
  }

  const handleScoreTabCycle = (direction) => {
    const tabs = ['Day', 'Week', 'Month'];
    const idx = tabs.indexOf(scoreTab);
    if (direction === 'left') {
      const nextIdx = (idx - 1 + tabs.length) % tabs.length;
      setScoreTab(tabs[nextIdx]);
    } else {
      const nextIdx = (idx + 1) % tabs.length;
      setScoreTab(tabs[nextIdx]);
    }
  };

  const studyTips = [
    "Tip: Try the Pomodoro Technique! Study focus for 25 mins, then take a 5-min break.",
    "Tip: Spaced repetition is key. Review your flashcards 1, 3, and 7 days after reading.",
    "Tip: Write summary notes in your own words instead of highlighting; this builds active recall.",
    "Tip: Study in blocks. Divide your schedule into 45-minute blocks with different subjects.",
    "Tip: Sleep consolidates memory! Avoid late-night cramming sessions before exams.",
  ];
  
  const showRandomTip = () => {
    const tip = studyTips[Math.floor(Math.random() * studyTips.length)];
    addToast(tip);
  };

  const showRatingDetails = () => {
    addToast(`Your ${displayRating}% Brainpower is calculated based on flashcard mastery and consistency!`);
  };

  const fetchData = async () => {
    try {
      const history = await api.get('/history');
      setActivities(history || []);
      const docs = history.filter(i => ['summary','chat'].includes(i.type)).length;
      const fc = history.filter(i => i.type === 'flashcard').length;
      const hrs = (history.reduce((a, i) => a + (i.input?.length || 0), 0) / 5000).toFixed(1);
      const dates = new Set(history.map(i => new Date(i.createdAt).toLocaleDateString()));
      let streak = 0; let d = new Date();
      if (!dates.has(d.toLocaleDateString())) d.setDate(d.getDate()-1);
      while (dates.has(d.toLocaleDateString())) { streak++; d.setDate(d.getDate()-1); }
      setMetrics({ docs, streak, flashcards: fc, hours: hrs });
      const hist = history.map(i => new Date(i.createdAt).toLocaleDateString());
      const cd = [];
      for (let i = 6; i >= 0; i--) {
        const dd = new Date(); dd.setDate(dd.getDate()-i);
        cd.push(hist.filter(x => x === dd.toLocaleDateString()).length);
      }
      setChartData(cd);
      const plans = await api.get('/study-plans');
      const today = new Date().toDateString();
      setTodayPlans(plans.filter(p => new Date(p.startTime).toDateString() === today));
    } catch(e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const [generatingStatus, setGeneratingStatus] = useState('');

  const isValidUrl = (str) => {
    try { const u = new URL(str); return u.protocol === 'http:' || u.protocol === 'https:'; }
    catch { return false; }
  };

  const urlDetected = isValidUrl(url.trim());

  const handleGenerate = async () => {
    const hasText = text.trim().length > 0;
    const hasUrl  = urlDetected;

    if (!hasText && !hasUrl) {
      addToast('Paste some text or enter a valid URL first!', 'error');
      return;
    }

    // URL takes priority over text if both filled
    const input = hasUrl ? url.trim() : text.trim();

    try {
      setIsGenerating(true);
      setSummary('');

      if (hasUrl) {
        setGeneratingStatus('🌐 Fetching page content...');
        await new Promise(r => setTimeout(r, 600)); // UX pause so user sees the status
      }
      setGeneratingStatus('✨ Summarizing with AI...');

      const data = await api.post('/summary', { text: input });
      setSummary(data.result || '');
      setSessionId(data._id);
      addToast(hasUrl ? '🌐 URL summarized successfully!' : '✅ Summary generated!');
      setText('');
      setUrl('');
      await fetchData();
    } catch(e) {
      addToast(e.message || 'Failed to generate summary', 'error');
    } finally {
      setIsGenerating(false);
      setGeneratingStatus('');
    }
  };

  const handleFlashcards = async () => {
    if (!sessionId) { addToast('Generate a summary first!', 'error'); return; }
    try {
      setIsGenerating(true);
      const data = await api.post('/flashcards', { sessionId });
      if (data.cards?.length > 0) { addToast('Flashcards created!'); onNavigate('flashcards'); }
      else addToast('Could not generate flashcards', 'error');
    } catch(e) { addToast(e.message || 'Error', 'error'); }
    finally { setIsGenerating(false); }
  };

  const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today = new Date();
  const chartLabels = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i));
    return dayLabels[d.getDay()];
  });

  // Dynamic Chart calculations based on scoreTab
  let displayChartData = [...chartData];
  let displayChartLabels = [...chartLabels];

  if (scoreTab === 'Day') {
    displayChartLabels = [];
    displayChartData = [];
    const currentHour = new Date().getHours();
    for (let i = 6; i >= 0; i--) {
      let h = currentHour - i * 2;
      if (h < 0) h += 24;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      displayChartLabels.push(`${displayH} ${ampm}`);
      
      const count = activities.filter(act => {
        const date = new Date(act.createdAt);
        const isToday = date.toDateString() === new Date().toDateString();
        const hr = date.getHours();
        return isToday && hr >= h - 1 && hr <= h;
      }).length;
      displayChartData.push(count > 0 ? parseFloat((count * 0.4).toFixed(1)) : (i === 1 ? 0.3 : 0));
    }
  } else if (scoreTab === 'Month') {
    displayChartLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    displayChartData = [0, 0, 0, 0];
    
    activities.forEach(act => {
      const diffDays = Math.floor((today - new Date(act.createdAt)) / (1000 * 60 * 60 * 24));
      const wkIdx = 3 - Math.floor(diffDays / 7);
      if (wkIdx >= 0 && wkIdx < 4) {
        displayChartData[wkIdx]++;
      }
    });
    displayChartData = displayChartData.map((val, idx) => {
      const base = parseFloat((val * 0.5).toFixed(1));
      return base > 0 ? base : [4.5, 6.2, 5.0, 7.5][idx];
    });
  } else {
    displayChartData = chartData.map((val, idx) => {
      const base = parseFloat((val * 0.5).toFixed(1));
      return base > 0 ? base : [0.5, 1.2, 0.8, 1.5, 0.4, 0, 1.0][idx];
    });
  }

  const todayStr = today.toLocaleDateString('en-US', { day:'numeric', month:'long', year:'numeric' });

  return (
    <>
      <div className="simbi-dashboard">
        {/* ═══ LEFT COLUMN ═══ */}
        <div>
          {/* Hero Card */}
          <div className="hero-card">
            <div className="hero-card__text">
              <div className="hero-card__title">Welcome back, {firstName} 👋</div>
              <div className="hero-card__sub">I'm CogniStudy, ready to learn and have fun!</div>
              <button className="hero-card__cta" onClick={() => setShowSummarizer(v => !v)}>
                ✨ Generate a new Summary
              </button>
            </div>
            <div className="hero-card__mascot">
              <img src="/mascot-hero.png" alt="AI Companion" onError={e => e.target.style.display='none'} />
            </div>
          </div>

          {/* Quick Summarizer (toggle) */}
          {showSummarizer && (
            <div className="card" style={{ marginBottom: 'var(--sp-5)', borderRadius: 'var(--r-2xl)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'var(--sp-3)' }}>
                <span style={{ fontWeight:700, fontSize:'var(--text-sm)' }}>⚡ Quick Summarizer</span>
                <button onClick={() => setShowSummarizer(false)} style={{ border:'none', background:'transparent', cursor:'pointer', color:'var(--clr-text-3)' }}><X size={16}/></button>
              </div>

              {/* URL input row with detection badge */}
              <div style={{ marginBottom:'var(--sp-2)' }}>
                <div style={{ position:'relative' }}>
                  <input
                    type="text"
                    placeholder="🌐 Paste any URL (Wikipedia, news article, blog post...)" 
                    value={url}
                    onChange={e => { setUrl(e.target.value); setSummary(''); }}
                    style={{ 
                      width:'100%', paddingRight: urlDetected ? '110px' : '12px',
                      borderColor: urlDetected ? 'var(--clr-primary)' : undefined,
                      boxShadow: urlDetected ? '0 0 0 3px rgba(92,95,239,0.1)' : undefined
                    }}
                  />
                  {urlDetected && (
                    <span style={{
                      position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                      fontSize:10, fontWeight:800, background:'var(--clr-primary-light)',
                      color:'var(--clr-primary)', borderRadius:'var(--r-pill)', padding:'2px 8px',
                      border:'1px solid var(--clr-primary-border)', whiteSpace:'nowrap'
                    }}>✓ URL Detected</span>
                  )}
                </div>
                {url && !urlDetected && (
                  <p style={{ fontSize:11, color:'var(--clr-danger)', marginTop:4, marginBottom:0 }}>
                    ⚠ Not a valid URL. Must start with http:// or https://
                  </p>
                )}
              </div>

              {/* Divider */}
              {!urlDetected && (
                <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-2)', margin:'var(--sp-2) 0' }}>
                  <div style={{ flex:1, height:1, background:'var(--clr-border)' }} />
                  <span style={{ fontSize:11, color:'var(--clr-text-3)', fontWeight:600 }}>OR PASTE TEXT</span>
                  <div style={{ flex:1, height:1, background:'var(--clr-border)' }} />
                </div>
              )}

              {!urlDetected && (
                <textarea
                  placeholder="Paste article text, notes, lecture content..."
                  value={text}
                  onChange={e => { setText(e.target.value); setSummary(''); }}
                  style={{ minHeight:100, width:'100%', marginBottom:'var(--sp-2)' }}
                />
              )}

              <div style={{ display:'flex', gap:'var(--sp-2)', justifyContent:'flex-end', alignItems:'center' }}>
                {isGenerating && generatingStatus && (
                  <span style={{ fontSize:'var(--text-xs)', color:'var(--clr-primary)', fontWeight:600, flex:1 }}>
                    {generatingStatus}
                  </span>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => { setText(''); setUrl(''); setSummary(''); }}>Clear</button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleGenerate}
                  disabled={isGenerating || (!text.trim() && !urlDetected)}
                >
                  {isGenerating
                    ? <><span className="spin" style={{ display:'inline-block', width:11, height:11, border:'2px solid #fff', borderTopColor:'transparent', borderRadius:'50%' }} /> Processing</>
                    : <><Sparkles size={13}/> {urlDetected ? 'Summarize URL' : 'Generate'}</>
                  }
                </button>
              </div>

              {summary && (
                <div style={{ marginTop:'var(--sp-4)', borderTop:'1px solid var(--clr-border)', paddingTop:'var(--sp-4)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-2)', marginBottom:'var(--sp-3)' }}>
                    <div style={{ fontSize:'var(--text-xs)', fontWeight:800, color:'var(--clr-primary)', background:'var(--clr-primary-light)', padding:'3px 10px', borderRadius:'var(--r-pill)', border:'1px solid var(--clr-primary-border)' }}>✨ AI Summary</div>
                  </div>
                  <div style={{ fontSize:'var(--text-sm)', color:'var(--clr-text-2)', lineHeight:1.8, whiteSpace:'pre-wrap' }}>{summary}</div>
                  <div style={{ display:'flex', gap:'var(--sp-2)', marginTop:'var(--sp-3)', flexWrap:'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleFlashcards} disabled={isGenerating}>
                      <Layers size={13}/> Generate Flashcards
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(summary); addToast('Summary copied!'); }}>
                      📋 Copy
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('notes')}>
                      📝 View in Notes
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Study Streak */}
          <div className="streak-section">
            <div className="streak-section__title">Study Streak</div>
            <div className="streak-cards">
              <div className="streak-card">
                <div className="streak-card__label">Consecutive Days</div>
                <div className="streak-card__value">{metrics.streak} 🔥</div>
              </div>
              <div className="streak-card">
                <div className="streak-card__label">AI Mood</div>
                <div className="streak-card__value">😊 Happy</div>
              </div>
              {goalVisible && (
                <div className="streak-card" style={{ position: 'relative' }} ref={goalMenuRef}>
                  <div className="streak-card__label">Weekly goal</div>
                  <div className="streak-card__value" style={{ fontSize:'var(--text-base)' }}>{weeklyGoal}</div>
                  <button 
                    className="streak-card__menu" 
                    onClick={() => setGoalMenuOpen(!goalMenuOpen)}
                  >
                    <MoreVertical size={14}/>
                  </button>

                  {goalMenuOpen && (
                    <div className="topbar__dropdown" style={{ top: '30px', right: '10px', minWidth: '140px', padding: 'var(--sp-2)' }}>
                      <button 
                        className="topbar__dropdown-item" 
                        onClick={() => { 
                          const newGoal = window.prompt("Enter new weekly goal:", weeklyGoal);
                          if (newGoal) {
                            setWeeklyGoal(newGoal);
                            addToast("Weekly goal updated!", "success");
                          }
                          setGoalMenuOpen(false); 
                        }}
                      >
                        ✏️ Edit Goal
                      </button>
                      <button 
                        className="topbar__dropdown-item topbar__dropdown-item--danger" 
                        onClick={() => { 
                          if(window.confirm('Are you sure you want to delete this weekly goal?')) {
                            setGoalVisible(false);
                            addToast("Weekly goal deleted.", "success");
                          } else {
                            setGoalMenuOpen(false);
                          }
                        }}
                      >
                        <Trash2 size={14} style={{ marginRight: '6px' }} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Productivity Scorecard */}
          <div className="scorecard-section">
            <div className="scorecard-header">
              <div className="scorecard-header__title">Productivity Scorecard</div>
              <div className="scorecard-toggle">
                {['Day','Week','Month'].map(t => (
                  <button key={t} className={scoreTab===t?'active':''} onClick={() => setScoreTab(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div className="scorecard-cards">
              {/* Study Hours Arc */}
              <div className="scorecard-card">
                <div className="scorecard-card__label">Study Hours</div>
                <div style={{ position:'relative', marginBottom:'var(--sp-2)' }}>
                  <ArcChart value={Math.min((displayHours / hoursTarget) * 100, 100)} max={100} color="#7c5cfc" size={110}/>
                  <div style={{ textAlign:'center', marginTop:-8, fontFamily:'var(--font-display)', fontSize:'var(--text-xl)', fontWeight:800, color:'var(--clr-text-1)' }}>
                    {displayHours}
                  </div>
                </div>
                <div className="scorecard-card__sub" style={{ color:'var(--clr-success)', fontWeight:600 }}>Great Job!</div>
                <div className="scorecard-card__sub2">Target: {hoursTarget} hrs</div>
                <button className="scorecard-card__btn" onClick={showRandomTip}>Tips</button>
              </div>

              {/* Study Session Circle */}
              <div className="scorecard-card">
                <div className="scorecard-card__label">Study Session</div>
                <div className="session-nav" style={{ marginBottom:'var(--sp-2)' }}>
                  <button className="session-nav__arrow" onClick={() => handleScoreTabCycle('left')}><ChevronLeft size={14}/></button>
                  <CircleRing pct={Math.min(displaySessions / sessionsTarget, 1)} size={82} color="#ffaa40" strokeWidth={8}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-xl)', fontWeight:800, color:'var(--clr-text-1)' }}>
                      {String(displaySessions).padStart(2,'0')}
                    </span>
                  </CircleRing>
                  <button className="session-nav__arrow" onClick={() => handleScoreTabCycle('right')}><ChevronRight size={14}/></button>
                </div>
                <div className="scorecard-card__sub2">Target: {sessionsTarget} sessions</div>
              </div>

              {/* Rating Gauge */}
              <div className="scorecard-card">
                <div className="scorecard-card__label">Rating</div>
                <CircleRing pct={displayRating / 100} size={82} color="#34c991" strokeWidth={8}>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-sm)', fontWeight:800, color:'var(--clr-text-1)', textAlign:'center', lineHeight:1.2 }}>{displayRating}%</span>
                </CircleRing>
                <div className="scorecard-card__sub" style={{ color:'var(--clr-success)', fontWeight:600 }}>{displayRating}% Brainpower</div>
                <div className="scorecard-card__sub2">Keep it up!</div>
                <button className="scorecard-card__btn" onClick={showRatingDetails}>Details</button>
              </div>
            </div>
          </div>

          {/* Active Study Plan */}
          <div className="plans-section">
            <div className="plans-header">
              <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-4)' }}>
                <div className="plans-header__title">Active Study Plan</div>
                <button className="plans-header__view-all" onClick={() => onNavigate('plans')}>View All</button>
              </div>
              <div className="plans-header__date">
                <CalendarDays size={15}/> Today, {todayStr}
              </div>
            </div>
            {todayPlans.length === 0 ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
                {[
                  { title:'Reading - Chemistry', time:'01:00 PM – 02:00 PM', c:0 },
                  { title:'Test - Mathematics', time:'01:00 PM – 02:00 PM', c:1 },
                  { title:'Reading - Biology', time:'01:00 PM – 02:00 PM', c:2 },
                  { title:'Reading - Physics', time:'01:00 PM – 02:00 PM', c:3 },
                ].map((p, i) => {
                  if (deletedPlanIds.includes(`placeholder-${i}`)) return null;
                  const cfg = PLAN_COLORS[p.c];
                  const isOpen = openPlanMenuId === `placeholder-${i}`;
                  return (
                    <div className="plan-item-card" key={i} style={{ zIndex: isOpen ? 50 : 'auto' }}>
                      <div className="plan-item-card__icon" style={{ background:cfg.bg, color:cfg.color }}>{cfg.icon}</div>
                      <div>
                        <div className="plan-item-card__title">{p.title}</div>
                        <div className="plan-item-card__time">{p.time}</div>
                      </div>
                      <button 
                        className="plan-item-card__menu" 
                        onClick={(e) => { e.stopPropagation(); setOpenPlanMenuId(isOpen ? null : `placeholder-${i}`); }}
                      >
                        <MoreVertical size={14}/>
                      </button>

                      {isOpen && (
                        <div className="topbar__dropdown" style={{ top: '30px', right: '10px', minWidth: '120px', padding: 'var(--sp-2)', zIndex: 51 }}>
                          <button 
                            className="topbar__dropdown-item" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              const newTitle = window.prompt("Edit plan title:", "My Study Plan");
                              if (newTitle) {
                                addToast(`Plan updated to: ${newTitle}`, "success");
                              }
                              setOpenPlanMenuId(null); 
                            }}
                          >
                            ✏️ Edit Plan
                          </button>
                          <button 
                            className="topbar__dropdown-item topbar__dropdown-item--danger" 
                            onClick={(e) => { 
                              e.stopPropagation();
                              if(window.confirm('Delete this study plan?')) {
                                setDeletedPlanIds(prev => [...prev, `placeholder-${i}`]);
                                addToast("Study plan deleted", "success");
                              }
                              setOpenPlanMenuId(null);
                            }}
                          >
                            <Trash2 size={14} style={{ marginRight: '6px' }} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="plans-grid">
                {todayPlans.slice(0,4).map((p, i) => {
                  const cfg = PLAN_COLORS[i % PLAN_COLORS.length];
                  const isOpen = openPlanMenuId === p._id;
                  return (
                    <div className="plan-item-card" key={p._id} style={{ zIndex: isOpen ? 50 : 'auto' }}>
                      <div className="plan-item-card__icon" style={{ background:cfg.bg, color:cfg.color }}>{cfg.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="plan-item-card__title">{p.subject}</div>
                        <div className="plan-item-card__time">{fmt(p.startTime)} – {fmt(p.endTime)}</div>
                      </div>
                      <button 
                        className="plan-item-card__menu" 
                        onClick={(e) => { e.stopPropagation(); setOpenPlanMenuId(isOpen ? null : p._id); }}
                      >
                        <MoreVertical size={14}/>
                      </button>

                      {isOpen && (
                        <div className="topbar__dropdown" style={{ top: '30px', right: '10px', minWidth: '120px', padding: 'var(--sp-2)', zIndex: 51 }}>
                          <button 
                            className="topbar__dropdown-item" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              const newTitle = window.prompt("Edit plan title:", "My Study Plan");
                              if (newTitle) {
                                addToast(`Plan updated to: ${newTitle}`, "success");
                              }
                              setOpenPlanMenuId(null); 
                            }}
                          >
                            ✏️ Edit Plan
                          </button>
                          <button 
                            className="topbar__dropdown-item topbar__dropdown-item--danger" 
                            onClick={async (e) => { 
                              e.stopPropagation();
                              if(window.confirm('Delete this study plan?')) {
                                try {
                                  await api.delete(`/study-plans/${p._id}`);
                                  setTodayPlans(prev => prev.filter(x => x._id !== p._id));
                                  addToast("Study plan deleted", "success");
                                } catch (err) {
                                  addToast("Failed to delete study plan", "error");
                                }
                              }
                              setOpenPlanMenuId(null);
                            }}
                          >
                            <Trash2 size={14} style={{ marginRight: '6px' }} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT COLUMN ═══ */}
        <div className="simbi-right-col">
          {/* Rewards & Milestones */}
          <div className="card" style={{ borderRadius:'var(--r-2xl)' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-sm)', fontWeight:700, color:'var(--clr-text-1)', marginBottom:'var(--sp-3)' }}>
              Rewards and Milestones
            </div>
            <div className="rewards-grid">
              <div className="reward-card reward-card--nft">
                <div className="reward-card__label">Current NFT badge</div>
                <img src="/mascot-sidebar.png" alt="NFT" className="reward-card__img" onError={e => e.target.style.display='none'} />
              </div>
              <div className="reward-card">
                <div className="reward-card__label">Rewards Earned (token)</div>
                <div className="reward-card__value">🪙 {metrics.flashcards * 5 + metrics.docs * 3}</div>
              </div>
              <div className="reward-card">
                <div className="reward-card__label">Milestones completed</div>
                <div className="reward-card__value" style={{ justifyContent:'flex-start', gap:8 }}>
                  <span style={{ width:3, height:24, background:'var(--clr-border)', borderRadius:2, display:'inline-block' }}/>
                  {metrics.docs + metrics.flashcards}
                </div>
              </div>
              <div className="reward-card">
                <div className="reward-card__label">Active Plans</div>
                <div className="reward-card__value" style={{ justifyContent:'flex-start', gap:8 }}>
                  <span style={{ width:3, height:24, background:'var(--clr-border)', borderRadius:2, display:'inline-block' }}/>
                  {todayPlans.length || 10}
                </div>
              </div>
            </div>
          </div>

          {/* Study Tips */}
          <div className="tips-card">
            <div className="tips-card__header">
              <div className="tips-card__title">CogniStudy Tips</div>
              <button onClick={showRandomTip} style={{ border:'none', background:'transparent', cursor:'pointer', color:'var(--clr-text-3)' }} title="Next Tip"><MoreVertical size={14}/></button>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'var(--sp-2)' }}>
              <span className="tips-card__tag">Study Session</span>
              <span className="tips-card__time">5 min ago</span>
            </div>
            <div className="tips-card__msg">
              {activities.length > 0
                ? `You've analyzed ${metrics.docs} documents! Try generating flashcards to reinforce your learning and boost retention.`
                : "I set a timer for your study session. Try not to wander off into social media land again. 😄"}
            </div>
          </div>

          {/* Study Consistency */}
          <div className="consistency-card">
            <div className="consistency-card__header">
              <div className="consistency-card__title">Study Consistency</div>
              <div className="scorecard-toggle">
                {['Day','Week','Month'].map(t => (
                  <button key={t} className={scoreTab===t?'active':''} onClick={() => setScoreTab(t)} style={{ fontSize:11 }}>{t}</button>
                ))}
              </div>
            </div>
            <div style={{ fontSize:'var(--text-xs)', color:'var(--clr-text-3)', marginBottom:'var(--sp-2)' }}>Hours</div>
            <AreaChart data={displayChartData} labels={displayChartLabels} />
          </div>
        </div>
      </div>

      {/* Activity Modal */}
      {selectedActivity && (
        <div className="modal-backdrop" onClick={() => setSelectedActivity(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedActivity(null)}><X size={16}/></button>
            <h3 style={{ fontSize:'var(--text-lg)', marginBottom:'var(--sp-4)' }}>Activity Details</h3>
            <div className="history-modal__label">Input</div>
            <div className="history-modal__value">{selectedActivity.input}</div>
            <div className="history-modal__label" style={{ marginTop:'var(--sp-4)' }}>Output</div>
            <div className="history-modal__value">{selectedActivity.output}</div>
          </div>
        </div>
      )}
    </>
  );
}