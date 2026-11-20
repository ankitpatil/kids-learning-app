// M3 Pop the Answer: a motion-native mechanic over existing tracks. Answer balloons float up the
// screen carrying the choices of an ordinary item (numbers, letters, words); pop the right one.
// Items come from the existing generators (quick items, Phonics Pop, Sight-Word Catch), so the
// content and difficulty knobs stay in one place.
import { makeQuickItem } from '../../engine/quickItems';
import { makeSightItem } from '../sightWords/generator';
import { makePhonicsItem } from '../phonicsPop/generator';
import { CONFUSABLES } from '../phonicsPop/letters';
import { iconEmoji } from '../../icons/icons';
import { pickTrack, tracksFor, type Subject } from '../../engine/tracks';
import { resolveSlot, type Slot, type SlotKind } from '../../engine/roundMix';

export type Rng = () => number;

/** Tracks Pop the Answer can play (all have short tap-the-answer items). */
export const POP_TRACKS = ['count', 'add10', 'sub10', 'missing', 'add20', 'sub20', 'placeValue', 'compare2d', 'phonics', 'sightWords', 'cvc', 'digraphs', 'blends', 'silentE', 'vowelTeams'] as const;
export type PopTrack = (typeof POP_TRACKS)[number];
export const isPopTrack = (id: string): id is PopTrack => (POP_TRACKS as readonly string[]).includes(id);

export interface PopItem {
  id: string;
  trackId: string;
  level: number;
  /** Spoken prompt (tap 🔊 / the picture to hear it; narration reads it when on). */
  say: string;
  /** Big picture / equation above the balloons. Empty for listen-only items (sight words). */
  visual: string;
  /** Bundled icon name shown instead of `visual` for picture items (see QuickItem.icon). */
  icon?: string;
  answer: string;
  /** Balloon labels, answer included exactly once. */
  choices: string[];
}

/** Most balloons on screen at once (room for big targets in Move mode). */
export const MAX_BALLOONS = 4;

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Keep the answer and the first `n - 1` other choices (distractors are listed best-first), reshuffled. */
export function trimChoices(choices: string[], answer: string, n: number, rng: Rng): string[] {
  const others = [...new Set(choices.filter((c) => c !== answer))].slice(0, Math.max(1, n - 1));
  return shuffle([answer, ...others], rng);
}

/**
 * One item for a track and level. `ease` (after two misses in a row) leaves only 2 balloons.
 * Throws for tracks Pop the Answer can't play.
 */
export function makePopItem(trackId: string, level: number, rng: Rng = Math.random, ease = false): PopItem {
  if (!isPopTrack(trackId)) throw new Error(`Pop the Answer can't play ${trackId}`);
  if (trackId === 'sightWords') {
    const it = makeSightItem(level, rng, ease);
    return { id: it.id, trackId, level, say: `Pop the word ${it.word}!`, visual: '', answer: it.word, choices: trimChoices(it.choices, it.word, ease ? 2 : MAX_BALLOONS, rng) };
  }
  if (trackId === 'phonics') {
    const it = makePhonicsItem(level, rng, ease);
    // Keep the look-alike partner (b/d) when it's there: it's the point of the top level.
    const partner = CONFUSABLES[it.target];
    const ordered = [...it.choices].sort((a, b) => Number(b === partner) - Number(a === partner));
    return { id: `pop-${it.id}`, trackId, level, say: `Which letter does ${it.word} start with?`, visual: iconEmoji(it.icon), icon: it.icon, answer: it.target, choices: trimChoices(ordered, it.target, ease ? 2 : MAX_BALLOONS, rng) };
  }
  const q = makeQuickItem(trackId, level, rng);
  // Picture items are identified by question + answer, not the picture, so a new variant isn't a new item (I2b).
  const id = `pop-${trackId}-${q.icon ? q.say : q.visual}-${q.answer}`;
  return { id, trackId, level, say: q.say, visual: q.visual, icon: q.icon, answer: q.answer, choices: trimChoices(q.choices, q.answer, ease ? 2 : MAX_BALLOONS, rng) };
}

