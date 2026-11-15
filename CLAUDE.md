# Instructions for autonomous build runs

You are continuing development of a kids (5–7) reading & math PWA. Read SPEC.md first.

Each run:
1. `npm ci` then `npm test` and `npm run build` — fix anything broken before new work.
2. Take the **first unchecked item** in BACKLOG.md "Next". Do only that item (split it if too big).
3. Follow SPEC.md principles: speakable instructions (narration is off by default; tap-to-hear uses `tapSay`), an age band for every new level, big tap targets, gentle failure, no third-party data sharing.
4. Add/extend Vitest tests for logic (engine, generators, store). UI can be lightly tested.
5. `npm test` and `npm run build` must pass before committing.
6. Tick the item in BACKLOG.md. Add any judgment calls to DECISIONS.md (newest first, dated).
7. Append one line to RUNLOG.md: `YYYY-MM-DD HH:MM PT — item #N — summary — status`.
8. Commit with a clear message and push to `main`.

Keep runs small: one item, done well. If blocked or an item is in "Needs Ankit", skip it, note why in RUNLOG.md, and take the next.
Hosting: the app is hosted on Vercel (free, `*.vercel.app`, set up by Ankit 2026-11-15). **Every push to `main` goes live for the kids**, so `npm test` and `npm run build` must pass before any push, and never push a half-finished item. Don't change Vercel settings, add a custom domain or add a login.
Never: spend money, add analytics/trackers, add a backend that stores child data, or put an API key in the repo or the client.
AI items: follow SPEC.md "AI features". Build and test them with the `mock` provider; the family proxy code lives in `proxy/` and is deployed only by Ankit.
