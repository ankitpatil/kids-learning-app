// AI2: personalized stories from Claude (through the family proxy), checked in code before a child
// sees them. Any failure → one retry → a built-in story, silently. Good stories are cached on the
// device (store/aiStories) and join the normal story pool, so they replay offline.
import { PATTERNS, type Pattern, type Story, type StoryChoice } from '../../content/stories';
import { blockedWords } from '../../content/kidSafe';
import type { StoryRequest, StoryTopic } from '../../ai/request';
import type { AiClient } from '../../ai/client';
import { getLevel } from '../../engine/tracks';
import { TRACK, undecodable, wordPattern, isSightWord, tokenizeWords, pickStory } from './generator';
import type { Rng } from '../feedMonster/generator';

export const TOPIC_ICONS: Record<StoryTopic, string> = {
  cricket: '🏏',
  animals: '🐾',
  space: '🚀',
  food: '🍎',
  family: '👪',
  festival: '🪔',
};

export const STORY_LIMITS = {
  minLines: 3,
  maxLines: 5,
  maxWordsPerLine: 7,
  titleChars: 40,
  questionChars: 80,
  choiceChars: 24,
};

/** Per-attempt timeout and the total time a child may wait (see DECISIONS 2026-11-13 AI2). */
export const STORY_TIMEOUT_MS = 5000;
export const STORY_BUDGET_MS = 8000;

/** Hardest pattern a story may use at this level (same rule as the built-in pool). */
export function patternCap(level: number, unlocked: number, ease = false): number {
  return ease ? 0 : Math.max(0, Math.min(getLevel(TRACK, level).range, unlocked));
}

export function storyRequest(level: number, cap: number, topic: StoryTopic): StoryRequest {
  return {
    kind: 'story',
    level: level + 1, // 1-based for the prompt
    patterns: PATTERNS.slice(0, cap + 1) as Pattern[],
    topic,
    maxLines: STORY_LIMITS.maxLines,
    maxWordsPerLine: STORY_LIMITS.maxWordsPerLine,
  };
}

