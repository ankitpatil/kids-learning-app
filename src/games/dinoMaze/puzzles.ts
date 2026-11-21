// Puzzles for the Dino Maze obstacles: mixed math and reading questions at the child's own levels,
// taken from the Pop the Answer item makers (so content and difficulty stay in one place), and laid out
// as big targets for a child standing back from the TV.
import { isPopTrack, makePopItem, pickPopTrack, trimChoices, type PopItem, type PopTrack } from '../popAnswer/generator';
import { tracksFor, type Subject } from '../../engine/tracks';
import { OBSTACLES, type ObstacleKind } from './maze';

export type Rng = () => number;
type States = Record<string, { level: number; mastery: number } | undefined>;

/** Answer targets per puzzle: 3 (2 when easing after misses) — big and far apart on a TV. */
export const DINO_CHOICES = 3;
/** Share of questions taken from another skill the child has already reached (review). */
export const REVIEW_SHARE = 0.3;
/** Listen-only items (sight words) need the app to talk; skipped while talking is off. */
export const LISTEN_ONLY: readonly PopTrack[] = ['sightWords'];

export interface DinoSlot {
  trackId: PopTrack;
  level: number;
  /** current = the child's next skill in that subject (moves the level); review = logged only. */
  kind: 'current' | 'review';
}

/** Pop tracks of a subject the child can play here, in track order. */
function playable(subject: Subject, listenOk: boolean): PopTrack[] {
  return tracksFor(subject)
    .filter((t) => t.playable && isPopTrack(t.id))
    .map((t) => t.id as PopTrack)
    .filter((id) => listenOk || !LISTEN_ONLY.includes(id));
}

/**
 * Which skill question `i` asks. Subjects alternate (math, reading, math… or the other way round —
 * `first` is picked per game), so the puzzles at one obstacle are a mix. Mostly the child's next skill
 * in that subject; sometimes a review of one they've already reached.
 */
export function pickDinoSlot(i: number, first: Subject, states: States, listenOk: boolean, rng: Rng = Math.random): DinoSlot {
  const subject: Subject = i % 2 === 0 ? first : first === 'math' ? 'reading' : 'math';
  const options = playable(subject, listenOk);
  let main = pickPopTrack(subject, states);
  if (!options.includes(main)) {
    // e.g. sight words with talking off: the nearest playable skill before it, else the first one
    const all = tracksFor(subject).map((t) => t.id);
    const before = options.filter((id) => all.indexOf(id) < all.indexOf(main));
    main = before.length ? before[before.length - 1] : options[0];
  }
  const reached = options.filter((id) => id !== main && states[id]);
  if (reached.length && rng() < REVIEW_SHARE) {
    const id = reached[Math.floor(rng() * reached.length)];
    return { trackId: id, level: states[id]?.level ?? 0, kind: 'review' };
  }
  return { trackId: main, level: states[main]?.level ?? 0, kind: 'current' };
}

/** One puzzle: an ordinary item with 3 choices (2 when easing). */
export function makeDinoPuzzle(slot: DinoSlot, rng: Rng = Math.random, ease = false): PopItem {
  const it = makePopItem(slot.trackId, slot.level, rng, ease);
  return { ...it, id: `dino-${it.id}`, choices: trimChoices(it.choices, it.answer, ease ? 2 : DINO_CHOICES, rng) };
}

// ---------- Target layout ----------

export interface TargetSpot {
  /** Centre, as a share of the screen (0–1). */
  x: number;
  y: number;
  /** Size, as a share of the screen height (targets are sized by height so they stay round on any TV). */
  w: number;
  h: number;
}

/** Evenly spread columns across the middle of the screen, in a random order. */
function columns(n: number, lo: number, hi: number): number[] {
  if (n === 1) return [(lo + hi) / 2];
  return Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
}

/**
 * Where the answer targets go for an obstacle, one spot per choice (choice order is already shuffled).
 * The top 18% of the screen is kept for the question. Mirror-mode: the child's hands appear where
 * they really are, so targets sit where arms reach — around shoulder height, high for the bats,
 * by the feet for the river stones (you stand by a stone, not touch it).
 */
export function layoutTargets(kind: ObstacleKind, n: number, rng: Rng = Math.random): TargetSpot[] {
  const jitter = (a: number) => (rng() - 0.5) * a;
  switch (OBSTACLES[kind].layout) {
    case 'mid':
      return columns(n, 0.2, 0.8).map((x) => ({ x, y: 0.5 + jitter(0.1), w: 0.3, h: 0.3 }));
    case 'hang':
      // Long strands hanging from the top: chop down through one, the others are far to the side.
      return columns(n, 0.18, 0.82).map((x) => ({ x, y: 0.55, w: 0.2, h: 0.58 }));
    case 'floor':
      return columns(n, n === 2 ? 0.3 : 0.18, n === 2 ? 0.7 : 0.82).map((x) => ({ x, y: 0.84, w: 0.34, h: 0.2 }));
    case 'high':
      return columns(n, 0.2, 0.8).map((x) => ({ x, y: 0.32 + jitter(0.06), w: 0.26, h: 0.24 }));
  }
}

// ---------- Hits ----------

/** Hits it takes to choose an option: 3 or 4, picked per question (the same for every option). */
export const MIN_HITS = 3;
export const MAX_HITS = 4;
export function hitsNeeded(rng: Rng = Math.random): number {
  return MIN_HITS + Math.floor(rng() * (MAX_HITS - MIN_HITS + 1));
}

export type HitCounts = Record<string, number>;

/**
 * One more hit on an option. Returns the new counts and whether this hit chose it. A chosen option's
 * count goes back to 0 (a wrong one can be tried again; it just wobbles).
 */
export function addHit(counts: HitCounts, label: string, need: number): { counts: HitCounts; hits: number; chosen: boolean } {
  const hits = Math.min(need, (counts[label] ?? 0) + 1);
  const chosen = hits >= need;
  return { counts: { ...counts, [label]: chosen ? 0 : hits }, hits, chosen };
}
