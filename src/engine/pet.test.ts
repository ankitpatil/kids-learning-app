import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { adoptPet, buyOutfit, cleanPet, feedPet, heartsNow, HEART_HOURS, petMood, starBalance, toggleOutfit, type PetState } from './pet';
import { MAX_HEARTS, PET_FOODS, PET_KINDS, PET_OUTFITS } from '../content/pet';
import { AppDB, addStars, ensureProfile, getProfile, updatePet } from '../store/db';
import { parseBackup, makeBackup } from '../store/backup';
import { hasIcon } from '../icons/icons';

const H = HEART_HOURS * 60 * 60 * 1000;
const T0 = 1_700_000_000_000;
const pet = (over: Partial<PetState> = {}): PetState => ({ ...adoptPet('puppy', T0)!, ...over });

describe('pet content', () => {
  it('has unique ids, bundled icons and sensible prices', () => {
    for (const list of [PET_KINDS, PET_FOODS, PET_OUTFITS]) {
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
      for (const x of list) expect(hasIcon(x.icon), x.icon).toBe(true);
    }
    // A snack costs about a round (1–4 stars); an outfit a few rounds.
    for (const f of PET_FOODS) expect(f.cost).toBeGreaterThanOrEqual(1), expect(f.cost).toBeLessThanOrEqual(6), expect(f.hearts).toBeGreaterThan(0);
    for (const o of PET_OUTFITS) expect(o.cost).toBeGreaterThanOrEqual(5);
    expect(Math.min(...PET_FOODS.map((f) => f.cost))).toBeLessThanOrEqual(2);
  });
});

