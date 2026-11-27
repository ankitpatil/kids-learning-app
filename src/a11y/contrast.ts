/** WCAG 2.x contrast helpers (pure, no DOM) — used by tests to keep the palette readable. */

export type Rgb = [number, number, number]

/** Parse #rgb, #rrggbb (alpha forms are rejected: contrast over an unknown backdrop is undefined). */
export function parseHex(hex: string): Rgb {
  const h = hex.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(h)) return [0, 1, 2].map((i) => parseInt(h[i] + h[i], 16)) as Rgb
  if (/^[0-9a-f]{6}$/i.test(h)) return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb
  throw new Error(`not an opaque hex colour: ${hex}`)
}

/** Relative luminance (0 = black, 1 = white). */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Contrast ratio between two colours, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** AA minimums: 4.5 for body text, 3 for large text (≥ 24px, or ≥ 18.66px bold) and UI parts like focus rings. */
export const AA_TEXT = 4.5
export const AA_LARGE = 3
