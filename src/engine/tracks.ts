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
    id: 'compare2d', subject: 'math', name: 'Bigger or smaller', emoji: '⚖️', playable: false,
    levels: [L('to 100', 100, 'abstract', 'far', false), L('to 100, close numbers', 100, 'abstract', 'near', false)],
  },
  { id: 'wordProblems', subject: 'math', name: 'Story sums', emoji: '📖', playable: false, levels: [L('one step', 20, 'pictorial', 'far', true)] },
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
  { id: 'stories', subject: 'reading', name: 'Stories', emoji: '📚', playable: false, levels: [L('short stories', 0, 'abstract', 'far', true)] },
];

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
