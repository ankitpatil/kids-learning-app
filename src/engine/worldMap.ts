// #24 World map: one island per playable track, opened by prerequisites, with a "bloom" that grows
// with progress (🌱 → 🌿 → 🌷 → 🌸 mastered). The map is encouragement, not a gate: Level Select still
// plays any track, and a track the child has already started (played, or placed into) is never locked.
import { MASTERED, getTrack, tracksFor, type Subject } from './tracks';

/**
 * Prerequisite tracks per track (curriculum order from SPEC "Skill tracks"). A track opens when every
 * prerequisite is halfway through its levels (UNLOCK_LEVEL) or mastered. Unlisted = no prerequisites.
 */
export const PREREQS: Record<string, string[]> = {
  // Math
  count: [],
  add10: ['count'],
  sub10: ['count'],
  missing: ['add10'],
  add20: ['add10'],
  sub20: ['sub10'],
  placeValue: ['count'],
  compare2d: ['placeValue'],
  wordProblems: ['add10', 'sub10'],
  money: ['add10'],
  time: ['count'],
  grouping: ['add10'],
  // Reading
  phonics: [],
  sightWords: [],
  cvc: ['phonics'],
  digraphs: ['cvc'],
  blends: ['cvc'],
  silentE: ['cvc'],
  vowelTeams: ['silentE'],
  endings: ['cvc'],
  sentences: ['cvc', 'sightWords'],
  stories: ['cvc', 'sightWords'],
};

export function prereqsOf(trackId: string): string[] {
  return PREREQS[trackId] ?? [];
}

type StateLite = { level: number; mastery: number; attemptsAtLevel?: number };
export type States = Record<string, StateLite | undefined>;

/** The level a prerequisite must reach to open the tracks after it: halfway (rounded up). */
export function unlockLevel(trackId: string): number {
  const max = getTrack(trackId).levels.length - 1;
  return Math.ceil(max / 2);
}

export function isMastered(trackId: string, s: StateLite | undefined): boolean {
  return !!s && s.level >= getTrack(trackId).levels.length - 1 && s.mastery > MASTERED;
}

/**
 * Played at the current level, or moved past level 1 (e.g. by the starting point / quick check).
 * Mastery isn't used: the starting point saves level-0 states for every track with the default mastery.
 */
export function isStarted(s: StateLite | undefined): boolean {
  return !!s && (s.level > 0 || (s.attemptsAtLevel ?? 0) > 0);
}

/** A prerequisite is "far enough" when halfway through its levels or mastered. */
export function prereqMet(trackId: string, states: States): boolean {
  const s = states[trackId];
  return isMastered(trackId, s) || (!!s && s.level >= unlockLevel(trackId));
}

export type IslandStatus = 'locked' | 'open' | 'started' | 'mastered';

export interface Island {
  trackId: string;
  status: IslandStatus;
  /** 0 seedling (open, not started) · 1 sprout · 2 bud (halfway) · 3 full bloom (mastered). Locked = 0. */
  bloom: 0 | 1 | 2 | 3;
  /** Prerequisites still to reach (only for locked islands). */
  waitingOn: string[];
}

export function island(trackId: string, states: States): Island {
  const s = states[trackId];
  if (isMastered(trackId, s)) return { trackId, status: 'mastered', bloom: 3, waitingOn: [] };
  if (isStarted(s)) {
    const bloom = s!.level >= unlockLevel(trackId) ? 2 : 1;
    return { trackId, status: 'started', bloom, waitingOn: [] };
  }
  const waitingOn = prereqsOf(trackId).filter((p) => !prereqMet(p, states));
  return waitingOn.length ? { trackId, status: 'locked', bloom: 0, waitingOn } : { trackId, status: 'open', bloom: 0, waitingOn: [] };
}

/** Islands for a subject's playable tracks, in curriculum order. */
export function worldMap(subject: Subject, states: States): Island[] {
  return tracksFor(subject)
    .filter((t) => t.playable)
    .map((t) => island(t.id, states));
}

/** Gentle line said when a locked island is tapped ("Play Short words first to open this island!"). */
export function lockedMessage(i: Island): string {
  const names = i.waitingOn.map((id) => getTrack(id).name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  return `Play ${list} a bit more to open this island!`;
}
