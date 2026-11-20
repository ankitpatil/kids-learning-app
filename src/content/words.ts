import type { Pattern } from './stories';
// Picture words per reading pattern. Icons are Fluent Emoji names, or `om-…` for OpenMoji (I2). `near` = minimal-pair / look-alike distractors (all real, kid-safe words).
export interface PictureWord {
  word: string;
  icon: string;
  near: string[];
}

export const WORDS: Record<string, PictureWord[]> = {
  cvc: [
    { word: 'cat', icon: 'cat-face', near: ['cap', 'cot', 'bat'] },
    { word: 'dog', icon: 'dog-face', near: ['dig', 'dot', 'log'] },
    { word: 'sun', icon: 'sun', near: ['sum', 'bun', 'sub'] },
    { word: 'pig', icon: 'pig-face', near: ['peg', 'big', 'pin'] },
    { word: 'bus', icon: 'bus', near: ['bud', 'but', 'bun'] },
    { word: 'hat', icon: 'top-hat', near: ['hot', 'ham', 'bat'] },
    { word: 'bed', icon: 'bed', near: ['bad', 'red', 'beg'] },
    { word: 'cup', icon: 'om-hot-beverage', near: ['cap', 'pup', 'cut'] },
    { word: 'fox', icon: 'fox', near: ['box', 'fix', 'fog'] },
    { word: 'map', icon: 'world-map', near: ['mop', 'cap', 'mat'] },
    { word: 'net', icon: 'goal-net', near: ['nut', 'pet', 'nap'] },
    { word: 'ten', icon: 'keycap-10', near: ['tin', 'tan', 'hen'] },
    { word: 'jug', icon: 'om-milk-jug', near: ['jog', 'mug', 'bug'] },
    { word: 'bin', icon: 'om-trash-bin', near: ['pin', 'bun', 'ban'] },
  ],
  digraphs: [
    { word: 'ship', icon: 'ship', near: ['chip', 'shop', 'sip'] },
    { word: 'fish', icon: 'fish', near: ['fist', 'dish', 'fit'] },
    { word: 'duck', icon: 'duck', near: ['dock', 'dug', 'deck'] },
    { word: 'sock', icon: 'socks', near: ['shock', 'sack', 'lock'] },
    { word: 'shell', icon: 'spiral-shell', near: ['sell', 'chill', 'shelf'] },
    { word: 'shoe', icon: 'running-shoe', near: ['show', 'she', 'chew'] },
    { word: 'chair', icon: 'chair', near: ['hair', 'cheer', 'share'] },
    { word: 'bath', icon: 'bathtub', near: ['bat', 'math', 'path'] },
  ],
  blends: [
    { word: 'frog', icon: 'frog', near: ['fog', 'flag', 'from'] },
    { word: 'star', icon: 'star', near: ['scar', 'tar', 'stir'] },
    { word: 'tree', icon: 'deciduous-tree', near: ['three', 'free', 'tea'] },
    { word: 'drum', icon: 'drum', near: ['drug', 'rum', 'dram'] },
    { word: 'flag', icon: 'triangular-flag', near: ['flap', 'flat', 'bag'] },
    { word: 'clock', icon: 'one-oclock', near: ['lock', 'click', 'block'] },
    { word: 'crab', icon: 'crab', near: ['cab', 'grab', 'crib'] },
    { word: 'truck', icon: 'delivery-truck', near: ['tuck', 'track', 'trick'] },
    { word: 'lamp', icon: 'om-desk-lamp', near: ['lump', 'limp', 'camp'] },
  ],
  silentE: [
    { word: 'kite', icon: 'kite', near: ['kit', 'bite', 'kits'] },
    { word: 'cube', icon: 'ice', near: ['cub', 'tube', 'cute'] },
    { word: 'rose', icon: 'rose', near: ['rod', 'nose', 'rise'] },
    { word: 'bike', icon: 'bicycle', near: ['bake', 'like', 'bit'] },
    { word: 'cake', icon: 'birthday-cake', near: ['cane', 'lake', 'cap'] },
    { word: 'plane', icon: 'airplane', near: ['plan', 'plate', 'lane'] },
    { word: 'nose', icon: 'nose', near: ['not', 'rose', 'nod'] },
    { word: 'cone', icon: 'soft-ice-cream', near: ['cane', 'bone', 'cot'] },
  ],
  vowelTeams: [
    { word: 'rain', icon: 'cloud-with-rain', near: ['ran', 'rail', 'train'] },
    { word: 'boat', icon: 'sailboat', near: ['bat', 'coat', 'boot'] },
    { word: 'feet', icon: 'foot', near: ['fat', 'feed', 'meet'] },
    { word: 'sheep', icon: 'ewe', near: ['ship', 'shape', 'sleep'] },
    { word: 'goat', icon: 'goat', near: ['got', 'coat', 'goal'] },
    { word: 'snail', icon: 'snail', near: ['snake', 'sail', 'nail'] },
    { word: 'bee', icon: 'honeybee', near: ['be', 'see', 'bed'] },
    { word: 'soap', icon: 'soap', near: ['sop', 'soup', 'rope'] },
  ],
};

