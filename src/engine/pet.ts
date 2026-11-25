// Avatar pet (#27a), pure logic. Stars a child earns are never taken away: `Profile.stars` stays the total
// earned and the pet keeps `spent`, so the wallet is `stars - spent`. Hearts go down slowly with real time
// (one per HEART_HOURS) but the pet is only ever "hungry" — it never gets sick, runs away or loses outfits.
import { MAX_HEARTS, PET_FOOD_BY_ID, PET_KIND_BY_ID, PET_OUTFIT_BY_ID, type OutfitSlot } from '../content/pet';

export interface PetState {
  kind: string;
  /** Stars spent on this pet, ever. */
  spent: number;
  /** Hearts at `heartsAt` (0..MAX_HEARTS). */
  hearts: number;
  heartsAt: number;
  /** Outfit ids bought (kept forever). */
  outfits: string[];
  /** Outfit worn in each slot. */
  wearing: Partial<Record<OutfitSlot, string>>;
}

export type PetMood = 'hungry' | 'ok' | 'happy' | 'full';
export type ShopFail = 'noPet' | 'unknown' | 'stars' | 'full' | 'owned' | 'notOwned';
export type ShopResult = { ok: true; pet: PetState } | { ok: false; why: ShopFail };

/** One heart goes every 8 hours: a pet fed to full in the evening is a bit hungry the next evening. */
export const HEART_HOURS = 8;
const HEART_MS = HEART_HOURS * 60 * 60 * 1000;

/** A new pet starts with 3 hearts — happy, with room for a first snack. */
export function adoptPet(kind: string, now = Date.now()): PetState | null {
  if (!PET_KIND_BY_ID.has(kind)) return null;
  return { kind, spent: 0, hearts: 3, heartsAt: now, outfits: [], wearing: {} };
}

/** Stars the child can spend. */
export function starBalance(p: { stars: number; pet?: PetState }): number {
  return Math.max(0, p.stars - (p.pet?.spent ?? 0));
}

export function heartsNow(pet: PetState, now = Date.now()): number {
  const lost = Math.floor(Math.max(0, now - pet.heartsAt) / HEART_MS);
  return Math.max(0, Math.min(MAX_HEARTS, pet.hearts - lost));
}

export function petMood(hearts: number): PetMood {
  if (hearts <= 0) return 'hungry';
  if (hearts >= MAX_HEARTS) return 'full';
  return hearts >= 3 ? 'happy' : 'ok';
}

export function feedPet(pet: PetState | undefined, stars: number, foodId: string, now = Date.now()): ShopResult {
  if (!pet) return { ok: false, why: 'noPet' };
  const food = PET_FOOD_BY_ID.get(foodId);
  if (!food) return { ok: false, why: 'unknown' };
  const hearts = heartsNow(pet, now);
  // Full pets don't eat: never spend stars for nothing.
  if (hearts >= MAX_HEARTS) return { ok: false, why: 'full' };
  if (starBalance({ stars, pet }) < food.cost) return { ok: false, why: 'stars' };
  return { ok: true, pet: { ...pet, spent: pet.spent + food.cost, hearts: Math.min(MAX_HEARTS, hearts + food.hearts), heartsAt: now } };
}

/** Buy an outfit and put it on (it replaces whatever is in that slot). */
export function buyOutfit(pet: PetState | undefined, stars: number, outfitId: string): ShopResult {
  if (!pet) return { ok: false, why: 'noPet' };
  const o = PET_OUTFIT_BY_ID.get(outfitId);
  if (!o) return { ok: false, why: 'unknown' };
  if (pet.outfits.includes(o.id)) return { ok: false, why: 'owned' };
  if (starBalance({ stars, pet }) < o.cost) return { ok: false, why: 'stars' };
  return { ok: true, pet: { ...pet, spent: pet.spent + o.cost, outfits: [...pet.outfits, o.id], wearing: { ...pet.wearing, [o.slot]: o.id } } };
}

/** Put on an owned outfit, or take it off if it is already on. Free. */
export function toggleOutfit(pet: PetState | undefined, outfitId: string): ShopResult {
  if (!pet) return { ok: false, why: 'noPet' };
  const o = PET_OUTFIT_BY_ID.get(outfitId);
  if (!o) return { ok: false, why: 'unknown' };
  if (!pet.outfits.includes(o.id)) return { ok: false, why: 'notOwned' };
  const wearing = { ...pet.wearing };
  if (wearing[o.slot] === o.id) delete wearing[o.slot];
  else wearing[o.slot] = o.id;
  return { ok: true, pet: { ...pet, wearing } };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Validate a pet read from a backup file: unknown pets/outfits dropped, numbers clamped. */
export function cleanPet(v: unknown): PetState | undefined {
  if (!isObj(v) || typeof v.kind !== 'string' || !PET_KIND_BY_ID.has(v.kind)) return undefined;
  const outfits = Array.isArray(v.outfits) ? [...new Set(v.outfits.filter((o): o is string => typeof o === 'string' && PET_OUTFIT_BY_ID.has(o)))] : [];
  const wearing: PetState['wearing'] = {};
  if (isObj(v.wearing)) {
    for (const [slot, id] of Object.entries(v.wearing)) {
      const o = typeof id === 'string' ? PET_OUTFIT_BY_ID.get(id) : undefined;
      if (o && o.slot === slot && outfits.includes(o.id)) wearing[o.slot] = o.id;
    }
  }
  return {
    kind: v.kind,
    spent: isNum(v.spent) ? Math.max(0, Math.floor(v.spent)) : 0,
    hearts: isNum(v.hearts) ? Math.max(0, Math.min(MAX_HEARTS, Math.floor(v.hearts))) : 0,
    heartsAt: isNum(v.heartsAt) ? v.heartsAt : 0,
    outfits,
    wearing,
  };
}
