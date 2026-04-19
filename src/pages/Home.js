import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getDeckStats } from '../utils/sm2';
import { getTodayReviews, getStreak, getLast90Days, loadSettings } from '../utils/storage';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

function ActivityHeatmap() {
  const days = getLast90Days();
  const max = Math.max(...days.map(d => d.count), 1);
  const getColor = (count) => {
    if (count === 0) return '#F3F4F6';
    const intensity = count / max;
    if (intensity < 0.25) return 'rgba(255,112,67,0.25)';
    if (intensity < 0.5)  return 'rgba(255,112,67,0.5)';
    if (intensity < 0.75) return 'rgba(255,112,67,0.75)';
    return '#FF7043';
  };
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const totalReviews = days.reduce((a, d) => a + d.count, 0);
  const activeDays = days.filter(d => d.count > 0).length;
  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Activity — Last 90 Days</h3>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{totalReviews} reviews · {activeDays} active days</span>
      </div>
      <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 4 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {week.map((day, di) => (
              <div key={di} title={`${day.key}: ${day.count} reviews`}
                style={{ width: 11, height: 11, borderRadius: 2, background: getColor(day.count), transition: 'background 0.2s' }} />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>Less</span>
        {['#F3F4F6','rgba(255,112,67,0.25)','rgba(255,112,67,0.5)','rgba(255,112,67,0.75)','#FF7043'].map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c, border: '1px solid rgba(0,0,0,0.06)' }} />
        ))}
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>More</span>
      </div>
    </div>
  );
}

function DeckCard({ deck, onDelete }) {
  const navigate = useNavigate();
  const stats = getDeckStats(deck.cards || []);
  const daysToMastery = stats.masteryScore >= 100 ? 0 : Math.ceil(((100 - stats.masteryScore) / 100) * (stats.total * 3));
  return (
    <motion.div variants={item} className="deck-card card" style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
      onClick={() => navigate(`/deck/${deck.id}`)}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, var(--accent) ${stats.masteryScore}%, #ECEFF1 ${stats.masteryScore}%)` }} />
      <div className="deck-card-header">
        <div style={{ fontSize: 30 }}>{deck.emoji || '📚'}</div>
        <button className="btn-icon" onClick={e => { e.stopPropagation(); if(window.confirm('Delete this deck?')) onDelete(deck.id); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{deck.title}</h3>
      <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>{deck.subject || 'General'}</p>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Mastery</span>
          <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>{stats.masteryScore}%</span>
        </div>
        <div className="progress-bar-container">
          <motion.div className="progress-bar-fill" initial={{ width: 0 }} animate={{ width: `${stats.masteryScore}%` }} transition={{ duration: 1, ease: 'easeOut' }}
            style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }} />
        </div>
        {stats.masteryScore < 100 && daysToMastery > 0 && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5 }}>~{daysToMastery} days to mastery</p>}
        {stats.masteryScore === 100 && <p style={{ fontSize: 11, color: 'var(--green)', marginTop: 5, fontWeight: 600 }}>✓ Fully mastered!</p>}
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{stats.total}</span>
          <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cards</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: stats.due > 0 ? 'var(--orange)' : 'var(--green)' }}>{stats.due}</span>
          <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{stats.masteryLevels.mastered || 0}</span>
          <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mastered</span>
        </div>
      </div>
      {stats.due > 0 && (
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          className="btn btn-primary" style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
          onClick={e => { e.stopPropagation(); navigate(`/study/${deck.id}`); }}>
          Study {stats.due} card{stats.due !== 1 ? 's' : ''} →
        </motion.button>
      )}
      {stats.due === 0 && stats.total > 0 && (
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: 'var(--green)', fontWeight: 600, padding: '8px', background: 'rgba(21,128,61,0.08)', borderRadius: 8 }}>
          ✓ All caught up!
        </div>
      )}
    </motion.div>
  );
}

