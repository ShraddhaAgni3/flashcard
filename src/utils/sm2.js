
export function sm2(card, quality) {
  let { easeFactor = 2.5, interval = 1, repetitions = 0 } = card;

  if (quality < 3) {
    // Failed — reset
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);

    repetitions += 1;
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    ...card,
    easeFactor,
    interval,
    repetitions,
    nextReview: nextReview.toISOString(),
    lastReviewed: new Date().toISOString(),
    quality,
  };
}

export function isDue(card) {
  if (!card.nextReview) return true;
  return new Date(card.nextReview) <= new Date();
}

export function getDueCards(cards) {
  return cards.filter(isDue);
}

export function getMasteryLevel(card) {
  const { repetitions = 0, easeFactor = 2.5, quality = null, lastReviewed = null } = card;

  if (!lastReviewed) return 'new';

  if (quality !== null && quality < 3) return 'learning';

  if (repetitions < 3) return 'familiar';

  if (easeFactor >= 2.3 && repetitions >= 5) return 'mastered';

  return 'reviewing';
}

export function getMasteryColor(level) {
  const colors = {
    new: '#94a3b8',
    learning: '#f97316',
    familiar: '#eab308',
    reviewing: '#3b82f6',
    mastered: '#22c55e',
  };
  return colors[level] || '#94a3b8';
}

export function getDeckStats(cards) {
  const total = cards.length;
  const due = getDueCards(cards).length;
  const masteryLevels = cards.reduce((acc, card) => {
    const level = getMasteryLevel(card);
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  const masteryScore = total === 0 ? 0 : Math.round(
    ((masteryLevels.mastered || 0) * 100 +
     (masteryLevels.reviewing || 0) * 60 +
     (masteryLevels.familiar || 0) * 40 +
     (masteryLevels.learning || 0) * 10) / total
  );

  return { total, due, masteryLevels, masteryScore };
}
