import { describe, expect, it } from 'vitest';
import { DINO_CHOICES, LISTEN_ONLY, layoutTargets, makeDinoPuzzle, pickDinoSlot } from './puzzles';
import { OBSTACLE_KINDS } from './maze';
import { getTrack, maxLevel, tracksFor } from '../../engine/tracks';
import { isPopTrack } from '../popAnswer/generator';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const st = (level: number, mastery = 0.5) => ({ level, mastery });
const done = (id: string) => ({ level: maxLevel(id), mastery: 0.95 });
/** Every playable track of a subject before `id` mastered, `id` in progress. */
const upTo = (subject: 'math' | 'reading', id: string) => {
  const out: Record<string, { level: number; mastery: number }> = {};
  for (const t of tracksFor(subject).filter((t) => t.playable)) {
    if (t.id === id) { out[id] = st(1); break; }
    out[t.id] = done(t.id);
  }
  return out;
};

describe('Dino Maze puzzles', () => {
  it('alternates math and reading', () => {
    const rng = seeded(1);
    for (let i = 0; i < 12; i++) {
      const s = pickDinoSlot(i, 'math', {}, true, rng);
      expect(getTrack(s.trackId).subject).toBe(i % 2 === 0 ? 'math' : 'reading');
      expect(isPopTrack(s.trackId)).toBe(true);
    }
  });

  it("uses the child's own level on the skill", () => {
    const states = { add10: st(2), count: done('count') };
    const s = pickDinoSlot(0, 'math', states, true, () => 0.99); // no review
    expect(s).toEqual({ trackId: 'add10', level: 2, kind: 'current' });
  });

  it('sometimes reviews a skill the child has already reached', () => {
    const states = { count: done('count'), add10: st(1) };
    const s = pickDinoSlot(0, 'math', states, true, () => 0.01);
    expect(s.kind).toBe('review');
    expect(s.trackId).toBe('count');
  });

  it('skips listen-only skills while talking is off', () => {
    const states = upTo('reading', 'sightWords');
    const talking = pickDinoSlot(1, 'math', states, true, () => 0.99);
    const quiet = pickDinoSlot(1, 'math', states, false, () => 0.99);
    expect(talking.trackId).toBe('sightWords');
    expect(LISTEN_ONLY).not.toContain(quiet.trackId);
    expect(getTrack(quiet.trackId).subject).toBe('reading');
  });

  it('puzzles have 3 choices (2 when easing) with the answer once', () => {
    const rng = seeded(4);
    for (let i = 0; i < 40; i++) {
      const slot = pickDinoSlot(i, 'reading', {}, false, rng);
      const p = makeDinoPuzzle(slot, rng, i % 5 === 0);
      expect(p.choices).toHaveLength(i % 5 === 0 ? 2 : DINO_CHOICES);
      expect(p.choices.filter((c) => c === p.answer)).toHaveLength(1);
      expect(p.id.startsWith('dino-')).toBe(true);
    }
  });

  it('targets are on screen, below the question band, and never overlap', () => {
    const aspect = 16 / 9; // x is a share of width, sizes a share of height
    for (const kind of OBSTACLE_KINDS)
      for (const n of [2, 3]) {
        const spots = layoutTargets(kind, n, seeded(n));
        expect(spots).toHaveLength(n);
        for (const s of spots) {
          expect(s.x).toBeGreaterThan(0.1);
          expect(s.x).toBeLessThan(0.9);
          expect(s.y - s.h / 2).toBeGreaterThanOrEqual(0.18 - 1e-9);
          expect(s.y + s.h / 2).toBeLessThanOrEqual(1);
        }
        for (let i = 1; i < n; i++) {
          const gap = (spots[i].x - spots[i - 1].x) * aspect - (spots[i].w + spots[i - 1].w) / 2;
          expect(gap).toBeGreaterThan(0.1); // a hand's width or more between targets
        }
      }
  });
});
