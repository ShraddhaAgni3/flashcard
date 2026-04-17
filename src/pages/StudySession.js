import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { sm2, getDueCards, getMasteryLevel, getMasteryColor } from '../utils/sm2';
import { incrementTodayReviews, updateStreak } from '../utils/storage';

const QUALITY_BUTTONS = [
  { quality: 1, label: 'Blackout', sublabel: "Didn't know at all", color: '#ef4444', bg: 'rgba(239,68,68,0.15)', key: '1' },
  { quality: 2, label: 'Hard', sublabel: 'Wrong / barely remembered', color: '#f97316', bg: 'rgba(249,115,22,0.15)', key: '2' },
  { quality: 3, label: 'Okay', sublabel: 'Correct with effort', color: '#eab308', bg: 'rgba(234,179,8,0.15)', key: '3' },
  { quality: 4, label: 'Good', sublabel: 'Correct, hesitated', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', key: '4' },
  { quality: 5, label: 'Perfect', sublabel: 'Instant recall', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', key: '5' },
];

export default function StudySession({ decks, updateDeck }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const deck = decks.find(d => d.id === id);

  const [queue, setQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0, streak: 0 });
  const [done, setDone] = useState(false);
  const [updatedCards, setUpdatedCards] = useState({});
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (deck) {
      const due = getDueCards(deck.cards || []);
      // Shuffle
      const shuffled = [...due].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      if (shuffled.length === 0) setDone(true);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (!flipped) setFlipped(true);
      }
      if (flipped && ['1','2','3','4','5'].includes(e.key)) {
        const q = parseInt(e.key);
        handleRate(q);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flipped, currentIdx, queue]);

  const handleFlip = () => setFlipped(true);

  const handleRate = useCallback((quality) => {
    if (!flipped) return;
    const card = queue[currentIdx];
    if (!card) return;

    const updated = sm2(card, quality);
    setUpdatedCards(prev => ({ ...prev, [card.id]: updated }));

    const isCorrect = quality >= 3;
    setSessionStats(prev => ({
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      streak: isCorrect ? prev.streak + 1 : 0,
    }));

    incrementTodayReviews();

    const nextIdx = currentIdx + 1;
    if (nextIdx >= queue.length) {
      // Save all updates and end session
      const finalCards = deck.cards.map(c => updatedCards[c.id] || (updated.id === c.id ? updated : c));
      updateDeck({ ...deck, cards: finalCards });
      updateStreak();
      setDone(true);
    } else {
      setCurrentIdx(nextIdx);
      setFlipped(false);
      setShowHint(false);
    }
  }, [flipped, currentIdx, queue, updatedCards, deck]);

  if (!deck) return <div className="page"><div className="container"><Link to="/">← Back</Link><p>Deck not found</p></div></div>;

  if (done) {
    const accuracy = sessionStats.reviewed > 0 ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0;
    return (
      <div className="page">
        <nav className="nav">
          <Link to="/" className="logo"><div className="logo-dot" />Recall</Link>
        </nav>
        <div className="container" style={{ paddingTop: 80, textAlign: 'center', maxWidth: 520 }}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.4 }}>
            <div style={{ fontSize: 80, marginBottom: 24 }}>
              {accuracy >= 80 ? '🎯' : accuracy >= 60 ? '👍' : '💪'}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800, marginBottom: 8 }}>
              Session Complete!
            </h1>
            <p style={{ color: 'var(--text2)', marginBottom: 48, fontSize: 16 }}>You reviewed all due cards.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 48 }}>
              {[
                { label: 'Reviewed', value: sessionStats.reviewed, color: 'var(--accent)' },
                { label: 'Accuracy', value: `${accuracy}%`, color: accuracy >= 80 ? 'var(--green)' : accuracy >= 60 ? 'var(--yellow)' : 'var(--orange)' },
                { label: 'Best Streak', value: sessionStats.streak, color: 'var(--orange)' },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link to={`/deck/${deck.id}`} className="btn btn-ghost">View Deck</Link>
              <Link to="/" className="btn btn-primary">Back to Home</Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const card = queue[currentIdx];
  if (!card) return null;
  const progress = ((currentIdx) / queue.length) * 100;
  const level = getMasteryLevel(card);
  const levelColor = getMasteryColor(level);

  return (
    <div className="page" style={{ userSelect: 'none' }}>
      <nav className="nav">
        <Link to={`/deck/${deck.id}`} className="logo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          {deck.title}
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>
            {currentIdx + 1} / {queue.length}
          </span>
        </div>
      </nav>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--bg4)' }}>
        <motion.div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }}
          animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      <div className="container" style={{ paddingTop: 48, maxWidth: 640 }}>
        {/* Session mini-stats */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32, justifyContent: 'center' }}>
          <span className="badge">🎯 {sessionStats.reviewed} reviewed</span>
          <span className="badge" style={{ color: 'var(--green)' }}>✓ {sessionStats.correct} correct</span>
          {sessionStats.streak >= 3 && <span className="badge" style={{ color: 'var(--orange)' }}>🔥 {sessionStats.streak} streak</span>}
        </div>

        {/* Card */}
        <div style={{ perspective: '1000px', marginBottom: 32 }}>
          <AnimatePresence mode="wait">
            <motion.div key={`${card.id}-${flipped}`}
              initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={!flipped ? handleFlip : undefined}
              style={{
                background: 'var(--bg2)', border: `1px solid ${flipped ? levelColor + '44' : 'var(--border)'}`,
                borderRadius: 20, padding: '48px 40px', minHeight: 280,
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                textAlign: 'center', cursor: flipped ? 'default' : 'pointer',
                boxShadow: flipped ? `0 0 40px ${levelColor}22` : 'none',
                position: 'relative', overflow: 'hidden',
              }}>
              {/* Background glow */}
              {flipped && <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${levelColor}11 0%, transparent 70%)`, pointerEvents: 'none' }} />}

              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 24, fontWeight: 600 }}>
                {flipped ? '— Answer —' : '— Question —'}
              </div>

              <p style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.6, color: flipped ? 'var(--text)' : 'var(--text)', maxWidth: 480 }}>
                {flipped ? card.back : card.front}
              </p>

              {!flipped && (
                <div style={{ marginTop: 32, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`tag tag-${level}`}>{level}</span>
                  {card.topic && <span className="tag tag-new">{card.topic}</span>}
                </div>
              )}

              {!flipped && (
                <p style={{ position: 'absolute', bottom: 16, color: 'var(--text3)', fontSize: 12 }}>
                  Click or press Space to reveal
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Rating buttons */}
        <AnimatePresence>
          {flipped && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
                How well did you know this?
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {QUALITY_BUTTONS.map(({ quality, label, sublabel, color, bg, key }) => (
                  <motion.button key={quality} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => handleRate(quality)}
                    style={{
                      padding: '12px 8px', borderRadius: 12, border: `1px solid ${color}44`,
                      background: bg, cursor: 'pointer', transition: 'all var(--transition)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                    }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.3 }}>{sublabel}</span>
                    <span style={{ fontSize: 10, color: `${color}88`, fontFamily: 'monospace', marginTop: 2 }}>[{key}]</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!flipped && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={handleFlip}>
              Reveal Answer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
