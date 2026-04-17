import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getDeckStats, getMasteryLevel, getMasteryColor } from '../utils/sm2';
import { format } from 'date-fns';

const MASTERY_ORDER = ['new', 'learning', 'familiar', 'reviewing', 'mastered'];

export default function DeckView({ decks, updateDeck, deleteDeck }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const deck = decks.find(d => d.id === id);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingCard, setEditingCard] = useState(null);

  if (!deck) return <div className="page"><div className="container" style={{ paddingTop: 48 }}><p>Deck not found.</p><Link to="/">← Back</Link></div></div>;

  const stats = getDeckStats(deck.cards || []);

  const filtered = (deck.cards || []).filter(card => {
    const matchesSearch = card.front.toLowerCase().includes(search.toLowerCase()) || card.back.toLowerCase().includes(search.toLowerCase());
    const level = getMasteryLevel(card);
    const matchesFilter = filter === 'all' || level === filter;
    return matchesSearch && matchesFilter;
  });

  const handleDeleteCard = (cardId) => {
    updateDeck({ ...deck, cards: deck.cards.filter(c => c.id !== cardId) });
  };

  const handleEditCard = (card) => {
    setEditingCard({ ...card });
  };

  const handleSaveEdit = () => {
    updateDeck({ ...deck, cards: deck.cards.map(c => c.id === editingCard.id ? editingCard : c) });
    setEditingCard(null);
  };

  // Mastery breakdown
  const masteryData = MASTERY_ORDER.map(level => ({
    level,
    count: stats.masteryLevels[level] || 0,
    color: getMasteryColor(level),
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
          <button className="btn btn-danger" onClick={() => { if (window.confirm('Delete this deck?')) { deleteDeck(deck.id); navigate('/'); } }}>
            Delete
          </button>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 40 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 40 }}>
            <div style={{ fontSize: 56 }}>{deck.emoji}</div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, marginBottom: 4 }}>{deck.title}</h1>
              <p style={{ color: 'var(--text3)', marginBottom: 12 }}>
                {deck.subject} · Created {format(new Date(deck.createdAt), 'MMM d, yyyy')}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge">{stats.total} cards</span>
                <span className="badge" style={{ color: stats.due > 0 ? 'var(--orange)' : 'var(--green)' }}>
                  {stats.due > 0 ? `${stats.due} due` : '✓ All up to date'}
                </span>
                <span className="badge">{stats.masteryScore}% mastery</span>
              </div>
            </div>
          </div>

          {/* Mastery breakdown */}
          <div className="card" style={{ marginBottom: 32 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Mastery Breakdown</h3>
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
              {masteryData.map(({ level, count, color }) =>
                count > 0 ? (
                  <div key={level} style={{ flex: count, background: color, transition: 'flex 0.5s' }} title={`${level}: ${count}`} />
                ) : null
              )}
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {masteryData.map(({ level, count, color, label }) => (
                <button key={level} onClick={() => setFilter(filter === level ? 'all' : level)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: filter === level ? `${color}22` : 'transparent',
                    border: `1px solid ${filter === level ? color : 'transparent'}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', transition: 'all var(--transition)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 13, color, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div style={{ marginBottom: 20, position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="search" placeholder="Search cards..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
          </div>

          {/* Cards list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((card, i) => {
              const level = getMasteryLevel(card);
              const color = getMasteryColor(level);
              return (
                <motion.div key={card.id} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: i * 0.02 } }}
                  className="card" style={{ borderLeft: `3px solid ${color}`, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, lineHeight: 1.5 }}>{card.front}</p>
                      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{card.back}</p>
                      <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
                        <span className={`tag tag-${level}`}>{level}</span>
                        <span className="tag tag-new">{card.topic || 'General'}</span>
                        {card.nextReview && (
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                            Next: {format(new Date(card.nextReview), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button className="btn-icon" onClick={() => handleEditCard(card)} title="Edit">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button className="btn-icon" onClick={() => handleDeleteCard(card.id)} title="Delete">
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
              <div className="empty-state" style={{ padding: 40 }}>
                <p>No cards match your search.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Edit modal */}
      {editingCard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="card" style={{ width: '100%', maxWidth: 520 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Edit Card</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>FRONT (Question)</label>
                <textarea value={editingCard.front} onChange={e => setEditingCard({ ...editingCard, front: e.target.value })} rows={3} style={{ resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>BACK (Answer)</label>
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
        .btn-icon {
          background: transparent; border: none; color: var(--text3); cursor: pointer; padding: 4px;
          border-radius: 6px; transition: all var(--transition); display: flex; align-items: center;
        }
        .btn-icon:hover { color: var(--text); background: var(--bg4); }
      `}</style>
    </div>
  );
}
