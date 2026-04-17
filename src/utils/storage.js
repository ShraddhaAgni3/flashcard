const DECKS_KEY = 'flashcard_decks';
const SETTINGS_KEY = 'flashcard_settings';

export function loadDecks() {
  try {
    const raw = localStorage.getItem(DECKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveDecks(decks) {
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { dailyGoal: 20, theme: 'dark' };
  } catch { return { dailyGoal: 20, theme: 'dark' }; }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getTodayReviews() {
  const key = `reviews_${new Date().toDateString()}`;
  try { return parseInt(localStorage.getItem(key) || '0'); }
  catch { return 0; }
}

export function incrementTodayReviews() {
  const key = `reviews_${new Date().toDateString()}`;
  const cur = getTodayReviews();
  localStorage.setItem(key, String(cur + 1));
  return cur + 1;
}

export function getStreak() {
  try {
    const raw = localStorage.getItem('streak');
    if (!raw) return { count: 0, lastDate: null };
    const streak = JSON.parse(raw);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (streak.lastDate === today) return streak;
    if (streak.lastDate === yesterday) return streak; // still valid
    return { count: 0, lastDate: null }; // broken
  } catch { return { count: 0, lastDate: null }; }
}

export function updateStreak() {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const streak = getStreak();
  if (streak.lastDate === today) return streak;
  const newCount = streak.lastDate === yesterday ? streak.count + 1 : 1;
  const newStreak = { count: newCount, lastDate: today };
  localStorage.setItem('streak', JSON.stringify(newStreak));
  return newStreak;
}
