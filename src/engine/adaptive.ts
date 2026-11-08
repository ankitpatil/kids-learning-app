// Adaptive engine v1: weighted moving average mastery per skill.
export interface SkillState {
  profileId: string;
  skillId: string;
  mastery: number; // 0..1
  level: number; // 0-based index into the skill's levels
  attemptsAtLevel: number;
  missStreak: number;
}

export interface AttemptResult {
  correct: boolean;
  hintUsed: boolean;
  timeMs: number;
}

export const FAST_MS = 4000;
export const LEVEL_UP_MASTERY = 0.85;
export const LEVEL_DOWN_MASTERY = 0.5;
export const MIN_ATTEMPTS_TO_LEVEL_UP = 8;
export const START_MASTERY = 0.6;

export function scoreAttempt(a: AttemptResult): number {
  if (!a.correct) return 0;
  let s = a.hintUsed ? 0.5 : 1;
  if (!a.hintUsed && a.timeMs < FAST_MS) s = Math.min(1, s + 0.1);
  return s;
}

export function newSkillState(profileId: string, skillId: string, level = 0): SkillState {
  return { profileId, skillId, mastery: START_MASTERY, level, attemptsAtLevel: 0, missStreak: 0 };
}

export type LevelChange = 'up' | 'down' | 'same';

export interface UpdateOutcome {
  state: SkillState;
  change: LevelChange;
  /** True when the next item should be easier and come with a hint (2 misses in a row). */
  ease: boolean;
}

export function updateSkill(prev: SkillState, a: AttemptResult, maxLevel: number): UpdateOutcome {
  const mastery = 0.7 * prev.mastery + 0.3 * scoreAttempt(a);
  const missStreak = a.correct ? 0 : prev.missStreak + 1;
  const attemptsAtLevel = prev.attemptsAtLevel + 1;
  let state: SkillState = { ...prev, mastery, missStreak, attemptsAtLevel };
  let change: LevelChange = 'same';

  if (mastery > LEVEL_UP_MASTERY && attemptsAtLevel >= MIN_ATTEMPTS_TO_LEVEL_UP && prev.level < maxLevel) {
    state = { ...state, level: prev.level + 1, mastery: START_MASTERY, attemptsAtLevel: 0 };
    change = 'up';
  } else if (mastery < LEVEL_DOWN_MASTERY && prev.level > 0) {
    state = { ...state, level: prev.level - 1, mastery: START_MASTERY, attemptsAtLevel: 0, missStreak: 0 };
    change = 'down';
  }
  return { state, change, ease: state.missStreak >= 2 };
}
