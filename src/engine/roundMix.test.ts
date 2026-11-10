import { describe, it, expect } from 'vitest';
import { planRound, gameGroup, reviewOptions, stretchOption, resolveSlot } from './roundMix';
import { maxLevel } from './tracks';

const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

describe('planRound', () => {
  it('8 items → 5 current, 2 review, 1 stretch', () => {
    for (let k = 0; k < 50; k++) {
      const p = planRound(8);
      expect(p.filter((x) => x === 'current')).toHaveLength(5);
      expect(p.filter((x) => x === 'review')).toHaveLength(2);
      expect(p.filter((x) => x === 'stretch')).toHaveLength(1);
    }
  });

  it('starts with a review warm-up, ends on current, stretch never first/second/last', () => {
    for (let k = 0; k < 100; k++) {
      const p = planRound(8);
      expect(p[0]).toBe('review');
      expect(p[7]).toBe('current');
      const s = p.indexOf('stretch');
      expect(s).toBeGreaterThanOrEqual(2);
      expect(s).toBeLessThanOrEqual(6);
    }
  });

  it('is about 70/20/10 over long rounds', () => {
    const p = planRound(20);
    expect(p.filter((x) => x === 'current')).toHaveLength(14);
    expect(p.filter((x) => x === 'review')).toHaveLength(4);
    expect(p.filter((x) => x === 'stretch')).toHaveLength(2);
  });

  it('very short rounds are all current', () => {
    expect(planRound(3)).toEqual(['current', 'current', 'current']);
  });

  it('is deterministic for a given rng', () => {
    expect(planRound(8, seq(0.3, 0.7))).toEqual(planRound(8, seq(0.3, 0.7)));
  });
});

describe('gameGroup', () => {
  it('groups tracks by the game that plays them, in curriculum order', () => {
    expect(gameGroup('missing')).toEqual(['count', 'missing']);
    expect(gameGroup('add20')).toEqual(['add10', 'sub10', 'add20', 'sub20']);
    expect(gameGroup('cvc')[0]).toBe('cvc');
    expect(gameGroup('cvc')).toContain('sentences');
    expect(gameGroup('phonics')).toEqual(['phonics']);
  });
});

describe('reviewOptions', () => {
  it('beginner at level 0 of the first track has nothing to review', () => {
    expect(reviewOptions('cvc', 0, {})).toEqual([]);
    expect(reviewOptions('count', 0, {})).toEqual([]);
  });

  it('offers the level just below the current one', () => {
    expect(reviewOptions('count', 3, {})).toEqual([{ kind: 'review', trackId: 'count', level: 2 }]);
  });

  it('offers mastered earlier tracks at their top level, skips never-played ones', () => {
    const states = {
      cvc: { level: maxLevel('cvc'), mastery: 0.95 },
      blends: { level: 1, mastery: 0.6 },
    };
    const opts = reviewOptions('silentE', 0, states);
    expect(opts).toContainEqual({ kind: 'review', trackId: 'cvc', level: maxLevel('cvc') });
    expect(opts).toContainEqual({ kind: 'review', trackId: 'blends', level: 0 }); // not mastered: one level below
    expect(opts.find((o) => o.trackId === 'digraphs')).toBeUndefined();
  });

  it('never offers a later track as review', () => {
    const states = { sentences: { level: 1, mastery: 0.95 } };
    expect(reviewOptions('cvc', 0, states)).toEqual([]);
  });
});

describe('stretchOption', () => {
  it('is the next level of the current track', () => {
    expect(stretchOption('count', 2, {})).toEqual({ kind: 'stretch', trackId: 'count', level: 3 });
  });

  it('at the top level, peeks into the next track of the same game', () => {
    expect(stretchOption('count', maxLevel('count'), {})).toEqual({ kind: 'stretch', trackId: 'missing', level: 0 });
    expect(stretchOption('add10', maxLevel('add10'), { sub10: { level: 1, mastery: 0.5 } })).toEqual({ kind: 'stretch', trackId: 'sub10', level: 1 });
  });

  it('nothing beyond the last track of a game', () => {
    expect(stretchOption('sentences', maxLevel('sentences'), {})).toBeNull();
    expect(stretchOption('phonics', maxLevel('phonics'), {})).toBeNull();
  });
});

describe('resolveSlot', () => {
  it('current stays current at the live level', () => {
    expect(resolveSlot('current', 'add10', 2, {})).toEqual({ kind: 'current', trackId: 'add10', level: 2 });
  });

  it('falls back to current when there is nothing to review or stretch to', () => {
    expect(resolveSlot('review', 'cvc', 0, {})).toEqual({ kind: 'current', trackId: 'cvc', level: 0 });
    expect(resolveSlot('stretch', 'sentences', maxLevel('sentences'), {}).kind).toBe('current');
  });

  it('no stretch right after two misses', () => {
    expect(resolveSlot('stretch', 'count', 1, {}, true)).toEqual({ kind: 'current', trackId: 'count', level: 1 });
    expect(resolveSlot('stretch', 'count', 1, {}, false).kind).toBe('stretch');
  });

  it('picks among review options with the rng', () => {
    const states = { cvc: { level: maxLevel('cvc'), mastery: 0.9 } };
    expect(resolveSlot('review', 'digraphs', 1, states, false, () => 0)).toEqual({ kind: 'review', trackId: 'digraphs', level: 0 });
    expect(resolveSlot('review', 'digraphs', 1, states, false, () => 0.99)).toEqual({ kind: 'review', trackId: 'cvc', level: maxLevel('cvc') });
  });
});
