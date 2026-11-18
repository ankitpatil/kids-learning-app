import { describe, expect, it } from 'vitest';
import { findEmoji, emojiKey as scanKey } from '../../scripts/emojiScan.mjs';
import { EMOJI_ICON, NO_ICON } from './iconMap.gen';
import { emojiKey, hasIcon, iconForEmoji, iconUrl, splitIcons } from './icons';

// App source as text (no tests, no generated map) and the bundled SVGs, via Vite's glob.
const SOURCES = import.meta.glob(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}', '!/src/**/*.gen.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const SVGS = import.meta.glob('/public/icons/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const bundled = new Set(Object.keys(SVGS).map((p) => p.replace('/public/icons/', '').replace('.svg', '')));

describe('bundled icons', () => {
  const used = new Set<string>();
  for (const text of Object.values(SOURCES)) for (const e of findEmoji(text)) used.add(scanKey(e));

  it('scans a real amount of source', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(30);
    expect(used.size).toBeGreaterThan(100);
  });

  it('the generated map is up to date with the emoji the app uses (run `npm run icons` if not)', () => {
    const mapped = new Set([...Object.keys(EMOJI_ICON), ...NO_ICON]);
    expect([...used].filter((e) => !mapped.has(e))).toEqual([]);
    expect([...mapped].filter((e) => !used.has(e))).toEqual([]);
  });

  it('every icon name in the map resolves to a bundled SVG, and no extra files ship', () => {
    const names = new Set(Object.values(EMOJI_ICON));
    expect([...names].filter((n) => !bundled.has(n))).toEqual([]);
    expect([...bundled].filter((n) => !names.has(n))).toEqual([]);
  });

  it('almost every emoji has an icon (few system-emoji fallbacks)', () => {
    expect(NO_ICON.length).toBeLessThanOrEqual(5);
  });

  it('bundled SVGs are small, self-contained SVGs', () => {
    let total = 0;
    for (const [p, svg] of Object.entries(SVGS)) {
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'), p).toBe(true);
      expect(svg).not.toMatch(/<script|href="http/i);
      total += svg.length;
    }
    expect(total).toBeLessThan(2 * 1024 * 1024);
  });
});

describe('icon lookup', () => {
  it('finds the picture with or without the emoji variation selector', () => {
    expect(iconForEmoji('🐱')).toBe(EMOJI_ICON['🐱']);
    expect(iconForEmoji('☀️')).toBeDefined();
    expect(iconForEmoji('☀️')).toBe(iconForEmoji('☀'));
    expect(emojiKey('☀️')).toBe('☀');
  });

  it('unknown names fall back', () => {
    expect(iconForEmoji('a')).toBeUndefined();
    expect(hasIcon('no-such-icon')).toBe(false);
    expect(hasIcon(EMOJI_ICON['🐱'])).toBe(true);
  });

  it('builds the URL under the app base', () => {
    expect(iconUrl('cat-face', './')).toBe('./icons/cat-face.svg');
  });

  it('splits text into icons and plain text', () => {
    const pieces = splitIcons('more 🍪🍪');
    expect(pieces).toEqual([
      { text: 'more ' },
      { icon: EMOJI_ICON['🍪'], emoji: '🍪' },
      { icon: EMOJI_ICON['🍪'], emoji: '🍪' },
    ]);
    expect(splitIcons('12')).toEqual([{ text: '12' }]);
    // keycap and ZWJ sequences stay whole
    expect(splitIcons('🔟')).toHaveLength(1);
  });
});
