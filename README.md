# Little Learners

A gamified reading and math web app for kids aged 5–7. Short, spoken, tap-friendly rounds that adapt to each child's level. Aligned to US Common Core (K–2) and NCERT *Joyful Mathematics* (Class 1–2).

It is a family-only, offline-capable PWA. There is no backend, no accounts, no ads and no trackers: all progress stays in the browser (IndexedDB).

## Quick start

Requirements: Node.js 20+ (LTS) and npm.

```bash
git clone https://github.com/ankitpatil/kids-learning-app.git
cd kids-learning-app
npm ci
npm run dev          # http://localhost:5173
```

On macOS you can instead double-click **`Start Little Learners.command`** in the repo root (if present). It installs dependencies the first time, starts the dev server and opens the app in Chrome.

To play on a tablet on the same Wi-Fi: `npm run dev -- --host`, then open the printed network URL. Use Chrome or Safari, because the narrator uses the browser's built-in speech (Web Speech API).

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm test` | Vitest unit tests (engine, store, generators) |
| `npm run build` | Type-check (`tsc -b`) and production build to `dist/` |
| `npm run preview` | Serve the production build locally |

## Using the app

- **Math / Reading tiles**: the app picks the next game for that subject from the child's levels. The first visit runs a short quick check (or a parent picks a starting point).
- **🗺️ Math levels / 🗺️ Reading levels**: jump to any game and level directly. Tap ▶️ for the current level or a number to pick one.
- **Avatar (top left)**: switch or create child profiles. Each child has their own levels, stars and stickers.
- **📒 Sticker book**: one sticker per round, with rare ones for level-ups and perfect rounds.

Games: Feed the Monster (counting, missing number, tens & ones, compare), Number Line Hop, Story sums, Phonics Pop, Word Detective, Sight-Word Catch, Word Builder and Story Choose.

## Project layout

```
src/
  App.tsx          screen routing, home, reward screen
  engine/          adaptive engine, skill tracks, placement, round mix, stickers (+ tests)
  store/           Dexie (IndexedDB) database: profiles, attempts, skill states
  games/<game>/    one folder per game: <Game>.tsx + generator.ts + generator.test.ts
  content/         word lists, stories, word problems, stickers (content as data)
  audio/           speech (TTS), read-along highlighting, sound effects
  screens/         level select, placement, profiles, sticker book
public/            PWA icon
SPEC.md            product principles, data model, adaptive engine, skill tracks
BACKLOG.md         ordered work queue (Done / Next / Needs Ankit)
DECISIONS.md       judgment calls, newest first
RUNLOG.md          one line per build run
CLAUDE.md          instructions for the autonomous build runs
```

## Contributing

Most work is done by scheduled Claude build runs, one backlog item per run, and Ankit reviews and steers. Humans follow the same process.

### Workflow

1. **Read `SPEC.md` first.** It is the source of truth for principles, tracks and the adaptive engine.
2. **Make sure the base works:** `npm ci && npm test && npm run build`. Fix anything broken before starting new work.
3. **Pick work from `BACKLOG.md`.** Take the first unchecked item under **Next** and do only that item. If it's too big, split it into sub-items (e.g. `15a`, `15b`) in the backlog and do the first one. Never pick up anything under **Needs Ankit**.
4. **Build it** following the conventions below, with tests.
5. **Before committing**, `npm test` and `npm run build` must both pass.
6. **Record it:**
   - Tick the item in `BACKLOG.md`.
   - Add judgment calls to `DECISIONS.md` (newest first, dated `## YYYY-MM-DD — Title (#N)`).
   - Append one line to `RUNLOG.md`: `YYYY-MM-DD HH:MM PT — item #N — summary — status`.
7. **Commit** with a clear message that names the backlog item (e.g. `Story sums: spoken one-step word problems (backlog #20)`), then push to `main`.

Keep changes small: one item, done well. Feature requests from Ankit outside the backlog are logged in `RUNLOG.md` as `request` and in `DECISIONS.md`.

### Design rules (from SPEC.md)

- **Pre-readers first**: every instruction is spoken. Use icons and sound, with minimal text.
- **Big tap targets** (≥ 60px), touch-first for tablets and phones.
- **Short rounds**: about 3–5 minutes (≈ 8–10 items), then a reward screen.
- **Gentle failure**: no buzzer, no visible "level down". Wiggle the wrong choice and offer a hint that never gives the answer away.
- **Aim for about 80% success** through the adaptive engine and the 70/20/10 round mix (current / review / stretch).
- **Content as data** in `src/content/`, not hard-coded in components.

### Code conventions

- TypeScript + React function components. State lives in Dexie through `src/store/db.ts`.
- A new game gets its own folder under `src/games/`, a generator with Vitest tests, a track entry in `src/engine/tracks.ts` (levels as knob configs: `range`, `representation`, `distractors`, `scaffold`), and routing in `App.tsx`.
- Logic (engine, generators, store) needs unit tests. UI can be lightly tested.
- Keep saved progress working. Don't break existing track IDs or the DB schema without a Dexie migration.

### Never

- Deploy publicly, or add anything that costs money (domains, paid APIs, voice actors)
- Add analytics, trackers or any third-party service that receives child data
- Add a backend that stores child data
- Collect more than a nickname and an avatar for a child profile

These need Ankit's sign-off. Add them to **Needs Ankit** in `BACKLOG.md` instead.

## Privacy

The app keeps everything on the device in IndexedDB and asks the browser for persistent storage. Profiles hold only a nickname and an animal avatar. Nothing is sent to any server.
