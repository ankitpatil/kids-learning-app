// Remembers recently shown examples per track so they don't repeat within a round or across
// nearby rounds. When a track's pool is small, we fall back to the least-recently-shown item.
const MAX_RECENT = 16;
const MIN_GAP = 2;
const mem = new Map<string, string[]>();

function load(track: string): string[] {
  let list = mem.get(track);
  if (!list) {
    try {
      list = JSON.parse(localStorage.getItem(`recent:${track}`) ?? '[]') as string[];
    } catch {
      list = [];
    }
    mem.set(track, list);
  }
  return list;
}

export function remember(track: string, key: string) {
  const list = load(track).filter((k) => k !== key);
  list.push(key);
  while (list.length > MAX_RECENT) list.shift();
  mem.set(track, list);
  try {
    localStorage.setItem(`recent:${track}`, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

/** Generate until we get an example not shown recently; otherwise the least-recently-shown candidate. */
export function fresh<T>(track: string, make: () => T, key: (t: T) => string, tries = 40): T {
  const recent = load(track);
  let oldest: T | undefined;
  let oldestAge = -1;
  let okay: T | undefined; // first random candidate not shown in the last MIN_GAP items
  for (let i = 0; i < tries; i++) {
    const c = make();
    const k = key(c);
    const idx = recent.lastIndexOf(k);
    if (idx < 0) {
      remember(track, k);
      return c;
    }
    const age = recent.length - idx; // larger = shown longer ago
    if (okay === undefined && age > MIN_GAP) okay = c;
    if (age > oldestAge) {
      oldest = c;
      oldestAge = age;
    }
  }
  // Small pools: pick randomly among items not seen very recently (avoids a predictable a-b-c-a-b-c cycle).
  const pick = (okay ?? oldest) as T;
  remember(track, key(pick));
  return pick;
}

export function resetRecent() {
  mem.clear();
}
