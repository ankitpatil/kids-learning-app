// #21 Fun at the Fair (money track). Two modes, by the level's representation:
//   concrete              → 'pay'    : tap coins/notes from the wallet to pay the exact price
//   pictorial / abstract  → 'change' : you pay with ₹10 / ₹20 (10¢ / 25¢); how much comes back?
// Scaffold: 'pay' shows the running total; 'change' shows a count-up strip from the price to what was paid.
import type { WhyContext } from '../../ai/whyHint';
import { getLevel } from '../../engine/tracks';
import { numberWord } from '../../engine/numberWords';
import { CURRENCIES, FAIR_THINGS, moneyWords, type CurrencyId, type FairThing } from '../../content/money';

export type Rng = () => number;
export type FairMode = 'pay' | 'change';
export const FAIR_TRACK = 'money';
/** Most coins the pay tray holds (keeps the tray on screen; no price needs more). */
export const MAX_IN_TRAY = 12;

export interface FairItem {
  id: string;
  mode: FairMode;
  currency: CurrencyId;
  thing: FairThing;
  price: number;
  /** Values of the coins/notes in the wallet ('pay'). */
  wallet: number[];
  /** Show the running total of the tray ('pay') / the count-up strip ('change'). */
  scaffold: boolean;
  /** 'change': what the child pays with. */
  paid: number;
  /** 'pay': the price; 'change': paid − price. */
  answer: number;
  /** 'change': number choices including the answer. */
  choices: number[];
}

function int(rng: Rng, lo: number, hi: number) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function fairMode(level: number, ease = false): FairMode {
  if (ease) return 'pay';
  return getLevel(FAIR_TRACK, level).representation === 'concrete' ? 'pay' : 'change';
}

/** Coins/notes offered for paying up to `range`: within 10 only coins up to 5. */
export function walletFor(c: CurrencyId, range: number): number[] {
  const cap = range <= 10 ? 5 : range;
  return CURRENCIES[c].denoms.map((d) => d.value).filter((v) => v <= cap);
}

/** Fewest coins/notes that make `amount` (greedy is exact for ₹ and US coins). Used for hints. */
export function fewestCoins(amount: number, wallet: number[]): number[] {
  const out: number[] = [];
  let left = amount;
  for (const v of [...wallet].sort((a, b) => b - a)) {
    while (left >= v) {
      out.push(v);
      left -= v;
    }
  }
  if (left !== 0) throw new Error(`Can't make ${amount} from ${wallet.join(',')}`);
  return out;
}

export const trayTotal = (tray: number[]) => tray.reduce((s, v) => s + v, 0);

export function checkPay(item: FairItem, tray: number[]): 'correct' | 'too-little' | 'too-much' {
  const t = trayTotal(tray);
  return t === item.price ? 'correct' : t < item.price ? 'too-little' : 'too-much';
}

/** Can another coin of `value` go in the tray? (Overpaying is allowed — that's a gentle miss — but the tray has a size cap.) */
export function canAdd(tray: number[]): boolean {
  return tray.length < MAX_IN_TRAY;
}

