import { CONFUSABLES, LETTERS, PHONICS_LEVEL_NEW, lettersUpTo } from './letters';
import type { Rng } from '../feedMonster/generator';

export interface PhonicsItem {
  id: string;
  target: string;
  word: string;
  emoji: string;
  /** Shuffled balloon letters, always includes target. */
  choices: string[];
}

export const PHONICS_MAX_LEVEL = PHONICS_LEVEL_NEW.length - 1;

export function choiceCount(level: number, ease: boolean): number {
  if (ease) return 2;
  if (level <= 1) return 3;
  if (level <= 4) return 4;
  return 5;
}

function pick<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Make an item. Targets favour the newest letters of the level (~60%) so new sounds get practice,
 * while older letters stay in rotation as review.
 */
export function makePhonicsItem(level: number, rng: Rng = Math.random, ease = false, avoid?: string): PhonicsItem {
  const lvl = Math.max(0, Math.min(level, PHONICS_MAX_LEVEL));
  const pool = lettersUpTo(lvl);
  const newest = PHONICS_LEVEL_NEW[lvl].length ? PHONICS_LEVEL_NEW[lvl] : pool;

  let candidates = rng() < 0.6 ? newest : pool;
  if (avoid && candidates.length > 1) candidates = candidates.filter((l) => l !== avoid);
  // Top level drills confusable letters specifically.
  if (lvl === PHONICS_MAX_LEVEL && !ease) {
    const conf = pool.filter((l) => CONFUSABLES[l] && pool.includes(CONFUSABLES[l]) && l !== avoid);
    if (conf.length && rng() < 0.6) candidates = conf;
  }
  const target = pick(candidates, rng);

  const n = Math.min(choiceCount(lvl, ease), pool.length);
  const choices = new Set<string>([target]);
  const partner = CONFUSABLES[target];
  // From level 4 up (once b/d are both known), include the look-alike partner as a distractor.
  if (!ease && lvl >= 4 && partner && pool.includes(partner)) choices.add(partner);
  const rest = shuffle(pool.filter((l) => !choices.has(l)), rng);
  // In ease mode, avoid look-alikes so the choice is clearly easier.
  const filtered = ease ? rest.filter((l) => l !== partner) : rest;
  for (const l of filtered.length ? filtered : rest) {
    if (choices.size >= n) break;
    choices.add(l);
  }

  const info = LETTERS[target];
  return { id: `phonics-${target}`, target, word: info.word, emoji: info.emoji, choices: shuffle([...choices], rng) };
}
