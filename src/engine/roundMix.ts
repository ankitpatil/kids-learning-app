// Round mix (SPEC "Adaptive engine"): ~70% current level, ~20% review (already mastered),
// ~10% stretch (next level). A round is one game, so review/stretch items come from tracks that
// game can play: lower levels of the current track, or earlier/next tracks in the same game.
import { TRACKS, maxLevel, MASTERED } from './tracks';

export type SlotKind = 'current' | 'review' | 'stretch';

export interface Slot {
  kind: SlotKind;
  trackId: string;
  level: number;
}

export type Rng = () => number;
type States = Record<string, { level: number; mastery: number } | undefined>;

export const REVIEW_SHARE = 0.2;
export const STRETCH_SHARE = 0.1;

/** Which game plays each track. Tracks of the same game can share a round. */
const GAME_OF: Record<string, string> = {
  count: 'feed',
  missing: 'feed',
  add10: 'hop',
  sub10: 'hop',
  add20: 'hop',
  sub20: 'hop',
  cvc: 'detective',
  digraphs: 'detective',
  blends: 'detective',
  silentE: 'detective',
  vowelTeams: 'detective',
  sentences: 'detective',
  phonics: 'phonics',
  sightWords: 'sight',
  endings: 'builder',
};

/** Playable tracks played by the same game as `trackId`, in curriculum order. */
export function gameGroup(trackId: string): string[] {
  const g = GAME_OF[trackId];
  if (!g) return [trackId];
  return TRACKS.filter((t) => t.playable && GAME_OF[t.id] === g).map((t) => t.id);
}

/**
 * Lay out a round's slot kinds. Counts: review = round(20%), stretch = round(10%) (8 items → 5/2/1).
 * Item 0 is a review warm-up (an easy win to start), the last item is always current, and the
 * stretch item sits in the middle — never first, second or last.
 */
export function planRound(length: number, rng: Rng = Math.random): SlotKind[] {
  const plan: SlotKind[] = Array.from({ length }, () => 'current');
  if (length < 4) return plan;
  const review = Math.round(length * REVIEW_SHARE);
  const stretch = Math.round(length * STRETCH_SHARE);
  const pick = (from: number, to: number) => {
    const free: number[] = [];
    for (let i = from; i <= to; i++) if (plan[i] === 'current') free.push(i);
    return free.length ? free[Math.floor(rng() * free.length)] : -1;
  };
  for (let k = 0; k < stretch; k++) {
    const i = pick(2, length - 2);
    if (i >= 0) plan[i] = 'stretch';
  }
  for (let k = 0; k < review; k++) {
    const i = k === 0 ? 0 : pick(1, length - 2);
    if (i >= 0) plan[i] = 'review';
  }
  return plan;
}

const isMastered = (id: string, s: { level: number; mastery: number }) => s.level >= maxLevel(id) && s.mastery > MASTERED;

/** Easier things this child has already shown they can do, within the same game. */
export function reviewOptions(trackId: string, level: number, states: States): Slot[] {
  const out: Slot[] = [];
  if (level > 0) out.push({ kind: 'review', trackId, level: level - 1 });
  const group = gameGroup(trackId);
  for (const id of group.slice(0, Math.max(0, group.indexOf(trackId)))) {
    const s = states[id];
    if (!s) continue; // never played (e.g. jumped ahead from the level map): not a review
    if (isMastered(id, s)) out.push({ kind: 'review', trackId: id, level: maxLevel(id) });
    else if (s.level > 0) out.push({ kind: 'review', trackId: id, level: s.level - 1 });
  }
  return out;
}

/** One step beyond the current level: the next level, or the next track once at the top. */
export function stretchOption(trackId: string, level: number, states: States): Slot | null {
  if (level < maxLevel(trackId)) return { kind: 'stretch', trackId, level: level + 1 };
  const group = gameGroup(trackId);
  const nextId = group[group.indexOf(trackId) + 1];
  if (!nextId) return null;
  return { kind: 'stretch', trackId: nextId, level: Math.min(states[nextId]?.level ?? 0, maxLevel(nextId)) };
}

/**
 * Resolve the planned kind for one item against the child's live level (it can change mid-round).
 * Falls back to a current item when there's nothing to review/stretch to, and never stretches
 * right after two misses (`ease`): the next item must be easier, not harder.
 */
export function resolveSlot(kind: SlotKind, trackId: string, level: number, states: States, ease = false, rng: Rng = Math.random): Slot {
  const current: Slot = { kind: 'current', trackId, level };
  if (kind === 'review') {
    const opts = reviewOptions(trackId, level, states);
    return opts.length ? opts[Math.floor(rng() * opts.length)] : current;
  }
  if (kind === 'stretch' && !ease) return stretchOption(trackId, level, states) ?? current;
  return current;
}
