import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getDeckStats, getMasteryLevel } from '../utils/sm2';
import { format } from 'date-fns';

const MASTERY_ORDER = ['new', 'learning', 'familiar', 'reviewing', 'mastered'];

const LIGHT_MASTERY_COLORS = {
  new:       '#9CA3AF',
  learning:  '#c2410c',
  familiar:  '#b45309',
  reviewing: '#0369a1',
  mastered:  '#15803d',
};

const LIGHT_MASTERY_BG = {
  new:       'rgba(156,163,175,0.12)',
  learning:  'rgba(194,65,12,0.10)',
  familiar:  'rgba(180,83,9,0.10)',
  reviewing: 'rgba(3,105,161,0.10)',
  mastered:  'rgba(21,128,61,0.10)',
};

export default function DeckView({ decks, updateDeck, deleteDeck }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const deck = decks.find(d => d.id === id);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingCard, setEditingCard] = useState(null);

  if (!deck) return (
    <div className="page">
      <div className="container" style={{ paddingTop: 48 }}>
        <p style={{ color: 'var(--text2)', marginBottom: 16 }}>Deck not found.</p>
        <Link to="/" className="btn btn-ghost">← Back to Home</Link>
      </div>
    </div>
  );

  const stats = getDeckStats(deck.cards || []);

  const filtered = (deck.cards || []).filter(card => {
    const matchesSearch = card.front.toLowerCase().includes(search.toLowerCase()) ||
      card.back.toLowerCase().includes(search.toLowerCase());
    const level = getMasteryLevel(card);
    return (filter === 'all' || level === filter) && matchesSearch;
  });

  const handleDeleteCard = (cardId) => updateDeck({ ...deck, cards: deck.cards.filter(c => c.id !== cardId) });
  const handleEditCard = (card) => setEditingCard({ ...card });
  const handleSaveEdit = () => {
    updateDeck({ ...deck, cards: deck.cards.map(c => c.id === editingCard.id ? editingCard : c) });
    setEditingCard(null);
  };

  const masteryData = MASTERY_ORDER.map(level => ({
    level,
    count: stats.masteryLevels[level] || 0,
    color: LIGHT_MASTERY_COLORS[level],
    bg: LIGHT_MASTERY_BG[level],
    label: level.charAt(0).toUpperCase() + level.slice(1),
  }));

  return (
    <div className="page">
      <nav className="nav">
        <Link to="/" className="logo"><div className="logo-dot" />Recall</Link>
        <div style={{ display: 'flex', gap: 8 }}>
          {stats.due > 0 && (
            <button className="btn btn-primary" onClick={() => navigate(`/study/${deck.id}`)}>
              Study Now ({stats.due})
            </button>
          )}
          <button className="btn btn-danger" onClick={() => {
            if (window.confirm('Delete this deck?')) { deleteDeck(deck.id); navigate('/'); }
          }}>Delete</button>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 36 }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 32 }}>
            <div style={{ fontSize: 52, lineHeight: 1 }}>{deck.emoji}</div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                {deck.title}
              </h1>
              <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 12 }}>
                {deck.subject} · Created {format(new Date(deck.createdAt), 'MMM d, yyyy')}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge">{stats.total} cards</span>
                <span className="badge" style={{
                  color: stats.due > 0 ? '#c2410c' : '#15803d',
                  background: stats.due > 0 ? 'rgba(194,65,12,0.08)' : 'rgba(21,128,61,0.08)',
                  borderColor: stats.due > 0 ? 'rgba(194,65,12,0.2)' : 'rgba(21,128,61,0.2)',
                }}>
                  {stats.due > 0 ? `${stats.due} due` : '✓ All up to date'}
                </span>
                <span className="badge">{stats.masteryScore}% mastery</span>
              </div>
            </div>
          </div>

          {/* Mastery breakdown */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
              Mastery Breakdown
            </h3>
            <div style={{ display: 'flex', height: 8, borderRadius: 100, overflow: 'hidden', marginBottom: 18, background: '#F3F4F6' }}>
              {masteryData.map(({ level, count, color }) =>
                count > 0 ? (
                  <motion.div key={level} initial={{ flex: 0 }} animate={{ flex: count }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ background: color }} title={`${level}: ${count}`} />
                ) : null
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setFilter('all')} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: filter === 'all' ? 'rgba(255,112,67,0.1)' : 'transparent',
                border: `1px solid ${filter === 'all' ? 'rgba(255,112,67,0.4)' : 'var(--border)'}`,
                borderRadius: 8, padding: '6px 12px', cursor: 'pointer', transition: 'all var(--transition)',
                fontSize: 13, color: filter === 'all' ? 'var(--accent)' : 'var(--text2)',
                fontWeight: filter === 'all' ? 600 : 400,
              }}>
                All <span style={{ fontWeight: 700, marginLeft: 4 }}>{stats.total}</span>
              </button>
              {masteryData.map(({ level, count, color, bg, label }) => (
                <button key={level} onClick={() => setFilter(filter === level ? 'all' : level)} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: filter === level ? bg : 'transparent',
                  border: `1px solid ${filter === level ? color + '55' : 'var(--border)'}`,
                  borderRadius: 8, padding: '6px 12px', cursor: 'pointer', transition: 'all var(--transition)',
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 13, color, fontWeight: 700 }}>{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }}
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="search" placeholder="Search cards..." value={search}
              onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
          </div>

          {/* Cards list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((card, i) => {
              const level = getMasteryLevel(card);
              const color = LIGHT_MASTERY_COLORS[level];
              return (
                <motion.div key={card.id} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: i * 0.02 } }}
                  className="card" style={{ padding: '16px 20px', borderLeft: `3px solid ${color}` }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text)', lineHeight: 1.5 }}>
                        {card.front}
                      </p>
                      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{card.back}</p>
                      <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                          color, background: LIGHT_MASTERY_BG[level], padding: '2px 8px', borderRadius: 100,
                        }}>{level}</span>
                        {card.topic && (
                          <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 100, fontWeight: 500 }}>
                            {card.topic}
                          </span>
                        )}
                        {card.nextReview && (
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                            Next: {format(new Date(card.nextReview), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn-icon" onClick={() => handleEditCard(card)} title="Edit">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button className="btn-icon danger" onClick={() => handleDeleteCard(card.id)} title="Delete">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text3)' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                <p style={{ fontSize: 14 }}>No cards match your search.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Edit modal */}
      {editingCard && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(38,50,56,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: 24, backdropFilter: 'blur(4px)',
        }}>
          <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{ width: '100%', maxWidth: 520, background: 'var(--bg2)', borderRadius: 16, padding: 28, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>
              Edit Card
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Front (Question)
                </label>
                <textarea value={editingCard.front} onChange={e => setEditingCard({ ...editingCard, front: e.target.value })} rows={3} style={{ resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Back (Answer)
                </label>
                <textarea value={editingCard.back} onChange={e => setEditingCard({ ...editingCard, back: e.target.value })} rows={4} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setEditingCard(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </motion.div>
        </div>
      )}

      <style>{`
        .btn-icon { background: transparent; border: none; color: var(--text3); cursor: pointer; padding: 6px; border-radius: 6px; transition: all var(--transition); display: flex; align-items: center; }
        .btn-icon:hover { color: var(--text); background: var(--bg3); }
        .btn-icon.danger:hover { color: #be123c; background: rgba(190,18,60,0.08); }
      `}</style>
    </div>
  );
}
