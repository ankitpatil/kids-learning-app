// Who is playing? With several people in front of the camera, the player claims the turn by raising a
// hand; after that we follow that body from frame to frame and ignore everyone else.
// No faces, no identity: only "where the player's body was last frame".
import type { Pt } from './pointer';

export interface Lm {
  x: number; // 0–1 across the camera image (as the camera sees it, not mirrored)
  y: number; // 0–1 down the camera image
  visibility?: number;
}
export type Pose = Lm[];

// MediaPipe Pose landmark indices
export const NOSE = 0;
export const L_SHOULDER = 11;
export const R_SHOULDER = 12;
export const L_WRIST = 15;
export const R_WRIST = 16;
export const L_HIP = 23;
export const R_HIP = 24;

const MIN_VIS = 0.5;
const seen = (l: Lm | undefined): l is Lm => !!l && (l.visibility ?? 1) >= MIN_VIS;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export interface Torso {
  x: number;
  y: number;
  size: number; // shoulder width, the body's scale in the picture
}

/** Shoulder centre + width; null if the shoulders aren't both visible. */
export function torso(p: Pose): Torso | null {
  const a = p[L_SHOULDER];
  const b = p[R_SHOULDER];
  if (!seen(a) || !seen(b)) return null;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, size: Math.max(0.03, Math.hypot(a.x - b.x, a.y - b.y)) };
}

const wrists = (p: Pose) => [p[L_WRIST], p[R_WRIST]].filter(seen);
const highest = (ls: Lm[]) => (ls.length ? ls.reduce((a, b) => (b.y < a.y ? b : a)) : null);

/** A wrist held above the head (above the nose; if the face isn't seen, well above the shoulders). */
export function raisedWrist(p: Pose): Lm | null {
  const t = torso(p);
  const nose = p[NOSE];
  const headY = seen(nose) ? nose.y : t ? t.y - t.size * 0.8 : null;
  if (headY === null) return null;
  return highest(wrists(p).filter((w) => w.y < headY));
}

/**
 * The hand that drives the cursor: the higher wrist, but only when it is lifted above the middle of the
 * body. Arms resting at the sides = no cursor, so nothing gets pressed by accident.
 */
export function activeWrist(p: Pose): Lm | null {
  const t = torso(p);
  if (!t) return null;
  const lh = p[L_HIP];
  const rh = p[R_HIP];
  const limit = seen(lh) && seen(rh) ? (t.y + (lh.y + rh.y) / 2) / 2 : t.y + t.size;
  return highest(wrists(p).filter((w) => w.y < limit));
}

/** Reach box, in shoulder widths: how far a child can comfortably move a hand around their own body. */
export const REACH_W = 4;
export const REACH_H = 3;

/**
 * Wrist → screen point, relative to the player's own body, so the whole screen is reachable without
 * walking, wherever they stand. Mirrored like a mirror.
 */
export function reachToScreen(w: Lm, p: Pose, width: number, height: number): Pt | null {
  const t = torso(p);
  if (!t) return null;
  const boxW = t.size * REACH_W;
  const boxH = t.size * REACH_H;
  const left = t.x - boxW / 2;
  const top = t.y - boxH * 0.6; // more room above the shoulders than below
  const nx = clamp01((w.x - left) / boxW);
  const ny = clamp01((w.y - top) / boxH);
  return { x: (1 - nx) * width, y: ny * height };
}

export type Phase = 'waiting' | 'claiming' | 'locked';
export interface LockStep {
  phase: Phase;
  player: number; // index into this frame's poses, or -1 (none / ambiguous this frame)
  candidate: number; // index of the person claiming the turn, or -1
  progress: number; // claim progress 0–1
  justLocked: boolean;
  justLost: boolean;
}

export interface LockOptions {
  claimMs: number; // how long a hand must stay raised to claim the turn
  lostMs: number; // how long the player can be out of view before the turn is free again
  maxJump: number; // largest believable move between frames (in image widths)
  ambiguity: number; // if the 2nd-closest body is within this factor of the closest, don't guess
}
export const DEFAULT_LOCK: LockOptions = { claimMs: 1000, lostMs: 2000, maxJump: 0.25, ambiguity: 1.2 };

const dist = (a: Torso, b: Torso) => Math.hypot(a.x - b.x, a.y - b.y);

/** Raise-hand-to-claim, then follow the nearest body each frame. */
export function createPlayerLock(opts: Partial<LockOptions> = {}) {
  const o = { ...DEFAULT_LOCK, ...opts };
  let phase: Phase = 'waiting';
  let anchor: Torso | null = null;
  let since = 0;
  let lastMatch = 0;

  const step = (s: Partial<LockStep>): LockStep => ({ phase, player: -1, candidate: -1, progress: 0, justLocked: false, justLost: false, ...s });

  /** Bodies sorted by distance to the anchor (only those with visible shoulders). */
  const ranked = (ts: (Torso | null)[]) =>
    ts
      .map((t, i) => (t && anchor ? { i, t, d: dist(t, anchor) } : null))
      .filter((r): r is { i: number; t: Torso; d: number } => r !== null)
      .sort((a, b) => a.d - b.d);

  return {
    update(poses: Pose[], now: number): LockStep {
      const ts = poses.map(torso);

      if (phase === 'locked') {
        const [best, second] = ranked(ts);
        if (best && best.d <= o.maxJump) {
          lastMatch = now;
          if (second && second.d <= o.maxJump && second.d < best.d * o.ambiguity) {
            return step({ progress: 1 }); // two bodies equally close (crossing paths): hold, no cursor this frame
          }
          anchor = best.t;
          return step({ player: best.i, progress: 1 });
        }
        if (now - lastMatch <= o.lostMs) return step({ progress: 1 });
        phase = 'waiting';
        anchor = null;
        return step({ justLost: true });
      }

      if (phase === 'claiming') {
        const raised = ranked(ts).filter((r) => r.d <= o.maxJump && raisedWrist(poses[r.i]));
        const c = raised[0];
        if (c) {
          anchor = c.t;
          const progress = Math.min(1, (now - since) / o.claimMs);
          if (progress >= 1) {
            phase = 'locked';
            lastMatch = now;
            return step({ player: c.i, progress: 1, justLocked: true });
          }
          return step({ candidate: c.i, progress });
        }
        phase = 'waiting'; // hand came down too soon
        anchor = null;
      }

      // waiting: whoever raises a hand first (highest hand if several at once)
      let pick = -1;
      let pickY = Infinity;
      poses.forEach((p, i) => {
        const w = ts[i] ? raisedWrist(p) : null;
        if (w && w.y < pickY) {
          pick = i;
          pickY = w.y;
        }
      });
      if (pick >= 0) {
        phase = 'claiming';
        anchor = ts[pick];
        since = now;
        return step({ candidate: pick, progress: 0 });
      }
      return step({});
    },
    reset() {
      phase = 'waiting';
      anchor = null;
    },
  };
}
