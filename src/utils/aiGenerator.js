import { v4 as uuidv4 } from 'uuid';



// ── Delay helper ──
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Retry with exponential backoff ──
// Agar 429 aaya → wait karke dobara try karo
async function callGroqWithRetry(messages, maxTokens = 2000, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        temperature: 0.3,
        max_tokens: maxTokens,
        stream: false,
        messages,
      }),
    });

    // Rate limit hit — wait aur retry
    if (response.status === 429) {
      // Groq response header mein retry-after time hota hai
      const retryAfter = response.headers.get('retry-after');
      const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : (attempt + 1) * 8000;
      console.warn(`Rate limit hit. Waiting ${waitMs / 1000}s before retry ${attempt + 1}...`);
      await sleep(waitMs);
      continue; // dobara try karo
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
  try {
    const clean = rawText
      .replace(/```json|```/g, '')
      .replace(/\n/g, ' ')
      .trim();

    const match = clean.match(/\[[\s\S]*?\]/); // non-greedy

    if (!match) {
      console.warn("RAW AI RESPONSE:", rawText);
      return [];
    }

    return JSON.parse(match[0]);

  } catch (err) {
    console.warn("Parse failed:", err, rawText);
    return [];
  }
}

// ── Smarter chunking ──
// Chunk size chota kiya → tokens kam → rate limit slower
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

// ── Compact system prompt ──
// Chhota prompt = kam tokens = rate limit aaram se handle hoga
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

  // Short text → 1 call, long text → max 3 chunks (not 4)
  const chunks = cleanText.length > 3000
    ? chunkText(cleanText, 2500, 300).slice(0, 3) // max 3 chunks
    : [cleanText.slice(0, 5000)];                  // single call max 5000 chars

  let allParsed = [];

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(`Generating cards — section ${i + 1} of ${chunks.length}...`);

    const cardsPerChunk = chunks.length === 1 ? '15-18' : '7-9';

    const raw = await callGroqWithRetry([
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
       content: `Create ${cardsPerChunk} high-quality flashcards for "${deckTitle}".

STRICT RULES:
- Return ONLY a JSON array
- Do NOT include any explanation
- Do NOT include markdown or backticks
- No text before or after JSON
- Follow the exact format strictly

FORMAT:
[
  {
    "front": "...",
    "back": "...",
    "topic": "...",
    "difficulty": "easy|medium|hard",
    "type": "definition|mechanism|distinction|application|consequence|example|edge_case"
  }
]

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
    // 2 second gap taaki rate limit na hit ho
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
