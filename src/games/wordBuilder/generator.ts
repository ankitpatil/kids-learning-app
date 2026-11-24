import { ENDING_VERBS, ENDING_NOUNS, ENDING_FRAMES, type Ending } from '../../content/endings';
import { getLevel } from '../../engine/tracks';
import { pickIcon } from '../../content/pictureVariants';
import type { Rng } from '../feedMonster/generator';
import type { WhyContext } from '../../ai/whyHint';

export interface EndingItem {
  id: string;
  base: string;
  ending: Ending;
  /** The finished word (base + ending). */
  word: string;
  before: string;
  after: string;
  icon: string;
  /** Picture count: 2 for plurals ("two cats"), else 1. */
  iconCount: number;
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

/**
 * Read a logged id (`ending-jumped-Yesterday, I {}.`) back into its word and sentence (#25c spaced
 * review). The frame says which ending and whether -s is a plural; the base must be a known word
 * of that kind. Undefined for anything else.
 */
export function parseEndingId(itemId: string): { base: string; ending: Ending; plural: boolean; frame: string } | undefined {
  const m = /^ending-([a-z]+)-(.*\{\}.*)$/.exec(itemId);
  if (!m) return undefined;
  const [, word, frame] = m;
  const kind = (Object.keys(ENDING_FRAMES) as (keyof typeof ENDING_FRAMES)[]).find((k) => ENDING_FRAMES[k].includes(frame));
  if (!kind) return undefined;
  const ending: Ending = kind === 'plural' || kind === 'verbS' ? 's' : kind;
  if (!word.endsWith(ending)) return undefined;
  const base = word.slice(0, -ending.length);
  const plural = kind === 'plural';
  if (!(plural ? ENDING_NOUNS : ENDING_VERBS).some((w) => w.base === base)) return undefined;
  return { base, ending, plural, frame };
}

/**
 * One item. `want` (#25c): an item id to ask again — same word and sentence, this level's tiles and
 * read-aloud; ignored if it doesn't parse or its ending isn't in play at this level.
 */
export function makeEndingItem(level: number, rng: Rng = Math.random, ease = false, avoid?: string, want?: string): EndingItem {
  const cfg = getLevel('endings', level);
  const endings = endingsAt(level);
  const parsed = want ? parseEndingId(want) : undefined;
  const wanted = parsed && endings.includes(parsed.ending) ? parsed : undefined;
  let item: EndingItem;
  do {
    const ending = wanted ? wanted.ending : pick(endings, rng);
    // -s is a plural noun half the time, otherwise a verb ("Sam jumps").
    const plural = wanted ? wanted.plural : ending === 's' && rng() < 0.5;
    const src = wanted
      ? (plural ? ENDING_NOUNS : ENDING_VERBS).find((w) => w.base === wanted.base)!
      : plural ? pick(ENDING_NOUNS, rng) : pick(ENDING_VERBS, rng);
    const frame = wanted ? wanted.frame : pick(ENDING_FRAMES[plural ? 'plural' : ending === 's' ? 'verbS' : ending], rng);
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
      icon: pickIcon(src.icon, rng),
      iconCount: plural ? 2 : 1,
      choices,
      readAloud: cfg.scaffold || ease,
    };
  } while (!wanted && item.word === avoid);
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

/**
 * AI3c "Why?" helper: the answer is the ending (s / ed / ing). The hint must not name it, spell
 * it, or say the finished word ("jumping"); it can point at the time clue or the picture.
 */
export function endingWhyContext(item: EndingItem, level: number, picked?: string): WhyContext {
  return {
    subject: 'reading',
    track: 'endings',
    level,
    question: `Pick the ending (s, ed or ing) for "${item.base}": ${sentenceWith(item, `${item.base}___`)}`,
    answer: item.ending,
    picked,
    hide: [item.word],
  };
}