// Magic e pairs: adding e changes the short vowel to a long one (cap → cape). Both words are picturable.
export interface MagicPair {
  short: string;
  shortIcon: string;
  long: string;
  longIcon: string;
}

export const MAGIC_E: MagicPair[] = [
  { short: 'kit', shortIcon: 'toolbox', long: 'kite', longIcon: 'kite' },
  { short: 'cub', shortIcon: 'bear', long: 'cube', longIcon: 'ice' },
  { short: 'cap', shortIcon: 'billed-cap', long: 'cape', longIcon: 'person-superhero' },
  { short: 'can', shortIcon: 'canned-food', long: 'cane', longIcon: 'white-cane' },
  { short: 'pin', shortIcon: 'pushpin', long: 'pine', longIcon: 'evergreen-tree' },
  { short: 'tub', shortIcon: 'bathtub', long: 'tube', longIcon: 'test-tube' },
];

// Finish-the-sentence items. `_` marks the blank. `near` = look-alike real words that do NOT fit,
// so the child has to read the choices carefully and check the sentence makes sense.
// Sentences use taught patterns plus tricky words from the Sight-Word Catch lists (the, a, I, we, my, to, of…).
// `pattern` is the hardest pattern used; a test checks every word (sentence, answer, look-alikes) decodes at it.
export interface SentenceItemData {
  text: string;
  answer: string;
  near: string[];
  icon: string;
  /** Hardest reading pattern in the sentence, answer and look-alikes (a test checks this). */
  pattern: Pattern;
}

const S = (text: string, answer: string, near: string[], icon: string, pattern: Pattern): SentenceItemData => ({ text, answer, near, icon, pattern });

