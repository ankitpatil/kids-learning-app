import { describe, expect, it } from 'vitest';
import {
  addExtra,
  bedtimeLabel,
  dayKey,
  DEFAULT_SCREEN_TIME,
  loadScreenTime,
  minutesToday,
  normalizeScreenTime,
  restLine,
  saveScreenTime,
  timeState,
  type ScreenTimeSettings,
} from './screenTime';
import type { DashAttempt } from './dashboard';

const at = (h: number, m = 0, day = 26) => new Date(2026, 10, day, h, m).getTime();
const S = (p: Partial<ScreenTimeSettings>): ScreenTimeSettings => ({ ...DEFAULT_SCREEN_TIME, ...p });
const ans = (t: number, timeMs = 5000): DashAttempt => ({ skillId: 'count', itemId: 'x', level: 0, correct: true, hintUsed: false, timeMs, at: t });

function memKV() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

describe('timeState', () => {
  it('is off with no limit and no bedtime', () => {
    expect(timeState(DEFAULT_SCREEN_TIME, 500, at(23))).toEqual({ state: 'off' });
  });

  it('counts down the daily minutes, says soon near the end, then up', () => {
    const s = S({ dailyMinutes: 20 });
    expect(timeState(s, 0, at(10))).toEqual({ state: 'ok', minutesLeft: 20 });
    expect(timeState(s, 14.2, at(10))).toEqual({ state: 'ok', minutesLeft: 6 });
    expect(timeState(s, 16, at(10))).toEqual({ state: 'soon', minutesLeft: 4 });
    expect(timeState(s, 19.9, at(10))).toEqual({ state: 'soon', minutesLeft: 1 });
    expect(timeState(s, 20, at(10))).toEqual({ state: 'up', reason: 'minutes' });
  });

  it('bedtime blocks from bedtime until 6 am', () => {
    const s = S({ bedtime: 19 * 60 + 30 });
    expect(timeState(s, 0, at(19, 0)).state).toBe('ok');
    expect(timeState(s, 0, at(19, 27))).toEqual({ state: 'soon', minutesLeft: 3 });
    expect(timeState(s, 0, at(19, 30))).toEqual({ state: 'up', reason: 'bedtime' });
    expect(timeState(s, 0, at(23, 59))).toEqual({ state: 'up', reason: 'bedtime' });
    expect(timeState(s, 0, at(0, 30))).toEqual({ state: 'up', reason: 'bedtime' });
    expect(timeState(s, 0, at(5, 59))).toEqual({ state: 'up', reason: 'bedtime' });
    expect(timeState(s, 0, at(6, 0)).state).toBe('ok');
  });

  it('bedtime wins over minutes left; minutes left is the smaller of the two', () => {
    const s = S({ dailyMinutes: 60, bedtime: 20 * 60 });
    expect(timeState(s, 0, at(20, 5))).toEqual({ state: 'up', reason: 'bedtime' });
    expect(timeState(s, 0, at(19, 50))).toEqual({ state: 'ok', minutesLeft: 10 });
    expect(timeState(s, 58, at(15))).toEqual({ state: 'soon', minutesLeft: 2 });
  });

  it('extra time today adds minutes and pushes bedtime back, but not tomorrow', () => {
    const s = addExtra(S({ dailyMinutes: 20, bedtime: 20 * 60 }), at(14, 0));
    expect(s.extra).toEqual({ day: '2026-11-26', minutes: 15 });
    expect(timeState(s, 25, at(20, 10))).toEqual({ state: 'soon', minutesLeft: 5 }); // bedtime 8:15 is nearer
    expect(timeState(s, 25, at(14, 0))).toEqual({ state: 'ok', minutesLeft: 10 });
    expect(timeState(s, 25, at(20, 14)).state).toBe('soon');
    expect(timeState(s, 25, at(20, 15))).toEqual({ state: 'up', reason: 'bedtime' });
    expect(timeState(s, 35, at(20, 10))).toEqual({ state: 'up', reason: 'minutes' });
    expect(timeState(s, 0, at(20, 15, 27))).toEqual({ state: 'up', reason: 'bedtime' });
    expect(timeState(s, 25, at(10, 0, 27))).toEqual({ state: 'up', reason: 'minutes' });
    // A second tap adds more; a tap on a new day starts again from 15.
    expect(addExtra(s, at(14, 30)).extra).toEqual({ day: '2026-11-26', minutes: 30 });
    expect(addExtra(s, at(9, 0, 27)).extra).toEqual({ day: '2026-11-27', minutes: 15 });
  });

  it('more time always gives at least 15 minutes from now, even long past the limit or bedtime', () => {
    const s = S({ dailyMinutes: 20, bedtime: 20 * 60 });
    const late = addExtra(s, at(21, 30), 10);
    expect(late.extra?.minutes).toBe(105);
    expect(timeState(late, 10, at(21, 30))).toEqual({ state: 'ok', minutesLeft: 15 });
    expect(timeState(late, 10, at(21, 45)).state).toBe('up');
    const over = addExtra(S({ dailyMinutes: 20 }), at(15), 32.5);
    expect(timeState(over, 32.5, at(15))).toEqual({ state: 'ok', minutesLeft: 16 }); // 15.5, rounded up
    // Before 6 am bedtime can't be pushed (it is the night); minutes still can.
    expect(timeState(addExtra(s, at(5, 0, 27)), 0, at(5, 0, 27)).state).toBe('up');
  });

  it('extra never pushes bedtime past midnight, and early morning stays closed', () => {
    let s = S({ bedtime: 21 * 60 });
    for (let i = 0; i < 20; i++) s = addExtra(s, at(21));
    expect(timeState(s, 0, at(23, 30)).state).toBe('ok');
    expect(timeState(s, 0, at(23, 56)).state).toBe('soon');
    expect(timeState(s, 0, at(23, 59)).state).toBe('up');
    expect(timeState(s, 0, at(1, 0, 27)).state).toBe('up');
  });
});

