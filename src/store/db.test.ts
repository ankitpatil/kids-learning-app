import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { AppDB, ensureProfile, getSkillState, saveSkillState, logAttempt, addStars } from './db';

describe('db', () => {
  it('creates a default profile once', async () => {
    const d = new AppDB('t1');
    const a = await ensureProfile(d);
    const b = await ensureProfile(d);
    expect(a.id).toBe(b.id);
    expect(await d.profiles.count()).toBe(1);
  });

  it('round-trips skill state and defaults when missing', async () => {
    const d = new AppDB('t2');
    const s = await getSkillState('p', 'count', d);
    expect(s.level).toBe(0);
    await saveSkillState({ ...s, level: 3 }, d);
    expect((await getSkillState('p', 'count', d)).level).toBe(3);
  });

  it('logs attempts and adds stars', async () => {
    const d = new AppDB('t3');
    const p = await ensureProfile(d);
    await logAttempt({ profileId: p.id, skillId: 'count', itemId: 'count-3', level: 0, correct: true, hintUsed: false, timeMs: 900, at: 1 }, d);
    expect(await d.attempts.where('[profileId+skillId]').equals([p.id, 'count']).count()).toBe(1);
    expect(await addStars(p.id, 3, d)).toBe(3);
    expect(await addStars(p.id, 2, d)).toBe(5);
  });
});

import { setTrackLevels, setPlaced, getSkillStates } from './db';
describe('placement storage', () => {
  it('sets many track levels and the placed flag', async () => {
    const d = new AppDB('t4');
    const p = await ensureProfile(d);
    await setTrackLevels(p.id, { count: 5, add10: 2 }, ['count'], d);
    expect((await getSkillState(p.id, 'count', d)).mastery).toBeGreaterThan(0.85);
    expect(Object.keys(await getSkillStates(p.id, d)).sort()).toEqual(['add10', 'count']);
    expect((await getSkillState(p.id, 'count', d)).level).toBe(5);
    expect((await getSkillState(p.id, 'add10', d)).level).toBe(2);
    const updated = await setPlaced(p.id, 'math', true, d);
    expect(updated.placed?.math).toBe(true);
    expect((await d.profiles.get(p.id))?.placed?.math).toBe(true);
    expect((await setPlaced(p.id, 'reading', true, d)).placed).toEqual({ math: true, reading: true });
  });
});

import { addSticker } from './db';
describe('stickers storage', () => {
  it('counts stickers per profile', async () => {
    const d = new AppDB('t5');
    const p = await ensureProfile(d);
    await addSticker(p.id, 'animals-puppy', d);
    const after = await addSticker(p.id, 'animals-puppy', d);
    expect(after.stickers).toEqual({ 'animals-puppy': 2 });
    expect((await d.profiles.get(p.id))?.stickers?.['animals-puppy']).toBe(2);
  });
});

import { createProfile, listProfiles, touchProfile, getProfile } from './db';
import { MAX_PROFILES } from '../engine/profiles';
describe('multiple profiles', () => {
  it('keeps the existing default profile and adds siblings with separate progress', async () => {
    const d = new AppDB('t6');
    const old = await ensureProfile(d);
    await setTrackLevels(old.id, { add10: 3 }, [], d);
    await addStars(old.id, 7, d);

    const kid = await createProfile('  Riya ', '🐼', d);
    expect(kid.nickname).toBe('Riya');
    expect(kid.id).not.toBe(old.id);
    expect((await listProfiles(d)).map((p) => p.id).sort()).toEqual([old.id, kid.id].sort());

    // Separate track levels, stars, stickers and placement per child.
    expect((await getSkillState(kid.id, 'add10', d)).level).toBe(0);
    expect((await getSkillState(old.id, 'add10', d)).level).toBe(3);
    expect(await addStars(kid.id, 2, d)).toBe(2);
    expect((await getProfile(old.id, d))?.stars).toBe(7);
    await setPlaced(kid.id, 'math', true, d);
    expect((await getProfile(old.id, d))?.placed?.math).toBeUndefined();
    await addSticker(kid.id, 'animals-puppy', d);
    expect((await getProfile(old.id, d))?.stickers).toBeUndefined();
  });

  it('defaults the nickname, de-duplicates, and orders by last played', async () => {
    const d = new AppDB('t7');
    const a = await createProfile('', '🦁', d);
    const b = await createProfile('lion', '🐯', d);
    expect(a.nickname).toBe('Lion');
    expect(b.nickname).toBe('lion 2');
    await touchProfile(b.id, d);
    expect((await listProfiles(d))[0].id).toBe(b.id);
  });

  it(`caps at ${MAX_PROFILES} profiles`, async () => {
    const d = new AppDB('t8');
    for (let i = 0; i < MAX_PROFILES; i++) await createProfile(`Kid ${i}`, '🦊', d);
    await expect(createProfile('One more', '🦊', d)).rejects.toThrow();
    expect(await d.profiles.count()).toBe(MAX_PROFILES);
  });
});
