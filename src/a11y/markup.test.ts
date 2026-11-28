import { describe, expect, it } from 'vitest'
import { getScreenHeading, screenHeading, setScreenHeading, subscribeScreenHeading } from './screenHeading'

// Static checks over the source for the Lighthouse / axe findings fixed in #30b (node:fs loaded dynamically
// because the app tsconfig has no Node types, as in contrast.test.ts).
type Dirent = { name: string; isDirectory(): boolean }
const fs = (await import(/* @vite-ignore */ 'node:fs' as string)) as {
  readFileSync(p: URL, enc: 'utf8'): string
  readdirSync(p: URL, o: { withFileTypes: true }): Dirent[]
  existsSync(p: URL): boolean
}
const SRC = new URL('../', import.meta.url)
function tsxFiles(dir: URL): URL[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? tsxFiles(new URL(`${e.name}/`, dir)) : e.name.endsWith('.tsx') && !e.name.endsWith('.test.tsx') ? [new URL(e.name, dir)] : [],
  )
}
const sources = tsxFiles(SRC).map((u) => ({ file: u.pathname.split('/src/')[1], text: fs.readFileSync(u, 'utf8') }))
const lineOf = (text: string, i: number) => text.slice(0, i).split('\n').length

describe('screen heading (hidden <h1>)', () => {
  it('names game and menu screens', () => {
    expect(screenHeading({ name: 'levels', subject: 'reading' })).toBe('Reading games')
    expect(screenHeading({ name: 'map', subject: 'math' })).toBe('Math island map')
    expect(screenHeading({ name: 'count' })).toBe('Feed the Monster')
    expect(screenHeading({ name: 'add20' })).toBe('Number Line Hop')
    expect(screenHeading({ name: 'cvc' })).toBe('Word Detective')
    expect(screenHeading({ name: 'sentences' })).toBe('Word Detective')
    expect(screenHeading({ name: 'grouping' })).toBe('Snack Party')
    expect(screenHeading({ name: 'vault' })).toBe('Sticker book')
    expect(screenHeading({ name: 'somethingNew' })).toBe('Little Learners') // never empty
  })
  it('is null on screens that draw their own <h1>, so there is only one', () => {
    for (const name of ['home', 'profiles', 'newProfile', 'tv', 'gate', 'settings', 'dashboard', 'voice']) expect(screenHeading({ name })).toBeNull()
  })
  it('those screens really have an <h1>', () => {
    const own = ['App.tsx', 'screens/Profiles.tsx', 'screens/TvGames.tsx', 'screens/ParentGate.tsx', 'screens/Settings.tsx', 'screens/ParentDashboard.tsx', 'screens/VoicePicker.tsx', 'screens/Bedtime.tsx']
    for (const f of own) expect(sources.find((s) => s.file === f)?.text, f).toMatch(/<h1\b/)
  })
  it('the store notifies only on change', () => {
    let calls = 0
    const off = subscribeScreenHeading(() => calls++)
    setScreenHeading('Phonics Pop')
    setScreenHeading('Phonics Pop')
    setScreenHeading(null)
    off()
    setScreenHeading('x')
    expect(calls).toBe(2)
    expect(getScreenHeading()).toBe('x')
  })
})

describe('markup (all .tsx)', () => {
  it('no aria-label on a plain div/span/p without a role (axe aria-prohibited-attr)', () => {
    const bad: string[] = []
    for (const { file, text } of sources)
      for (const m of text.matchAll(/<(div|span|p|b|i|strong|em|li|ul)\b((?:=>|[^>])*)>/g))
        if (/\baria-label=/.test(m[2]) && !/\brole=/.test(m[2])) bad.push(`${file}:${lineOf(text, m.index!)}`)
    expect(bad).toEqual([])
  })
  it("faded 'tried' answers are marked aria-disabled (so they are announced and exempt from contrast)", () => {
    const bad: string[] = []
    for (const { file, text } of sources) {
      if (file.includes('dinoMaze')) continue // camera game, tried targets stay hittable on purpose
      const tried = text.match(/\? 'tried'/g)?.length ?? 0
      const marked = text.match(/aria-disabled=/g)?.length ?? 0
      if (tried > marked) bad.push(`${file}: ${tried} tried, ${marked} aria-disabled`)
    }
    expect(bad).toEqual([])
  })
})

describe('index.html + public files', () => {
  const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
  it('lets people zoom, and has lang, title and description', () => {
    const viewport = html.match(/<meta name="viewport" content="([^"]*)"/)?.[1] ?? ''
    expect(viewport).toContain('width=device-width')
    expect(viewport).not.toMatch(/user-scalable\s*=\s*(no|0)/)
    expect(viewport).not.toMatch(/maximum-scale/)
    expect(html).toMatch(/<html lang="en">/)
    expect(html).toMatch(/<title>[^<]+<\/title>/)
    expect(html).toMatch(/<meta name="description" content="[^"]+"/)
  })
  it('is a private family app: not indexed by search engines', () => {
    expect(html).toMatch(/<meta name="robots" content="noindex/)
    expect(fs.readFileSync(new URL('../../public/robots.txt', import.meta.url), 'utf8')).toMatch(/Disallow: \/\s*$/m)
  })
})
