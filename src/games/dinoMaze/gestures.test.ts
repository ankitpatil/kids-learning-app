import { describe, expect, it } from 'vitest';
import { createGestureDetector, createHover, type BodyFrame, type Target } from './gestures';

const SIZE = 100; // shoulder width, px
const rocks: Target[] = [
  { id: 'a', rect: { left: 100, top: 300, right: 300, bottom: 500 } },
  { id: 'b', rect: { left: 500, top: 300, right: 700, bottom: 500 } },
];
const f = (t: number, hands: BodyFrame['hands'], torso: BodyFrame['torso'] = { x: 400, y: 300 }): BodyFrame => ({ t, hands, torso, size: SIZE });

/** Move a hand from `from` to `to` over `ms`, one frame every 33 ms; returns what fired. */
function swing(d: ReturnType<typeof createGestureDetector>, t0: number, from: { x: number; y: number }, to: { x: number; y: number }, ms: number, targets = rocks, side: 'left' | 'right' = 'right') {
  const fired: string[] = [];
  const steps = Math.max(1, Math.round(ms / 33));
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const p = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
    const s = d.update(f(t0 + i * 33, { [side]: p }), targets);
    if (s.fired) fired.push(s.fired);
  }
  return fired;
}

describe('bash', () => {
  it('a fast swing onto a rock smashes it', () => {
    const d = createGestureDetector('bash');
    expect(swing(d, 0, { x: 200, y: 100 }, { x: 200, y: 400 }, 150)).toEqual(['a']); // 3 px/ms = 30 sw/s
  });

  it('resting or slowly moving a hand over a rock does nothing (only aims)', () => {
    const d = createGestureDetector('bash');
    expect(swing(d, 0, { x: 150, y: 400 }, { x: 250, y: 400 }, 2000)).toEqual([]); // 0.5 sw/s
    expect(d.update(f(2100, { right: { x: 200, y: 400 } }), rocks).aimed).toEqual(['a']);
  });

  it('one sweep across two rocks only hits one', () => {
    const d = createGestureDetector('bash');
    expect(swing(d, 0, { x: 50, y: 400 }, { x: 750, y: 400 }, 200)).toHaveLength(1);
  });
});

describe('chop', () => {
  const vines: Target[] = [{ id: 'v', rect: { left: 100, top: 150, right: 250, bottom: 700 } }];
  it('a fast downward chop cuts the vine', () => {
    const d = createGestureDetector('chop');
    expect(swing(d, 0, { x: 175, y: 100 }, { x: 175, y: 500 }, 160, vines)).toEqual(['v']);
  });
  it('a fast sideways or upward swing does not', () => {
    const d = createGestureDetector('chop');
    expect(swing(d, 0, { x: 0, y: 400 }, { x: 400, y: 420 }, 160, vines)).toEqual([]);
    expect(swing(d, 1000, { x: 175, y: 700 }, { x: 175, y: 200 }, 160, vines)).toEqual([]);
  });
});

describe('grab', () => {
  it('both hands on the same key for a moment grabs it', () => {
    const d = createGestureDetector('grab');
    let fired: string | null = null;
    for (let t = 0; t <= 400 && !fired; t += 33) fired = d.update(f(t, { left: { x: 150, y: 400 }, right: { x: 250, y: 400 } }), rocks).fired;
    expect(fired).toBe('a');
  });
  it('each grab is one hit: let go and grab again for the next', () => {
    const d = createGestureDetector('grab');
    const both = { left: { x: 150, y: 400 }, right: { x: 250, y: 400 } };
    const fired: string[] = [];
    for (let t = 0; t <= 1500; t += 33) {
      const s = d.update(f(t, both), rocks).fired; // holding on the whole time
      if (s) fired.push(s);
    }
    expect(fired).toEqual(['a']);
    d.update(f(1550, {}), rocks); // let go
    let again: string | null = null;
    for (let t = 1600; t <= 2100 && !again; t += 33) again = d.update(f(t, both), rocks).fired;
    expect(again).toBe('a');
  });

  it('one hand, or hands on different keys, never grabs', () => {
    const d = createGestureDetector('grab');
    for (let t = 0; t <= 1000; t += 33) {
      expect(d.update(f(t, { right: { x: 200, y: 400 } }), rocks).fired).toBeNull();
      expect(d.update(f(t + 1, { left: { x: 200, y: 400 }, right: { x: 600, y: 400 } }), rocks).fired).toBeNull();
    }
  });
});

