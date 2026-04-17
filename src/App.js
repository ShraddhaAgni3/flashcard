import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import DeckView from './pages/DeckView';
import StudySession from './pages/StudySession';
import CreateDeck from './pages/CreateDeck';
import { loadDecks, saveDecks } from './utils/storage';
import './styles/global.css';

function AppContent() {
  const [decks, setDecks] = useState(() => loadDecks());
  const location = useLocation();

  useEffect(() => {
    saveDecks(decks);
  }, [decks]);

  const addDeck = (deck) => setDecks(prev => [deck, ...prev]);
  const updateDeck = (updatedDeck) =>
    setDecks(prev => prev.map(d => d.id === updatedDeck.id ? updatedDeck : d));
  const deleteDeck = (deckId) =>
    setDecks(prev => prev.filter(d => d.id !== deckId));

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home decks={decks} deleteDeck={deleteDeck} />} />
          <Route path="/create" element={<CreateDeck addDeck={addDeck} />} />
          <Route path="/deck/:id" element={<DeckView decks={decks} updateDeck={updateDeck} deleteDeck={deleteDeck} />} />
          <Route path="/study/:id" element={<StudySession decks={decks} updateDeck={updateDeck} />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
