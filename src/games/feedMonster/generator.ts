import { COUNT_MAX_BY_LEVEL } from '../../engine/skills';

export interface CountItem {
  id: string;
  target: number;
  /** Cookies available on the plate (always more than target). */
  supply: number;
}

export type Rng = () => number;

/** Generate a counting item for a level. `ease` picks from the lower half of the range. */
export function makeCountItem(level: number, rng: Rng = Math.random, ease = false, avoid?: number): CountItem {
  const lvl = Math.max(0, Math.min(level, COUNT_MAX_BY_LEVEL.length - 1));
  const max = COUNT_MAX_BY_LEVEL[lvl];
  const min = lvl === 0 ? 1 : Math.floor(COUNT_MAX_BY_LEVEL[lvl - 1] / 2) + 1;
  const hi = ease ? Math.max(min, Math.ceil((min + max) / 2)) : max;
  let target = min + Math.floor(rng() * (hi - min + 1));
  if (target === avoid && hi > min) target = target === hi ? target - 1 : target + 1;
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

export function makeFeedItem(trackId: 'count' | 'missing', level: number, rng: Rng = Math.random, ease = false, avoid?: number): FeedItem {
  if (trackId === 'count') {
    const c = makeCountItem(level, rng, ease, avoid);
    return { id: c.id, trackId, have: 0, total: c.target, need: c.target, supply: c.supply, mode: 'feed', frames: false, choices: [] };
  }
  const cfg = getLevel('missing', level);
  const r = cfg.range;
  // Within 20: totals 11–20 so the child works across the ten. Within 10: totals 3–10.
  const total = r === 20 ? int(rng, 11, 20) : int(rng, 3, 10);
  let need = ease ? int(rng, 1, Math.min(3, total - 1)) : int(rng, 1, total - 1);
  if (need === avoid && total > 2) need = need === total - 1 ? need - 1 : need + 1;
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

export function checkFeed(item: FeedItem, given: number): 'correct' | 'too-few' | 'too-many' {
  if (given === item.need) return 'correct';
  return given < item.need ? 'too-few' : 'too-many';
}
