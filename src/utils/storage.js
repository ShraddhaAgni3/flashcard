const DECKS_KEY = 'flashcard_decks';
const SETTINGS_KEY = 'flashcard_settings';
const HEATMAP_KEY = 'flashcard_heatmap';

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
    return raw ? JSON.parse(raw) : { dailyGoal: 20 };
  } catch { return { dailyGoal: 20 }; }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Key: "YYYY-MM-DD" → count
export function getHeatmapData() {
  try {
    const raw = localStorage.getItem(HEATMAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function getTodayReviews() {
  const data = getHeatmapData();
  return data[todayKey()] || 0;
}

export function incrementTodayReviews() {
  const data = getHeatmapData();
  const key = todayKey();
  data[key] = (data[key] || 0) + 1;
  localStorage.setItem(HEATMAP_KEY, JSON.stringify(data));
  return data[key];
}


export function getLast90Days() {
  const data = getHeatmapData();
  const days = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    days.push({ key, count: data[key] || 0, date: d });
  }
  return days;
}

export function getStreak() {
  try {
    const raw = localStorage.getItem('streak');
    if (!raw) return { count: 0, lastDate: null };
    const streak = JSON.parse(raw);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (streak.lastDate === today) return streak;
    if (streak.lastDate === yesterday) return streak;
    return { count: 0, lastDate: null };
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
