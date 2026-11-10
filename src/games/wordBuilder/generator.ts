import { ENDING_VERBS, ENDING_NOUNS, ENDING_FRAMES, type Ending } from '../../content/endings';
import { getLevel } from '../../engine/tracks';
import type { Rng } from '../feedMonster/generator';

export interface EndingItem {
  id: string;
  base: string;
  ending: Ending;
  /** The finished word (base + ending). */
  word: string;
  before: string;
  after: string;
  emoji: string;
  /** Picture count: 2 for plurals ("two cats"), else 1. */
  emojiCount: number;
  /** Ending tiles to choose from. */
  choices: Ending[];
  /** Whether the app reads the sentence aloud (scaffolded levels). */
  readAloud: boolean;
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

/** Endings in play at a level: level 1 = -s and -ing; level 2+ adds -ed. */
export function endingsAt(level: number): Ending[] {
  return getLevel('endings', level).range < 3 ? ['s', 'ing'] : ['s', 'ed', 'ing'];
}

export function makeEndingItem(level: number, rng: Rng = Math.random, ease = false, avoid?: string): EndingItem {
  const cfg = getLevel('endings', level);
  const endings = endingsAt(level);
  let item: EndingItem;
  do {
    const ending = pick(endings, rng);
    // -s is a plural noun half the time, otherwise a verb ("Sam jumps").
    const plural = ending === 's' && rng() < 0.5;
    const src = plural ? pick(ENDING_NOUNS, rng) : pick(ENDING_VERBS, rng);
    const frame = pick(ENDING_FRAMES[plural ? 'plural' : ending === 's' ? 'verbS' : ending], rng);
    const [before, after] = frame.split('{}');
    const word = src.base + ending;
    // Easing: only the right ending and one other.
    const choices = ease ? shuffle([ending, pick(endings.filter((e) => e !== ending), rng)], rng) : shuffle(endings, rng);
    item = {
      id: `ending-${word}-${frame}`,
      base: src.base,
      ending,
      word,
      before: before.trimEnd(),
      after: after.trimStart(),
      emoji: src.emoji,
      emojiCount: plural ? 2 : 1,
      choices,
      readAloud: cfg.scaffold || ease,
    };
  } while (item.word === avoid);
  return item;
}

/** The sentence with any word in the gap. */
export function sentenceWith(item: EndingItem, word: string): string {
  return `${item.before} ${word}${/^[.,!?]/.test(item.after) ? '' : ' '}${item.after}`.trim();
}

/** The sentence spoken with a blank, for the scaffolded prompt. */
export function promptSentence(item: EndingItem): string {
  return sentenceWith(item, `${item.base}, blank`);
}
