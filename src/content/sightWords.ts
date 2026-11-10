// Tricky (sight) words, grouped by level. Based on the Dolch pre-primer, primer and first-grade lists,
// keeping the words that are hard to sound out. Each has a short spoken example sentence.
export interface SightWord {
  word: string;
  example: string;
}

const W = (word: string, example: string): SightWord => ({ word, example });

export const SIGHT_WORDS: SightWord[][] = [
  // Level 1 — pre-primer
  [
    W('the', 'The cat is big.'),
    W('a', 'I see a dog.'),
    W('to', 'We go to the park.'),
    W('you', 'I like you.'),
    W('is', 'The sun is hot.'),
    W('I', 'I can run.'),
    W('my', 'This is my hat.'),
    W('we', 'We can jump.'),
    W('go', 'Let us go home.'),
    W('see', 'I see a bird.'),
    W('look', 'Look at the frog!'),
    W('come', 'Come and play.'),
    W('here', 'Sit here with me.'),
    W('one', 'I have one ball.'),
    W('two', 'I have two hands.'),
    W('for', 'This gift is for you.'),
    W('where', 'Where is my sock?'),
    W('and', 'Mom and Dad sing.'),
  ],
  // Level 2 — primer
  [
    W('was', 'The cake was yummy.'),
    W('saw', 'I saw a big truck.'),
    W('said', 'She said hello.'),
    W('they', 'They like to swim.'),
    W('what', 'What is that?'),
    W('she', 'She has a red bike.'),
    W('he', 'He can kick the ball.'),
    W('are', 'We are friends.'),
    W('have', 'I have a pet fish.'),
    W('do', 'What do you want?'),
    W('there', 'There is a bug!'),
    W('want', 'I want a snack.'),
    W('who', 'Who is at the door?'),
    W('this', 'This is fun.'),
    W('that', 'That is my cup.'),
    W('out', 'The dog ran out.'),
    W('into', 'The frog hops into the pond.'),
    W('good', 'You did a good job.'),
  ],
  // Level 3 — first grade
  [
    W('of', 'I want a cup of milk.'),
    W('off', 'Turn off the light.'),
    W('could', 'I could see the moon.'),
    W('were', 'We were at the beach.'),
    W('once', 'Once, I saw a whale.'),
    W('some', 'Can I have some grapes?'),
    W('them', 'I gave them a hug.'),
    W('then', 'Then we went to bed.'),
    W('from', 'This card is from Grandma.'),
    W('know', 'I know the answer.'),
    W('put', 'Put on your shoes.'),
    W('any', 'Do you have any crayons?'),
    W('every', 'I read every night.'),
    W('again', 'Can we play again?'),
    W('walk', 'We walk to school.'),
    W('thank', 'Thank you for the gift.'),
    W('give', 'Please give me the ball.'),
    W('their', 'They hug their dog.'),
  ],
];

/** Look-alikes that young readers mix up (letters flipped, one letter different). */
export const SIGHT_CONFUSABLES: Record<string, string[]> = {
  was: ['saw', 'way'], saw: ['was', 'say'], of: ['off', 'for'], off: ['of', 'on'], for: ['from', 'of'],
  they: ['then', 'them'], then: ['them', 'they'], them: ['then', 'they'], there: ['three', 'where', 'their'],
  their: ['there', 'then'], where: ['were', 'there'], were: ['where', 'we'], what: ['that', 'want'],
  that: ['what', 'this'], want: ['what', 'went'], this: ['these', 'that'], said: ['sad', 'paid'],
  the: ['he', 'then'], he: ['the', 'she'], she: ['he', 'see'], see: ['she', 'sea'], to: ['two', 'do'],
  two: ['to', 'too'], do: ['to', 'go'], go: ['do', 'got'], you: ['your', 'yes'], is: ['it', 'in'],
  my: ['me', 'by'], we: ['me', 'were'], look: ['book', 'took'], come: ['came', 'some'], some: ['come', 'same'],
  here: ['her', 'there'], one: ['on', 'once'], once: ['one', 'ounce'], and: ['an', 'any'], any: ['and', 'many'],
  are: ['art', 'our'], have: ['has', 'had'], who: ['how', 'why'], out: ['our', 'cut'], into: ['onto', 'in'],
  good: ['food', 'goal'], could: ['cloud', 'would'], from: ['form', 'for'], know: ['now', 'knot'],
  put: ['but', 'pat'], every: ['very', 'ever'], again: ['against', 'gain'], walk: ['talk', 'wall'],
  thank: ['think', 'than'], give: ['live', 'gave'], a: ['an', 'at'], I: ['it', 'in'],
};
