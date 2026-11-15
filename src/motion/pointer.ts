// Pure hand-cursor logic for Move mode: camera point → screen point, smoothing, and hold-to-choose.

export interface Pt {
  x: number;
  y: number;
}

/** Central share of the camera frame that maps to the whole screen, so corners are reachable without stretching. */
export const ACTIVE_ZONE = 0.8;
/** How long the hand stays on a button to choose it. */
export const HOLD_MS = 900;
/** How long the hand can vanish (a blink of tracking) before the hold resets. */
export const LOST_GRACE_MS = 300;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Camera landmark (0–1, as the camera sees it) → screen pixels.
 * Mirrored, so moving your hand right moves the cursor right, like a mirror.
 */
export function toScreen(lm: Pt, width: number, height: number, zone = ACTIVE_ZONE): Pt {
  const margin = (1 - zone) / 2;
  const nx = clamp01((lm.x - margin) / zone);
  const ny = clamp01((lm.y - margin) / zone);
  return { x: (1 - nx) * width, y: ny * height };
}

/** Exponential smoothing: takes the jitter out of raw landmarks. Higher `a` = snappier, lower = steadier. */
export function smooth(prev: Pt | null, next: Pt, a = 0.35): Pt {
  if (!prev) return next;
  return { x: prev.x + (next.x - prev.x) * a, y: prev.y + (next.y - prev.y) * a };
}

export interface DwellStep {
  progress: number; // 0–1, drives the filling ring
  fire: boolean; // true on the frame the choice is made
}

/**
 * Hold-to-choose. Feed it the thing under the hand every frame (or null).
 * Fires once the same target has been held for `holdMs`; holding on keeps firing every `holdMs`
 * (so a child can feed the monster cookie after cookie without moving away).
 */
export function createDwell<T>(holdMs = HOLD_MS) {
  let target: T | null = null;
  let start = 0;
  return {
    update(next: T | null, now: number): DwellStep {
      if (next !== target) {
        target = next;
        start = now;
        return { progress: 0, fire: false };
      }
      if (next === null) return { progress: 0, fire: false };
      const p = (now - start) / holdMs;
      if (p >= 1) {
        start = now;
        return { progress: 1, fire: true };
      }
      return { progress: Math.max(0, p), fire: false };
    },
    reset() {
      target = null;
    },
  };
}
