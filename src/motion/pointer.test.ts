import { describe, expect, it } from 'vitest';
import { ACTIVE_ZONE, HOLD_MS, holdFor, createDwell, createOneEuro, createDeadband, glide, nearBox, padsVisible, scrollSpeed, steadiness, SCROLL_DELAY_MS, SCROLL_RAMP_MS, smooth, toScreen, DEADBAND_BODY, STICKY_BODY, STICKY_PX, EURO_BODY, type Pt } from './pointer';

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


describe('createOneEuro', () => {
  it('starts at the first point', () => {
    const f = createOneEuro();
    expect(f.filter({ x: 100, y: 50 }, 0)).toEqual({ x: 100, y: 50 });
  });

  it('damps jitter while the hand is still', () => {
    const f = createOneEuro();
    f.filter({ x: 500, y: 500 }, 0);
    let out = { x: 500, y: 500 };
    let worst = 0;
    for (let i = 1; i <= 60; i++) {
      const noise = i % 2 ? 8 : -8; // ±8 px tracker jitter at 30 fps
      out = f.filter({ x: 500 + noise, y: 500 - noise }, i * 33);
      worst = Math.max(worst, Math.abs(out.x - 500));
    }
    expect(worst).toBeLessThan(4); // jitter cut by more than half
  });

  it('keeps up with a fast sweep (little lag)', () => {
    const f = createOneEuro();
    let out = { x: 0, y: 0 };
    for (let i = 0; i <= 15; i++) out = f.filter({ x: i * 60, y: 0 }, i * 33); // ~1800 px/s
    expect(900 - out.x).toBeLessThan(150);
  });

  it('reset forgets the history', () => {
    const f = createOneEuro();
    f.filter({ x: 0, y: 0 }, 0);
    f.reset();
    expect(f.filter({ x: 300, y: 300 }, 33)).toEqual({ x: 300, y: 300 });
  });
});

describe('glide', () => {
  it('moves part of the way, more for longer frames, never overshooting', () => {
    const a = glide({ x: 0, y: 0 }, { x: 100, y: 0 }, 8);
    const b = glide({ x: 0, y: 0 }, { x: 100, y: 0 }, 16);
    expect(a.x).toBeGreaterThan(0);
    expect(b.x).toBeGreaterThan(a.x);
    expect(glide({ x: 0, y: 0 }, { x: 100, y: 0 }, 10_000).x).toBeLessThanOrEqual(100);
  });

  it('is frame-rate independent (two 8 ms steps = one 16 ms step)', () => {
    const two = glide(glide({ x: 0, y: 0 }, { x: 100, y: 0 }, 8), { x: 100, y: 0 }, 8);
    const one = glide({ x: 0, y: 0 }, { x: 100, y: 0 }, 16);
    expect(two.x).toBeCloseTo(one.x);
  });
});

describe('nearBox (sticky hold)', () => {
  const b = { left: 100, top: 100, right: 200, bottom: 160 };
  it('counts points on the button or just off its edge', () => {
    expect(nearBox(b, { x: 150, y: 130 })).toBe(true);
    expect(nearBox(b, { x: 220, y: 130 }, 28)).toBe(true);
    expect(nearBox(b, { x: 240, y: 130 }, 28)).toBe(false);
    expect(nearBox(b, { x: 150, y: 50 }, 28)).toBe(false);
  });
});

describe('scrollSpeed', () => {
  it('does not scroll when the hand just passes over a pad', () => {
    expect(scrollSpeed(0, 1000)).toBe(0);
    expect(scrollSpeed(SCROLL_DELAY_MS - 1, 1000)).toBe(0);
  });
  it('starts slow and speeds up to a cap, relative to the screen height', () => {
    const start = scrollSpeed(SCROLL_DELAY_MS, 1000);
    const mid = scrollSpeed(SCROLL_DELAY_MS + SCROLL_RAMP_MS / 2, 1000);
    const full = scrollSpeed(SCROLL_DELAY_MS + SCROLL_RAMP_MS, 1000);
    expect(start).toBeGreaterThan(0);
    expect(mid).toBeGreaterThan(start);
    expect(full).toBeGreaterThan(mid);
    expect(scrollSpeed(60_000, 1000)).toBe(full);
    expect(scrollSpeed(60_000, 2000)).toBeCloseTo(full * 2);
  });
});

