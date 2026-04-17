import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getDeckStats, getMasteryColor } from '../utils/sm2';
import { getTodayReviews, getStreak } from '../utils/storage';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

function DeckCard({ deck, onDelete }) {
  const navigate = useNavigate();
  const stats = getDeckStats(deck.cards || []);

  return (
    <motion.div variants={item} className="deck-card card" style={{ cursor: 'pointer' }}
      onClick={() => navigate(`/deck/${deck.id}`)}>
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
          <div className="progress-bar-fill"
            style={{ width: `${stats.masteryScore}%`, background: `linear-gradient(90deg, var(--accent), var(--accent2))` }} />
        </div>
      </div>

      <div className="deck-stats">
        <div className="stat">
          <span className="stat-val">{stats.total}</span>
          <span className="stat-label">Cards</span>
        </div>
        <div className="stat">
          <span className="stat-val" style={{ color: stats.due > 0 ? 'var(--orange)' : 'var(--green)' }}>
            {stats.due}
          </span>
          <span className="stat-label">Due</span>
        </div>
        <div className="stat">
          <span className="stat-val" style={{ color: 'var(--green)' }}>{stats.masteryLevels.mastered || 0}</span>
          <span className="stat-label">Mastered</span>
        </div>
      </div>

      {stats.due > 0 && (
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
          onClick={e => { e.stopPropagation(); navigate(`/study/${deck.id}`); }}>
          Study {stats.due} card{stats.due !== 1 ? 's' : ''}
        </button>
      )}
    </motion.div>
  );
}

export default function Home({ decks, deleteDeck }) {
  const [search, setSearch] = useState('');
  const todayReviews = getTodayReviews();
  const streak = getStreak();

  const totalDue = decks.reduce((acc, d) => acc + getDeckStats(d.cards || []).due, 0);
  const totalCards = decks.reduce((acc, d) => acc + (d.cards?.length || 0), 0);

  const filtered = decks.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.subject || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <nav className="nav">
        <div className="logo">
          <div className="logo-dot" />
          Recall
        </div>
        <Link to="/create" className="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Deck
        </Link>
      </nav>

      <div className="container" style={{ paddingTop: 40 }}>
        {/* Hero stats */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 48 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 8 }}>
            {totalDue > 0 ? <>You have <span style={{ color: 'var(--accent)' }}>{totalDue} cards</span><br/>waiting for you.</> : <>All caught up!<br/><span style={{ color: 'var(--accent)' }}>Great work.</span></>}
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 16 }}>
            {totalCards} total cards across {decks.length} deck{decks.length !== 1 ? 's' : ''}
          </p>
        </motion.div>

        {/* Stats row */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }}
          style={{ display: 'flex', gap: 16, marginBottom: 48, flexWrap: 'wrap' }}>
          {[
            { label: 'Today', value: todayReviews, icon: '🎯', color: 'var(--accent)' },
            { label: 'Streak', value: `${streak.count}d`, icon: '🔥', color: 'var(--orange)' },
            { label: 'Decks', value: decks.length, icon: '📚', color: 'var(--blue)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ flex: '1 1 140px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Search */}
        {decks.length > 0 && (
          <div style={{ marginBottom: 28, position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="search" placeholder="Search decks..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 40 }} />
          </div>
        )}

        {/* Decks grid */}
        {decks.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state">
            <div className="icon">🃏</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8 }}>No decks yet</h2>
            <p style={{ marginBottom: 24, lineHeight: 1.6 }}>Upload a PDF to generate your first smart flashcard deck.</p>
            <Link to="/create" className="btn btn-primary">Create your first deck</Link>
          </motion.div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-2">
            {filtered.map(deck => (
              <DeckCard key={deck.id} deck={deck} onDelete={deleteDeck} />
            ))}
          </motion.div>
        )}
      </div>

      <style>{`
        .deck-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .deck-emoji { font-size: 32px; }
        .deck-title {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 4px;
        }
        .deck-subject { font-size: 13px; color: var(--text3); }
        .deck-stats {
          display: flex;
          gap: 24px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
        }
        .stat { display: flex; flex-direction: column; gap: 2px; }
        .stat-val { font-family: var(--font-display); font-size: 20px; font-weight: 700; }
        .stat-label { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.05em; }
        .btn-icon {
          background: transparent;
          border: none;
          color: var(--text3);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          transition: all var(--transition);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-icon:hover { color: var(--red); background: rgba(239,68,68,0.1); }
      `}</style>
    </div>
  );
}
