// AI3: "Why?" helper. After 2 misses on an item, if Claude helpers are on, fetch a fresh,
// level-appropriate hint (≤ 2 short sentences, spoken) in place of the canned one. Every hint is
// checked in code before the child hears it: it must not give the answer away (math: the answer
// number is not in the text, as digits or words; reading: the target word is not said or spelled
// out), it must be short, plain text and kid-safe. Any failure, timeout (2 s) or offline → the
// built-in hint, silently. One request per item; later misses on the same item reuse the result.
import { blockedWords } from '../content/kidSafe';
import { numberWord } from '../engine/numberWords';
import type { AiClient } from './client';
import type { WhyRequest } from './request';

export const WHY_AFTER_MISSES = 2;
export const WHY_TIMEOUT_MS = 2000;
export const WHY_LIMITS = { chars: 160, sentences: 2, wordsPerSentence: 14 } as const;

export interface WhyContext {
  subject: 'math' | 'reading';
  /** Track id (non-alphanumerics are stripped to fit the request whitelist). */
  track: string;
  /** Engine level (0-based); sent 1-based. */
  level: number;
  question: string;
  answer: string | number;
  picked?: string | number;
  /**
   * Reading only: the target word may be said (Build it — the word is spoken anyway), but still
   * not spelled out. Default false: the word must not appear at all (Read it, sentences).
   */
  sayWordOk?: boolean;
}

export type WhyCheck = { ok: true; text: string } | { ok: false; problems: string[] };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The number as digits or words ("34", "thirty four", "thirty-four") appears in `text`. */
export function mentionsNumber(text: string, n: number): boolean {
  const t = text.toLowerCase();
  if (new RegExp(`(?<![0-9])${n}(?![0-9])`).test(t)) return true;
  const words = numberWord(n).split(' ').map(escapeRe).join('[\\s-]+');
  return new RegExp(`(?<![a-z])${words}(?![a-z])`).test(t);
}

/** The word is spelled out letter by letter or in sound chunks: "c, a, t", "c a t", "sh-i-p". */
export function spellsWord(text: string, word: string): boolean {
  const target = word.toLowerCase().replace(/[^a-z]/g, '');
  if (target.length < 2) return false;
  const t = text.toLowerCase();
  // Chunks joined by hyphens / commas / dots: "sh-i-p", "c, a, t", "c.a.t".
  const joined = t.match(/[a-z]+(?:\s*[-–,.·]\s*[a-z]+)+/g) ?? [];
  for (const run of joined) {
    const parts = run.split(/\s*[-–,.·]\s*/);
    // Only short chunks count as spelling (avoid "look, a cat" style sentences).
    if (parts.every((p) => p.length <= 3) && parts.join('').includes(target)) return true;
  }
  // Single letters separated by spaces: "c a t".
  const singles = t.match(/(?<![a-z])[a-z](?:\s+[a-z](?![a-z]))+/g) ?? [];
  return singles.some((run) => run.replace(/\s+/g, '').includes(target));
}

/** The word (or phrase) is said as a whole word in `text`. */
export function saysWord(text: string, word: string): boolean {
  const w = word.toLowerCase().trim().split(/\s+/).map(escapeRe).join('\\s+');
  if (!w) return false;
  return new RegExp(`(?<![a-z])${w}(?![a-z])`).test(text.toLowerCase());
}

/** Does the hint give the answer away? */
export function leaksAnswer(text: string, ctx: Pick<WhyContext, 'subject' | 'answer' | 'sayWordOk'>): boolean {
  const answer = String(ctx.answer).trim();
  if (ctx.subject === 'math') {
    if (/^\d+$/.test(answer)) return mentionsNumber(text, Number(answer));
    // Non-number answers (an equation like "5 plus 3", "minus"): the answer must not appear as
    // written, nor with its numbers as words ("five plus three"), nor with + / − for plus / minus.
    const norm = (s: string) => s.toLowerCase().replace(/\s+[-−–]\s+|[−–]/g, 'minus').replace(/\+/g, 'plus').replace(/[-\s]+/g, '');
    const asWords = answer.replace(/\d+/g, (d) => ` ${numberWord(Number(d))} `);
    const t = norm(text);
    return t.includes(norm(answer)) || t.includes(norm(asWords));
  }
  if (spellsWord(text, answer)) return true;
  return !ctx.sayWordOk && saysWord(text, answer);
}

