// Letter → a picture word that clearly starts with that letter's most common sound.
// Kids hear "Which letter does <word> start with?" and see the picture, so TTS never has
// to pronounce an isolated phoneme (which browser voices do badly).
export interface LetterInfo {
  letter: string;
  word: string;
  icon: string;
}

export const LETTERS: Record<string, LetterInfo> = {
  s: { letter: 's', word: 'sun', icon: 'sun' },
  a: { letter: 'a', word: 'apple', icon: 'red-apple' },
  t: { letter: 't', word: 'tiger', icon: 'tiger-face' },
  p: { letter: 'p', word: 'pig', icon: 'pig-face' },
  i: { letter: 'i', word: 'insect', icon: 'ant' },
  n: { letter: 'n', word: 'nest', icon: 'nest-with-eggs' },
  m: { letter: 'm', word: 'moon', icon: 'crescent-moon' },
  d: { letter: 'd', word: 'dog', icon: 'dog-face' },
  g: { letter: 'g', word: 'goat', icon: 'goat' },
  o: { letter: 'o', word: 'octopus', icon: 'octopus' },
  c: { letter: 'c', word: 'cat', icon: 'cat-face' },
  k: { letter: 'k', word: 'kite', icon: 'kite' },
  e: { letter: 'e', word: 'egg', icon: 'egg' },
  u: { letter: 'u', word: 'umbrella', icon: 'umbrella' },
  r: { letter: 'r', word: 'rabbit', icon: 'rabbit-face' },
  h: { letter: 'h', word: 'hat', icon: 'top-hat' },
  b: { letter: 'b', word: 'ball', icon: 'soccer-ball' },
  f: { letter: 'f', word: 'fish', icon: 'fish' },
  l: { letter: 'l', word: 'lion', icon: 'lion' },
  j: { letter: 'j', word: 'jellyfish', icon: 'jellyfish' },
  v: { letter: 'v', word: 'van', icon: 'minibus' },
  w: { letter: 'w', word: 'worm', icon: 'worm' },
  y: { letter: 'y', word: 'yo-yo', icon: 'yo-yo' },
  z: { letter: 'z', word: 'zebra', icon: 'zebra' },
  q: { letter: 'q', word: 'queen', icon: 'crown' },
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
