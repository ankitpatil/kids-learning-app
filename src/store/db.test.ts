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
