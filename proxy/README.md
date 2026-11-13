# Family proxy (Claude helpers)

A tiny, stateless Cloudflare Worker that sits between Little Learners and the Claude API, so the API key never lives in the app or in this repo. **Ankit deploys this by hand. Build runs never deploy it.**

What it does:

- Checks the family passcode (`X-Family-Passcode` header) on every request.
- Accepts only three request kinds — `ping`, `story`, `why` — and rebuilds each from a fixed list of learning fields (level, phonics patterns, topic, the current question). Anything else is rejected or dropped.
- Uses a fixed model (`MODEL` in `src/worker.js`) and a fixed system prompt. The app can't change either.
- Rate-limits (20 a minute, 300 a day, per Worker instance; best effort).
- Stores nothing and never logs request or response bodies (no `console` calls; observability is off in `wrangler.toml`).

The app also checks every answer in code before a child sees it and falls back to built-in content on any failure.

## Deploy (free tier, ~10 minutes)

1. **API key:** in the [Anthropic Console](https://console.anthropic.com), create a key for this project and **set a monthly spend limit** (e.g. $5). This is the real cost cap.
2. Install Wrangler and log in: `npm i -g wrangler`, then `wrangler login`.
3. From this folder:
   ```bash
   cd proxy
   wrangler secret put ANTHROPIC_API_KEY   # paste the key
   wrangler secret put FAMILY_PASSCODE     # pick a passcode, e.g. 3 random words
   wrangler deploy
   ```
   Wrangler prints a URL like `https://little-learners-proxy.<you>.workers.dev`.
4. Optional: set `ALLOWED_ORIGIN` in `wrangler.toml` to the address you open the app at, then deploy again.
5. In the app: **⚙️ Grown-ups** (hold 3 s, answer the sum) → paste the URL and passcode → **Test connection** → switch on **✨ Claude helpers**.

To try it locally first: `wrangler dev` and use `http://localhost:8787` as the proxy URL.

To turn everything off: switch the toggle off in the app, or `wrangler delete`, or revoke the key in the Console.

## Tests

`npm test` from the repo root runs `src/worker.test.js` with a fake Claude API (no network, no key).
