import { WORDS, MAGIC_E, SENTENCES, type PictureWord } from '../../content/words';
import { PATTERNS } from '../../content/stories';
import { getLevel } from '../../engine/tracks';
import type { Rng } from '../feedMonster/generator';

/** Tracks whose items are picture words (read it / build it). */
export const PICTURE_TRACKS = ['cvc', 'digraphs', 'blends', 'silentE', 'vowelTeams'] as const;
export type PictureTrack = (typeof PICTURE_TRACKS)[number];
/** Every track Word Detective plays: picture-word tracks plus finish-the-sentence. */
export const WORD_TRACKS = [...PICTURE_TRACKS, 'sentences'] as const;
export type WordTrack = (typeof WORD_TRACKS)[number];

/** silentE level at which the magic-e switch (cap / cape) items start. */
export const MAGIC_E_LEVEL = 2;

/** Multi-letter graphemes kept together as one tile (longest first). */
const GRAPHEMES = ['sh', 'ch', 'th', 'ck', 'ee', 'ai', 'oa', 'wh', 'qu'];

export function splitGraphemes(word: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < word.length) {
    const g = GRAPHEMES.find((x) => word.startsWith(x, i));
    if (g) {
      out.push(g);
      i += g.length;
    } else {
      if (word[i] !== '-') out.push(word[i]);
      i += 1;
    }
  }
  return out;
}

/** Look-alike / sound-alike swaps used for "near" decoy tiles. */
export const NEAR_TILE: Record<string, string[]> = {
  sh: ['ch', 's'], ch: ['sh', 'c'], th: ['t', 'f'], ck: ['k', 'c'],
  ee: ['e', 'ea'], ai: ['a', 'ay'], oa: ['o', 'oo'],
  b: ['d'], d: ['b'], p: ['q'], m: ['n'], n: ['m'],
  a: ['e', 'u'], e: ['i', 'a'], i: ['e'], o: ['u', 'a'], u: ['o', 'a'],
};
const FAR_TILES = ['m', 's', 't', 'p', 'n', 'g', 'r', 'l', 'f', 'h', 'b', 'd'];

function int(rng: Rng, lo: number, hi: number) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}
function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickWord(track: PictureTrack, rng: Rng, avoid?: string): PictureWord {
  const list = WORDS[track].filter((w) => w.word !== avoid);
  return list[int(rng, 0, list.length - 1)];
}

export interface ReadItem {
  kind: 'read';
  id: string;
  word: string;
  /** Pictures to choose from (emoji); answer is the target's emoji. */
  pictures: { emoji: string; word: string }[];
  answer: string;
  /** Magic-e switch item: the short/long pair, shown after a correct answer (kit + e = kite). */
  magic?: { short: string; long: string };
}

export interface BuildItem {
  kind: 'build';
  id: string;
  word: string;
  emoji: string;
  /** Correct tile sequence. */
  slots: string[];
  /** Shuffled tiles (slots + decoys). */
  tiles: string[];
  /** Ease mode pre-fills the first slot. */
  prefilled: number;
}

export interface SentenceItem {
  kind: 'sentence';
  id: string;
  /** The answer word (used for no-repeat memory and feedback). */
  word: string;
  before: string;
  after: string;
  choices: string[];
  /** Picture clue, shown at the scaffolded level and when easing. */
  emoji?: string;
}

export type WordItem = ReadItem | BuildItem | SentenceItem;

/** Read it: written word → pick the picture. Near levels use pictures from the same pattern. */
export function makeReadItem(track: PictureTrack, level: number, rng: Rng = Math.random, ease = false, avoid?: string): ReadItem {
  const target = pickWord(track, rng, avoid);
  const near = getLevel(track, level).distractors === 'near' && !ease;
  const n = ease ? 2 : near ? 4 : 3;
  const sameTrack = WORDS[track].filter((w) => w.word !== target.word);
  const otherTracks = Object.entries(WORDS).filter(([k]) => k !== track).flatMap(([, v]) => v);
  const pool = shuffle(near ? sameTrack : otherTracks, rng);
  const pics: PictureWord[] = [target];
  for (const w of pool) {
    if (pics.length >= n) break;
    if (!pics.some((p) => p.emoji === w.emoji)) pics.push(w);
  }
  return {
    kind: 'read',
    id: `read-${target.word}`,
    word: target.word,
    pictures: shuffle(pics, rng).map((p) => ({ emoji: p.emoji, word: p.word })),
    answer: target.emoji,
  };
}

