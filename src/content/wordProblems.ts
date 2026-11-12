// Word-problem content (backlog #20): people, things and story frames as data.
// Indian and US names are mixed; things lean Indian (mangoes, rotis, laddoos are not in emoji,
// so we keep to things with a clear picture).

export interface Person {
  name: string;
  /** Subject / object pronouns. */
  he: 'he' | 'she';
  him: 'him' | 'her';
  region: 'in' | 'us';
}

const P = (name: string, g: 'm' | 'f', region: 'in' | 'us'): Person => ({ name, he: g === 'm' ? 'he' : 'she', him: g === 'm' ? 'him' : 'her', region });

export const PEOPLE: Person[] = [
  P('Riya', 'f', 'in'), P('Aarav', 'm', 'in'), P('Priya', 'f', 'in'), P('Kabir', 'm', 'in'),
  P('Anaya', 'f', 'in'), P('Arjun', 'm', 'in'), P('Meera', 'f', 'in'), P('Ishaan', 'm', 'in'),
  P('Emma', 'f', 'us'), P('Liam', 'm', 'us'), P('Mia', 'f', 'us'), P('Noah', 'm', 'us'),
  P('Ava', 'f', 'us'), P('Leo', 'm', 'us'),
];

/** How a thing can leave in a take-away story. */
export type Leave = 'eat' | 'fly' | 'give';

export interface Thing {
  one: string;
  many: string;
  emoji: string;
  leave: Leave;
  /** Things that come by themselves (birds) rather than being given. */
  comes?: boolean;
}

export const THINGS: Thing[] = [
  { one: 'mango', many: 'mangoes', emoji: '🥭', leave: 'eat' },
  { one: 'apple', many: 'apples', emoji: '🍎', leave: 'eat' },
  { one: 'banana', many: 'bananas', emoji: '🍌', leave: 'eat' },
  { one: 'roti', many: 'rotis', emoji: '🫓', leave: 'eat' },
  { one: 'cookie', many: 'cookies', emoji: '🍪', leave: 'eat' },
  { one: 'sweet', many: 'sweets', emoji: '🍬', leave: 'eat' },
  { one: 'kite', many: 'kites', emoji: '🪁', leave: 'give' },
  { one: 'ball', many: 'balls', emoji: '⚽', leave: 'give' },
  { one: 'pencil', many: 'pencils', emoji: '✏️', leave: 'give' },
  { one: 'book', many: 'books', emoji: '📘', leave: 'give' },
  { one: 'shell', many: 'shells', emoji: '🐚', leave: 'give' },
  { one: 'flower', many: 'flowers', emoji: '🌸', leave: 'give' },
  { one: 'balloon', many: 'balloons', emoji: '🎈', leave: 'fly' },
  { one: 'bird', many: 'birds', emoji: '🐦', leave: 'fly', comes: true },
  { one: 'butterfly', many: 'butterflies', emoji: '🦋', leave: 'fly', comes: true },
];

export const noun = (t: Thing, n: number) => (n === 1 ? t.one : t.many);
