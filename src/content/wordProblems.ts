// Word-problem content (backlog #20, grown in C2): people, things, settings and story frames as data.
// Indian and US names are mixed, and things lean towards Indian everyday life where there is a
// clear picture (mangoes, rotis, diyas, momos, monkeys in the tree, parrots, peacocks).
//
// Story frames are small templates filled in by `fillFrame` (games/wordProblems/generator.ts):
//   {P} {O}        the child in the story / the other person
//   {he} {He}      subject pronoun (He = capitalised), {him} object pronoun, {his} {His} possessive
//   {a} {b}        the two numbers (digits on screen, number words in speech)
//   {A} {B}        number + noun with singular / plural ("1 mango", "3 mangoes")
//   {bn}           the noun for b alone ("1 more bird")
//   {many}         the plural noun, {place} where "coming" things are (in a tree)
//   {a?x|y} {b?x|y} x when that number is 1, else y (verb agreement: "1 bird comes", "2 birds come")

export interface Person {
  name: string;
  /** Subject / object pronouns. */
  he: 'he' | 'she';
  him: 'him' | 'her';
  region: 'in' | 'us';
}

const P = (name: string, g: 'm' | 'f', region: 'in' | 'us'): Person => ({ name, he: g === 'm' ? 'he' : 'she', him: g === 'm' ? 'him' : 'her', region });

export const PEOPLE: Person[] = [
  // India
  P('Riya', 'f', 'in'), P('Aarav', 'm', 'in'), P('Priya', 'f', 'in'), P('Kabir', 'm', 'in'),
  P('Anaya', 'f', 'in'), P('Arjun', 'm', 'in'), P('Meera', 'f', 'in'), P('Ishaan', 'm', 'in'),
  P('Diya', 'f', 'in'), P('Vivaan', 'm', 'in'), P('Saanvi', 'f', 'in'), P('Rohan', 'm', 'in'),
  P('Kavya', 'f', 'in'), P('Aditya', 'm', 'in'), P('Tara', 'f', 'in'), P('Dev', 'm', 'in'),
  P('Myra', 'f', 'in'), P('Reyansh', 'm', 'in'), P('Nisha', 'f', 'in'), P('Krish', 'm', 'in'),
  P('Zara', 'f', 'in'), P('Farhan', 'm', 'in'), P('Simran', 'f', 'in'), P('Harpreet', 'm', 'in'),
  // US
  P('Emma', 'f', 'us'), P('Liam', 'm', 'us'), P('Mia', 'f', 'us'), P('Noah', 'm', 'us'),
  P('Ava', 'f', 'us'), P('Leo', 'm', 'us'), P('Sofia', 'f', 'us'), P('Jack', 'm', 'us'),
  P('Lily', 'f', 'us'), P('Ben', 'm', 'us'), P('Chloe', 'f', 'us'), P('Max', 'm', 'us'),
  P('Grace', 'f', 'us'), P('Sam', 'm', 'us'), P('Ella', 'f', 'us'), P('Owen', 'm', 'us'),
  P('Maya', 'f', 'us'), P('Lucas', 'm', 'us'), P('Ruby', 'f', 'us'), P('Eli', 'm', 'us'),
];

/**
 * How a thing can leave in a take-away story: eaten, given away, a balloon that floats off or pops,
 * a ball that rolls away, or an animal that flies / swims / hops / runs away.
 */
export type Leave = 'eat' | 'give' | 'roll' | 'balloon' | 'fly' | 'swim' | 'hop' | 'run';

/** What kind of thing it is (decides which settings fit). */
export type Category = 'food' | 'toy' | 'school' | 'nature' | 'festival';

export interface Thing {
  one: string;
  many: string;
  emoji: string;
  leave: Leave;
  category?: Category;
  /** Animals that come by themselves (birds) rather than being given; `place` is where they are. */
  comes?: boolean;
  place?: string;
}

const T = (one: string, many: string, emoji: string, leave: Leave, category: Category): Thing => ({ one, many, emoji, leave, category });
const A = (one: string, many: string, emoji: string, leave: Leave, place: string): Thing => ({ one, many, emoji, leave, comes: true, place });

