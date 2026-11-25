// Export / import progress as a JSON file (#26). The file stays with the grown-up: nothing is sent anywhere.
// Only progress is included (profiles, answers, track levels) — never device settings (AI proxy passcode,
// voice, Move mode) or cached Claude stories.
import type { SkillState } from '../engine/adaptive';
import { MAX_PROFILES } from '../engine/profiles';
import { db, type AppDB, type Attempt, type Profile } from './db';

export const BACKUP_APP = 'little-learners';
export const BACKUP_KIND = 'progress-backup';
export const BACKUP_VERSION = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  kind: typeof BACKUP_KIND;
  version: number;
  exportedAt: number;
  profiles: Profile[];
  attempts: Attempt[];
  skillStates: SkillState[];
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; why: string };

export function makeBackup(data: { profiles: Profile[]; attempts: Attempt[]; skillStates: SkillState[] }, now = Date.now()): Backup {
  return {
    app: BACKUP_APP,
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: now,
    profiles: data.profiles,
    // Local row ids mean nothing on another device.
    attempts: data.attempts.map(({ id: _id, ...a }) => a),
    skillStates: data.skillStates,
  };
}

/** `little-learners-backup-2026-11-24.json` (local date). */
export function backupFileName(now = Date.now()): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${BACKUP_APP}-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const MIXES = ['current', 'review', 'stretch', 'spaced'];

function cleanProfile(v: unknown): Profile | null {
  if (!isObj(v) || !isStr(v.id) || typeof v.nickname !== 'string' || typeof v.avatar !== 'string') return null;
  if (!isNum(v.stars) || v.stars < 0 || !isNum(v.createdAt)) return null;
  const p: Profile = { id: v.id, nickname: v.nickname.slice(0, 40), avatar: v.avatar.slice(0, 40), stars: Math.floor(v.stars), createdAt: v.createdAt };
  if (isObj(v.placed)) {
    const placed: Profile['placed'] = {};
    if (v.placed.math === true || v.placed.math === false) placed.math = v.placed.math;
    if (v.placed.reading === true || v.placed.reading === false) placed.reading = v.placed.reading;
    p.placed = placed;
  }
  if (isObj(v.stickers)) {
    const st: Record<string, number> = {};
    for (const [k, n] of Object.entries(v.stickers)) if (isStr(k) && isNum(n) && n > 0) st[k] = Math.floor(n);
    p.stickers = st;
  }
  if (isNum(v.lastPlayedAt)) p.lastPlayedAt = v.lastPlayedAt;
  return p;
}

function cleanAttempt(v: unknown): Attempt | null {
  if (!isObj(v) || !isStr(v.profileId) || !isStr(v.skillId) || !isStr(v.itemId)) return null;
  if (!isNum(v.level) || !isBool(v.correct) || !isBool(v.hintUsed) || !isNum(v.timeMs) || !isNum(v.at)) return null;
  const a: Attempt = { profileId: v.profileId, skillId: v.skillId, itemId: v.itemId, level: v.level, correct: v.correct, hintUsed: v.hintUsed, timeMs: v.timeMs, at: v.at };
  if (typeof v.mix === 'string' && MIXES.includes(v.mix)) a.mix = v.mix as Attempt['mix'];
  return a;
}

function cleanSkillState(v: unknown): SkillState | null {
  if (!isObj(v) || !isStr(v.profileId) || !isStr(v.skillId)) return null;
  if (!isNum(v.mastery) || !isNum(v.level) || !isNum(v.attemptsAtLevel) || !isNum(v.missStreak)) return null;
  return {
    profileId: v.profileId,
    skillId: v.skillId,
    mastery: Math.min(1, Math.max(0, v.mastery)),
    level: Math.max(0, Math.floor(v.level)),
    attemptsAtLevel: Math.max(0, Math.floor(v.attemptsAtLevel)),
    missStreak: Math.max(0, Math.floor(v.missStreak)),
  };
}

