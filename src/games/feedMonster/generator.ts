import { COUNT_MAX_BY_LEVEL } from '../../engine/skills';

export interface CountItem {
  id: string;
  target: number;
  /** Cookies available on the plate (always more than target). */
  supply: number;
}

export type Rng = () => number;

/** Generate a counting item for a level. `ease` picks from the lower half of the range. */
export function makeCountItem(level: number, rng: Rng = Math.random, ease = false, avoid?: number, want?: number): CountItem {
  const lvl = Math.max(0, Math.min(level, COUNT_MAX_BY_LEVEL.length - 1));
  const max = COUNT_MAX_BY_LEVEL[lvl];
  const min = lvl === 0 ? 1 : Math.floor(COUNT_MAX_BY_LEVEL[lvl - 1] / 2) + 1;
  const hi = ease ? Math.max(min, Math.ceil((min + max) / 2)) : max;
  let target = min + Math.floor(rng() * (hi - min + 1));
  if (target === avoid && hi > min) target = target === hi ? target - 1 : target + 1;
  if (want !== undefined) target = want; // #25b spaced review: the number missed before
  const supply = Math.min(target + 2 + Math.floor(rng() * 3), Math.max(target + 2, max + 2));
  return { id: `count-${target}`, target, supply };
}

/** Check a submission; also classify the mistake for a gentle hint. */
export function checkCount(item: CountItem, fed: number): 'correct' | 'too-few' | 'too-many' {
  if (fed === item.target) return 'correct';
  return fed < item.target ? 'too-few' : 'too-many';
}

// ---- Generalised items: counting and missing-number ("I have 3, feed me up to 8") ----
import { getLevel } from '../../engine/tracks';
import { numberChoices } from '../../engine/quickItems';

export interface FeedItem {
  id: string;
  trackId: 'count' | 'missing';
  /** Cookies already in the belly (can't be taken back). */
  have: number;
  /** Total the monster wants. */
  total: number;
  /** What the child must add: total − have. */
  need: number;
  /** Cookies on the plate (feed mode). */
  supply: number;
  /** feed = drag/tap cookies (concrete/pictorial); choose = pick the number (abstract). */
  mode: 'feed' | 'choose';
  /** Show the belly as ten-frames (pictorial). */
  frames: boolean;
  choices: number[];
}

export const FEED_TRACKS = ['count', 'missing'] as const;

function int(rng: Rng, lo: number, hi: number) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

// ---- Spaced review (#25b): read a logged item id back into the item to ask again ----
export type FeedWant =
  | { trackId: 'count'; target: number }
  | { trackId: 'missing'; have: number; need: number }
  | { trackId: 'placeValue'; n: number }
  | { trackId: 'compare2d'; small: number; big: number; ask: 'more' | 'fewer' };

/** `count-7`, `missing-3+5`, `pv-34`, `cmp-29-31-more` → the item's numbers; undefined if not valid. */
export function parseFeedId(itemId: string): FeedWant | undefined {
  let m = /^count-(\d+)$/.exec(itemId);
  if (m) return +m[1] >= 1 && +m[1] <= 20 ? { trackId: 'count', target: +m[1] } : undefined;
  m = /^missing-(\d+)\+(\d+)$/.exec(itemId);
  if (m) return +m[1] >= 1 && +m[2] >= 1 && +m[1] + +m[2] <= 20 ? { trackId: 'missing', have: +m[1], need: +m[2] } : undefined;
  m = /^pv-(\d+)$/.exec(itemId);
  if (m) return +m[1] >= 10 && +m[1] <= 99 ? { trackId: 'placeValue', n: +m[1] } : undefined;
  m = /^cmp-(\d+)-(\d+)-(more|fewer)$/.exec(itemId);
  if (m) {
    const [small, big] = [+m[1], +m[2]];
    return small >= 10 && big <= 99 && small < big ? { trackId: 'compare2d', small, big, ask: m[3] as 'more' | 'fewer' } : undefined;
  }
  return undefined;
}

export function makeFeedItem(trackId: 'count' | 'missing', level: number, rng: Rng = Math.random, ease = false, avoid?: number, want?: string): FeedItem {
  const w = want ? parseFeedId(want) : undefined;
  if (trackId === 'count') {
    const c = makeCountItem(level, rng, ease, avoid, w?.trackId === 'count' ? w.target : undefined);
    return { id: c.id, trackId, have: 0, total: c.target, need: c.target, supply: c.supply, mode: 'feed', frames: false, choices: [] };
  }
  const cfg = getLevel('missing', level);
  // Within 20: totals 11–20 so the child works across the ten. Within 10: totals 3–10.
  let total = cfg.range === 20 ? int(rng, 11, 20) : int(rng, 3, 10);
  let need = ease ? int(rng, 1, Math.min(3, total - 1)) : int(rng, 1, total - 1);
  if (need === avoid && total > 2) need = need === total - 1 ? need - 1 : need + 1;
  if (w?.trackId === 'missing') {
    total = w.have + w.need;
    need = w.need;
  }
  // A spaced fact past this level's range (missed in Pop at a higher level) still gets fair choices.
  const r = Math.max(cfg.range, total > 10 ? 20 : 10);
  const have = total - need;
  const mode = cfg.representation === 'abstract' && !ease ? 'choose' : 'feed';
  return {
    id: `missing-${have}+${need}`,
    trackId,
    have,
    total,
    need,
    supply: need + 2 + int(rng, 0, 2),
    mode,
    frames: true,
    choices: mode === 'choose' ? numberChoices(need, r, cfg.distractors === 'near', rng).map(Number) : [],
  };
}