export const THINGS: Thing[] = [
  // food
  T('mango', 'mangoes', '🥭', 'eat', 'food'), T('apple', 'apples', '🍎', 'eat', 'food'),
  T('banana', 'bananas', '🍌', 'eat', 'food'), T('roti', 'rotis', '🫓', 'eat', 'food'),
  T('cookie', 'cookies', '🍪', 'eat', 'food'), T('sweet', 'sweets', '🍬', 'eat', 'food'),
  T('orange', 'oranges', '🍊', 'eat', 'food'), T('strawberry', 'strawberries', '🍓', 'eat', 'food'),
  T('carrot', 'carrots', '🥕', 'eat', 'food'), T('momo', 'momos', '🥟', 'eat', 'food'),
  T('cupcake', 'cupcakes', '🧁', 'eat', 'food'), T('donut', 'donuts', '🍩', 'eat', 'food'),
  T('lollipop', 'lollipops', '🍭', 'eat', 'food'), T('coconut', 'coconuts', '🥥', 'give', 'food'),
  T('tomato', 'tomatoes', '🍅', 'eat', 'food'), T('egg', 'eggs', '🥚', 'eat', 'food'),
  T('cherry', 'cherries', '🍒', 'eat', 'food'), T('pear', 'pears', '🍐', 'eat', 'food'),
  // toys and games
  T('kite', 'kites', '🪁', 'give', 'toy'), T('ball', 'balls', '⚽', 'roll', 'toy'),
  T('teddy', 'teddies', '🧸', 'give', 'toy'), T('toy car', 'toy cars', '🚗', 'roll', 'toy'),
  T('yo-yo', 'yo-yos', '🪀', 'give', 'toy'), T('block', 'blocks', '🧱', 'give', 'toy'),
  T('cricket ball', 'cricket balls', '🏏', 'roll', 'toy'), T('drum', 'drums', '🥁', 'give', 'toy'),
  T('balloon', 'balloons', '🎈', 'balloon', 'toy'),
  // school
  T('pencil', 'pencils', '✏️', 'give', 'school'), T('book', 'books', '📘', 'give', 'school'),
  T('crayon', 'crayons', '🖍️', 'give', 'school'), T('notebook', 'notebooks', '📒', 'give', 'school'),
  T('ruler', 'rulers', '📏', 'give', 'school'), T('pen', 'pens', '🖊️', 'give', 'school'),
  T('sticker', 'stickers', '⭐', 'give', 'school'),
  // nature
  T('shell', 'shells', '🐚', 'give', 'nature'), T('flower', 'flowers', '🌸', 'give', 'nature'),
  T('leaf', 'leaves', '🍃', 'give', 'nature'), T('stone', 'stones', '🪨', 'give', 'nature'),
  T('feather', 'feathers', '🪶', 'give', 'nature'),
  // festivals
  T('diya', 'diyas', '🪔', 'give', 'festival'), T('gift', 'gifts', '🎁', 'give', 'festival'),
  T('candle', 'candles', '🕯️', 'give', 'festival'), T('lantern', 'lanterns', '🏮', 'give', 'festival'),
  T('pumpkin', 'pumpkins', '🎃', 'give', 'festival'),
  // animals that come and go by themselves
  A('bird', 'birds', '🐦', 'fly', 'in a tree'), A('butterfly', 'butterflies', '🦋', 'fly', 'in the garden'),
  A('parrot', 'parrots', '🦜', 'fly', 'in a tree'), A('peacock', 'peacocks', '🦚', 'run', 'in the garden'),
  A('duck', 'ducks', '🦆', 'swim', 'in the pond'), A('fish', 'fish', '🐟', 'swim', 'in the pond'),
  A('frog', 'frogs', '🐸', 'hop', 'on a log'), A('monkey', 'monkeys', '🐒', 'run', 'in a tree'),
  A('ant', 'ants', '🐜', 'run', 'on the path'), A('bee', 'bees', '🐝', 'fly', 'in the garden'),
];

/** An opening that sets the scene ("At the market, Riya has 5 mangoes."). */
export interface Setting {
  at: string;
  fits: Category[];
}

