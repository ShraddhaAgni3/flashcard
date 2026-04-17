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

const STEPS = ['upload', 'configure', 'generating', 'done'];

export default function CreateDeck({ addDeck }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('General');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [previewCards, setPreviewCards] = useState([]);

  const onDrop = useCallback(accepted => {
    if (accepted[0]) {
      setFile(accepted[0]);
      const name = accepted[0].name.replace('.pdf', '').replace(/_/g, ' ');
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
    try {
      setProgress('Extracting text from PDF...');
      const { text, pages } = await extractTextFromPDF(file);
      setProgress(`Read ${pages} pages. Generating flashcards with AI...`);
      const cards = await generateFlashcardsFromText(text, title, setProgress);
      setPreviewCards(cards);
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

  return (
    <div className="page">
      <nav className="nav">
        <Link to="/" className="logo">
          <div className="logo-dot" />
          Recall
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/" className="btn btn-ghost">Cancel</Link>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 48, maxWidth: 680 }}>
        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, marginBottom: 8 }}>
                New Deck
              </h1>
              <p style={{ color: 'var(--text2)', marginBottom: 40, fontSize: 16 }}>
                Drop a PDF — a chapter, notes, anything — and get a smart deck in seconds.
              </p>

              <div {...getRootProps()} style={{
                border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border2)'}`,
                borderRadius: 'var(--card-radius)',
                padding: '72px 48px',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragActive ? 'rgba(124,111,247,0.08)' : 'var(--bg2)',
                transition: 'all var(--transition)',
              }}>
                <input {...getInputProps()} />
                <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                  {isDragActive ? 'Drop it here!' : 'Drag & drop your PDF'}
                </h3>
                <p style={{ color: 'var(--text3)', marginBottom: 20 }}>or click to browse</p>
                <span className="btn btn-primary">Choose PDF</span>
              </div>
            </motion.div>
          )}

          {step === 'configure' && (
            <motion.div key="configure" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, marginBottom: 8 }}>
                Configure Deck
              </h1>
              <p style={{ color: 'var(--text2)', marginBottom: 40 }}>
                📄 <strong style={{ color: 'var(--text)' }}>{file?.name}</strong>
              </p>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 24, color: 'var(--red)', fontSize: 14 }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--text2)', marginBottom: 8, fontWeight: 500 }}>Deck Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chapter 3: Quadratic Equations" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--text2)', marginBottom: 8, fontWeight: 500 }}>Subject</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(SUBJECT_EMOJIS).map(([s, emoji]) => (
                      <button key={s} onClick={() => setSubject(s)}
                        style={{
                          padding: '8px 14px', borderRadius: 100, border: `1px solid ${subject === s ? 'var(--accent)' : 'var(--border)'}`,
                          background: subject === s ? 'rgba(124,111,247,0.2)' : 'var(--bg3)',
                          color: subject === s ? 'var(--accent2)' : 'var(--text2)', cursor: 'pointer',
                          fontSize: 13, fontFamily: 'var(--font-body)', transition: 'all var(--transition)',
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg>
                  Generate Flashcards
                </button>
              </div>
            </motion.div>
          )}

          {step === 'generating' && (
            <motion.div key="generating" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', paddingTop: 80 }}>
              <div style={{ fontSize: 64, marginBottom: 24, animation: 'spin 2s linear infinite' }}>✨</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
                Building your deck...
              </h2>
              <p style={{ color: 'var(--text2)', fontSize: 16 }}>{progress || 'Processing...'}</p>
              <div style={{ marginTop: 32, background: 'var(--bg3)', borderRadius: 100, height: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent2))', borderRadius: 100, animation: 'loading 1.5s ease-in-out infinite' }} />
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                <div style={{ fontSize: 48 }}>🎉</div>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800 }}>
                    {previewCards.length} cards generated!
                  </h1>
                  <p style={{ color: 'var(--text2)' }}>Here's a preview of your new deck.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32, maxHeight: 400, overflowY: 'auto' }}>
                {previewCards.map((card, i) => (
                  <div key={card.id} className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--text3)', fontSize: 12, fontWeight: 600, minWidth: 24, paddingTop: 2 }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>{card.front}</p>
                        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{card.back}</p>
                        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                          <span className={`tag tag-${card.difficulty === 'hard' ? 'learning' : card.difficulty === 'medium' ? 'familiar' : 'mastered'}`}>{card.difficulty}</span>
                          <span className="tag tag-new">{card.topic}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={handleSave}>
                Save Deck & Start Studying →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes loading {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
