// Letter → a picture word that clearly starts with that letter's most common sound.
// Kids hear "Which letter does <word> start with?" and see the picture, so TTS never has
// to pronounce an isolated phoneme (which browser voices do badly).
export interface LetterInfo {
  letter: string;
  word: string;
  emoji: string;
}

export const LETTERS: Record<string, LetterInfo> = {
  s: { letter: 's', word: 'sun', emoji: '☀️' },
  a: { letter: 'a', word: 'apple', emoji: '🍎' },
  t: { letter: 't', word: 'tiger', emoji: '🐯' },
  p: { letter: 'p', word: 'pig', emoji: '🐷' },
  i: { letter: 'i', word: 'insect', emoji: '🐜' },
  n: { letter: 'n', word: 'nest', emoji: '🪺' },
  m: { letter: 'm', word: 'moon', emoji: '🌙' },
  d: { letter: 'd', word: 'dog', emoji: '🐶' },
  g: { letter: 'g', word: 'goat', emoji: '🐐' },
  o: { letter: 'o', word: 'octopus', emoji: '🐙' },
  c: { letter: 'c', word: 'cat', emoji: '🐱' },
  k: { letter: 'k', word: 'kite', emoji: '🪁' },
  e: { letter: 'e', word: 'egg', emoji: '🥚' },
  u: { letter: 'u', word: 'umbrella', emoji: '☂️' },
  r: { letter: 'r', word: 'rabbit', emoji: '🐰' },
  h: { letter: 'h', word: 'hat', emoji: '🎩' },
  b: { letter: 'b', word: 'ball', emoji: '⚽' },
  f: { letter: 'f', word: 'fish', emoji: '🐟' },
  l: { letter: 'l', word: 'lion', emoji: '🦁' },
  j: { letter: 'j', word: 'jellyfish', emoji: '🪼' },
  v: { letter: 'v', word: 'van', emoji: '🚐' },
  w: { letter: 'w', word: 'worm', emoji: '🪱' },
  y: { letter: 'y', word: 'yo-yo', emoji: '🪀' },
  z: { letter: 'z', word: 'zebra', emoji: '🦓' },
  q: { letter: 'q', word: 'queen', emoji: '👑' },
  // 'x' is left out: no common picture word starts with its /ks/ sound.
};

/** Letters introduced at each level (cumulative), in a common synthetic-phonics order. */
export const PHONICS_LEVEL_NEW: string[][] = [
  ['s', 'a', 't', 'p'],
  ['i', 'n'],
  ['m', 'd', 'g', 'o'],
  ['c', 'k', 'e', 'u', 'r'],
  ['h', 'b', 'f', 'l', 'j'],
  ['v', 'w', 'y', 'z', 'q'],
  [], // level 6: no new letters, but confusable pairs are forced together
];

export const CONFUSABLES: Record<string, string> = { b: 'd', d: 'b', p: 'q', q: 'p', m: 'n', n: 'm' };

export function lettersUpTo(level: number): string[] {
  const lvl = Math.max(0, Math.min(level, PHONICS_LEVEL_NEW.length - 1));
  return PHONICS_LEVEL_NEW.slice(0, lvl + 1).flat();
}
