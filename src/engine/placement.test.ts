import { describe, it, expect } from 'vitest';
import { CHECKPOINTS, startPlacement, answer, isDone, currentCheckpoint, levelsFromCheckpoint, PRESETS, MAX_PLACEMENT_ITEMS } from './placement';
import { maxLevel, getTrack } from './tracks';
import { makeQuickItem } from './quickItems';

/** Simulate a child who knows everything up to checkpoint index `skill`. */
function run(subject: 'math' | 'reading', skill: number) {
  let s = startPlacement(subject);
  let n = 0;
  while (!isDone(s)) {
    const cp = currentCheckpoint(s);
    const idx = CHECKPOINTS[subject].indexOf(cp);
    s = answer(s, idx <= skill);
    n++;
  }
  return { s, n };
}

describe('placement search', () => {
  it('finds the exact checkpoint for a consistent child, in ≤ 12 items', () => {
    for (const subject of ['math', 'reading'] as const) {
      for (let skill = -1; skill < CHECKPOINTS[subject].length; skill++) {
        const { s, n } = run(subject, skill);
        expect(s.best).toBe(skill);
        expect(n).toBeLessThanOrEqual(MAX_PLACEMENT_ITEMS);
      }
    }
  });

  it('a 1–1 split asks a tie-breaker', () => {
    let s = startPlacement('math');
    s = answer(s, true);
    s = answer(s, false);
    expect(s.asked).toBe(2);
    expect(s.best).toBe(-1);
    const before = currentCheckpoint(s);
    s = answer(s, true); // tie-breaker passes
    expect(s.best).toBe(CHECKPOINTS.math.indexOf(before));
  });

  it('stops at the item cap even with noisy answers', () => {
    let s = startPlacement('reading');
    let i = 0;
    while (!isDone(s)) s = answer(s, i++ % 2 === 0);
    expect(s.asked).toBeLessThanOrEqual(MAX_PLACEMENT_ITEMS);
  });
});

describe('levelsFromCheckpoint', () => {
  it('beginner starts everything at 0', () => {
    const l = levelsFromCheckpoint('math', -1);
    expect(l.count).toBe(0);
    expect(l.add10).toBe(0);
  });

  it('a child who adds and subtracts within 10 skips counting entirely', () => {
    const l = levelsFromCheckpoint('math', PRESETS.reader.math);
    expect(l.count).toBe(maxLevel('count'));
    expect(l.add10).toBe(maxLevel('add10'));
    expect(l.missing).toBe(0);
  });

  it('a short-word reader has letter sounds mastered and starts cvc above level 0', () => {
    const l = levelsFromCheckpoint('reading', PRESETS.reader.reading);
    expect(l.phonics).toBe(maxLevel('phonics'));
    expect(l.cvc).toBe(maxLevel('cvc'));
    expect(l.digraphs).toBe(0);
  });

  it('levels stay within each track', () => {
    for (const subject of ['math', 'reading'] as const) {
      for (let b = -1; b < CHECKPOINTS[subject].length; b++) {
        for (const [id, lvl] of Object.entries(levelsFromCheckpoint(subject, b))) {
          expect(lvl).toBeGreaterThanOrEqual(0);
          expect(lvl).toBeLessThanOrEqual(maxLevel(id));
        }
      }
    }
  });
});

describe('quick items for every checkpoint', () => {
  it('have the answer among unique choices', () => {
    for (const subject of ['math', 'reading'] as const) {
      for (const cp of CHECKPOINTS[subject]) {
        expect(() => getTrack(cp.trackId)).not.toThrow();
        for (let k = 0; k < 100; k++) {
          const it = makeQuickItem(cp.trackId, cp.level);
          expect(it.choices).toContain(it.answer);
          expect(new Set(it.choices).size).toBe(it.choices.length);
          expect(it.choices.length).toBeGreaterThanOrEqual(2);
          expect(it.say.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('arithmetic answers are correct', () => {
    for (let k = 0; k < 300; k++) {
      const it = makeQuickItem('add20', 1);
      const [a, b] = it.visual.split(' = ')[0].split(' + ').map(Number);
      expect(Number(it.answer)).toBe(a + b);
      expect(a + b).toBeLessThanOrEqual(20);
      expect(a + b).toBeGreaterThan(10); // crosses 10
      const s = makeQuickItem('sub10', 2);
      const [x, y] = s.visual.split(' = ')[0].split(' − ').map(Number);
      expect(Number(s.answer)).toBe(x - y);
      expect(x - y).toBeGreaterThanOrEqual(1);
    }
  });
});

import { masteredFromCheckpoint } from './placement';
describe('masteredFromCheckpoint', () => {
  it('marks fully passed tracks only', () => {
    expect(masteredFromCheckpoint('math', -1)).toEqual([]);
    expect(masteredFromCheckpoint('math', 1)).toEqual(['count']);
    expect(masteredFromCheckpoint('math', PRESETS.reader.math).sort()).toEqual(['add10', 'count', 'sub10']);
  });
});
