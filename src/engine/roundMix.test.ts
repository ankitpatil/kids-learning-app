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

describe('single-track games (#14b): Phonics Pop, Sight-Word Catch, Word Builder', () => {
  const single = ['phonics', 'sightWords', 'endings'];

  it('each plays only its own track', () => {
    for (const id of single) expect(gameGroup(id)).toEqual([id]);
  });

  it('review = the level below, ignoring other tracks the child has mastered', () => {
    const states = { cvc: { level: maxLevel('cvc'), mastery: 0.95 }, phonics: { level: 3, mastery: 0.6 } };
    expect(reviewOptions('phonics', 3, states)).toEqual([{ kind: 'review', trackId: 'phonics', level: 2 }]);
    expect(reviewOptions('sightWords', 2, states)).toEqual([{ kind: 'review', trackId: 'sightWords', level: 1 }]);
    expect(reviewOptions('endings', 1, states)).toEqual([{ kind: 'review', trackId: 'endings', level: 0 }]);
  });

  it('stretch = the level above, and nothing past the top level', () => {
    for (const id of single) {
      expect(stretchOption(id, 0, {})).toEqual({ kind: 'stretch', trackId: id, level: 1 });
      expect(stretchOption(id, maxLevel(id), {})).toBeNull();
    }
  });

  it('a full round at level 0 is all current (nothing easier, stretch still allowed)', () => {
    for (const id of single) {
      const kinds = planRound(8).map((k) => resolveSlot(k, id, 0, {}).kind);
      expect(kinds.filter((k) => k === 'review')).toHaveLength(0);
      expect(kinds.filter((k) => k === 'stretch')).toHaveLength(1);
    }
  });

  it('a full round at the top level has review but no stretch', () => {
    for (const id of single) {
      const top = maxLevel(id);
      const slots = planRound(8).map((k) => resolveSlot(k, id, top, {}));
      expect(slots.filter((s) => s.kind === 'review')).toHaveLength(2);
      expect(slots.every((s) => s.kind !== 'stretch')).toBe(true);
      expect(slots.every((s) => s.trackId === id && s.level >= top - 1 && s.level <= top)).toBe(true);
    }
  });

  it('stretch/review levels are valid for each game generator', () => {
    for (const id of single) {
      for (let lv = 0; lv <= maxLevel(id); lv++) {
        for (const s of [...reviewOptions(id, lv, {}), stretchOption(id, lv, {})]) {
          if (!s) continue;
          expect(s.level).toBeGreaterThanOrEqual(0);
          expect(s.level).toBeLessThanOrEqual(maxLevel(id));
        }
      }
    }
  });
});
