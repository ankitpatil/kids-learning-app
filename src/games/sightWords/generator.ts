import { SIGHT_WORDS, SIGHT_CONFUSABLES, type SightWord } from '../../content/sightWords';
import { getLevel } from '../../engine/tracks';
import type { Rng } from '../feedMonster/generator';

export interface SightItem {
  id: string;
  word: string;
  example: string;
  /** Word bubbles to catch from (includes the answer). */
  choices: string[];
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Words available at a level: the level's own list, plus earlier lists for review (1 in 4). */
export function wordsFor(level: number, rng: Rng = Math.random): SightWord[] {
  const lv = Math.max(0, Math.min(level, SIGHT_WORDS.length - 1));
  if (lv > 0 && rng() < 0.25) return SIGHT_WORDS.slice(0, lv).flat();
  return SIGHT_WORDS[lv];
}

/**
 * Sight-Word Catch: hear a tricky word, catch the matching bubble.
 * Far levels: 3 bubbles from other words. Near levels: 4 bubbles led by look-alikes (was / saw).
 * Easing: 2 bubbles, far.
 */
export function makeSightItem(level: number, rng: Rng = Math.random, ease = false, avoid?: string): SightItem {
  const pool = wordsFor(level, rng).filter((w) => w.word !== avoid);
  const target = pool[Math.floor(rng() * pool.length)];
  const near = getLevel('sightWords', level).distractors === 'near' && !ease;
  const n = ease ? 2 : near ? 4 : 3;
  const decoys: string[] = [];
  const add = (w: string) => {
    if (decoys.length < n - 1 && w !== target.word && !decoys.includes(w)) decoys.push(w);
  };
  if (near) shuffle(SIGHT_CONFUSABLES[target.word] ?? [], rng).forEach(add);
  const others = SIGHT_WORDS.flat().map((w) => w.word);
  // Far decoys avoid look-alikes so the easy level stays easy.
  const avoidNear = near ? [] : SIGHT_CONFUSABLES[target.word] ?? [];
  shuffle(others, rng)
    .filter((w) => !avoidNear.includes(w))
    .forEach(add);
  return { id: `sight-${target.word}`, word: target.word, example: target.example, choices: shuffle([target.word, ...decoys], rng) };
}
