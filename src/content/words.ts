// Picture words per reading pattern. `near` = minimal-pair / look-alike distractors (all real, kid-safe words).
export interface PictureWord {
  word: string;
  emoji: string;
  near: string[];
}

export const WORDS: Record<string, PictureWord[]> = {
  cvc: [
    { word: 'cat', emoji: '🐱', near: ['cap', 'cot', 'bat'] },
    { word: 'dog', emoji: '🐶', near: ['dig', 'dot', 'log'] },
    { word: 'sun', emoji: '☀️', near: ['sum', 'bun', 'sub'] },
    { word: 'pig', emoji: '🐷', near: ['peg', 'big', 'pin'] },
    { word: 'bus', emoji: '🚌', near: ['bud', 'but', 'bun'] },
    { word: 'hat', emoji: '🎩', near: ['hot', 'ham', 'bat'] },
    { word: 'bed', emoji: '🛏️', near: ['bad', 'red', 'beg'] },
    { word: 'cup', emoji: '☕', near: ['cap', 'pup', 'cut'] },
    { word: 'fox', emoji: '🦊', near: ['box', 'fix', 'fog'] },
    { word: 'map', emoji: '🗺️', near: ['mop', 'cap', 'mat'] },
    { word: 'net', emoji: '🥅', near: ['nut', 'pet', 'nap'] },
    { word: 'ten', emoji: '🔟', near: ['tin', 'tan', 'hen'] },
  ],
  digraphs: [
    { word: 'ship', emoji: '🚢', near: ['chip', 'shop', 'sip'] },
    { word: 'fish', emoji: '🐟', near: ['fist', 'dish', 'fit'] },
    { word: 'duck', emoji: '🦆', near: ['dock', 'dug', 'deck'] },
    { word: 'sock', emoji: '🧦', near: ['shock', 'sack', 'lock'] },
    { word: 'shell', emoji: '🐚', near: ['sell', 'chill', 'shelf'] },
    { word: 'shoe', emoji: '👟', near: ['show', 'she', 'chew'] },
    { word: 'chair', emoji: '🪑', near: ['hair', 'cheer', 'share'] },
    { word: 'bath', emoji: '🛁', near: ['bat', 'math', 'path'] },
  ],
  blends: [
    { word: 'frog', emoji: '🐸', near: ['fog', 'flag', 'from'] },
    { word: 'star', emoji: '⭐', near: ['scar', 'tar', 'stir'] },
    { word: 'tree', emoji: '🌳', near: ['three', 'free', 'tea'] },
    { word: 'drum', emoji: '🥁', near: ['drug', 'rum', 'dram'] },
    { word: 'flag', emoji: '🚩', near: ['flap', 'flat', 'bag'] },
    { word: 'clock', emoji: '🕐', near: ['lock', 'click', 'block'] },
    { word: 'crab', emoji: '🦀', near: ['cab', 'grab', 'crib'] },
    { word: 'truck', emoji: '🚚', near: ['tuck', 'track', 'trick'] },
  ],
  silentE: [
    { word: 'kite', emoji: '🪁', near: ['kit', 'bite', 'kits'] },
    { word: 'cube', emoji: '🧊', near: ['cub', 'tube', 'cute'] },
    { word: 'rose', emoji: '🌹', near: ['rod', 'nose', 'rise'] },
    { word: 'bike', emoji: '🚲', near: ['bake', 'like', 'bit'] },
    { word: 'cake', emoji: '🎂', near: ['cane', 'lake', 'cap'] },
    { word: 'plane', emoji: '✈️', near: ['plan', 'plate', 'lane'] },
    { word: 'nose', emoji: '👃', near: ['not', 'rose', 'nod'] },
    { word: 'cone', emoji: '🍦', near: ['cane', 'bone', 'cot'] },
  ],
  vowelTeams: [
    { word: 'rain', emoji: '🌧️', near: ['ran', 'rail', 'train'] },
    { word: 'boat', emoji: '⛵', near: ['bat', 'coat', 'boot'] },
    { word: 'feet', emoji: '🦶', near: ['fat', 'feed', 'meet'] },
    { word: 'sheep', emoji: '🐑', near: ['ship', 'shape', 'sleep'] },
    { word: 'goat', emoji: '🐐', near: ['got', 'coat', 'goal'] },
    { word: 'snail', emoji: '🐌', near: ['snake', 'sail', 'nail'] },
    { word: 'bee', emoji: '🐝', near: ['be', 'see', 'bed'] },
    { word: 'soap', emoji: '🧼', near: ['sop', 'soup', 'rope'] },
  ],
};

// Magic e pairs: adding e changes the short vowel to a long one (cap → cape). Both words are picturable.
export interface MagicPair {
  short: string;
  shortEmoji: string;
  long: string;
  longEmoji: string;
}

export const MAGIC_E: MagicPair[] = [
  { short: 'kit', shortEmoji: '🧰', long: 'kite', longEmoji: '🪁' },
  { short: 'cub', shortEmoji: '🐻', long: 'cube', longEmoji: '🧊' },
  { short: 'cap', shortEmoji: '🧢', long: 'cape', longEmoji: '🦸' },
  { short: 'can', shortEmoji: '🥫', long: 'cane', longEmoji: '🦯' },
  { short: 'pin', shortEmoji: '📌', long: 'pine', longEmoji: '🌲' },
  { short: 'tub', shortEmoji: '🛁', long: 'tube', longEmoji: '🧪' },
];

// Finish-the-sentence items. `_` marks the blank. `near` = look-alike real words that do NOT fit,
// so the child has to read the choices carefully and check the sentence makes sense.
// Sentences use taught patterns plus common heart words (the, a, I, we, my, is, on, in, to, of, your).
export interface SentenceItemData {
  text: string;
  answer: string;
  near: string[];
  emoji: string;
}

export const SENTENCES: SentenceItemData[] = [
  { text: 'The dog dug in the _.', answer: 'mud', near: ['mug', 'mad'], emoji: '🐶' },
  { text: 'We got on the big red _.', answer: 'bus', near: ['bun', 'but'], emoji: '🚌' },
  { text: 'The frog sat on a _.', answer: 'log', near: ['lot', 'lag'], emoji: '🐸' },
  { text: 'The duck swims in the _.', answer: 'pond', near: ['pod', 'pot'], emoji: '🦆' },
  { text: 'I ride my _ to the shop.', answer: 'bike', near: ['bake', 'bite'], emoji: '🚲' },
  { text: 'The fish swims in a big _.', answer: 'tank', near: ['tan', 'tack'], emoji: '🐟' },
  { text: 'I ate a slice of _.', answer: 'cake', near: ['cane', 'cape'], emoji: '🎂' },
  { text: 'The goat ate the _.', answer: 'grass', near: ['glass', 'gross'], emoji: '🐐' },
  { text: 'A bee sat on the _.', answer: 'rose', near: ['rise', 'rode'], emoji: '🐝' },
  { text: 'The cat naps on the _.', answer: 'bed', near: ['bad', 'bid'], emoji: '🐱' },
  { text: 'The chick is in the _.', answer: 'nest', near: ['next', 'rest'], emoji: '🐣' },
  { text: 'We sail in a _.', answer: 'boat', near: ['bat', 'boot'], emoji: '⛵' },
  { text: 'I wash my hands with _.', answer: 'soap', near: ['soup', 'sop'], emoji: '🧼' },
];
