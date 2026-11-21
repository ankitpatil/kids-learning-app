import { describe, it, expect } from 'vitest';
import { makeFairItem, fairMode, walletFor, fewestCoins, checkPay, trayTotal, canAdd, countUp, changeChoices, fairPrompt, fairHint, fairWhyContext, MAX_IN_TRAY, FAIR_TRACK } from './generator';
import { CURRENCIES, FAIR_THINGS, denomFor, loadCurrency, saveCurrency, moneyText, moneyWords, type CurrencyId } from '../../content/money';
import { getTrack, maxLevel, levelAge } from '../../engine/tracks';
import { gameGroup } from '../../engine/roundMix';
import { whyRequest } from '../../ai/whyHint';
import { sanitizeRequest } from '../../ai/request';
import { hasIcon } from '../../icons/icons';

const CUR: CurrencyId[] = ['inr', 'usd'];

/** Deterministic rng for repeatable sweeps. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function sweep(fn: (c: CurrencyId, level: number, ease: boolean, seed: number) => void) {
  for (const c of CUR) for (let l = 0; l <= maxLevel(FAIR_TRACK); l++) for (let n = 0; n < 150; n++) fn(c, l, n % 10 === 0, n);
}

describe('money content', () => {
  it('formats and says prices', () => {
    expect(moneyText('inr', 7)).toBe('₹7');
    expect(moneyText('usd', 7)).toBe('7¢');
    expect(moneyWords('inr', 1)).toBe('one rupee');
    expect(moneyWords('inr', 15)).toBe('fifteen rupees');
    expect(moneyWords('usd', 1)).toBe('one cent');
    expect(moneyWords('usd', 25)).toBe('twenty five cents');
  });

  it('knows every coin/note it can show, including the US quarter paid for change', () => {
    for (const c of CUR) for (const d of CURRENCIES[c].denoms) expect(denomFor(c, d.value)).toEqual(d);
    expect(denomFor('usd', 25).name).toBe('quarter');
    expect(() => denomFor('inr', 3)).toThrow();
  });

  it('every fair thing has a bundled picture and a name', () => {
    expect(FAIR_THINGS.length).toBeGreaterThanOrEqual(10);
    for (const t of FAIR_THINGS) {
      expect(hasIcon(t.icon), t.icon).toBe(true);
      expect(t.a).toBe(/^[aeiou]/.test(t.name) ? 'an' : 'a');
    }
  });

  it('currency setting: rupees by default, US cents when chosen, survives bad storage', () => {
    const mem = new Map<string, string>();
    const kv = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    expect(loadCurrency(kv)).toBe('inr');
    saveCurrency('usd', kv);
    expect(loadCurrency(kv)).toBe('usd');
    mem.set('money-currency', 'eur');
    expect(loadCurrency(kv)).toBe('inr');
    const broken = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
    expect(loadCurrency(broken)).toBe('inr');
    expect(() => saveCurrency('usd', broken)).not.toThrow();
    expect(loadCurrency(null)).toBe('inr');
  });
});

describe('money track', () => {
  it('is playable, has 5 levels with an age band each, and is its own game', () => {
    const t = getTrack(FAIR_TRACK);
    expect(t.playable).toBe(true);
    expect(t.levels).toHaveLength(5);
    for (let l = 0; l < t.levels.length; l++) expect(levelAge(FAIR_TRACK, l)).toBe('a56');
    expect(gameGroup(FAIR_TRACK)).toEqual([FAIR_TRACK]);
  });

  it('pays exact first, then makes change; easing always pays', () => {
    expect([0, 1, 2, 3, 4].map((l) => fairMode(l))).toEqual(['pay', 'pay', 'pay', 'change', 'change']);
    expect(fairMode(4, true)).toBe('pay');
  });
});

describe('pay exact', () => {
  it('within 10 the wallet has only small coins; within 20 coins and notes', () => {
    expect(walletFor('inr', 10)).toEqual([1, 2, 5]);
    expect(walletFor('inr', 20)).toEqual([1, 2, 5, 10, 20]);
    expect(walletFor('usd', 10)).toEqual([1, 5]);
    expect(walletFor('usd', 20)).toEqual([1, 5, 10]);
  });

  it('every price is in range and can be paid exactly from the wallet within the tray size', () => {
    sweep((c, l, ease, seed) => {
      const it = makeFairItem(l, c, seeded(seed), ease);
      if (it.mode !== 'pay') return;
      const max = ease ? 5 : l === 0 ? 10 : 20;
      expect(it.price).toBeGreaterThanOrEqual(2);
      expect(it.price).toBeLessThanOrEqual(max);
      expect(it.answer).toBe(it.price);
      const coins = fewestCoins(it.price, it.wallet);
      expect(trayTotal(coins)).toBe(it.price);
      expect(coins.length).toBeLessThanOrEqual(MAX_IN_TRAY);
      // Even paying only with the smallest coin fits the tray (a child may use all ones).
      expect(it.price / Math.min(...it.wallet)).toBeLessThanOrEqual(MAX_IN_TRAY + 8);
    });
  });

  it('easing: tiny prices, ones and twos only (pennies in US), total shown', () => {
    for (const c of CUR) {
      const it = makeFairItem(4, c, seeded(3), true);
      expect(it.mode).toBe('pay');
      expect(it.price).toBeLessThanOrEqual(5);
      expect(it.wallet.every((v) => v <= 2)).toBe(true);
      expect(it.scaffold).toBe(true);
    }
  });

  it('shows the running total on levels 1–2, not on "count it yourself"', () => {
    expect(makeFairItem(0, 'inr', seeded(1)).scaffold).toBe(true);
    expect(makeFairItem(1, 'inr', seeded(1)).scaffold).toBe(true);
    expect(makeFairItem(2, 'inr', seeded(1)).scaffold).toBe(false);
  });

  it('checks the tray: exact, too little, too much', () => {
    const it = makeFairItem(1, 'inr', seeded(9));
    const exact = fewestCoins(it.price, it.wallet);
    expect(checkPay(it, exact)).toBe('correct');
    expect(checkPay(it, [...exact].reverse())).toBe('correct');
    expect(checkPay(it, exact.slice(1))).toBe('too-little');
    expect(checkPay(it, [...exact, 1])).toBe('too-much');
    expect(checkPay(it, Array(it.price).fill(1))).toBe('correct'); // all ₹1 coins is fine too
  });

  it('fewest coins uses big coins first', () => {
    expect(fewestCoins(17, [1, 2, 5, 10, 20])).toEqual([10, 5, 2]);
    expect(fewestCoins(19, [1, 5, 10])).toEqual([10, 5, 1, 1, 1, 1]);
    expect(() => fewestCoins(3, [2])).toThrow();
  });

  it('the tray has a size cap', () => {
    expect(canAdd(Array(MAX_IN_TRAY - 1).fill(1))).toBe(true);
    expect(canAdd(Array(MAX_IN_TRAY).fill(1))).toBe(false);
  });

  it('avoids repeating the previous price when it can', () => {
    let repeats = 0;
    for (let n = 0; n < 100; n++) {
      const a = makeFairItem(1, 'inr', seeded(n));
      const b = makeFairItem(1, 'inr', seeded(n + 1000), false, a.id);
      if (a.id === b.id) repeats++;
    }
    expect(repeats).toBeLessThan(3);
  });

  it('hints say how much more, or to take a coin back', () => {
    const it = { ...makeFairItem(1, 'inr', seeded(2)), price: 7 };
    expect(fairHint(it, [5])).toBe('You have five rupees. | It costs seven rupees. | Add two rupees more!');
    expect(fairHint(it, [5, 5])).toBe("That's ten rupees. | Too much! | Tap a coin to take it back.");
    expect(fairPrompt({ ...it, thing: FAIR_THINGS[0] })).toBe('A balloon costs seven rupees. | Pay seven rupees!');
  });
});

describe('make change', () => {
  it('change from 10 (₹10 / a dime) and within 20 (₹20 / a quarter): true facts, answers 1..20', () => {
    const paidSeen = new Set<string>();
    sweep((c, l, ease, seed) => {
      const it = makeFairItem(l, c, seeded(seed), ease);
      if (it.mode !== 'change') return;
      paidSeen.add(`${c}:${l}:${it.paid}`);
      expect(it.paid).toBe(CURRENCIES[c].payWith[l === 3 ? 0 : 1]);
      expect(it.price).toBeGreaterThanOrEqual(1);
      expect(it.price).toBeLessThan(it.paid);
      expect(it.answer).toBe(it.paid - it.price);
      expect(it.answer).toBeGreaterThanOrEqual(1);
      expect(it.answer).toBeLessThanOrEqual(20);
      expect(it.choices).toHaveLength(4);
      expect(new Set(it.choices).size).toBe(4);
      expect(it.choices).toContain(it.answer);
      expect(it.choices.every((n) => n >= 1 && n <= 20)).toBe(true);
    });
    expect([...paidSeen].sort()).toEqual(['inr:3:10', 'inr:4:20', 'usd:3:10', 'usd:4:25']);
  });

  it('near choices are off by one or two (counting slips)', () => {
    for (let n = 0; n < 50; n++) {
      const ch = changeChoices(8, 20, true, seeded(n));
      expect(ch.filter((x) => x !== 8).every((x) => Math.abs(x - 8) <= 2)).toBe(true);
    }
  });

  it('count-up strip goes from just after the price to what was paid', () => {
    const it = { ...makeFairItem(3, 'inr', seeded(1)), price: 7, paid: 10, answer: 3 };
    expect(countUp(it)).toEqual([8, 9, 10]);
    expect(countUp(it)).toHaveLength(it.answer);
  });

  it('prompts and hints in words', () => {
    const it = { ...makeFairItem(3, 'inr', seeded(1)), price: 7, paid: 10, answer: 3, thing: FAIR_THINGS[2] };
    expect(fairPrompt(it)).toBe('An ice cream costs seven rupees. | You pay ten rupees. | How much money comes back?');
    expect(fairHint(it)).toBe('Count up from seven to ten.');
    expect(fairHint(it, [], 2)).toBe('seven rupees and two rupees make nine rupees, | not ten rupees. | Count up from seven to ten.');
    const us = { ...makeFairItem(4, 'usd', seeded(1)), price: 13, paid: 25, answer: 12 };
    expect(fairHint(us)).toBe('Count up from thirteen to twenty five.');
  });

  it('why-helper requests carry only the item (pass the request whitelist)', () => {
    sweep((c, l, ease, seed) => {
      const it = makeFairItem(l, c, seeded(seed), ease);
      if (it.mode !== 'change') return;
      const ctx = fairWhyContext(it, l, it.choices.find((n) => n !== it.answer));
      expect(ctx.answer).toBe(it.answer);
      const req = whyRequest(ctx);
      expect(sanitizeRequest(req)).not.toBeNull();
    });
  });
});
