import { describe, expect, it } from 'vitest';
import { findEmoji, emojiKey as scanKey } from '../../scripts/emojiScan.mjs';
import { EMOJI_ICON, ICON_EMOJI, NO_ICON } from './iconMap.gen';
import { emojiKey, hasIcon, iconEmoji, iconForEmoji, iconUrl, splitIcons } from './icons';
import { contentIconNames, contentIconSources } from './contentIcons';
import { WORDS, MAGIC_E, SENTENCES } from '../content/words';
import { ENDING_VERBS, ENDING_NOUNS } from '../content/endings';
import { LETTERS } from '../games/phonicsPop/letters';
import { makeQuickItem } from '../engine/quickItems';
import { makePopItem } from '../games/popAnswer/generator';

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
    expect(used.size).toBeGreaterThan(50);
  });

  it('the generated map is up to date with the emoji the app uses (run `npm run icons` if not)', () => {
    const mapped = new Set([...Object.keys(EMOJI_ICON), ...NO_ICON]);
    expect([...used].filter((e) => !mapped.has(e))).toEqual([]);
    expect([...mapped].filter((e) => !used.has(e))).toEqual([]);
  });

  it('the generated map is up to date with the icon names content uses (run `npm run icons` if not)', () => {
    const want = new Set([...Object.values(EMOJI_ICON), ...contentIconNames()]);
    expect([...want].filter((n) => !(n in ICON_EMOJI))).toEqual([]);
    expect(Object.keys(ICON_EMOJI).filter((n) => !want.has(n))).toEqual([]);
  });

  it('every icon name used in content resolves to a bundled file', () => {
    for (const [source, names] of Object.entries(contentIconSources())) {
      expect(names.length, source).toBeGreaterThan(0);
      expect(names.filter((n) => !bundled.has(n) || !hasIcon(n)), source).toEqual([]);
    }
    // content refers to names, not raw emoji
    expect(contentIconNames().filter((n) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(n))).toEqual([]);
    expect(contentIconNames().length).toBeGreaterThan(150);
  });

  it('every icon name in the map resolves to a bundled SVG, and no extra files ship', () => {
    const names = new Set(Object.keys(ICON_EMOJI));
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
    expect(iconForEmoji('🍪')).toBe(EMOJI_ICON['🍪']);
    expect(iconForEmoji('⚖️')).toBe('balance-scale');
    expect(iconForEmoji('⚖️')).toBe(iconForEmoji('⚖'));
    expect(emojiKey('☀️')).toBe('☀');
  });

  it('maps icon names back to emoji for fallback text', () => {
    expect(iconEmoji('cat-face')).toBe('🐱');
    expect(iconEmoji('sun')).toBe('☀️'); // BMP symbol gets VS16 so it draws as emoji
    expect(iconEmoji('cookie')).toBe('🍪');
    expect(iconEmoji('no-such-icon')).toBe('');
    // every bundled name round-trips to an emoji
    expect(Object.entries(ICON_EMOJI).filter(([, e]) => !e)).toEqual([]);
  });

  it('unknown names fall back', () => {
    expect(iconForEmoji('a')).toBeUndefined();
    expect(hasIcon('no-such-icon')).toBe(false);
    expect(hasIcon('toString')).toBe(false);
    expect(hasIcon('cat-face')).toBe(true);
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

// I2: OpenMoji extras (`om-<name>`, CC BY-SA 4.0) next to Fluent, and every picture word has a picture.
const DOCS = import.meta.glob(['/CREDITS.md', '/README.md', '/src/screens/Settings.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('OpenMoji pictures (I2)', () => {
  const om = Object.keys(ICON_EMOJI).filter((n) => n.startsWith('om-'));

  it('content uses some OpenMoji pictures, each bundled as an OpenMoji SVG with a fallback emoji', () => {
    expect(om.length).toBeGreaterThan(0);
    for (const n of om) {
      expect(SVGS[`/public/icons/${n}.svg`], n).toMatch(/viewBox="0 0 72 72"/);
      expect(iconEmoji(n), n).not.toBe('');
    }
    // OpenMoji extras (Private Use Area) never leak as fallback text
    for (const e of Object.values(ICON_EMOJI)) expect([...e].some((c) => c.codePointAt(0)! >= 0xe000 && c.codePointAt(0)! <= 0xf8ff)).toBe(false);
  });

  it('OpenMoji is credited (CC BY-SA 4.0) in CREDITS.md, the README and the Grown-ups screen', () => {
    for (const f of ['/CREDITS.md', '/README.md', '/src/screens/Settings.tsx']) {
      expect(DOCS[f], f).toMatch(/OpenMoji/);
      expect(DOCS[f], f).toMatch(/CC BY-SA 4\.0/);
    }
  });
});

describe('every word in content has a picture (I2)', () => {
  const checks: [string, string][] = [
    ...Object.values(WORDS).flat().map((w) => [w.word, w.icon] as [string, string]),
    ...MAGIC_E.flatMap((p) => [[p.short, p.shortIcon], [p.long, p.longIcon]] as [string, string][]),
    ...SENTENCES.map((s) => [s.text, s.icon] as [string, string]),
    ...[...ENDING_VERBS, ...ENDING_NOUNS].map((e) => [e.base, e.icon] as [string, string]),
    ...Object.values(LETTERS).map((l) => [l.word, l.icon] as [string, string]),
  ];

  it('each word / sentence names a bundled icon', () => {
    expect(checks.length).toBeGreaterThan(100);
    expect(checks.filter(([, icon]) => !icon || !hasIcon(icon) || !bundled.has(icon)).map(([w]) => w)).toEqual([]);
  });

  it('words new with OpenMoji pictures are in the lists', () => {
    const words = new Set(Object.values(WORDS).flat().map((w) => w.word));
    for (const w of ['jug', 'bin', 'lamp']) expect(words.has(w), w).toBe(true);
  });

  it('picture quick items (Placement, Pop the Answer) carry the icon name, not just emoji text', () => {
    let rng = 1;
    const r = () => ((rng = (rng * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 40; i++) {
      const q = makeQuickItem('cvc', 0, r);
      expect(q.icon && hasIcon(q.icon)).toBe(true);
      expect(q.visual).toBe(iconEmoji(q.icon!));
      const p = makePopItem('phonics', 0, r);
      expect(p.icon && hasIcon(p.icon)).toBe(true);
    }
  });
});