export const SETTINGS: Setting[] = [
  { at: 'At the market', fits: ['food'] },
  { at: 'At the mela', fits: ['food', 'toy'] },
  { at: 'At school', fits: ['school', 'food'] },
  { at: 'At the beach', fits: ['nature', 'toy'] },
  { at: 'In the park', fits: ['nature', 'toy'] },
  { at: 'At home', fits: ['food', 'toy', 'school'] },
  { at: "At Grandma's house", fits: ['food', 'toy'] },
  { at: 'At the party', fits: ['food', 'toy', 'festival'] },
  { at: 'On Diwali', fits: ['festival', 'food'] },
  { at: 'In the garden', fits: ['nature', 'food'] },
  { at: 'On the train', fits: ['food', 'toy', 'school'] },
];

export const settingsFor = (t: Thing) => (t.comes || !t.category ? [] : SETTINGS.filter((s) => s.fits.includes(t.category!)));

// ---- Story frames ----
// First entry of each list is the classic wording (kept stable: tests and earlier rounds use it).

/** Opening line for "has" stories (a setting can go in front). */
export const START = ['{P} has {A}.', '{P} has {A} in a bag.', '{P} has {A} in a box.'];
/** Opening line for animals that come by themselves. */
export const START_COMES = ['{P} sees {A} {place}.', 'There {a?is|are} {A} {place}.', '{P} counts {A} {place}.'];

export const ADD_TO = [
  '{He} gets {b} more.',
  '{O} gives {him} {b} more.',
  '{He} finds {b} more.',
  '{His} mum gives {him} {b} more.',
  '{His} dad gives {him} {b} more.',
  'Grandma gives {him} {b} more.',
  '{He} gets {b} more from {O}.',
  '{His} teacher gives {him} {b} more.',
  '{O} brings {him} {b} more.',
];
export const ADD_TO_COMES = ['{b} more {bn} {b?comes|come}.', '{b} more {bn} {b?joins|join} them.', 'Then {b} more {bn} {b?comes|come}.'];
export const ADD_TO_Q = ['How many {many} does {P} have now?', 'How many {many} does {P} have in all?'];
export const ADD_TO_COMES_Q = ['How many {many} are there now?', 'How many {many} are there in all?'];

export const TAKE_FROM: Record<Leave, string[]> = {
  eat: ['{He} eats {b}.', '{He} and {O} eat {b}.', '{O} eats {b}.', '{He} gives {b} to {O}.'],
  give: ['{He} gives {b} to {O}.', '{He} loses {b}.', '{He} gives {b} to {his} friend.', '{O} takes {b} home.'],
  roll: ['{B} {b?rolls|roll} away.', '{He} gives {b} to {O}.', '{He} loses {b}.'],
  balloon: ['{B} {b?flies|fly} away.', '{B} {b?pops|pop}.', '{He} gives {b} to {O}.'],
  fly: ['{B} {b?flies|fly} away.', 'Then {b} {b?flies|fly} off.'],
  swim: ['{B} {b?swims|swim} away.', 'Then {b} {b?swims|swim} off.'],
  hop: ['{B} {b?hops|hop} away.', 'Then {b} {b?hops|hop} off.'],
  run: ['{B} {b?runs|run} away.', 'Then {b} {b?runs|run} off.'],
};
/** Take-away question: animals and lost / eaten things are "left"; given things are "had". */
export const TAKE_FROM_Q = ['How many {many} are left?', 'How many {many} are there now?'];
export const TAKE_FROM_HAVE_Q = ['How many {many} does {P} have now?', 'How many {many} does {P} have left?'];

/** Put together: two people's things. [first line, second line]. */
export const PUT_TOGETHER: [string, string][] = [
  ['{P} has {A}.', '{O} has {B}.'],
  ['{P} has {A}.', '{O} brings {B}.'],
  ['{P} finds {A}.', '{O} finds {B}.'],
];
export const PUT_TOGETHER_Q = ['How many {many} do they have in all?', 'How many {many} do they have together?'];

export const noun = (t: Thing, n: number) => (n === 1 ? t.one : t.many);
