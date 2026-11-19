// Word endings: base words that take -s / -ed / -ing with no spelling change (no doubling, no dropped e),
// so the child only has to choose the ending from the sentence's time clue.
export interface EndingVerb {
  base: string;
  icon: string;
}
export interface EndingNoun {
  base: string;
  icon: string;
}

export const ENDING_VERBS: EndingVerb[] = [
  { base: 'jump', icon: 'kangaroo' },
  { base: 'play', icon: 'teddy-bear' },
  { base: 'walk', icon: 'person-walking' },
  { base: 'cook', icon: 'cooking' },
  { base: 'paint', icon: 'artist-palette' },
  { base: 'climb', icon: 'person-climbing' },
  { base: 'rest', icon: 'sleeping-face' },
  { base: 'laugh', icon: 'face-with-tears-of-joy' },
  { base: 'kick', icon: 'soccer-ball' },
  { base: 'help', icon: 'handshake' },
];

export const ENDING_NOUNS: EndingNoun[] = [
  { base: 'cat', icon: 'cat-face' },
  { base: 'dog', icon: 'dog-face' },
  { base: 'duck', icon: 'duck' },
  { base: 'frog', icon: 'frog' },
  { base: 'hat', icon: 'top-hat' },
  { base: 'ship', icon: 'ship' },
  { base: 'kite', icon: 'kite' },
  { base: 'cup', icon: 'hot-beverage' },
];

export type Ending = 's' | 'ed' | 'ing';

/** Sentence frames with a time clue. `{}` is where the word goes. */
export const ENDING_FRAMES: Record<'verbS' | 'ed' | 'ing' | 'plural', string[]> = {
  verbS: ['Every day, Sam {}.', 'Mia {} every day.', 'Each morning, Leo {}.'],
  ed: ['Yesterday, I {}.', 'Last night, we {}.', 'Yesterday, Ana {}.'],
  ing: ['Look! I am {}.', 'Right now, we are {}.', 'Mia is {} now.'],
  plural: ['I see two {}.', 'There are three {}.', 'Look at all the {}!'],
};
