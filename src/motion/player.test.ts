import { describe, expect, it } from 'vitest';
import {
  L_HIP, L_SHOULDER, L_WRIST, NOSE, R_HIP, R_SHOULDER, R_WRIST,
  activeWrist, createPlayerLock, raisedWrist, reachToScreen, torso, type Pose,
} from './player';

/** A body standing at x (shoulders 0.1 wide at y = 0.4); hand 'up' (above head), 'mid' (chest) or 'down'. */
function body(x: number, hand: 'up' | 'mid' | 'down' = 'down', opts: { y?: number } = {}): Pose {
  const y = opts.y ?? 0.4;
  const p: Pose = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  p[NOSE] = { x, y: y - 0.1, visibility: 1 };
  p[L_SHOULDER] = { x: x + 0.05, y, visibility: 1 };
  p[R_SHOULDER] = { x: x - 0.05, y, visibility: 1 };
  p[L_HIP] = { x: x + 0.04, y: y + 0.25, visibility: 1 };
  p[R_HIP] = { x: x - 0.04, y: y + 0.25, visibility: 1 };
  p[L_WRIST] = { x: x + 0.08, y: y + 0.3, visibility: 1 };
  const wy = hand === 'up' ? y - 0.2 : hand === 'mid' ? y + 0.05 : y + 0.3;
  p[R_WRIST] = { x: x - 0.08, y: wy, visibility: 1 };
  return p;
}

describe('body helpers', () => {
  it('finds the torso centre and scale', () => {
    const t = torso(body(0.5))!;
    expect(t.x).toBeCloseTo(0.5);
    expect(t.y).toBeCloseTo(0.4);
    expect(t.size).toBeCloseTo(0.1);
  });

  it('no torso when shoulders are not visible', () => {
    const p = body(0.5);
    p[L_SHOULDER].visibility = 0.1;
    expect(torso(p)).toBeNull();
  });

  it('a raised hand is above the head', () => {
    expect(raisedWrist(body(0.5, 'up'))).not.toBeNull();
    expect(raisedWrist(body(0.5, 'mid'))).toBeNull();
    expect(raisedWrist(body(0.5, 'down'))).toBeNull();
  });

  it('the cursor hand must be lifted (arms at the sides = no cursor)', () => {
    expect(activeWrist(body(0.5, 'down'))).toBeNull();
    expect(activeWrist(body(0.5, 'mid'))!.y).toBeCloseTo(0.45);
    expect(activeWrist(body(0.5, 'up'))!.y).toBeCloseTo(0.2);
  });

  it('steadies the cursor point by averaging the wrist with that hand’s visible knuckles', () => {
    const p = body(0.5, 'mid');
    p[18] = { x: 0.40, y: 0.41, visibility: 1 }; // right pinky
    p[20] = { x: 0.44, y: 0.43, visibility: 1 }; // right index
    p[17] = { x: 0.9, y: 0.9, visibility: 1 }; // left pinky must not be mixed in
    const w = activeWrist(p)!;
    expect(w.x).toBeCloseTo((0.42 + 0.40 + 0.44) / 3);
    expect(w.y).toBeCloseTo((0.45 + 0.41 + 0.43) / 3);
  });

  it('maps the wrist within the player’s own reach box, mirrored', () => {
    const p = body(0.5);
    // reach box: 0.4 wide centred on x = 0.5, top at 0.4 - 0.3 * 0.6 = 0.22, 0.3 tall
    const mid = reachToScreen({ x: 0.5, y: 0.37 }, p, 1000, 1000)!;
    expect(mid.x).toBeCloseTo(500);
    expect(mid.y).toBeCloseTo(500);
    const right = reachToScreen({ x: 0.3, y: 0.22 }, p, 1000, 1000)!; // camera-left = the child's right
    expect(right.x).toBeCloseTo(1000);
    expect(right.y).toBeCloseTo(0);
    const far = reachToScreen({ x: 0.9, y: 0.9 }, p, 1000, 1000)!; // outside the box → clamped to the edge
    expect(far.x).toBeCloseTo(0);
    expect(far.y).toBeCloseTo(1000);
  });
});

describe('createPlayerLock', () => {
  it('waits until someone holds a hand up for the claim time', () => {
    const lock = createPlayerLock({ claimMs: 1000 });
    expect(lock.update([body(0.3), body(0.7)], 0).phase).toBe('waiting');
    const s1 = lock.update([body(0.3), body(0.7, 'up')], 100);
    expect(s1).toMatchObject({ phase: 'claiming', candidate: 1, progress: 0 });
    expect(lock.update([body(0.3), body(0.7, 'up')], 600).progress).toBeCloseTo(0.5);
    const s2 = lock.update([body(0.3), body(0.7, 'up')], 1100);
    expect(s2).toMatchObject({ phase: 'locked', player: 1, justLocked: true });
  });

  it('cancels the claim if the hand comes down too soon', () => {
    const lock = createPlayerLock({ claimMs: 1000 });
    lock.update([body(0.5, 'up')], 0);
    expect(lock.update([body(0.5)], 500).phase).toBe('waiting');
  });

  it('follows the player and ignores others, even if they wave or the order changes', () => {
    const lock = createPlayerLock({ claimMs: 0 });
    lock.update([body(0.3, 'up'), body(0.7)], 0);
    lock.update([body(0.3, 'up'), body(0.7)], 1);
    // the other child waves, the detector lists people in a different order, the player steps right a bit
    const s = lock.update([body(0.7, 'up'), body(0.35, 'mid')], 50);
    expect(s).toMatchObject({ phase: 'locked', player: 1 });
    const s2 = lock.update([body(0.4, 'mid'), body(0.7, 'up')], 100);
    expect(s2.player).toBe(0);
  });

  it('does not guess when two bodies are equally close (crossing paths)', () => {
    const lock = createPlayerLock({ claimMs: 0 });
    lock.update([body(0.5, 'up')], 0);
    lock.update([body(0.5, 'up')], 1);
    const s = lock.update([body(0.45), body(0.55)], 50);
    expect(s).toMatchObject({ phase: 'locked', player: -1 });
  });

  it('frees the turn when the player has been gone for lostMs', () => {
    const lock = createPlayerLock({ claimMs: 0, lostMs: 2000 });
    lock.update([body(0.5, 'up')], 0);
    lock.update([body(0.5, 'up')], 1);
    expect(lock.update([], 1000)).toMatchObject({ phase: 'locked', player: -1 });
    expect(lock.update([body(0.9)], 2500)).toMatchObject({ phase: 'waiting', justLost: true });
  });

  it('a far-away body is not mistaken for the player', () => {
    const lock = createPlayerLock({ claimMs: 0, maxJump: 0.25 });
    lock.update([body(0.2, 'up')], 0);
    lock.update([body(0.2, 'up')], 1);
    expect(lock.update([body(0.8, 'mid')], 50).player).toBe(-1);
  });

  it('with two hands up at once, the higher hand claims', () => {
    const lock = createPlayerLock({ claimMs: 1000 });
    const a = body(0.3, 'up');
    const b = body(0.7, 'up');
    b[R_WRIST].y = 0.05; // higher
    expect(lock.update([a, b], 0).candidate).toBe(1);
  });
});
