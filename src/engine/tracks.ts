// Skill tracks: each game is a mechanic over one or more tracks; each track is an ordered list of
// level configs ("difficulty knobs"). Mastery is tracked per track per profile (skillStates).
export type Subject = 'math' | 'reading';
export type Representation = 'concrete' | 'pictorial' | 'abstract';

export interface LevelConfig {
  label: string;
  /** Number range (math) or pattern index (reading). Meaning is track-specific. */
  range: number;
  /** Concrete → pictorial → abstract (CPA). */
  representation: Representation;
  /** Far = clearly different wrong answers; near = look-alikes / minimal pairs / off-by-one. */
  distractors: 'far' | 'near';
  /** Hints, number line or ghost guides shown. */
  scaffold: boolean;
}

export interface TrackDef {
  id: string;
  subject: Subject;
  name: string;
  icon: string;
  /** True when a game can be played for this track today. */
  playable: boolean;
  levels: LevelConfig[];
}

const L = (label: string, range: number, representation: Representation, distractors: 'far' | 'near', scaffold: boolean): LevelConfig => ({
  label,
  range,
  representation,
  distractors,
  scaffold,
});

export const TRACKS: TrackDef[] = [
  // ---------- Math ----------
  {
    id: 'count', subject: 'math', name: 'Counting', icon: 'cookie', playable: true,
    levels: [3, 5, 7, 10, 15, 20].map((n, i) => L(`up to ${n}`, n, 'concrete', 'far', i < 2)),
  },
  {
    id: 'add10', subject: 'math', name: 'Add within 10', icon: 'plus', playable: true,
    levels: [L('within 5, pictures', 5, 'pictorial', 'far', true), L('within 10, pictures', 10, 'pictorial', 'near', true), L('within 10, numbers', 10, 'abstract', 'near', false)],
  },
  {
    id: 'sub10', subject: 'math', name: 'Subtract within 10', icon: 'minus', playable: true,
    levels: [L('within 5, pictures', 5, 'pictorial', 'far', true), L('within 10, pictures', 10, 'pictorial', 'near', true), L('within 10, numbers', 10, 'abstract', 'near', false)],
  },
  {
    id: 'missing', subject: 'math', name: 'Missing number', icon: 'red-question-mark', playable: true,
    levels: [L('a + __ = c to 10, pictures', 10, 'pictorial', 'far', true), L('a + __ = c to 10', 10, 'abstract', 'near', false), L('a + __ = c to 20', 20, 'abstract', 'near', false)],
  },
  {
    id: 'add20', subject: 'math', name: 'Add within 20', icon: 'keycap-10', playable: true,
    levels: [L('make 10, number line', 20, 'pictorial', 'near', true), L('within 20, numbers', 20, 'abstract', 'near', false)],
  },
  {
    id: 'sub20', subject: 'math', name: 'Subtract within 20', icon: 'input-numbers', playable: true,
    levels: [L('back to 10, number line', 20, 'pictorial', 'near', true), L('within 20, numbers', 20, 'abstract', 'near', false)],
  },
  {
    id: 'placeValue', subject: 'math', name: 'Tens and ones', icon: 'package', playable: true,
    levels: [L('to 50, boxes of 10', 50, 'pictorial', 'far', true), L('to 100, boxes of 10', 100, 'pictorial', 'near', false), L('to 100, words', 100, 'abstract', 'near', false)],
  },
  {
    id: 'compare2d', subject: 'math', name: 'More or fewer', icon: 'balance-scale', playable: true,
    levels: [L('far apart, boxes of 10', 100, 'pictorial', 'far', true), L('close numbers, boxes of 10', 100, 'pictorial', 'near', true), L('close numbers, numbers only', 100, 'abstract', 'near', false)],
  },
  {
    // Level = format: 0 pick the answer (pictures), 1 pick the number sentence, 2 build it (+/− then answer).
    id: 'wordProblems', subject: 'math', name: 'Story sums', icon: 'open-book', playable: true,
    levels: [L('get more / take away to 10, pictures', 10, 'pictorial', 'far', true), L('pick the number sentence, to 20', 20, 'abstract', 'near', false), L('build the number sentence, to 20', 20, 'abstract', 'near', false)],
  },
  {
    // #21 Fun at the Fair. Concrete = pay the exact price with coins/notes; pictorial/abstract = make change.
    id: 'money', subject: 'math', name: 'Money', icon: 'coin', playable: true,
    levels: [
      L('pay to 10, small coins, total shown', 10, 'concrete', 'far', true),
      L('pay to 20, coins and notes, total shown', 20, 'concrete', 'near', true),
      L('pay to 20, count it yourself', 20, 'concrete', 'near', false),
      L('change from 10, count up', 10, 'pictorial', 'far', true),
      L('change within 20', 20, 'abstract', 'near', false),
    ],
  },
  {
    // #22 Tick Tock Clock. range = minute positions used (1 o'clock, 2 + half past, 12 every 5 minutes).
    // Pictorial = read the clock, pick the digital time; abstract = see the time, pick the clock.
    id: 'time', subject: 'math', name: 'Clock', icon: 'one-oclock', playable: true,
    levels: [
      L("o'clock", 1, 'pictorial', 'far', true),
      L("o'clock and half past", 2, 'pictorial', 'far', true),
      L('o\'clock and half past, look-alikes', 2, 'pictorial', 'near', false),
      L('find the clock for the time', 2, 'abstract', 'near', false),
      L('5 minutes, fives shown', 12, 'pictorial', 'near', true),
      L('5 minutes', 12, 'pictorial', 'near', false),
    ],
  },
  { id: 'grouping', subject: 'math', name: 'Groups', icon: 'basket', playable: false, levels: [L('equal groups', 20, 'concrete', 'far', true)] },

  // ---------- Reading ----------
  {
    id: 'phonics', subject: 'reading', name: 'Letter sounds', icon: 'balloon', playable: true,
    levels: ['s a t p', '+ i n', '+ m d g o', '+ c k e u r', '+ h b f l j', '+ v w y z q', 'look-alikes'].map((label, i) =>
      L(label, i, 'concrete', i >= 4 ? 'near' : 'far', true),
    ),
  },
  { id: 'cvc', subject: 'reading', name: 'Short words', icon: 'cat-face', playable: true, levels: [L('cat, dog, sun', 0, 'pictorial', 'far', true), L('cat / cap / cot', 0, 'pictorial', 'near', false)] },
  { id: 'digraphs', subject: 'reading', name: 'sh ch th ck', icon: 'ship', playable: true, levels: [L('ship, fish, duck', 0, 'pictorial', 'far', true), L('ship / chip / sip', 0, 'pictorial', 'near', false)] },
  { id: 'blends', subject: 'reading', name: 'Blends', icon: 'frog', playable: true, levels: [L('frog, star, drum', 0, 'pictorial', 'far', true), L('crab / cab / grab', 0, 'pictorial', 'near', false)] },
  { id: 'silentE', subject: 'reading', name: 'Magic e', icon: 'kite', playable: true, levels: [L('kite, cake, bike', 0, 'pictorial', 'far', true), L('kite / kit / bite', 0, 'pictorial', 'near', false), L('cap / cape switch', 0, 'pictorial', 'near', false)] },
  { id: 'vowelTeams', subject: 'reading', name: 'ee ai oa', icon: 'sailboat', playable: true, levels: [L('boat, rain, feet', 0, 'pictorial', 'far', true), L('boat / bat / coat', 0, 'pictorial', 'near', false)] },
  {
    id: 'endings', subject: 'reading', name: '-s -ed -ing', icon: 'person-running', playable: true,
    levels: [L('jumps, jumping (read to you)', 2, 'pictorial', 'far', true), L('jumps, jumped, jumping (read to you)', 3, 'pictorial', 'near', true), L('-s -ed -ing, read it yourself', 3, 'abstract', 'near', false)],
  },
  {
    id: 'sightWords', subject: 'reading', name: 'Tricky words', icon: 'eyes', playable: true,
    levels: [L('the, you, where', 0, 'abstract', 'far', false), L('was, they, said', 1, 'abstract', 'near', false), L('of, could, once', 2, 'abstract', 'near', false)],
  },
  { id: 'sentences', subject: 'reading', name: 'Sentences', icon: 'speech-balloon', playable: true, levels: [L('finish it, with a picture', 0, 'pictorial', 'far', true), L('finish it, look-alike words', 0, 'abstract', 'near', false)] },
  {
    // range = hardest phonics pattern allowed (index into content/stories PATTERNS: 0 cvc … 4 vowel teams).
    id: 'stories', subject: 'reading', name: 'Stories', icon: 'books', playable: true,
    levels: [L('short-word stories, read to you', 0, 'pictorial', 'far', true), L('sh, ch, blends: you read, help on tap', 2, 'pictorial', 'near', true), L('magic e, ee ai oa: read it yourself', 4, 'abstract', 'near', false)],
  },
];

