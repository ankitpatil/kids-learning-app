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
  emoji: string;
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
    id: 'count', subject: 'math', name: 'Counting', emoji: '🍪', playable: true,
    levels: [3, 5, 7, 10, 15, 20].map((n, i) => L(`up to ${n}`, n, 'concrete', 'far', i < 2)),
  },
  {
    id: 'add10', subject: 'math', name: 'Add within 10', emoji: '➕', playable: true,
    levels: [L('within 5, pictures', 5, 'pictorial', 'far', true), L('within 10, pictures', 10, 'pictorial', 'near', true), L('within 10, numbers', 10, 'abstract', 'near', false)],
  },
  {
    id: 'sub10', subject: 'math', name: 'Subtract within 10', emoji: '➖', playable: true,
    levels: [L('within 5, pictures', 5, 'pictorial', 'far', true), L('within 10, pictures', 10, 'pictorial', 'near', true), L('within 10, numbers', 10, 'abstract', 'near', false)],
  },
  {
    id: 'missing', subject: 'math', name: 'Missing number', emoji: '❓', playable: true,
    levels: [L('a + __ = c to 10, pictures', 10, 'pictorial', 'far', true), L('a + __ = c to 10', 10, 'abstract', 'near', false), L('a + __ = c to 20', 20, 'abstract', 'near', false)],
  },
  {
    id: 'add20', subject: 'math', name: 'Add within 20', emoji: '🔟', playable: true,
    levels: [L('make 10, number line', 20, 'pictorial', 'near', true), L('within 20, numbers', 20, 'abstract', 'near', false)],
  },
  {
    id: 'sub20', subject: 'math', name: 'Subtract within 20', emoji: '🔢', playable: true,
    levels: [L('back to 10, number line', 20, 'pictorial', 'near', true), L('within 20, numbers', 20, 'abstract', 'near', false)],
  },
  {
    id: 'placeValue', subject: 'math', name: 'Tens and ones', emoji: '📦', playable: true,
    levels: [L('to 50, boxes of 10', 50, 'pictorial', 'far', true), L('to 100, boxes of 10', 100, 'pictorial', 'near', false), L('to 100, words', 100, 'abstract', 'near', false)],
  },
  {
    id: 'compare2d', subject: 'math', name: 'More or fewer', emoji: '⚖️', playable: true,
    levels: [L('far apart, boxes of 10', 100, 'pictorial', 'far', true), L('close numbers, boxes of 10', 100, 'pictorial', 'near', true), L('close numbers, numbers only', 100, 'abstract', 'near', false)],
  },
  {
    // Level = format: 0 pick the answer (pictures), 1 pick the number sentence, 2 build it (+/− then answer).
    id: 'wordProblems', subject: 'math', name: 'Story sums', emoji: '📖', playable: true,
    levels: [L('get more / take away to 10, pictures', 10, 'pictorial', 'far', true), L('pick the number sentence, to 20', 20, 'abstract', 'near', false), L('build the number sentence, to 20', 20, 'abstract', 'near', false)],
  },
  { id: 'money', subject: 'math', name: 'Money', emoji: '🪙', playable: false, levels: [L('pay exact', 20, 'concrete', 'far', true)] },
  { id: 'time', subject: 'math', name: 'Clock', emoji: '🕐', playable: false, levels: [L('hour and half hour', 12, 'pictorial', 'far', true)] },
  { id: 'grouping', subject: 'math', name: 'Groups', emoji: '🧺', playable: false, levels: [L('equal groups', 20, 'concrete', 'far', true)] },

  // ---------- Reading ----------
  {
    id: 'phonics', subject: 'reading', name: 'Letter sounds', emoji: '🎈', playable: true,
    levels: ['s a t p', '+ i n', '+ m d g o', '+ c k e u r', '+ h b f l j', '+ v w y z q', 'look-alikes'].map((label, i) =>
      L(label, i, 'concrete', i >= 4 ? 'near' : 'far', true),
    ),
  },
  { id: 'cvc', subject: 'reading', name: 'Short words', emoji: '🐱', playable: true, levels: [L('cat, dog, sun', 0, 'pictorial', 'far', true), L('cat / cap / cot', 0, 'pictorial', 'near', false)] },
  { id: 'digraphs', subject: 'reading', name: 'sh ch th ck', emoji: '🚢', playable: true, levels: [L('ship, fish, duck', 0, 'pictorial', 'far', true), L('ship / chip / sip', 0, 'pictorial', 'near', false)] },
  { id: 'blends', subject: 'reading', name: 'Blends', emoji: '🐸', playable: true, levels: [L('frog, star, drum', 0, 'pictorial', 'far', true), L('crab / cab / grab', 0, 'pictorial', 'near', false)] },
  { id: 'silentE', subject: 'reading', name: 'Magic e', emoji: '🪁', playable: true, levels: [L('kite, cake, bike', 0, 'pictorial', 'far', true), L('kite / kit / bite', 0, 'pictorial', 'near', false), L('cap / cape switch', 0, 'pictorial', 'near', false)] },
  { id: 'vowelTeams', subject: 'reading', name: 'ee ai oa', emoji: '⛵', playable: true, levels: [L('boat, rain, feet', 0, 'pictorial', 'far', true), L('boat / bat / coat', 0, 'pictorial', 'near', false)] },
  {
    id: 'endings', subject: 'reading', name: '-s -ed -ing', emoji: '🏃', playable: true,
    levels: [L('jumps, jumping (read to you)', 2, 'pictorial', 'far', true), L('jumps, jumped, jumping (read to you)', 3, 'pictorial', 'near', true), L('-s -ed -ing, read it yourself', 3, 'abstract', 'near', false)],
  },
  {
    id: 'sightWords', subject: 'reading', name: 'Tricky words', emoji: '👀', playable: true,
    levels: [L('the, you, where', 0, 'abstract', 'far', false), L('was, they, said', 1, 'abstract', 'near', false), L('of, could, once', 2, 'abstract', 'near', false)],
  },
  { id: 'sentences', subject: 'reading', name: 'Sentences', emoji: '💬', playable: true, levels: [L('finish it, with a picture', 0, 'pictorial', 'far', true), L('finish it, look-alike words', 0, 'abstract', 'near', false)] },
  {
    // range = hardest phonics pattern allowed (index into content/stories PATTERNS: 0 cvc … 4 vowel teams).
    id: 'stories', subject: 'reading', name: 'Stories', emoji: '📚', playable: true,
    levels: [L('short-word stories, read to you', 0, 'pictorial', 'far', true), L('sh, ch, blends: you read, help on tap', 2, 'pictorial', 'near', true), L('magic e, ee ai oa: read it yourself', 4, 'abstract', 'near', false)],
  },
];

