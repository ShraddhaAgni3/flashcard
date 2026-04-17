import { v4 as uuidv4 } from 'uuid';

const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

async function callGroq(messages, maxTokens = 3000) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: maxTokens,
      stream: false,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Groq ${response.status}: ${err?.error?.message || 'Unknown error'}`);
  }
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

function parseCards(rawText) {
  const clean = rawText.replace(/```json|```/g, '').trim();
  const match = clean.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array in response');
  return JSON.parse(match[0]);
}

// Split text into chunks of ~3000 chars with overlap
function chunkText(text, chunkSize = 3500, overlap = 400) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

const SYSTEM_PROMPT = `You are an expert educator and cognitive scientist. Create high-quality flashcards using these principles:

CARD TYPES to mix (very important):
1. DEFINITION — "What is [term]?" → concise definition
2. MECHANISM — "How does X work?" → step-by-step or cause-effect
3. DISTINCTION — "What's the difference between X and Y?"
4. APPLICATION — "When/why would you use X?"
5. CONSEQUENCE — "What happens if X occurs?"
6. EXAMPLE — "Give an example of X in context"
7. EDGE CASE — "What is an exception/limitation of X?"

QUALITY RULES:
- Each card tests exactly ONE idea (atomic)
- Front: specific, unambiguous question
- Back: complete but concise (1-4 sentences max)
- Never ask trivial "What is X?" when a deeper question is possible
- Math/science: include formulas or worked examples in back

Return ONLY a raw JSON array. No markdown, no explanation.`;

export async function generateFlashcardsFromText(text, deckTitle, onProgress) {
  const cleanText = text.replace(/\s+/g, ' ').trim();

  // For short texts use single call, for long texts chunk it
  const chunks = cleanText.length > 4000
    ? chunkText(cleanText, 3500, 400)
    : [cleanText];

  const effectiveChunks = chunks.slice(0, 4); // max 4 chunks to avoid rate limits
  let allParsed = [];

  for (let i = 0; i < effectiveChunks.length; i++) {
    onProgress?.(`Generating cards from section ${i + 1} of ${effectiveChunks.length}...`);

    const cardsPerChunk = effectiveChunks.length === 1 ? '15-20' : '8-10';

    const raw = await callGroq([
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Create ${cardsPerChunk} diverse flashcards for "${deckTitle}" from this content.
Mix ALL card types. Return ONLY JSON array:
[{"front":"...","back":"...","topic":"...","difficulty":"easy|medium|hard","type":"definition|mechanism|distinction|application|consequence|example|edge_case"}]

Content:
${effectiveChunks[i]}`
      }
    ]);

    try {
      const parsed = parseCards(raw);
      allParsed.push(...parsed);
    } catch (e) {
      console.warn(`Chunk ${i+1} parse failed:`, e.message);
    }
  }

  // Deduplicate similar fronts
  onProgress?.('Finalizing cards...');
  const seen = new Set();
  const unique = allParsed.filter(c => {
    const key = c.front?.slice(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Map to full card objects with SM-2 fields
  return unique
    .filter(c => c.front && c.back)
    .map(c => ({
      id: uuidv4(),
      front:        c.front      || '',
      back:         c.back       || '',
      topic:        c.topic      || 'General',
      difficulty:   c.difficulty || 'medium',
      type:         c.type       || 'definition',
      easeFactor:   2.5,
      interval:     1,
      repetitions:  0,
      nextReview:   null,
      lastReviewed: null,
      quality:      null,
      createdAt:    new Date().toISOString(),
    }));
}
