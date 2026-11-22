import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import {
  activeMs, minutesByDay, dayStart, trackRows, itemLabel, trickyItems, summarize,
  IDLE_CAP_MS, DAY_MS, WEAK_MIN_ATTEMPTS, type DashAttempt,
} from './dashboard';
import { TRACKS } from './tracks';
import { AppDB, logAttempt, listAttempts } from '../store/db';

const A = (at: number, over: Partial<DashAttempt> = {}): DashAttempt => ({
  skillId: 'count', itemId: 'count-3', level: 0, correct: true, hintUsed: false, timeMs: 3000, at, ...over,
});

const NOW = new Date(2026, 10, 21, 18, 0, 0).getTime(); // Sat 21 Nov 2026, 6 pm local

describe('activeMs', () => {
  it('is 0 with no answers', () => expect(activeMs([])).toBe(0));

  it('counts gaps between answers in a session plus the first answer time', () => {
    expect(activeMs([A(0, { timeMs: 5000 }), A(10_000), A(25_000)])).toBe(5000 + 10_000 + 15_000);
  });

  it('a long break starts a new session instead of counting the break', () => {
    const t = activeMs([A(0, { timeMs: 4000 }), A(10_000), A(10_000 + 60 * 60_000, { timeMs: 2000 })]);
    expect(t).toBe(4000 + 10_000 + 2000);
  });

  it('caps a single answer time and ignores input order', () => {
    expect(activeMs([A(IDLE_CAP_MS, { timeMs: 1 }), A(0, { timeMs: 10 * IDLE_CAP_MS })])).toBe(IDLE_CAP_MS + IDLE_CAP_MS);
  });
});

describe('minutesByDay', () => {
  it('returns 7 local days ending today, oldest first', () => {
    const w = minutesByDay([], NOW);
    expect(w).toHaveLength(7);
    expect(w[6].day).toBe(dayStart(NOW));
    expect(new Date(w[0].day).getDate()).toBe(15);
    expect(w.every((d) => d.minutes === 0 && d.answers === 0)).toBe(true);
  });

  it('puts answers on the right day', () => {
    const today = dayStart(NOW);
    const yest = dayStart(today - 1);
    const at = [0, 30, 60, 90, 120].map((s) => today + 9 * 3600_000 + s * 1000);
    const w = minutesByDay([...at.map((t) => A(t, { timeMs: 0 })), A(yest + 1000)], NOW);
    expect(w[6]).toMatchObject({ answers: 5, minutes: 2 });
    expect(w[5].answers).toBe(1);
  });
});

describe('trackRows', () => {
  it('has one row per track, in curriculum order', () => {
    expect(trackRows({}, []).map((r) => r.id)).toEqual(TRACKS.map((t) => t.id));
  });

  it('shows level label, age band and mastery from the saved state', () => {
    const rows = trackRows({ count: { skillId: 'count', level: 3, mastery: 0.7, attemptsAtLevel: 2 } }, []);
    const c = rows.find((r) => r.id === 'count')!;
    expect(c).toMatchObject({ started: true, level: 3, levels: 6, levelLabel: 'up to 10', ages: 'Ages 4–5', mastery: 0.7, mastered: false });
    expect(rows.find((r) => r.id === 'add10')!.started).toBe(false);
  });

  it('marks mastered only at the top level above the bar', () => {
    const top = TRACKS.find((t) => t.id === 'add10')!.levels.length - 1;
    const r = (level: number, mastery: number) => trackRows({ add10: { skillId: 'add10', level, mastery, attemptsAtLevel: 9 } }, []).find((x) => x.id === 'add10')!;
    expect(r(top, 0.9).mastered).toBe(true);
    expect(r(top, 0.8).mastered).toBe(false);
    expect(r(top - 1, 0.95).mastered).toBe(false);
  });

  it('flags a weak spot only with enough recent answers and a low success rate', () => {
    const miss = (n: number, right: number) =>
      Array.from({ length: n }, (_, i) => A(i, { skillId: 'sub10', itemId: `sub-${i}`, correct: i < right }));
    const row = (as: DashAttempt[]) => trackRows({}, as).find((r) => r.id === 'sub10')!;
    expect(row(miss(WEAK_MIN_ATTEMPTS, 2)).weak).toBe(true);
    expect(row(miss(WEAK_MIN_ATTEMPTS - 1, 0)).weak).toBe(false); // too few to judge
    expect(row(miss(10, 8)).weak).toBe(false); // 80% is on target
    expect(row(miss(10, 8)).rate).toBeCloseTo(0.8);
  });
});

