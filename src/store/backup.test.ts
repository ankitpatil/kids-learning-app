import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { AppDB, createProfile, ensureProfile, logAttempt, saveSkillState, addStars, getSkillStates, listAttempts, listProfiles, type Attempt } from './db';
import { newSkillState } from '../engine/adaptive';
import { backupFileName, exportProgress, importProgress, makeBackup, parseBackup, summarizeBackup, BACKUP_VERSION } from './backup';
import { MAX_PROFILES } from '../engine/profiles';

let n = 0;
const fresh = () => new AppDB(`backup-${++n}`);
const att = (profileId: string, itemId: string, at: number, correct = true): Attempt => ({
  profileId, skillId: 'count', itemId, level: 1, correct, hintUsed: false, timeMs: 1200, at, mix: 'current',
});

async function seed(d: AppDB) {
  const p = await ensureProfile(d);
  await addStars(p.id, 7, d);
  await logAttempt(att(p.id, 'count-3', 10), d);
  await logAttempt(att(p.id, 'count-4', 20, false), d);
  await saveSkillState({ ...newSkillState(p.id, 'count', 2), mastery: 0.6 }, d);
  return p;
}

describe('backup export / import', () => {
  it('round-trips a device into an empty device', async () => {
    const a = fresh();
    const p = await seed(a);
    const text = JSON.stringify(await exportProgress(a, 1000));
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.attempts.every((x) => x.id === undefined)).toBe(true);

    const b = fresh();
    await importProgress(parsed.backup, b);
    expect((await listProfiles(b)).map((x) => [x.id, x.stars])).toEqual([[p.id, 7]]);
    expect((await listAttempts(p.id, 0, b)).map((x) => [x.itemId, x.correct])).toEqual([['count-3', true], ['count-4', false]]);
    const st = await getSkillStates(p.id, b);
    expect(st.count.level).toBe(2);
    expect(st.count.mastery).toBe(0.6);
  });

  it('replaces the same child but keeps other children on the device', async () => {
    const a = fresh();
    const p = await seed(a);
    const backup = await exportProgress(a);

    const b = fresh();
    const mine = await ensureProfile(b); // same 'default' id as the backup's child
    await logAttempt(att(mine.id, 'count-9', 5), b);
    await saveSkillState(newSkillState(mine.id, 'count', 6), b);
    const other = await createProfile('Ravi', '🐯', b);
    await logAttempt(att(other.id, 'count-1', 6), b);

    await importProgress(backup, b);
    expect((await listAttempts(p.id, 0, b)).map((x) => x.itemId)).toEqual(['count-3', 'count-4']);
    expect((await getSkillStates(p.id, b)).count.level).toBe(2);
    expect((await listAttempts(other.id, 0, b)).map((x) => x.itemId)).toEqual(['count-1']);
    expect((await listProfiles(b)).length).toBe(2);
  });

  it('restoring twice does not duplicate answers', async () => {
    const a = fresh();
    const p = await seed(a);
    const backup = await exportProgress(a);
    const b = fresh();
    await importProgress(backup, b);
    await importProgress(backup, b);
    expect((await listAttempts(p.id, 0, b)).length).toBe(2);
  });

  it('refuses (and changes nothing) when the device would have too many children', async () => {
    const b = fresh();
    for (let i = 0; i < MAX_PROFILES; i++) await createProfile(`Kid${i}`, '🐼', b);
    const backup = makeBackup({ profiles: [{ id: 'new-kid', nickname: 'Asha', avatar: '🦊', stars: 1, createdAt: 1 }], attempts: [att('new-kid', 'count-2', 1)], skillStates: [] });
    expect(summarizeBackup(backup, (await listProfiles(b)).map((p) => p.id)).tooMany).toBe(true);
    await expect(importProgress(backup, b)).rejects.toThrow();
    expect((await listProfiles(b)).length).toBe(MAX_PROFILES);
    expect(await b.attempts.count()).toBe(0);
  });
});

describe('parseBackup', () => {
  const good = () => makeBackup({
    profiles: [{ id: 'k1', nickname: 'Asha', avatar: '🦊', stars: 3, createdAt: 1, placed: { math: true }, stickers: { 'animals-puppy': 2 } }],
    attempts: [att('k1', 'count-3', 1)],
    skillStates: [newSkillState('k1', 'count', 1)],
  });

  it('accepts a good file', () => {
    const r = parseBackup(JSON.stringify(good()));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.backup.profiles[0].stickers).toEqual({ 'animals-puppy': 2 });
      expect(r.backup.profiles[0].placed).toEqual({ math: true });
    }
  });

  it('gives a gentle reason for files it cannot use', () => {
    expect(parseBackup('not json')).toMatchObject({ ok: false });
    expect(parseBackup('{"hello":1}')).toMatchObject({ ok: false, why: expect.stringMatching(/not a Little Learners backup/) });
    expect(parseBackup(JSON.stringify({ ...good(), version: BACKUP_VERSION + 1 }))).toMatchObject({ ok: false, why: expect.stringMatching(/newer version/) });
    expect(parseBackup(JSON.stringify({ ...good(), profiles: [] }))).toMatchObject({ ok: false, why: expect.stringMatching(/no children/) });
    expect(parseBackup(JSON.stringify({ ...good(), attempts: 'x' }))).toMatchObject({ ok: false, why: expect.stringMatching(/damaged/) });
  });

  it('drops bad rows and rows for children not in the file, clamps numbers', () => {
    const b = good();
    const raw = {
      ...b,
      attempts: [...b.attempts, { ...b.attempts[0], correct: 'yes' }, att('stranger', 'count-1', 1), { ...b.attempts[0], mix: 'weird' }],
      skillStates: [...b.skillStates, { ...newSkillState('k1', 'add10'), mastery: 5, level: -2 }, newSkillState('stranger', 'count')],
    };
    const r = parseBackup(JSON.stringify(raw));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.attempts.length).toBe(2);
    expect(r.backup.attempts[1].mix).toBeUndefined();
    expect(r.backup.skillStates.map((s) => [s.skillId, s.mastery, s.level])).toEqual([['count', newSkillState('k1', 'count', 1).mastery, 1], ['add10', 1, 0]]);
  });

  it('only carries progress fields (no stray data)', () => {
    const raw = { ...good(), aiSettings: { passcode: 'secret' }, profiles: [{ ...good().profiles[0], passcode: 'secret' }] };
    const r = parseBackup(JSON.stringify(raw));
    expect(JSON.stringify(r)).not.toContain('secret');
  });

  it('summarises who is in the file', () => {
    const s = summarizeBackup(good(), ['k1', 'other']);
    expect(s.children).toEqual([{ nickname: 'Asha', avatar: '🦊', stars: 3, answers: 1, onDevice: true }]);
    expect(s.keptOnDevice).toBe(1);
    expect(s.tooMany).toBe(false);
  });

  it('names the file by local date', () => {
    expect(backupFileName(new Date(2026, 10, 4, 9).getTime())).toBe('little-learners-backup-2026-11-04.json');
  });
});