/** Which track a subject's Pop round plays: the child's next unmastered skill that Pop can play. */
export function pickPopTrack(subject: Subject, states: Record<string, { level: number; mastery: number } | undefined>): PopTrack {
  const id = pickTrack(subject, states);
  if (isPopTrack(id)) return id;
  // Next skill is one Pop can't play (e.g. stories): use the furthest Pop skill the child has reached.
  const pop = tracksFor(subject).filter((t) => t.playable && isPopTrack(t.id));
  const reached = pop.filter((t) => states[t.id]);
  return (reached.length ? reached[reached.length - 1] : pop[0]).id as PopTrack;
}

type States = Record<string, { level: number; mastery: number } | undefined>;

/** Round-mix slot for an item, kept to tracks Pop can play (review/stretch may point at others). */
export function popSlot(kind: SlotKind, trackId: string, level: number, states: States, ease = false, rng: Rng = Math.random): Slot {
  const s = resolveSlot(kind, trackId, level, states, ease, rng);
  return isPopTrack(s.trackId) ? s : { kind: 'current', trackId, level };
}

// ---------- Balloons ----------
export interface Balloon {
  label: string;
  correct: boolean;
  /** Horizontal centre, 0–1 of the play area. */
  x: number;
  color: string;
  /** Seconds for one trip from below the screen to above it (then it comes round again). */
  duration: number;
  /** Negative CSS delay: balloons start part-way up, so all are on screen at once. */
  delay: number;
}

export const BALLOON_COLORS = ['#ff7675', '#74b9ff', '#55efc4', '#fdcb6e', '#a29bfe'];
/** Slow trips: popping is about choosing, not reflexes. */
export const MIN_TRIP_S = 9;
export const MAX_TRIP_S = 12;

/**
 * Lay out balloons: one lane each (evenly spread, shuffled so the answer's lane varies), distinct
 * colours, slow trips, and phases spread over the trip so the balloons sit at different heights.
 */
export function layoutBalloons(choices: string[], answer: string, rng: Rng = Math.random): Balloon[] {
  const n = choices.length;
  const lanes = shuffle(Array.from({ length: n }, (_, i) => (i + 0.5) / n), rng);
  const colors = shuffle(BALLOON_COLORS, rng);
  const phases = shuffle(Array.from({ length: n }, (_, i) => i / n), rng);
  return choices.map((label, i) => {
    const duration = MIN_TRIP_S + rng() * (MAX_TRIP_S - MIN_TRIP_S);
    // Phase 0.15–0.85 of the trip, so no balloon starts fully off screen.
    const phase = 0.15 + 0.7 * (phases[i] + rng() * (0.5 / n));
    return { label, correct: label === answer, x: lanes[i], color: colors[i % colors.length], duration, delay: -duration * Math.min(phase, 0.85) };
  });
}

// ---------- Scoring a pop ----------
export interface PopState {
  tried: string[];
  /** Wrong pops counted for the engine on this item (at most 1: no penalty spiral). */
  misses: number;
}

export interface PopResult {
  state: PopState;
  /** right = item done; wrong = log a miss; again = wobble only (already tried or already missed). */
  outcome: 'right' | 'wrong' | 'again';
  /** Show the hint (the answer balloon glows) from now on. */
  hint: boolean;
}

/** Wrong pops before the answer balloon starts to glow. */
export const HINT_AFTER = 2;

/**
 * Score one pop. Only the first wrong pop of an item counts as a miss for the adaptive engine —
 * a waving hand can brush several balloons, and a child shouldn't sink a level for that.
 */
export function scorePop(prev: PopState, label: string, answer: string): PopResult {
  if (label === answer) return { state: prev, outcome: 'right', hint: prev.tried.length >= HINT_AFTER };
  if (prev.tried.includes(label)) return { state: prev, outcome: 'again', hint: prev.tried.length >= HINT_AFTER };
  const tried = [...prev.tried, label];
  const first = prev.misses === 0;
  return { state: { tried, misses: first ? 1 : prev.misses }, outcome: first ? 'wrong' : 'again', hint: tried.length >= HINT_AFTER };
}
