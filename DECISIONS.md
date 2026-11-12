# Decisions log

Judgment calls made during autonomous runs. Newest first. Ankit reviews and can overrule.

## 2026-11-12 — More decodable stories (C1, interactive session)
- Added 29 stories (14 → 43): CVC 11, digraphs 8, blends 8, magic e 8, ee/ai/oa 8. Fewer than the ~40 the item suggested: every word has to pass the decodability checker, which rules out many everyday words (e.g. *be, no, so, day, too, eat, star, moon, cricket*), so quality over count. More can come with AI2's checked, generated stories.
- Themes: cricket (Ash hits a six), monsoon (stuck van, puddles, red coat, late train), Diwali-style lamps without the word (*Diwali* isn't decodable), space, camping, beach, cooking, pets, farm.
- Names must be decodable too, so Indian names are short ones that fit a pattern (Ved, Dev, Ram, Tej → CVC; Shan, Ash → digraphs; Jai, Neel, Gail → ee/ai/oa) alongside US names (Kim, Pam, Jen, Beth, Chad, Fran, Brad, Glen, Trish, Jane, Pete, Rose, Kate, Mike).
- Exclamations like "Ha!" fail the checker (no final consonant), so stories use "Look!" / "Yes!" instead.
- New test: at least 6 stories per pattern and unique titles. Themes are not a data field yet (no screen uses them); AI2's topic picker can add one.

## 2026-11-12 — Claude in the app: priorities (with Ankit)
- Ankit picked build-time content (C1, C2) and live child helpers (AI1–AI4) as the top priority, ahead of icons (I1/I2), sounds (S1) and money (#21). The parent "explain this week" summary is parked until the parent dashboard (#23).
- Live helpers are off by default, parent-gated, go through a stateless family proxy that Ankit deploys (API key never in the repo or the client), send no identifying data, and every output is checked in code with a silent fallback to built-in content. Written into SPEC.md "AI features" and CLAUDE.md.
- Read-aloud coach starts as a write-up (AI4) because browser speech recognition in Chrome sends audio to Google, which needs Ankit's decision.

## 2026-11-12 — Round-end celebration: confetti, trumpet, applause (Ankit request)
- Every finished round now opens the reward screen with a full-screen paper-confetti rain (~90 strips and dots in 7 colours, 2.4–4 s fall, click-through) plus a trumpet fanfare ("ta-ta-ta-taaa, ta-TAAA", ~1.8 s) followed by ~2 s of applause.
- Sounds are synthesized with Web Audio like the other effects (brass = detuned saws through an opening low-pass with vibrato; applause = band-passed noise "claps" that thin out). No audio files, no cost, works offline, and respects the 🔊 mute toggle.
- Every round counts as a success (the round always ends with stars), so the celebration plays on every round; it doesn't scale with the score, to keep failure gentle.
- The spoken "Great job! You got a … sticker!" now waits ~1.9 s for the fanfare to finish, and is cancelled if the child leaves the reward screen first. The old sparkle sound on the reward screen is dropped (too much at once); it still plays for in-game level-ups.
- Crowd cheer added (Ankit request): a swelling filtered-noise "roar" plus 12 synthesized "woo-hoo!"/"yay!" voices (sawtooth through moving vowel formants, kid and adult pitches, panned left/right), starting with the applause after the fanfare. Praise speech now waits ~2.3 s.
- Confetti is hidden for `prefers-reduced-motion`. The per-answer emoji burst during games is unchanged.

## 2026-11-12 — Story sums: word problems (#20)
- New game "Story sums" for the `wordProblems` track (now playable, 3 levels, last in the math sequence after More or fewer). 8-item rounds with the usual round mix (review = level below, stretch = level above; its own single-track group).
- Story kinds (Common Core 1.OA.1 / NCERT Class 1–2): add to and take from (result unknown) from level 1; put together ("in all") from level 2. Change-unknown ("how many more did she get?") and compare stories are left out for now — the Missing number track covers a + __ = c; could be a 4th level later.
- Levels are the format: 1 = pick the answer, within 10, objects shown as pictures (taken-away ones greyed out); 2 = pick the number sentence, within 20, no pictures; 3 = build it: tap + or −, then pick the answer (4 choices). Every story is read aloud on every level (spoken story, per the backlog) and also shown as text; tap the story or 🔊 to hear it again.
- Equation choices are always true facts (right one, same numbers with the other sign, one with a different story number) so the app never shows a wrong sum like 5 + 3 = 9.
- Near number choices always include the wrong-operation result (e.g. 9 for 7 − 2), the most telling mistake; far choices are ≥ 2 apart; no 0 choices.
- Hints never give the answer: wrong number → "Start at seven, and count back two" (count on for +) and the pictures appear even on levels 2–3; wrong sign / wrong equation → what the action means ("Some sweets go away, so there are fewer… Minus!"); right sign but wrong numbers → re-read the story's number lines.
- Easing (2 misses): a picture item within 10, get-more / take-away only, 2 choices.
- Names mix Indian (Riya, Aarav, Kabir, Meera…) and US (Emma, Liam, Mia…); things lean Indian where there's an emoji (mangoes, rotis, kites). No ₹/$-style setting is needed here; a names region setting could come with the money item (#21). Content is data in `content/wordProblems.ts`.
- Not added to placement checkpoints: placement tops out at compare 2-digit, so a child who passes everything starts here at level 1.

## 2026-11-11 — Story Choose (#19)
- New game for the `stories` track (now playable, 3 levels, last in the reading sequence after Sentences). A round = 2 stories × 2 questions = 4 answers (stories take longer than single items, so 4 keeps the round at ~3–5 min).
- 14 hand-written stories (4–5 lines, ≤ 9 words a line, one picture per line): 5 CVC, 3 digraphs, 2 blends, 2 magic e, 2 ee/ai/oa. Names mix Indian and US (Raj, Dev, Jai, Neel, Chen, Sam, Meg, Kate…). Content is data in `content/stories.ts`.
- "Only unlocked patterns": a test checks every story word is either a tricky word from the Sight-Word Catch lists (or its -s form) or decodable at the story's pattern, using a small regex-based checker (`wordPattern`). At play time, a pattern counts as unlocked once the child is past level 1 of that Word Detective track (or has high mastery); CVC is always open. The story level also caps the pattern: L1 = CVC only, L2 = up to blends, L3 = everything. Picks lean (60%) to the hardest allowed pattern.
- Read-along: L1 reads the story aloud automatically with word-by-word highlighting, then asks; L2 the child reads first with a "read to me" button (🔊📖); L3 read it yourself. On every level any word can be tapped to hear it (decoding help, not counted as a hint). Using "read to me" on L2 counts as a hint for that story's questions.
- Highlighting uses the browser's speech word-boundary events when available, otherwise an estimated per-word timer (many Android/Chrome voices never send boundary events); a safety timeout moves on if `onend` never fires. Helpers in `audio/readAlong.ts`, `sayAlong` in `audio/speech.ts`.
- Questions are always spoken (it's comprehension, not decoding the question); on L1 the choices are read out too. Choices are picture + short phrase. The story stays on screen (smaller) during questions so the child can look back.
- Wrong answer: choice fades, "Let's look at the story again" and the line with the answer is read aloud and highlighted. Easing (2 misses): next question has 2 choices with the answer line pre-highlighted; a new story after easing is CVC and read aloud.
- No round mix (review/stretch) here: with 2 stories a round there aren't enough slots; noted for later if wanted.
- Question text ("What colour…") uses Indian/UK spelling to match the ₹-first default.

## 2026-11-11 — Compare 2-digit numbers in Feed the Monster (#15b)
- Mechanic: two plates with a number each; the monster says "I'm so hungry! Which plate has more cookies?" or "I'm nearly full. Which plate has fewer cookies?" → tap a plate. Both "more" and "fewer" are asked (~50/50) so the child can't just always tap the bigger number. Uses "more/fewer" (K–1 language) in the question and "more than / less than" in the feedback.
- Track `compare2d` (renamed "More or fewer") is now playable and has 3 levels instead of 2: 0 = far apart (tens differ by ≥ 2) with the tens & ones picture (📦 boxes + 🍪) under each number; 1 = close numbers with the picture; 2 = close numbers, numbers only. Saved progress at old level 0/1 stays valid (level 1 is now "close numbers with the picture", slightly easier than before).
- Close pairs are an even mix of swapped digits (34 / 43), same tens (34 / 37) and a "tens trap" (29 / 31: more boxes wins even with fewer loose cookies).
- A wrong pick fades that plate, shows the picture (even on level 2) and the hint walks through it the place-value way: "Look at the boxes first. forty three has four boxes, thirty four has three boxes. So forty three is more than thirty four." or, with equal tens, "Both have three boxes. So look at the cookies…".
- Easing (2 misses): a far pair with the picture, asking "more".
- Joins Feed the Monster's round-mix group after tens & ones (count → missing → tens & ones → compare): top-level tens & ones stretches into compare, compare reviews tens & ones. Placement checkpoint moved to compare level 2 (the quick-check item is numbers only).

## 2026-11-10 — Tens & ones in Feed the Monster (#15a)
- Split #15: this run made the `placeValue` track playable in Feed the Monster; comparing 2-digit numbers is #15b.
- Mechanic: "Feed me thirty four cookies!" The plate has boxes of 10 (📦 with a "10" tag) and loose cookies. Tapping a box counts by tens ("twenty, thirty"), a cookie counts on ("thirty one"); the running total shows under the belly.
- Levels follow the existing track config: 1 = 10–49 with the number split into a tens digit (📦) and ones digit (🍪) and grey ghost boxes/cookies as a guide; 2 = 10–99, number only; 3 = "three tens and four ones" spoken + shown as 3 📦 4 🍪 → pick the number. Near choices are swapped digits (43), ±10 and ±1.
- Loose cookies on the plate never exceed 9, so the number can only be built the place-value way (no 2 boxes + 14 cookies). Numbers include round tens (30 = 3 boxes, 0 cookies).
- Mistake hints say which part to fix ("The boxes are right! Now count the cookies.") or that boxes and cookies swapped; after a miss the ghost guide appears even on level 2.
- Easing (2 misses): tens ≤ 3, feed mode, guide on.
- The track joins Feed the Monster's round-mix group (count → missing → tens & ones), so the top of "missing number" stretches into tens & ones level 1, and tens & ones reviews missing-number items. It comes after "Subtract within 20" in the math sequence.
- Added `engine/numberWords` (0–100 in words) so TTS says "thirty four" consistently.

## 2026-11-10 — Round mix in single-track games (#14b)
- Phonics Pop, Sight-Word Catch and Word Builder now use the same 8-item plan (review warm-up first, one mid-round "Bonus challenge!", last item current) via `engine/roundMix`; no engine changes were needed since a single-track game's group is just its own track.
- Review = one level below; stretch = one level above. These games don't mix in other tracks (e.g. a child who mastered Short words doesn't get those in Phonics Pop), keeping each game's round about one skill.
- At level 0 there is nothing to review, so those slots become normal items; at the top level there is nothing to stretch to (no next track in these games), so the bonus slot becomes a normal item.
- As in #14a, review/stretch answers are logged with `mix` and their own level but don't move the level or mastery. Phonics Pop now logs the attempt before (not after) the engine update, same as the other games.

## 2026-11-10 — Round mix 70/20/10 (#14a)
- Split #14: this run did the engine plus the three games that play several tracks (Feed the Monster, Number Line Hop, Word Detective). The single-track games are #14b.
- A round is still one game, so "across the tracks of a subject" means across the tracks that game can play (e.g. Word Detective: cvc → … → sentences). Mixing different games into one round would need a new mixed-round screen; not done.
- 8-item round = 5 current, 2 review, 1 stretch (rounding 20% and 10%). Over 20 items it's exactly 14/4/2.
- Order: item 1 is a review warm-up (an easy first win), the last item is always current, and the stretch item is never 1st, 2nd or last.
- Review = the level just below the current one, or an earlier track in the same game that the child has played (its top level if mastered, otherwise one level below where they are). Tracks never played (jumped past on the level map) are not "review".
- Stretch = the next level, or the next track in the same game once at the top level. Never right after two misses (the next item must be easier then). Nothing to review/stretch to → the slot is a normal current item.
- Review and stretch answers are logged as attempts (with `mix: 'review' | 'stretch'` and their own track/level) but do NOT change any track's level or mastery: a hard stretch item can't knock a child down a level, and an easy review can't push them up. The logs are there for the parent dashboard (#23) and spaced review (#25).
- Stretch items are announced as "Bonus challenge!" and their progress dot glows gold, so a miss feels like a bonus attempt, not a failure. Stars still count all 8 items.
- Mixing also applies when a level is picked from the level map.

: -s / -ed / -ing (#18, interactive session)
- Mechanic: a sentence with a time clue and a base word ("Last night, we walk__."); the child taps the ending tile that fits. A picture sits above (two pictures for plurals: "I see two cats").
- Pictures alone can't show tense, so the sentence's time clue (Every day / Yesterday / Right now) carries the meaning instead.
- Levels: 1 = -s and -ing, read aloud with a blank; 2 = -s, -ed, -ing, read aloud; 3 = read it yourself. Easing = read aloud + 2 endings.
- Only base words that need no spelling change (jump, play, walk, cook, paint, climb, rest, laugh, kick, help; cat, dog, duck, frog, hat, ship, kite, cup). Doubling (hop → hopping) and dropping e (bake → baking) are left for a later item.
- -s is a plural noun half the time and a verb ("Sam jumps") otherwise, so children meet both uses.
- Wrong pick: the slot shows their ending in orange and the app reads their version ("Right now, we are rested. Hmm, does that sound right?").
- Reading track order is now: … ee/ai/oa → endings → tricky words → sentences.

## 2026-11-09 — Sight-Word Catch (#17, interactive session)
- Mechanic: the app says a tricky word; the child taps (catches) the matching word bubble; a jar on top replays the word. After a catch, the word is used in a short spoken sentence ("was. The cake was yummy.") so it carries meaning, not just a shape.
- 54 words in 3 levels, based on Dolch pre-primer / primer / first grade, keeping the words that are hard to sound out: level 1 (the, you, where…), level 2 (was, they, said…), level 3 (of, could, once…). Later levels mix in earlier words about 1 time in 4 as review.
- Level 1 = 3 bubbles with clearly different words (look-alikes kept out). Levels 2–3 = 4 bubbles led by look-alikes young readers mix up (was/saw, of/off, they/then, there/three/their). Easing = 2 bubbles.
- Wrong catch: that bubble fades, and the app names what it says and spells the target ("That one says saw. Find was: w, a, s").
- Track order: tricky words come after ee/ai/oa and before sentences, since the sentences lean on heart words. Not in the placement quick check yet.
- Bubbles bob gently, with no timer; reduced-motion turns the bobbing off.

## 2026-11-09 — Magic-e switch and finish-the-sentence (#16, interactive session)
- Silent-e and ee/ai/oa word reading already shipped with Word Detective (#12), so #16 adds the two missing pieces.
- Magic e: new silentE level 3 "cap / cape switch". Read items show either the short word (kit) or the magic-e word (kite); the pictures always include both, so the child has to notice the e. After a right answer the screen shows "kit + e = kite" and says it. Build items at this level still use the silent-e word list. 6 pairs with clear pictures (kit/kite, cub/cube, cap/cape, can/cane, pin/pine, tub/tube); mane, robe, note etc. left out because their pictures are ambiguous.
- A child who had already finished the old top silent-e level now lands on the new level (pickTrack treats it as not mastered). Placement checkpoints are unchanged, so passing both silent-e checkpoints still skips the whole track.
- Finish the sentence: the `sentences` track is now playable inside Word Detective (always sentence items). Level 1 = picture clue + 2 choices; level 2 = no picture + 3 look-alike choices (minimal pairs that don't fit: pond / pod / pot). Easing = picture + 2 choices.
- The sentence is NOT read aloud (reading it is the skill). A wrong pick reads the sentence back with their word ("The duck swims in the pot. Hmm, does that make sense?") so the child hears why it doesn't fit.
- 13 sentences built from taught patterns plus common heart words; look-alikes chosen so they don't make sense in the sentence.
- Not added to the placement quick check; readers reach sentences after ee/ai/oa.

## 2026-11-09 — Profiles: multi-child on one device (#13)
- Profile = nickname + avatar emoji only (16 animals). No age, photo or real-name requirement. Nickname is optional: blank → the animal's name ("Panda"); cleaned to letters/numbers/space/-/' (any script), max 12 chars; duplicate names get " 2", " 3".
- A new sibling's animal defaults to one no other profile has. Cap of 6 profiles per device.
- Startup: exactly one profile → straight to home (existing installs keep their "default" 🦊 profile, stars, stickers and levels untouched); several → "Who's playing?" picker (most recently played first); none → "Pick your animal" create screen.
- Home top-left avatar now shows the nickname and opens the picker to switch players or add one (➕ New).
- Each profile already had its own skill states, stars, stickers and placement flags (all keyed by profileId); a new child starts unplaced, so the starting-point / quick check runs on their first game.
- No delete/rename yet — deleting a child's progress should sit behind the parent gate (#23).
- The no-repeat memory (recent examples, localStorage) and the mute setting stay per device, not per child — harmless for siblings and keeps this item small.

## 2026-11-09 — Number Line Hop (#11)
- One game plays four tracks (add10, sub10, add20, sub20), now all playable. Existing level configs kept so placement/saved levels stay valid; sub20 level 0 relabelled "back to 10, number line".
- Pictorial within-10 levels = 'hop' mode: frog starts on `a`, child taps the big 🐸 button once per hop (each hop counted aloud, 🐾 shown), ↩️ undoes, ✅ submits. Checked by number of hops; wrong → "hop N more / hop back N".
- Within-20 pictorial = 'make10' mode, two steps: "how many hops to ten?" (pick 1–9), frog jumps to 10 and the split is shown (8 + 5 = 8 + 2 + 3; 13 − 5 = 13 − 3 − 2), then "where does the frog land?". Make-10 items always cross ten. Only the final answer counts as one engine attempt; a wrong pick on either step logs a miss and marks the item as hinted.
- Abstract levels = 'choose': equation only, 4 choices; after a wrong pick the number line appears with the frog on the start number.
- Easing (2 misses) always drops to counting hops with b ≤ 3.
- pickTrack now runs count → add10 → sub10 → missing → add20 → sub20. A child placed past add/sub within 10 (placement marks them mastered) is unaffected.
- Home math tile aria-label changed to "Math games" (no longer only Feed the Monster).

## 2026-11-08 — Levels, feedback, stickers, no repeats (Ankit request)
- In-game "⬅️ Levels" opens a level picker per subject: every playable skill with ▶️ (continue at current level) and numbered level chips (passed = ⭐, current highlighted). Picking a chip sets that level. Home links now open this screen; the 🎯 quick check is reachable from it.
- Right/wrong feedback: synthesized Web Audio sounds (no files, works offline, respects mute) — bright arpeggio for right, soft two-note "hmm" for wrong (never a buzzer); ✅ + confetti burst for right, 🏆 + bigger burst on level-up, gentle 🤔 wobble for wrong.
- Stickers: 56 original emoji stickers on 6 pages (animals, sea, space, treats incl. mango, vehicles incl. auto rickshaw, magic). One per round; a level-up or perfect round earns rare/epic. Unowned stickers are always preferred — no duplicates until the book is full. Reward screen flips the sticker in with a NEW tag; 📒 sticker book on home and reward screens (collected in colour, missing as silhouettes, tap to enlarge).
- No repeats: each track remembers its last 16 examples (localStorage) and generators retry until they find one not shown recently; tiny pools (e.g. 4 letters at level 1) pick randomly among items not shown in the last 2, so there's no back-to-back repeat or predictable cycle. Applies to all games and the quick check.

## 2026-11-08 — Word Detective replaces Word Pop (#12, Ankit feedback)
- Ankit: popping letters at higher reading levels "is not useful". For readers, the game must make the child decode (read without hearing) and encode (spell), not listen-and-pick.
- 🔍 Read it: written word shown, NOT spoken; tap the matching picture (3 far / 4 same-pattern pictures). Wrong tap names that picture and spells the word letter by letter as a hint.
- 🧩 Build it: picture + spoken word; tap grapheme tiles into slots (sh, ck, ee, ai, oa kept as one tile). Decoys: 1 far at level 0, 2 look-alikes of the taught pattern at level 1 (sh→ch/s, ee→e/ea). Wrong tiles turn red and pop back out.
- Rounds alternate read/build. Tracks cvc, digraphs, blends, silentE, vowelTeams are now playable; reading tile picks the first unmastered track, so a reader never lands on letter popping.

## 2026-11-08 — Back button on quick check (Ankit request)
- Quick check and start screen get a labelled "⬅️ Back" pill (quiz → start screen → home); quitting mid-quiz discards answers and stops speech.
- Removed `viewport-fit=cover` so top buttons aren't drawn under the Claude app's top bar or phone notch.

## 2026-11-08 — Missing number in Feed the Monster (#10)
- Implemented as the `missing` track ("I have 3, feed me until I have 8"): level 0 = feed cookies into ten-frames (pictorial), levels 1–2 = pick the number for `a + __ = c` (abstract, within 10 then 11–20). Easing (2 misses) drops back to feeding with need ≤ 3.
- Plain "add-on" (a + b = ?) is left to Number Line Hop (#11); Feed the Monster's mechanic naturally teaches the missing addend.
- Abstract mode hides the ten-frames; they reappear as a hint after a wrong answer.
- The math tile now picks the first playable track not yet mastered (`pickTrack`): count → missing. Placement marks fully-passed tracks as mastered (mastery 0.95) so a child who already adds skips counting.
- Feedback counts on from what the monster already has ("four, five…") and states the fact on success ("three and five make eight").

## 2026-11-08 — Placement test (#9)
- First tap on a subject opens a grown-up "starting point" screen: 🎯 quick check (child plays ~8–12 tap questions) or one of 3 presets. Small "🎯 Math level / Reading level" links on home reopen it.
- Binary search over 12 math / 13 reading checkpoints; each probe passes on 2 right, fails on 2 wrong, tie-breaker on a split; hard cap 12 items.
- Passing a checkpoint starts that track one level above it; tracks whose checkpoints are all passed start at max level.
- Placement gives neutral praise ("Okay!", "Got it!") for every answer — it shouldn't feel like a test.
- Placement also sets levels for tracks that have no game yet (add10, missing, digraphs…), so future games start at the right level.
- Word lists for cvc / digraphs / blends / silent e / vowel teams added in src/content/words.ts (reused by Word Pop, #12).

## 2026-11-08 — Skill tracks (#8)
- Track ids `count` and `phonics` kept identical to old skill ids so saved progress carries over; `skills.ts` is now a shim.
- Tracks without a game yet are defined with `playable: false` so placement can already set their levels.

## 2026-11-08 — Backlog reprioritised for actual learner (with Ankit)
- Child already reads basic words and does +/-; backlog reordered toward Grade 1 / Class 1–2 skills: skill-track refactor, placement test, missing-number, number line strategies, Word Pop (digraphs/blends), tens & ones.
- Games become mechanic + skill tracks with difficulty knobs (range, CPA representation, distractor closeness, scaffold). Research basis: Common Core RF.1.3 & 1.OA/1.NBT, NCERT Joyful Mathematics Class 2, concrete–pictorial–abstract.
- ₹ default for money; Indian + US names in word problems (family relocating to Pune).
- Parked: Rhyme Match, Shape Hunt, CVC Word Builder.

## 2026-11-08 — Phonics Pop (#7)
- Prompt is "Pop the letter that <picture word> starts with" plus an emoji picture, instead of speaking an isolated sound: browser TTS pronounces letter names, not phonemes. Revisit with recorded audio (#26).
- Letter order follows a common synthetic-phonics sequence: s a t p → i n → m d g o → c k e u r → h b f l j → v w y z q → look-alike drill (b/d, p/q, m/n).
- 'x' is excluded (no common picture word starts with its /ks/ sound).
- From level 4 the look-alike partner always appears as a distractor; ease mode removes it.
- A wrong tap greys out that balloon and the child retries; only first-try answers count toward round stars.

## 2026-11-08 — Initial setup (with Ankit in chat)
- Local-first, no backend for MVP (IndexedDB/Dexie). Backend (Supabase) only later for sync.
- React + TS + Vite PWA. Vitest for tests.
- Adaptive engine v1 = weighted moving average; Elo later.
- Web Speech API for voice now; pre-recorded clips are a later decision (backlog #26).
- Feed the Monster levels: max count 3, 5, 7, 10, 15, 20.
- Private repo `ankitpatil/kids-learning-app`. Scheduled runs on Pro plan, 2/day (11:41pm, 4:53am PT), target ~80% weekly usage.
