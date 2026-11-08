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