/** Check a backup file's text. Bad rows are dropped; answers/levels for children not in the file are dropped. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, why: 'This is not a backup file (it is not JSON).' };
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP || raw.kind !== BACKUP_KIND) return { ok: false, why: 'This is not a Little Learners backup file.' };
  if (!isNum(raw.version) || raw.version > BACKUP_VERSION) return { ok: false, why: 'This backup is from a newer version of the app. Update the app and try again.' };
  if (!Array.isArray(raw.profiles) || !Array.isArray(raw.attempts) || !Array.isArray(raw.skillStates)) return { ok: false, why: 'This backup file is damaged.' };

  const byId = new Map<string, Profile>();
  for (const p of raw.profiles.map(cleanProfile)) if (p && !byId.has(p.id)) byId.set(p.id, p);
  const profiles = [...byId.values()];
  if (profiles.length === 0) return { ok: false, why: 'This backup has no children in it.' };
  if (profiles.length > MAX_PROFILES) return { ok: false, why: `This backup has more than ${MAX_PROFILES} children.` };

  const known = (id: string) => byId.has(id);
  const attempts = raw.attempts.map(cleanAttempt).filter((a): a is Attempt => !!a && known(a.profileId));
  const states = new Map<string, SkillState>();
  for (const s of raw.skillStates.map(cleanSkillState)) if (s && known(s.profileId)) states.set(`${s.profileId}|${s.skillId}`, s);

  return {
    ok: true,
    backup: { app: BACKUP_APP, kind: BACKUP_KIND, version: raw.version, exportedAt: isNum(raw.exportedAt) ? raw.exportedAt : 0, profiles, attempts, skillStates: [...states.values()] },
  };
}

export interface BackupSummary {
  children: { nickname: string; avatar: string; stars: number; answers: number; onDevice: boolean }[];
  /** Children on this device but not in the file — they are kept as they are. */
  keptOnDevice: number;
  /** Restoring would leave more than MAX_PROFILES children on this device. */
  tooMany: boolean;
}

export function summarizeBackup(b: Backup, deviceProfileIds: readonly string[]): BackupSummary {
  const onDevice = new Set(deviceProfileIds);
  const inFile = new Set(b.profiles.map((p) => p.id));
  const keptOnDevice = deviceProfileIds.filter((id) => !inFile.has(id)).length;
  return {
    children: b.profiles.map((p) => ({
      nickname: p.nickname,
      avatar: p.avatar,
      stars: p.stars,
      answers: b.attempts.filter((a) => a.profileId === p.id).length,
      onDevice: onDevice.has(p.id),
    })),
    keptOnDevice,
    tooMany: keptOnDevice + b.profiles.length > MAX_PROFILES,
  };
}

/** Everything needed for a backup, read from this device. */
export async function exportProgress(d: AppDB = db, now = Date.now()): Promise<Backup> {
  const [profiles, attempts, skillStates] = await Promise.all([d.profiles.toArray(), d.attempts.orderBy('at').toArray(), d.skillStates.toArray()]);
  return makeBackup({ profiles, attempts, skillStates }, now);
}

/**
 * Restore: each child in the file replaces that same child on this device (answers and levels included).
 * Other children on this device are left alone. All or nothing (one transaction).
 */
export async function importProgress(b: Backup, d: AppDB = db): Promise<void> {
  const ids = b.profiles.map((p) => p.id);
  await d.transaction('rw', d.profiles, d.attempts, d.skillStates, async () => {
    const others = (await d.profiles.toArray()).filter((p) => !ids.includes(p.id));
    if (others.length + ids.length > MAX_PROFILES) throw new Error(`At most ${MAX_PROFILES} children on one device`);
    await d.attempts.where('profileId').anyOf(ids).delete();
    await d.skillStates.where('profileId').anyOf(ids).delete();
    await d.profiles.bulkPut(b.profiles);
    await d.attempts.bulkAdd(b.attempts.map(({ id: _id, ...a }) => a));
    await d.skillStates.bulkPut(b.skillStates);
  });
}
