import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { sm2, getDueCards, getMasteryLevel, getMasteryColor } from '../utils/sm2';
import { incrementTodayReviews, updateStreak } from '../utils/storage';

const QUALITY_BUTTONS = [
  { quality: 1, label: 'Blackout', emoji: '😵', color: '#be123c', bg: 'rgba(190,18,60,0.08)', key: '1' },
  { quality: 2, label: 'Hard',     emoji: '😓', color: '#c2410c', bg: 'rgba(194,65,12,0.08)', key: '2' },
  { quality: 3, label: 'Okay',     emoji: '🤔', color: '#b45309', bg: 'rgba(180,83,9,0.08)',  key: '3' },
  { quality: 4, label: 'Good',     emoji: '😊', color: '#0369a1', bg: 'rgba(3,105,161,0.08)', key: '4' },
  { quality: 5, label: 'Perfect',  emoji: '🎯', color: '#15803d', bg: 'rgba(21,128,61,0.08)', key: '5' },
];

function Confetti({ active }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#FF7043','#F4511E','#15803d','#0369a1','#b45309','#7e22ce','#be123c'];
    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width, y: -10,
      r: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4, vy: Math.random() * 4 + 2,
      opacity: 1, rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      shape: Math.random() > 0.5 ? 'circle' : 'rect',
    }));
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.08;
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, p.opacity - 0.008);
        ctx.globalAlpha = p.opacity; ctx.fillStyle = p.color;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.rotation * Math.PI) / 180);
        if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); }
        ctx.restore();
      });
      ctx.globalAlpha = 1; frame++;
      if (frame < 200) animRef.current = requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);
  if (!active) return null;
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }} />;
}

function FloatingFeedback({ quality, onDone }) {
  const config = QUALITY_BUTTONS.find(b => b.quality === quality);
  return (
    <motion.div initial={{ opacity: 1, y: 0, scale: 1 }} animate={{ opacity: 0, y: -60, scale: 1.3 }}
      transition={{ duration: 0.7, ease: 'easeOut' }} onAnimationComplete={onDone}
      style={{ position: 'fixed', top: '40%', left: '50%', transform: 'translateX(-50%)', fontSize: 32, pointerEvents: 'none', zIndex: 998 }}>
      {config?.emoji}
    </motion.div>
  );
}

