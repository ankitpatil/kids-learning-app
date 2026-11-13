// Little Learners family proxy — a stateless Cloudflare Worker between the app and Claude.
//
// - Holds the Anthropic API key as a Worker secret; the app never sees it.
// - Checks the family passcode (X-Family-Passcode header) before anything else.
// - Rate-limits per isolate (best effort; the real cap is the monthly spend limit on the key).
// - Accepts only three request kinds (ping, story, why) and rebuilds them from whitelisted fields.
//   The model, system prompt and output format are fixed here, never taken from the request.
// - Stores nothing and never logs request or response bodies (no console calls in this file).
//
// Deployed by Ankit only — see ../README.md. Build runs must never deploy it.

export const MODEL = 'claude-haiku-4-5';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MAX_BODY_BYTES = 2048;
const RATE = { perMinute: 20, perDay: 300 };

export const PATTERNS = ['cvc', 'digraphs', 'blends', 'silentE', 'vowelTeams'];
export const TOPICS = ['cricket', 'animals', 'space', 'food', 'family', 'festival'];

const PATTERN_HELP = {
  cvc: 'short-vowel consonant-vowel-consonant words (cat, sun, pig, red, hop)',
  digraphs: 'words with sh, ch, th, ck (ship, chop, thin, duck)',
  blends: 'consonant blends (stop, flag, trip, frog, best)',
  silentE: 'magic-e words (cake, bike, home, cute)',
  vowelTeams: 'ee, ai, oa words (seed, rain, boat)',
};

export const SYSTEM_PROMPT = [
  'You write tiny pieces of learning content for a reading and math app used by children aged 5 to 7.',
  'Everything must be gentle, kind, safe and age-appropriate: no violence, scary themes, brands, real people, romance, food or body shaming.',
  'Never ask the child questions about themselves and never include personal details.',
  'Reply with a single JSON object only, no prose and no code fences.',
].join(' ');

// ---------- validation (independent of the app's own filter) ----------

const clampInt = (n, lo, hi) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
};
const str = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function validateRequest(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.kind === 'ping') return { kind: 'ping' };
  if (raw.kind === 'story') {
    const patterns = Array.isArray(raw.patterns) ? PATTERNS.filter((p) => raw.patterns.includes(p)) : [];
    if (!patterns.length || !TOPICS.includes(raw.topic)) return null;
    return {
      kind: 'story',
      level: clampInt(raw.level, 1, 20),
      patterns,
      topic: raw.topic,
      maxLines: clampInt(raw.maxLines ?? 5, 3, 8),
      maxWordsPerLine: clampInt(raw.maxWordsPerLine ?? 7, 3, 10),
    };
  }
  if (raw.kind === 'why') {
    if (raw.subject !== 'math' && raw.subject !== 'reading') return null;
    if (typeof raw.track !== 'string' || !/^[A-Za-z0-9]{1,24}$/.test(raw.track)) return null;
    const item = raw.item && typeof raw.item === 'object' ? raw.item : {};
    const question = str(item.question, 160);
    const answer = str(item.answer, 40);
    if (!question || !answer) return null;
    const picked = item.picked === undefined ? '' : str(item.picked, 40);
    return { kind: 'why', subject: raw.subject, track: raw.track, level: clampInt(raw.level, 1, 20), item: picked ? { question, answer, picked } : { question, answer } };
  }
  return null;
}

// ---------- prompts (server-side only) ----------

