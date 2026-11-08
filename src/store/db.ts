import Dexie, { type Table } from 'dexie';
import { newSkillState, type SkillState } from '../engine/adaptive';

export interface Profile {
  id: string;
  nickname: string;
  avatar: string;
  stars: number;
  createdAt: number;
}

export interface Attempt {
  id?: number;
  profileId: string;
  skillId: string;
  itemId: string;
  level: number;
  correct: boolean;
  hintUsed: boolean;
  timeMs: number;
  at: number;
}

export class AppDB extends Dexie {
  profiles!: Table<Profile, string>;
  attempts!: Table<Attempt, number>;
  skillStates!: Table<SkillState, [string, string]>;

  constructor(name = 'little-learners') {
    super(name);
    this.version(1).stores({
      profiles: 'id',
      attempts: '++id, profileId, skillId, at, [profileId+skillId]',
      skillStates: '[profileId+skillId], profileId',
    });
  }
}

export const db = new AppDB();

export const DEFAULT_PROFILE_ID = 'default';

// In-memory fallback for browsers/frames where IndexedDB is unavailable (private mode, sandboxed previews).
const mem = { profiles: new Map<string, Profile>(), states: new Map<string, SkillState>() };
async function safe<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.warn('IndexedDB unavailable, using memory', e);
    return fallback();
  }
}

function memProfile(): Profile {
  let p = mem.profiles.get(DEFAULT_PROFILE_ID);
  if (!p) {
    p = { id: DEFAULT_PROFILE_ID, nickname: 'Explorer', avatar: '🦊', stars: 0, createdAt: Date.now() };
    mem.profiles.set(p.id, p);
  }
  return p;
}

export function ensureProfile(d: AppDB = db): Promise<Profile> {
  return safe(() => ensureProfileDb(d), memProfile);
}

async function ensureProfileDb(d: AppDB): Promise<Profile> {
  const existing = await d.profiles.get(DEFAULT_PROFILE_ID);
  if (existing) return existing;
  const p: Profile = { id: DEFAULT_PROFILE_ID, nickname: 'Explorer', avatar: '🦊', stars: 0, createdAt: Date.now() };
  await d.profiles.put(p);
  return p;
}

export function getSkillState(profileId: string, skillId: string, d: AppDB = db): Promise<SkillState> {
  return safe(
    async () => (await d.skillStates.get([profileId, skillId])) ?? newSkillState(profileId, skillId),
    () => mem.states.get(`${profileId}|${skillId}`) ?? newSkillState(profileId, skillId),
  );
}

export function saveSkillState(s: SkillState, d: AppDB = db): Promise<void> {
  mem.states.set(`${s.profileId}|${s.skillId}`, s);
  return safe(async () => void (await d.skillStates.put(s)), () => undefined);
}

export function logAttempt(a: Attempt, d: AppDB = db): Promise<void> {
  return safe(async () => void (await d.attempts.add(a)), () => undefined);
}

export function addStars(profileId: string, n: number, d: AppDB = db): Promise<number> {
  return safe(
    () => addStarsDb(profileId, n, d),
    () => {
      const p = memProfile();
      p.stars += n;
      return p.stars;
    },
  );
}

async function addStarsDb(profileId: string, n: number, d: AppDB): Promise<number> {
  let total = 0;
  await d.transaction('rw', d.profiles, async () => {
    const p = await d.profiles.get(profileId);
    if (!p) return;
    total = p.stars + n;
    await d.profiles.update(profileId, { stars: total });
  });
  return total;
}

/** Ask the browser not to evict our data (Safari clears non-persistent storage after ~7 days idle). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* ignore */
  }
  return false;
}