export const SENTENCES: SentenceItemData[] = [
  // short vowels (CVC)
  S('The dog dug in the _.', 'mud', ['mug', 'mad'], 'dog-face', 'cvc'),
  S('We got on the big red _.', 'bus', ['bun', 'but'], 'bus', 'cvc'),
  S('The frog sat on a _.', 'log', ['lot', 'lag'], 'frog', 'blends'),
  S('The cat naps on the _.', 'bed', ['bad', 'bid'], 'cat-face', 'cvc'),
  S('The cat sat on the _.', 'mat', ['map', 'mad'], 'cat-face', 'cvc'),
  S('The pig is in the _.', 'pen', ['pet', 'peg'], 'pig-face', 'cvc'),
  S('I put on my red _.', 'cap', ['cup', 'cat'], 'billed-cap', 'cvc'),
  S('The sun is _.', 'hot', ['hat', 'hop'], 'sun', 'cvc'),
  S('Ben had a nap in his _.', 'cot', ['cut', 'cat'], 'bed', 'cvc'),
  S('Raj fed his pet _.', 'dog', ['dig', 'dot'], 'dog-face', 'cvc'),
  S('The fox ran to his _.', 'den', ['din', 'ten'], 'fox', 'cvc'),
  S('Get in the bath _.', 'tub', ['tab', 'tug'], 'bathtub', 'digraphs'),
  S('Mom had a _ with jam.', 'bun', ['bin', 'sun'], 'bread', 'digraphs'),
  // sh, ch, th, ck, ng
  S('I wish I had a pet _.', 'fish', ['fist', 'fizz'], 'fish', 'blends'),
  S('I can _ my hands.', 'wash', ['wish', 'cash'], 'soap', 'blends'),
  S('I sang a _.', 'song', ['sing', 'sang'], 'musical-note', 'digraphs'),
  S('The king has a big _.', 'ring', ['rung', 'wing'], 'ring', 'digraphs'),
  S('The chick is in the _.', 'nest', ['next', 'rest'], 'hatching-chick', 'blends'),
  S('The ship is at the _.', 'dock', ['deck', 'duck'], 'ship', 'digraphs'),
  // blends
  S('The duck swims in the _.', 'pond', ['pod', 'pot'], 'duck', 'blends'),
  S('The fish swims in a big _.', 'tank', ['tan', 'tack'], 'fish', 'blends'),
  S('The goat ate the _.', 'grass', ['glass', 'gross'], 'goat', 'vowelTeams'),
  S('The frog can _.', 'jump', ['jug', 'lump'], 'frog', 'blends'),
  S('A crab is on the _.', 'sand', ['send', 'sank'], 'crab', 'blends'),
  S('The plant is in a _.', 'pot', ['pat', 'put'], 'potted-plant', 'blends'),
  S('Mom went to the shop to get _.', 'milk', ['mild', 'mill'], 'glass-of-milk', 'blends'),
  S('We sit on the _ at the park.', 'bench', ['bunch', 'bend'], 'chair', 'blends'),
  // magic e
  S('I ride my _ to the shop.', 'bike', ['bake', 'bite'], 'bicycle', 'silentE'),
  S('I ate a slice of _.', 'cake', ['cane', 'cape'], 'birthday-cake', 'silentE'),
  S('A bee sat on the _.', 'rose', ['rise', 'rode'], 'honeybee', 'vowelTeams'),
  S('I run with my _.', 'kite', ['bite', 'cute'], 'kite', 'silentE'),
  S('The dog has a _.', 'bone', ['bane', 'bake'], 'bone', 'silentE'),
  S('Put an ice _ in the cup.', 'cube', ['cub', 'tube'], 'ice', 'silentE'),
  S('Get on the _ at gate five.', 'plane', ['plan', 'plate'], 'airplane', 'silentE'),
  S('I skip with a _.', 'rope', ['ripe', 'robe'], 'knot', 'silentE'),
  S('We like to _ in the lake.', 'swim', ['slim', 'swum'], 'person-swimming', 'silentE'),
  // ee, ai, oa
  S('We sail in a _.', 'boat', ['bat', 'coat'], 'sailboat', 'vowelTeams'),
  S('I wash my hands with _.', 'soap', ['sop', 'soak'], 'soap', 'vowelTeams'),
  S('We wait for the _.', 'train', ['trail', 'brain'], 'train', 'vowelTeams'),
  S('I need a _ in the rain.', 'coat', ['cot', 'goat'], 'coat', 'vowelTeams'),
  S('Feed the _ some seeds.', 'hen', ['hem', 'pen'], 'chicken', 'vowelTeams'),
  S('I see a green _.', 'frog', ['from', 'fog'], 'frog', 'vowelTeams'),
  S('I had jam on my _.', 'toast', ['test', 'coast'], 'bread', 'vowelTeams'),
  S('A snail is on the _.', 'path', ['pat', 'math'], 'snail', 'vowelTeams'),
  S('I put socks on my _.', 'feet', ['feed', 'fees'], 'foot', 'vowelTeams'),
  S('We wait at the bus _.', 'stop', ['step', 'shop'], 'bus-stop', 'vowelTeams'),
  S('The sheep sleep in the _.', 'shed', ['shod', 'sled'], 'ewe', 'vowelTeams'),
];
