// #25d: spaced review in Fun at the Fair and Tick Tock Clock.
// Every logged id must round-trip: rebuild the item from the id at its level → the same id and answer.
import { describe, it, expect } from 'vitest';
import { dueCards, placeSpaced, type ReviewAttempt } from './spacedReview';
import { planRound } from './roundMix';
import { maxLevel } from './tracks';
import { makeFairItem, parseFairId, fewestCoins, FAIR_TRACK } from '../games/fair/generator';
import { makeClockItem, parseClockId, sameTime, CLOCK_TRACK } from '../games/clock/generator';
import type { CurrencyId } from '../content/money';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('Fun at the Fair: a logged id round-trips', () => {
  for (const cur of ['inr', 'usd'] as CurrencyId[])
    it(`its own ids, every level (${cur})`, () => {
      for (let level = 0; level <= maxLevel(FAIR_TRACK); level++)
        for (let s = 0; s < 80; s++) {
          const it = makeFairItem(level, cur, seeded(s * 13 + level));
          expect(parseFairId(it.id, level, cur)).toEqual({ mode: it.mode, price: it.price, paid: it.paid });
          const again = makeFairItem(level, cur, seeded(s + 900), false, undefined, it.id);
          expect(again.id).toBe(it.id);
          expect(again.mode).toBe(it.mode);
          expect(again.answer).toBe(it.answer);
          if (again.mode === 'change') expect(again.choices).toContain(again.answer);
          else expect(() => fewestCoins(again.price, again.wallet)).not.toThrow();
        }
    });
  it('keeps the price even if it was the last one (avoid is ignored for a spaced item)', () => {
    const it = makeFairItem(1, 'inr', seeded(3));
    expect(makeFairItem(1, 'inr', seeded(4), false, it.id, it.id).id).toBe(it.id);
  });
  it('a change id from the other currency is ignored (₹20 after switching to cents)', () => {
    const lvl = maxLevel(FAIR_TRACK); // change within 20: ₹20 / 25¢
    expect(parseFairId('money-change-20-7', lvl, 'inr')).toBeDefined();
    expect(parseFairId('money-change-20-7', lvl, 'usd')).toBeUndefined();
    expect(makeFairItem(lvl, 'usd', seeded(1), false, undefined, 'money-change-20-7').paid).toBe(25);
  });
  it('rejects ids that do not fit the level', () => {
    expect(parseFairId('money-pay-7', 3, 'inr')).toBeUndefined(); // a change level
    expect(parseFairId('money-change-10-3', 0, 'inr')).toBeUndefined(); // a pay level
    expect(parseFairId('money-pay-15', 0, 'inr')).toBeUndefined(); // past 10
    expect(parseFairId('money-pay-1', 0, 'inr')).toBeUndefined();
    expect(parseFairId('money-change-10-10', 3, 'inr')).toBeUndefined(); // nothing back
    for (const bad of ['money-pay-', 'time-read-3:00', 'money-change-10']) expect(parseFairId(bad, 0, 'inr')).toBeUndefined();
  });
});

describe('Tick Tock Clock: a logged id round-trips', () => {
  it('its own ids, every level', () => {
    for (let level = 0; level <= maxLevel(CLOCK_TRACK); level++)
      for (let s = 0; s < 80; s++) {
        const it = makeClockItem(level, seeded(s * 17 + level));
        expect(sameTime(parseClockId(it.id, level)!, it.time)).toBe(true);
        const again = makeClockItem(level, seeded(s + 900), false, it.id, it.id);
        expect(again.id).toBe(it.id);
        expect(again.mode).toBe(it.mode);
        expect(again.choices.filter((c) => sameTime(c, again.time))).toHaveLength(1);
        expect(again.choices.length).toBe(it.choices.length);
      }
  });
  it('rejects ids that do not fit the level', () => {
    expect(parseClockId('time-read-3:30', 0)).toBeUndefined(); // half past at the o'clock level
    expect(parseClockId('time-read-3:05', 2)).toBeUndefined(); // 5 minutes at a half-past level
    expect(parseClockId('time-read-3:00', 3)).toBeUndefined(); // level 3 is "find the clock"
    expect(parseClockId('time-find-3:00', 3)).toEqual({ h: 3, m: 0 });
    for (const bad of ['time-read-13:00', 'time-read-0:00', 'time-read-3:07', 'time-read-3', 'money-pay-3']) expect(parseClockId(bad, 5)).toBeUndefined();
  });
  it('an id that does not fit gives a normal item for the level', () => {
    const it = makeClockItem(0, seeded(2), false, undefined, 'time-read-3:30');
    expect(it.time.m).toBe(0);
  });
});

describe('due cards for these games', () => {
  const DAY = 86_400_000;
  const t0 = new Date(2026, 10, 20, 10).getTime();
  const a = (skillId: string, itemId: string, correct: boolean, at: number, level: number): ReviewAttempt => ({ skillId, itemId, level, correct, hintUsed: false, at });
  it('a miss yesterday is due today and rebuilds at its level', () => {
    const log = [a(FAIR_TRACK, 'money-change-10-7', false, t0, 3), a(CLOCK_TRACK, 'time-read-4:30', false, t0, 1)];
    const cards = dueCards(log, t0 + DAY);
    const by = Object.fromEntries(cards.map((c) => [c.skillId, c]));
    expect(makeFairItem(by.money.level, 'inr', seeded(1), false, undefined, by.money.itemId).answer).toBe(3);
    expect(makeClockItem(by.time.level, seeded(1), false, undefined, by.time.itemId).time).toEqual({ h: 4, m: 30 });
    expect(placeSpaced(planRound(8), cards.length).filter((k) => k === 'spaced')).toHaveLength(2);
  });
  it('not due on the same day', () => {
    expect(dueCards([a(CLOCK_TRACK, 'time-read-4:30', false, t0, 1)], t0 + 1000)).toHaveLength(0);
  });
});
