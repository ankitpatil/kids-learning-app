import { describe, it, expect } from 'vitest';
import { TRACKS, getTrack, getLevel, maxLevel, tracksFor } from './tracks';
import { PHONICS_LEVEL_NEW } from '../games/phonicsPop/letters';
import { COUNT_MAX_BY_LEVEL } from './skills';

describe('tracks', () => {
  it('ids are unique and every track has at least one level', () => {
    expect(new Set(TRACKS.map((t) => t.id)).size).toBe(TRACKS.length);
    TRACKS.forEach((t) => expect(t.levels.length).toBeGreaterThan(0));
  });

  it('keeps existing game levels (saved progress stays valid)', () => {
    expect(COUNT_MAX_BY_LEVEL).toEqual([3, 5, 7, 10, 15, 20]);
    expect(maxLevel('phonics')).toBe(PHONICS_LEVEL_NEW.length - 1);
    expect(getTrack('count').playable && getTrack('phonics').playable).toBe(true);
  });

  it('getLevel clamps', () => {
    expect(getLevel('count', -3).range).toBe(3);
    expect(getLevel('count', 99).range).toBe(20);
  });

  it('phonics switches to near distractors at level 4', () => {
    expect(getLevel('phonics', 3).distractors).toBe('far');
    expect(getLevel('phonics', 4).distractors).toBe('near');
  });

  it('math levels never get easier in range or representation', () => {
    const rep = { concrete: 0, pictorial: 1, abstract: 2 } as const;
    for (const t of tracksFor('math')) {
      for (let i = 1; i < t.levels.length; i++) {
        const a = t.levels[i - 1], b = t.levels[i];
        expect(b.range >= a.range).toBe(true);
        expect(rep[b.representation] >= rep[a.representation] || b.range > a.range).toBe(true);
      }
    }
  });

  it('throws for unknown ids', () => {
    expect(() => getTrack('nope')).toThrow();
  });
});

import { pickTrack } from './tracks';
describe('pickTrack', () => {
  it('starts with counting, moves to missing number once counting is mastered', () => {
    expect(pickTrack('math', {})).toBe('count');
    expect(pickTrack('math', { count: { level: 3, mastery: 0.9 } })).toBe('count');
    expect(pickTrack('math', { count: { level: 5, mastery: 0.7 } })).toBe('count');
    expect(pickTrack('math', { count: { level: 5, mastery: 0.95 } })).toBe('missing');
  });
  it('falls back to the last playable track when all are mastered', () => {
    expect(pickTrack('math', { count: { level: 5, mastery: 0.95 }, missing: { level: 2, mastery: 0.95 } })).toBe('missing');
    expect(pickTrack('reading', { phonics: { level: 6, mastery: 0.95 } })).toBe('phonics');
  });
});