export default function StudySession({ decks, updateDeck }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const deck = decks.find(d => d.id === id);

  const [queue, setQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0, bestStreak: 0, currentStreak: 0 });
  const [done, setDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [lastQuality, setLastQuality] = useState(null);
  const updatedCardsRef = useRef({});

  useEffect(() => {
    if (deck) {
      const due = getDueCards(deck.cards || []);
      const shuffled = [...due].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      if (shuffled.length === 0) setDone(true);
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && !flipped) { e.preventDefault(); setFlipped(true); }
      if (flipped && ['1','2','3','4','5'].includes(e.key)) handleRate(parseInt(e.key));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flipped, currentIdx, queue]);

  const handleRate = useCallback((quality) => {
    if (!flipped) return;
    const card = queue[currentIdx];
    if (!card) return;
    const updated = sm2(card, quality);
    updatedCardsRef.current[card.id] = updated;
    const isCorrect = quality >= 3;
    setLastQuality(quality); setFeedback(Date.now());
    setSessionStats(prev => {
      const newStreak = isCorrect ? prev.currentStreak + 1 : 0;
      return { reviewed: prev.reviewed + 1, correct: prev.correct + (isCorrect ? 1 : 0), bestStreak: Math.max(prev.bestStreak, newStreak), currentStreak: newStreak };
    });
    incrementTodayReviews();
    const nextIdx = currentIdx + 1;
    if (nextIdx >= queue.length) {
      const allUpdates = { ...updatedCardsRef.current };
      const finalCards = deck.cards.map(c => allUpdates[c.id] ? { ...allUpdates[c.id] } : c);
      updateDeck({ ...deck, cards: finalCards });
      updateStreak(); setShowConfetti(true);
      setTimeout(() => setDone(true), 600);
    } else {
      if (!isCorrect) setQueue(prev => [...prev, { ...updated }]);
      setTimeout(() => { setCurrentIdx(nextIdx); setFlipped(false); }, 150);
    }
  }, [flipped, currentIdx, queue, deck]);

  if (!deck) return <div className="page"><div className="container" style={{paddingTop:48}}><Link to="/">← Back</Link></div></div>;

  // ── SESSION COMPLETE ──
  if (done) {
    const accuracy = sessionStats.reviewed > 0 ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0;
    const emoji = accuracy >= 90 ? '🏆' : accuracy >= 75 ? '🎯' : accuracy >= 50 ? '👍' : '💪';
    const message = accuracy >= 90 ? 'Outstanding!' : accuracy >= 75 ? 'Great job!' : accuracy >= 50 ? 'Keep it up!' : 'Practice makes perfect!';
    return (
      <div className="page">
        <Confetti active={showConfetti} />
        <nav className="nav"><Link to="/" className="logo"><div className="logo-dot" />Recall</Link></nav>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 24px 80px' }}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.4, delay: 0.2 }}
            style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>

            <motion.div animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ delay: 0.8, duration: 0.5 }}
              style={{ fontSize: 68, marginBottom: 14, lineHeight: 1 }}>{emoji}</motion.div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>{message}</h1>
            <p style={{ color: 'var(--text2)', marginBottom: 36, fontSize: 14 }}>
              Session complete · {sessionStats.reviewed} cards reviewed
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16, width: '100%' }}>
              {[
                { label: 'Accuracy',    value: `${accuracy}%`,                color: accuracy >= 75 ? '#15803d' : accuracy >= 50 ? '#b45309' : '#c2410c' },
                { label: 'Correct',     value: sessionStats.correct,           color: '#15803d' },
                { label: 'Best Streak', value: `${sessionStats.bestStreak}🔥`, color: '#c2410c' },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 10px', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{s.label}</div>
                </motion.div>
              ))}
            </div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 28, textAlign: 'left', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>Session XP</span>
                <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>+{sessionStats.correct * 10} XP</span>
              </div>
              <div style={{ height: 7, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, accuracy)}%` }}
                  transition={{ duration: 1.5, delay: 0.9, ease: 'easeOut' }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent2))', borderRadius: 4 }} />
              </div>
            </motion.div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Link to={`/deck/${deck.id}`} className="btn btn-ghost">View Deck</Link>
              <Link to="/" className="btn btn-primary">Back to Home</Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── STUDY SCREEN ──
  const card = queue[currentIdx];
  if (!card) return null;
  const progress = (currentIdx / queue.length) * 100;
  const level = getMasteryLevel(card);
  const isWeak = level === 'learning';

  return (
    <div className="page" style={{ userSelect: 'none', background: 'var(--bg)' }}>
      {feedback && lastQuality && <FloatingFeedback key={feedback} quality={lastQuality} onDone={() => setFeedback(null)} />}

      <nav className="nav">
        <Link to={`/deck/${deck.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text2)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          {deck.title}
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {sessionStats.currentStreak >= 3 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              style={{ fontSize: 13, color: '#c2410c', fontWeight: 600 }}>
              🔥 {sessionStats.currentStreak}
            </motion.span>
          )}
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>{currentIdx + 1} / {queue.length}</span>
        </div>
      </nav>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#ECEFF1' }}>
        <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }} />
      </div>

      <div className="container" style={{ paddingTop: 36, maxWidth: 620 }}>
        {/* Mini stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span className="badge" style={{ color: '#15803d', borderColor: 'rgba(21,128,61,0.2)', background: 'rgba(21,128,61,0.06)' }}>
            ✓ {sessionStats.correct} correct
          </span>
          <span className="badge" style={{ color: '#be123c', borderColor: 'rgba(190,18,60,0.2)', background: 'rgba(190,18,60,0.06)' }}>
            ✗ {sessionStats.reviewed - sessionStats.correct} missed
          </span>
          <span className={`tag tag-${level}`}>{level}</span>
        </div>

        {/* CARD */}
        <AnimatePresence mode="wait">
          <motion.div key={`${card.id}-${flipped ? 'back' : 'front'}`}
            initial={{ rotateY: flipped ? -80 : 80, opacity: 0, scale: 0.96 }}
            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
            exit={{ rotateY: flipped ? 80 : -80, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            onClick={!flipped ? () => setFlipped(true) : undefined}
            style={{
              background: isWeak ? 'linear-gradient(135deg, #fff5f5 0%, #ffffff 60%)' : 'var(--bg2)',
              border: `1.5px solid ${isWeak
                ? (flipped ? 'rgba(190,18,60,0.35)' : 'rgba(190,18,60,0.2)')
                : (flipped ? '#BDBDBD' : 'var(--border)')}`,
              borderRadius: 20, padding: '48px 40px', minHeight: 280,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              textAlign: 'center', cursor: flipped ? 'default' : 'pointer',
              boxShadow: isWeak
                ? '0 0 0 3px rgba(190,18,60,0.06), var(--shadow-lg)'
                : flipped ? 'var(--shadow-lg)' : 'var(--shadow-card)',
              position: 'relative', overflow: 'hidden', marginBottom: 24,
              transition: 'box-shadow 0.2s, border-color 0.2s',
            }}>

            {isWeak && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, rgba(190,18,60,0.5), transparent)' }} />
            )}

            <div style={{ position: 'absolute', top: 18, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: isWeak ? 'rgba(190,18,60,0.5)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>
              {flipped ? 'Answer' : 'Question'}
            </div>

            {card.topic && (
              <div style={{ position: 'absolute', top: 14, right: 18 }}>
                <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 100, fontWeight: 500 }}>
                  {card.topic}
                </span>
              </div>
            )}

            {isWeak && (
              <div style={{ position: 'absolute', top: 14, left: 18, fontSize: 10, color: 'rgba(190,18,60,0.6)', fontWeight: 700, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(190,18,60,0.6)' }} />
                WEAK
              </div>
            )}

            <p style={{ fontSize: flipped ? 17 : 21, fontWeight: flipped ? 400 : 600, lineHeight: 1.65, color: 'var(--text)', maxWidth: 460, position: 'relative', zIndex: 1 }}>
              {flipped ? card.back : card.front}
            </p>

            {!flipped && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.5 } }}
                style={{ position: 'absolute', bottom: 16, color: 'var(--text3)', fontSize: 12 }}>
                Click or press Space to reveal
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Rating buttons */}
        <AnimatePresence>
          {flipped && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.18 }}>
              <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>
                How well did you know this?
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {QUALITY_BUTTONS.map(({ quality, label, emoji, color, bg, key }) => (
                  <motion.button key={quality} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.94 }}
                    onClick={() => handleRate(quality)}
                    style={{ padding: '14px 6px', borderRadius: 12, border: `1.5px solid ${color}22`, background: bg, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 16px ${color}22`}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                    <span style={{ fontSize: 20 }}>{emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                    <span style={{ fontSize: 10, color: `${color}99`, fontFamily: 'monospace' }}>[{key}]</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!flipped && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => setFlipped(true)}>
              Reveal Answer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
