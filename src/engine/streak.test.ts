import 'fake-indexeddb/auto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { streakFrom, streakLabel, streakLine } from './streak';
import { AppDB, logAttempt, playStreak } from '../store/db';

// Node lets tests change the time zone at runtime via process.env.TZ (no @types/node in this project).
declare const process: { env: Record<string, string | undefined> };
const prevTZ = process.env.TZ;
beforeAll(() => { process.env.TZ = 'America/Los_Angeles'; });
afterAll(() => { process.env.TZ = prevTZ; });

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();

describe('streakFrom', () => {
  it('no answers → 0 days, not played today', () => {
    expect(streakFrom([], at(2026, 11, 25))).toEqual({ days: 0, today: false, lastDay: undefined });
  });

  it('many answers on one day count once', () => {
    const s = streakFrom([at(2026, 11, 25, 8), at(2026, 11, 25, 9), at(2026, 11, 25, 20)], at(2026, 11, 25, 21));
    expect(s.days).toBe(1);
    expect(s.today).toBe(true);
  });

  it('missed days pause the count — they never reset it', () => {
    const times = [at(2026, 11, 1), at(2026, 11, 2), at(2026, 11, 3), at(2026, 11, 20), at(2026, 11, 24)];
    const s = streakFrom(times, at(2026, 11, 25));
    expect(s.days).toBe(5);
    expect(s.today).toBe(false);
    // A long break later still keeps every play day.
    expect(streakFrom(times, at(2027, 3, 1)).days).toBe(5);
  });

  it('uses local calendar days: 11:59 pm and 12:01 am are two days', () => {
    const s = streakFrom([at(2026, 11, 24, 23, 59), at(2026, 11, 25, 0, 1)], at(2026, 11, 25, 9));
    expect(s.days).toBe(2);
    expect(s.today).toBe(true);
  });

  it('DST: the 25-hour fall-back day and 23-hour spring-forward day are one day each', () => {
    // US fall back: Sun 1 Nov 2026 (01:00–02:00 happens twice).
    const fall = [at(2026, 11, 1, 0, 30), at(2026, 11, 1, 1, 30), at(2026, 11, 1, 23, 30), at(2026, 11, 2, 0, 15)];
    expect(streakFrom(fall, at(2026, 11, 2, 12)).days).toBe(2);
    // US spring forward: Sun 8 Mar 2026 (02:00–03:00 skipped).
    const spring = [at(2026, 3, 7, 23, 30), at(2026, 3, 8, 0, 30), at(2026, 3, 8, 3, 30), at(2026, 3, 8, 23, 30), at(2026, 3, 9, 0, 30)];
    expect(streakFrom(spring, at(2026, 3, 9, 12)).days).toBe(3);
  });

  it('counts by the device time zone (India, no DST)', () => {
    process.env.TZ = 'Asia/Kolkata';
    try {
      // 20:00 UTC = 01:30 IST next day; 17:00 UTC = 22:30 IST same day.
      const s = streakFrom([Date.UTC(2026, 10, 24, 17), Date.UTC(2026, 10, 24, 20)], Date.UTC(2026, 10, 25, 6));
      expect(s.days).toBe(2);
      expect(s.today).toBe(true);
    } finally {
      process.env.TZ = 'America/Los_Angeles';
    }
  });

  it('ignores future and invalid times', () => {
    const s = streakFrom([at(2026, 11, 24), at(2026, 12, 30), NaN], at(2026, 11, 25));
    expect(s.days).toBe(1);
    expect(s.today).toBe(false);
  });

  it('lastDay is the most recent play day', () => {
    const a = streakFrom([at(2026, 11, 20)], at(2026, 11, 25)).lastDay!;
    const b = streakFrom([at(2026, 11, 24), at(2026, 11, 20)], at(2026, 11, 25)).lastDay!;
    expect(b - a).toBe(4);
  });
});

describe('words', () => {
  it('label and spoken line are gentle', () => {
    expect(streakLabel({ days: 1, today: true })).toBe('1 play day');
    expect(streakLabel({ days: 5, today: false })).toBe('5 play days');
    expect(streakLine({ days: 0, today: false })).toMatch(/start/);
    expect(streakLine({ days: 5, today: true })).toMatch(/today\. Yay/);
    const paused = streakLine({ days: 5, today: false });
    expect(paused).toMatch(/add today/);
    expect(paused).not.toMatch(/lost|reset|broke|miss/i);
  });
});

describe('playStreak (store)', () => {
  it('counts one child’s play days from the answers log', async () => {
    const d = new AppDB(`streak-${Math.random()}`);
    const base = { skillId: 'sightWords', itemId: 'sight-the', level: 1, correct: true, hintUsed: false, timeMs: 1500 };
    await logAttempt({ ...base, profileId: 'a', at: at(2026, 11, 20) }, d);
    await logAttempt({ ...base, profileId: 'a', at: at(2026, 11, 20, 18) }, d);
    await logAttempt({ ...base, profileId: 'a', at: at(2026, 11, 25) }, d);
    await logAttempt({ ...base, profileId: 'b', at: at(2026, 11, 22) }, d);
    expect(await playStreak('a', at(2026, 11, 25, 13), d)).toMatchObject({ days: 2, today: true });
    expect(await playStreak('b', at(2026, 11, 25, 13), d)).toMatchObject({ days: 1, today: false });
    expect(await playStreak('c', at(2026, 11, 25, 13), d)).toMatchObject({ days: 0, today: false });
  });
});