// ---------- Suggested age per level (US Common Core K–2) ----------
export type AgeBand = 'a34' | 'a45' | 'a56';
export const AGE_BANDS: { id: AgeBand; ages: string; grade: string }[] = [
  { id: 'a34', ages: 'Ages 3–4', grade: 'Preschool' },
  { id: 'a45', ages: 'Ages 4–5', grade: 'Pre-K' },
  { id: 'a56', ages: 'Ages 5–6', grade: 'Kindergarten and up' },
];

/**
 * Suggested band for each level of each track, in level order. The app targets bright kids aged 3–6
 * (Ankit, 2026-11-15): Ages 5–6 is the top band and holds everything from Kindergarten up (reading
 * stories and answering questions, within-20 math, tens & ones); the first letter sounds and counting
 * start at 3–4. The adaptive engine still sets the pace; bands only group levels on Level Select.
 */
export const LEVEL_AGES: Record<string, AgeBand[]> = {
  count: ['a34', 'a34', 'a45', 'a45', 'a56', 'a56'], // to 3, 5 | 7, 10 | 15, 20
  add10: ['a45', 'a45', 'a56'], // pictures | numbers only
  sub10: ['a45', 'a45', 'a56'],
  missing: ['a45', 'a56', 'a56'],
  add20: ['a56', 'a56'],
  sub20: ['a56', 'a56'],
  placeValue: ['a56', 'a56', 'a56'],
  compare2d: ['a56', 'a56', 'a56'],
  wordProblems: ['a45', 'a56', 'a56'],
  money: ['a56', 'a56', 'a56', 'a56', 'a56'], // money is CBSE Class 1–2 / US Grade 1–2
  time: ['a56', 'a56', 'a56', 'a56', 'a56', 'a56'], // hour / half hour = CBSE Class 1–2, US Grade 1; 5 minutes = Grade 2
  grouping: ['a56'],
  phonics: ['a34', 'a34', 'a45', 'a45', 'a45', 'a56', 'a56'], // s a t p, + i n | … | rare letters, look-alikes
  cvc: ['a45', 'a56'],
  digraphs: ['a56', 'a56'],
  blends: ['a56', 'a56'],
  silentE: ['a56', 'a56', 'a56'],
  vowelTeams: ['a56', 'a56'],
  endings: ['a56', 'a56', 'a56'],
  sightWords: ['a45', 'a56', 'a56'],
  sentences: ['a56', 'a56'],
  stories: ['a56', 'a56', 'a56'], // reading stories and answering questions: 5–6
};

