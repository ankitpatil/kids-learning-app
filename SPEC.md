# Kids Learning App — Spec

Gamified reading and math web app for kids aged 5–7.

## Principles
- **Pre-readers first**: every instruction is spoken (audio/TTS). Minimal text, icons + sound.
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

## Math skill graph
count to 5 → count to 10 → count to 20 → compare numbers → add within 5 → add within 10 → subtract within 10 → add within 20 → shapes, money.

## Reading skill graph
letter sounds → rhymes → CVC words → sight words (Dolch pre-primer/primer) → blends → digraphs → decodable sentences → short stories.

## Gamification
Avatar/pet fed with stars, world map (island per skill), soft streaks (pause, don't reset), stickers. No leaderboards.

## Parent area
Parent gate (hold 3s or simple multiplication), dashboard: time, skills mastered, weak spots, screen-time cap.
