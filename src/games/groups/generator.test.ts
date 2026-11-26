import { describe, it, expect } from 'vitest';
import {
  makeGroupItem, parseGroupId, groupDistractors, groupHint, groupPrompt, groupPraise, repeatedSum, skipCounts,
  pairsFor, ruleFor, answerOf, GROUP_RULES, GROUP_TRACK, type GroupKind,
} from './generator';
import { getTrack, maxLevel, levelAge } from '../../engine/tracks';
import { numberWord } from '../../engine/numberWords';
import { itemLabel } from '../../engine/dashboard';
import { gameGroup } from '../../engine/roundMix';
import { hasIcon } from '../../icons/icons';
import { GROUP_SNACKS, GROUP_FRIENDS } from '../../content/groups';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const LEVELS = Array.from({ length: maxLevel(GROUP_TRACK) + 1 }, (_, i) => i);

describe('grouping track', () => {
  it('is playable, has a rule and an age band for every level', () => {
    const t = getTrack(GROUP_TRACK);
    expect(t.playable).toBe(true);
    expect(GROUP_RULES.length).toBe(t.levels.length);
    for (const l of LEVELS) {
      expect(levelAge(GROUP_TRACK, l)).toBe('a56');
      expect(ruleFor(l).maxTotal).toBe(t.levels[l].range);
      expect(pairsFor(ruleFor(l)).length).toBeGreaterThan(2);
    }
    expect(gameGroup(GROUP_TRACK)).toEqual([GROUP_TRACK]);
  });

  it('every snack and friend has a bundled picture', () => {
    for (const s of GROUP_SNACKS) expect(hasIcon(s.icon), s.icon).toBe(true);
    for (const f of GROUP_FRIENDS) expect(hasIcon(f), f).toBe(true);
    expect(GROUP_FRIENDS.length).toBeGreaterThanOrEqual(Math.max(...GROUP_RULES.map((r) => r.groups[1])));
  });
});

describe('makeGroupItem', () => {
  it('asks only what the level asks, with a true answer and 3 different choices', () => {
    for (const level of LEVELS) {
      const rule = ruleFor(level);
      const rng = seeded(level + 1);
      const seen = new Set<GroupKind>();
      for (let i = 0; i < 300; i++) {
        const it = makeGroupItem(level, rng);
        seen.add(it.kind);
        expect(rule.kinds).toContain(it.kind);
        expect(it.total).toBe(it.groups * it.size);
        expect(it.total).toBeLessThanOrEqual(rule.maxTotal);
        expect(it.total).toBeGreaterThanOrEqual(rule.minTotal);
        expect(rule.sizes).toContain(it.size);
        expect(it.answer).toBe(answerOf(it.kind, it.groups, it.size));
        if (it.kind === 'each') expect(it.total / it.groups).toBe(it.answer);
        if (it.kind === 'plates') expect(it.total / it.size).toBe(it.answer);
        expect(it.choices).toHaveLength(3);
        expect(new Set(it.choices).size).toBe(3);
        expect(it.choices.filter((c) => c === it.answer)).toHaveLength(1);
        expect(it.choices.every((c) => Number.isInteger(c) && c >= 1)).toBe(true);
        expect(it.friends).toHaveLength(it.groups);
        expect(new Set(it.friends).size).toBe(it.groups);
        expect(it.id).toBe(`group-${it.kind}-${it.groups}x${it.size}`);
      }
      expect([...seen].sort()).toEqual([...rule.kinds].sort());
    }
  });

  it('level 2 skip counts by 2s, 5s and 10s', () => {
    const rng = seeded(7);
    const sizes = new Set(Array.from({ length: 200 }, () => makeGroupItem(2, rng).size));
    expect([...sizes].sort((a, b) => a - b)).toEqual([2, 5, 10]);
  });

  it('avoids repeating the previous item', () => {
    const rng = seeded(3);
    for (let i = 0; i < 100; i++) {
      const a = makeGroupItem(3, rng);
      expect(makeGroupItem(3, rng, false, a.id).id === a.id && pairsFor(ruleFor(3)).length > 1).toBe(false);
    }
  });

  it('ease = two small plates with help on, sums become plates', () => {
    const rng = seeded(11);
    for (const level of LEVELS) {
      for (let i = 0; i < 40; i++) {
        const it = makeGroupItem(level, rng, true);
        expect(it.groups).toBe(2);
        expect(it.total).toBeLessThanOrEqual(6);
        expect(it.scaffold).toBe(true);
        expect(it.kind).not.toBe('sum');
      }
    }
  });

  it('scaffold follows the level config', () => {
    for (const level of LEVELS) expect(makeGroupItem(level, seeded(1)).scaffold).toBe(getTrack(GROUP_TRACK).levels[level].scaffold);
  });
});

