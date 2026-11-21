import { describe, it, expect } from 'vitest';
import {
  makeClockItem, clockMode, clockDistractors, clockPrompt, clockHint, handAngles, minutesFor, minuteNumber,
  timeText, timeWords, timeKey, sameTime, wrapHour, fivesTo, CLOCK_TRACK, type Time,
} from './generator';
import { getTrack, maxLevel, levelAge, getLevel } from '../../engine/tracks';
import { gameGroup } from '../../engine/roundMix';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function sweep(fn: (level: number, ease: boolean, seed: number) => void) {
  for (let l = 0; l <= maxLevel(CLOCK_TRACK); l++) for (let n = 0; n < 200; n++) fn(l, n % 10 === 0, n);
}

describe('clock basics', () => {
  it('writes and says times', () => {
    expect(timeText({ h: 3, m: 0 })).toBe('3:00');
    expect(timeText({ h: 11, m: 5 })).toBe('11:05');
    expect(timeWords({ h: 3, m: 0 })).toBe("three o'clock");
    expect(timeWords({ h: 4, m: 30 })).toBe('half past four');
    expect(timeWords({ h: 11, m: 5 })).toBe('eleven oh five');
    expect(timeWords({ h: 7, m: 25 })).toBe('seven twenty five');
    expect(timeWords({ h: 12, m: 45 })).toBe('twelve forty five');
  });

  it('puts the hands where a real clock does (hour hand moves on with the minutes)', () => {
    expect(handAngles({ h: 12, m: 0 })).toEqual({ hour: 0, minute: 0 });
    expect(handAngles({ h: 3, m: 0 })).toEqual({ hour: 90, minute: 0 });
    expect(handAngles({ h: 3, m: 30 })).toEqual({ hour: 105, minute: 180 }); // half way from 3 to 4
    expect(handAngles({ h: 9, m: 45 })).toEqual({ hour: 292.5, minute: 270 });
    expect(handAngles({ h: 12, m: 30 }).hour).toBe(15);
  });

  it('helpers', () => {
    expect(wrapHour(13)).toBe(1);
    expect(wrapHour(0)).toBe(12);
    expect(wrapHour(12)).toBe(12);
    expect(minuteNumber(0)).toBe(12);
    expect(minuteNumber(20)).toBe(4);
    expect(minutesFor(1)).toEqual([0]);
    expect(minutesFor(2)).toEqual([0, 30]);
    expect(minutesFor(12)).toHaveLength(12);
    expect(fivesTo(20)).toEqual([5, 10, 15, 20]);
    expect(fivesTo(0)).toEqual([]);
  });
});

describe('time track', () => {
  it('is playable, Ages 5–6, and is its own game group', () => {
    const t = getTrack(CLOCK_TRACK);
    expect(t.playable).toBe(true);
    expect(t.subject).toBe('math');
    for (let l = 0; l <= maxLevel(CLOCK_TRACK); l++) expect(levelAge(CLOCK_TRACK, l)).toBe('a56');
    expect(gameGroup(CLOCK_TRACK)).toEqual([CLOCK_TRACK]);
  });

  it("goes o'clock → half past → find the clock → 5 minutes", () => {
    expect(minutesFor(getLevel(CLOCK_TRACK, 0).range)).toEqual([0]);
    expect(minutesFor(getLevel(CLOCK_TRACK, 1).range)).toEqual([0, 30]);
    expect(clockMode(3)).toBe('find');
    expect([0, 1, 2, 4, 5].map((l) => clockMode(l))).toEqual(['read', 'read', 'read', 'read', 'read']);
    expect(minutesFor(getLevel(CLOCK_TRACK, maxLevel(CLOCK_TRACK)).range)).toHaveLength(12);
    expect(clockMode(3, true)).toBe('read');
  });
});

