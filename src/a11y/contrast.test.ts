import { describe, expect, it } from 'vitest'
import { AA_LARGE, AA_TEXT, contrastRatio, luminance, parseHex } from './contrast'

// Read the stylesheet as text from disk (`?raw` imports of CSS come back empty under Vitest's css: false;
// node:fs is loaded dynamically because the app tsconfig has no Node types).
const fs = (await import(/* @vite-ignore */ 'node:fs' as string)) as { readFileSync(p: URL, enc: 'utf8'): string }
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8')

/** :root custom properties that are plain hex colours. */
function rootVars(src: string): Record<string, string> {
  const root = src.match(/:root\s*\{([^}]*)\}/)?.[1] ?? ''
  const out: Record<string, string> = {}
  for (const m of root.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,6})\b/gi)) out[m[1]] = m[2]
  return out
}
const vars = rootVars(css)

/** Hex colours a value can paint (all stops of a gradient), or null when unknown / translucent. */
function colours(value: string): string[] | null {
  const v = value.replace(/var\(--([\w-]+)\)/g, (_, n) => vars[n] ?? 'UNKNOWN')
  if (v.includes('UNKNOWN')) return null
  const hexes = [...v.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => m[0])
  if (!hexes.length || hexes.some((h) => ![4, 7].includes(h.length))) return null // none, or has alpha
  if (/\b(rgba?|hsla?|transparent)\b/.test(v)) return null
  return hexes
}

/** px size of a font-size value (rem = 16px; clamp/min use the smallest term), or null. */
function fontPx(value: string | undefined): number | null {
  if (!value) return null
  const sizes = [...value.matchAll(/([\d.]+)(rem|px)\b/g)].map((m) => +m[1] * (m[2] === 'rem' ? 16 : 1))
  return sizes.length ? Math.min(...sizes) : null
}

/** Rules whose text size comes from another rule (shared base class / parent), in px and bold. */
const INHERITED_SIZE: Record<string, { px: number; bold: boolean }> = {
  '.btn.primary': { px: 40, bold: false }, // .btn: 2.5rem
  '.cu-step': { px: 22, bold: true }, // .count-up span: 1.375rem, 900
}

/** Background-only rules whose text colour / size comes from a class they are always used with. */
const USED_WITH: Record<string, Record<string, string>> = {
  '.btn.pop-btn': { color: '#fff', 'font-size': '2.25rem', 'font-weight': '900' }, // "btn primary pop-btn", .play-next-label
  '.money.usd-1': { 'font-size': '1.05rem', 'font-weight': '900' }, // smallest coin (.money.small.coin)
}
/** In-game Dinosaur Maze targets over the camera view: labels set their own colour + shadow (see DECISIONS #30a). */
const SKIP = /^\.dino-/

type Rule = { selector: string; decls: Record<string, string> }
function rules(src: string): Rule[] {
  const body = src.replace(/\/\*[\s\S]*?\*\//g, '')
  const out: Rule[] = []
  for (const m of body.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    const decls: Record<string, string> = {}
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':')
      if (i > 0) decls[d.slice(0, i).trim()] = d.slice(i + 1).trim().replace(/\s*!important$/, '')
    }
    out.push({ selector: m[1].trim(), decls })
  }
  return out
}

describe('contrast helpers', () => {
  it('parses hex and computes WCAG ratios', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255])
    expect(parseHex('#6c5ce7')).toEqual([108, 92, 231])
    expect(() => parseHex('#0002')).toThrow()
    expect(luminance('#000')).toBe(0)
    expect(luminance('#fff')).toBeCloseTo(1)
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21)
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21) // order doesn't matter
    expect(contrastRatio('#777', '#777')).toBe(1)
  })
})

