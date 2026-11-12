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