/** Build it: picture + spoken word → put grapheme tiles in order. Decoys get closer at near levels. */
export function makeBuildItem(track: PictureTrack, level: number, rng: Rng = Math.random, ease = false, avoid?: string): BuildItem {
  const target = pickWord(track, rng, avoid);
  const slots = splitGraphemes(target.word);
  const near = getLevel(track, level).distractors === 'near';
  const decoys = new Set<string>();
  if (!ease) {
    const want = near ? 2 : 1;
    if (near) {
      // Target the pattern being taught first (multi-letter tiles like sh / ee), then vowels, then the rest.
      const order = shuffle(slots, rng).sort((a, b) => b.length - a.length);
      for (const g of order) {
        for (const alt of NEAR_TILE[g] ?? []) if (decoys.size < want && !slots.includes(alt)) decoys.add(alt);
      }
    }
    for (const f of shuffle(FAR_TILES, rng)) if (decoys.size < want && !slots.includes(f)) decoys.add(f);
  }
  return {
    kind: 'build',
    id: `build-${target.word}`,
    word: target.word,
    emoji: target.emoji,
    slots,
    tiles: shuffle([...slots, ...decoys], rng),
    prefilled: ease ? 1 : 0,
  };
}

/**
 * Magic-e switch: show either the short word (kit) or the magic-e word (kite); the pictures always
 * include both, so the child must notice the e. Easing drops the third picture.
 */
export function makeMagicItem(rng: Rng = Math.random, ease = false, avoid?: string): ReadItem {
  const pairs = MAGIC_E.filter((p) => p.short !== avoid && p.long !== avoid);
  const pair = pairs[int(rng, 0, pairs.length - 1)];
  const showLong = rng() < 0.5;
  const word = showLong ? pair.long : pair.short;
  const answer = showLong ? pair.longEmoji : pair.shortEmoji;
  const pics = [
    { emoji: pair.shortEmoji, word: pair.short },
    { emoji: pair.longEmoji, word: pair.long },
  ];
  if (!ease) {
    const others = MAGIC_E.filter((p) => p !== pair);
    const o = others[int(rng, 0, others.length - 1)];
    pics.push(rng() < 0.5 ? { emoji: o.shortEmoji, word: o.short } : { emoji: o.longEmoji, word: o.long });
  }
  return { kind: 'read', id: `magic-${word}`, word, pictures: shuffle(pics, rng), answer, magic: { short: pair.short, long: pair.long } };
}

/**
 * Finish the sentence: pick the word that fits. Level 0 = picture clue + 2 choices;
 * higher levels = no picture + 3 look-alike choices. Easing = picture + 2 choices, short-vowel / blend sentences only.
 */
export const EASY_SENTENCE_PATTERN = PATTERNS.indexOf('blends');

export function makeSentenceItem(level: number, rng: Rng = Math.random, ease = false, avoid?: string): SentenceItem {
  // Easing keeps to sentences without magic e or vowel teams (C2).
  const pool = SENTENCES.filter((x) => x.answer !== avoid && (!ease || PATTERNS.indexOf(x.pattern) <= EASY_SENTENCE_PATTERN));
  const s = pool[int(rng, 0, pool.length - 1)];
  const near = getLevel('sentences', level).distractors === 'near' && !ease;
  const decoys = shuffle(s.near, rng).slice(0, near ? 2 : 1);
  const [before, after] = s.text.split('_');
  return {
    kind: 'sentence',
    id: `sentence-${s.answer}`,
    word: s.answer,
    before: before.trimEnd(),
    after: after.trimStart(),
    choices: shuffle([s.answer, ...decoys], rng),
    emoji: near ? undefined : s.emoji,
  };
}

/** Rounds alternate: read, build, read, build… (magic-e level swaps reads for magic-e switches). */
export function makeWordItem(track: WordTrack, level: number, index: number, rng: Rng = Math.random, ease = false, avoid?: string): WordItem {
  if (track === 'sentences') return makeSentenceItem(level, rng, ease, avoid);
  if (index % 2 === 0) {
    if (track === 'silentE' && level >= MAGIC_E_LEVEL) return makeMagicItem(rng, ease, avoid);
    return makeReadItem(track, level, rng, ease, avoid);
  }
  return makeBuildItem(track, level, rng, ease, avoid);
}

/** The full sentence with a word in the blank (for speech and the success display). */
export function fillSentence(item: SentenceItem, word: string): string {
  return `${item.before} ${word}${/^[.,!?]/.test(item.after) ? '' : ' '}${item.after}`.trim();
}

/** Which slots are wrong (indices). Empty array = correct. */
export function wrongSlots(item: BuildItem, placed: (string | null)[]): number[] {
  return item.slots.map((s, i) => (placed[i] === s ? -1 : i)).filter((i) => i >= 0);
}
