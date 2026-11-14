import type { Pattern } from './stories';
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
// Sentences use taught patterns plus tricky words from the Sight-Word Catch lists (the, a, I, we, my, to, of…).
// `pattern` is the hardest pattern used; a test checks every word (sentence, answer, look-alikes) decodes at it.
export interface SentenceItemData {
  text: string;
  answer: string;
  near: string[];
  emoji: string;
  /** Hardest reading pattern in the sentence, answer and look-alikes (a test checks this). */
  pattern: Pattern;
}

const S = (text: string, answer: string, near: string[], emoji: string, pattern: Pattern): SentenceItemData => ({ text, answer, near, emoji, pattern });

export const SENTENCES: SentenceItemData[] = [
  // short vowels (CVC)
  S('The dog dug in the _.', 'mud', ['mug', 'mad'], '🐶', 'cvc'),
  S('We got on the big red _.', 'bus', ['bun', 'but'], '🚌', 'cvc'),
  S('The frog sat on a _.', 'log', ['lot', 'lag'], '🐸', 'blends'),
  S('The cat naps on the _.', 'bed', ['bad', 'bid'], '🐱', 'cvc'),
  S('The cat sat on the _.', 'mat', ['map', 'mad'], '🐱', 'cvc'),
  S('The pig is in the _.', 'pen', ['pet', 'peg'], '🐷', 'cvc'),
  S('I put on my red _.', 'cap', ['cup', 'cat'], '🧢', 'cvc'),
  S('The sun is _.', 'hot', ['hat', 'hop'], '☀️', 'cvc'),
  S('Ben had a nap in his _.', 'cot', ['cut', 'cat'], '🛏️', 'cvc'),
  S('Raj fed his pet _.', 'dog', ['dig', 'dot'], '🐶', 'cvc'),
  S('The fox ran to his _.', 'den', ['din', 'ten'], '🦊', 'cvc'),
  S('Get in the bath _.', 'tub', ['tab', 'tug'], '🛁', 'digraphs'),
  S('Mom had a _ with jam.', 'bun', ['bin', 'sun'], '🍞', 'digraphs'),
  // sh, ch, th, ck, ng
  S('I wish I had a pet _.', 'fish', ['fist', 'fizz'], '🐟', 'blends'),
  S('I can _ my hands.', 'wash', ['wish', 'cash'], '🧼', 'blends'),
  S('I sang a _.', 'song', ['sing', 'sang'], '🎵', 'digraphs'),
  S('The king has a big _.', 'ring', ['rung', 'wing'], '💍', 'digraphs'),
  S('The chick is in the _.', 'nest', ['next', 'rest'], '🐣', 'blends'),
  S('The ship is at the _.', 'dock', ['deck', 'duck'], '🚢', 'digraphs'),
  // blends
  S('The duck swims in the _.', 'pond', ['pod', 'pot'], '🦆', 'blends'),
  S('The fish swims in a big _.', 'tank', ['tan', 'tack'], '🐟', 'blends'),
  S('The goat ate the _.', 'grass', ['glass', 'gross'], '🐐', 'vowelTeams'),
  S('The frog can _.', 'jump', ['jug', 'lump'], '🐸', 'blends'),
  S('A crab is on the _.', 'sand', ['send', 'sank'], '🦀', 'blends'),
  S('The plant is in a _.', 'pot', ['pat', 'put'], '🪴', 'blends'),
  S('Mom went to the shop to get _.', 'milk', ['mild', 'mill'], '🥛', 'blends'),
  S('We sit on the _ at the park.', 'bench', ['bunch', 'bend'], '🪑', 'blends'),
  // magic e
  S('I ride my _ to the shop.', 'bike', ['bake', 'bite'], '🚲', 'silentE'),
  S('I ate a slice of _.', 'cake', ['cane', 'cape'], '🎂', 'silentE'),
  S('A bee sat on the _.', 'rose', ['rise', 'rode'], '🐝', 'vowelTeams'),
  S('I run with my _.', 'kite', ['bite', 'cute'], '🪁', 'silentE'),
  S('The dog has a _.', 'bone', ['bane', 'bake'], '🦴', 'silentE'),
  S('Put an ice _ in the cup.', 'cube', ['cub', 'tube'], '🧊', 'silentE'),
  S('Get on the _ at gate five.', 'plane', ['plan', 'plate'], '✈️', 'silentE'),
  S('I skip with a _.', 'rope', ['ripe', 'robe'], '🪢', 'silentE'),
  S('We like to _ in the lake.', 'swim', ['slim', 'swum'], '🏊', 'silentE'),
  // ee, ai, oa
  S('We sail in a _.', 'boat', ['bat', 'coat'], '⛵', 'vowelTeams'),
  S('I wash my hands with _.', 'soap', ['sop', 'soak'], '🧼', 'vowelTeams'),
  S('We wait for the _.', 'train', ['trail', 'brain'], '🚆', 'vowelTeams'),
  S('I need a _ in the rain.', 'coat', ['cot', 'goat'], '🧥', 'vowelTeams'),
  S('Feed the _ some seeds.', 'hen', ['hem', 'pen'], '🐔', 'vowelTeams'),
  S('I see a green _.', 'frog', ['from', 'fog'], '🐸', 'vowelTeams'),
  S('I had jam on my _.', 'toast', ['test', 'coast'], '🍞', 'vowelTeams'),
  S('A snail is on the _.', 'path', ['pat', 'math'], '🐌', 'vowelTeams'),
  S('I put socks on my _.', 'feet', ['feed', 'fees'], '🦶', 'vowelTeams'),
  S('We wait at the bus _.', 'stop', ['step', 'shop'], '🚏', 'vowelTeams'),
  S('The sheep sleep in the _.', 'shed', ['shod', 'sled'], '🐑', 'vowelTeams'),
];
