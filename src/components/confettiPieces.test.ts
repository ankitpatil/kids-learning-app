import { describe, it, expect } from 'vitest';
import { makeConfetti, CONFETTI_COLORS } from './confettiPieces';
import { clapTimes, cheerVoices, FANFARE } from '../audio/sfx';

function seeded(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

describe('makeConfetti', () => {
  it('makes the requested number of pieces within sensible ranges', () => {
    const pieces = makeConfetti(120, seeded(7));
    expect(pieces).toHaveLength(120);
    for (const p of pieces) {
      expect(p.left).toBeGreaterThanOrEqual(0);
      expect(p.left).toBeLessThanOrEqual(100);
      expect(p.delay).toBeLessThan(1);
      expect(p.duration).toBeGreaterThanOrEqual(2.4);
      expect(p.duration).toBeLessThanOrEqual(4);
      expect(Math.abs(p.spin)).toBeGreaterThanOrEqual(360);
      expect(CONFETTI_COLORS).toContain(p.color);
      if (p.round) expect(p.h).toBe(p.w);
      else expect(p.h).toBeGreaterThan(p.w);
    }
  });

  it('uses several colours and both shapes', () => {
    const pieces = makeConfetti(90, seeded(3));
    expect(new Set(pieces.map((p) => p.color)).size).toBeGreaterThanOrEqual(5);
    expect(pieces.some((p) => p.round)).toBe(true);
    expect(pieces.some((p) => !p.round)).toBe(true);
  });
});

describe('applause and fanfare', () => {
  it('claps are increasing, inside the duration, and thin out over time', () => {
    const t = clapTimes(2.2, seeded(5));
    expect(t.length).toBeGreaterThan(30);
    t.forEach((x, i) => {
      expect(x).toBeLessThan(2.2);
      if (i) expect(x).toBeGreaterThan(t[i - 1]);
    });
    const firstHalf = t.filter((x) => x < 1.1).length;
    expect(firstHalf).toBeGreaterThan(t.length - firstHalf);
  });

  it('fanfare ends on its highest, longest note and lasts under 2 s', () => {
    const last = FANFARE[FANFARE.length - 1];
    expect(last[0]).toBe(Math.max(...FANFARE.map((n) => n[0])));
    expect(last[2]).toBe(Math.max(...FANFARE.map((n) => n[2])));
    expect(last[1] + last[2]).toBeLessThan(2);
  });
});

describe('crowd cheer', () => {
  it('voices start inside the window, sorted, rising in pitch, with kid and adult ranges', () => {
    const v = cheerVoices(12, 1.6, seeded(11));
    expect(v).toHaveLength(12);
    v.forEach((x, i) => {
      expect(x.at).toBeGreaterThanOrEqual(0);
      expect(x.at).toBeLessThan(1.6);
      if (i) expect(x.at).toBeGreaterThanOrEqual(v[i - 1].at);
      expect(x.rise).toBeGreaterThan(1);
      expect(x.pitch).toBeGreaterThanOrEqual(170);
      expect(x.pitch).toBeLessThanOrEqual(500);
      expect(Math.abs(x.pan)).toBeLessThanOrEqual(1);
    });
    expect(v.some((x) => x.pitch >= 330)).toBe(true);
    expect(v.some((x) => x.pitch < 330)).toBe(true);
  });
});
