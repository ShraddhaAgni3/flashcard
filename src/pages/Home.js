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
    if (count === 0) return 'var(--bg4)';
    const intensity = count / max;
    if (intensity < 0.25) return 'rgba(124,111,247,0.3)';
    if (intensity < 0.5)  return 'rgba(124,111,247,0.55)';
    if (intensity < 0.75) return 'rgba(124,111,247,0.75)';
    return 'var(--accent)';
  };

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const totalReviews = days.reduce((a, d) => a + d.count, 0);
  const activeDays = days.filter(d => d.count > 0).length;

  return (
    <div className="card" style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>Activity — Last 90 Days</h3>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>Less</span>
        {['var(--bg4)', 'rgba(124,111,247,0.3)', 'rgba(124,111,247,0.55)', 'rgba(124,111,247,0.75)', 'var(--accent)'].map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
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
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, var(--accent) ${stats.masteryScore}%, var(--bg4) ${stats.masteryScore}%)` }} />
      <div className="deck-card-header">
        <div className="deck-emoji">{deck.emoji || '📚'}</div>
        <button className="btn-icon" onClick={e => { e.stopPropagation(); if(window.confirm('Delete this deck?')) onDelete(deck.id); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
      <h3 className="deck-title">{deck.title}</h3>
      <p className="deck-subject">{deck.subject || 'General'}</p>
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Mastery</span>
          <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>{stats.masteryScore}%</span>
        </div>
        <div className="progress-bar-container">
          <motion.div className="progress-bar-fill" initial={{ width: 0 }} animate={{ width: `${stats.masteryScore}%` }} transition={{ duration: 1, ease: 'easeOut' }}
            style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }} />
        </div>
        {stats.masteryScore < 100 && daysToMastery > 0 && (
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5 }}>~{daysToMastery} days to mastery at current pace</p>
        )}
        {stats.masteryScore === 100 && <p style={{ fontSize: 11, color: 'var(--green)', marginTop: 5 }}>✓ Fully mastered!</p>}
      </div>
      <div className="deck-stats">
        <div className="stat"><span className="stat-val">{stats.total}</span><span className="stat-label">Cards</span></div>
        <div className="stat"><span className="stat-val" style={{ color: stats.due > 0 ? 'var(--orange)' : 'var(--green)' }}>{stats.due}</span><span className="stat-label">Due</span></div>
        <div className="stat"><span className="stat-val" style={{ color: 'var(--green)' }}>{stats.masteryLevels.mastered || 0}</span><span className="stat-label">Mastered</span></div>
      </div>
      {stats.due > 0 && (
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          className="btn btn-primary" style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
          onClick={e => { e.stopPropagation(); navigate(`/study/${deck.id}`); }}>
          ▶ Study {stats.due} card{stats.due !== 1 ? 's' : ''}
        </motion.button>
      )}
      {stats.due === 0 && stats.total > 0 && (
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: 'var(--green)', padding: '8px', background: 'rgba(34,197,94,0.08)', borderRadius: 8 }}>
          ✓ All caught up!
        </div>
      )}
    </motion.div>
  );
}

export default function Home({ decks, deleteDeck }) {
  const [search, setSearch] = useState('');
  const todayReviews = getTodayReviews();
  const navigate = useNavigate();
  const streak = getStreak();
  const settings = loadSettings();
  const dailyGoal = settings.dailyGoal || 20;
  const totalDue = decks.reduce((acc, d) => acc + getDeckStats(d.cards || []).due, 0);
  const totalCards = decks.reduce((acc, d) => acc + (d.cards?.length || 0), 0);
  const allCards = decks.flatMap(d => d.cards || []);
  const weakCards = allCards.filter(c => c.easeFactor <= 3);
  const weakTopics = [...new Set(weakCards.map(c => c.topic))];
  const totalMastered = decks.reduce((acc, d) => acc + (getDeckStats(d.cards || []).masteryLevels.mastered || 0), 0);
  const goalProgress = Math.min(100, Math.round((todayReviews / dailyGoal) * 100));
  const filtered = decks.filter(d => d.title.toLowerCase().includes(search.toLowerCase()) || (d.subject || '').toLowerCase().includes(search.toLowerCase()));
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

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
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>
          <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 4 }}>{greeting} 👋</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 8 }}>
            {totalDue > 0
              ? <><span style={{ color: 'var(--accent)' }}>{totalDue} cards</span> waiting<br/>for review.</>
              : <>All caught up!<br/><span style={{ color: 'var(--accent)' }}>Great work.</span></>}
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>{totalCards} cards · {totalMastered} mastered · {decks.length} deck{decks.length !== 1 ? 's' : ''}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.15 } }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
          <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Today's Goal</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: goalProgress >= 100 ? 'var(--green)' : 'var(--accent)' }}>{todayReviews}</span>
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>/ {dailyGoal}</span>
            </div>
            <div className="progress-bar-container">
              <motion.div className="progress-bar-fill" initial={{ width: 0 }} animate={{ width: `${goalProgress}%` }} transition={{ duration: 1, delay: 0.3 }}
                style={{ background: goalProgress >= 100 ? 'var(--green)' : 'linear-gradient(90deg, var(--accent), var(--accent2))' }} />
            </div>
            {goalProgress >= 100 && <p style={{ fontSize: 11, color: 'var(--green)', marginTop: 6 }}>🎉 Goal reached!</p>}
          </div>
          <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 28 }}>🔥</span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: streak.count > 0 ? 'var(--orange)' : 'var(--text3)' }}>{streak.count}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Day Streak</div>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 28 }}>⚡</span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--blue)' }}>{totalDue}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due Now</div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.25 } }}>
          <ActivityHeatmap />
          {weakTopics.length > 0 && (
  <div className="card" style={{ marginBottom: 24 }}>
    
    <h3 style={{
      fontFamily: 'var(--font-display)',
      fontSize: 15,
      fontWeight: 700,
      marginBottom: 10
    }}>
      Weak Areas ⚠️ ({weakCards.length})
    </h3>

    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {weakTopics.map((topic, i) => (
        <span key={i} style={{
          padding: '6px 10px',
          background: 'rgba(239,68,68,0.1)',
          color: 'var(--red)',
          borderRadius: 8,
          fontSize: 12
        }}>
          {topic}
        </span>
      ))}
    </div>

    {/* 🔥 ADD BUTTON HERE */}
    <button
      className="btn btn-primary"
      style={{ marginTop: 12 }}
      onClick={() => {
  const firstDeckId = decks[0]?.id;
  if (firstDeckId) {
    navigate(`/study/${firstDeckId}?weak=true`);
  }
}}
    >
      Practice Weak Cards
    </button>

  </div>
)}
        </motion.div>

        {decks.length > 0 && (
          <div style={{ marginBottom: 24, position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="search" placeholder="Search decks..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
          </div>
        )}

        {decks.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state">
            <div style={{ fontSize: 64, marginBottom: 16 }}>🃏</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8 }}>No decks yet</h2>
            <p style={{ marginBottom: 24, lineHeight: 1.6, color: 'var(--text3)' }}>Upload a PDF to generate your first<br/>smart flashcard deck in seconds.</p>
            <Link to="/create" className="btn btn-primary" style={{ fontSize: 15, padding: '12px 28px' }}>Create your first deck →</Link>
          </motion.div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-2">
            {filtered.map(deck => <DeckCard key={deck.id} deck={deck} onDelete={deleteDeck} />)}
          </motion.div>
        )}
      </div>

      <style>{`
        .deck-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .deck-emoji { font-size: 32px; }
        .deck-title { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
        .deck-subject { font-size: 13px; color: var(--text3); }
        .deck-stats { display: flex; gap: 24px; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border); }
        .stat { display: flex; flex-direction: column; gap: 2px; }
        .stat-val { font-family: var(--font-display); font-size: 20px; font-weight: 700; }
        .stat-label { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.05em; }
        .btn-icon { background: transparent; border: none; color: var(--text3); cursor: pointer; padding: 4px; border-radius: 6px; transition: all var(--transition); display: flex; align-items: center; justify-content: center; }
        .btn-icon:hover { color: var(--red); background: rgba(239,68,68,0.1); }
      `}</style>
    </div>
  );
}
