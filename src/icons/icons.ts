// Bundled Fluent Emoji icons (I1): look-alike pictures on every device instead of system emoji.
import { EMOJI_ICON } from './iconMap.gen';

export function emojiKey(e: string): string {
  return e.replace(/️/g, '');
}

/** Fluent icon name for an emoji, or undefined (render the emoji as text). */
export function iconForEmoji(e: string): string | undefined {
  return EMOJI_ICON[emojiKey(e)];
}

const NAMES = new Set(Object.values(EMOJI_ICON));
export function hasIcon(name: string): boolean {
  return NAMES.has(name);
}

export function iconUrl(name: string, base: string = import.meta.env?.BASE_URL ?? './'): string {
  return `${base}icons/${name}.svg`;
}

// Intl.Segmenter keeps ZWJ / keycap emoji whole (ES2022 lib, so typed loosely here).
type Segmenter = { segment(s: string): Iterable<{ segment: string }> };
const SegmenterCtor = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => Segmenter }).Segmenter;
const SEGMENTER = SegmenterCtor ? new SegmenterCtor(undefined, { granularity: 'grapheme' }) : undefined;

/** Split text into pieces: icon names for emoji with a bundled icon, plain text otherwise. */
export type IconPiece = { icon: string; emoji: string } | { text: string };
export function splitIcons(text: string): IconPiece[] {
  const graphemes = SEGMENTER ? [...SEGMENTER.segment(text)].map((s) => s.segment) : [...text];
  const out: IconPiece[] = [];
  for (const g of graphemes) {
    const icon = iconForEmoji(g);
    if (icon) out.push({ icon, emoji: g });
    else {
      const last = out[out.length - 1];
      if (last && 'text' in last) last.text += g;
      else out.push({ text: g });
    }
  }
  return out;
}
