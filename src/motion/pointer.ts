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

/** Short hold for touch-to-pop targets (`data-motion-hold`): long enough that a hand sweeping past doesn't pop. */
export const TOUCH_HOLD_MS = 250;

/** Hold time asked for by an element's `data-motion-hold` (ms), clamped to 150 ms – HOLD_MS. */
export function holdFor(attr: string | null | undefined): number {
  const n = Number(attr);
  if (!attr || !Number.isFinite(n)) return HOLD_MS;
  return Math.max(150, Math.min(HOLD_MS, n));
}

export interface DwellStep {
  progress: number; // 0–1, drives the filling ring
  fire: boolean; // true on the frame the choice is made
}

/**
 * Hold-to-choose. Feed it the thing under the hand every frame (or null).
 * Fires once the same target has been held for `holdMs`; holding on keeps firing every `holdMs`
 * (so a child can feed the monster cookie after cookie without moving away).
 * `hold` overrides the hold time for this target (Pop the Answer balloons pop on a short touch).
 */
export function createDwell<T>(holdMs = HOLD_MS) {
  let target: T | null = null;
  let start = 0;
  return {
    update(next: T | null, now: number, hold = holdMs): DwellStep {
      if (next !== target) {
        target = next;
        start = now;
        return { progress: 0, fire: false };
      }
      if (next === null) return { progress: 0, fire: false };
      const p = (now - start) / hold;
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

/**
 * One Euro filter (Casiez et al. 2012) for a 2-D point in screen pixels: heavy smoothing when the hand is
 * nearly still (no jitter while holding on a button), light smoothing when it moves fast (little lag).
 * `minCutoff` (Hz) sets the steadiness at rest; `beta` how quickly it loosens up with speed (px/s).
 */
export function createOneEuro(minCutoff = 1.2, beta = 0.004, dCutoff = 1.0) {
  let prev: Pt | null = null;
  let dPrev: Pt = { x: 0, y: 0 };
  let tPrev = 0;
  const alpha = (cutoff: number, dt: number) => {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  };
  return {
    filter(p: Pt, tMs: number): Pt {
      if (!prev) {
        prev = p;
        tPrev = tMs;
        return p;
      }
      const dt = Math.max(1e-3, (tMs - tPrev) / 1000);
      tPrev = tMs;
      const ad = alpha(dCutoff, dt);
      const d = { x: (p.x - prev.x) / dt, y: (p.y - prev.y) / dt };
      dPrev = { x: dPrev.x + ad * (d.x - dPrev.x), y: dPrev.y + ad * (d.y - dPrev.y) };
      const speed = Math.hypot(dPrev.x, dPrev.y);
      const a = alpha(minCutoff + beta * speed, dt);
      prev = { x: prev.x + a * (p.x - prev.x), y: prev.y + a * (p.y - prev.y) };
      return prev;
    },
    reset() {
      prev = null;
      dPrev = { x: 0, y: 0 };
    },
  };
}

/** How fast the drawn cursor catches up with the tracked point, per second (frame-rate independent). */
export const GLIDE_RATE = 20;

/**
 * Move `from` part of the way to `to` for a display frame of `dtMs`. Called every screen refresh, so the
 * cursor glides smoothly between camera frames (camera/tracker ≈ 15–30 fps, screen 60–120 fps).
 */
export function glide(from: Pt, to: Pt, dtMs: number, rate = GLIDE_RATE): Pt {
  const k = 1 - Math.exp((-rate * Math.max(0, dtMs)) / 1000);
  return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
}

/** One Euro settings per Move mode. Body tracking at TV distance is noisier, so it is held steadier at rest. */
export const EURO_HAND = { minCutoff: 1.2, beta: 0.004 };
export const EURO_BODY = { minCutoff: 0.45, beta: 0.0018 };

/** How far (px) the cursor can drift off the button it is holding on before the hold is lost. */
export const STICKY_PX = 28;

/**
 * TV distance (body tracking): the hand is a few pixels in a wide camera picture, mapped onto the whole
 * screen, so a still hand still trembles by many screen pixels. Two extra steadiers, as a share of the
 * screen's shorter side so a 4K TV behaves like a 1080p one:
 * - a dead zone: the cursor ignores wobbles smaller than this (≈ 16 px on a 1080p screen);
 * - a wider sticky margin around the button being held.
 */
export const DEADBAND_BODY = 0.015;
export const STICKY_BODY = 0.045;

/** Sizes in px for a screen: dead-zone radius and sticky margin. Hand mode keeps the plain sticky margin and no dead zone. */
export function steadiness(mode: 'body' | 'hand', width: number, height: number): { deadband: number; sticky: number } {
  if (mode === 'hand') return { deadband: 0, sticky: STICKY_PX };
  const side = Math.min(width, height);
  return { deadband: side * DEADBAND_BODY, sticky: Math.max(STICKY_PX, side * STICKY_BODY) };
}

/**
 * Dead zone with follow-through: while the point stays within `radius` of the cursor, the cursor holds
 * still; once it moves further, the cursor follows, staying `radius` behind (no jump). Removes tremor
 * without a lag on real moves.
 */
export function createDeadband() {
  let anchor: Pt | null = null;
  return {
    filter(p: Pt, radius: number): Pt {
      if (!anchor || radius <= 0) return (anchor = p);
      const dx = p.x - anchor.x;
      const dy = p.y - anchor.y;
      const d = Math.hypot(dx, dy);
      if (d <= radius) return anchor;
      const k = (d - radius) / d;
      anchor = { x: anchor.x + dx * k, y: anchor.y + dy * k };
      return anchor;
    },
    reset() {
      anchor = null;
    },
  };
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Is the point on the box, or within `margin` px of its edge? Used to keep a hold through small wobbles. */
export function nearBox(b: Box, p: Pt, margin = STICKY_PX): boolean {
  return p.x >= b.left - margin && p.x <= b.right + margin && p.y >= b.top - margin && p.y <= b.bottom + margin;
}

/** Scroll pads (Move mode): hand on ⬆️/⬇️ scrolls the page — no hold needed, it speeds up the longer it stays. */
export const SCROLL_DELAY_MS = 200; // passing over a pad doesn't scroll
export const SCROLL_RAMP_MS = 900; // from slow to full speed
export const SCROLL_MIN = 0.2; // screen heights per second, at the start
export const SCROLL_MAX = 0.9; // …and at full speed

/**
 * Which scroll pads to show: whenever Move mode's camera is running (not only once someone has claimed
 * the turn, so a player can see there is more page) and the page can scroll that way.
 */
export function padsVisible(running: boolean, scrollTop: number, scrollHeight: number, viewH: number): { up: boolean; down: boolean } {
  const max = scrollHeight - viewH;
  return { up: running && max > 1 && scrollTop > 1, down: running && max > 1 && scrollTop < max - 1 };
}

/** Scroll speed in px/s after the hand has been on a scroll pad for `heldMs`, for a screen `viewH` px tall. */
export function scrollSpeed(heldMs: number, viewH: number): number {
  if (heldMs < SCROLL_DELAY_MS) return 0;
  const t = Math.min(1, (heldMs - SCROLL_DELAY_MS) / SCROLL_RAMP_MS);
  return viewH * (SCROLL_MIN + (SCROLL_MAX - SCROLL_MIN) * t * t);
}
