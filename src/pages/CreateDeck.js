import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { extractTextFromPDF } from '../utils/pdfExtractor';
import { generateFlashcardsFromText } from '../utils/aiGenerator';

const SUBJECT_EMOJIS = {
  'Mathematics': '📐', 'Physics': '⚛️', 'Chemistry': '🧪', 'Biology': '🧬',
  'History': '🏛️', 'Geography': '🌍', 'Literature': '📖', 'Computer Science': '💻',
  'Economics': '📊', 'Psychology': '🧠', 'Philosophy': '🔮', 'General': '📚',
};

const TYPE_COLORS = {
  definition:  { color: '#0369a1', label: 'Definition' },
  mechanism:   { color: '#7e22ce', label: 'How it works' },
  distinction: { color: '#4338ca', label: 'Compare' },
  application: { color: '#15803d', label: 'Application' },
  consequence: { color: '#c2410c', label: 'Consequence' },
  example:     { color: '#b45309', label: 'Example' },
  edge_case:   { color: '#be123c', label: 'Edge Case' },
};

const PROGRESS_STEPS = ['Reading PDF', 'AI Generation', 'Finishing up', 'Done'];

export default function CreateDeck({ addDeck }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('General');
  const [progress, setProgress] = useState('');
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState('');
  const [previewCards, setPreviewCards] = useState([]);

  const onDrop = useCallback(accepted => {
    if (accepted[0]) {
      setFile(accepted[0]);
      const name = accepted[0].name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
      setTitle(name.charAt(0).toUpperCase() + name.slice(1));
      setStep('configure');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1
  });

  const handleGenerate = async () => {
    setStep('generating'); setError(''); setProgressStep(0);
    try {
      setProgress('Extracting text from PDF...'); setProgressStep(1);
      const { text, pages } = await extractTextFromPDF(file);
      setProgress(`Read ${pages} pages. Generating with AI...`); setProgressStep(2);
      const cards = await generateFlashcardsFromText(text, title, (msg) => {
        setProgress(msg);
        setProgressStep(prev => Math.min(prev + 0.5, 3.5));
      });
      setPreviewCards(cards); setProgressStep(4); setStep('done');
    } catch (e) {
      setError(e.message || 'Something went wrong');
      setStep('configure');
    }
  };

  const handleSave = () => {
    const deck = {
      id: uuidv4(), title, subject,
      emoji: SUBJECT_EMOJIS[subject] || '📚',
      cards: previewCards,
      createdAt: new Date().toISOString(),
    };
    addDeck(deck);
    navigate(`/deck/${deck.id}`);
  };

  const typeBreakdown = previewCards.reduce((acc, c) => {
    acc[c.type || 'definition'] = (acc[c.type || 'definition'] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page">
      <nav className="nav">
        <Link to="/" className="logo"><div className="logo-dot" />Recall</Link>
        <Link to="/" className="btn btn-ghost">Cancel</Link>
      </nav>

      <div className="container" style={{ paddingTop: 48, maxWidth: 660 }}>
        <AnimatePresence mode="wait">

          {/* UPLOAD */}
          {step === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
                New Deck
              </h1>
              <p style={{ color: 'var(--text2)', marginBottom: 36, fontSize: 15, lineHeight: 1.6 }}>
                Upload any PDF and get a smart set of flashcards in seconds.
              </p>

              <div {...getRootProps()} style={{
                border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 16, padding: '56px 40px', textAlign: 'center', cursor: 'pointer',
                background: isDragActive ? 'rgba(255,112,67,0.04)' : 'var(--bg3)',
                transition: 'all 0.2s',
                boxShadow: isDragActive ? '0 0 0 4px rgba(255,112,67,0.1)' : 'none',
              }}>
                <input {...getInputProps()} />
                <motion.div animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
                  style={{ fontSize: 48, marginBottom: 16 }}>📄</motion.div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  {isDragActive ? 'Drop it here!' : 'Drag & drop your PDF'}
                </h3>
                <p style={{ color: 'var(--text3)', marginBottom: 20, fontSize: 14 }}>or click to browse</p>
                <span className="btn btn-primary">Choose PDF</span>
              </div>

              <div style={{ display: 'flex', gap: 20, marginTop: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['15–20 smart cards', 'Full PDF coverage', 'SM-2 spaced repetition'].map(f => (
                  <div key={f} style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span> {f}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* CONFIGURE */}
          {step === 'configure' && (
            <motion.div key="configure" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--text)', marginBottom: 20 }}>
                Configure Deck
              </h1>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', marginBottom: 28 }}>
                <span>📄</span>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>{file?.name}</span>
              </div>

              {error && (
                <div style={{ background: 'rgba(190,18,60,0.06)', border: '1px solid rgba(190,18,60,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#be123c', fontSize: 14 }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginBottom: 28 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 7 }}>
                    Deck Title
                  </label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Chapter 3: Quadratic Equations" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
                    Subject
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(SUBJECT_EMOJIS).map(([s, emoji]) => (
                      <button key={s} onClick={() => setSubject(s)} style={{
                        padding: '7px 14px', borderRadius: 100,
                        border: `1.5px solid ${subject === s ? 'var(--accent)' : 'var(--border)'}`,
                        background: subject === s ? 'rgba(255,112,67,0.08)' : 'var(--bg2)',
                        color: subject === s ? 'var(--accent)' : 'var(--text2)',
                        cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)',
                        fontWeight: subject === s ? 600 : 400,
                        transition: 'all 0.15s',
                      }}>
                        {emoji} {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => setStep('upload')}>← Back</button>
                <button className="btn btn-primary" onClick={handleGenerate} disabled={!title}>
                  ✨ Generate Flashcards
                </button>
              </div>
            </motion.div>
          )}

          {/* GENERATING */}
          {step === 'generating' && (
            <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ textAlign: 'center', paddingTop: 60 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{ fontSize: 48, marginBottom: 20, display: 'inline-block' }}>✨</motion.div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>
                Building your deck...
              </h2>
              <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 36 }}>{progress}</p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 28 }}>
                {PROGRESS_STEPS.map((s, i) => (
                  <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: progressStep > i + 1 ? 'var(--accent)' : progressStep > i ? 'rgba(255,112,67,0.25)' : '#F3F4F6',
                      border: `1.5px solid ${progressStep > i ? 'var(--accent)' : 'var(--border)'}`,
                      fontSize: 12, fontWeight: 700,
                      color: progressStep > i + 1 ? 'white' : progressStep > i ? 'var(--accent)' : 'var(--text3)',
                      transition: 'all 0.4s',
                    }}>
                      {progressStep > i + 1 ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>{s}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: '#F3F4F6', borderRadius: 100, height: 4, overflow: 'hidden', maxWidth: 280, margin: '0 auto' }}>
                <motion.div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent2))', borderRadius: 100 }}
                  animate={{ width: `${(progressStep / 4) * 100}%` }} transition={{ duration: 0.5 }} />
              </div>
            </motion.div>
          )}

          {/* DONE / PREVIEW */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 44 }}>🎉</div>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>
                    {previewCards.length} cards generated!
                  </h1>
                  <p style={{ color: 'var(--text2)', fontSize: 13 }}>
                    Covering {Object.keys(typeBreakdown).length} different question types
                  </p>
                </div>
              </div>

              {/* Type breakdown */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                {Object.entries(typeBreakdown).map(([type, count]) => {
                  const cfg = TYPE_COLORS[type] || { color: '#546E7A', label: type };
                  return (
                    <div key={type} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: 'var(--bg3)', border: `1px solid ${cfg.color}33`,
                      borderRadius: 100, padding: '4px 12px',
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
                      <span style={{ fontSize: 12, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>×{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Cards preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, maxHeight: 360, overflowY: 'auto' }}>
                {previewCards.map((card, i) => {
                  const typeCfg = TYPE_COLORS[card.type] || { color: '#546E7A', label: card.type };
                  return (
                    <div key={card.id} className="card" style={{ padding: '14px 18px', borderLeft: `3px solid ${typeCfg.color}` }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--text3)', fontSize: 12, fontWeight: 600, minWidth: 20, paddingTop: 1 }}>{i+1}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 5, color: 'var(--text)' }}>{card.front}</p>
                          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55 }}>{card.back}</p>
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <span style={{
                              fontSize: 10, color: typeCfg.color,
                              background: `${typeCfg.color}15`,
                              padding: '2px 8px', borderRadius: 100, fontWeight: 600,
                            }}>{typeCfg.label}</span>
                            <span className={`tag tag-${card.difficulty === 'hard' ? 'learning' : card.difficulty === 'medium' ? 'familiar' : 'mastered'}`}>
                              {card.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '15px', fontSize: 15 }}
                onClick={handleSave}>
                Save Deck & Start Studying →
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