describe('jump', () => {
  const stones: Target[] = [
    { id: 's1', rect: { left: 0, top: 800, right: 400, bottom: 1000 } },
    { id: 's2', rect: { left: 600, top: 800, right: 1000, bottom: 1000 } },
  ];
  const stand = (d: ReturnType<typeof createGestureDetector>, t0: number, x: number, ms: number, y = 300) => {
    let last = d.update(f(t0, {}, { x, y }), stones);
    for (let t = t0 + 33; t <= t0 + ms; t += 33) last = d.update(f(t, {}, { x, y }), stones);
    return last;
  };

  it('standing by a stone aims at it; jumping picks it once', () => {
    const d = createGestureDetector('jump');
    expect(stand(d, 0, 800, 600).aimed).toEqual(['s2']);
    const up = d.update(f(633, {}, { x: 800, y: 250 }), stones); // shoulders 0.5 sw higher
    expect(up.fired).toBe('s2');
    expect(up.airborne).toBe(true);
    expect(d.update(f(666, {}, { x: 800, y: 245 }), stones).fired).toBeNull(); // same jump
    expect(d.update(f(700, {}, { x: 800, y: 300 }), stones).airborne).toBe(false); // landed
  });

  it('small bobs and slow drifts are not jumps', () => {
    const d = createGestureDetector('jump');
    stand(d, 0, 200, 600);
    expect(d.update(f(633, {}, { x: 200, y: 285 }), stones).fired).toBeNull(); // 0.15 sw
    // walking closer to the camera slowly moves the shoulders: rest height follows
    let fired = null;
    for (let t = 666, y = 285; t < 6000; t += 33, y -= 0.3) fired ??= d.update(f(t, {}, { x: 200, y }), stones).fired;
    expect(fired).toBeNull();
  });

  it('every jump is a hit: jump 3 times, 3 hits', () => {
    const d = createGestureDetector('jump');
    let t = 0;
    stand(d, t, 800, 600);
    let n = 0;
    for (let j = 0; j < 3; j++) {
      t += 633;
      if (d.update(f(t, {}, { x: 800, y: 250 }), stones).fired) n++;
      t += 33;
      d.update(f(t, {}, { x: 800, y: 300 }), stones); // land
      stand(d, t + 33, 800, 400);
      t += 433;
    }
    expect(n).toBe(3);
  });

  it('a jump between stones picks nothing', () => {
    const d = createGestureDetector('jump');
    stand(d, 0, 500, 600);
    expect(d.update(f(633, {}, { x: 500, y: 240 }), stones).fired).toBeNull();
  });

  it('after reset, a jump already in the air does not answer the new question', () => {
    const d = createGestureDetector('jump');
    stand(d, 0, 200, 600);
    expect(d.update(f(633, {}, { x: 200, y: 240 }), stones).fired).toBe('s1');
    d.reset(-10_000);
    expect(d.update(f(666, {}, { x: 200, y: 238 }), stones).fired).toBeNull();
  });
});

describe('cooldown', () => {
  it('repeated smashes on the same rock each count (a beat apart)', () => {
    const d = createGestureDetector('bash');
    let n = 0;
    for (let k = 0; k < 4; k++) n += swing(d, k * 600, { x: 200, y: 100 }, { x: 200, y: 400 }, 150).length;
    expect(n).toBe(4);
  });

  it('right after a hit, nothing fires for a moment', () => {
    const d = createGestureDetector('bash');
    expect(swing(d, 0, { x: 200, y: 100 }, { x: 200, y: 400 }, 150)).toEqual(['a']);
    expect(swing(d, 200, { x: 600, y: 100 }, { x: 600, y: 400 }, 150)).toEqual([]);
    expect(swing(d, 2000, { x: 600, y: 100 }, { x: 600, y: 400 }, 150)).toEqual(['b']);
  });
  it('reset blocks choices briefly so a swing from the last question does not carry over', () => {
    const d = createGestureDetector('bash');
    d.reset(1000);
    expect(swing(d, 1000, { x: 200, y: 100 }, { x: 200, y: 400 }, 150)).toEqual([]);
  });
});

describe('hover (hear again)', () => {
  it('fires once after holding, again only after moving off', () => {
    const h = createHover(1000);
    expect(h.update('card', 0).fire).toBe(false);
    expect(h.update('card', 500).progress).toBeCloseTo(0.5);
    expect(h.update('card', 1000).fire).toBe(true);
    expect(h.update('card', 3000).fire).toBe(false);
    h.update(null, 3100);
    h.update('card', 3200);
    expect(h.update('card', 4200).fire).toBe(true);
  });
});
