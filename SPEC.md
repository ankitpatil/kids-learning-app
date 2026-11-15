# Kids Learning App — Spec

Gamified reading and math web app for kids aged 5–7.

## Principles
- **Pre-readers first**: every instruction can be spoken (audio/TTS); minimal text, icons + sound. **Narration (the app talking by itself) is off by default** (Ankit, 2026-11-15): 🗣️/🤫 on the home screen and Grown-ups turn it on. Speech the child asks for — 🔊, tapping a picture or word — always plays (`tapSay`), and "read to you" stories still read aloud. Grown-ups "Silent mode" silences everything. New code: automatic prompts use `say`, tap handlers use `tapSay`.
- **Levels by suggested age**: every track level has an age band (Ages 5–6 K, 6–7 Grade 1, 7–8 Grade 2; `LEVEL_AGES` in `engine/tracks.ts`, Common Core based). Level Select groups levels under these headings. New levels need a band (tested).
- **Big tap targets**: ≥ 60px. Works on tablets and phones, touch-first.
- **Short rounds**: 3–5 minutes (~10 items), then a reward screen.
- **Gentle failure**: no buzzer. Wiggle the wrong choice, offer a hint, never show "level down" to the child.
- **Target ~80% success** via the adaptive engine.
- **No ads, no chat, no third-party trackers.** Child profile = nickname + avatar only (COPPA-friendly).

## Tech stack
- React + TypeScript + Vite, installable **PWA** (vite-plugin-pwa), works offline.
- **Local-first state**: IndexedDB via Dexie. Call `navigator.storage.persist()`.
- Audio: Web Speech API (`speechSynthesis`) for now; pre-recorded clips later.
- Content as data: each game = component template + JSON/TS item generator or bank.
- Tests: Vitest (unit tests for engine, store, generators).
- No backend for MVP. Future: Supabase sync of an attempts queue (local DB stays source of truth).

## Data model
- `Skill` { id, subject: 'math'|'reading', name, prereqs: string[], levels }
- `Attempt` { id, profileId, skillId, itemId, correct, timeMs, hintUsed, at }
- `SkillState` { profileId, skillId, mastery (0–1), level, attempts }
- `Profile` { id, nickname, avatar, stars }

## Adaptive engine
- Weighted moving average: `mastery = 0.7*mastery + 0.3*score`
  - score: 1 correct, 0.5 correct with hint, 0 wrong; +0.1 bonus (capped at 1) if correct & fast.
- `mastery > 0.85 && attemptsAtLevel >= 8` → level up (celebrate).
- `mastery < 0.5` → level down quietly (or fall back to prerequisite skill).
- After 2 misses in a row → next item easier + hint.
- Round mix: ~70% current level, ~20% review (mastered), ~10% stretch (next level).
- Later: Elo / Bayesian Knowledge Tracing once item bank is large.
- Placement test: binary-search style, 8–10 items, first session.

## Reading (five pillars)
Phonemic awareness → phonics → fluency → vocabulary → comprehension.
Track mastery per sound/word (e.g. b/d confusion surfaces across games).
Decodable stories only use unlocked sounds. Read-along word highlighting. Spaced review (1, 3, 7 days).

## Stories (added 2026-11-14 by Ankit)
- **Funny and silly first.** Every story (built-in, build-time or Claude-written) should make a 5-year-old giggle: animals doing people things (a pig on a bus, a cat in a hat), mix-ups, surprises, silly sounds and names, and a funny twist or punchline in the last line. Gentle humour only: never mean, scary or rude, and no laughing *at* a person. Decodability rules still apply, so the humour comes from the situation, not hard words.
- **Words only.** No pictures beside story lines, in the title or on the answer choices, so a child can't guess by matching pictures and has to read (or listen) to answer. On level 1 the app reads the story and the choices aloud, so pre-readers can still answer by listening. (Other reading games keep pictures where the picture *is* the task, e.g. Word Detective "Read it": read the word, tap its picture.)
- Comprehension questions must be answerable from the text; the hint after a miss highlights the line that answers it.

## Target learner (updated 2026-11-08)
Primary user already reads basic words and adds/subtracts (≈ US Grade 1 / CBSE Class 1–2). Family is moving to Pune, India: align with both US Common Core Grade 1–2 and NCERT *Joyful Mathematics* (Class 1–2). Use ₹ and Indian names/objects by default, with US variants available. Earlier levels stay for younger siblings.

