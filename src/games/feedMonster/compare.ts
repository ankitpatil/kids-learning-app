// ---- Compare 2-digit numbers (#15b): two plates, "which has MORE / FEWER cookies?" ----
// Each plate shows a number; the tens & ones picture (boxes of 10 + loose cookies) is the hint.
import { getLevel } from '../../engine/tracks';
import { numberWord as w } from '../../engine/numberWords';
import type { FeedItem, Rng } from './generator';

export type CompareKind = 'far' | 'swap' | 'sameTens' | 'tensTrap';
export type CompareAsk = 'more' | 'fewer';

export interface CompareItem extends Omit<FeedItem, 'trackId'> {
  trackId: 'compare2d';
  /** Left and right plate numbers (always different, 10–99). */
  left: number;
  right: number;
  ask: CompareAsk;
  kind: CompareKind;
  /** Show the boxes-of-10 + cookies picture under each number. */
  picture: boolean;
}

function int(rng: Rng, lo: number, hi: number) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** Two different 2-digit numbers of the given kind, as [smaller, bigger]. */
export function comparePair(kind: CompareKind, rng: Rng = Math.random): [number, number] {
  switch (kind) {
    case 'swap': {
      // 34 / 43: two different non-zero digits.
      const a = int(rng, 1, 8);
      const b = int(rng, a + 1, 9);
      return [a * 10 + b, b * 10 + a];
    }
    case 'sameTens': {
      // 34 / 37: same boxes, look at the cookies.
      const t = int(rng, 1, 9);
      const a = int(rng, 0, 8);
      const b = int(rng, a + 1, 9);
      return [t * 10 + a, t * 10 + b];
    }
    case 'tensTrap': {
      // 29 / 31: one more box wins even with fewer loose cookies.
      const t = int(rng, 1, 8);
      const bigOnes = int(rng, 1, 9);
      const smallOnes = int(rng, 0, bigOnes - 1);
      return [t * 10 + bigOnes, (t + 1) * 10 + smallOnes];
    }
    default: {
      // Far: at least 2 tens apart, so the boxes alone tell you.
      const t1 = int(rng, 1, 7);
      const t2 = int(rng, t1 + 2, 9);
      return [t1 * 10 + int(rng, 0, 9), t2 * 10 + int(rng, 0, 9)];
    }
  }
}

const NEAR_KINDS: CompareKind[] = ['swap', 'sameTens', 'tensTrap'];

/**
 * Level 0: far apart (different tens), picture shown. Level 1: close numbers and swapped digits,
 * picture shown. Level 2: close numbers, numbers only (picture appears after a miss).
 * Easing: a far pair with the picture, asking "more".
 */
export function makeCompareItem(level: number, rng: Rng = Math.random, ease = false, avoid?: number): CompareItem {
  const cfg = getLevel('compare2d', level);
  const kind: CompareKind = ease || cfg.distractors === 'far' ? 'far' : NEAR_KINDS[int(rng, 0, NEAR_KINDS.length - 1)];
  let [small, big] = comparePair(kind, rng);
  const ask: CompareAsk = ease ? 'more' : rng() < 0.5 ? 'more' : 'fewer';
  let answer = ask === 'more' ? big : small;
  if (answer === avoid) {
    [small, big] = comparePair(kind, rng);
    answer = ask === 'more' ? big : small;
  }
  const flip = rng() < 0.5;
  const left = flip ? big : small;
  const right = flip ? small : big;
  return {
    id: `cmp-${small}-${big}-${ask}`,
    trackId: 'compare2d',
    have: 0,
    total: answer,
    need: answer,
    supply: 0,
    mode: 'choose',
    frames: false,
    choices: [left, right],
    left,
    right,
    ask,
    kind,
    picture: cfg.scaffold || ease,
  };
}

export function compareAnswer(it: Pick<CompareItem, 'left' | 'right' | 'ask'>): number {
  return it.ask === 'more' ? Math.max(it.left, it.right) : Math.min(it.left, it.right);
}

export function comparePrompt(it: CompareItem): string {
  return it.ask === 'more'
    ? `I'm so hungry! | Which plate has more cookies? | ${w(it.left)}, | or ${w(it.right)}?`
    : `I'm nearly full. | Which plate has fewer cookies? | ${w(it.left)}, | or ${w(it.right)}?`;
}

/** Tens first, then ones — the place-value way to compare. */
export function compareReason(it: Pick<CompareItem, 'left' | 'right' | 'ask'>): string {
  const big = Math.max(it.left, it.right);
  const small = Math.min(it.left, it.right);
  const [bt, bo, st, so] = [Math.floor(big / 10), big % 10, Math.floor(small / 10), small % 10];
  const box = (n: number) => `${w(n)} box${n === 1 ? '' : 'es'}`;
  const cookie = (n: number) => `${w(n)} cookie${n === 1 ? '' : 's'}`;
  const why =
    bt !== st
      ? `Look at the boxes first. ${w(big)} has ${box(bt)}, ${w(small)} has ${box(st)}.`
      : `Both have ${box(bt)}. So look at the cookies: ${w(big)} has ${cookie(bo)}, ${w(small)} has ${cookie(so)}.`;
  const verdict = it.ask === 'more' ? `${w(big)} is more than ${w(small)}.` : `${w(small)} is less than ${w(big)}.`;
  return `${why} So ${verdict}`;
}

/** Spoken after a wrong pick. */
export function compareHint(it: CompareItem): string {
  return `Hmm, let's check. | ${compareReason(it)} | Try again!`;
}

/** Spoken after a right pick. */
export function comparePraise(it: CompareItem): string {
  const big = Math.max(it.left, it.right);
  const small = Math.min(it.left, it.right);
  return it.ask === 'more' ? `Yes! ${w(big)} is more than ${w(small)}!` : `Yes! ${w(small)} is less than ${w(big)}!`;
}
