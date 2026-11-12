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
  it('starts with counting, then follows the math track order', () => {
    expect(pickTrack('math', {})).toBe('count');
    expect(pickTrack('math', { count: { level: 3, mastery: 0.9 } })).toBe('count');
    expect(pickTrack('math', { count: { level: 5, mastery: 0.7 } })).toBe('count');
    const m = { level: 9, mastery: 0.95 };
    expect(pickTrack('math', { count: m })).toBe('add10');
    expect(pickTrack('math', { count: m, add10: m })).toBe('sub10');
    expect(pickTrack('math', { count: m, add10: m, sub10: m })).toBe('missing');
    expect(pickTrack('math', { count: m, add10: m, sub10: m, missing: m })).toBe('add20');
    expect(pickTrack('math', { count: m, add10: m, sub10: m, missing: m, add20: m })).toBe('sub20');
  });
  it('a child placed at missing number (add/sub 10 mastered) stays on missing number', () => {
    const m = { level: 9, mastery: 0.95 };
    expect(pickTrack('math', { count: m, add10: m, sub10: m, missing: { level: 2, mastery: 0.3 }, add20: { level: 0, mastery: 0.3 } })).toBe('missing');
  });
  it('falls back to the last playable track when all are mastered', () => {
    const m = { level: 9, mastery: 0.95 };
    expect(pickTrack('math', { count: m, add10: m, sub10: m, missing: m, add20: m, sub20: m, placeValue: m, compare2d: m, wordProblems: m })).toBe('wordProblems');
    expect(pickTrack('reading', { phonics: { level: 6, mastery: 0.95 } })).toBe('cvc');
    const allRead = Object.fromEntries(['phonics', 'cvc', 'digraphs', 'blends', 'silentE', 'vowelTeams', 'endings', 'sightWords', 'sentences', 'stories'].map((id) => [id, { level: 9, mastery: 0.95 }]));
    expect(pickTrack('reading', allRead)).toBe('stories');
  });
  it('after ee/ai/oa words and tricky words a reader moves on to finishing sentences (#16)', () => {
    const done = Object.fromEntries(['phonics', 'cvc', 'digraphs', 'blends', 'silentE', 'vowelTeams', 'endings', 'sightWords'].map((id) => [id, { level: 9, mastery: 0.95 }]));
    expect(pickTrack('reading', done)).toBe('sentences');
  });
  it('a reader who finished the old top magic-e level gets the new cap / cape switch level (#16)', () => {
    const states = Object.fromEntries(['phonics', 'cvc', 'digraphs', 'blends'].map((id) => [id, { level: 9, mastery: 0.95 }]));
    expect(pickTrack('reading', { ...states, silentE: { level: 1, mastery: 0.95 } })).toBe('silentE');
  });
  it('a reader who mastered letters and short words goes to sh/ch/th words, not letter popping', () => {
    expect(pickTrack('reading', { phonics: { level: 6, mastery: 0.95 }, cvc: { level: 1, mastery: 0.95 } })).toBe('digraphs');
  });
});
