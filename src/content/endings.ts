// Word endings: base words that take -s / -ed / -ing with no spelling change (no doubling, no dropped e),
// so the child only has to choose the ending from the sentence's time clue.
export interface EndingVerb {
  base: string;
  emoji: string;
}
export interface EndingNoun {
  base: string;
  emoji: string;
}

export const ENDING_VERBS: EndingVerb[] = [
  { base: 'jump', emoji: '🦘' },
  { base: 'play', emoji: '🧸' },
  { base: 'walk', emoji: '🚶' },
  { base: 'cook', emoji: '🍳' },
  { base: 'paint', emoji: '🎨' },
  { base: 'climb', emoji: '🧗' },
  { base: 'rest', emoji: '😴' },
  { base: 'laugh', emoji: '😂' },
  { base: 'kick', emoji: '⚽' },
  { base: 'help', emoji: '🤝' },
];

export const ENDING_NOUNS: EndingNoun[] = [
  { base: 'cat', emoji: '🐱' },
  { base: 'dog', emoji: '🐶' },
  { base: 'duck', emoji: '🦆' },
  { base: 'frog', emoji: '🐸' },
  { base: 'hat', emoji: '🎩' },
  { base: 'ship', emoji: '🚢' },
  { base: 'kite', emoji: '🪁' },
  { base: 'cup', emoji: '☕' },
];

export type Ending = 's' | 'ed' | 'ing';

/** Sentence frames with a time clue. `{}` is where the word goes. */
export const ENDING_FRAMES: Record<'verbS' | 'ed' | 'ing' | 'plural', string[]> = {
  verbS: ['Every day, Sam {}.', 'Mia {} every day.', 'Each morning, Leo {}.'],
  ed: ['Yesterday, I {}.', 'Last night, we {}.', 'Yesterday, Ana {}.'],
  ing: ['Look! I am {}.', 'Right now, we are {}.', 'Mia is {} now.'],
  plural: ['I see two {}.', 'There are three {}.', 'Look at all the {}!'],
};
