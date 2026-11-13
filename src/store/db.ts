import Dexie, { type Table } from 'dexie';
import { newSkillState, type SkillState } from '../engine/adaptive';
import type { Subject } from '../engine/tracks';
import { resolveNickname, sortProfiles, MAX_PROFILES } from '../engine/profiles';
import type { Story } from '../content/stories';

export interface Profile {
  id: string;
  nickname: string;
  avatar: string;
  stars: number;
  createdAt: number;
  /** Subjects whose placement / starting point has been set. */
  placed?: Partial<Record<Subject, boolean>>;
  /** Sticker id → how many collected. */
  stickers?: Record<string, number>;
  /** Last time this child was picked / played (orders the profile picker). */
  lastPlayedAt?: number;
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
  /** Round-mix slot (absent on older attempts = current). */
  mix?: 'current' | 'review' | 'stretch';
}

/** A Claude story that passed every check (AI2). Content only: no profile id, nothing about the child. */
export interface CachedStory {
  id: string;
  topic: string;
  story: Story;
  createdAt: number;
}

export class AppDB extends Dexie {
  profiles!: Table<Profile, string>;
  attempts!: Table<Attempt, number>;
  skillStates!: Table<SkillState, [string, string]>;
  aiStories!: Table<CachedStory, string>;

  constructor(name = 'little-learners') {
    super(name);
    this.version(1).stores({
      profiles: 'id',
      attempts: '++id, profileId, skillId, at, [profileId+skillId]',
      skillStates: '[profileId+skillId], profileId',
    });
    this.version(2).stores({ aiStories: 'id, createdAt' });
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

function memProfile(id: string = DEFAULT_PROFILE_ID): Profile {
  let p = mem.profiles.get(id);
  if (!p) {
    p = { id, nickname: 'Explorer', avatar: '🦊', stars: 0, createdAt: Date.now() };
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
      const p = memProfile(profileId);
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

/** Set starting levels for many tracks at once (placement / parent preset). Resets mastery for those tracks. */
export function setTrackLevels(profileId: string, levels: Record<string, number>, mastered: string[] = [], d: AppDB = db): Promise<void> {
  const states = Object.entries(levels).map(([skillId, level]) => ({
    ...newSkillState(profileId, skillId, level),
    ...(mastered.includes(skillId) ? { mastery: 0.95 } : {}),
  }));
  states.forEach((st) => mem.states.set(`${profileId}|${st.skillId}`, st));
  return safe(async () => void (await d.skillStates.bulkPut(states)), () => undefined);
}

export function setPlaced(profileId: string, subject: Subject, placed: boolean, d: AppDB = db): Promise<Profile> {
  const apply = (p: Profile): Profile => ({ ...p, placed: { ...(p.placed ?? {}), [subject]: placed } });
  return safe(
    async () => {
      const p = (await d.profiles.get(profileId)) ?? (await ensureProfileDb(d));
      const next = apply(p);
      await d.profiles.put(next);
      return next;
    },
    () => {
      const next = apply(memProfile(profileId));
      mem.profiles.set(next.id, next);
      return next;
    },
  );
}

export function getSkillStates(profileId: string, d: AppDB = db): Promise<Record<string, SkillState>> {
  const toMap = (arr: SkillState[]) => Object.fromEntries(arr.map((s) => [s.skillId, s]));
  return safe(
    async () => toMap(await d.skillStates.where('profileId').equals(profileId).toArray()),
    () => toMap([...mem.states.values()].filter((s) => s.profileId === profileId)),
  );
}

export function addSticker(profileId: string, stickerId: string, d: AppDB = db): Promise<Profile> {
  const apply = (p: Profile): Profile => ({ ...p, stickers: { ...(p.stickers ?? {}), [stickerId]: (p.stickers?.[stickerId] ?? 0) + 1 } });
  return safe(
    async () => {
      const p = (await d.profiles.get(profileId)) ?? (await ensureProfileDb(d));
      const next = apply(p);
      await d.profiles.put(next);
      return next;
    },
    () => {
      const next = apply(memProfile(profileId));
      mem.profiles.set(next.id, next);
      return next;
    },
  );
}

// ---- Multiple children on one device -------------------------------------------------------

export function listProfiles(d: AppDB = db): Promise<Profile[]> {
  return safe(
    async () => sortProfiles(await d.profiles.toArray()),
    () => sortProfiles([...mem.profiles.values()]),
  );
}

export function getProfile(id: string, d: AppDB = db): Promise<Profile | undefined> {
  return safe(async () => d.profiles.get(id), () => mem.profiles.get(id));
}

function newProfileId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

/** Create a child profile (nickname + avatar only). Track levels start fresh; placement runs on first play. */
export async function createProfile(nickname: string, avatar: string, d: AppDB = db): Promise<Profile> {
  const existing = await listProfiles(d);
  if (existing.length >= MAX_PROFILES) throw new Error(`At most ${MAX_PROFILES} profiles`);
  const p: Profile = {
    id: newProfileId(),
    nickname: resolveNickname(nickname, avatar, existing.map((e) => e.nickname)),
    avatar,
    stars: 0,
    createdAt: Date.now(),
  };
  mem.profiles.set(p.id, p);
  await safe(async () => void (await d.profiles.put(p)), () => undefined);
  return p;
}

/** Mark a profile as just picked so it sorts first in the picker. */
export function touchProfile(id: string, d: AppDB = db): Promise<void> {
  const at = Date.now();
  const m = mem.profiles.get(id);
  if (m) mem.profiles.set(id, { ...m, lastPlayedAt: at });
  return safe(async () => void (await d.profiles.update(id, { lastPlayedAt: at })), () => undefined);
}

// ---- Claude stories cached on this device (AI2) ----------------------------------------------

/** Oldest stories are dropped beyond this many. */
export const MAX_CACHED_STORIES = 60;
const memStories = new Map<string, CachedStory>();

export function saveAiStory(story: Story, topic: string, d: AppDB = db, at: number = Date.now()): Promise<void> {
  const rec: CachedStory = { id: story.id, topic, story, createdAt: at };
  memStories.set(rec.id, rec);
  return safe(
    async () => {
      await d.transaction('rw', d.aiStories, async () => {
        await d.aiStories.put(rec);
        const n = await d.aiStories.count();
        if (n > MAX_CACHED_STORIES) {
          const old = await d.aiStories.orderBy('createdAt').limit(n - MAX_CACHED_STORIES).primaryKeys();
          await d.aiStories.bulkDelete(old);
        }
      });
    },
    () => {
      const all = [...memStories.values()].sort((a, b) => a.createdAt - b.createdAt);
      all.slice(0, Math.max(0, all.length - MAX_CACHED_STORIES)).forEach((r) => memStories.delete(r.id));
    },
  );
}

/** Newest first. */
export function listAiStories(d: AppDB = db): Promise<CachedStory[]> {
  return safe(
    async () => (await d.aiStories.orderBy('createdAt').reverse().toArray()),
    () => [...memStories.values()].sort((a, b) => b.createdAt - a.createdAt),
  );
}

export function clearAiStories(d: AppDB = db): Promise<void> {
  memStories.clear();
  return safe(async () => void (await d.aiStories.clear()), () => undefined);
}
