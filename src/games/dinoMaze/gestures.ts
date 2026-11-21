// Body moves for the Dino Maze puzzles, from the player's tracked hands and shoulders (MediaPipe Pose),
// in screen pixels of the full-screen mirror view. Pure and frame-driven, so it can be tested with
// made-up frames. Speeds are measured in the player's own shoulder widths per second, so a small child
// near the camera and a tall one further back need the same effort.
//
//   bash  — swing a hand fast onto the target (smash a rock, bonk a bat)
//   chop  — karate chop: a hand moving fast *downward* through the target (cut a vine)
//   grab  — both hands on the same target together, briefly (grab a key)
//   jump  — stand by the target (body over it) and jump (shoulders pop up)
import type { Gesture } from './maze';

export interface Pt {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Target {
  id: string;
  rect: Rect;
}

export interface BodyFrame {
  t: number; // ms
  /** The player's hands this frame (either may be missing). */
  hands: { left?: Pt; right?: Pt };
  /** Shoulder centre, or null when not seen. */
  torso: Pt | null;
  /** Shoulder width in screen px (the body's scale). */
  size: number;
}

export interface GestureStep {
  /** Target chosen this frame, if any. */
  fired: string | null;
  /** Targets a hand (or, for jump, the body) is over right now — shown as "aiming". */
  aimed: string[];
  /** Jump only: the player is in the air. */
  airborne: boolean;
}

export interface GestureOptions {
  /** Fast enough to count as a swing (shoulder widths / s). */
  swing: number;
  /** A swing still counts this long after the hand was last fast (it may slow down on the target). */
  swingMemoryMs: number;
  /** Chop: downward speed must be this many times the sideways speed. */
  chopRatio: number;
  /** Grab: both hands on the target for this long. */
  grabMs: number;
  /** Jump: shoulders this far above their resting height (shoulder widths). */
  jumpRise: number;
  /** Jump: back down within this of rest (shoulder widths) before the next jump counts. */
  landWithin: number;
  /** Resting height follows the shoulders this slowly (ms) while standing. */
  restTauMs: number;
  /** After any choice, ignore everything for this long (a sweep can't hit two targets). */
  cooldownMs: number;
  /** Velocity is measured over this window. */
  windowMs: number;
}

export const DEFAULT_GESTURE: GestureOptions = {
  swing: 3.2,
  swingMemoryMs: 220,
  chopRatio: 1.3,
  grabMs: 250,
  jumpRise: 0.3,
  landWithin: 0.12,
  restTauMs: 900,
  cooldownMs: 900,
  windowMs: 120,
};

export const inside = (r: Rect, p: Pt, pad = 0) => p.x >= r.left - pad && p.x <= r.right + pad && p.y >= r.top - pad && p.y <= r.bottom + pad;

type Sample = Pt & { t: number };

/** Hand velocity (px / ms) over the last `windowMs`, from a short sample history. */
function velocity(hist: Sample[]): Pt {
  if (hist.length < 2) return { x: 0, y: 0 };
  const a = hist[0];
  const b = hist[hist.length - 1];
  const dt = Math.max(1, b.t - a.t);
  return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
}

export function createGestureDetector(gesture: Gesture, opts: Partial<GestureOptions> = {}) {
  const o = { ...DEFAULT_GESTURE, ...opts };
  const hist: Record<'left' | 'right', Sample[]> = { left: [], right: [] };
  const fastAt: Record<'left' | 'right', number> = { left: -Infinity, right: -Infinity };
  let blockedUntil = -Infinity;
  let grabbing: { id: string; since: number } | null = null;
  let rest: number | null = null;
  let lastT = 0;
  let airborne = false;
  let jumped = false; // already fired for this jump

  const none = (aimed: string[] = []): GestureStep => ({ fired: null, aimed, airborne });

  function track(f: BodyFrame) {
    for (const side of ['left', 'right'] as const) {
      const p = f.hands[side];
      const h = hist[side];
      if (!p) {
        h.length = 0;
        continue;
      }
      h.push({ ...p, t: f.t });
      while (h.length > 2 && f.t - h[0].t > o.windowMs) h.shift();
      const v = velocity(h);
      const speed = (Math.hypot(v.x, v.y) * 1000) / Math.max(1, f.size);
      // Chop only counts fast, mostly-downward moves; bash any direction.
      const fast = gesture === 'chop' ? (v.y * 1000) / Math.max(1, f.size) >= o.swing && v.y >= Math.abs(v.x) * o.chopRatio : speed >= o.swing;
      if (fast) fastAt[side] = f.t;
    }
  }

  const handsOver = (f: BodyFrame, targets: Target[]) => {
    const out: { side: 'left' | 'right'; id: string }[] = [];
    for (const side of ['left', 'right'] as const) {
      const p = f.hands[side];
      if (!p) continue;
      const t = targets.find((x) => inside(x.rect, p));
      if (t) out.push({ side, id: t.id });
    }
    return out;
  };

  return {
    update(f: BodyFrame, targets: Target[]): GestureStep {
      track(f);
      const dt = lastT ? Math.max(0, f.t - lastT) : 16;
      lastT = f.t;

      if (gesture === 'jump') {
        const torso = f.torso;
        if (!torso) return none();
        const lane = targets.find((x) => torso.x >= x.rect.left && torso.x <= x.rect.right)?.id;
        const aimed = lane ? [lane] : [];
        if (rest === null) rest = torso.y;
        const rise = (rest - torso.y) / Math.max(1, f.size); // up is smaller y
        if (!airborne && rise >= o.jumpRise) {
          airborne = true;
          jumped = false;
        } else if (airborne && rise <= o.landWithin) {
          airborne = false;
        }
        // Resting height follows slow changes (stepping closer, crouching) only while standing.
        if (!airborne) rest += (torso.y - rest) * (1 - Math.exp(-dt / o.restTauMs));
        if (airborne && !jumped && lane && f.t >= blockedUntil) {
          jumped = true;
          blockedUntil = f.t + o.cooldownMs;
          return { fired: lane, aimed, airborne };
        }
        return none(aimed);
      }

      const over = handsOver(f, targets);
      const aimed = [...new Set(over.map((x) => x.id))];
      if (f.t < blockedUntil) {
        grabbing = null;
        return none(aimed);
      }

      if (gesture === 'grab') {
        const both = over.length === 2 && over[0].id === over[1].id ? over[0].id : null;
        if (!both) {
          grabbing = null;
          return none(aimed);
        }
        if (!grabbing || grabbing.id !== both) grabbing = { id: both, since: f.t };
        if (f.t - grabbing.since >= o.grabMs) {
          grabbing = null;
          blockedUntil = f.t + o.cooldownMs;
          return { fired: both, aimed, airborne };
        }
        return none(aimed);
      }

      // bash / chop: a hand on a target that was swinging fast just now
      const hit = over.find((x) => f.t - fastAt[x.side] <= o.swingMemoryMs);
      if (hit) {
        blockedUntil = f.t + o.cooldownMs;
        fastAt.left = fastAt.right = -Infinity;
        return { fired: hit.id, aimed, airborne };
      }
      return none(aimed);
    },
    /** New puzzle: forget the hands' history and any pending grab (keeps the jump rest height). */
    reset(now = 0) {
      hist.left.length = 0;
      hist.right.length = 0;
      fastAt.left = fastAt.right = -Infinity;
      grabbing = null;
      jumped = true; // landing first, so a jump in progress doesn't answer the new question
      blockedUntil = now + o.cooldownMs;
    },
  };
}

/** Hold-to-press for plain buttons in the TV game (hear the question again): hand on it for `ms`. */
export function createHover(ms = 1200) {
  let id: string | null = null;
  let since = 0;
  return {
    update(over: string | null, now: number): { progress: number; fire: boolean } {
      if (over !== id) {
        id = over;
        since = now;
      }
      if (!id) return { progress: 0, fire: false };
      const p = Math.min(1, (now - since) / ms);
      if (p >= 1) {
        since = Infinity; // fire once; move off and back on to press again
        return { progress: 1, fire: true };
      }
      return { progress: Math.max(0, p), fire: false };
    },
  };
}
