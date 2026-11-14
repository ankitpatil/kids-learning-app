// Short decodable stories for Story Choose (#19). Each story only uses words from its phonics
// pattern (or an earlier one) plus tricky words from the Sight-Word Catch lists; a test checks this.
// Every question's answer appears in the story line it points at, so the hint can highlight it.

/** Reading patterns in teaching order (these are also the Word Detective track ids). */
export const PATTERNS = ['cvc', 'digraphs', 'blends', 'silentE', 'vowelTeams'] as const;
export type Pattern = (typeof PATTERNS)[number];

/** An answer choice. Words only, no picture: the child answers by reading/listening (SPEC "Stories"). */
export interface StoryChoice {
  text: string;
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
  /** One sentence per line. Text only: no pictures beside the lines, so a child can't match a picture to an answer (SPEC "Stories"). */
  lines: { text: string }[];
  questions: StoryQuestion[];
}

const C = (text: string): StoryChoice => ({ text });

export const STORIES: Story[] = [
  // ---------- CVC ----------
  {
    id: 'sam-cat', title: 'Sam and the Cat', emoji: '🐱', pattern: 'cvc',
    lines: [
      { text: 'Sam has a fat cat.' },
      { text: 'Sam got a big red hat.' },
      { text: 'The cat sat in the hat!' },
      { text: 'Sam put on the hat.' },
      { text: 'Yes! Sam has a hat and a cat!' },
    ],
    questions: [
      { q: 'What did Sam get?', line: 1, answer: C('a hat'), wrong: [C('a cup'), C('a bag')] },
      { q: 'Where did the cat sit?', line: 2, answer: C('in the hat'), wrong: [C('in the box'), C('on the bed')] },
    ],
  },
  {
    id: 'raj-bus', title: 'Raj on the Bus', emoji: '🚌', pattern: 'cvc',
    lines: [
      { text: 'Raj got on the bus.' },
      { text: 'The bus is big and red.' },
      { text: 'A pig got on the bus!' },
      { text: 'The fat pig sat on Raj.' },
      { text: 'The pig got off at the mud!' },
    ],
    questions: [
      { q: 'Who got on the bus with Raj?', line: 2, answer: C('a pig'), wrong: [C('a dog'), C('a cat')] },
      { q: 'What colour is the bus?', line: 1, answer: C('red'), wrong: [C('blue'), C('green')] },
    ],
  },
  {
    id: 'meg-pup', title: 'Meg and the Pup', emoji: '🐶', pattern: 'cvc',
    lines: [
      { text: 'Meg has a pup.' },
      { text: 'The pup can dig.' },
      { text: 'The pup dug in the mud.' },
      { text: 'Meg put the pup in the tub.' },
      { text: 'The pup hops out. Meg is in the tub!' },
    ],
    questions: [
      { q: 'What did the pup dig in?', line: 2, answer: C('mud'), wrong: [C('a box'), C('a bed')] },
      { q: 'Where did Meg put the pup?', line: 3, answer: C('in the tub'), wrong: [C('on the bus'), C('in a box')] },
    ],
  },
  {
    id: 'fox-box', title: 'The Fox and the Box', emoji: '🦊', pattern: 'cvc',
    lines: [
      { text: 'A fox sat on a log.' },
      { text: 'The fox can see a big box.' },
      { text: 'The fox got in the box.' },
      { text: 'The box hops and hops!' },
      { text: 'It is not a box. It is a fox!' },
    ],
    questions: [
      { q: 'What did the fox sit on?', line: 0, answer: C('a log'), wrong: [C('a bus'), C('a bed')] },
      { q: 'Where did the fox go?', line: 2, answer: C('in the box'), wrong: [C('on the bus'), C('in the sun')] },
    ],
  },
  {
    id: 'ben-sun', title: 'Ben in the Sun', emoji: '☀️', pattern: 'cvc',
    lines: [
      { text: 'It is hot in the sun.' },
      { text: 'Ben has a big hat.' },
      { text: 'Ben sips from a cup.' },
      { text: 'Then Ben naps in the sun.' },
      { text: 'Ben gets up. Six cats nap on him!' },
    ],
    questions: [
      { q: 'Was it hot or cold?', line: 0, answer: C('hot'), wrong: [C('cold')] },
      { q: 'What did Ben do in the sun?', line: 3, answer: C('nap'), wrong: [C('run'), C('dig')] },
    ],
  },
  {
    id: 'ved-jam', title: 'Ved and the Jam', emoji: '🍞', pattern: 'cvc',
    lines: [
      { text: 'Ved has a bun.' },
      { text: 'Mom got jam.' },
      { text: 'Ved put jam on the bun.' },
      { text: 'A big bug sat on the jam!' },
      { text: 'Ved had the bun. The bug had the jam!' },
    ],
    questions: [
      { q: 'What did Mom get?', line: 1, answer: C('jam'), wrong: [C('a cup'), C('a hat')] },
      { q: 'What sat on the jam?', line: 3, answer: C('a bug'), wrong: [C('a cat'), C('a pig')] },
    ],
  },
  {
    id: 'kim-hen', title: 'Kim and the Hen', emoji: '🐔', pattern: 'cvc',
    lines: [
      { text: 'Kim has a hen.' },
      { text: 'The hen is red.' },
      { text: 'Kim fed the hen.' },
      { text: 'The hen hops on the bus.' },
      { text: 'Kim ran and ran. The hen had a nap!' },
    ],
    questions: [
      { q: 'What colour is the hen?', line: 1, answer: C('red'), wrong: [C('blue'), C('green')] },
      { q: 'Where does the hen hop?', line: 3, answer: C('on the bus'), wrong: [C('in the mud'), C('on a log')] },
    ],
  },
  {
    id: 'dev-van', title: 'Dev and the Van', emoji: '🚐', pattern: 'cvc',
    lines: [
      { text: 'Dad has a tan van.' },
      { text: 'Dev got in the van.' },
      { text: 'It is wet. The van is in mud!' },
      { text: 'Dev and Dad dig and dig.' },
      { text: 'The van can go. Dev and Dad are mud!' },
    ],
    questions: [
      { q: 'What colour is the van?', line: 0, answer: C('tan'), wrong: [C('red'), C('pink')] },
      { q: 'Where is the van stuck?', line: 2, answer: C('in the mud'), wrong: [C('in the sun'), C('on a hill')] },
    ],
  },
  {
    id: 'pam-pig', title: 'Pam and the Pig', emoji: '🐷', pattern: 'cvc',
    lines: [
      { text: 'Pam has a pet pig.' },
      { text: 'Pam got a big tub.' },
      { text: 'The pig hid in the tub!' },
      { text: 'Pam got the pig a cup.' },
      { text: 'The pig sits in the tub and sips pop!' },
    ],
    questions: [
      { q: 'What pet does Pam have?', line: 0, answer: C('a pig'), wrong: [C('a cat'), C('a dog')] },
      { q: 'Where did the pig hide?', line: 2, answer: C('in the tub'), wrong: [C('in a box'), C('in the van')] },
    ],
  },
  {
    id: 'ram-rug', title: 'The Big Rug', emoji: '🧶', pattern: 'cvc',
    lines: [
      { text: 'Ram has a big rug.' },
      { text: 'Mom said, Sit on the rug.' },
      { text: 'Ram and his cat sit.' },
      { text: 'Zip, zip! The rug zips up and off!' },
      { text: 'Mom said, Ram, the rug is not a jet!' },
    ],
    questions: [
      { q: 'Who sat with Ram?', line: 2, answer: C('his cat'), wrong: [C('his dog'), C('a hen')] },
      { q: 'Where did Mom say to sit?', line: 1, answer: C('on the rug'), wrong: [C('on the bus'), C('in bed')] },
    ],
  },
  {
    id: 'jen-mop', title: 'Jen Can Mop', emoji: '🧹', pattern: 'cvc',
    lines: [
      { text: 'Jen had a cup of pop.' },
      { text: 'Bam! The pop is on the mat.' },
      { text: 'Jen got a mop.' },
      { text: 'The dog got the pop. Lap, lap!' },
      { text: 'Jen said, Dog, you are a mop!' },
    ],
    questions: [
      { q: 'What did Jen have?', line: 0, answer: C('a cup of pop'), wrong: [C('a bun'), C('a hat')] },
      { q: 'What did Jen get?', line: 2, answer: C('a mop'), wrong: [C('a pen'), C('a box')] },
    ],
  },
  {
    id: 'gus-wig', title: 'Gus and the Wig', emoji: '🐕', pattern: 'cvc',
    lines: [
      { text: 'Gus has a big red wig.' },
      { text: 'Gus put the wig on his dog.' },
      { text: 'The dog ran to the bus.' },
      { text: 'The kids on the bus sat up.' },
      { text: 'Is that a dog in a wig? Yes!' },
    ],
    questions: [
      { q: 'What colour is the wig?', line: 0, answer: C('red'), wrong: [C('blue'), C('green')] },
      { q: 'Where did the dog run?', line: 2, answer: C('to the bus'), wrong: [C('to the bed'), C('to the van')] },
    ],
  },
  {
    id: 'pip-yak', title: 'Pip the Yak', emoji: '🐂', pattern: 'cvc',
    lines: [
      { text: 'Pip is a big yak.' },
      { text: 'Pip got a pot and a lid.' },
      { text: 'Bam! Bam! Pip hit the pot.' },
      { text: 'The kids ran to see.' },
      { text: 'The kids sat. The yak did a jig!' },
    ],
    questions: [
      { q: 'What did Pip get?', line: 1, answer: C('a pot and a lid'), wrong: [C('a cup'), C('a mop')] },
      { q: 'What did the yak do?', line: 4, answer: C('a jig'), wrong: [C('a nap'), C('a hop')] },
    ],
  },

  // ---------- Digraphs (sh ch th ck, ll ss ff) ----------
  {
    id: 'josh-ship', title: 'The Big Ship', emoji: '🚢', pattern: 'digraphs',
    lines: [
      { text: 'Josh is on a ship.' },
      { text: 'Josh can see a fish.' },
      { text: 'The fish has a red fin.' },
      { text: 'Josh gets a shell.' },
      { text: 'The shell can sing! Ding, dong, ding!' },
    ],
    questions: [
      { q: 'Where is Josh?', line: 0, answer: C('on a ship'), wrong: [C('on a bus'), C('in a shop')] },
      { q: 'What did Josh get?', line: 3, answer: C('a shell'), wrong: [C('a fish'), C('a rock')] },
    ],
  },
  {
    id: 'chen-chick', title: 'Chen and the Chick', emoji: '🐥', pattern: 'digraphs',
    lines: [
      { text: 'Chen has a chick.' },
      { text: 'The chick can peck.' },
      { text: 'The chick pecks at the dish.' },
      { text: 'Chen fills the dish.' },
      { text: 'Peck! The chick pecks Chen on the chin!' },
    ],
    questions: [
      { q: 'What does Chen have?', line: 0, answer: C('a chick'), wrong: [C('a duck'), C('a fish')] },
      { q: 'What did the chick peck at?', line: 2, answer: C('the dish'), wrong: [C('the bell'), C('the shell')] },
    ],
  },
  {
    id: 'duck-path', title: 'Duck on the Path', emoji: '🦆', pattern: 'digraphs',
    lines: [
      { text: 'A duck is on the path.' },
      { text: 'The duck can get a bug.' },
      { text: 'Then the duck sits in the shed.' },
      { text: 'Then Dad gets in the shed.' },
      { text: 'The duck yells, Dad! This is my shed!' },
    ],
    questions: [
      { q: 'What did the duck get?', line: 1, answer: C('a bug'), wrong: [C('a fish'), C('a chip')] },
      { q: 'Where did the duck sit?', line: 2, answer: C('in the shed'), wrong: [C('on a ship'), C('in the bath')] },
    ],
  },
  {
    id: 'ash-ball', title: 'Ash Hits the Ball', emoji: '🏏', pattern: 'digraphs',
    lines: [
      { text: 'Ash has a bat and a ball.' },
      { text: 'Dad will toss the ball.' },
      { text: 'Ash hit the ball. Whack!' },
      { text: 'The ball is up on the hill.' },
      { text: 'The dog gets the ball and yells, Six!' },
    ],
    questions: [
      { q: 'Who will toss the ball?', line: 1, answer: C('Dad'), wrong: [C('Mom'), C('a duck')] },
      { q: 'Where is the ball?', line: 3, answer: C('on the hill'), wrong: [C('in the bag'), C('on the bus')] },
    ],
  },
  {
    id: 'beth-fish', title: 'Beth at the Fish Shop', emoji: '🐟', pattern: 'digraphs',
    lines: [
      { text: 'Beth and Mom go to the shop.' },
      { text: 'The shop has pet fish.' },
      { text: 'Beth can see a big red fish.' },
      { text: 'Mom got the fish in a dish.' },
      { text: 'Then the fish sings in the bath!' },
    ],
    questions: [
      { q: 'Where did Beth and Mom go?', line: 0, answer: C('the shop'), wrong: [C('the bus'), C('the hill')] },
      { q: 'What did Mom get?', line: 3, answer: C('the fish'), wrong: [C('a duck'), C('a hat')] },
    ],
  },
  {
    id: 'chad-sock', title: 'Where Is the Sock?', emoji: '🧦', pattern: 'digraphs',
    lines: [
      { text: 'Chad has one red sock.' },
      { text: 'Where is the sock?' },
      { text: 'It is not in the shed.' },
      { text: 'Look! The pup has the sock.' },
      { text: 'Rip! Chad has a sock. The pup has one!' },
    ],
    questions: [
      { q: 'What colour is the sock?', line: 0, answer: C('red'), wrong: [C('blue'), C('green')] },
      { q: 'Who has the sock?', line: 3, answer: C('the pup'), wrong: [C('a cat'), C('Mom')] },
    ],
  },
  {
    id: 'king-ring', title: 'The King and the Ring', emoji: '👑', pattern: 'digraphs',
    lines: [
      { text: 'A king had a ring.' },
      { text: 'The ring fell in the well!' },
      { text: 'A duck sat on the well.' },
      { text: 'The duck got the ring.' },
      { text: 'The duck put on the ring. Yes, King Duck!' },
    ],
    questions: [
      { q: 'Where did the ring fall?', line: 1, answer: C('in the well'), wrong: [C('in the bath'), C('in the shop')] },
      { q: 'Who got the ring?', line: 3, answer: C('the duck'), wrong: [C('the king'), C('a fish')] },
    ],
  },
  {
    id: 'seth-chips', title: 'Seth and the Chips', emoji: '🍟', pattern: 'digraphs',
    lines: [
      { text: 'Seth has ten chips.' },
      { text: 'His pal Shan has six chips.' },
      { text: 'Seth will give Shan two.' },
      { text: 'Then the two pals sit and chat.' },
      { text: 'Then a big duck gets all the chips!' },
    ],
    questions: [
      { q: 'How many chips does Seth have?', line: 0, answer: C('ten'), wrong: [C('six'), C('two')] },
      { q: 'What do the pals do?', line: 3, answer: C('sit and chat'), wrong: [C('run and jump'), C('nap')] },
    ],
  },
  {
    id: 'chip-nap', title: 'The Long Nap', emoji: '🐶', pattern: 'digraphs',
    lines: [
      { text: 'Chip the dog had a nap.' },
      { text: 'It was a long, long nap.' },
      { text: 'The cat rang a bell. Ding!' },
      { text: 'Chip did not get up.' },
      { text: 'Then Beth said, Chips! Up got Chip!' },
    ],
    questions: [
      { q: 'What did the cat ring?', line: 2, answer: C('a bell'), wrong: [C('a bus'), C('a dish')] },
      { q: 'What did Beth say?', line: 4, answer: C('Chips'), wrong: [C('Fish'), C('Ball')] },
    ],
  },
  {
    id: 'yak-bath', title: 'Bath for a Yak', emoji: '🛁', pattern: 'digraphs',
    lines: [
      { text: 'Ash has a pet yak.' },
      { text: 'The yak has much mud on it.' },
      { text: 'Ash gets the yak in the bath.' },
      { text: 'Rub, rub, rub! The mud is off.' },
      { text: 'Then the yak runs back in the mud!' },
    ],
    questions: [
      { q: 'What pet does Ash have?', line: 0, answer: C('a yak'), wrong: [C('a fish'), C('a duck')] },
      { q: 'Where does Ash put the yak?', line: 2, answer: C('in the bath'), wrong: [C('in the shed'), C('on a ship')] },
    ],
  },

  // ---------- Blends ----------
  {
    id: 'frog-pond', title: 'The Frog in the Pond', emoji: '🐸', pattern: 'blends',
    lines: [
      { text: 'A frog sits on a log in the pond.' },
      { text: 'The frog can jump and swim.' },
      { text: 'The frog spots a bug.' },
      { text: 'Snap! The frog gets the bug.' },
      { text: 'Yuck! The bug is a twig!' },
    ],
    questions: [
      { q: 'Where is the frog?', line: 0, answer: C('on a log'), wrong: [C('in a tree'), C('on a bus')] },
      { q: 'What was the bug, at the end?', line: 4, answer: C('a twig'), wrong: [C('a fish'), C('a drum')] },
    ],
  },
  {
    id: 'dev-drum', title: 'Dev and the Drum', emoji: '🥁', pattern: 'blends',
    lines: [
      { text: 'Dev has a drum.' },
      { text: 'Dev hits the drum. Bam! Bam!' },
      { text: 'His dad has a big brass bell.' },
      { text: 'Dev and his dad clap and sing.' },
      { text: 'The dog sings, Ruff! The band is a hit!' },
    ],
    questions: [
      { q: 'What does Dev have?', line: 0, answer: C('a drum'), wrong: [C('a bell'), C('a flag')] },
      { q: 'What does Dad have?', line: 2, answer: C('a bell'), wrong: [C('a drum'), C('a cup')] },
    ],
  },
  {
    id: 'fran-tent', title: 'The Camp Trip', emoji: '⛺', pattern: 'blends',
    lines: [
      { text: 'Fran and Dad went on a trip.' },
      { text: 'They set up a tent.' },
      { text: 'Fran had a plum and a snack.' },
      { text: 'At dusk, frogs sang.' },
      { text: 'Then Dad sang. The frogs got up and left!' },
    ],
    questions: [
      { q: 'What did they set up?', line: 1, answer: C('a tent'), wrong: [C('a shop'), C('a swing')] },
      { q: 'What sang at dusk?', line: 3, answer: C('frogs'), wrong: [C('ducks'), C('hens')] },
    ],
  },
  {
    id: 'drip-drop', title: 'Drip, Drop!', emoji: '🌧️', pattern: 'blends',
    lines: [
      { text: 'Drip, drop! It is wet.' },
      { text: 'Trish and Brad jump and splash.' },
      { text: 'Brad slips in the mud.' },
      { text: 'Trish helps him up.' },
      { text: 'Splat! Mom slips in the mud and grins!' },
    ],
    questions: [
      { q: 'What do Trish and Brad do?', line: 1, answer: C('jump and splash'), wrong: [C('sit and nap'), C('run to the bus')] },
      { q: 'Who helps Brad up?', line: 3, answer: C('Trish'), wrong: [C('Mom'), C('Dad')] },
    ],
  },
  {
    id: 'glen-plan', title: 'Glen Has a Plan', emoji: '🚀', pattern: 'blends',
    lines: [
      { text: 'Glen has a plan.' },
      { text: 'He will get a box and a lid.' },
      { text: 'Glen sits in the box.' },
      { text: 'Lift off! Glen zips past the sun.' },
      { text: 'Then Mom said, Glen, lunch!' },
    ],
    questions: [
      { q: 'What does Glen sit in?', line: 2, answer: C('the box'), wrong: [C('the tent'), C('a bus')] },
      { q: 'What did Mom call Glen for?', line: 4, answer: C('lunch'), wrong: [C('a bath'), C('a nap')] },
    ],
  },
  {
    id: 'fran-crab', title: 'The Crab on the Sand', emoji: '🦀', pattern: 'blends',
    lines: [
      { text: 'Fran is on the sand.' },
      { text: 'A crab runs past.' },
      { text: 'The crab can snap!' },
      { text: 'The crab grabs a hat.' },
      { text: 'The crab struts off in the hat!' },
    ],
    questions: [
      { q: 'What runs past Fran?', line: 1, answer: C('a crab'), wrong: [C('a frog'), C('a duck')] },
      { q: 'What did the crab grab?', line: 3, answer: C('a hat'), wrong: [C('a cup'), C('a drum')] },
    ],
  },
  {
    id: 'dev-lamps', title: 'Ten Lamps', emoji: '🪔', pattern: 'blends',
    lines: [
      { text: 'Mom and Dev lit lamps.' },
      { text: 'Dev lit ten lamps.' },
      { text: 'Ten lamps glint. It is grand!' },
      { text: 'Dad brings a big box of snacks.' },
      { text: 'Dad lifts the lid. The cat has the snacks!' },
    ],
    questions: [
      { q: 'How many lamps did Dev light?', line: 1, answer: C('ten'), wrong: [C('two'), C('six')] },
      { q: 'What does Dad bring?', line: 3, answer: C('a box of snacks'), wrong: [C('a drum'), C('a crab')] },
    ],
  },
  {
    id: 'brad-swim', title: 'Brad Can Swim', emoji: '🏊', pattern: 'blends',
    lines: [
      { text: 'Brad and Mom went to the pond.' },
      { text: 'Brad will swim.' },
      { text: 'Mom held his hand.' },
      { text: 'Brad kicks and kicks.' },
      { text: 'Splash! Mom is wet. Brad can swim!' },
    ],
    questions: [
      { q: 'Where did Brad and Mom go?', line: 0, answer: C('the pond'), wrong: [C('the shop'), C('the bus')] },
      { q: 'What did Mom hold?', line: 2, answer: C('his hand'), wrong: [C('his cap'), C('a drum')] },
    ],
  },
  {
    id: 'pig-dress', title: 'Pig in a Pink Dress', emoji: '👗', pattern: 'blends',
    lines: [
      { text: 'Pig has a pink dress.' },
      { text: 'Pig has a pink hat.' },
      { text: 'Pig gets in the mud. Splat!' },
      { text: 'The pink dress is mud!' },
      { text: 'Pig grins. Mud is the best dress!' },
    ],
    questions: [
      { q: 'What colour is the dress?', line: 0, answer: C('pink'), wrong: [C('red'), C('blue')] },
      { q: 'Where does Pig get in?', line: 2, answer: C('in the mud'), wrong: [C('in the bath'), C('on the bus')] },
    ],
  },
  {
    id: 'stan-gift', title: 'The Big Gift', emoji: '🎁', pattern: 'blends',
    lines: [
      { text: 'Stan has a gift for Gran.' },
      { text: 'It is in a big box.' },
      { text: 'Gran lifts the lid.' },
      { text: 'Pop! A frog jumps out!' },
      { text: 'Gran grins and said, Can it sing?' },
    ],
    questions: [
      { q: 'Who is the gift for?', line: 0, answer: C('Gran'), wrong: [C('Mom'), C('Dad')] },
      { q: 'What jumps out?', line: 3, answer: C('a frog'), wrong: [C('a cat'), C('a duck')] },
    ],
  },

  // ---------- Silent e ----------
  {
    id: 'kate-kite', title: 'Kate and the Kite', emoji: '🪁', pattern: 'silentE',
    lines: [
      { text: 'Kate has a kite.' },
      { text: 'The kite is red and white.' },
      { text: 'Kate runs up the hill.' },
      { text: 'The wind takes the kite up, up, up!' },
      { text: 'Look! A duck rides on the kite!' },
    ],
    questions: [
      { q: 'What does Kate have?', line: 0, answer: C('a kite'), wrong: [C('a bike'), C('a cake')] },
      { q: 'Where did Kate run?', line: 2, answer: C('up the hill'), wrong: [C('to the lake'), C('to the shop')] },
    ],
  },
  {
    id: 'mike-bike', title: 'A Bike Ride', emoji: '🚲', pattern: 'silentE',
    lines: [
      { text: 'Mike has a red bike.' },
      { text: 'Mike rides his bike to the lake.' },
      { text: 'At the lake, Mike spots a duck.' },
      { text: 'Mike has a bit of cake.' },
      { text: 'The duck takes the cake and rides off!' },
    ],
    questions: [
      { q: 'Where did Mike ride?', line: 1, answer: C('to the lake'), wrong: [C('to the shop'), C('up the hill')] },
      { q: 'What does the duck take?', line: 4, answer: C('the cake'), wrong: [C('a bug'), C('a kite')] },
    ],
  },
  {
    id: 'jane-cake', title: 'Jane Bakes a Cake', emoji: '🎂', pattern: 'silentE',
    lines: [
      { text: 'Jane will bake a cake.' },
      { text: 'She has a pan and a plate.' },
      { text: 'Pete came to help.' },
      { text: 'The cake is huge!' },
      { text: 'It is as big as Pete!' },
    ],
    questions: [
      { q: 'What will Jane bake?', line: 0, answer: C('a cake'), wrong: [C('a bun'), C('a pie')] },
      { q: 'Who came to help?', line: 2, answer: C('Pete'), wrong: [C('Mike'), C('Rose')] },
    ],
  },
  {
    id: 'rose-rope', title: 'Jump Rope', emoji: '🪢', pattern: 'silentE',
    lines: [
      { text: 'Rose has a long rope.' },
      { text: 'Rose and Kate skip in the lane.' },
      { text: 'Mike came and said, Can I?' },
      { text: 'Rose said, Yes! Hop in, Mike.' },
      { text: 'Mike skips and the rope wraps Mike up!' },
    ],
    questions: [
      { q: 'What does Rose have?', line: 0, answer: C('a rope'), wrong: [C('a kite'), C('a cake')] },
      { q: 'Who came to skip?', line: 2, answer: C('Mike'), wrong: [C('Pete'), C('Jane')] },
    ],
  },
  {
    id: 'pete-space', title: 'The Space Ride', emoji: '🚀', pattern: 'silentE',
    lines: [
      { text: 'Pete made a ship from a tube.' },
      { text: 'Pete and Jane ride in space.' },
      { text: 'They wave at the big sun.' },
      { text: 'Then they see a pup in a cape!' },
      { text: 'The pup said, Can I ride home with you?' },
    ],
    questions: [
      { q: 'What did Pete make?', line: 0, answer: C('a ship'), wrong: [C('a cake'), C('a kite')] },
      { q: 'What did they see?', line: 3, answer: C('a pup'), wrong: [C('a frog'), C('a duck')] },
    ],
  },
  {
    id: 'kate-lime', title: 'Grapes and a Lime', emoji: '🍋', pattern: 'silentE',
    lines: [
      { text: 'Mom has grapes and a lime.' },
      { text: 'Kate likes grapes.' },
      { text: 'Mike bit the lime.' },
      { text: 'Mike made a face!' },
      { text: 'Kate said, Here, take a grape!' },
    ],
    questions: [
      { q: 'Who likes grapes?', line: 1, answer: C('Kate'), wrong: [C('Mike'), C('Mom')] },
      { q: 'What did Mike bite?', line: 2, answer: C('the lime'), wrong: [C('a grape'), C('a cake')] },
    ],
  },
  {
    id: 'jane-hide', title: 'Can You Hide?', emoji: '🙈', pattern: 'silentE',
    lines: [
      { text: 'Jane and Pete hide.' },
      { text: 'Pete hides in the shed.' },
      { text: 'Jane hides in a crate.' },
      { text: 'Mike looks and looks.' },
      { text: 'Mike spots Jane. Pete naps in the shed!' },
    ],
    questions: [
      { q: 'Where does Pete hide?', line: 1, answer: C('in the shed'), wrong: [C('in the crate'), C('on the bike')] },
      { q: 'Who looks for them?', line: 3, answer: C('Mike'), wrong: [C('Rose'), C('Kate')] },
    ],
  },
  {
    id: 'mike-home', title: 'Time to Go Home', emoji: '🏠', pattern: 'silentE',
    lines: [
      { text: 'It is late.' },
      { text: 'The sun sets.' },
      { text: 'Mike and Rose ride home on bikes.' },
      { text: 'Mom has a plate of rice.' },
      { text: 'Mike, Rose and the cat dine at nine!' },
    ],
    questions: [
      { q: 'How do Mike and Rose get home?', line: 2, answer: C('on bikes'), wrong: [C('on a bus'), C('in a van')] },
      { q: 'What is on the plate?', line: 3, answer: C('rice'), wrong: [C('cake'), C('grapes')] },
    ],
  },
  {
    id: 'snake-cake', title: 'The Snake and the Cake', emoji: '🐍', pattern: 'silentE',
    lines: [
      { text: 'Jake bakes a cake.' },
      { text: 'He sets it on a plate.' },
      { text: 'A snake slides up to the cake.' },
      { text: 'The snake takes a bite.' },
      { text: 'Then the snake has a cake shape!' },
    ],
    questions: [
      { q: 'What does Jake bake?', line: 0, answer: C('a cake'), wrong: [C('a pie'), C('a bun')] },
      { q: 'What slides up to the cake?', line: 2, answer: C('a snake'), wrong: [C('a duck'), C('a pup')] },
    ],
  },
  {
    id: 'mule-flute', title: 'Duke and the Flute', emoji: '🎵', pattern: 'silentE',
    lines: [
      { text: 'Duke the mule has a flute.' },
      { text: 'Duke can make a tune.' },
      { text: 'The tune is fine. The tune is cute.' },
      { text: 'The pigs come to the gate.' },
      { text: 'Five pigs hum the tune with Duke!' },
    ],
    questions: [
      { q: 'What does Duke have?', line: 0, answer: C('a flute'), wrong: [C('a kite'), C('a bike')] },
      { q: 'Who comes to the gate?', line: 3, answer: C('the pigs'), wrong: [C('the ducks'), C('the cats')] },
    ],
  },

  // ---------- Vowel teams (ee ai oa) ----------
  {
    id: 'goat-rain', title: 'The Goat in the Rain', emoji: '🐐', pattern: 'vowelTeams',
    lines: [
      { text: 'A goat is in the rain.' },
      { text: 'The goat is wet. It wants a coat.' },
      { text: 'Jai gets the goat a coat.' },
      { text: 'The goat is snug in the coat.' },
      { text: 'The goat is not wet. Jai is wet!' },
    ],
    questions: [
      { q: 'What was the goat in?', line: 0, answer: C('the rain'), wrong: [C('the sun'), C('the mud')] },
      { q: 'What did Jai get for the goat?', line: 2, answer: C('a coat'), wrong: [C('a hat'), C('a boat')] },
    ],
  },
  {
    id: 'neel-boat', title: 'Sail the Boat', emoji: '⛵', pattern: 'vowelTeams',
    lines: [
      { text: 'Neel and his dad sail in a boat.' },
      { text: 'The boat floats on the lake.' },
      { text: 'Neel can see a big fish.' },
      { text: 'The fish jumps in the boat!' },
      { text: 'Then the fish sails the boat home!' },
    ],
    questions: [
      { q: 'Who is in the boat with Neel?', line: 0, answer: C('Dad'), wrong: [C('Mom'), C('a goat')] },
      { q: 'What did Neel see?', line: 2, answer: C('a big fish'), wrong: [C('a frog'), C('a ship')] },
    ],
  },
  {
    id: 'jai-train', title: 'Jai and the Train', emoji: '🚆', pattern: 'vowelTeams',
    lines: [
      { text: 'Jai and Mom wait for the train.' },
      { text: 'The train is late.' },
      { text: 'It rains and rains.' },
      { text: 'Then the train is here!' },
      { text: 'A goat steps off the train and waves!' },
    ],
    questions: [
      { q: 'What are Jai and Mom waiting for?', line: 0, answer: C('the train'), wrong: [C('the bus'), C('a boat')] },
      { q: 'Who steps off the train?', line: 4, answer: C('a goat'), wrong: [C('a cat'), C('a pig')] },
    ],
  },
  {
    id: 'neel-seeds', title: 'Neel and the Seeds', emoji: '🌱', pattern: 'vowelTeams',
    lines: [
      { text: 'Neel has a green tree.' },
      { text: 'A bee sits on the tree.' },
      { text: 'Neel sees three seeds.' },
      { text: 'He plants the seeds in the bath.' },
      { text: 'In one week, a tree is in the bath!' },
    ],
    questions: [
      { q: 'What sits on the tree?', line: 1, answer: C('a bee'), wrong: [C('a goat'), C('a cat')] },
      { q: 'How many seeds does Neel see?', line: 2, answer: C('three'), wrong: [C('two'), C('ten')] },
    ],
  },
  {
    id: 'gail-snail', title: 'Gail and the Snail', emoji: '🐌', pattern: 'vowelTeams',
    lines: [
      { text: 'Gail has a pet snail.' },
      { text: 'The snail sits on a pail.' },
      { text: 'Gail paints the pail green.' },
      { text: 'The snail slides off the pail.' },
      { text: 'Look! The snail is green!' },
    ],
    questions: [
      { q: 'What pet does Gail have?', line: 0, answer: C('a snail'), wrong: [C('a goat'), C('a frog')] },
      { q: 'What does Gail paint?', line: 2, answer: C('the pail'), wrong: [C('the boat'), C('the train')] },
    ],
  },
  {
    id: 'neel-toast', title: 'Toast for Dad', emoji: '🍞', pattern: 'vowelTeams',
    lines: [
      { text: 'Neel wakes up.' },
      { text: 'He makes toast for Dad.' },
      { text: 'He puts jam on the toast.' },
      { text: 'Then ten bees see the jam.' },
      { text: 'Dad and ten bees munch. Sweet!' },
    ],
    questions: [
      { q: 'What does Neel make?', line: 1, answer: C('toast'), wrong: [C('tea'), C('soup')] },
      { q: 'What goes on the toast?', line: 2, answer: C('jam'), wrong: [C('cheese'), C('rice')] },
    ],
  },
  {
    id: 'jai-coat', title: 'The Red Coat', emoji: '🧥', pattern: 'vowelTeams',
    lines: [
      { text: 'Jai has a red coat.' },
      { text: 'He and Mom go on the road.' },
      { text: 'It rains! Drip, drop!' },
      { text: 'Jai keeps snug in his coat.' },
      { text: 'Mom hops in the coat with Jai!' },
    ],
    questions: [
      { q: 'What colour is the coat?', line: 0, answer: C('red'), wrong: [C('green'), C('blue')] },
      { q: 'What happens on the road?', line: 2, answer: C('it rains'), wrong: [C('it snows'), C('it is hot')] },
    ],
  },
  {
    id: 'gail-sheep', title: 'Feed the Sheep', emoji: '🐑', pattern: 'vowelTeams',
    lines: [
      { text: 'Gail and Neel feed the sheep.' },
      { text: 'The sheep need oats.' },
      { text: 'Neel fills a pail with oats.' },
      { text: 'One sheep jumps in the pail!' },
      { text: 'Then the sheep sleeps in the pail!' },
    ],
    questions: [
      { q: 'What do the sheep need?', line: 1, answer: C('oats'), wrong: [C('cake'), C('fish')] },
      { q: 'What does Neel fill?', line: 2, answer: C('a pail'), wrong: [C('a boat'), C('a cup')] },
    ],
  },
  {
    id: 'toad-boat', title: 'Toad on a Boat', emoji: '🐸', pattern: 'vowelTeams',
    lines: [
      { text: 'A toad gets on a boat.' },
      { text: 'The toad has a coat and a pail.' },
      { text: 'Rain! The toad sails and sails.' },
      { text: 'A goat swims up to the boat.' },
      { text: 'The goat said, Help! I can not float!' },
    ],
    questions: [
      { q: 'What does the toad get on?', line: 0, answer: C('a boat'), wrong: [C('a train'), C('a bus')] },
      { q: 'Who swims up to the boat?', line: 3, answer: C('a goat'), wrong: [C('a sheep'), C('a fish')] },
    ],
  },
  {
    id: 'dee-sheep', title: 'Dee Can Not Sleep', emoji: '🐑', pattern: 'vowelTeams',
    lines: [
      { text: 'Dee the sheep can not sleep.' },
      { text: 'She sees goats jump a gate.' },
      { text: 'One goat, two goats, three goats.' },
      { text: 'Then the goats sleep on the grass.' },
      { text: 'Dee is still up! Sleep, Dee!' },
    ],
    questions: [
      { q: 'What does Dee see?', line: 1, answer: C('goats'), wrong: [C('pigs'), C('cats')] },
      { q: 'Where do the goats sleep?', line: 3, answer: C('on the grass'), wrong: [C('in a boat'), C('on a train')] },
    ],
  },
];