## Skill tracks and difficulty knobs
Each game = a **mechanic** + one or more **skill tracks**. A track is an ordered list of levels; each level is a config of knobs:
- `range`: number size / word pattern (within 10 → 20 → 100; CVC → digraphs → blends …)
- `representation`: concrete (drag objects) → pictorial (ten-frames, dots, number line) → abstract (symbols only)  — CPA progression
- `distractors`: far (clearly different) → near (look-alikes, minimal pairs, off-by-one)
- `scaffold`: hints/number line shown → none
- later: `format` (pick → build/type), `speed` (untimed → quick-recall bonus)
Mastery is tracked **per track per profile**, so siblings share games at different settings.

### Math tracks
count → add within 10 → subtract within 10 → missing number (a + __ = c) → make 10 / add within 20 → subtract within 20 → tens & ones to 100 → compare 2-digit → word problems → money (₹/$) → time → grouping (×/÷)

### Reading tracks
letter sounds → CVC words → digraphs (sh ch th ck) → blends → silent e → vowel teams (ee ai oa) → endings (-s -ed -ing) → tricky sight words → sentences → short stories + comprehension

## Math skill graph (original, superseded by tracks above)
count to 5 → count to 10 → count to 20 → compare numbers → add within 5 → add within 10 → subtract within 10 → add within 20 → shapes, money.

## Reading skill graph
letter sounds → rhymes → CVC words → sight words (Dolch pre-primer/primer) → blends → digraphs → decodable sentences → short stories.

## Gamification
Avatar/pet fed with stars, world map (island per skill), soft streaks (pause, don't reset), stickers. No leaderboards.

## Parent area
Parent gate (hold 3s or simple multiplication), dashboard: time, skills mastered, weak spots, screen-time cap.

## Move mode (added 2026-11-15 by Ankit)
Kids can play with their hands in front of the camera instead of touching — e.g. the laptop mirrored to a TV.
- One app, two input modes. Move mode is an *input layer*, not separate games: a hand cursor that presses whatever button it holds on (0.9 s fill ring), so every game works by hand. Touch/mouse still work in Move mode.
- Per-device setting, off by default (home 👆/🙌 toggle and Grown-ups). Grown-up controls are `[data-no-motion]`.
- Privacy: video is processed on the device by MediaPipe and never stored or sent. The tracker code/model are downloaded only when Move mode is first used. Camera stops when Move mode is off or the tab is hidden.
- Gentle failure: if no hand is seen for 2 s, say "Show me your hand!" — never count a miss because tracking dropped.
- Bigger, roomier targets in Move mode (`body.move-mode`).
- Two distances: **standing back (TV, default)** — whole-body tracking; **close to the laptop** — fingertip.
- Who's playing (TV mode): with several people in view, the player raises a hand (held 1 s) to take the turn; the app follows that body and ignores everyone else; raising a hand again after the player leaves hands the turn over. No face recognition and nothing stored — only where the player's body was last frame.
- The corner camera preview is big enough to read from the couch and boxes the active player (green ⭐) so everyone can see who is being tracked.

## AI features (added 2026-11-12, approved by Ankit)
Two uses of Claude, in priority order:
1. **Build-time content**: build runs (Claude) write stories, word problems and sentences as static data; tests check them (decodability, true math facts, length). No runtime AI, no data leaves the device.
2. **Live helpers for the child** (personalized stories, "Why?" explanations): optional, **off by default**, switched on by a parent behind the parent gate.
   - The browser never holds an API key. Requests go to a small **family proxy** (Cloudflare Worker, code in `proxy/`) that holds the key, checks a family passcode, rate-limits, fixes the model and system prompt server-side, and **never logs or stores request bodies**. Ankit deploys it; build runs never do.
   - Requests carry only learning context (level, unlocked patterns, topic, the current item) — never the child's nickname, profile id, recordings or anything identifying.
   - Every AI output is checked in code before a child sees it (decodable at level, length limits, kid-safe word list, math correctness, hints don't reveal answers). On any failure, timeout or offline: silently use built-in content. The child never waits on the network for more than ~2 s.
   - Model: fast, low-cost model for child-facing calls (e.g. `claude-haiku-5-5`).
   - Good outputs are cached on the device so they work offline.