describe('makeClockItem', () => {
  it('always has the answer once among distinct, valid choices', () => {
    sweep((l, ease, seed) => {
      const it = makeClockItem(l, seeded(seed), ease);
      const keys = it.choices.map(timeKey);
      expect(new Set(keys).size).toBe(keys.length);
      expect(it.choices.filter((c) => sameTime(c, it.time))).toHaveLength(1);
      expect(it.choices.length).toBeGreaterThanOrEqual(3);
      for (const c of it.choices) {
        expect(c.h).toBeGreaterThanOrEqual(1);
        expect(c.h).toBeLessThanOrEqual(12);
        expect(c.m).toBeGreaterThanOrEqual(0);
        expect(c.m).toBeLessThan(60);
      }
      expect(it.id).toBe(`time-${it.mode}-${timeKey(it.time)}`);
    });
  });

  it("uses only the level's minutes for the time shown", () => {
    sweep((l, ease, seed) => {
      const it = makeClockItem(l, seeded(seed), ease);
      const mins = ease ? [0] : minutesFor(getLevel(CLOCK_TRACK, l).range);
      expect(mins).toContain(it.time.m);
    });
  });

  it("o'clock and half-past levels never offer a 5-minute time; find-the-clock offers 3 clocks", () => {
    sweep((l, ease, seed) => {
      if (l > 3) return;
      const it = makeClockItem(l, seeded(seed), ease);
      for (const c of it.choices) expect(minutesFor(ease ? 1 : getLevel(CLOCK_TRACK, l).range)).toContain(c.m);
      if (it.mode === 'find') expect(it.choices).toHaveLength(3);
    });
  });

  it('far levels keep wrong hours at least 3 away; easing gives an o’clock read item', () => {
    for (let n = 0; n < 200; n++) {
      const it = makeClockItem(0, seeded(n));
      for (const c of it.choices) {
        if (sameTime(c, it.time)) continue;
        const d = Math.abs(c.h - it.time.h);
        expect(Math.min(d, 12 - d)).toBeGreaterThanOrEqual(3);
      }
      const e = makeClockItem(5, seeded(n), true);
      expect(e.mode).toBe('read');
      expect(e.time.m).toBe(0);
      expect(e.scaffold).toBe(true);
    }
  });

  it('scaffold and fives follow the level', () => {
    expect(makeClockItem(0, seeded(1)).scaffold).toBe(true);
    expect(makeClockItem(2, seeded(1)).scaffold).toBe(false);
    expect(makeClockItem(4, seeded(1)).minuteLabels).toBe(true);
    expect(makeClockItem(5, seeded(1)).minuteLabels).toBe(false);
    expect(makeClockItem(1, seeded(1)).minuteLabels).toBe(false);
  });

  it('avoids repeating the previous item', () => {
    for (let n = 0; n < 100; n++) {
      const a = makeClockItem(5, seeded(n));
      const b = makeClockItem(5, seeded(n), false, a.id);
      expect(b.id).not.toBe(a.id);
    }
  });
});

describe('near distractors', () => {
  const mins30 = [0, 30];
  const mins5 = minutesFor(12);
  it('half past: offers the hour-after slip (3:30 read as 4:30)', () => {
    for (let n = 0; n < 50; n++) {
      const d = clockDistractors({ h: 3, m: 30 }, mins30, true, 2, seeded(n));
      expect(d.map(timeKey)).toContain('4:30');
      expect(d).toHaveLength(2);
    }
    expect(clockDistractors({ h: 12, m: 30 }, mins30, true, 2, seeded(1)).map(timeKey)).toContain('1:30');
  });

  it("5 minutes: offers the minute-number slip (3:20 read as 3:04) and stays close", () => {
    for (let n = 0; n < 50; n++) {
      const t: Time = { h: 3, m: 20 };
      const d = clockDistractors(t, mins5, true, 3, seeded(n));
      expect(d.map(timeKey)).toContain('3:04');
      for (const c of d) {
        const close = (c.h === 3 && (Math.abs(c.m - 20) <= 5 || c.m === 4)) || (Math.abs(c.h - 3) === 1 && c.m === 20);
        expect(close, timeKey(c)).toBe(true);
      }
    }
    // No slip when the minutes are under 10 (3:05 → "3:01" would be odd) or the number matches.
    expect(clockDistractors({ h: 3, m: 5 }, mins5, true, 3, seeded(2)).map(timeKey)).not.toContain('3:01');
  });
});

describe('prompts and hints', () => {
  it('prompts: read asks the time; find says it', () => {
    expect(clockPrompt(makeClockItem(0, seeded(1)))).toBe('What time does the clock show?');
    const f = makeClockItem(3, seeded(1));
    expect(clockPrompt(f)).toBe(`Find the clock that shows ${timeWords(f.time)}!`);
  });

  it('hints point at the hand that was misread', () => {
    const it = { ...makeClockItem(1, seeded(1)), time: { h: 3, m: 30 } };
    expect(clockHint(it, { h: 4, m: 30 })).toMatch(/^The short hand shows the hour\. \| The short hand is just past the three\./);
    expect(clockHint(it, { h: 3, m: 0 })).toMatch(/long hand points down to the six.*half past/);
    expect(clockHint(it, { h: 8, m: 0 })).toMatch(/short hand.*long hand/);
    const five = { ...it, time: { h: 7, m: 25 } };
    expect(clockHint(five, { h: 7, m: 5 })).toMatch(/long hand points to the five\. \| Count by fives!/);
    const oc = { ...it, time: { h: 9, m: 0 } };
    expect(clockHint(oc, { h: 6, m: 0 })).toMatch(/short hand points to the nine/);
    expect(clockHint(oc, { h: 9, m: 30 })).toMatch(/o'clock/);
  });
});
