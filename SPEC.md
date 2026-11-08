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
