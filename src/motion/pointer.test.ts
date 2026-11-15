import { describe, expect, it } from 'vitest';
import { ACTIVE_ZONE, HOLD_MS, createDwell, smooth, toScreen } from './pointer';

describe('toScreen', () => {
  it('mirrors x so the cursor moves the way the hand moves', () => {
    expect(toScreen({ x: 0.5, y: 0.5 }, 1000, 500)).toEqual({ x: 500, y: 250 });
    // hand on the camera's left edge of the active zone = the child's right = screen right
    const m = (1 - ACTIVE_ZONE) / 2;
    expect(toScreen({ x: m, y: m }, 1000, 500)).toEqual({ x: 1000, y: 0 });
    expect(toScreen({ x: 1 - m, y: 1 - m }, 1000, 500).x).toBeCloseTo(0);
  });

  it('clamps points outside the active zone to the screen edge', () => {
    expect(toScreen({ x: -0.2, y: 1.4 }, 800, 600)).toEqual({ x: 800, y: 600 });
    expect(toScreen({ x: 1.2, y: -1 }, 800, 600)).toEqual({ x: 0, y: 0 });
  });
});

describe('smooth', () => {
  it('starts at the first point and moves part of the way after', () => {
    const a = smooth(null, { x: 100, y: 100 });
    expect(a).toEqual({ x: 100, y: 100 });
    const b = smooth(a, { x: 200, y: 100 }, 0.5);
    expect(b).toEqual({ x: 150, y: 100 });
  });
});

describe('createDwell', () => {
  it('fires after holding the same target for HOLD_MS', () => {
    const d = createDwell<string>();
    expect(d.update('a', 0)).toEqual({ progress: 0, fire: false });
    expect(d.update('a', HOLD_MS / 2).progress).toBeCloseTo(0.5);
    expect(d.update('a', HOLD_MS - 1).fire).toBe(false);
    expect(d.update('a', HOLD_MS).fire).toBe(true);
  });

  it('restarts when the hand moves to another target or off', () => {
    const d = createDwell<string>(100);
    d.update('a', 0);
    d.update('a', 90);
    expect(d.update('b', 95)).toEqual({ progress: 0, fire: false });
    expect(d.update('b', 150).fire).toBe(false);
    expect(d.update(null, 160)).toEqual({ progress: 0, fire: false });
    expect(d.update(null, 999)).toEqual({ progress: 0, fire: false });
  });

  it('keeps firing every HOLD_MS while held (cookie after cookie)', () => {
    const d = createDwell<string>(100);
    d.update('cookie', 0);
    expect(d.update('cookie', 100).fire).toBe(true);
    expect(d.update('cookie', 150).fire).toBe(false);
    expect(d.update('cookie', 200).fire).toBe(true);
  });

  it('reset forgets the target', () => {
    const d = createDwell<string>(100);
    d.update('a', 0);
    d.reset();
    expect(d.update('a', 100).fire).toBe(false);
  });
});