export function checkFeed(item: { need: number }, given: number): 'correct' | 'too-few' | 'too-many' {
  if (given === item.need) return 'correct';
  return given < item.need ? 'too-few' : 'too-many';
}

// ---- Tens & ones (#15a): boxes of 10 + loose cookies, numbers to 100 ----
export interface PlaceValueItem extends Omit<FeedItem, 'trackId'> {
  trackId: 'placeValue';
  tens: number;
  ones: number;
  /** Boxes of 10 on the plate (feed mode). `supply` is the loose cookies. */
  boxSupply: number;
  /** Show the number split into a tens digit (📦) and a ones digit (🍪). */
  split: boolean;
}

export type AnyFeedItem = FeedItem | PlaceValueItem;

export function isPlaceValue(it: AnyFeedItem): it is PlaceValueItem {
  return it.trackId === 'placeValue';
}

/**
 * Level 0: 10–49, feed boxes + cookies, digits split as a guide. Level 1: 10–99, no guide.
 * Level 2: "3 tens and 4 ones" → pick the number (near choices: swapped digits, ±10, ±1).
 * Easing: tens ≤ 3, feed mode, guide on. Loose cookies never exceed 9, so the only way to make
 * the number is the place-value way (no 2 boxes + 14 cookies).
 */
export function makePlaceValueItem(level: number, rng: Rng = Math.random, ease = false, avoid?: number, want?: string): PlaceValueItem {
  const cfg = getLevel('placeValue', level);
  const maxTens = ease ? 3 : Math.min(9, Math.floor((cfg.range - 1) / 10));
  let tens = int(rng, 1, maxTens);
  let ones = int(rng, 0, 9);
  if (tens * 10 + ones === avoid) ones = ones === 9 ? 8 : ones + 1;
  const w = want ? parseFeedId(want) : undefined;
  if (w?.trackId === 'placeValue') {
    tens = Math.floor(w.n / 10);
    ones = w.n % 10;
  }
  const n = tens * 10 + ones;
  const mode = cfg.representation === 'abstract' && !ease ? 'choose' : 'feed';
  return {
    id: `pv-${n}`,
    trackId: 'placeValue',
    have: 0,
    total: n,
    need: n,
    tens,
    ones,
    supply: Math.min(9, ones + 2 + int(rng, 0, 2)),
    boxSupply: Math.min(9, tens + 1 + int(rng, 0, 1)),
    mode,
    frames: false,
    split: cfg.scaffold || ease,
    choices: mode === 'choose' ? placeValueChoices(tens, ones, cfg.distractors === 'near', rng) : [],
  };
}

/** Answer + 3 distractors (all 10–99). Near: digits swapped (34/43), ±10, ±1. Far: anywhere. */
export function placeValueChoices(tens: number, ones: number, near: boolean, rng: Rng = Math.random): number[] {
  const n = tens * 10 + ones;
  const set = new Set<number>([n]);
  const ok = (v: number) => v >= 10 && v <= 99;
  if (near) {
    const swapped = ones * 10 + tens;
    for (const v of [swapped, n + 10, n - 10, n + 1, n - 1]) {
      if (set.size >= 4) break;
      if (ok(v)) set.add(v);
    }
  }
  let guard = 0;
  while (set.size < 4 && guard++ < 200) {
    const v = int(rng, 10, 99);
    if (!near && Math.abs(v - n) < 5) continue;
    set.add(v);
  }
  const arr = [...set];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type PlaceValueVerdict = 'correct' | 'swapped' | 'tens' | 'ones' | 'both';

/** Classify a fed answer (boxes, loose cookies) so the hint can say which part to fix. */
export function checkPlaceValue(item: { tens: number; ones: number }, tens: number, ones: number): PlaceValueVerdict {
  if (tens === item.tens && ones === item.ones) return 'correct';
  if (item.tens !== item.ones && tens === item.ones && ones === item.tens) return 'swapped';
  if (tens !== item.tens && ones !== item.ones) return 'both';
  return tens !== item.tens ? 'tens' : 'ones';
}
