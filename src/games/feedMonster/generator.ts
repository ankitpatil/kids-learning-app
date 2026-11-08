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