/** Suggested age band for a level (falls back to the last known band, then the youngest). */
/**
 * Levels where the child reads the sentence or story on their own (Ankit, 2026-11-19). On these the app
 * doesn't narrate by itself (prompts, praise, reading the text back), even with talking switched on:
 * reading it is the point. Tapping 🔊, a word or the story card still reads it aloud, as help.
 * Value = the first such level of the track; tracks not listed never go quiet (letter sounds, single
 * words and tricky words are asked out loud: the spoken word is the question).
 */
export const READS_ALONE_FROM: Record<string, number> = {
  sentences: 0, // "Read the sentence. Which word fits?"
  endings: 2, // "-s -ed -ing, read it yourself" (levels 0–1 are read to you)
  stories: 1, // "you read, help on tap" and "read it yourself" (level 0 is read to you)
  wordProblems: 1, // number-sentence levels: the story is shown as text (level 0 is pictures)
};

export function readsAlone(trackId: string, level: number): boolean {
  const from = READS_ALONE_FROM[trackId];
  return from !== undefined && level >= from;
}

export function levelAge(trackId: string, level: number): AgeBand {
  const bands = LEVEL_AGES[trackId] ?? [];
  return bands[Math.min(level, bands.length - 1)] ?? 'a34';
}

/** Level indexes of a track that fall in an age band (in order). */
export function levelsInBand(t: TrackDef, band: AgeBand): number[] {
  return t.levels.map((_, i) => i).filter((i) => levelAge(t.id, i) === band);
}

const BY_ID = new Map(TRACKS.map((t) => [t.id, t]));

export function getTrack(id: string): TrackDef {
  const t = BY_ID.get(id);
  if (!t) throw new Error(`Unknown track ${id}`);
  return t;
}

export function maxLevel(id: string): number {
  return getTrack(id).levels.length - 1;
}

export function getLevel(id: string, level: number): LevelConfig {
  const t = getTrack(id);
  return t.levels[Math.max(0, Math.min(level, t.levels.length - 1))];
}

export function tracksFor(subject: Subject): TrackDef[] {
  return TRACKS.filter((t) => t.subject === subject);
}

export const MASTERED = 0.85;

/**
 * Which track a subject's game should play next: the first playable track (in curriculum order)
 * that isn't mastered yet. A track counts as mastered at its top level with mastery > MASTERED.
 * Falls back to the last playable track when everything is mastered.
 */
export function pickTrack(subject: Subject, states: Record<string, { level: number; mastery: number } | undefined>): string {
  const playable = tracksFor(subject).filter((t) => t.playable);
  for (const t of playable) {
    const s = states[t.id];
    if (!s) return t.id;
    if (s.level < t.levels.length - 1 || s.mastery <= MASTERED) return t.id;
  }
  return playable[playable.length - 1].id;
}