describe('per-target hold (data-motion-hold)', () => {
  it('a balloon pops on a short touch, other buttons keep the long hold', () => {
    const d = createDwell<string>();
    d.update('balloon', 0, 250);
    expect(d.update('balloon', 200, 250).fire).toBe(false);
    expect(d.update('balloon', 250, 250).fire).toBe(true);
    d.update('button', 300);
    expect(d.update('button', 600).fire).toBe(false);
  });
  it('holdFor reads and clamps the attribute', () => {
    expect(holdFor(null)).toBe(HOLD_MS);
    expect(holdFor('abc')).toBe(HOLD_MS);
    expect(holdFor('250')).toBe(250);
    expect(holdFor('10')).toBe(150);
    expect(holdFor('5000')).toBe(HOLD_MS);
  });
});

describe('TV distance steadiness', () => {
  it('scales the dead zone and sticky margin with the screen; hand mode unchanged', () => {
    expect(steadiness('hand', 1920, 1080)).toEqual({ deadband: 0, sticky: STICKY_PX });
    const hd = steadiness('body', 1920, 1080);
    expect(hd.deadband).toBeCloseTo(1080 * DEADBAND_BODY);
    expect(hd.sticky).toBeCloseTo(1080 * STICKY_BODY);
    const uhd = steadiness('body', 3840, 2160);
    expect(uhd.deadband / hd.deadband).toBeCloseTo(2);
    // Never less sticky than close-up mode.
    expect(steadiness('body', 320, 200).sticky).toBe(STICKY_PX);
  });

  it('dead zone: small wobbles leave the cursor still, real moves follow without a jump', () => {
    const d = createDeadband();
    expect(d.filter({ x: 100, y: 100 }, 16)).toEqual({ x: 100, y: 100 });
    // Tremor inside the radius: no movement at all.
    for (const p of [{ x: 110, y: 95 }, { x: 92, y: 106 }, { x: 105, y: 112 }]) expect(d.filter(p, 16)).toEqual({ x: 100, y: 100 });
    // A real move: follows, staying `radius` behind.
    const out = d.filter({ x: 200, y: 100 }, 16);
    expect(out.x).toBeCloseTo(184);
    expect(out.y).toBeCloseTo(100);
    // Coming back a little doesn't move it.
    expect(d.filter({ x: 190, y: 100 }, 16)).toEqual(out);
    // Radius 0 (hand mode) passes straight through.
    expect(d.filter({ x: 300, y: 300 }, 0)).toEqual({ x: 300, y: 300 });
    d.reset();
    expect(d.filter({ x: 5, y: 5 }, 16)).toEqual({ x: 5, y: 5 });
  });

  it('a still hand with tremor holds the hover target after smoothing + dead zone', () => {
    const euro = createOneEuro(EURO_BODY.minCutoff, EURO_BODY.beta);
    const d = createDeadband();
    const { deadband } = steadiness('body', 1920, 1080);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
    const outs: Pt[] = [];
    for (let i = 0; i < 90; i++) outs.push(d.filter(euro.filter({ x: 960 + rnd() * 25, y: 540 + rnd() * 25 }, i * 33), deadband));
    const settled = outs.slice(20);
    const spread = Math.max(...settled.map((p) => Math.hypot(p.x - settled[0].x, p.y - settled[0].y)));
    expect(spread).toBeLessThan(8);
  });
});

describe('scroll pads visibility', () => {
  it('shown while the camera runs (even before anyone claims the turn) and only where the page can scroll', () => {
    expect(padsVisible(true, 0, 3000, 1000)).toEqual({ up: false, down: true });
    expect(padsVisible(true, 900, 3000, 1000)).toEqual({ up: true, down: true });
    expect(padsVisible(true, 2000, 3000, 1000)).toEqual({ up: true, down: false });
    expect(padsVisible(true, 0, 1000, 1000)).toEqual({ up: false, down: false });
    expect(padsVisible(false, 900, 3000, 1000)).toEqual({ up: false, down: false });
  });
});
