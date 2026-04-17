import { v4 as uuidv4 } from 'uuid';

const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

export async function generateFlashcardsFromText(text, deckTitle, onProgress) {
  const truncatedText = text.slice(0, 4000);

 const systemPrompt = `
You are an expert educator creating high-quality flashcards.

STRICT RULES:
- Avoid generic questions like "What is X?"
- Focus on:
  - Why things happen
  - How systems work
  - Differences & comparisons
  - Edge cases
- Include some application-based questions
- Make questions thought-provoking

- Each card must test understanding, not memorization

Return ONLY JSON array:
[{"front":"...","back":"...","topic":"...","difficulty":"easy|medium|hard"}]
`;
const userPrompt = `
Create 15–20 high-quality flashcards for the topic "${deckTitle}".

Content:
${truncatedText}

Requirements:
- Include WHY, HOW, and application-based questions
- Avoid simple definitions
- Include comparisons and reasoning

Return ONLY JSON array:
[{"front":"...","back":"...","topic":"...","difficulty":"easy|medium|hard"}]
`;
  onProgress?.('Connecting to Groq...');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
     model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 3000,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('Groq API error:', err);
    throw new Error(`Groq error ${response.status}: ${err?.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  onProgress?.('Parsing cards...');

  const rawText = data?.choices?.[0]?.message?.content || '[]';

  let cards = [];
  try {
    const clean = rawText.replace(/```json|```/g, '').trim();
    const match = clean.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array found in response');

    const parsed = JSON.parse(match[0]);

    cards = parsed.map(c => ({
      id: uuidv4(),
      front:        c.front      || c.question || '',
      back:         c.back       || c.answer   || '',
      topic:        c.topic      || 'General',
      difficulty:   c.difficulty || 'medium',
      easeFactor:   2.5,
      interval:     1,
      repetitions:  0,
      nextReview:   null,
      lastReviewed: null,
      quality:      null,
      createdAt:    new Date().toISOString(),
    })).filter(c => c.front && c.back);

  } catch (e) {
    console.error('Parse error:', e, '\nRaw response:', rawText);
    throw new Error('Failed to parse AI response. Try again.');
  }

  return cards;
}