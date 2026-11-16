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
const L_HAND = [17, 19, 21]; // pinky, index, thumb (left)
const R_HAND = [18, 20, 22];
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

export const L_ELBOW = 13;
export const R_ELBOW = 14;
export type Side = 'left' | 'right'; // the person's own left / right
export const ARM: Record<Side, { shoulder: number; elbow: number; wrist: number; hand: number[] }> = {
  left: { shoulder: L_SHOULDER, elbow: L_ELBOW, wrist: L_WRIST, hand: L_HAND },
  right: { shoulder: R_SHOULDER, elbow: R_ELBOW, wrist: R_WRIST, hand: R_HAND },
};

/** How high a wrist must be to drive the cursor: halfway between shoulders and hips. */
function liftLimit(p: Pose, t: Torso): number {
  const lh = p[L_HIP];
  const rh = p[R_HIP];
  return seen(lh) && seen(rh) ? (t.y + (lh.y + rh.y) / 2) / 2 : t.y + t.size;
}

/**
 * The hand that drives the cursor: the higher wrist, but only when it is lifted above the middle of the
 * body. Arms resting at the sides = no cursor, so nothing gets pressed by accident.
 */
export function activeWrist(p: Pose): Lm | null {
  const t = torso(p);
  if (!t) return null;
  const limit = liftLimit(p, t);
  const w = highest(wrists(p).filter((x) => x.y < limit));
  return w ? handCentre(p, w === p[L_WRIST] ? 'left' : 'right') : null;
}

/**
 * Average the wrist with the hand points on the same side: much steadier than the wrist alone.
 * Weighted by how sure the tracker is about each point, so a knuckle fading in and out nudges the point
 * a little instead of making it jump.
 */
export function handCentre(p: Pose, side: Side): Lm {
  const wrist = p[ARM[side].wrist];
  const pts = [wrist, ...ARM[side].hand.map((i) => p[i])].filter(Boolean);
  let sx = 0, sy = 0, sw = 0;
  for (const l of pts) {
    const w = Math.max(0, (l.visibility ?? 1) - 0.3);
    sx += l.x * w;
    sy += l.y * w;
    sw += w;
  }
  if (sw === 0) return wrist;
  return { x: sx / sw, y: sy / sw, visibility: wrist.visibility };
}

export interface ActiveHand {
  side: Side;
  at: Lm; // the steadied hand point (drives the cursor)
}

export interface HandPickOptions {
  switchMargin: number; // the other hand must be this much higher (shoulder widths) to take over
  dropMargin: number; // the cursor hand may sag this far below the lift line (shoulder widths) before it stops
}
export const DEFAULT_HAND_PICK: HandPickOptions = { switchMargin: 0.6, dropMargin: 0.35 };

/**
 * Like `activeWrist`, but it remembers which hand is driving: with both hands up at about the same
 * height the cursor stays with the hand it started on instead of flicking between them, and a hand that
 * sags a little while holding on a low button keeps the cursor.
 */
export function createHandPicker(opts: Partial<HandPickOptions> = {}) {
  const o = { ...DEFAULT_HAND_PICK, ...opts };
  let side: Side | null = null;
  return {
    /** `only`: the hand chosen for this turn — then only that hand drives, never the other one. */
    update(p: Pose, only?: Side | null): ActiveHand | null {
      const t = torso(p);
      if (!t) {
        side = null;
        return null;
      }
      if (only) {
        const w = p[ARM[only].wrist];
        const lim = liftLimit(p, t) + (side === only ? o.dropMargin * t.size : 0);
        side = seen(w) && w.y < lim ? only : null;
        return side ? { side, at: handCentre(p, side) } : null;
      }
      const limit = liftLimit(p, t);
      const wristOf = (s: Side) => {
        const w = p[ARM[s].wrist];
        return seen(w) ? w : null;
      };
      const lifted = (s: Side, extra = 0) => {
        const w = wristOf(s);
        return w && w.y < limit + extra ? w : null;
      };
      let next: Side | null = null;
      if (side && lifted(side, o.dropMargin * t.size)) {
        next = side;
        const other: Side = side === 'left' ? 'right' : 'left';
        const ow = lifted(other);
        if (ow && ow.y < wristOf(side)!.y - o.switchMargin * t.size) next = other;
      } else {
        const l = lifted('left');
        const r = lifted('right');
        next = l && r ? (l.y < r.y ? 'left' : 'right') : l ? 'left' : r ? 'right' : null;
      }
      side = next;
      return next ? { side: next, at: handCentre(p, next) } : null;
    },
    reset() {
      side = null;
    },
  };
}

/**
 * The player's body frame (shoulder centre + width), smoothed over time. The reach box is built from it,
 * so it must hold still: raw shoulders wobble a little every frame, and that wobble — multiplied by the
 * box's scale — used to shake the cursor even with the hand held still. `tauMs` is the time constant.
 */
