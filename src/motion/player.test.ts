import { describe, expect, it } from 'vitest';
import {
  L_HIP, L_SHOULDER, L_WRIST, NOSE, R_HIP, R_SHOULDER, R_WRIST,
  activeWrist, createBodyFrame, createHandPicker, createPlayerLock, handCentre, raisedWrist, reachToScreen, torso, type Pose,
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

  it('someone walking in next to the player does not freeze or steal the cursor', () => {
    const lock = createPlayerLock({ claimMs: 0 });
    lock.update([body(0.5, 'up')], 0);
    lock.update([body(0.5, 'up')], 1);
    // a newcomer steps in close beside the player, listed first, waving
    const s = lock.update([body(0.62, 'up'), body(0.5, 'mid')], 50);
    expect(s).toMatchObject({ phase: 'locked', player: 1 });
  });

  it('while the player is unseen for a moment, a newcomer near that spot is not taken for them', () => {
    const lock = createPlayerLock({ claimMs: 0 });
    lock.update([body(0.5, 'up')], 0);
    lock.update([body(0.5, 'up')], 1);
    // player missed for a frame; a newcomer is 0.2 away (more than they could have moved in 50 ms)
    expect(lock.update([body(0.7, 'up')], 50).player).toBe(-1);
    // someone at the same spot but much closer to the camera (twice the size) isn't the player either
    const big = body(0.5, 'mid');
    big[L_SHOULDER].x = 0.6;
    big[R_SHOULDER].x = 0.4;
    expect(lock.update([big], 100).player).toBe(-1);
    // the player comes back
    expect(lock.update([body(0.7), body(0.52, 'mid')], 150).player).toBe(1);
  });

  it('remembers which hand claimed the turn', () => {
    const lock = createPlayerLock({ claimMs: 0 });
    const p = body(0.5, 'up'); // right hand up
    lock.update([p], 0);
    expect(lock.update([p], 1)).toMatchObject({ phase: 'locked', side: 'right' });
    expect(lock.update([body(0.5)], 50).side).toBe('right'); // still the right hand with it down
    lock.reset();
    const q = body(0.5);
    q[L_WRIST] = { x: 0.58, y: 0.15, visibility: 1 }; // left hand up
    lock.update([q], 100);
    expect(lock.update([q], 101).side).toBe('left');
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

describe('steadier TV cursor', () => {
  /** Body with both hands at chosen heights (relative to the shoulder line at y = 0.4). */
  function twoHands(leftY: number, rightY: number): Pose {
    const p = body(0.5);
    p[L_WRIST] = { x: 0.58, y: leftY, visibility: 1 };
    p[R_WRIST] = { x: 0.42, y: rightY, visibility: 1 };
    return p;
  }

  it('picks the higher lifted hand to start with', () => {
    expect(createHandPicker().update(twoHands(0.35, 0.3))!.side).toBe('right');
    expect(createHandPicker().update(twoHands(0.3, 0.35))!.side).toBe('left');
    expect(createHandPicker().update(body(0.5, 'down'))).toBeNull();
  });

  it('stays with the same hand when both are up at about the same height', () => {
    const pick = createHandPicker();
    expect(pick.update(twoHands(0.32, 0.3))!.side).toBe('right');
    // left now a little higher (by less than the switch margin of 0.6 shoulder widths = 0.06)
    expect(pick.update(twoHands(0.27, 0.3))!.side).toBe('right');
    // clearly higher: hand over
    expect(pick.update(twoHands(0.2, 0.3))!.side).toBe('left');
  });

  it('keeps the cursor hand while it sags a little below the lift line', () => {
    // lift line = halfway between shoulders (0.4) and hips (0.65) = 0.525
    const pick = createHandPicker();
    expect(pick.update(twoHands(0.7, 0.5))!.side).toBe('right');
    expect(pick.update(twoHands(0.7, 0.54))!.side).toBe('right'); // a fresh picker would say no hand here
    expect(createHandPicker().update(twoHands(0.7, 0.54))).toBeNull();
    expect(pick.update(twoHands(0.7, 0.7))).toBeNull(); // arm down: cursor gone
  });

  it('hand point weights each point by the tracker’s confidence (no jump when a knuckle fades)', () => {
    const p = body(0.5, 'mid'); // right wrist at (0.42, 0.45)
    p[20] = { x: 0.52, y: 0.45, visibility: 0.3 }; // barely seen: no weight
    expect(handCentre(p, 'right').x).toBeCloseTo(0.42);
    p[20].visibility = 1;
    expect(handCentre(p, 'right').x).toBeCloseTo(0.47);
    p[20].visibility = 0.55; // in between: a partial nudge, not all-or-nothing
    const x = handCentre(p, 'right').x;
    expect(x).toBeGreaterThan(0.42);
    expect(x).toBeLessThan(0.47);
  });

  it('body frame eases shoulder wobble but snaps when the player is somewhere else', () => {
    const f = createBodyFrame(350);
    f.update({ x: 0.5, y: 0.4, size: 0.1 }, 0);
    const wob = f.update({ x: 0.52, y: 0.4, size: 0.11 }, 33);
    expect(wob.x).toBeGreaterThan(0.5);
    expect(wob.x).toBeLessThan(0.505); // ~9% of the way in one frame
    expect(wob.size).toBeLessThan(0.1025);
    const moved = f.update({ x: 0.9, y: 0.4, size: 0.1 }, 66);
    expect(moved.x).toBe(0.9);
  });

  it('reach box can use the smoothed frame', () => {
    const p = body(0.5);
    const w = { x: 0.5, y: 0.37, visibility: 1 };
    const a = reachToScreen(w, p, 1000, 1000)!;
    const b = reachToScreen(w, p, 1000, 1000, { x: 0.5, y: 0.4, size: 0.1 })!;
    expect(b.x).toBeCloseTo(a.x);
    expect(b.y).toBeCloseTo(a.y);
  });
});

describe('the hand that claimed the turn is the only cursor hand', () => {
  it('ignores the other hand, even when it is higher', () => {
    const pick = createHandPicker();
    const p = body(0.5, 'mid'); // right hand lifted to the chest
    p[L_WRIST] = { x: 0.58, y: 0.1, visibility: 1 }; // left hand way up
    expect(pick.update(p, 'right')!.side).toBe('right');
    const down = body(0.5, 'down');
    down[L_WRIST] = { x: 0.58, y: 0.1, visibility: 1 };
    expect(pick.update(down, 'right')).toBeNull(); // right hand down: no cursor, not the left hand
  });
});
