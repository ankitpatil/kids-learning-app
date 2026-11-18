// Finds every emoji in the app's source (shared by build-icons.mjs and its freshness test).
import fs from 'node:fs';
import path from 'node:path';

// An emoji: pictographic + optional VS16 / skin tone / ZWJ sequence, flags, keycaps.
const EMOJI_RE =
  /\p{Extended_Pictographic}(?:️|[\u{1F3FB}-\u{1F3FF}])?(?:‍\p{Extended_Pictographic}(?:️|[\u{1F3FB}-\u{1F3FF}])?)*|[\u{1F1E6}-\u{1F1FF}]{2}|[0-9#*]️?⃣/gu;

/** Lookup key for an emoji: the same picture with or without U+FE0F maps to one key. */
export function emojiKey(e) {
  return e.replace(/️/g, '');
}

export function findEmoji(text) {
  return text.match(EMOJI_RE) ?? [];
}

/** Map of emoji key -> files using it, for every non-test .ts/.tsx under dir. */
export function scanEmoji(dir) {
  const found = new Map();
  const walk = (d) => {
    for (const f of fs.readdirSync(d).sort()) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.endsWith('.gen.ts')) {
        for (const e of findEmoji(fs.readFileSync(p, 'utf8'))) {
          const k = emojiKey(e);
          if (!found.has(k)) found.set(k, new Set());
          found.get(k).add(path.relative(dir, p));
        }
      }
    }
  };
  walk(dir);
  return found;
}