/** Split into sentences on . ! ? and the speech pause marker |. */
export function sentences(text: string): string[] {
  return text.split(/[.!?|]+/).map((s) => s.trim()).filter(Boolean);
}

/** Check a hint from Claude. Returns speech-ready text (sentences joined with a pause). */
export function checkWhyHint(raw: unknown, ctx: Pick<WhyContext, 'subject' | 'answer' | 'sayWordOk'>): WhyCheck {
  const problems: string[] = [];
  const text = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
  if (!text) return { ok: false, problems: ['empty'] };
  if (text.length > WHY_LIMITS.chars) problems.push('too-long');
  // Plain text only: letters, digits, basic punctuation (no emoji, links, markup).
  if (!/^[A-Za-z0-9 ,.!?'’:;|-]+$/.test(text)) problems.push('characters');
  const parts = sentences(text);
  if (!parts.length) problems.push('empty');
  if (parts.length > WHY_LIMITS.sentences) problems.push('sentences');
  if (parts.some((s) => s.split(/\s+/).length > WHY_LIMITS.wordsPerSentence)) problems.push('long-sentence');
  if (blockedWords(text).length) problems.push('blocked');
  if (leaksAnswer(text, ctx)) problems.push('leaks-answer');
  if (problems.length) return { ok: false, problems };
  // Rebuild with sentence ends kept, joined by the speech pause marker.
  const spoken = (text.match(/[^.!?|]+[.!?]*/g) ?? []).map((s) => s.trim()).filter((s) => s && !/^[.!?]+$/.test(s));
  return { ok: true, text: spoken.join(' | ') };
}

export function whyRequest(ctx: WhyContext): WhyRequest {
  const picked = ctx.picked === undefined || ctx.picked === '' ? undefined : String(ctx.picked);
  return {
    kind: 'why',
    subject: ctx.subject,
    track: ctx.track.replace(/[^A-Za-z0-9]/g, '').slice(0, 24) || 'general',
    level: ctx.level + 1,
    item: picked ? { question: ctx.question, answer: String(ctx.answer), picked } : { question: ctx.question, answer: String(ctx.answer) },
  };
}

export type WhyResult = { source: 'claude' | 'builtin'; text: string; why?: string };

/** One "Why?" fetch: live → checked Claude hint, else the canned hint. Never throws. */
export async function fetchWhyHint(ctx: WhyContext, canned: string, client: Pick<AiClient, 'isLive' | 'request'>): Promise<WhyResult> {
  try {
    if (!client.isLive()) return { source: 'builtin', text: canned, why: 'offline' };
    const res = await client.request(whyRequest(ctx), { timeoutMs: WHY_TIMEOUT_MS });
    if (!res.ok) return { source: 'builtin', text: canned, why: res.reason };
    const checked = checkWhyHint(res.data.text, ctx);
    if (!checked.ok) return { source: 'builtin', text: canned, why: checked.problems.join(';') };
    return { source: 'claude', text: checked.text };
  } catch {
    return { source: 'builtin', text: canned, why: 'error' };
  }
}

/**
 * Per-game helper: call `hint` on every miss with the item's miss count so far (including this
 * one). Before the 2nd miss it returns the canned hint at once; from the 2nd miss on it fetches
 * one Claude hint per item (key) and reuses it, falling back to the canned hint.
 */
export function createWhyHinter(client: Pick<AiClient, 'isLive' | 'request'>) {
  const cache = new Map<string, Promise<WhyResult>>();
  return {
    async hint(key: string, misses: number, ctx: WhyContext, canned: string): Promise<WhyResult> {
      if (misses < WHY_AFTER_MISSES) return { source: 'builtin', text: canned, why: 'too-early' };
      let p = cache.get(key);
      if (!p) {
        if (!client.isLive()) return { source: 'builtin', text: canned, why: 'offline' };
        p = fetchWhyHint(ctx, canned, client);
        cache.set(key, p);
      }
      const r = await p;
      // A failed fetch keeps the per-miss canned hint (it may name what they just picked).
      return r.source === 'claude' ? r : { ...r, text: canned };
    },
    /** Forget cached hints (e.g. at the end of a round). */
    clear: () => cache.clear(),
  };
}

export type WhyHinter = ReturnType<typeof createWhyHinter>;