export function createBodyFrame(tauMs = 350, snap = 0.25) {
  let f: Torso | null = null;
  let last = 0;
  return {
    update(next: Torso, now: number): Torso {
      if (!f || Math.hypot(next.x - f.x, next.y - f.y) > snap) {
        f = next; // first frame, or a different spot entirely: no point easing over
      } else {
        const dt = Math.max(0, now - last);
        const k = 1 - Math.exp(-dt / tauMs);
        const ks = 1 - Math.exp(-dt / (tauMs * 2)); // scale changes only when someone walks closer / back
        f = { x: f.x + (next.x - f.x) * k, y: f.y + (next.y - f.y) * k, size: f.size + (next.size - f.size) * ks };
      }
      last = now;
      return f;
    },
    reset() {
      f = null;
    },
  };
}

/** Reach box, in shoulder widths: how far a child can comfortably move a hand around their own body. */
export const REACH_W = 4;
export const REACH_H = 3;

/**
 * Wrist → screen point, relative to the player's own body, so the whole screen is reachable without
 * walking, wherever they stand. Mirrored like a mirror.
 */
export function reachToScreen(w: Lm, p: Pose, width: number, height: number, frame: Torso | null = torso(p)): Pt | null {
  const t = frame;
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
  player: number; // index into this frame's poses, or -1 (not seen this frame)
  candidate: number; // index of the person claiming the turn, or -1
  progress: number; // claim progress 0–1
  side: Side | null; // the hand the player raised to claim the turn: it drives the cursor for the whole turn
  justLocked: boolean;
  justLost: boolean;
}

export interface LockOptions {
  claimMs: number; // how long a hand must stay raised to claim the turn
  lostMs: number; // how long the player can be out of view before the turn is free again
  maxJump: number; // largest believable move, however long the player was missed (in image widths)
  stepPerSec: number; // how far (in the player's shoulder widths) they can move per second they're unseen
  sizeRatio: number; // a body more than this much bigger/smaller (closer/further away) isn't the player
}
export const DEFAULT_LOCK: LockOptions = { claimMs: 1000, lostMs: 2000, maxJump: 0.25, stepPerSec: 3, sizeRatio: 1.5 };

const dist = (a: Torso, b: Torso) => Math.hypot(a.x - b.x, a.y - b.y);

/** Which hand is raised above the head (the higher one if both). */
export function raisedSide(p: Pose): Side | null {
  const w = raisedWrist(p);
  return w ? (w === p[L_WRIST] ? 'left' : 'right') : null;
}

/**
 * Raise-hand-to-claim, then follow that body. Someone walking into the picture is ignored: a body only
 * counts as the player if it is about where the player just was (how far depends on how long the player
 * was unseen) and about the same size in the picture (so not someone closer or further back).
 * People crossing right in front of each other are not handled specially.
 */
export function createPlayerLock(opts: Partial<LockOptions> = {}) {
  const o = { ...DEFAULT_LOCK, ...opts };
  let phase: Phase = 'waiting';
  let anchor: Torso | null = null;
  let side: Side | null = null;
  let since = 0;
  let lastMatch = 0;

  const step = (s: Partial<LockStep>): LockStep => ({ phase, player: -1, candidate: -1, progress: 0, side, justLocked: false, justLost: false, ...s });

  /** Bodies sorted by distance to the anchor (only those with visible shoulders). */
  const ranked = (ts: (Torso | null)[]) =>
    ts
      .map((t, i) => (t && anchor ? { i, t, d: dist(t, anchor) } : null))
      .filter((r): r is { i: number; t: Torso; d: number } => r !== null)
      .sort((a, b) => a.d - b.d);

  const sameSize = (t: Torso) => anchor !== null && t.size <= anchor.size * o.sizeRatio && t.size * o.sizeRatio >= anchor.size;

  return {
    update(poses: Pose[], now: number): LockStep {
      const ts = poses.map(torso);

      if (phase === 'locked') {
        const gap = Math.max(0, now - lastMatch) / 1000;
        const reach = Math.min(o.maxJump, anchor!.size * (1 + o.stepPerSec * gap));
        const best = ranked(ts).find((r) => r.d <= reach && sameSize(r.t));
        if (best) {
          lastMatch = now;
          anchor = best.t;
          return step({ player: best.i, progress: 1 });
        }
        if (now - lastMatch <= o.lostMs) return step({ progress: 1 });
        phase = 'waiting';
        anchor = null;
        side = null;
        return step({ justLost: true });
      }

      if (phase === 'claiming') {
        const raised = ranked(ts).filter((r) => r.d <= o.maxJump && raisedWrist(poses[r.i]));
        const c = raised[0];
        if (c) {
          anchor = c.t;
          side = raisedSide(poses[c.i]);
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
        side = null;
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
        side = raisedSide(poses[pick]);
        since = now;
        return step({ candidate: pick, progress: 0 });
      }
      return step({});
    },
    reset() {
      phase = 'waiting';
      anchor = null;
      side = null;
    },
  };
}
