import { v4 as uuidv4 } from 'uuid';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';


const sleep = (ms) => new Promise(r => setTimeout(r, ms));


async function callGroqWithRetry(messages, maxTokens = 2000, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(`${API_URL}/api/generate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    
  },
  body: JSON.stringify({ messages, max_tokens: maxTokens }),
});

    
    if (response.status === 429) {
      
      const retryAfter = response.headers.get('retry-after');
      const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : (attempt + 1) * 8000;
      console.warn(`Rate limit hit. Waiting ${waitMs / 1000}s before retry ${attempt + 1}...`);
      await sleep(waitMs);
      continue; 
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Groq ${response.status}: ${err?.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || '';
  }
  throw new Error('Max retries reached. Please try again in a moment.');
}

function parseCards(rawText) {
  const clean = rawText.replace(/```json|```/g, '').trim();
  const match = clean.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array in response');
  return JSON.parse(match[0]);
}


function chunkText(text, chunkSize = 2500, overlap = 300) {
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


const SYSTEM_PROMPT = `Expert educator. Create flashcards mixing these types:
1. DEFINITION — what is X
2. MECHANISM — how does X work
3. DISTINCTION — X vs Y difference
4. APPLICATION — when/why use X
5. CONSEQUENCE — what happens if X
6. EXAMPLE — real example of X
7. EDGE_CASE — exception/limitation of X

Rules: one idea per card, specific questions, concise answers (max 3 sentences).
Return ONLY raw JSON array, no markdown.`;

export async function generateFlashcardsFromText(text, deckTitle, onProgress) {
  const cleanText = text.replace(/\s+/g, ' ').trim();

  
  const chunks = cleanText.length > 3000
    ? chunkText(cleanText, 2500, 300).slice(0, 3) 
    : [cleanText.slice(0, 5000)];                  

  let allParsed = [];

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(`Generating cards — section ${i + 1} of ${chunks.length}...`);

    const cardsPerChunk = chunks.length === 1 ? '15-18' : '7-9';

    const raw = await callGroqWithRetry([
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Create ${cardsPerChunk} flashcards for "${deckTitle}". Mix ALL 7 types.
Return ONLY JSON array:
[{"front":"...","back":"...","topic":"...","difficulty":"easy|medium|hard","type":"definition|mechanism|distinction|application|consequence|example|edge_case"}]

Content:
${chunks[i]}`
      }
    ], 2000); // max_tokens 2000 → was 3000, saves tokens

    try {
      const parsed = parseCards(raw);
      allParsed.push(...parsed);
    } catch (e) {
      console.warn(`Chunk ${i + 1} parse failed:`, e.message);
    }

    // ── Delay between chunks ──
    
    if (i < chunks.length - 1) {
      onProgress?.(`Pausing briefly before next section...`);
      await sleep(2000);
    }
  }

  // Deduplicate
  onProgress?.('Finalizing cards...');
  const seen = new Set();
  const unique = allParsed.filter(c => {
    const key = c.front?.slice(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

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