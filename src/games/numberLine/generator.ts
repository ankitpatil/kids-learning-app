// Number Line Hop: a frog hops along a number line to add (right) or subtract (left).
// CPA levels per track:
//   add10 / sub10 pictorial  → 'hop'    : line visible, child taps hop-by-hop and counts the hops
//   add20 / sub20 pictorial  → 'make10' : two steps — hops to 10 first, then the rest (8 + 5 = 8 + 2 + 3)
//   any abstract level       → 'choose' : equation only, pick the answer (line comes back as a hint)
import { getLevel } from '../../engine/tracks';
import { numberChoices } from '../../engine/quickItems';

export type Rng = () => number;
export const HOP_TRACKS = ['add10', 'sub10', 'add20', 'sub20'] as const;
export type HopTrack = (typeof HOP_TRACKS)[number];
export type HopMode = 'hop' | 'make10' | 'choose';

export interface HopItem {
  id: string;
  trackId: HopTrack;
  op: '+' | '-';
  a: number;
  b: number;
  answer: number;
  /** Highest number drawn on the line (10 or 20). */
  lineMax: number;
  mode: HopMode;
  /** make10 only: hops from `a` to 10, then the rest (toTen + rest = b). */
  toTen: number;
  rest: number;
  /** Choices for the toTen step (make10). */
  splitChoices: number[];
  /** Choices for the answer (make10 land step, choose mode). */
  choices: number[];
}

export const isHopTrack = (id: string): id is HopTrack => (HOP_TRACKS as readonly string[]).includes(id);

function int(rng: Rng, lo: number, hi: number) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** Four distinct small choices in 1..9 including the answer; near = neighbours of the answer. */
export function smallChoices(answer: number, rng: Rng): number[] {
  const set = new Set<number>([answer]);
  for (const o of [1, -1, 2, -2, 3]) {
    if (set.size >= 4) break;
    const v = answer + o;
    if (v >= 1 && v <= 9) set.add(v);
  }
  while (set.size < 4) set.add(int(rng, 1, 9));
  const arr = [...set];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Pick a, b for a track/mode. Make-10 items always cross ten; within-10 keeps parts ≥ 1. */
function pickNumbers(trackId: HopTrack, range: number, mode: HopMode, rng: Rng, ease: boolean): { a: number; b: number } {
  const sub = trackId.startsWith('sub');
  if (ease) {
    // Easing: short hops (1–3) on the same line.
    const b = int(rng, 1, 3);
    const a = sub ? int(rng, b + 1, range) : int(rng, 1, range - b);
    return { a, b };
  }
  if (range <= 10) {
    if (sub) {
      const a = int(rng, 2, range);
      return { a, b: int(rng, 1, a - 1) };
    }
    const a = int(rng, 1, range - 1);
    return { a, b: int(rng, 1, range - a) };
  }
  if (mode === 'make10') {
    if (sub) {
      // 11..18 take away something that crosses back past 10 (13 − 5 = 13 − 3 − 2).
      const a = int(rng, 11, 18);
      return { a, b: int(rng, a - 9, 9) };
    }
    const a = int(rng, 5, 9);
    return { a, b: int(rng, 11 - a, 9) };
  }
  // Abstract within 20: answers/starts in 11..20, a mix of crossing and not crossing ten.
  if (sub) {
    const a = int(rng, 11, 20);
    return { a, b: int(rng, 1, Math.min(9, a - 1)) };
  }
  const total = int(rng, 11, 20);
  const b = int(rng, 1, Math.min(9, total - 1));
  return { a: total - b, b };
}

export function hopMode(trackId: HopTrack, level: number, ease = false): HopMode {
  if (ease) return 'hop';
  const cfg = getLevel(trackId, level);
  if (cfg.representation === 'abstract') return 'choose';
  return cfg.range > 10 ? 'make10' : 'hop';
}

export function makeHopItem(trackId: HopTrack, level: number, rng: Rng = Math.random, ease = false, avoid?: string): HopItem {
  const cfg = getLevel(trackId, level);
  const mode = hopMode(trackId, level, ease);
  const op = trackId.startsWith('sub') ? '-' : '+';
  let { a, b } = pickNumbers(trackId, cfg.range, mode, rng, ease);
  const key = (x: number, y: number) => `${trackId}-${x}${op}${y}`;
  for (let i = 0; i < 5 && key(a, b) === avoid; i++) ({ a, b } = pickNumbers(trackId, cfg.range, mode, rng, ease));
  const answer = op === '+' ? a + b : a - b;
  const toTen = mode === 'make10' ? Math.abs(10 - a) : 0;
  const near = cfg.distractors === 'near';
  const lineMax = Math.max(a, answer) > 10 || cfg.range > 10 ? 20 : 10;
  return {
    id: key(a, b),
    trackId,
    op,
    a,
    b,
    answer,
    lineMax,
    mode,
    toTen,
    rest: mode === 'make10' ? b - toTen : 0,
    splitChoices: mode === 'make10' ? smallChoices(toTen, rng) : [],
    choices: mode === 'hop' ? [] : numberChoices(answer, lineMax, near, rng).map(Number),
  };
}

/** Check a hop-mode submission by the number of hops taken. */
export function checkHops(item: HopItem, hops: number): 'correct' | 'too-few' | 'too-many' {
  if (hops === item.b) return 'correct';
  return hops < item.b ? 'too-few' : 'too-many';
}

/** Where the frog is after `hops` hops from the start. */
export function frogAt(item: HopItem, hops: number): number {
  return item.op === '+' ? item.a + hops : item.a - hops;
}

/** Most hops the hop button allows: stays on the line, with room for a couple of extra (to allow mistakes). */
export function maxHops(item: HopItem): number {
  return item.op === '+' ? item.lineMax - item.a : item.a;
}

/** Equation text showing the make-10 split, e.g. "8 + 2 + 3" or "13 − 3 − 2". */
export function splitText(item: HopItem): string {
  const s = item.op === '+' ? '+' : '−';
  return `${item.a} ${s} ${item.toTen} ${s} ${item.rest}`;
}
