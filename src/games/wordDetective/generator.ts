import { WORDS, type PictureWord } from '../../content/words';
import { getLevel } from '../../engine/tracks';
import type { Rng } from '../feedMonster/generator';

export const WORD_TRACKS = ['cvc', 'digraphs', 'blends', 'silentE', 'vowelTeams'] as const;
export type WordTrack = (typeof WORD_TRACKS)[number];

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
function pickWord(track: WordTrack, rng: Rng, avoid?: string): PictureWord {
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

export type WordItem = ReadItem | BuildItem;

/** Read it: written word → pick the picture. Near levels use pictures from the same pattern. */
export function makeReadItem(track: WordTrack, level: number, rng: Rng = Math.random, ease = false, avoid?: string): ReadItem {
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
export function makeBuildItem(track: WordTrack, level: number, rng: Rng = Math.random, ease = false, avoid?: string): BuildItem {
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

/** Rounds alternate: read, build, read, build… */
export function makeWordItem(track: WordTrack, level: number, index: number, rng: Rng = Math.random, ease = false, avoid?: string): WordItem {
  return index % 2 === 0 ? makeReadItem(track, level, rng, ease, avoid) : makeBuildItem(track, level, rng, ease, avoid);
}

/** Which slots are wrong (indices). Empty array = correct. */
export function wrongSlots(item: BuildItem, placed: (string | null)[]): number[] {
  return item.slots.map((s, i) => (placed[i] === s ? -1 : i)).filter((i) => i >= 0);
}