export function buildMessages(req) {
  if (req.kind === 'story') {
    const allowed = req.patterns.map((p) => `- ${PATTERN_HELP[p]}`).join('\n');
    return {
      maxTokens: 900,
      user: [
        `Write a short decodable story about ${req.topic} for a beginning reader (level ${req.level}).`,
        `Use ONLY these word types, plus very common sight words (the, a, is, to, of, said, was, he, she, we, my, you, I, and):`,
        allowed,
        `3 to ${req.maxLines} lines, each one sentence of at most ${req.maxWordsPerLine} words. Use simple names like Sam, Raj, Meg, Ved or Kim. Write numbers as words.`,
        'Add exactly 2 questions, each ending with "?". Each answer must be 1 to 3 words copied from the line it points to (0-based index). Give 2 different wrong choices per question.',
        'Every word in the lines is checked by a program; a story with any other word type is thrown away.',
        'JSON shape: {"title": string, "lines": [{"text": string, "emoji": string}], "questions": [{"q": string, "line": number, "answer": {"text": string, "emoji": string}, "wrong": [{"text": string, "emoji": string}, {"text": string, "emoji": string}]}]}',
      ].join('\n'),
      wrap: (obj) => ({ story: obj }),
    };
  }
  return {
    maxTokens: 160,
    user: [
      `A child (level ${req.level}, ${req.subject}, skill "${req.track}") missed this item twice.`,
      `Question: ${req.item.question}`,
      req.item.picked ? `They picked: ${req.item.picked}` : '',
      `The correct answer is "${req.item.answer}" but you must NOT say it, spell it or write the number.`,
      'Give a hint of at most 2 very short sentences (under 12 words each) that helps them work it out. Kind and encouraging.',
      'JSON shape: {"text": string}',
    ].filter(Boolean).join('\n'),
    wrap: (obj) => ({ text: String(obj.text ?? '') }),
  };
}

export function parseModelJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const v = JSON.parse(text.slice(start, end + 1));
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

// ---------- passcode + rate limit ----------

async function digest(s) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}

export async function passcodeOk(given, expected) {
  if (!expected || typeof given !== 'string' || !given) return false;
  const [a, b] = await Promise.all([digest(given), digest(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function createRateLimiter({ perMinute, perDay } = RATE, now = () => Date.now()) {
  let minute = { start: 0, n: 0 };
  let day = { start: 0, n: 0 };
  return () => {
    const t = now();
    if (t - minute.start >= 60_000) minute = { start: t, n: 0 };
    if (t - day.start >= 86_400_000) day = { start: t, n: 0 };
    if (minute.n >= perMinute || day.n >= perDay) return false;
    minute.n++;
    day.n++;
    return true;
  };
}

// ---------- handler ----------

function cors(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Family-Passcode',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const json = (env, status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(env) } });

export function createHandler({ fetchImpl = (u, i) => fetch(u, i), allow = createRateLimiter() } = {}) {
  return async function handle(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
    if (request.method !== 'POST') return json(env, 405, { error: 'method' });
    if (!(await passcodeOk(request.headers.get('X-Family-Passcode'), env.FAMILY_PASSCODE))) return json(env, 401, { error: 'passcode' });
    if (!allow()) return json(env, 429, { error: 'slow down' });

    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json(env, 413, { error: 'too big' });
    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      return json(env, 400, { error: 'json' });
    }
    const req = validateRequest(raw);
    if (!req) return json(env, 400, { error: 'request' });
    if (req.kind === 'ping') return json(env, 200, { data: { ok: true } });
    if (!env.ANTHROPIC_API_KEY) return json(env, 503, { error: 'not configured' });

    const m = buildMessages(req);
    let upstream;
    try {
      upstream = await fetchImpl(ANTHROPIC_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: MODEL, max_tokens: m.maxTokens, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: m.user }] }),
      });
    } catch {
      return json(env, 502, { error: 'upstream' });
    }
    if (!upstream.ok) return json(env, 502, { error: 'upstream' });
    const out = await upstream.json().catch(() => null);
    const modelText = out?.content?.find?.((c) => c.type === 'text')?.text ?? '';
    const parsed = parseModelJson(modelText);
    if (!parsed) return json(env, 502, { error: 'model output' });
    return json(env, 200, { data: m.wrap(parsed) });
  };
}

const handle = createHandler();
export default { fetch: (request, env) => handle(request, env) };