describe('groupDistractors', () => {
  it('near choices include the classic slips', () => {
    // 3 plates of 4: one group more/less (8, 16) or adding (7).
    const all = new Set<number>();
    for (let s = 0; s < 40; s++) for (const d of groupDistractors('all', 3, 4, true, 2, seeded(s))) all.add(d);
    for (const d of all) expect([16, 8, 7, 13, 11]).toContain(d);
    // Sharing 12 with 3 friends: the commonest slip is answering 3 (the number of friends).
    for (let s = 0; s < 20; s++) expect(groupDistractors('each', 3, 4, true, 2, seeded(s))).toContain(3);
    // 12 in 4s → 3 plates: the slip is 4 (the size).
    for (let s = 0; s < 20; s++) expect(groupDistractors('plates', 3, 4, true, 2, seeded(s))).toContain(4);
  });

  it('far choices are at least 3 away', () => {
    for (let s = 0; s < 50; s++) {
      for (const d of groupDistractors('all', 2, 3, false, 2, seeded(s))) expect(Math.abs(d - 6)).toBeGreaterThanOrEqual(3);
    }
  });

  it('never repeats the answer, even when groups = size', () => {
    for (let s = 0; s < 30; s++) {
      const ds = groupDistractors('each', 3, 3, true, 2, seeded(s));
      expect(ds).toHaveLength(2);
      expect(ds).not.toContain(3);
    }
  });
});

describe('parseGroupId (spaced review)', () => {
  it('every generated id round-trips at its level', () => {
    for (const level of LEVELS) {
      const rng = seeded(level + 20);
      for (let i = 0; i < 100; i++) {
        const it = makeGroupItem(level, rng);
        expect(parseGroupId(it.id, level)).toEqual({ kind: it.kind, groups: it.groups, size: it.size });
        const again = makeGroupItem(level, rng, false, undefined, it.id);
        expect(again.id).toBe(it.id);
      }
    }
  });

  it('refuses ids that do not fit the level', () => {
    expect(parseGroupId('group-each-3x4', 0)).toBeUndefined(); // sharing at a groups level
    expect(parseGroupId('group-all-2x10', 0)).toBeUndefined(); // 20 is past level 0
    expect(parseGroupId('group-all-2x10', 2)).toEqual({ kind: 'all', groups: 2, size: 10 });
    expect(parseGroupId('group-all-3x10', 2)).toBeUndefined(); // 30 is past every level
    expect(parseGroupId('group-plates-4x5', 3)).toEqual({ kind: 'plates', groups: 4, size: 5 });
    for (const bad of ['group-all-3', 'group-mix-3x4', 'time-read-3:00', 'group-sum-9x9']) expect(parseGroupId(bad, 4)).toBeUndefined();
  });

  it('a wanted id that does not fit is ignored', () => {
    const it = makeGroupItem(0, seeded(5), false, undefined, 'group-sum-4x5');
    expect(it.kind).toBe('all');
  });
});

describe('words', () => {
  it('hints name the strategy but never say the answer', () => {
    for (const level of LEVELS) {
      const rng = seeded(level + 40);
      for (let i = 0; i < 100; i++) {
        const it = makeGroupItem(level, rng);
        const hint = groupHint(it).toLowerCase();
        expect(hint).not.toMatch(new RegExp(`\\b${numberWord(it.answer)}\\b`));
        expect(hint).not.toMatch(new RegExp(`\\b${it.answer}\\b`));
        expect(groupPrompt(it).length).toBeGreaterThan(10);
        expect(groupPraise(it)).toContain(numberWord(it.answer));
        expect(groupPrompt(it)).not.toMatch(/\d/); // spoken: number words only
      }
    }
  });

  it('repeated sums and skip counts', () => {
    expect(repeatedSum({ groups: 4, size: 3 })).toBe('3 + 3 + 3 + 3 = ?');
    expect(skipCounts(5, 3)).toEqual([5, 10, 15]);
  });

  it('dashboard labels', () => {
    expect(itemLabel('group-all-3x4')).toBe('3 groups of 4');
    expect(itemLabel('group-each-3x4')).toBe('share 12 by 3');
    expect(itemLabel('group-plates-3x4')).toBe('12 in 4s');
  });
});
