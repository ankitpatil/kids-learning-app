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
  // ---------- More stories (C1, 2026-11-12) ----------
  // ---------- CVC ----------
  {
    id: 'ved-jam', title: 'Ved and the Jam', emoji: '🍯', pattern: 'cvc',
    lines: [
      { text: 'Ved has a bun.', emoji: '🍞' },
      { text: 'Mom got jam.', emoji: '🍯' },
      { text: 'Ved put jam on the bun.', emoji: '🥪' },
      { text: 'A big bug sat on the jam!', emoji: '🐞' },
      { text: 'Ved and the bug had the bun.', emoji: '😄' },
    ],
    questions: [
      { q: 'What did Mom get?', line: 1, answer: C('jam', '🍯'), wrong: [C('a cup', '☕'), C('a hat', '🎩')] },
      { q: 'What sat on the jam?', line: 3, answer: C('a bug', '🐞'), wrong: [C('a cat', '🐱'), C('a pig', '🐷')] },
    ],
  },
  {
    id: 'kim-hen', title: 'Kim and the Hen', emoji: '🐔', pattern: 'cvc',
    lines: [
      { text: 'Kim has a hen.', emoji: '🐔' },
      { text: 'The hen is red.', emoji: '🔴' },
      { text: 'Kim fed the hen.', emoji: '🌾' },
      { text: 'The hen ran to Kim.', emoji: '🏃' },
      { text: 'Kim and the hen nap in the sun.', emoji: '☀️' },
    ],
    questions: [
      { q: 'What colour is the hen?', line: 1, answer: C('red', '🔴'), wrong: [C('blue', '🔵'), C('green', '🟢')] },
      { q: 'Where do Kim and the hen nap?', line: 4, answer: C('in the sun', '☀️'), wrong: [C('in the mud', '🟫'), C('on a bus', '🚌')] },
    ],
  },
  {
    id: 'dev-van', title: 'Dev and the Van', emoji: '🚐', pattern: 'cvc',
    lines: [
      { text: 'Dad has a tan van.', emoji: '🚐' },
      { text: 'Dev got in the van.', emoji: '🧒' },
      { text: 'It is wet. The van is in mud!', emoji: '🌧️' },
      { text: 'Dev and Dad dig and dig.', emoji: '⛏️' },
      { text: 'Yes! The van can go.', emoji: '🎉' },
    ],
    questions: [
      { q: 'What colour is the van?', line: 0, answer: C('tan', '🟤'), wrong: [C('red', '🔴'), C('pink', '🩷')] },
      { q: 'Where is the van stuck?', line: 2, answer: C('in the mud', '🟫'), wrong: [C('in the sun', '☀️'), C('on a hill', '⛰️')] },
    ],
  },
  {
    id: 'pam-pig', title: 'Pam and the Pig', emoji: '🐷', pattern: 'cvc',
    lines: [
      { text: 'Pam has a pet pig.', emoji: '🐷' },
      { text: 'The pig can sit.', emoji: '🐖' },
      { text: 'Pam got a big tub.', emoji: '🛁' },
      { text: 'The pig hid in the tub!', emoji: '🙈' },
      { text: 'Pam had to hug the pig.', emoji: '🤗' },
    ],
    questions: [
      { q: 'What pet does Pam have?', line: 0, answer: C('a pig', '🐷'), wrong: [C('a cat', '🐱'), C('a dog', '🐶')] },
      { q: 'Where did the pig hide?', line: 3, answer: C('in the tub', '🛁'), wrong: [C('in a box', '📦'), C('in the van', '🚐')] },
    ],
  },
  {
    id: 'ram-rug', title: 'The Big Rug', emoji: '🟥', pattern: 'cvc',
    lines: [
      { text: 'Ram has a big rug.', emoji: '🟥' },
      { text: 'Mom said, Sit on the rug.', emoji: '🧘' },
      { text: 'Ram and his cat sit.', emoji: '🐱' },
      { text: 'The cat got a nap.', emoji: '😴' },
      { text: 'Ram got a nap.', emoji: '💤' },
    ],
    questions: [
      { q: 'Who sat with Ram?', line: 2, answer: C('his cat', '🐱'), wrong: [C('his dog', '🐶'), C('a hen', '🐔')] },
      { q: 'Where did Mom say to sit?', line: 1, answer: C('on the rug', '🟥'), wrong: [C('on the bus', '🚌'), C('in bed', '🛏️')] },
    ],
  },
  {
    id: 'jen-mop', title: 'Jen Can Mop', emoji: '🧹', pattern: 'cvc',
    lines: [
      { text: 'Jen had a cup of pop.', emoji: '🥤' },
      { text: 'Bam! The pop is on the mat.', emoji: '💦' },
      { text: 'Jen got a mop.', emoji: '🧹' },
      { text: 'Jen can mop and mop.', emoji: '🧽' },
      { text: 'Mom said, Jen is the top kid!', emoji: '⭐' },
    ],
    questions: [
      { q: 'What did Jen have?', line: 0, answer: C('a cup of pop', '🥤'), wrong: [C('a bun', '🍞'), C('a hat', '🎩')] },
      { q: 'What did Jen get?', line: 2, answer: C('a mop', '🧹'), wrong: [C('a pen', '🖊️'), C('a box', '📦')] },
    ],
  },
  // ---------- Digraphs ----------
  {
    id: 'ash-ball', title: 'Ash Hits the Ball', emoji: '🏏', pattern: 'digraphs',
    lines: [
      { text: 'Ash has a bat and a ball.', emoji: '🏏' },
      { text: 'Dad will toss the ball.', emoji: '👨' },
      { text: 'Ash hit the ball. Whack!', emoji: '💥' },
      { text: 'The ball is up on the hill.', emoji: '⛰️' },
      { text: 'Ash and Dad yell, Six!', emoji: '🎉' },
    ],
    questions: [
      { q: 'Who will toss the ball?', line: 1, answer: C('Dad', '👨'), wrong: [C('Mom', '👩'), C('a duck', '🦆')] },
      { q: 'Where is the ball?', line: 3, answer: C('on the hill', '⛰️'), wrong: [C('in the bag', '👜'), C('on the bus', '🚌')] },
    ],
  },
  {
    id: 'beth-fish', title: 'Beth at the Fish Shop', emoji: '🐟', pattern: 'digraphs',
    lines: [
      { text: 'Beth and Mom go to the shop.', emoji: '🏪' },
      { text: 'The shop has fish.', emoji: '🐟' },
      { text: 'Beth can see a big red fish.', emoji: '🐠' },
      { text: 'Mom got the fish and a dish.', emoji: '🍽️' },
      { text: 'Fish and chips! Yum!', emoji: '🍟' },
    ],
    questions: [
      { q: 'Where did Beth and Mom go?', line: 0, answer: C('the shop', '🏪'), wrong: [C('the bus', '🚌'), C('the hill', '⛰️')] },
      { q: 'What did Mom get?', line: 3, answer: C('the fish', '🐟'), wrong: [C('a duck', '🦆'), C('a hat', '🎩')] },
    ],
  },
  {
    id: 'chad-sock', title: 'Where Is the Sock?', emoji: '🧦', pattern: 'digraphs',
    lines: [
      { text: 'Chad has one red sock.', emoji: '🧦' },
      { text: 'Where is the sock?', emoji: '🤔' },
      { text: 'It is not in the shed.', emoji: '🛖' },
      { text: 'Look! The pup has the sock.', emoji: '🐶' },
      { text: 'Chad and the pup tug and tug.', emoji: '😄' },
    ],
    questions: [
      { q: 'What colour is the sock?', line: 0, answer: C('red', '🔴'), wrong: [C('blue', '🔵'), C('green', '🟢')] },
      { q: 'Who has the sock?', line: 3, answer: C('the pup', '🐶'), wrong: [C('a cat', '🐱'), C('Mom', '👩')] },
    ],
  },
  {
    id: 'king-ring', title: 'The King and the Ring', emoji: '👑', pattern: 'digraphs',
    lines: [
      { text: 'A king had a ring.', emoji: '💍' },
      { text: 'The ring fell in the well!', emoji: '😱' },
      { text: 'A duck sat on the well.', emoji: '🦆' },
      { text: 'The duck got the ring.', emoji: '💍' },
      { text: 'The king said, Thank you, Duck!', emoji: '🙏' },
    ],
    questions: [
      { q: 'Where did the ring fall?', line: 1, answer: C('in the well', '🪣'), wrong: [C('in the bath', '🛁'), C('in the shop', '🏪')] },
      { q: 'Who got the ring?', line: 3, answer: C('the duck', '🦆'), wrong: [C('the king', '👑'), C('a fish', '🐟')] },
    ],
  },
  {
    id: 'seth-chips', title: 'Seth and the Chips', emoji: '🍟', pattern: 'digraphs',
    lines: [
      { text: 'Seth has ten chips.', emoji: '🍟' },
      { text: 'His pal Shan has six chips.', emoji: '🧒' },
      { text: 'Seth will give Shan two.', emoji: '🤝' },
      { text: 'Then the two pals sit and chat.', emoji: '💬' },
      { text: 'Yum! Chips with a pal!', emoji: '😋' },
    ],
    questions: [
      { q: 'How many chips does Seth have?', line: 0, answer: C('ten', '🔟'), wrong: [C('six', '6️⃣'), C('two', '2️⃣')] },
      { q: 'What do the pals do?', line: 3, answer: C('sit and chat', '💬'), wrong: [C('run and jump', '🏃'), C('nap', '😴')] },
    ],
  },
  // ---------- Blends ----------
  {
    id: 'fran-tent', title: 'The Camp Trip', emoji: '⛺', pattern: 'blends',
    lines: [
      { text: 'Fran and Dad went on a trip.', emoji: '🚙' },
      { text: 'They set up a tent.', emoji: '⛺' },
      { text: 'Fran had a plum and a snack.', emoji: '🍑' },
      { text: 'At dusk, frogs sang.', emoji: '🐸' },
      { text: 'Fran slept in the tent.', emoji: '😴' },
    ],
    questions: [
      { q: 'What did they set up?', line: 1, answer: C('a tent', '⛺'), wrong: [C('a shop', '🏪'), C('a swing', '🛝')] },
      { q: 'What sang at dusk?', line: 3, answer: C('frogs', '🐸'), wrong: [C('ducks', '🦆'), C('hens', '🐔')] },
    ],
  },
  {
    id: 'drip-drop', title: 'Drip, Drop!', emoji: '🌧️', pattern: 'blends',
    lines: [
      { text: 'Drip, drop! It is wet.', emoji: '🌧️' },
      { text: 'Trish and Brad jump and splash.', emoji: '💦' },
      { text: 'Brad slips in the mud.', emoji: '😅' },
      { text: 'Trish helps him up.', emoji: '🤝' },
      { text: 'Then Mom gets them a hot drink.', emoji: '☕' },
    ],
    questions: [
      { q: 'What do Trish and Brad do?', line: 1, answer: C('jump and splash', '💦'), wrong: [C('sit and nap', '😴'), C('run to the bus', '🚌')] },
      { q: 'Who slips in the mud?', line: 2, answer: C('Brad', '👦'), wrong: [C('Trish', '👧'), C('Mom', '👩')] },
    ],
  },
  {
    id: 'glen-plan', title: 'Glen Has a Plan', emoji: '🚀', pattern: 'blends',
    lines: [
      { text: 'Glen has a plan.', emoji: '📝' },
      { text: 'He will get a box and a lid.', emoji: '📦' },
      { text: 'Glen sits in the box.', emoji: '🧒' },
      { text: 'Lift off! Glen zips past the sun.', emoji: '🚀' },
      { text: 'Then Mom said, Glen, lunch!', emoji: '🍲' },
    ],
    questions: [
      { q: 'What does Glen sit in?', line: 2, answer: C('the box', '📦'), wrong: [C('the tent', '⛺'), C('a bus', '🚌')] },
      { q: 'What did Mom call Glen for?', line: 4, answer: C('lunch', '🍲'), wrong: [C('a bath', '🛁'), C('a nap', '😴')] },
    ],
  },
  {
    id: 'fran-crab', title: 'The Crab on the Sand', emoji: '🦀', pattern: 'blends',
    lines: [
      { text: 'Fran is on the sand.', emoji: '🏖️' },
      { text: 'A crab runs past.', emoji: '🦀' },
      { text: 'The crab can snap!', emoji: '✂️' },
      { text: 'Fran jumps back.', emoji: '😮' },
      { text: 'The crab hid in the sand.', emoji: '🕳️' },
    ],
    questions: [
      { q: 'What runs past Fran?', line: 1, answer: C('a crab', '🦀'), wrong: [C('a frog', '🐸'), C('a duck', '🦆')] },
      { q: 'Where did the crab hide?', line: 4, answer: C('in the sand', '🏖️'), wrong: [C('in a box', '📦'), C('in a cup', '☕')] },
    ],
  },
  {
    id: 'dev-lamps', title: 'Ten Lamps', emoji: '🪔', pattern: 'blends',
    lines: [
      { text: 'Mom and Dev lit lamps.', emoji: '🪔' },
      { text: 'Dev lit ten lamps.', emoji: '🔟' },
      { text: 'Ten lamps glint. It is grand!', emoji: '✨' },
      { text: 'Dad brings a big box of snacks.', emoji: '🎁' },
      { text: 'Yum! Dev and Mom munch and munch.', emoji: '😋' },
    ],
    questions: [
      { q: 'How many lamps did Dev light?', line: 1, answer: C('ten', '🔟'), wrong: [C('two', '2️⃣'), C('six', '6️⃣')] },
      { q: 'What does Dad bring?', line: 3, answer: C('a box of snacks', '🎁'), wrong: [C('a drum', '🥁'), C('a crab', '🦀')] },
    ],
  },
  {
    id: 'brad-swim', title: 'Brad Can Swim', emoji: '🏊', pattern: 'blends',
    lines: [
      { text: 'Brad and Mom went to the pond.', emoji: '🏞️' },
      { text: 'Brad will swim.', emoji: '🏊' },
      { text: 'Mom held his hand.', emoji: '🤝' },
      { text: 'Brad kicks and kicks.', emoji: '🦵' },
      { text: 'Brad can swim! Mom claps.', emoji: '👏' },
    ],
    questions: [
      { q: 'Where did Brad and Mom go?', line: 0, answer: C('the pond', '🏞️'), wrong: [C('the shop', '🏪'), C('the bus', '🚌')] },
      { q: 'What did Mom hold?', line: 2, answer: C('his hand', '✋'), wrong: [C('his cap', '🧢'), C('a drum', '🥁')] },
    ],
  },
  // ---------- Magic e ----------
  {
    id: 'jane-cake', title: 'Jane Bakes a Cake', emoji: '🎂', pattern: 'silentE',
    lines: [
      { text: 'Jane will bake a cake.', emoji: '🎂' },
      { text: 'She has a pan and a plate.', emoji: '🍽️' },
      { text: 'Pete came to help.', emoji: '👦' },
      { text: 'The cake is huge!', emoji: '🎂' },
      { text: 'They ate it. Yum!', emoji: '😋' },
    ],
    questions: [
      { q: 'What will Jane bake?', line: 0, answer: C('a cake', '🎂'), wrong: [C('a bun', '🍞'), C('a pie', '🥧')] },
      { q: 'Who came to help?', line: 2, answer: C('Pete', '👦'), wrong: [C('Mike', '🧒'), C('Rose', '👧')] },
    ],
  },
  {
    id: 'rose-rope', title: 'Jump Rope', emoji: '🪢', pattern: 'silentE',
    lines: [
      { text: 'Rose has a long rope.', emoji: '🪢' },
      { text: 'Rose and Kate skip in the lane.', emoji: '🛣️' },
      { text: 'Mike came and said, Can I?', emoji: '🙋' },
      { text: 'Rose said, Yes! Hop in, Mike.', emoji: '👍' },
      { text: 'Rose, Kate and Mike skip and smile.', emoji: '😄' },
    ],
    questions: [
      { q: 'What does Rose have?', line: 0, answer: C('a rope', '🪢'), wrong: [C('a kite', '🪁'), C('a cake', '🎂')] },
      { q: 'Who came to skip?', line: 2, answer: C('Mike', '🧒'), wrong: [C('Pete', '👦'), C('Jane', '👧')] },
    ],
  },
  {
    id: 'pete-space', title: 'The Space Ride', emoji: '🚀', pattern: 'silentE',
    lines: [
      { text: 'Pete made a ship from a tube.', emoji: '🚀' },
      { text: 'Pete and Jane ride in space.', emoji: '🌌' },
      { text: 'They wave at the big sun.', emoji: '☀️' },
      { text: 'Then they see a cute pup.', emoji: '🐶' },
      { text: 'Pete and Jane race home.', emoji: '🏠' },
    ],
    questions: [
      { q: 'What did Pete make?', line: 0, answer: C('a ship', '🚀'), wrong: [C('a cake', '🎂'), C('a kite', '🪁')] },
      { q: 'What did they see?', line: 3, answer: C('a pup', '🐶'), wrong: [C('a frog', '🐸'), C('a duck', '🦆')] },
    ],
  },
  {
    id: 'kate-lime', title: 'Grapes and a Lime', emoji: '🍇', pattern: 'silentE',
    lines: [
      { text: 'Mom has grapes and a lime.', emoji: '🍇' },
      { text: 'Kate likes grapes.', emoji: '😋' },
      { text: 'Mike bit the lime.', emoji: '🍋' },
      { text: 'Mike made a face!', emoji: '😖' },
      { text: 'Kate said, Here, take a grape!', emoji: '🍇' },
    ],
    questions: [
      { q: 'Who likes grapes?', line: 1, answer: C('Kate', '👧'), wrong: [C('Mike', '🧒'), C('Mom', '👩')] },
      { q: 'What did Mike bite?', line: 2, answer: C('the lime', '🍋'), wrong: [C('a grape', '🍇'), C('a cake', '🎂')] },
    ],
  },
  {
    id: 'jane-hide', title: 'Can You Hide?', emoji: '🙈', pattern: 'silentE',
    lines: [
      { text: 'Jane and Pete hide.', emoji: '🙈' },
      { text: 'Pete hides in the shed.', emoji: '🛖' },
      { text: 'Jane hides in a crate.', emoji: '📦' },
      { text: 'Mike looks and looks.', emoji: '👀' },
      { text: 'Yes! Mike spots Jane in the crate.', emoji: '😄' },
    ],
    questions: [
      { q: 'Where does Pete hide?', line: 1, answer: C('in the shed', '🛖'), wrong: [C('in the crate', '📦'), C('on the bike', '🚲')] },
      { q: 'Who looks for them?', line: 3, answer: C('Mike', '🧒'), wrong: [C('Rose', '👧'), C('Kate', '👩')] },
    ],
  },
  {
    id: 'mike-home', title: 'Time to Go Home', emoji: '🏠', pattern: 'silentE',
    lines: [
      { text: 'It is late.', emoji: '🌇' },
      { text: 'The sun sets.', emoji: '🌅' },
      { text: 'Mike and Rose ride home on bikes.', emoji: '🚲' },
      { text: 'Mom has a plate of rice.', emoji: '🍚' },
      { text: 'Mike and Rose dine at nine.', emoji: '🍽️' },
    ],
    questions: [
      { q: 'How do Mike and Rose get home?', line: 2, answer: C('on bikes', '🚲'), wrong: [C('on a bus', '🚌'), C('in a van', '🚐')] },
      { q: 'What is on the plate?', line: 3, answer: C('rice', '🍚'), wrong: [C('cake', '🎂'), C('grapes', '🍇')] },
    ],
  },
  // ---------- ee / ai / oa ----------
  {
    id: 'jai-train', title: 'Jai and the Train', emoji: '🚆', pattern: 'vowelTeams',
    lines: [
      { text: 'Jai and Mom wait for the train.', emoji: '🚉' },
      { text: 'The train is late.', emoji: '⏰' },
      { text: 'It rains and rains.', emoji: '🌧️' },
      { text: 'Then the train is here!', emoji: '🚆' },
      { text: 'Jai sits and waves.', emoji: '👋' },
    ],
    questions: [
      { q: 'What are Jai and Mom waiting for?', line: 0, answer: C('the train', '🚆'), wrong: [C('the bus', '🚌'), C('a boat', '⛵')] },
      { q: 'What does Jai do on the train?', line: 4, answer: C('waves', '👋'), wrong: [C('naps', '😴'), C('jumps', '🦘')] },
    ],
  },
  {
    id: 'neel-seeds', title: 'Neel and the Seeds', emoji: '🌱', pattern: 'vowelTeams',
    lines: [
      { text: 'Neel has a green tree.', emoji: '🌳' },
      { text: 'A bee sits on the tree.', emoji: '🐝' },
      { text: 'Neel sees three seeds.', emoji: '🌰' },
      { text: 'He plants the seeds.', emoji: '🪴' },
      { text: 'In one week, a green sprig!', emoji: '🌱' },
    ],
    questions: [
      { q: 'What sits on the tree?', line: 1, answer: C('a bee', '🐝'), wrong: [C('a goat', '🐐'), C('a cat', '🐱')] },
      { q: 'How many seeds does Neel see?', line: 2, answer: C('three', '3️⃣'), wrong: [C('two', '2️⃣'), C('ten', '🔟')] },
    ],
  },
  {
    id: 'gail-snail', title: 'Gail and the Snail', emoji: '🐌', pattern: 'vowelTeams',
    lines: [
      { text: 'Gail has a pet snail.', emoji: '🐌' },
      { text: 'The snail sits on a pail.', emoji: '🪣' },
      { text: 'Gail paints the pail.', emoji: '🎨' },
      { text: 'The snail waits and waits.', emoji: '⏳' },
      { text: 'Then the snail slides off the pail.', emoji: '🐌' },
    ],
    questions: [
      { q: 'What pet does Gail have?', line: 0, answer: C('a snail', '🐌'), wrong: [C('a goat', '🐐'), C('a frog', '🐸')] },
      { q: 'What does Gail paint?', line: 2, answer: C('the pail', '🪣'), wrong: [C('the boat', '⛵'), C('the train', '🚆')] },
    ],
  },
  {
    id: 'neel-toast', title: 'Toast for Dad', emoji: '🍞', pattern: 'vowelTeams',
    lines: [
      { text: 'Neel wakes up.', emoji: '⏰' },
      { text: 'He makes toast for Dad.', emoji: '🍞' },
      { text: 'He puts jam on the toast.', emoji: '🍯' },
      { text: 'Dad sees the toast.', emoji: '👀' },
      { text: 'Dad and Neel munch. Sweet!', emoji: '😋' },
    ],
    questions: [
      { q: 'What does Neel make?', line: 1, answer: C('toast', '🍞'), wrong: [C('tea', '☕'), C('soup', '🍲')] },
      { q: 'What goes on the toast?', line: 2, answer: C('jam', '🍯'), wrong: [C('cheese', '🧀'), C('rice', '🍚')] },
    ],
  },
  {
    id: 'jai-coat', title: 'The Red Coat', emoji: '🧥', pattern: 'vowelTeams',
    lines: [
      { text: 'Jai has a red coat.', emoji: '🧥' },
      { text: 'He and Mom go on the road.', emoji: '🛣️' },
      { text: 'It rains! Drip, drop!', emoji: '🌧️' },
      { text: 'Jai keeps snug in his coat.', emoji: '🧥' },
      { text: 'Mom gets wet. Jai gives Mom the coat!', emoji: '💕' },
    ],
    questions: [
      { q: 'What colour is the coat?', line: 0, answer: C('red', '🔴'), wrong: [C('green', '🟢'), C('blue', '🔵')] },
      { q: 'What happens on the road?', line: 2, answer: C('it rains', '🌧️'), wrong: [C('it snows', '❄️'), C('it is hot', '☀️')] },
    ],
  },
  {
    id: 'gail-sheep', title: 'Feed the Sheep', emoji: '🐑', pattern: 'vowelTeams',
    lines: [
      { text: 'Gail and Neel feed the sheep.', emoji: '🐑' },
      { text: 'The sheep need oats.', emoji: '🌾' },
      { text: 'Neel fills a pail with oats.', emoji: '🪣' },
      { text: 'One sheep jumps and runs.', emoji: '🐑' },
      { text: 'Gail and Neel chase the sheep!', emoji: '🏃' },
    ],
    questions: [
      { q: 'What do the sheep need?', line: 1, answer: C('oats', '🌾'), wrong: [C('cake', '🎂'), C('fish', '🐟')] },
      { q: 'What does Neel fill?', line: 2, answer: C('a pail', '🪣'), wrong: [C('a boat', '⛵'), C('a cup', '☕')] },
    ],
  },
];