// ---------- Suggested age per level (US Common Core K–2) ----------
export type AgeBand = 'k' | 'g1' | 'g2';
export const AGE_BANDS: { id: AgeBand; ages: string; grade: string }[] = [
  { id: 'k', ages: 'Ages 5–6', grade: 'K–Grade 1 skills' },
  { id: 'g1', ages: 'Ages 6–7', grade: 'Grade 1–2 skills' },
  { id: 'g2', ages: 'Ages 7–8', grade: 'Grade 2+ skills' },
];

/**
 * Suggested band for each level of each track, in level order. Calibrated for an advanced learner
 * (Ankit, 2026-11-15): roughly a grade ahead of US Common Core (K.CC/K.OA/1.OA/1.NBT, K.RF/1.RF/2.RF),
 * and reading stories + answering questions is a 5–6 skill. The adaptive engine still sets the pace;
 * these bands only group levels on the Level Select screen.
 */
export const LEVEL_AGES: Record<string, AgeBand[]> = {
  count: ['k', 'k', 'k', 'k', 'k', 'k'],
  add10: ['k', 'k', 'k'],
  sub10: ['k', 'k', 'k'],
  missing: ['k', 'k', 'g1'],
  add20: ['k', 'g1'], // make 10 on a number line at 5–6; numbers only at 6–7
  sub20: ['g1', 'g1'],
  placeValue: ['k', 'g1', 'g1'],
  compare2d: ['k', 'g1', 'g1'],
  wordProblems: ['k', 'k', 'g1'],
  money: ['g1'],
  time: ['g1'],
  grouping: ['g1'],
  phonics: ['k', 'k', 'k', 'k', 'k', 'k', 'k'],
  cvc: ['k', 'k'],
  digraphs: ['k', 'k'],
  blends: ['k', 'k'],
  silentE: ['k', 'g1', 'g1'],
  vowelTeams: ['g1', 'g1'],
  endings: ['k', 'g1', 'g1'],
  sightWords: ['k', 'k', 'g1'],
  sentences: ['k', 'g1'],
  stories: ['k', 'k', 'k'], // all story levels: reading stories and answering questions at 5–6
};

/** Suggested age band for a level (falls back to the last known band, then K). */
export function levelAge(trackId: string, level: number): AgeBand {
  const bands = LEVEL_AGES[trackId] ?? [];
  return bands[Math.min(level, bands.length - 1)] ?? 'k';
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