// ---- Validation ----
const FORBIDDEN_CHARS = /[<>{}[\]\\|`@#$%^*_=~]|https?:|www\./i;
const PICTO = /\p{Extended_Pictographic}/u;

const cleanText = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.replace(/\s+/g, ' ').trim();
  if (!s || s.length > max || FORBIDDEN_CHARS.test(s) || /\d/.test(s)) return null;
  return s;
};

/** A picture: 1–3 emoji, no letters or digits. Anything else becomes the fallback picture. */
export function cleanEmoji(v: unknown, fallback: string): string {
  if (typeof v !== 'string') return fallback;
  const s = v.trim();
  if (!s || s.length > 16 || /[\p{L}\p{N}<>]/u.test(s) || !PICTO.test(s)) return fallback;
  return s;
}

const norm = (w: string) => w.toLowerCase().replace(/'/g, '');

/** Every word of the answer appears in the line it points at (a plural -s in either is fine: nap / naps). */
export function answerInLine(answer: string, line: string): boolean {
  const base = (w: string) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
  const lineWords = new Set(tokenizeWords(line).map((w) => base(norm(w))));
  const words = tokenizeWords(answer).map((w) => base(norm(w)));
  return words.length > 0 && words.every((w) => lineWords.has(w));
}

/** Hardest pattern a set of lines actually uses (sight words don't count). */
export function usedPattern(lines: string[]): number {
  let max = 0;
  for (const w of lines.flatMap(tokenizeWords)) if (!isSightWord(w)) max = Math.max(max, wordPattern(w));
  return max;
}

const hashId = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
};

export type CheckResult = { ok: true; story: Story } | { ok: false; problems: string[] };

/**
 * Check a story from Claude: shape, length limits, decodable at `cap`, kid-safe words, exactly 2
 * questions whose answers appear in the line they point at. Returns a ready-to-play Story.
 */
export function checkAiStory(raw: unknown, cap: number, topic: StoryTopic): CheckResult {
  const problems: string[] = [];
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const title = cleanText(r.title, STORY_LIMITS.titleChars);
  if (!title) problems.push('title');

  const rawLines = Array.isArray(r.lines) ? r.lines : [];
  if (rawLines.length < STORY_LIMITS.minLines || rawLines.length > STORY_LIMITS.maxLines) problems.push('line-count');
  const lines = rawLines.slice(0, STORY_LIMITS.maxLines).map((l, i) => {
    const o = (l && typeof l === 'object' ? l : {}) as Record<string, unknown>;
    const text = cleanText(o.text, 80);
    if (!text) problems.push(`line-${i}`);
    else if (tokenizeWords(text).length > STORY_LIMITS.maxWordsPerLine) problems.push(`line-${i}-long`);
    return { text: text ?? '', emoji: cleanEmoji(o.emoji, TOPIC_ICONS[topic]) };
  });

  const rawQs = Array.isArray(r.questions) ? r.questions : [];
  if (rawQs.length !== 2) problems.push('question-count');
  const questions = rawQs.slice(0, 2).map((q, i) => {
    const o = (q && typeof q === 'object' ? q : {}) as Record<string, unknown>;
    const text = cleanText(o.q, STORY_LIMITS.questionChars);
    const line = typeof o.line === 'number' && Number.isInteger(o.line) ? o.line : -1;
    const choice = (c: unknown): StoryChoice | null => {
      const co = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
      const t = cleanText(co.text, STORY_LIMITS.choiceChars);
      return t ? { text: t, emoji: cleanEmoji(co.emoji, '❓') } : null;
    };
    const answer = choice(o.answer);
    const wrong = (Array.isArray(o.wrong) ? o.wrong : []).map(choice);
    if (!text || !text.endsWith('?')) problems.push(`q${i}`);
    if (line < 0 || line >= lines.length) problems.push(`q${i}-line`);
    if (!answer) problems.push(`q${i}-answer`);
    if (wrong.length !== 2 || wrong.some((w) => !w)) problems.push(`q${i}-wrong`);
    const texts = [answer, ...wrong].filter(Boolean).map((c) => norm(c!.text));
    if (new Set(texts).size !== texts.length) problems.push(`q${i}-duplicate-choice`);
    if (answer && line >= 0 && line < lines.length && !answerInLine(answer.text, lines[line].text)) problems.push(`q${i}-answer-not-in-line`);
    return { q: text ?? '', line, answer: answer ?? { text: '', emoji: '' }, wrong: wrong.filter(Boolean) as StoryChoice[] };
  });
  if (problems.length) return { ok: false, problems };

  const lineTexts = lines.map((l) => l.text);
  const pattern = PATTERNS[usedPattern(lineTexts)] ?? 'cvc';
  const story: Story = {
    id: `ai-${hashId(title + lineTexts.join('|'))}`,
    title: title!,
    emoji: TOPIC_ICONS[topic],
    pattern,
    lines,
    questions,
  };
  // Decodable at the child's cap (checked against the cap, not the pattern we just computed).
  const bad = undecodable({ ...story, pattern: PATTERNS[cap] });
  if (bad.length) problems.push(`undecodable:${bad.join(',')}`);
  const allText = [title, ...lineTexts, ...questions.flatMap((q) => [q.q, q.answer.text, ...q.wrong.map((w) => w.text)])].join(' ');
  const blocked = blockedWords(allText);
  if (blocked.length) problems.push(`blocked:${blocked.join(',')}`);
  return problems.length ? { ok: false, problems } : { ok: true, story };
}

// ---- Fetch with retry + fallback ----
export interface NewStoryDeps {
  client: Pick<AiClient, 'isLive' | 'request'>;
  /** Built-in fallback (and cached stories) — usually pickStory over the normal pool. */
  fallback: () => Story;
  save?: (story: Story, topic: StoryTopic) => Promise<void> | void;
  now?: () => number;
}

export type NewStoryResult = { source: 'claude'; story: Story } | { source: 'builtin'; story: Story; why: string };

export async function newStory(level: number, cap: number, topic: StoryTopic, deps: NewStoryDeps): Promise<NewStoryResult> {
  const now = deps.now ?? Date.now;
  const fallback = (why: string): NewStoryResult => ({ source: 'builtin', story: deps.fallback(), why });
  if (!deps.client.isLive()) return fallback('offline');
  const start = now();
  const req = storyRequest(level, cap, topic);
  let why = 'no-attempt';
  for (let attempt = 0; attempt < 2; attempt++) {
    const left = STORY_BUDGET_MS - (now() - start);
    if (left < 1000) break;
    const res = await deps.client.request(req, { timeoutMs: Math.min(STORY_TIMEOUT_MS, left) });
    if (!res.ok) {
      why = res.reason;
      continue;
    }
    const checked = checkAiStory(res.data.story, cap, topic);
    if (checked.ok) {
      try {
        await deps.save?.(checked.story, topic);
      } catch {
        /* caching is best-effort */
      }
      return { source: 'claude', story: checked.story };
    }
    why = checked.problems.join(';');
  }
  return fallback(why);
}

/** Fallback used by the game: a built-in or cached story from the normal pool. */
export function fallbackStory(level: number, unlocked: number, extra: Story[], rng: Rng = Math.random, ease = false): Story {
  return pickStory(level, unlocked, rng, ease, [], extra);
}

/** Cached stories, re-checked on load (the blocklist or checker may have changed since they were saved). */
export function playableCached(records: { topic: string; story: Story }[]): Story[] {
  return records.flatMap(({ topic, story }) => {
    const t = (topic in TOPIC_ICONS ? topic : 'animals') as StoryTopic;
    const cap = PATTERNS.indexOf(story?.pattern);
    if (cap < 0) return [];
    const c = checkAiStory(story, cap, t);
    return c.ok ? [{ ...c.story, id: story.id }] : [];
  });
}
