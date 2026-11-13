// Story Choose (#19): pick a decodable story the child has the phonics for, then ask about it.
import { STORIES, PATTERNS, type Story, type StoryChoice, type Pattern } from '../../content/stories';
import { SIGHT_WORDS } from '../../content/sightWords';
import { getLevel, MASTERED } from '../../engine/tracks';
import type { Rng } from '../feedMonster/generator';

export const TRACK = 'stories';

// ---- Decodability (used by content tests and to keep stories honest) ----
const S = '[bcdfghjklmnpqrstvwxyz]';
const F = '[bcdfgjklmnprstvxz]'; // single final consonant (no h, q, w, y: those make vowel sounds like cow, day)
const ON = `(?:sh|ch|th|wh|${S})`; // onset unit
const CO = `(?:sh|ch|th|ck|ng|ll|ss|ff|zz|${F})`; // coda unit
const RULES: [Pattern, RegExp][] = [
  ['cvc', new RegExp(`^${S}?[aeiou]${F}s?$`)],
  ['digraphs', new RegExp(`^${ON}?[aeiou]${CO}s?$`)],
  ['blends', new RegExp(`^${ON}{0,3}[aeiou]${CO}{1,2}s?$`)],
  ['silentE', new RegExp(`^${ON}{0,3}[aeiou]${F}es?$`)],
  ['vowelTeams', new RegExp(`^${ON}{0,3}(?:ee|ai|oa)${CO}{0,2}s?$`)],
];

const SIGHT = new Set(SIGHT_WORDS.flat().map((w) => w.word.toLowerCase()));

export function isSightWord(word: string): boolean {
  const w = word.toLowerCase();
  return SIGHT.has(w) || (w.endsWith('s') && SIGHT.has(w.slice(0, -1)));
}

/** Index in PATTERNS of the easiest pattern that decodes `word`, or -1 if none does. */
export function wordPattern(word: string): number {
  const w = word.toLowerCase();
  const i = RULES.findIndex(([, re]) => re.test(w));
  return i < 0 ? -1 : PATTERNS.indexOf(RULES[i][0]);
}

/** Words in a story that are neither tricky words nor decodable at its pattern. Empty = OK. */
export function undecodable(story: Story): string[] {
  const cap = PATTERNS.indexOf(story.pattern);
  const words = story.lines.flatMap((l) => tokenizeWords(l.text));
  return [...new Set(words.filter((w) => !isSightWord(w) && !(wordPattern(w) >= 0 && wordPattern(w) <= cap)))];
}

export function tokenizeWords(text: string): string[] {
  return text.match(/[A-Za-z']+/g) ?? [];
}

// ---- Which stories are open ----
type States = Record<string, { level: number; mastery: number } | undefined>;

/**
 * Highest pattern (index into PATTERNS) the child can read: a pattern counts once its Word Detective
 * track is past level 1 or its mastery is high. CVC is always open; a later open pattern opens the
 * earlier ones too.
 */
export function unlockedPattern(states: States): number {
  let best = 0;
  PATTERNS.forEach((p, i) => {
    const s = states[p];
    if (s && (s.level > 0 || s.mastery > MASTERED)) best = Math.max(best, i);
  });
  return best;
}

/**
 * Stories playable at a level: pattern ≤ the level's cap and ≤ what's unlocked. Easing → CVC only.
 * `extra` = stories cached on this device (AI2), which join the pool on the same terms.
 */
export function storiesFor(level: number, unlocked: number, ease = false, extra: Story[] = []): Story[] {
  const cap = ease ? 0 : Math.min(getLevel(TRACK, level).range, unlocked);
  const pool = [...STORIES, ...extra].filter((s) => PATTERNS.indexOf(s.pattern) <= cap);
  return pool.length ? pool : STORIES.filter((s) => s.pattern === 'cvc');
}

/** Prefer stories at the top of the allowed range (the new pattern), but mix in easier ones. */
export function pickStory(level: number, unlocked: number, rng: Rng = Math.random, ease = false, avoid: string[] = [], extra: Story[] = []): Story {
  const pool = storiesFor(level, unlocked, ease, extra);
  const fresh = pool.filter((s) => !avoid.includes(s.id));
  const from = fresh.length ? fresh : pool;
  const top = Math.max(...from.map((s) => PATTERNS.indexOf(s.pattern)));
  const hard = from.filter((s) => PATTERNS.indexOf(s.pattern) === top);
  const list = !ease && hard.length < from.length && rng() < 0.6 ? hard : from;
  return list[Math.floor(rng() * list.length)];
}

// ---- Read-along mode per level ----
/** auto = the app reads the story aloud with highlighting; button = child reads, "read to me" on offer; self = child reads (tap a word to hear it). */
export type ReadMode = 'auto' | 'button' | 'self';

export function readMode(level: number, ease = false): ReadMode {
  if (ease || level <= 0) return 'auto';
  return getLevel(TRACK, level).scaffold ? 'button' : 'self';
}

// ---- Questions ----
export interface QuestionItem {
  id: string;
  q: string;
  line: number;
  answer: StoryChoice;
  choices: StoryChoice[];
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Question `qi` of a story with shuffled choices. Easing: the answer plus one wrong choice. */
export function makeQuestion(story: Story, qi: number, rng: Rng = Math.random, ease = false): QuestionItem {
  const sq = story.questions[qi];
  const wrong = ease ? sq.wrong.slice(0, 1) : sq.wrong;
  return { id: `story-${story.id}-q${qi}`, q: sq.q, line: sq.line, answer: sq.answer, choices: shuffle([sq.answer, ...wrong], rng) };
}

/** The spoken question; on the first level the choices are read too. */
export function questionSpeech(item: QuestionItem, level: number): string {
  if (level > 0) return item.q;
  const names = item.choices.map((c) => c.text);
  return `${item.q} | ${names.slice(0, -1).join(', | ')}, | or ${names[names.length - 1]}?`;
}

export const STORIES_PER_ROUND = 2;
