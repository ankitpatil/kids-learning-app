// #21 Fun at the Fair: currencies, coins/notes and things to buy at the fair stalls, as data.
// Rupees are the default (the family is in Pune); US cents are a Grown-ups setting (per device).
import { numberWord } from '../engine/numberWords';

export type CurrencyId = 'inr' | 'usd';

export interface Denom {
  value: number;
  kind: 'coin' | 'note';
  /** Spoken name ("a five rupee coin", "a nickel"). */
  name: string;
}

export interface Currency {
  id: CurrencyId;
  label: string;
  /** Coins and notes in the child's wallet, smallest first. */
  denoms: Denom[];
  /** What the child hands over in the "make change" levels: [within 10, within 20]. */
  payWith: [number, number];
  unit: [singular: string, plural: string];
}

export const CURRENCIES: Record<CurrencyId, Currency> = {
  inr: {
    id: 'inr',
    label: '₹ Rupees',
    denoms: [
      { value: 1, kind: 'coin', name: 'one rupee coin' },
      { value: 2, kind: 'coin', name: 'two rupee coin' },
      { value: 5, kind: 'coin', name: 'five rupee coin' },
      { value: 10, kind: 'note', name: 'ten rupee note' },
      { value: 20, kind: 'note', name: 'twenty rupee note' },
    ],
    payWith: [10, 20],
    unit: ['rupee', 'rupees'],
  },
  usd: {
    id: 'usd',
    label: '¢ US cents',
    // Pennies, nickels and dimes (US Grade 1–2 coins); a quarter is what the child pays with for change within 20.
    denoms: [
      { value: 1, kind: 'coin', name: 'penny' },
      { value: 5, kind: 'coin', name: 'nickel' },
      { value: 10, kind: 'coin', name: 'dime' },
    ],
    payWith: [10, 25],
    unit: ['cent', 'cents'],
  },
};

/** Price as shown on a tag: "₹7" or "7¢". */
export function moneyText(c: CurrencyId, n: number): string {
  return c === 'inr' ? `₹${n}` : `${n}¢`;
}

/** Price in words for speech: "seven rupees", "one cent". */
export function moneyWords(c: CurrencyId, n: number): string {
  const [one, many] = CURRENCIES[c].unit;
  return `${numberWord(n)} ${n === 1 ? one : many}`;
}

/** The coin or note for a value (US quarter isn't in the wallet but is paid with). */
export function denomFor(c: CurrencyId, value: number): Denom {
  const d = CURRENCIES[c].denoms.find((x) => x.value === value);
  if (d) return d;
  if (c === 'usd' && value === 25) return { value: 25, kind: 'coin', name: 'quarter' };
  throw new Error(`No ${c} coin or note for ${value}`);
}

export interface FairThing {
  name: string;
  /** Article for speech ("a balloon", "an ice cream"). */
  a: 'a' | 'an';
  icon: string;
}

const T = (name: string, icon: string): FairThing => ({ name, a: /^[aeiou]/.test(name) ? 'an' : 'a', icon });

/** Things sold at the fair stalls (all bundled icons). */
export const FAIR_THINGS: FairThing[] = [
  T('balloon', 'balloon'),
  T('lollipop', 'lollipop'),
  T('ice cream', 'soft-ice-cream'),
  T('sweet', 'candy'),
  T('cookie', 'cookie'),
  T('doughnut', 'doughnut'),
  T('cupcake', 'cupcake'),
  T('teddy bear', 'teddy-bear'),
  T('yo-yo', 'yo-yo'),
  T('kite', 'kite'),
  T('chocolate', 'chocolate-bar'),
  T('crown', 'crown'),
  T('magic wand', 'magic-wand'),
  T('toy car', 'racing-car'),
  T('mango', 'mango'),
  T('slice of watermelon', 'watermelon'),
];

// ---------- Grown-ups setting: which money (per device) ----------
const KEY = 'money-currency';
type KV = Pick<Storage, 'getItem' | 'setItem'>;
const store = (): KV | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export function loadCurrency(kv: KV | null = store()): CurrencyId {
  try {
    return kv?.getItem(KEY) === 'usd' ? 'usd' : 'inr';
  } catch {
    return 'inr';
  }
}

export function saveCurrency(c: CurrencyId, kv: KV | null = store()): void {
  try {
    kv?.setItem(KEY, c === 'usd' ? 'usd' : 'inr');
  } catch {
    /* storage unavailable */
  }
}