/** Count-up strip for 'change': the numbers after the price up to what was paid (7 → 10: [8, 9, 10]). */
export function countUp(item: FairItem): number[] {
  return Array.from({ length: item.paid - item.price }, (_, i) => item.price + 1 + i);
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Four distinct choices in 1..max with the answer; near = off by one or two (the classic counting slip). */
export function changeChoices(answer: number, max: number, near: boolean, rng: Rng): number[] {
  const set = new Set<number>([answer]);
  for (const o of shuffle(near ? [1, -1, 2, -2] : [3, -3, 4, -4, 5, -5], rng)) {
    if (set.size >= 4) break;
    const v = answer + o;
    if (v >= 1 && v <= max) set.add(v);
  }
  while (set.size < 4) set.add(int(rng, 1, max));
  return shuffle([...set], rng);
}

/** What the change question pays with at a level (₹10 / ₹20, 10¢ / 25¢). */
export const payWithAt = (currency: CurrencyId, level: number) => CURRENCIES[currency].payWith[getLevel(FAIR_TRACK, level).range <= 10 ? 0 : 1];

/**
 * Read a logged id (`money-pay-7`, `money-change-10-3`) back into its price (#25d spaced review),
 * checked against the level it's asked at: the mode must be that level's mode, a price to pay must be
 * in the level's price range, and a change question must pay with what this currency uses there
 * (so a ₹20 miss isn't replayed after switching to cents). Undefined otherwise.
 */
export function parseFairId(itemId: string, level: number, currency: CurrencyId): { mode: FairMode; price: number; paid: number } | undefined {
  const cfg = getLevel(FAIR_TRACK, level);
  const mode = fairMode(level);
  let m = /^money-pay-(\d+)$/.exec(itemId);
  if (m) {
    const price = +m[1];
    const lo = cfg.range <= 10 ? 2 : 6;
    if (mode !== 'pay' || price < lo || price > cfg.range) return undefined;
    return { mode, price, paid: 0 };
  }
  m = /^money-change-(\d+)-(\d+)$/.exec(itemId);
  if (m) {
    const paid = +m[1], price = +m[2];
    if (mode !== 'change' || paid !== payWithAt(currency, level)) return undefined;
    if (price < Math.max(1, paid - 20) || price > paid - 1) return undefined;
    return { mode, price, paid };
  }
  return undefined;
}

/**
 * One item. `want` (#25d): an item id to ask again — the same price (and what's paid), with a new
 * fair thing and fresh choices; ignored unless it fits this level and currency (see `parseFairId`).
 */
export function makeFairItem(level: number, currency: CurrencyId, rng: Rng = Math.random, ease = false, avoid?: string, want?: string): FairItem {
  const cfg = getLevel(FAIR_TRACK, level);
  const wanted = want && !ease ? parseFairId(want, level, currency) : undefined;
  const mode = fairMode(level, ease);
  const thing = FAIR_THINGS[int(rng, 0, FAIR_THINGS.length - 1)];
  const near = cfg.distractors === 'near';
  const pickPay = (wallet: number[]) => {
    if (ease) return int(rng, 2, 5);
    const lo = cfg.range <= 10 ? 2 : 6;
    let p = int(rng, lo, cfg.range);
    // From level 2 on, a price that is a single coin is too easy: re-roll once.
    if (cfg.range > 10 && wallet.includes(p)) p = int(rng, lo, cfg.range);
    return p;
  };

  if (mode === 'pay') {
    const wallet = ease ? walletFor(currency, 5).filter((v) => v <= 2) : walletFor(currency, cfg.range);
    let price = wanted ? wanted.price : pickPay(wallet);
    for (let i = 0; !wanted && i < 5 && `money-pay-${price}` === avoid; i++) price = pickPay(wallet);
    return { id: `money-pay-${price}`, mode, currency, thing, price, wallet, scaffold: ease || cfg.scaffold, paid: 0, answer: price, choices: [] };
  }

  const paid = payWithAt(currency, level);
  // Change is 1..paid−1 within 10; within 20 the change is 1..20 (US: 25¢ − 5¢..24¢).
  const lo = Math.max(1, paid - 20);
  const pickPrice = () => int(rng, lo, paid - 1);
  let price = wanted ? wanted.price : pickPrice();
  for (let i = 0; !wanted && i < 5 && `money-change-${paid}-${price}` === avoid; i++) price = pickPrice();
  const answer = paid - price;
  return {
    id: `money-change-${paid}-${price}`,
    mode,
    currency,
    thing,
    price,
    wallet: [],
    scaffold: cfg.scaffold,
    paid,
    answer,
    choices: changeChoices(answer, Math.min(20, paid), near, rng),
  };
}

/** Spoken prompt for the item. */
export function fairPrompt(it: FairItem): string {
  const costs = `${it.thing.a === 'a' ? 'A' : 'An'} ${it.thing.name} costs ${moneyWords(it.currency, it.price)}.`;
  if (it.mode === 'pay') return `${costs} | Pay ${moneyWords(it.currency, it.price)}!`;
  return `${costs} | You pay ${moneyWords(it.currency, it.paid)}. | How much money comes back?`;
}

/** Canned hint after a miss. */
export function fairHint(it: FairItem, tray: number[] = [], picked?: number): string {
  const w = (n: number) => moneyWords(it.currency, n);
  if (it.mode === 'pay') {
    const t = trayTotal(tray);
    if (t < it.price) return `You have ${w(t)}. | It costs ${w(it.price)}. | Add ${w(it.price - t)} more!`;
    return `That's ${w(t)}. | Too much! | Tap a coin to take it back.`;
  }
  const from = `Count up from ${numberWord(it.price)} to ${numberWord(it.paid)}.`;
  return picked !== undefined && picked + it.price !== it.paid ? `${w(it.price)} and ${w(picked)} make ${w(it.price + picked)}, | not ${w(it.paid)}. | ${from}` : from;
}

/** AI3 "Why?" helper for the change question (the number to find is the change). */
export function fairWhyContext(it: FairItem, level: number, picked?: number): WhyContext {
  return {
    subject: 'math',
    track: FAIR_TRACK,
    level,
    question: `Something costs ${moneyWords(it.currency, it.price)}. You pay ${moneyWords(it.currency, it.paid)}. How much money do you get back?`,
    answer: it.answer,
    picked,
  };
}
