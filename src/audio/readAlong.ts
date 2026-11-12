// Read-along helpers: split a sentence into words with character offsets, map speech "boundary"
// events to a word, and estimate word timings for browsers that never fire boundary events.
export interface Token {
  word: string;
  start: number;
  end: number;
}

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  const re = /[A-Za-z0-9']+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}

/** The word a boundary event's charIndex falls in (or the last word starting before it). */
export function wordIndexAt(tokens: Token[], charIndex: number): number {
  let idx = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].start <= charIndex) idx = i;
    else break;
  }
  return idx;
}

/**
 * Estimated start time (ms) of each word when spoken at `rate` (1 = normal TTS speed): a fixed cost
 * per word plus a little per letter, and a pause after . , ! ?
 */
export function estimateWordStarts(text: string, rate = 0.9): number[] {
  const tokens = tokenize(text);
  const starts: number[] = [];
  let t = 0;
  tokens.forEach((tok, i) => {
    starts.push(Math.round(t));
    const after = text.slice(tok.end, tokens[i + 1]?.start ?? text.length);
    t += (170 + 55 * tok.word.length + (/[.!?]/.test(after) ? 300 : /,/.test(after) ? 150 : 0)) / rate;
  });
  return starts;
}

/** Rough total duration (ms) of a sentence, for a safety timeout when `onend` never fires. */
export function estimateDuration(text: string, rate = 0.9): number {
  const starts = estimateWordStarts(text, rate);
  const tokens = tokenize(text);
  const last = tokens[tokens.length - 1];
  return (starts[starts.length - 1] ?? 0) + (last ? (170 + 55 * last.word.length) / rate : 0);
}

// ---- Phrasing: natural pauses for spoken prompts ----

/** Pause (ms) after a phrase, by how it ends. Kids need longer gaps than adults. */
export const PAUSE = {
  sentence: 380, // . or !
  question: 520, // ?
  colon: 320, // "Catch the word: said"
  letter: 280, // between spelled letters: "C … A … T"
  short: 450, // explicit `|` in a prompt: a beat between ideas
  long: 850, // explicit `||`: a full stop between parts (praise || next question)
} as const;

export interface Chunk {
  text: string;
  /** Silence after this chunk, in ms (0 for the last one). */
  pause: number;
}

const SPELLED = /^(?:[A-Za-z],\s*)+[A-Za-z][.!?]?$/;

/**
 * Split a prompt into phrases spoken one at a time with a pause after each: sentences (. ! ?),
 * a colon, explicit markers (`|` short beat, `||` long beat) and spelled-out letters ("c, a, t").
 * Spelled letters are upper-cased so the voice says the letter name ("A", not "uh").
 */
export function speechChunks(text: string): Chunk[] {
  const out: Chunk[] = [];
  const parts = text.split(/\s*(\|\|?)\s*/);
  for (const part of parts) {
    if (part === '|' || part === '||') {
      if (out.length) out[out.length - 1].pause = Math.max(out[out.length - 1].pause, part === '|' ? PAUSE.short : PAUSE.long);
      continue;
    }
    // End a phrase at . ! ? (runs like "!?" stay together) or a colon, when followed by a space or the end.
    const sentences = part.split(/(?<=[.!?:])\s+/);
    for (const raw of sentences) {
      const s = raw.trim();
      if (!s || /^[.!?:,\s]+$/.test(s)) continue;
      if (SPELLED.test(s)) {
        s.replace(/[.!?]$/, '')
          .split(/,\s*/)
          .forEach((l) => out.push({ text: l.toUpperCase(), pause: PAUSE.letter }));
        out[out.length - 1].pause = PAUSE.sentence;
        continue;
      }
      const end = s[s.length - 1];
      const pause = end === '?' ? PAUSE.question : end === ':' ? PAUSE.colon : /[.!]/.test(end) ? PAUSE.sentence : PAUSE.sentence;
      out.push({ text: end === ':' ? s.slice(0, -1) : s, pause });
    }
  }
  if (out.length) out[out.length - 1].pause = 0;
  return out;
}

/** The prompt as plain text (markers removed), e.g. for aria labels. */
export function plainSpeech(text: string): string {
  return text.replace(/\s*\|\|?\s*/g, ' ').trim();
}
