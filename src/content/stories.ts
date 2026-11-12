// Short decodable stories for Story Choose (#19). Each story only uses words from its phonics
// pattern (or an earlier one) plus tricky words from the Sight-Word Catch lists; a test checks this.
// Every question's answer appears in the story line it points at, so the hint can highlight it.

/** Reading patterns in teaching order (these are also the Word Detective track ids). */
export const PATTERNS = ['cvc', 'digraphs', 'blends', 'silentE', 'vowelTeams'] as const;
export type Pattern = (typeof PATTERNS)[number];

export interface StoryChoice {
  text: string;
  emoji: string;
}

export interface StoryQuestion {
  q: string;
  /** Index into `lines` of the sentence that answers the question. */
  line: number;
  answer: StoryChoice;
  wrong: StoryChoice[];
}

export interface Story {
  id: string;
  title: string;
  emoji: string;
  /** Hardest phonics pattern the story uses. */
  pattern: Pattern;
  /** One sentence per line, each with a picture. */
  lines: { text: string; emoji: string }[];
  questions: StoryQuestion[];
}

const C = (text: string, emoji: string): StoryChoice => ({ text, emoji });

export const STORIES: Story[] = [
  // ---------- CVC ----------
  {
    id: 'sam-cat', title: 'Sam and the Cat', emoji: '🐱', pattern: 'cvc',
    lines: [
      { text: 'Sam has a cat.', emoji: '🐱' },
      { text: 'The cat is fat.', emoji: '😺' },
      { text: 'Sam got a red hat.', emoji: '🎩' },
      { text: 'The cat sat in the hat!', emoji: '🙀' },
      { text: 'Sam can not get his hat.', emoji: '😅' },
    ],
    questions: [
      { q: 'What did Sam get?', line: 2, answer: C('a hat', '🎩'), wrong: [C('a cup', '☕'), C('a bag', '👜')] },
      { q: 'Where did the cat sit?', line: 3, answer: C('in the hat', '🎩'), wrong: [C('in the box', '📦'), C('on the bed', '🛏️')] },
    ],
  },
  {
    id: 'raj-bus', title: 'Raj on the Bus', emoji: '🚌', pattern: 'cvc',
    lines: [
      { text: 'Raj got on the bus.', emoji: '🚌' },
      { text: 'The bus is big and red.', emoji: '🔴' },
      { text: 'A pig got on the bus!', emoji: '🐷' },
      { text: 'The pig sat on Raj.', emoji: '😮' },
      { text: 'Raj had fun.', emoji: '😄' },
    ],
    questions: [
      { q: 'Who got on the bus with Raj?', line: 2, answer: C('a pig', '🐷'), wrong: [C('a dog', '🐶'), C('a cat', '🐱')] },
      { q: 'What colour is the bus?', line: 1, answer: C('red', '🔴'), wrong: [C('blue', '🔵'), C('green', '🟢')] },
    ],
  },
  {
    id: 'meg-pup', title: 'Meg and the Pup', emoji: '🐶', pattern: 'cvc',
    lines: [
      { text: 'Meg has a pup.', emoji: '🐶' },
      { text: 'The pup can dig.', emoji: '🐾' },
      { text: 'The pup dug in the mud.', emoji: '🟫' },
      { text: 'Meg got the pup in the tub.', emoji: '🛁' },
      { text: 'The pup is wet. Meg is wet!', emoji: '💦' },
    ],
    questions: [
      { q: 'What did the pup dig in?', line: 2, answer: C('mud', '🟫'), wrong: [C('a box', '📦'), C('a bed', '🛏️')] },
      { q: 'Where did Meg put the pup?', line: 3, answer: C('in the tub', '🛁'), wrong: [C('on the bus', '🚌'), C('in a box', '📦')] },
    ],
  },
  {
    id: 'fox-box', title: 'The Fox and the Box', emoji: '🦊', pattern: 'cvc',
    lines: [
      { text: 'A fox sat on a log.', emoji: '🦊' },
      { text: 'The fox can see a box.', emoji: '📦' },
      { text: 'The fox got in the box.', emoji: '🙈' },
      { text: 'Is the fox in the box? Yes!', emoji: '🎉' },
    ],
    questions: [
      { q: 'What did the fox sit on?', line: 0, answer: C('a log', '🪵'), wrong: [C('a bus', '🚌'), C('a bed', '🛏️')] },
      { q: 'Where did the fox go?', line: 2, answer: C('in the box', '📦'), wrong: [C('on the bus', '🚌'), C('in the sun', '☀️')] },
    ],
  },
  {
    id: 'ben-sun', title: 'Ben in the Sun', emoji: '☀️', pattern: 'cvc',
    lines: [
      { text: 'It is hot in the sun.', emoji: '☀️' },
      { text: 'Ben has a big hat.', emoji: '👒' },
      { text: 'Ben sips from a cup.', emoji: '🥤' },
      { text: 'Then Ben naps in the sun.', emoji: '😴' },
    ],
    questions: [
      { q: 'Was it hot or cold?', line: 0, answer: C('hot', '🔥'), wrong: [C('cold', '🥶')] },
      { q: 'What did Ben do at the end?', line: 3, answer: C('nap', '😴'), wrong: [C('run', '🏃'), C('dig', '⛏️')] },
    ],
  },

  // ---------- Digraphs (sh ch th ck, ll ss ff) ----------
  {
    id: 'josh-ship', title: 'The Big Ship', emoji: '🚢', pattern: 'digraphs',
    lines: [
      { text: 'Josh is on a ship.', emoji: '🚢' },
      { text: 'The ship is big.', emoji: '🌊' },
      { text: 'Josh can see a fish.', emoji: '🐟' },
      { text: 'The fish has a red fin.', emoji: '🐠' },
      { text: 'Josh gets a shell.', emoji: '🐚' },
    ],
    questions: [
      { q: 'Where is Josh?', line: 0, answer: C('on a ship', '🚢'), wrong: [C('on a bus', '🚌'), C('in a shop', '🏪')] },
      { q: 'What did Josh get?', line: 4, answer: C('a shell', '🐚'), wrong: [C('a fish', '🐟'), C('a rock', '🪨')] },
    ],
  },
  {
    id: 'chen-chick', title: 'Chen and the Chick', emoji: '🐥', pattern: 'digraphs',
    lines: [
      { text: 'Chen has a chick.', emoji: '🐥' },
      { text: 'The chick can peck.', emoji: '🐤' },
      { text: 'The chick pecks at the dish.', emoji: '🥣' },
      { text: 'Chen fills the dish.', emoji: '🌾' },
      { text: 'Then the chick naps.', emoji: '😴' },
    ],
    questions: [
      { q: 'What does Chen have?', line: 0, answer: C('a chick', '🐥'), wrong: [C('a duck', '🦆'), C('a fish', '🐟')] },
      { q: 'What did the chick peck at?', line: 2, answer: C('the dish', '🥣'), wrong: [C('the bell', '🔔'), C('the shell', '🐚')] },
    ],
  },
  {
    id: 'duck-path', title: 'Duck on the Path', emoji: '🦆', pattern: 'digraphs',
    lines: [
      { text: 'A duck is on the path.', emoji: '🦆' },
      { text: 'The duck can get a bug.', emoji: '🐛' },
      { text: 'Then the duck sits in the shed.', emoji: '🛖' },
      { text: 'The duck naps in the shed.', emoji: '😴' },
    ],
    questions: [
      { q: 'What did the duck get?', line: 1, answer: C('a bug', '🐛'), wrong: [C('a fish', '🐟'), C('a chip', '🍟')] },
      { q: 'Where did the duck sit?', line: 2, answer: C('in the shed', '🛖'), wrong: [C('on a ship', '🚢'), C('in the bath', '🛁')] },
    ],
  },

  // ---------- Blends ----------
  {
    id: 'frog-pond', title: 'The Frog in the Pond', emoji: '🐸', pattern: 'blends',
    lines: [
      { text: 'A frog sits on a log in the pond.', emoji: '🐸' },
      { text: 'The frog can jump and swim.', emoji: '💦' },
      { text: 'The frog spots a bug.', emoji: '🐛' },
      { text: 'Snap! The frog gets the bug.', emoji: '😋' },
      { text: 'The frog is glad.', emoji: '😊' },
    ],
    questions: [
      { q: 'Where is the frog?', line: 0, answer: C('on a log', '🪵'), wrong: [C('in a tree', '🌳'), C('on a bus', '🚌')] },
      { q: 'What did the frog get?', line: 3, answer: C('a bug', '🐛'), wrong: [C('a fish', '🐟'), C('an egg', '🥚')] },
    ],
  },
  {
    id: 'dev-drum', title: 'Dev and the Drum', emoji: '🥁', pattern: 'blends',
    lines: [
      { text: 'Dev has a drum.', emoji: '🥁' },
      { text: 'Dev hits the drum. Bam! Bam!', emoji: '💥' },
      { text: 'His dad has a big brass bell.', emoji: '🔔' },
      { text: 'Dev and his dad clap and sing.', emoji: '👏' },
      { text: 'The band is the best!', emoji: '🎶' },
    ],
    questions: [
      { q: 'What does Dev have?', line: 0, answer: C('a drum', '🥁'), wrong: [C('a bell', '🔔'), C('a flag', '🚩')] },
      { q: 'What does Dad have?', line: 2, answer: C('a bell', '🔔'), wrong: [C('a drum', '🥁'), C('a cup', '☕')] },
    ],
  },

  // ---------- Magic e ----------
  {
    id: 'kate-kite', title: 'Kate and the Kite', emoji: '🪁', pattern: 'silentE',
    lines: [
      { text: 'Kate has a kite.', emoji: '🪁' },
      { text: 'The kite is red and white.', emoji: '🔴' },
      { text: 'Kate runs up the hill.', emoji: '⛰️' },
      { text: 'The wind takes the kite up, up, up!', emoji: '🌬️' },
      { text: 'Kate smiles.', emoji: '😄' },
    ],
    questions: [
      { q: 'What does Kate have?', line: 0, answer: C('a kite', '🪁'), wrong: [C('a bike', '🚲'), C('a cake', '🎂')] },
      { q: 'Where did Kate run?', line: 2, answer: C('up the hill', '⛰️'), wrong: [C('to the lake', '🏞️'), C('to the shop', '🏪')] },
    ],
  },
  {
    id: 'mike-bike', title: 'A Bike Ride', emoji: '🚲', pattern: 'silentE',
    lines: [
      { text: 'Mike has a red bike.', emoji: '🚲' },
      { text: 'Mike rides his bike to the lake.', emoji: '🏞️' },
      { text: 'At the lake, Mike spots a duck.', emoji: '🦆' },
      { text: 'Mike has a bit of cake.', emoji: '🎂' },
      { text: 'The duck wants a bite of the cake!', emoji: '😋' },
    ],
    questions: [
      { q: 'Where did Mike ride?', line: 1, answer: C('to the lake', '🏞️'), wrong: [C('to the shop', '🏪'), C('up the hill', '⛰️')] },
      { q: 'What does the duck want?', line: 4, answer: C('cake', '🎂'), wrong: [C('a bug', '🐛'), C('a bike', '🚲')] },
    ],
  },

  // ---------- Vowel teams (ee ai oa) ----------
  {
    id: 'goat-rain', title: 'The Goat in the Rain', emoji: '🐐', pattern: 'vowelTeams',
    lines: [
      { text: 'A goat is in the rain.', emoji: '🌧️' },
      { text: 'The goat is wet. It wants a coat.', emoji: '🐐' },
      { text: 'Jai gets the goat a coat.', emoji: '🧥' },
      { text: 'The goat is not wet. It feels snug.', emoji: '🥰' },
    ],
    questions: [
      { q: 'What was the goat in?', line: 0, answer: C('the rain', '🌧️'), wrong: [C('the sun', '☀️'), C('the mud', '🟫')] },
      { q: 'What did Jai get for the goat?', line: 2, answer: C('a coat', '🧥'), wrong: [C('a hat', '🎩'), C('a boat', '⛵')] },
    ],
  },
  {
    id: 'neel-boat', title: 'Sail the Boat', emoji: '⛵', pattern: 'vowelTeams',
    lines: [
      { text: 'Neel and his dad sail in a boat.', emoji: '⛵' },
      { text: 'The boat floats on the lake.', emoji: '🏞️' },
      { text: 'Neel can see a big fish.', emoji: '🐟' },
      { text: 'Then the rain comes. Neel and Dad sail back.', emoji: '🌧️' },
    ],
    questions: [
      { q: 'Who is in the boat with Neel?', line: 0, answer: C('Dad', '👨'), wrong: [C('Mom', '👩'), C('a goat', '🐐')] },
      { q: 'What did Neel see?', line: 2, answer: C('a big fish', '🐟'), wrong: [C('a frog', '🐸'), C('a ship', '🚢')] },
    ],
  },
];