describe('itemLabel', () => {
  it('turns item ids into short readable labels', () => {
    expect(itemLabel('sight-said')).toBe('said');
    expect(itemLabel('pop-sight-said')).toBe('said');
    expect(itemLabel('dino-pop-phonics-b')).toBe('b');
    expect(itemLabel('read-ship')).toBe('ship');
    expect(itemLabel('missing-3+5')).toBe('3 + __ = 8');
    expect(itemLabel('time-read-3:30')).toBe('3:30');
    expect(itemLabel('cmp-34-43-big')).toBe('34 vs 43');
    expect(itemLabel('money-change-10-7')).toBe('change: 7 from 10');
    expect(itemLabel('story-pig-bus-q1')).toBe('pig bus (question 1)');
    expect(itemLabel('count-7')).toBe('7');
    expect(itemLabel('weird')).toBe('weird');
  });
});

describe('trickyItems', () => {
  it('lists items missed twice or more, most missed first, merged across games', () => {
    const as = [
      A(1, { skillId: 'sightWords', itemId: 'sight-said', correct: false }),
      A(2, { skillId: 'sightWords', itemId: 'pop-sight-said', correct: false }),
      A(3, { skillId: 'sightWords', itemId: 'sight-said', correct: true }),
      A(4, { skillId: 'phonics', itemId: 'phonics-b', correct: false }),
      A(5, { skillId: 'phonics', itemId: 'phonics-b', correct: false }),
      A(6, { skillId: 'phonics', itemId: 'phonics-b', correct: false }),
      A(7, { skillId: 'phonics', itemId: 'phonics-d', correct: false }),
    ];
    expect(trickyItems(as)).toEqual([
      { trackId: 'phonics', label: 'b', misses: 3, tries: 3 },
      { trackId: 'sightWords', label: 'said', misses: 2, tries: 3 },
    ]);
  });

  it('respects the limit', () => {
    const as = Array.from({ length: 20 }, (_, i) => [A(i, { itemId: `count-${i}`, correct: false }), A(i, { itemId: `count-${i}`, correct: false })]).flat();
    expect(trickyItems(as, 3)).toHaveLength(3);
  });
});

describe('summarize', () => {
  it('handles a child who has never played', () => {
    const s = summarize([], {}, NOW);
    expect(s).toMatchObject({ weekMinutes: 0, weekAnswers: 0, weekRate: null, weekHintRate: null, lastPlayedAt: null, weak: [], tricky: [] });
  });

  it('counts this week only for totals, last 14 days for weak spots', () => {
    const today = dayStart(NOW) + 10 * 3600_000;
    const old = today - 10 * DAY_MS; // outside the week, inside 14 days
    const ancient = today - 30 * DAY_MS;
    const as = [
      A(today, { correct: true, hintUsed: true }),
      A(today + 20_000, { correct: false }),
      ...Array.from({ length: 6 }, (_, i) => A(old + i * 1000, { skillId: 'sub10', itemId: 'missing-1+1', correct: false })),
      ...Array.from({ length: 6 }, (_, i) => A(ancient + i * 1000, { skillId: 'add10', correct: false })),
    ];
    const s = summarize(as, {}, NOW);
    expect(s.weekAnswers).toBe(2);
    expect(s.weekRate).toBe(0.5);
    expect(s.weekHintRate).toBe(0.5);
    expect(s.weak.map((w) => w.id)).toEqual(['sub10']);
    expect(s.tricky[0]).toMatchObject({ trackId: 'sub10', label: '1 + __ = 2', misses: 6 });
    expect(s.lastPlayedAt).toBe(today + 20_000);
  });
});

describe('listAttempts (store)', () => {
  it('returns one child’s answers since a time, oldest first', async () => {
    const d = new AppDB('dash1');
    const base = { skillId: 'count', itemId: 'count-3', level: 0, correct: true, hintUsed: false, timeMs: 1 };
    await logAttempt({ ...base, profileId: 'a', at: 30 }, d);
    await logAttempt({ ...base, profileId: 'a', at: 10 }, d);
    await logAttempt({ ...base, profileId: 'a', at: 5 }, d);
    await logAttempt({ ...base, profileId: 'b', at: 20 }, d);
    expect((await listAttempts('a', 6, d)).map((x) => x.at)).toEqual([10, 30]);
    expect(await listAttempts('c', 0, d)).toEqual([]);
  });
});
