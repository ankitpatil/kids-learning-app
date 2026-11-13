// What the app may send to the family proxy (SPEC "AI features").
// Requests are built from a fixed whitelist of learning-context fields only: level, phonics
// patterns, topic and the current item. Never the nickname, profile id, recordings or free text
// typed by the child. `sanitizeRequest` rebuilds every request from scratch so stray fields
// (e.g. someone passing a whole profile) are dropped, and `redactIdentifiers` removes any known
// nickname / profile id that slipped into item text (word problems use names too).
import { PATTERNS, type Pattern } from '../content/stories';

export const STORY_TOPICS = ['cricket', 'animals', 'space', 'food', 'family', 'festival'] as const;
export type StoryTopic = (typeof STORY_TOPICS)[number];

export interface PingRequest {
  kind: 'ping';
}

export interface StoryRequest {
  kind: 'story';
  level: number;
  /** Phonics patterns the child has unlocked; the story may only use these. */
  patterns: Pattern[];
  topic: StoryTopic;
  maxLines: number;
  maxWordsPerLine: number;
}

export interface WhyRequest {
  kind: 'why';
  subject: 'math' | 'reading';
  track: string;
  level: number;
  item: {
    /** The question as the app asked it (from built-in content). */
    question: string;
    answer: string;
    /** What the child picked last (a choice from the item, not free text). */
    picked?: string;
  };
}

export type AiRequest = PingRequest | StoryRequest | WhyRequest;

export const LIMITS = {
  level: [1, 20],
  maxLines: [3, 8],
  maxWordsPerLine: [3, 10],
  question: 160,
  answer: 40,
} as const;

const clampInt = (n: unknown, [lo, hi]: readonly [number, number]) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
};
const str = (s: unknown, max: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const TRACK_RE = /^[A-Za-z0-9]{1,24}$/;

/** Rebuild a request from whitelisted fields only. Returns null if it can't be made valid. */
export function sanitizeRequest(raw: unknown): AiRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  switch (r.kind) {
    case 'ping':
      return { kind: 'ping' };
    case 'story': {
      const patterns = Array.isArray(r.patterns) ? PATTERNS.filter((p) => (r.patterns as unknown[]).includes(p)) : [];
      if (!patterns.length) return null;
      if (!(STORY_TOPICS as readonly unknown[]).includes(r.topic)) return null;
      return {
        kind: 'story',
        level: clampInt(r.level, LIMITS.level),
        patterns,
        topic: r.topic as StoryTopic,
        maxLines: clampInt(r.maxLines ?? 5, LIMITS.maxLines),
        maxWordsPerLine: clampInt(r.maxWordsPerLine ?? 7, LIMITS.maxWordsPerLine),
      };
    }
    case 'why': {
      if (r.subject !== 'math' && r.subject !== 'reading') return null;
      if (typeof r.track !== 'string' || !TRACK_RE.test(r.track)) return null;
      const item = (r.item && typeof r.item === 'object' ? r.item : {}) as Record<string, unknown>;
      const question = str(item.question, LIMITS.question);
      const answer = str(item.answer, LIMITS.answer);
      if (!question || !answer) return null;
      const picked = item.picked === undefined ? undefined : str(item.picked, LIMITS.answer);
      return {
        kind: 'why',
        subject: r.subject,
        track: r.track,
        level: clampInt(r.level, LIMITS.level),
        item: picked ? { question, answer, picked } : { question, answer },
      };
    }
    default:
      return null;
  }
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Identifiers worth guarding: ignore 1-letter nicknames (they'd match "a" / "I"). */
export function usableIdentifiers(ids: string[]): string[] {
  return [...new Set(ids.map((s) => s.trim()).filter((s) => s.length >= 2))];
}

/** Replace any known nickname / profile id inside the request's strings with a neutral word. */
export function redactIdentifiers<T extends AiRequest>(req: T, ids: string[]): T {
  const guard = usableIdentifiers(ids);
  if (!guard.length) return req;
  const re = new RegExp(`(?<![A-Za-z0-9])(${guard.map(escapeRe).join('|')})(?![A-Za-z0-9])`, 'gi');
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return v.replace(re, 'Kai');
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(req) as T;
}

/** Final check on the exact bytes that would leave the device. */
export function containsIdentifier(body: string, ids: string[]): boolean {
  const lower = body.toLowerCase();
  return usableIdentifiers(ids).some((id) => {
    const re = new RegExp(`(?<![A-Za-z0-9])${escapeRe(id.toLowerCase())}(?![A-Za-z0-9])`);
    return re.test(lower);
  });
}