export default function Home({ decks, deleteDeck }) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const todayReviews = getTodayReviews();
  const streak = getStreak();
  const settings = loadSettings();
  const dailyGoal = settings.dailyGoal || 20;
  const totalDue = decks.reduce((acc, d) => acc + getDeckStats(d.cards || []).due, 0);
  const totalCards = decks.reduce((acc, d) => acc + (d.cards?.length || 0), 0);
  const totalMastered = decks.reduce((acc, d) => acc + (getDeckStats(d.cards || []).masteryLevels.mastered || 0), 0);
  const goalProgress = Math.min(100, Math.round((todayReviews / dailyGoal) * 100));
  const allCards = decks.flatMap(d => d.cards || []);
  const weakCards = allCards.filter(c => c.easeFactor <= 2.3 && c.lastReviewed);
  const weakTopics = [...new Set(weakCards.map(c => c.topic).filter(Boolean))];
  const filtered = decks.filter(d => d.title.toLowerCase().includes(search.toLowerCase()) || (d.subject || '').toLowerCase().includes(search.toLowerCase()));
  const greetingHour = new Date().getHours();
  const greetings = ['Let\'s get smarter today', 'Ready to learn something new?', 'Small steps → big mastery', 'Consistency beats cramming', 'You\'re doing better than you think'];
  const greeting = (greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening') + ' — ' + greetings[Math.floor(Math.random() * greetings.length)];

  return (
    <div className="page">
      <nav className="nav">
        <div className="logo"><div className="logo-dot" />Recall</div>
        <Link to="/create" className="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Deck
        </Link>
      </nav>

      <div className="container" style={{ paddingTop: 40 }}>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 6 }}>{greeting} 👋</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 10, color: 'var(--text)' }}>
            {totalDue > 0
              ? <><span style={{ color: 'var(--accent)' }}>{totalDue} cards</span> ready<br/>for review.</>
              : <>All caught up —<br/><span style={{ color: 'var(--accent)' }}>great work.</span></>}
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>{totalCards} cards · {totalMastered} mastered · {decks.length} deck{decks.length !== 1 ? 's' : ''}</p>
        </motion.div>

        {/* Stats row */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>

          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 500 }}>Today's Goal</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: goalProgress >= 100 ? 'var(--green)' : 'var(--accent)' }}>{todayReviews}</span>
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>/ {dailyGoal}</span>
            </div>
            <div style={{ height: 5, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${goalProgress}%` }} transition={{ duration: 1, delay: 0.3 }}
                style={{ height: '100%', borderRadius: 3, background: goalProgress >= 100 ? 'var(--green)' : 'linear-gradient(90deg, var(--accent), var(--accent2))' }} />
            </div>
            {goalProgress >= 100 && <p style={{ fontSize: 10, color: 'var(--green)', marginTop: 6, fontWeight: 600 }}>🎉 Goal reached!</p>}
          </div>

          <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 32, lineHeight: 1 }}>🔥</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: streak.count > 0 ? '#c2410c' : 'var(--text3)' }}>{streak.count}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Day Streak</div>
            </div>
          </div>

          <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 32, lineHeight: 1 }}>📚</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: totalDue > 0 ? 'var(--accent)' : 'var(--green)' }}>{totalDue}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Due Now</div>
            </div>
          </div>
        </motion.div>

        {/* Heatmap */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }}>
          <ActivityHeatmap />
        </motion.div>

        {/* Weak areas */}
        {weakTopics.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.25 } }}
            className="card" style={{ marginBottom: 24, borderLeft: '3px solid #be123c', background: 'rgba(255,228,230,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#be123c', marginBottom: 8 }}>
                  ⚠️ Weak Areas ({weakCards.length} cards)
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {weakTopics.map((topic, i) => (
                    <span key={i} style={{ padding: '3px 10px', background: 'rgba(190,18,60,0.1)', color: '#be123c', borderRadius: 100, fontSize: 12, fontWeight: 500 }}>
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary" style={{ fontSize: 13, padding: '8px 16px' }}
                onClick={() => { const id = decks[0]?.id; if(id) navigate(`/study/${id}`); }}>
                Practice weak cards
              </button>
            </div>
          </motion.div>
        )}

        {/* Search */}
        {decks.length > 0 && (
          <div style={{ marginBottom: 20, position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }}
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="search" placeholder="Search decks..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
          </div>
        )}

        {/* Decks */}
        {decks.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '80px 40px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🃏</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>No decks yet</h2>
            <p style={{ marginBottom: 24, lineHeight: 1.6, fontSize: 14 }}>Upload a PDF to generate your first smart flashcard deck.</p>
            <Link to="/create" className="btn btn-primary" style={{ fontSize: 15, padding: '12px 28px' }}>Create your first deck →</Link>
          </motion.div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-2">
            {filtered.map(deck => <DeckCard key={deck.id} deck={deck} onDelete={deleteDeck} />)}
          </motion.div>
        )}
      </div>

      <style>{`
        .deck-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .btn-icon { background: transparent; border: none; color: var(--text3); cursor: pointer; padding: 4px; border-radius: 6px; transition: all var(--transition); display: flex; align-items: center; }
        .btn-icon:hover { color: var(--red); background: rgba(190,18,60,0.1); }
      `}</style>
    </div>
  );
}