describe('minutesToday', () => {
  it('counts only today\'s answers with idle gaps capped', () => {
    const list = [
      ans(at(23, 50, 25)), // yesterday
      ans(at(9, 0)),
      ans(at(9, 1)),
      ans(at(9, 2)),
      ans(at(12, 0)), // break → own answer time only
      ans(at(12, 0) + 30_000),
    ];
    expect(minutesToday(list, at(13))).toBeCloseTo((5000 + 120_000 + 5000 + 30_000) / 60000, 5);
    expect(minutesToday([], at(13))).toBe(0);
  });

  it('starts from zero after local midnight', () => {
    expect(minutesToday([ans(at(23, 58, 25)), ans(at(23, 59, 25))], at(0, 5))).toBe(0);
  });
});

describe('settings store', () => {
  it('round-trips and defaults to off', () => {
    const kv = memKV();
    expect(loadScreenTime(kv)).toEqual(DEFAULT_SCREEN_TIME);
    const s = { dailyMinutes: 30, bedtime: 20 * 60, extra: { day: '2026-11-26', minutes: 15 } };
    saveScreenTime(s, kv);
    expect(loadScreenTime(kv)).toEqual(s);
  });

  it('drops unknown values and junk', () => {
    expect(normalizeScreenTime({ dailyMinutes: 7, bedtime: 3, extra: { day: 'x', minutes: 5 } })).toEqual(DEFAULT_SCREEN_TIME);
    expect(normalizeScreenTime({ dailyMinutes: 45, bedtime: null, extra: { day: '2026-11-26', minutes: -3 } })).toEqual({ dailyMinutes: 45, bedtime: null, extra: null });
    const kv = memKV();
    kv.setItem('screen-time', '{not json');
    expect(loadScreenTime(kv)).toEqual(DEFAULT_SCREEN_TIME);
    expect(loadScreenTime(null)).toEqual(DEFAULT_SCREEN_TIME);
  });
});

describe('labels', () => {
  it('formats keys and words', () => {
    expect(dayKey(at(0, 1, 5))).toBe('2026-11-05');
    expect(bedtimeLabel(19 * 60 + 30)).toBe('7:30 pm');
    expect(bedtimeLabel(null)).toBe('No bedtime');
    expect(restLine('bedtime')).toMatch(/bedtime/);
    expect(restLine('minutes')).toMatch(/tomorrow/);
    // Gentle: never words like "stop", "no more", "over".
    for (const r of ['bedtime', 'minutes'] as const) expect(restLine(r)).not.toMatch(/stop|no more|over|bad/i);
  });
});
