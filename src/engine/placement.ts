// Placement test: binary search over an ordered list of checkpoints (track, level) per subject.
// Each probe asks up to 3 items: 2/2 passes, 0/2 fails, 1/1 split asks a tie-breaker.
import { maxLevel, tracksFor, type Subject } from './tracks';

export interface Checkpoint {
  trackId: string;
  level: number;
}

export const CHECKPOINTS: Record<Subject, Checkpoint[]> = {
  math: [
    { trackId: 'count', level: 3 },
    { trackId: 'count', level: 5 },
    { trackId: 'add10', level: 1 },
    { trackId: 'sub10', level: 1 },
    { trackId: 'add10', level: 2 },
    { trackId: 'sub10', level: 2 },
    { trackId: 'missing', level: 1 },
    { trackId: 'add20', level: 1 },
    { trackId: 'sub20', level: 1 },
    { trackId: 'placeValue', level: 1 },
    { trackId: 'placeValue', level: 2 },
    { trackId: 'compare2d', level: 2 },
  ],
  reading: [
    { trackId: 'phonics', level: 1 },
    { trackId: 'phonics', level: 3 },
    { trackId: 'phonics', level: 6 },
    { trackId: 'cvc', level: 0 },
    { trackId: 'cvc', level: 1 },
    { trackId: 'digraphs', level: 0 },
    { trackId: 'digraphs', level: 1 },
    { trackId: 'blends', level: 0 },
    { trackId: 'blends', level: 1 },
    { trackId: 'silentE', level: 0 },
    { trackId: 'silentE', level: 1 },
    { trackId: 'vowelTeams', level: 0 },
    { trackId: 'vowelTeams', level: 1 },
  ],
};

export const MAX_PLACEMENT_ITEMS = 12;

export interface PlacementState {
  subject: Subject;
  lo: number;
  hi: number;
  /** Highest checkpoint index passed so far (-1 = none). */
  best: number;
  probeRight: number;
  probeWrong: number;
  asked: number;
}

export function startPlacement(subject: Subject): PlacementState {
  return { subject, lo: 0, hi: CHECKPOINTS[subject].length - 1, best: -1, probeRight: 0, probeWrong: 0, asked: 0 };
}

export function isDone(s: PlacementState): boolean {
  return s.lo > s.hi || s.asked >= MAX_PLACEMENT_ITEMS;
}

/** The checkpoint the next question should come from. */
export function currentCheckpoint(s: PlacementState): Checkpoint {
  return CHECKPOINTS[s.subject][Math.floor((s.lo + s.hi) / 2)];
}

export function answer(s: PlacementState, correct: boolean): PlacementState {
  if (isDone(s)) return s;
  const mid = Math.floor((s.lo + s.hi) / 2);
  const right = s.probeRight + (correct ? 1 : 0);
  const wrong = s.probeWrong + (correct ? 0 : 1);
  const asked = s.asked + 1;
  if (right >= 2) return { ...s, lo: mid + 1, best: Math.max(s.best, mid), probeRight: 0, probeWrong: 0, asked };
  if (wrong >= 2) return { ...s, hi: mid - 1, probeRight: 0, probeWrong: 0, asked };
  return { ...s, probeRight: right, probeWrong: wrong, asked };
}

/** Starting level for every track in the subject, given the highest passed checkpoint index. */
export function levelsFromCheckpoint(subject: Subject, best: number): Record<string, number> {
  const cps = CHECKPOINTS[subject];
  const out: Record<string, number> = {};
  for (const t of tracksFor(subject)) out[t.id] = 0;
  if (best < 0) return out;
  const passed = cps.slice(0, best + 1);
  for (const cp of passed) {
    // Passing a checkpoint means that level is known: start one above it (capped).
    out[cp.trackId] = Math.max(out[cp.trackId], Math.min(cp.level + 1, maxLevel(cp.trackId)));
  }
  // Tracks whose every checkpoint was passed are treated as fully mastered.
  for (const t of tracksFor(subject)) {
    const own = cps.map((c, i) => ({ c, i })).filter(({ c }) => c.trackId === t.id);
    if (own.length && own.every(({ i }) => i <= best)) out[t.id] = maxLevel(t.id);
  }
  return out;
}

/** Tracks whose every checkpoint was passed (start them as mastered, so the app moves past them). */
export function masteredFromCheckpoint(subject: Subject, best: number): string[] {
  const cps = CHECKPOINTS[subject];
  return tracksFor(subject)
    .map((t) => t.id)
    .filter((id) => {
      const own = cps.map((c, i) => ({ c, i })).filter(({ c }) => c.trackId === id);
      return own.length > 0 && own.every(({ i }) => i <= best);
    });
}

export type StartingPoint = 'beginner' | 'basics' | 'reader';

/** Parent shortcut presets, expressed as "highest passed checkpoint". */
export const PRESETS: Record<StartingPoint, Record<Subject, number>> = {
  beginner: { math: -1, reading: -1 },
  basics: { math: 1, reading: 2 }, // counts to 20 · knows letter sounds
  reader: { math: 5, reading: 4 }, // +/- within 10 · reads short words
};