describe('pet logic', () => {
  it('adopts only known pets, starting happy with room for a snack', () => {
    expect(adoptPet('griffin')).toBeNull();
    const p = adoptPet('kitty', T0)!;
    expect(p).toMatchObject({ kind: 'kitty', spent: 0, outfits: [], wearing: {} });
    expect(petMood(heartsNow(p, T0))).toBe('happy');
  });

  it('stars earned are kept; the wallet is earned minus spent', () => {
    expect(starBalance({ stars: 10 })).toBe(10);
    expect(starBalance({ stars: 10, pet: pet({ spent: 4 }) })).toBe(6);
    expect(starBalance({ stars: 3, pet: pet({ spent: 9 }) })).toBe(0);
  });

  it('loses one heart per period, never below zero, and only gets hungry', () => {
    const p = pet({ hearts: 4, heartsAt: T0 });
    expect(heartsNow(p, T0 + H - 1)).toBe(4);
    expect(heartsNow(p, T0 + H)).toBe(3);
    expect(heartsNow(p, T0 + 3 * H)).toBe(1);
    expect(heartsNow(p, T0 + 100 * H)).toBe(0);
    expect(heartsNow(p, T0 - 5 * H)).toBe(4); // clock moved back: no change
    expect([0, 1, 2, 3, 4, 5].map(petMood)).toEqual(['hungry', 'ok', 'ok', 'happy', 'happy', 'full']);
  });

  it('feeds: costs stars, fills hearts up to the max, restarts the clock', () => {
    const p = pet({ hearts: 1, heartsAt: T0 });
    const r = feedPet(p, 10, 'cake', T0 + 2 * H); // 1 heart decayed → 0, cake +3
    expect(r.ok && r.pet).toMatchObject({ spent: 6, hearts: 3, heartsAt: T0 + 2 * H });
    const r2 = feedPet(pet({ hearts: 4 }), 10, 'cake', T0);
    expect(r2.ok && r2.pet.hearts).toBe(MAX_HEARTS);
  });

  it('will not feed a full pet, an unknown food, without stars or without a pet', () => {
    expect(feedPet(pet({ hearts: MAX_HEARTS }), 50, 'apple', T0)).toEqual({ ok: false, why: 'full' });
    expect(feedPet(pet(), 50, 'pizza', T0)).toEqual({ ok: false, why: 'unknown' });
    expect(feedPet(pet({ spent: 9 }), 10, 'apple', T0)).toEqual({ ok: false, why: 'stars' });
    expect(feedPet(undefined, 10, 'apple', T0)).toEqual({ ok: false, why: 'noPet' });
  });

  it('buys an outfit once, puts it on, swaps within a slot', () => {
    const a = buyOutfit(pet(), 40, 'cap');
    expect(a.ok && a.pet).toMatchObject({ spent: 10, outfits: ['cap'], wearing: { head: 'cap' } });
    if (!a.ok) return;
    expect(buyOutfit(a.pet, 40, 'cap')).toEqual({ ok: false, why: 'owned' });
    expect(buyOutfit(a.pet, 15, 'glasses')).toEqual({ ok: false, why: 'stars' }); // 5 left < 12
  });

  it('crown is affordable with exactly enough stars, and replaces the cap', () => {
    const a = buyOutfit(pet(), 40, 'cap');
    if (!a.ok) throw new Error();
    const b = buyOutfit(a.pet, 41, 'crown');
    expect(b.ok && b.pet).toMatchObject({ spent: 40, wearing: { head: 'crown' } });
  });

  it('wears and takes off owned outfits for free, one per slot', () => {
    let p = pet({ outfits: ['cap', 'glasses', 'scarf'] });
    for (const id of ['cap', 'glasses', 'scarf']) {
      const r = toggleOutfit(p, id);
      if (!r.ok) throw new Error(r.why);
      p = r.pet;
    }
    expect(p.wearing).toEqual({ head: 'cap', eyes: 'glasses', neck: 'scarf' });
    expect(p.spent).toBe(0);
    const off = toggleOutfit(p, 'glasses');
    expect(off.ok && off.pet.wearing).toEqual({ head: 'cap', neck: 'scarf' });
    expect(toggleOutfit(p, 'crown')).toEqual({ ok: false, why: 'notOwned' });
  });

  it('cleans a pet from a file: unknown kind dropped, bad outfits and slots removed, numbers clamped', () => {
    expect(cleanPet({ kind: 'griffin' })).toBeUndefined();
    expect(cleanPet('puppy')).toBeUndefined();
    expect(cleanPet({ kind: 'bunny', spent: -3, hearts: 99, heartsAt: 'x', outfits: ['cap', 'cap', 'jetpack', 7], wearing: { head: 'cap', eyes: 'cap', neck: 'scarf' } })).toEqual({
      kind: 'bunny', spent: 0, hearts: MAX_HEARTS, heartsAt: 0, outfits: ['cap'], wearing: { head: 'cap' },
    });
  });
});

describe('pet storage', () => {
  it('saves a successful step and leaves the profile alone on a failed one', async () => {
    const d = new AppDB('pet-1');
    const p = await ensureProfile(d);
    await addStars(p.id, 12, d);
    const adopt = await updatePet(p.id, (pr) => (pr.pet ? { ok: false, why: 'owned' } : { ok: true, pet: adoptPet('panda', T0)! }), d);
    expect(adopt.result.ok).toBe(true);
    const fed = await updatePet(p.id, (pr) => feedPet(pr.pet, pr.stars, 'mango', T0), d);
    expect(fed.result.ok).toBe(true);
    expect(starBalance(fed.profile)).toBe(9);
    const tooDear = await updatePet(p.id, (pr) => buyOutfit(pr.pet, pr.stars, 'crown'), d);
    expect(tooDear.result).toEqual({ ok: false, why: 'stars' });
    const stored = (await getProfile(p.id, d))!;
    expect(stored.stars).toBe(12);
    expect(stored.pet).toMatchObject({ kind: 'panda', spent: 3, hearts: 5 });
  });

  it('a pet survives a backup round trip', () => {
    const profile = { id: 'default', nickname: 'Ria', avatar: '🦊', stars: 20, createdAt: 1, pet: pet({ spent: 10, outfits: ['cap'], wearing: { head: 'cap' } }) };
    const parsed = parseBackup(JSON.stringify(makeBackup({ profiles: [profile], attempts: [], skillStates: [] })));
    expect(parsed.ok && parsed.backup.profiles[0].pet).toEqual(profile.pet);
  });
});
