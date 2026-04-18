import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { sm2, getDueCards, getMasteryLevel, getMasteryColor } from '../utils/sm2';
import { incrementTodayReviews, updateStreak } from '../utils/storage';

const QUALITY_BUTTONS = [
  { quality: 1, label: 'Blackout', emoji: '😵', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', key: '1' },
  { quality: 2, label: 'Hard',     emoji: '😓', color: '#f97316', bg: 'rgba(249,115,22,0.12)', key: '2' },
  { quality: 3, label: 'Okay',     emoji: '🤔', color: '#eab308', bg: 'rgba(234,179,8,0.12)',  key: '3' },
  { quality: 4, label: 'Good',     emoji: '😊', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', key: '4' },
  { quality: 5, label: 'Perfect',  emoji: '🎯', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  key: '5' },
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
    const colors = ['#7c6ff7', '#a78bfa', '#22c55e', '#f97316', '#eab308', '#3b82f6', '#ec4899'];
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
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
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
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -60, scale: 1.3 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      onAnimationComplete={onDone}
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
    setLastQuality(quality);
    setFeedback(Date.now());
    setSessionStats(prev => {
      const newStreak = isCorrect ? prev.currentStreak + 1 : 0;
      return { reviewed: prev.reviewed + 1, correct: prev.correct + (isCorrect ? 1 : 0), bestStreak: Math.max(prev.bestStreak, newStreak), currentStreak: newStreak };
    });
    incrementTodayReviews();
    const nextIdx = currentIdx + 1;
    if (nextIdx >= queue.length) {
      const finalCards = deck.cards.map(c => updatedCardsRef.current[c.id] || c);
      updateDeck({ ...deck, cards: finalCards });
      updateStreak();
      setShowConfetti(true);
      setTimeout(() => setDone(true), 600);
    } else {
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '60px 24px 80px' }}>
          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.5, delay: 0.3 }}
            style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
            <motion.div animate={{ rotate: [0, -10, 10, -10, 10, 0] }} transition={{ delay: 0.8, duration: 0.6 }} style={{ fontSize: 72, marginBottom: 16, lineHeight: 1 }}>{emoji}</motion.div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 800, marginBottom: 6 }}>{message}</h1>
            <p style={{ color: 'var(--text2)', marginBottom: 40, fontSize: 15 }}>Session complete · {sessionStats.reviewed} cards reviewed</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20, width: '100%' }}>
              {[
                { label: 'Accuracy', value: `${accuracy}%`, color: accuracy >= 75 ? 'var(--green)' : accuracy >= 50 ? 'var(--yellow)' : 'var(--orange)' },
                { label: 'Correct', value: sessionStats.correct, color: 'var(--green)' },
                { label: 'Best Streak', value: `${sessionStats.bestStreak}🔥`, color: 'var(--orange)' },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 12px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: s.color, marginBottom: 6 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                </motion.div>
              ))}
            </div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 32, textAlign: 'left', width: '100%', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>Session XP</span>
                <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>+{sessionStats.correct * 10} XP</span>
              </div>
              <div style={{ height: 8, background: 'var(--bg4)', borderRadius: 4, overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, accuracy)}%` }} transition={{ duration: 1.5, delay: 1, ease: 'easeOut' }}
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
  const levelColor = getMasteryColor(level);
  const isWeak = level === 'learning';

  return (
    <div className="page" style={{ userSelect: 'none' }}>
      {feedback && lastQuality && <FloatingFeedback key={feedback} quality={lastQuality} onDone={() => setFeedback(null)} />}

      <nav className="nav">
        <Link to={`/deck/${deck.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text2)', textDecoration: 'none', fontSize: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          {deck.title}
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {sessionStats.currentStreak >= 3 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ fontSize: 13, color: 'var(--orange)' }}>🔥 {sessionStats.currentStreak}</motion.span>
          )}
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>{currentIdx + 1} / {queue.length}</span>
        </div>
      </nav>

      <div style={{ height: 3, background: 'var(--bg4)' }}>
        <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }} />
      </div>

      <div className="container" style={{ paddingTop: 40, maxWidth: 640 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span className="badge">✓ {sessionStats.correct} correct</span>
          <span className="badge" style={{ color: 'var(--text3)' }}>✗ {sessionStats.reviewed - sessionStats.correct} missed</span>
          <span className={`tag tag-${level}`}>{level}</span>
        </div>

        {/* THE CARD */}
        <AnimatePresence mode="wait">
          <motion.div key={`${card.id}-${flipped ? 'back' : 'front'}`}
            initial={{ rotateY: flipped ? -80 : 80, opacity: 0, scale: 0.95 }}
            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
            exit={{ rotateY: flipped ? 80 : -80, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            onClick={!flipped ? () => setFlipped(true) : undefined}
            style={{
              background: isWeak
                ? 'linear-gradient(135deg, #18100f 0%, var(--bg2) 60%)'
                : 'var(--bg2)',
              border: `1px solid ${
                isWeak
                  ? flipped ? 'rgba(239,68,68,0.45)' : 'rgba(239,68,68,0.2)'
                  : flipped ? levelColor + '55' : 'var(--border)'
              }`,
              borderRadius: 24, padding: '52px 44px', minHeight: 300,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              textAlign: 'center', cursor: flipped ? 'default' : 'pointer',
              boxShadow: isWeak
                ? '0 0 40px rgba(239,68,68,0.07), var(--shadow)'
                : flipped ? `0 0 60px ${levelColor}18, var(--shadow)` : 'var(--shadow)',
              position: 'relative', overflow: 'hidden', marginBottom: 28,
            }}>

            {/* Weak: thin red line at top */}
            {isWeak && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.6), transparent)',
                pointerEvents: 'none',
              }} />
            )}

            {/* Ambient glow */}
            <div style={{
              position: 'absolute', inset: 0,
              opacity: isWeak ? 0.9 : flipped ? 1 : 0,
              transition: 'opacity 0.3s',
              background: isWeak
                ? 'radial-gradient(ellipse at 50% 100%, rgba(239,68,68,0.08) 0%, transparent 65%)'
                : `radial-gradient(ellipse at 50% -20%, ${levelColor}15 0%, transparent 65%)`,
              pointerEvents: 'none',
            }} />

            {/* Card label */}
            <div style={{ position: 'absolute', top: 20, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: isWeak ? 'rgba(239,68,68,0.5)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>
              {flipped ? 'Answer' : 'Question'}
            </div>

            {/* Topic pill */}
            {card.topic && (
              <div style={{ position: 'absolute', top: 16, right: 20 }}>
                <span className="tag tag-new" style={{ fontSize: 10 }}>{card.topic}</span>
              </div>
            )}

            {/* Weak badge */}
            {isWeak && (
              <div style={{ position: 'absolute', top: 16, left: 20, fontSize: 10, color: 'rgba(239,68,68,0.55)', fontWeight: 600, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(239,68,68,0.55)' }} />
                WEAK
              </div>
            )}

            <p style={{ fontSize: flipped ? 18 : 22, fontWeight: flipped ? 400 : 600, lineHeight: 1.65, color: 'var(--text)', maxWidth: 480, position: 'relative', zIndex: 1 }}>
              {flipped ? card.back : card.front}
            </p>

            {!flipped && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.5 } }}
                style={{ position: 'absolute', bottom: 18, color: 'var(--text3)', fontSize: 12 }}>
                Space or click to reveal
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Rating buttons */}
        <AnimatePresence>
          {flipped && (
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginBottom: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                How well did you know this?
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {QUALITY_BUTTONS.map(({ quality, label, emoji, color, bg, key }) => (
                  <motion.button key={quality} whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.93 }}
                    onClick={() => handleRate(quality)}
                    style={{ padding: '14px 6px', borderRadius: 14, border: `1px solid ${color}33`, background: bg, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 20px ${color}33`}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                    <span style={{ fontSize: 20 }}>{emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                    <span style={{ fontSize: 10, color: `${color}77`, fontFamily: 'monospace' }}>[{key}]</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!flipped && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => setFlipped(true)}>Reveal Answer</button>
          </div>
        )}
      </div>
    </div>
  );
}