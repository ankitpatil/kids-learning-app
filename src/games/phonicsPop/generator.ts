import { CONFUSABLES, LETTERS, PHONICS_LEVEL_NEW, lettersUpTo } from './letters';
import type { Rng } from '../feedMonster/generator';
import { getLevel } from '../../engine/tracks';
import type { WhyContext } from '../../ai/whyHint';

export interface PhonicsItem {
  id: string;
  target: string;
  word: string;
  icon: string;
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
  // 'near' distractor levels (once b/d are both known) include the look-alike partner.
  if (!ease && getLevel('phonics', lvl).distractors === 'near' && partner && pool.includes(partner)) choices.add(partner);
  const rest = shuffle(pool.filter((l) => !choices.has(l)), rng);
  // In ease mode, avoid look-alikes so the choice is clearly easier.
  const filtered = ease ? rest.filter((l) => l !== partner) : rest;
  for (const l of filtered.length ? filtered : rest) {
    if (choices.size >= n) break;
    choices.add(l);
  }

  const info = LETTERS[target];
  return { id: `phonics-${target}`, target, word: info.word, icon: info.icon, choices: shuffle([...choices], rng) };
}

/**
 * AI3c "Why?" helper: the child must find the letter the picture word starts with. The hint may
 * say the picture word (it's spoken anyway) but must not name the target letter or its letter name.
 */
export function phonicsWhyContext(item: PhonicsItem, level: number, picked?: string): WhyContext {
  return {
    subject: 'reading',
    track: 'phonics',
    level,
    question: `Which letter does "${item.word}" start with? Pop that letter balloon.`,
    answer: item.target,
    picked,
  };
}