describe('app palette (styles.css)', () => {
  it('reads the theme colours', () => {
    expect(Object.keys(vars)).toEqual(expect.arrayContaining(['bg', 'ink', 'primary', 'math', 'reading']))
  })

  it('key text/background pairs meet AA', () => {
    // body text on the page; headings & big numbers in primary / math on the page and on white cards
    expect(contrastRatio(vars.ink, vars.bg)).toBeGreaterThanOrEqual(AA_TEXT)
    expect(contrastRatio(vars.primary, vars.bg)).toBeGreaterThanOrEqual(AA_TEXT)
    expect(contrastRatio(vars.primary, '#fff')).toBeGreaterThanOrEqual(AA_TEXT)
    for (const c of [vars.math, vars.reading]) {
      expect(contrastRatio(c, vars.bg)).toBeGreaterThanOrEqual(AA_LARGE)
      expect(contrastRatio('#fff', c)).toBeGreaterThanOrEqual(AA_LARGE) // big white labels on subject cards / buttons
    }
  })

  it('the focus ring is visible on the page, on white and on coloured buttons', () => {
    const ring = rules(css).find((r) => r.selector.includes(':focus-visible') && r.decls.outline)
    expect(ring, 'a :focus-visible outline rule').toBeTruthy()
    const ringColour = colours(ring!.decls.outline)![0]
    for (const bg of [vars.bg, '#fff']) expect(contrastRatio(ringColour, bg)).toBeGreaterThanOrEqual(AA_LARGE)
    const dark = rules(css).find((r) => r.selector.includes('.bedtime :focus-visible'))
    expect(dark?.decls['outline-color']).toBeTruthy()
    for (const bg of ['#2c3e73', '#4b5d9c', '#2d1b4e']) // bedtime gradient, Dino Maze
      expect(contrastRatio(dark!.decls['outline-color'], bg)).toBeGreaterThanOrEqual(AA_LARGE)
  })

  it('small grey / error text used on the page and on white cards meets AA', () => {
    for (const fg of ['#575d60', '#636e72', '#666', '#555', '#c0392b'])
      for (const bg of [vars.bg, '#fff']) expect(contrastRatio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('every rule that sets both a text colour and an opaque background is readable', () => {
    const bad: string[] = []
    const all = rules(css)
    const bySelector = new Map(all.map((r) => [r.selector, r.decls]))
    for (const rule of all) {
      const { selector } = rule
      if (SKIP.test(selector)) continue
      // A modifier that only changes the background (".word-choice.right", ".hk.hour") keeps the text colour and
      // size of its base class; a few are only ever used together with another class (#30b).
      const base = !rule.decls.color && /^(\.[\w-]+){2,}$/.test(selector) ? bySelector.get(selector.match(/^\.[\w-]+/)![0]) : undefined
      const decls = { ...(base?.color ? base : {}), ...(USED_WITH[selector] ?? {}), ...rule.decls }
      const fg = decls.color && colours(decls.color)
      const bgValue = decls.background ?? decls['background-color']
      const bg = bgValue && colours(bgValue)
      if (!fg || !bg || fg.length !== 1) continue
      const inherited = INHERITED_SIZE[selector]
      const px = inherited?.px ?? fontPx(decls['font-size'])
      const bold = inherited?.bold ?? /^(bold|[6-9]00)$/.test(decls['font-weight'] ?? '')
      // unknown size: these are mostly big kid-UI labels, but be strict unless the rule is clearly large
      const large = px !== null && (px >= 24 || (bold && px >= 18.66))
      const need = large ? AA_LARGE : AA_TEXT
      const worst = Math.min(...bg.map((b) => contrastRatio(fg[0], b)))
      if (worst < need - 0.005) bad.push(`${selector}: ${fg[0]} on ${bg.join('→')} = ${worst.toFixed(2)} (need ${need})`)
    }
    expect(bad).toEqual([])
  })
})

describe('reduced motion (styles.css)', () => {
  it('a global prefers-reduced-motion rule switches off every animation and transition', () => {
    const block = css.match(/@media \(prefers-reduced-motion: reduce\) \{\s*\*\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(block).toMatch(/animation:\s*none\s*!important/)
    expect(block).toMatch(/transition:\s*none\s*!important/)
  })
  it('no smooth scrolling that would ignore the setting', () => {
    expect(css).not.toMatch(/scroll-behavior:\s*smooth/)
  })
})
