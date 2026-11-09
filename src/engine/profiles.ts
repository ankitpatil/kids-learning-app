// Pure helpers for child profiles: nickname + avatar emoji only (no real names, ages or photos).

export interface AvatarOption {
  emoji: string;
  /** Spoken name, also the default nickname if none is typed. */
  name: string;
}

export const AVATARS: readonly AvatarOption[] = [
  { emoji: '🦊', name: 'Fox' },
  { emoji: '🐼', name: 'Panda' },
  { emoji: '🐯', name: 'Tiger' },
  { emoji: '🦁', name: 'Lion' },
  { emoji: '🐸', name: 'Frog' },
  { emoji: '🐵', name: 'Monkey' },
  { emoji: '🐘', name: 'Elephant' },
  { emoji: '🦄', name: 'Unicorn' },
  { emoji: '🐧', name: 'Penguin' },
  { emoji: '🐢', name: 'Turtle' },
  { emoji: '🦋', name: 'Butterfly' },
  { emoji: '🐬', name: 'Dolphin' },
  { emoji: '🦖', name: 'Dino' },
  { emoji: '🐰', name: 'Bunny' },
  { emoji: '🦉', name: 'Owl' },
  { emoji: '🐙', name: 'Octopus' },
];

export const MAX_PROFILES = 6;
export const MAX_NICKNAME = 12;

/** Trim, collapse spaces, strip characters that aren't letters/numbers/space/-/', cap length. */
export function cleanNickname(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N} '\-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NICKNAME)
    .trim();
}

/** Nickname to save: cleaned input, else the avatar's name; numbered if another profile already uses it. */
export function resolveNickname(raw: string, avatar: string, taken: string[]): string {
  const base = cleanNickname(raw) || AVATARS.find((a) => a.emoji === avatar)?.name || 'Explorer';
  const used = new Set(taken.map((t) => t.toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) {
    const name = `${base.slice(0, MAX_NICKNAME - String(n).length - 1)} ${n}`;
    if (!used.has(name.toLowerCase())) return name;
  }
}

/** First avatar not already used by a profile (so a sibling gets a different animal by default). */
export function suggestAvatar(used: string[]): string {
  return (AVATARS.find((a) => !used.includes(a.emoji)) ?? AVATARS[0]).emoji;
}

export function avatarName(emoji: string): string {
  return AVATARS.find((a) => a.emoji === emoji)?.name ?? 'friend';
}

/**
 * Which profile to open at startup: the only one if there is just one child on the device;
 * with several children, null → show the picker so each child picks themselves.
 */
export function startupProfileId(ids: string[]): string | null {
  return ids.length === 1 ? ids[0] : null;
}

/** Order for the picker: most recently played first, then oldest-created. */
export function sortProfiles<T extends { createdAt: number; lastPlayedAt?: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0) || a.createdAt - b.createdAt);
}
