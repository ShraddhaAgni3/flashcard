# 🃏 Recall — Smart Flashcard Engine

> Turn any PDF into a practice-ready flashcard deck, powered by AI and spaced repetition.

---

## ✨ Features

### 🧠 AI-Powered Ingestion
- Drop any PDF (textbook chapter, class notes, research paper)
- Anthropic Claude reads, understands, and generates **15–25 high-quality cards**
- Cards cover: key concepts, definitions, relationships, worked examples, edge cases
- Each card tagged by topic and difficulty

### 📅 Spaced Repetition (SM-2)
- Full **SM-2 algorithm** implementation — the same one behind Anki
- Cards you know well fade into the future; hard cards come back soon
- Five-point quality rating: Blackout → Hard → Okay → Good → Perfect
- Keyboard shortcuts: `Space` to flip, `1–5` to rate

### 📊 Progress & Mastery
- **5 mastery levels**: New → Learning → Familiar → Reviewing → Mastered
- Visual mastery bar per deck and per card
- Session stats: reviewed count, accuracy %, best streak
- Daily review count + streak tracking

### 🗂 Deck Management
- Browse all decks with search
- Per-deck breakdown by mastery level (click to filter)
- Edit or delete individual cards inline
- Due-card count shown on every deck card

### 🎨 Design
- Dark, modern UI with noise texture and accent glow
- Smooth Framer Motion animations
- Card flip animation during study
- Fully responsive

---

## 🗂 Project Structure

```
flashcard-engine/
├── public/
│   └── index.html
├── src/
│   ├── pages/
│   │   ├── Home.js          # Dashboard — all decks, stats, streak
│   │   ├── CreateDeck.js    # PDF upload → AI generation → preview
│   │   ├── DeckView.js      # Browse & manage cards in a deck
│   │   └── StudySession.js  # Core study loop with SM-2
│   ├── utils/
│   │   ├── sm2.js           # SM-2 spaced repetition algorithm
│   │   ├── storage.js       # localStorage persistence helpers
│   │   ├── pdfExtractor.js  # PDF.js text extraction
│   │   └── aiGenerator.js   # Anthropic API flashcard generation
│   ├── styles/
│   │   └── global.css       # Design system, CSS variables
│   ├── App.js               # Router + state management
│   └── index.js             # Entry point
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Install & Run

```bash
cd flashcard-engine
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

### How it works
1. Click **New Deck**
2. Drop a PDF
3. Name the deck, pick a subject
4. Click **Generate Flashcards** — Claude reads the PDF and writes the cards
5. Preview → Save
6. Click **Study Now** on any deck with due cards
7. Flip cards, rate yourself — the algorithm handles the rest

---

## 🧮 The SM-2 Algorithm

SM-2 (SuperMemo 2) schedules reviews based on your performance:

- **Repetitions**: How many times you've gotten a card right in a row
- **Ease Factor**: A multiplier (starts at 2.5) that grows with success, shrinks with failure
- **Interval**: Days until next review (1 → 6 → 6×EF → ...)

Quality ratings map as:
| Rating | Meaning | Effect |
|--------|---------|--------|
| 1 | Blackout | Reset to day 1 |
| 2 | Hard/Wrong | Reset to day 1 |
| 3 | Barely passed | Continue, reduce EF |
| 4 | Good | Continue, slight EF boost |
| 5 | Perfect | Continue, EF boost |

---

## 🔑 API Key

The app uses the Anthropic API for card generation. The API call is made from the browser — in production, proxy this through a backend to keep your key secure.

The `fetch` call in `aiGenerator.js` hits `https://api.anthropic.com/v1/messages` with no API key header (the Claude.ai environment injects it automatically). If running standalone, add:
```js
headers: {
  'Content-Type': 'application/json',
  'x-api-key': 'YOUR_KEY',
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
}
```

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 18 |
| Routing | React Router v6 |
| Animations | Framer Motion |
| PDF Parsing | PDF.js (CDN) |
| AI | Anthropic Claude (claude-sonnet-4) |
| Storage | localStorage |
| Styling | CSS custom properties |
| Icons | Inline SVG |
