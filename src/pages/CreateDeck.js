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
  definition: { color: '#94a3b8', label: 'Definition' },
  mechanism: { color: '#3b82f6', label: 'How it works' },
  distinction: { color: '#a78bfa', label: 'Compare' },
  application: { color: '#22c55e', label: 'Application' },
  consequence: { color: '#f97316', label: 'Consequence' },
  example: { color: '#eab308', label: 'Example' },
  edge_case: { color: '#ef4444', label: 'Edge Case' },
};

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
    setStep('generating');
    setError('');
    setProgressStep(0);
    try {
      setProgress('Extracting text from PDF...');
      setProgressStep(1);
      const { text, pages } = await extractTextFromPDF(file);

      setProgress(`Read ${pages} pages. Generating with AI...`);
      setProgressStep(2);

      const cards = await generateFlashcardsFromText(text, title, (msg) => {
        setProgress(msg);
        setProgressStep(prev => Math.min(prev + 0.5, 3.5));
      });

      setPreviewCards(cards);
      setProgressStep(4);
      setStep('done');
    } catch (e) {
      setError(e.message || 'Something went wrong');
      setStep('configure');
    }
  };

  const handleSave = () => {
    const deck = {
      id: uuidv4(),
      title,
      subject,
      emoji: SUBJECT_EMOJIS[subject] || '📚',
      cards: previewCards,
      createdAt: new Date().toISOString(),
    };
    addDeck(deck);
    navigate(`/deck/${deck.id}`);
  };

  // Type breakdown for preview
  const typeBreakdown = previewCards.reduce((acc, c) => {
    acc[c.type || 'definition'] = (acc[c.type || 'definition'] || 0) + 1;
    return acc;
  }, {});

  const PROGRESS_STEPS = ['Upload', 'Reading PDF', 'AI Generation', 'Finishing up', 'Done'];

  return (
    <div className="page">
      <nav className="nav">
        <Link to="/" className="logo"><div className="logo-dot" />Recall</Link>
        <Link to="/" className="btn btn-ghost">Cancel</Link>
      </nav>

      <div className="container" style={{ paddingTop: 48, maxWidth: 680 }}>
        <AnimatePresence mode="wait">

          {/* UPLOAD */}
          {step === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, marginBottom: 8 }}>New Deck</h1>
              <p style={{ color: 'var(--text2)', marginBottom: 40, fontSize: 16, lineHeight: 1.6 }}>
                Drop any PDF — a chapter, lecture notes, a paper — and get a smart deck of flashcards built by AI.
              </p>
              <div {...getRootProps()} style={{
                border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border2)'}`,
                borderRadius: 20, padding: '72px 48px', textAlign: 'center', cursor: 'pointer',
                background: isDragActive ? 'rgba(124,111,247,0.08)' : 'var(--bg2)',
                transition: 'all 0.2s', boxShadow: isDragActive ? '0 0 40px rgba(124,111,247,0.2)' : 'none',
              }}>
                <input {...getInputProps()} />
                <motion.div animate={isDragActive ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }} style={{ fontSize: 52, marginBottom: 16 }}>📄</motion.div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                  {isDragActive ? 'Drop it!' : 'Drag & drop your PDF'}
                </h3>
                <p style={{ color: 'var(--text3)', marginBottom: 24 }}>or click to browse files</p>
                <span className="btn btn-primary">Choose PDF</span>
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 32, justifyContent: 'center' }}>
                {['15–25 smart cards', 'Full PDF coverage', 'SM-2 spaced repetition'].map(f => (
                  <div key={f} style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--accent)' }}>✓</span> {f}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* CONFIGURE */}
          {step === 'configure' && (
            <motion.div key="configure" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Configure Deck</h1>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', marginBottom: 32 }}>
                <span style={{ fontSize: 16 }}>📄</span>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>{file?.name}</span>
              </div>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, color: 'var(--red)', fontSize: 14 }}>
                  ⚠️ {error}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--text2)', marginBottom: 8, fontWeight: 500 }}>Deck Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chapter 3: Quadratic Equations" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--text2)', marginBottom: 10, fontWeight: 500 }}>Subject</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(SUBJECT_EMOJIS).map(([s, emoji]) => (
                      <button key={s} onClick={() => setSubject(s)} style={{
                        padding: '8px 14px', borderRadius: 100,
                        border: `1px solid ${subject === s ? 'var(--accent)' : 'var(--border)'}`,
                        background: subject === s ? 'rgba(124,111,247,0.2)' : 'var(--bg3)',
                        color: subject === s ? 'var(--accent2)' : 'var(--text2)',
                        cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                      }}>
                        {emoji} {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-ghost" onClick={() => setStep('upload')}>← Back</button>
                <button className="btn btn-primary" onClick={handleGenerate} disabled={!title}>
                  ✨ Generate Flashcards
                </button>
              </div>
            </motion.div>
          )}

          {/* GENERATING */}
          {step === 'generating' && (
            <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', paddingTop: 80 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{ fontSize: 56, marginBottom: 24, display: 'inline-block' }}>✨</motion.div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Building your deck...</h2>
              <p style={{ color: 'var(--text2)', fontSize: 15, marginBottom: 40 }}>{progress}</p>
              {/* Step indicators */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
                {PROGRESS_STEPS.slice(1).map((s, i) => (
                  <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: progressStep > i + 1 ? 'var(--accent)' : progressStep > i ? 'rgba(124,111,247,0.4)' : 'var(--bg4)',
                      fontSize: 13, fontWeight: 700, color: progressStep > i ? 'white' : 'var(--text3)',
                      transition: 'all 0.4s',
                    }}>
                      {progressStep > i + 1 ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{s}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--bg3)', borderRadius: 100, height: 4, overflow: 'hidden', maxWidth: 300, margin: '0 auto' }}>
                <motion.div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent2))', borderRadius: 100 }}
                  animate={{ width: `${(progressStep / 4) * 100}%` }} transition={{ duration: 0.5 }} />
              </div>
            </motion.div>
          )}

          {/* DONE / PREVIEW */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 48 }}>🎉</div>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800 }}>{previewCards.length} cards generated!</h1>
                  <p style={{ color: 'var(--text2)', fontSize: 14 }}>Covering {Object.keys(typeBreakdown).length} different question types</p>
                </div>
              </div>

              {/* Type breakdown */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {Object.entries(typeBreakdown).map(([type, count]) => {
                  const cfg = TYPE_COLORS[type] || { color: '#94a3b8', label: type };
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: `1px solid ${cfg.color}44`, borderRadius: 100, padding: '4px 12px' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
                      <span style={{ fontSize: 12, color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>×{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Preview list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, maxHeight: 380, overflowY: 'auto' }}>
                {previewCards.map((card, i) => {
                  const typeCfg = TYPE_COLORS[card.type] || { color: '#94a3b8', label: card.type };
                  return (
                    <div key={card.id} className="card" style={{ padding: '14px 18px', borderLeft: `3px solid ${typeCfg.color}` }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--text3)', fontSize: 12, fontWeight: 600, minWidth: 22, paddingTop: 1 }}>{i+1}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 5 }}>{card.front}</p>
                          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{card.back}</p>
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <span style={{ fontSize: 10, color: typeCfg.color, background: `${typeCfg.color}18`, padding: '2px 8px', borderRadius: 100, fontWeight: 600 }}>{typeCfg.label}</span>
                            <span className={`tag tag-${card.difficulty === 'hard' ? 'learning' : card.difficulty === 'medium' ? 'familiar' : 'mastered'}`}>{card.difficulty}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: 16 }}
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
