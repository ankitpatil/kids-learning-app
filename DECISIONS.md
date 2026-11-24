# Decisions log

Judgment calls made during autonomous runs. Newest first. Ankit reviews and can overrule.

## 2026-11-24 — Spaced review in Fun at the Fair and Tick Tock Clock (#25d)
- **What comes back**: Fair → the same price (and, for change, the same note/coin paid) with a new fair thing and fresh choices; Clock → the same time with fresh look-alike choices. Same limits as #25a–c: ≤ 2 per round, never first/last, not while easing, asked at the level it was missed at, `mix: 'spaced'`, level unchanged, "Remember this one?" only heard with talking on.
- **Ids are checked against their level** (`parseFairId(id, level, currency)`, `parseClockId(id, level)`): the mode must be that level's mode, the price/minute must be one the level uses. So an eased item (e.g. an o'clock "read" item logged at a "find the clock" level, or an easy ₹2–5 pay item logged at a change level) is not replayed — those were eased on purpose. Such cards are dropped before the round, not served as a random item.
- **Currency switch**: Fair ids don't name the currency (price numbers mean ₹ or ¢). A pay price works in both. A change id names what was paid (`money-change-20-7`); if the Grown-ups currency setting changed since (₹20 → 25¢), it no longer fits and is dropped rather than asking a 20¢ change question that the US setting never uses.
- No Pop the Answer / Dinosaur Maze mapping needed: they don't ask money or clock items.
- Checked headless with a seeded profile (two clock misses from yesterday at level 1): both (`time-read-4:30`, `time-read-9:00`) came back as spaced items in the next Clock round. No console errors.

## 2026-11-23 — Spaced review in Phonics Pop, Word Builder, Story Sums (#25c)
- **What comes back is the same item, re-dressed**: Phonics Pop → the same letter (new balloon letters, possibly another picture variant); Word Builder → the same word in the same sentence (`ending-jumped-Yesterday, I {}.`), tiles reshuffled; Story Sums → the same story kind, thing and numbers (`wp-addTo-mango-3-4`) with **new names, wording and scene**, so it feels like a fresh story but practises the same fact.
- **Pop the Answer letter misses count for Phonics Pop**: `pop-phonics-b` already unwraps to `phonics-b`, so no mapping was needed. Pop has no endings or story items.
- **Asked at the level it was missed at** (as in #25b): the letter is in that level's pool, the ending is in play there, the story's numbers fit its range. Story Sums' mode (pictures / pick the equation / build it) follows that level. If an id can't be rebuilt at its level (e.g. an `-ed` word at a level without -ed, or a letter not taught yet), the card is ignored and a normal item is shown.
- **Same limits as before**: ≤ 2 spaced items per round, never first/last, not right after two misses (easing wins — so a struggling round can skip a due item; it stays due for the next round), `mix: 'spaced'`, level unchanged, "Remember this one?" only heard with talking on. Spaced items skip the "not the same as last time" check, since they are picked on purpose.
- Checked headless with a seeded profile (misses from yesterday): `pop-phonics-t` came back in Letter sounds, `ending-jumps-Every day, Sam {}.` in -s -ed -ing, and `wp-addTo-mango-3-4` in Story sums (as "Diya has 3 mangoes… gives her 4 more"). No console errors.

## 2026-11-23 — Spaced review, math facts (#25b)
- **Split #25b** again: 25b = Feed the Monster + Number Line Hop (the +/− and number facts); 25c = Phonics Pop, Word Builder, Story Sums; 25d = Fun at the Fair, Tick Tock Clock. Each game needs its own "rebuild this id" path, and two games per run keeps the run small.
- **A fact is the same fact in Pop the Answer / Dinosaur Maze**: their math ids (`add10-3 + 4 = ?-7`, `missing-3 + __ = 8-5`, `count-🍪🍪🍪-3`, `placeValue-…-34`) are mapped onto the home game's id (`add10-3+4`, `missing-3+5`, `count-3`, `pv-34`) when the schedule is read, so a fact missed in Pop comes back in Feed the Monster / Number Line Hop, and one right answer there moves it on. Only wrapped ids are rewritten. Pop's compare items (⚖️ "which is bigger?") don't record the pair, so they can't come back — they're left out (their cards are filtered, never served as a random item).
- **Asked at the level it was missed at** (not capped at today's level like Word Detective): a fact's numbers and number line belong to that level. If a make-10 level gets a fact that doesn't cross ten (missed at the numbers-only level), it's played as plain hops on the 20 line instead of a broken "hop to ten" split. A missing-number fact to 20 asked at a "to 10" level gets choices up to 20.
- **Same tracks as Word Detective**: the track being played and the earlier tracks in the same game (e.g. a missed `add10` fact can come back while playing Subtract within 10). Same limits: ≤ 2 per round, never first/last, not while easing, `mix: 'spaced'`, level unchanged, "Remember this one?" lead-in only heard when talking is on.
- **Compare pairs** keep the pair and the more/fewer question; which plate is left/right is reshuffled.
- Checked headless with a seeded profile: a Pop miss (`pop-add10-6 + 3 = ?-9`) and a Number Line Hop miss from yesterday both came back as spaced items in the next Add within 10 round; a Feed the Monster missing-number miss came back in Missing number. No console errors.

## 2026-11-22 — Spaced review, word games (#25a)
- **Split #25**: 25a = scheduler + Sight-Word Catch + Word Detective (the "missed words" half); 25b = math facts and the other games, which each need a way to rebuild an item from its id.
- **No new table**: the schedule is replayed from the attempts log each time a round starts (last 45 days), so it can't drift from what the child answered and needs no migration. Fine at a few thousand attempts; revisit if it gets slow.
- **One result per word per local day**: any miss that day → back tomorrow (box 1). A day with only right, hint-free answers on/after the due day → next box (3 days, then 7 days, then it's done). Right answers before the due day (seen in normal play) don't move it. Calendar days, not 24 h, so "tomorrow" means after a night's sleep.
- **A word is the same word in any mode**: read-ship, build-ship, Pop the Answer's pop-sight-said and Dinosaur Maze items share one key per track. The spaced item comes back in the mode it was last missed in (read vs build).
- **At most 2 per round, never first or last**: the first item stays the easy warm-up; spaced items take the other review slot first, then a middle current slot. Not shown right after two misses (easing wins). Logged as `mix: 'spaced'` and, like review items, they don't move the level. Extra due words wait for the next round.
- **Word Detective** asks due words from the track being played and the earlier tracks in the game (a CVC word can come back while playing blends), at the level it was missed at (capped at the current level for the same track).
- **Lead-in** "Remember this one?" before a spaced item — only heard when talking is on (narration stays off by default). No other visible marker, so it doesn't feel like a test.

## 2026-11-22 — World map (#24)
- **Where it lives**: a 🗺️ button on each subject's Level Select opens "Math islands" / "Reading islands" — one island per playable track, in curriculum order along a zig-zag path. Tapping an open island plays that track at the child's current level. Home is unchanged.
- **The map is encouragement, not a gate**: Level Select and ▶️ Play next still play any track. Locked islands are grey with 🔒; tapping one wobbles it and says (tap-to-hear) "Play Short words and Tricky words a bit more to open this island!" — no failure sound.
- **Prerequisites** (new `PREREQS` in `engine/worldMap.ts`, none existed before): math — count → add10, sub10, placeValue, time; add10 → missing, add20, money; sub10 → sub20; add10 + sub10 → story sums; placeValue → more or fewer. Reading — letter sounds and tricky words start open; letter sounds → short words → sh/ch, blends, magic e, endings; magic e → ee/ai/oa; short words + tricky words → sentences, stories.
- **A prerequisite counts once it's halfway through its levels** (level ≥ ceil(max/2), e.g. Counting "up to 10") or mastered — waiting for full mastery would hide most of the map from a child who already adds. A track the child has started (played at its level, or placed above level 1 by the starting point) is never shown locked.
- **Bloom**: 🌱 open → 🌿 started → 🌷 halfway → 🌸 mastered (gold ring + gentle sway, off with reduced motion). A quiet level-down can drop the bloom back a stage (known edge: a level-down to level 1 resets the attempt count, so that island shows as not started until the next answer).

## 2026-11-21 — Parent dashboard (#23)
- **Reused the existing parent gate** (hold 3 s + multiplication, from AI1). The dashboard is a "📊 Progress" button at the top of Grown-ups, not a separate gate.
- **One child at a time**, with a chip row to switch when there are several profiles; opens on the child currently playing.
- **Time played = active time**: answers are grouped into sessions; gaps between answers up to 2 minutes count, longer gaps are breaks (the first answer of a session counts its own answer time). Shown per day for the last 7 local days. It slightly undercounts reading/listening before the first answer — better than counting a tablet left open.
- **Weak spot = a track under 70% right with at least 6 answers in the last 14 days** (the engine aims for ~80%, so 70% is clearly below target; 6 avoids flagging one bad start). **Tricky items** = the same item missed 2+ times in 14 days, merged across games (Pop the Answer / Dinosaur Maze items count with their base game's item: "pop-sight-said" = "said"); top 8 shown with readable labels made from item ids.
- **Levels and mastery** lists only started, playable tracks (level n of N, level label, age band, mastery bar, recent right/total; 🏆 when the top level is mastered); not-started tracks are one line of names. No "level down" history is shown anywhere — still never shown to the child either.
- Reads the last 30 days of attempts; all on the device, nothing sent. The "Explain this week" Claude summary stays parked in Needs Ankit.

## 2026-11-21 — Dinosaur Maze: wording + start + task read aloud (TV1d, Ankit's feedback)
- **"Dinosaur", not "Dino"** in everything said and shown: the game is now "Dinosaur Maze" and she's "Dinosaur Mom" (code names like `DinoMaze` unchanged; older log entries keep the old name).
- **Mom waits for the first sentence**: after ▶️ / raising a hand, the maze shows with "Help Dinosaur Mom find her babies!" said and on a banner; she starts walking when it's been said (at least 1.5 s, at most 6 s).
- **The whole task is read aloud** when a puzzle opens: what to do, how many hits, then the question ("Grab the right key with both hands! Hit it 3 times! … Which letter does sun start with?"). Tapping the question card or holding a hand on it reads the whole task again.

## 2026-11-21 — Dino Maze: spoken obstacles + babies' shouts (TV1c, Ankit's feedback)
- **Mom stops on the maze at each obstacle** (new "arrive" step): the obstacle pulses, a banner shows what it is and what to do, and it's said aloud ("Oh no! A locked door! … Grab the right key with both hands!"). The puzzle opens when the words are done (at least 3 s so the banner can be read; at most 10 s if speech stalls).
- **After each success the babies shout from the nest** in a high, quick voice (pitch 1.9) with a matching speech bubble, after the cleared line is said: "Yay! Come on, Mommy!", "You can do it, Mommy!", "Hurry, Mommy!"… — 8 shouts, no repeats in a game, and "Yay! Almost here, Mommy!" after the last obstacle; at the nest: "Mommy! We missed you!". Mom walks on once they've finished.
- **This game always speaks** (uses the tap-to-hear path, still silent when muted), even with talking off — the child stands back from the TV and can't tap 🔊; the question is spoken when the puzzle opens. Ankit's narration-off default is unchanged everywhere else. Since questions are spoken, **sight words are back in the mix** unless the app is muted.
- `say`/`tapSay` gained `pitch` and `onEnd` (runs when the whole text is spoken, at once when nothing is spoken, never when cut off).

## 2026-11-21 — Dino Maze round 2 (TV1b, Ankit's feedback)
- **Only the music is 8-bit**: the maze is now a garden — sandy path, rounded green hedges for walls, a leafy frame (no pixel checkerboard).
- **10 obstacles, 8 per game, one question each**: new ones are ice wall (smash), spider webs (chop), fallen tree (lift a log with both hands), lava stream (stand by a stone and jump) and coconut tree (reach up and knock one down). A game is 8 questions instead of 12; the maze grew to 11×6 so they fit with walking in between.
- **3–4 hits to choose an option** (picked per question, same for every option, shown as pips under each target and said in the instruction "Hit it 4 times!"). Each hit: the pip fills, the target glows yellow → orange → red, bumps, and plays a thump plus a note one step higher up a major arpeggio. The last hit chooses it; a wrong one wobbles and its count goes back to zero. Hits are 0.35 s apart at least (was 0.9 s per choice), a grab counts once until the hands let go, every jump counts. Touch: each tap is a hit.
- **Babies cheer back on the maze**: a right answer → the target bursts → back to the maze: the obstacle goes poof, the banner says what happened ("Crash! The ice wall broke!"), the babies in the nest jump with a "Yay!" bubble and the kids' cheer plays, then Mom walks on. (The full-screen "cleared" card and the in-puzzle step strip are gone.)
- **Slower walk**: 0.75 s per cell (was 0.32 s) with a smooth stride.

## 2026-11-21 — 📺 TV Games tile + 🦕 Dino Maze (TV1, asked for by Ankit)
- **Its own tile and screen**: a third home tile "TV Games" opens a list (one game so far) so more whole-body games can join later. Not tied to Move mode: the game opens the camera itself when it starts, and **pauses the app-wide Move-mode layer** while it's open (one camera, no hand cursor clicking things behind the game).
- **True mirror, full screen**: in a puzzle the camera fills the screen, mirrored, and the answer targets sit on top, so a child's hand on screen *is* their hand (unlike Move mode's reach-box cursor). Targets are placed where arms reach: shoulder height (rocks, keys), high (bats), long hanging vines, and stones along the bottom (you stand by a stone, you don't touch it). Same raise-a-hand-to-claim rule as Move mode; others in view are ignored.
- **Five moves, one per obstacle** (4 of the 5 obstacles per game, random order): **smash** = a hand on the rock that was moving fast just before (≥ 3.2 shoulder widths/s within 220 ms) — slow hovering only highlights; **karate chop** = same but moving mostly downward, so a sideways wave never cuts a vine; **two-hand grab** = both hands on the same key for 250 ms; **jump** = shoulders rise ≥ 0.3 shoulder widths above their slowly-tracked resting height while standing by a stone; **bonk** = smash, on bats up high. After any choice everything is ignored for 0.9 s, so one sweep can't hit two targets, and a new question ignores a swing or jump already under way. Speeds are in the child's own shoulder widths so near/far and small/tall children need the same effort. **Thresholds are first guesses** → TV2 to tune on the real TV.
- **3 right answers clear an obstacle, 12 per game.** Each right answer: the target bursts, a short kids' "yay!" cheer + claps (synthesized, child voices only), two baby dinos pop up with "Yay!", and Dino Mom steps forward on the obstacle strip (🦕 moving past 🔒→🔓, 🌊→🪨 stepping stones, 🌿→✂️ …). Cleared → "Click! The door is open!" and Mom walks on. Finale: Mom with her babies, then the usual stars + sticker screen.
- **Puzzles "different each time"**: a new maze and obstacle order each game, subjects alternate (math/reading, which comes first is random), items come from the Pop the Answer makers at the child's current level with 30% review of skills already reached, no-repeat keys per skill. 3 choices (2 when easing). Only the child's *current* skill per subject moves a level; reviews are logged only. **Sight words are skipped while talking is off** (they're listen-only); the question is also shown as text, and holding a hand on the question card for 1.2 s reads it out.
- **8-bit music**: an original 8-bar loop (25% pulse lead, triangle bass, noise hi-hat, 150 bpm) synthesized with Web Audio — no files, works offline, respects mute; plays only while Mom walks and fades out when a puzzle opens.
- **No age band**: Dino Maze has no levels of its own; it plays the existing levels (which carry age bands) at the child's place.
- **Touch fallback**: no camera / blocked → the maze shows with a ▶️ start, and targets are tappable. Escape leaves the game.
- Checked in a headless browser (no real camera: Chrome's fake camera and no camera): intro, walking, all five obstacle layouts, cheer, cleared screen, finale and reward; no console errors. Body moves are covered by unit tests with made-up frames, not by a real person yet.

## 2026-11-21 — Tick Tock Clock (#22)
- **S1 skipped again**: `public/sounds/raw/` doesn't exist (Needs Ankit), so this run took #22.
- **Six levels on the existing `time` track** (all Ages 5–6): o'clock (far choices, coloured hands) → o'clock + half past → same with look-alike choices, plain hands → **find the clock** (see "4:30", pick one of 3 clocks; abstract) → every 5 minutes with 5, 10 … 55 round the face → every 5 minutes, no help. Hour/half hour first matches CBSE Class 1–2 and US Grade 1; 5 minutes is US Grade 2. `range` = how many minute positions a level uses (1, 2, 12).
- **Real hour hand**: it moves on with the minutes (half past 3 sits between 3 and 4), because reading that is the skill. The near choices are the classic slips: half past 3 read as 4:30 (always offered on half-past items), 3:00 vs 3:30, ±5 minutes, the hour either side, and from 10 minutes up the minute-hand number read as minutes (3:20 → "3:04").
- **Times are said** "three o'clock", "half past four" (the usual Indian and British phrasing; US kids hear it too), and "seven twenty five" / "eleven oh five" for 5-minute times. Digital times are written h:mm, 12-hour, no a.m./p.m.
- **Help after a miss**: the hand the child misread glows, both hands turn colour (short orange = hour, long blue = minutes, with a tap-to-hear key), 5-minute clocks get the fives round the face plus a count-by-fives strip, and the spoken hint names the hand ("The short hand is just past the three"). Easing → an o'clock item with far choices.
- **No "Why?" helper** for the clock: the answer is a time, not one number or word, so the existing leak checks don't fit; the canned hints already point at the hand. Can be added later with a time-aware leak check.
- Clock drawn in SVG (no new icons). Not in placement (starts at level 1) and no Pop the Answer items, like money. Hands shortened so they never cover the numbers.
- Checked in vite preview (levels 1, 3, 5, 6, a miss on a 5-minute clock, find-the-clock); no console errors.

## 2026-11-20 — Fun at the Fair, money (#21)
- **S1 skipped again**: `public/sounds/raw/` doesn't exist (Needs Ankit), so this run took #21.
- **Five levels on the existing `money` track** (all Ages 5–6): pay to 10 with ₹1/₹2/₹5 coins (total shown) → pay to 20 with coins and ₹10/₹20 notes (total shown) → pay to 20, count it yourself → change from ₹10 (count-up strip shown) → change within 20 (paid with ₹20, near choices, strip only after a miss). Paying (concrete) before change (pictorial/abstract) is CPA; change-from-10 restarts at a smaller range, so the tracks test now allows a smaller range when the representation steps up.
- **"$" setting = US cents**, not dollars: pennies, nickels and dimes are the US Grade 1–2 coins and keep the numbers within 20. Change is from a dime (within 10) and from a quarter (25¢ − 5..24¢, so change stays 1–20). Grown-ups → "Money at the fair", per device, rupees by default.
- **Coins and notes drawn in CSS** (₹ steel coins, brassy ₹5, brown ₹10 and green-yellow ₹20 notes; copper penny, big nickel, small dime), with the value printed on them, instead of pictures of real currency.
- Overpaying is allowed (it's a gentle miss with a "tap a coin to take it back" hint); the tray holds at most 12 coins. Tapping a coin says its value (tap-to-hear, so it plays even with narration off). Easing → a tiny price with ₹1/₹2 (pennies) and the total shown.
- **"Why?" helper only on change questions** (one number to find, like the other math games); pay questions keep the canned "add N more / take one back" hints, because the answer is a set of coins.
- Not in placement (money starts at level 1); no Pop the Answer items for money.
- Checked in vite preview (pay with ₹, change in US cents with a miss); no console errors.

## 2026-11-20 — Picture variety (I2b)
- **One variant table keyed by the main icon** (`src/content/pictureVariants.ts`, `ICON_VARIANTS`) instead of an `alt` field on `PictureWord`, letters and endings: the same picture (cat-face, sun, soccer-ball…) appears in several content sets, and one table makes it vary the same way everywhere with no copies to keep in sync. Content files are unchanged.
- **What counts as a variant**: the OpenMoji drawing of the same thing, and/or a related Fluent icon (cat-face → cat, sun → sun-with-face, clock → alarm-clock, boat → canoe, apple → green apple). 1–2 per picture, so 2–3 pictures in all; 68 word/letter/ending pictures vary. Never a picture of a `near` look-alike (hat has no cap variant, boat no boot). Rendered a contact sheet of all of them and dropped three that didn't read at a glance (OpenMoji shell, soap, delivery truck). No variants for cup (Fluent's ☕ reads as coffee), jug or lamp (only OpenMoji draws them). Sentence clues, stories, stickers and Magic-e pairs keep one picture (not in the item).
- **Picked once, when the item is made** (`pickIcon(icon, rng)`), stored in the item's `icon` / `pictures` / `answer`, so retries, hints and the answer check all see the same picture. `pickIcon` doesn't touch the rng for pictures with no variants.
- **Read it**: distractor pictures are now de-duplicated by word as well as picture, then each gets its own variant, so one item never shows two pictures of the same word; the answer is the target's chosen picture.
- **No-repeat keys ignore the picture**: Placement and Pop the Answer used the picture in their "don't repeat the last item" key; for picture items they now use the question + answer, so cat → (different) cat doesn't count as a new item.
- +82 SVGs (≈ 470 KB for all icons, precache ≈ 1.26 MB). Not checked in the running app this run (tests, build and the contact sheet only).

## 2026-11-19 — OpenMoji extras + credits (I2a)
- **Split I2**: I2a = OpenMoji as a second icon source, credits, filling gaps; I2b = 2–3 picture variants per word (random, stable within an item). Variants touch five games, too much to do well in the same run.
- **Naming**: OpenMoji icons are `om-<OpenMoji name>` in content and on disk (`public/icons/om-milk-jug.svg`), so one flat namespace and the existing `<Icon name>` keep working; unprefixed = Fluent. Artwork is unchanged (only the `<svg>` wrapper, viewBox 72×72, is added).
- **Fallback emoji**: OpenMoji extras live in the Unicode Private Use Area, so they have no system emoji. `OM_FALLBACK` in `scripts/build-icons.mjs` gives the nearest emoji (jug → 🥛, bin → 🗑️, lamp → 💡), shown only if the SVG fails; the build fails if one is missing, so no picture can render blank.
- **Quick items carry the icon name**: Placement and Pop the Answer showed word pictures as emoji text (re-mapped to Fluent), which would turn an OpenMoji picture into the wrong Fluent one (cup → top view of coffee, jug → glass of milk). They now render `<Icon name>`; `visual` keeps the emoji as fallback text.
- **Content changes kept small**: cup → OpenMoji's side-view cup with handle (Fluent's ☕ is seen from above and reads as "coffee"); new words jug, bin (CVC) and lamp (blends) with look-alikes (jog/mug/bug, pin/bun/ban, lump/limp/camp). No other picture swaps — the rest of the Fluent pictures read fine.
- **Nothing to restore**: git history shows no word ever removed from `words.ts`, endings, letters or word problems (I1b converted every emoji to a name), so "restore dropped words" had nothing to do.
- **Credits**: `CREDITS.md` (new; S1's sound credits can go there too), README Credits, and a small "About & credits" card in Grown-ups (behind the parent gate, so the outbound links aren't in front of kids). CC BY-SA is satisfied by attribution + licence link; we don't modify the artwork.
- Not checked in a browser this run (build and tests only); the four OpenMoji SVGs were rendered and look right.

## 2026-11-19 — No narration on read-it-yourself levels (Ankit)
- Ankit: switch narration off on advanced levels where kids should be able to read. With "talking" on, the app was still reading out what the child was meant to read (Story Sums read the whole story problem; stories said the title and read the answer line back; sentences were read back after a miss).
- Which levels: those where the child reads a sentence or story on their own — `READS_ALONE_FROM`: Sentences (both levels), -s -ed -ing level 3 ("read it yourself"), Stories levels 2–3, Story Sums levels 2–3. Levels labelled "read to you" are never silenced (tested).
- Not included: letter sounds, short words / sh ch th / blends / magic e / vowel teams, tricky words, Pop the Answer — the spoken sound or word is the question there ("Pop the word *was*", "Build the word ship"), so silencing would break the game.
- On those levels *all* automatic speech is off for that item (prompt, praise, read-backs, spoken hints), not only the text. Tap-to-hear (🔊, a word, the story card) still works and is how a child gets help. Set per item, so a review/stretch item from a read-to-you level still talks; an "easy" story after misses (read to you) talks too.

## 2026-11-19 — Icons everywhere in the UI (I1c)
- **Wrap, don't rename**: UI strings keep their emoji and render through `<Emoji text>` (it splits text into bundled pictures + plain text). Fewer moving parts than switching every button to icon names, and the emoji stays the readable fallback.
- **Load-failure fallback**: `<Icon>` swaps to its emoji (`fallback`, else `ICON_EMOJI[name]`) when the SVG fails to load (`onError`). Checked in a browser with `/icons/*.svg` blocked: every picture shows as system emoji, nothing goes blank.
- **Data-driven text too**: profile avatars (still stored as emoji), the Pop/Placement `visual` text (🍎🍎 + 🍏 …), confetti pieces, Move-mode badge/chips and the Settings connection status all go through `<Emoji>`. `white-space: pre-line` still breaks the visual onto two lines (text pieces are spans).
- **Guard test** (`components/rawEmoji.test.ts`) parses every `.tsx` with the TypeScript compiler: emoji in JSX text, or string literals with emoji rendered directly as a child (`{'⭐'.repeat(n)}`, `{on ? '🙌' : '👆'}`), fail. Attributes, aria-labels, comments and plain data are allowed. It can't follow variables, so a browser check confirmed no emoji text nodes on the profile and home screens.
- **Left as-is**: the Move-mode camera preview draws its labels (⭐ Player, 🙋 Hold it…, ✋ on the hand) with canvas `fillText`; that's a grown-up/debug overlay and an `<img>` there isn't worth it. Spoken text and aria-labels never had emoji to swap.

## 2026-11-18 — Content refers to icon names (I1b)
- **Split I1b again**: I1b = content data by icon name (+ resolution test); I1c = the rest of the UI emoji (home, buttons, badges, reward, Pop balloons). Doing both in one run was too big.
- **Names are Fluent Emoji names** (`cat-face`, `sun`, `diya-lamp`), not our own aliases: no second mapping to keep in sync, and the name says which SVG ships. A converter swapped every emoji literal in content for its name, so the pictures are unchanged.
- **Bundling**: `npm run icons` now also loads `src/icons/contentIcons.ts` with Vite's `ssrLoadModule` (no regex conventions in content) and fails on an unknown name. The generated map gains `ICON_EMOJI` (name → emoji, single BMP symbols get U+FE0F) used for fallback text and for places that still need a plain string (the quick-item `visual` in Placement and Pop the Answer — moves to `<Icon>` in I1c).
- **Story topic "family"** now uses `people-hugging` (🫂): 👪 had no Fluent icon, so every picture in the app is now a bundled SVG.
- **Not changed (saved data)**: profile avatars stay emoji strings (they're stored on the device in each profile); sticker ids are unchanged, so collected stickers keep working. AI stories already cached on a device carry an old `emoji` field and no `icon`; the story icon isn't shown anywhere, so they still play.

## 2026-11-18 — Bundled icons + fonts (I1a)
- **Split I1**: I1a = icon pipeline + fonts + the main picture spots; I1b = content files refer to icon names + the rest of the UI emoji. Converting every content file and every button in one run was too big to do well.
- **Fluent Emoji flat** (not 3D): flat SVGs are ~1.3 KB each (234 icons ≈ 300 KB on disk, whole precache ≈ 1.1 MB), crisp at any size; 3D is PNG-only and far bigger. Source: `@iconify-json/fluent-emoji-flat` (MIT, devDependency) — its `chars.json` maps emoji → icon name, so `scripts/build-icons.mjs` scans `src/` for emoji and copies only the used icons. SVGs are committed (the build does not need the generator); a test fails if the map is stale, telling the next run to `npm run icons`.
- **Emoji → icon at render time for now**: `<Emoji text>` swaps each emoji that has a bundled icon for `<img class="icon">` sized 1em (so existing font-size CSS keeps working, `pointer-events: none` so taps and Move-mode hits go to the button). Content still holds emoji until I1b. Only 👪 (family) has no Fluent icon → stays a system emoji.
- **Fonts**: Nunito as the variable font (one file per subset covers 400–900; the CSS used 400–900), Andika 400 + 700 Latin only (800/900 in CSS render as 700). Precache now includes `svg` and `woff2`; `prototypes/` is kept out of it.
- Checked in a browser (vite preview): icons and Nunito load on the profile screen. Not checked on iOS/Android devices.

## 2026-11-17 — Move mode offline (M4b)
- **Models committed, wasm copied at build**: the two `.task` models (hand 7.8 MB, pose lite 5.8 MB, Apache 2.0) are committed under `public/mediapipe/models/`. The wasm runtime (~19 MB for SIMD + no-SIMD) is *not* committed: `scripts/copy-mediapipe.mjs` copies it from `node_modules/@mediapipe/tasks-vision/wasm` before `npm run dev` / `npm run build` (npm pre-scripts), so it always matches the installed package version and keeps git small. Both variants ship because MediaPipe picks one per browser; only the one used gets cached.
- **Caching**: `mediapipe/**` is excluded from the precache (would add ~33 MB to every install, even for touch-only players) and runtime-cached **CacheFirst** in `mediapipe-v1` the first time Move mode starts. Bump the cache name when upgrading `@mediapipe/tasks-vision` (noted in `public/mediapipe/README.md`).
- **CDN fallback kept**: the tracker tries the self-hosted copy first and falls back to jsDelivr / Google Storage if it fails (e.g. a host build command that skips the npm pre-script). Offline with nothing cached → same error path as before.
- Checked with `vite preview` that the files are served (wasm as `application/wasm`); not yet tried with a real camera or in airplane mode on a device.

## 2026-11-17 — TV mode: scroll pads always there, bigger menus, steadier cursor (Ankit)
- **Scroll pads**: they appeared only after a player had claimed the turn ("⭐ Playing"), so in TV mode — where the turn drops whenever the player lowers their hand or steps out — they were mostly hidden. They now show whenever Move mode's camera is running and the page can scroll that way (`padsVisible`). Hand mode already showed them almost all the time, which is why the laptop looked right.
- **Bigger buttons**: new `body.move-tv` class (Move mode + "standing back"). Menus and small targets grow: ⬅️ Back / 🔊 / home top buttons ≈ 120 px on a 1080p TV (were ≈ 97), level chips ≈ 108 px (were 65), track rows, starting-point choices, avatars, profile cards, story answers. Kept the root size unchanged: a 1.15× / 1.35× global scale-up was tried at 1080p and pushed answer buttons below the fold in Missing number, Tens and ones, Story sums, Add within 20 and Stories. Game answer buttons were already 110–300 px.
- **Less jitter** (body tracking only): One Euro steadier at rest (minCutoff 0.55 → 0.45), plus a dead zone — the cursor ignores wobbles under 1.5% of the screen's short side (≈ 16 px at 1080p) and follows real moves without a jump — and a wider sticky margin while holding a button (4.5% ≈ 49 px, was 28). Close-to-laptop mode is unchanged. Not yet tried with a real camera.
- Already overflowing before this change (depends on the item): Tens and ones and some Missing number / Stories items run 20–240 px past the bottom at 1080p and 720p. The pads cover it for now; a tighter TV layout for those games would be a follow-up.

## 2026-11-17 — Pop the Answer (M3)
- A mechanic over existing tracks, not a new track: no new levels, so no new age bands. Items come from the quick-item generators (counting, + / − within 10 and 20, missing number, tens & ones, compare, short-word patterns), Phonics Pop and Sight-Word Catch. Story sums, endings, sentences and stories are left out (they need more than a short label on a balloon).
- Entry point: a pink **🎈 Pop!** button under ▶️ Play next on Level Select. It plays the child's next unmastered skill if Pop can play it, else the furthest Pop skill they've reached. Results feed the same adaptive engine (only current-level items move the level), round mix (review/stretch kept to Pop tracks), stars and stickers; reward ▶️ replays Pop.
- At most 4 balloons (2 when easing after two misses); phonics keeps the b/d look-alike balloon on the top level. Balloons rise slowly (9–12 s a trip) and come round again, so there's no clock and no "missed it".
- Gentle failure: a wrong pop wobbles and fades; **only the first wrong pop per item counts as a miss** (a waving hand can brush several balloons, so no penalty spiral). After two different wrong pops the answer balloon glows. No Claude "Why?" hint here yet.
- Hand input: the backlog said "any fingertip"; the Move-mode layer drives one cursor (the claimed player's hand), so Pop uses that. New `data-motion-hold` attribute lets an element ask for a shorter hold: balloons pop after a **250 ms** touch (`TOUCH_HOLD_MS`) instead of 0.9 s, long enough that a hand sweeping past doesn't pop. Touch/mouse pop on pointer-down (a moving balloon is hard to "click").
- Reduced motion: balloons sit still in a row. Sight-word items are listen-only (👂, tap to hear) since the word is the answer; with narration off the child taps 🔊/👂 like in Sight-Word Catch.
- On a phone, 4 balloons in lanes can overlap sideways (at different heights). Not tried with a real camera.

## 2026-11-16 — Read-aloud coach options (AI4, write-up only)
- Write-up in `docs/read-aloud-coach-options.md`; recommendation is **on-device Whisper tiny.en (8-bit, ≈ 40 MB, lazy-loaded, off by default)** + a deterministic word-alignment checker in code. Decision moved to "Needs Ankit".
- Ruled out cloud Web Speech recognition (Chrome sends audio to Google; Safari to Apple) under SPEC "no third-party data sharing". Chrome's on-device mode is desktop-only for now, so it can't cover a tablet; kept as a possible later fast path.
- Claude checking the transcript adds no accuracy and needs the network; judging is done in code. Claude may later give a checked hint for a stumbled word via the AI3 `whyHint` path.
- Sizes/speeds are from public sources and estimates; must be measured on the family's devices before building.

## 2026-11-16 — "Why?" helper in Story Choose questions (AI3d)
- Request = the question plus the line that answers it (`What did Sam get? The story line: "Sam got a big red hat."`, ≤ 160 chars for every built-in story — tested), the answer and what the child picked. Story names are made up; nicknames are still redacted by the client.
- Leak check: the hint must not say or spell the whole answer, nor its **key words** (`hide`, device only): answer words that aren't little words (a, the, in, on…) and aren't in a wrong choice, plus plurals ("in the hat" vs "in the box" → hat, hats). If only a little word differs ("in the box" vs "on the box"), that word is hidden. So quoting the answer line is rejected — Claude has to point at it ("Find the line about what Sam got").
- On the 2nd miss, a passing Claude hint replaces "Let's look at the story again.", the answer line lights up at once, then the line is read as before. The hint is also shown as a 💡🔊 bubble under the question (tap to hear), because with narration off (the default) `say()` is silent and the hint would otherwise never reach the child. When narration is on, the line reading waits for the hint (≤ 5 s).
- Noticed, not changed: in the other games the Claude hint goes through `say()` only, so with narration off it's never heard. Worth the same bubble treatment in a later item if Ankit agrees.

## 2026-11-16 — "Why?" helper in Phonics Pop, Sight-Word Catch, Word Builder (AI3c)
- **Phonics Pop**: the answer is a letter, so the leak check (`namesLetter`) rejects the letter on its own ("s", "S", "/s/", "s-u-n", "capital S") and its spoken name ("ess", "bee", "tee"…). Letters inside words don't count. For a / i / o this also rejects the words "a", "I", "oh" — conservative on purpose; those hints fall back to the canned one. The picture word (sun) may be said. On a miss the child still hears "That's B, like ball"; the Claude hint replaces the repeated prompt.
- **Sight-Word Catch**: the word is spoken in the prompt, so the hint may say it (`sayWordOk`) but not spell it — the canned hint spells it, Claude's must help another way. One-letter words (a, I) can't leak.
- **Word Builder**: the answer is the ending; new `WhyContext.hide` lists other words that give it away (the finished word, "jumping"). Naming "-ing"/"ed"/"s", spelling it or saying the finished word is a leak. `hide` stays on the device (not sent). Claude's hint replaces "Hmm, does that sound right?" after the child hears their version of the sentence.

## 2026-11-15 — Move mode: scroll pads, claimed hand only, newcomers ignored (Ankit)
- Scrolling: Ankit picked "edge strips". A full-width strip at the top would sit on ⬅️ Back / Levels, so the ⬆️ / ⬇️ pads go in the space Move mode already keeps free for the camera: the right column above the preview (landscape) or beside the preview at the bottom (portrait; content can scroll under them there). They show only while someone is playing and the page can scroll that way. Speed: nothing for 0.2 s (passing over), then 0.2 → 0.9 screen heights/s over 0.9 s. Hand on a pad never presses buttons.
- Hand: the hand raised to claim the turn is the only cursor hand for that turn; the other hand is ignored even when higher. Switching hands = let the turn lapse (2 s out of view) and claim again with the other hand.
- Who's playing: dropped the "two bodies equally close → no cursor" rule (it froze the cursor whenever someone stood next to the player; Ankit: don't handle crossovers). A body now counts as the player only if it is within ~1 shoulder width + 3 per second unseen (max 0.25 of the picture) of where they were, and within 1.5× their size in the picture.

## 2026-11-15 — Screens scale to any size; steadier TV cursor (Ankit)
- All CSS sizes are now `rem` (were px). One root rule scales everything: `clamp(16px, min(1.25vw, 2vh), 40px)`. 16px up to laptop size (what the layouts were tuned at); a 1080p TV gets ~1.35×. Taking the smaller of width and height keeps wide-and-short screens (16:9 TV, 21:9) from spilling off the bottom. Phones held sideways (≤500px tall) drop to 13px; long games there still scroll.
- Move-mode camera preview is now at most 25% of the screen width (was 30%), so it doesn't eat the game area on a TV.
- TV jitter, four fixes: (1) the reach box is built from a *smoothed* body frame (shoulder wobble × box scale was the main shake); (2) the cursor sticks with the hand it started on unless the other hand is clearly higher (it used to flick between two raised hands), and may sag a little below the lift line before stopping; (3) hand point is a confidence-weighted average, so a knuckle fading in/out nudges instead of jumps; (4) a hold on a button survives the cursor wobbling up to 28px off its edge. Body mode also uses a steadier One Euro setting than fingertip mode.
- TV mode now shows the tracked hand in the camera preview: the player's driving arm in green and a ring with ✋ on the hand.
- Not verified with a real camera at TV distance (no camera in the build environment); the filter numbers (`EURO_BODY`, `createBodyFrame` 350 ms, `STICKY_PX`) are the knobs if it feels laggy or still shaky.

## 2026-11-15 — Merged two parallel "narration off" builds
- Two sessions built narration-off-by-default at the same time. Kept the local design (`tapSay`, 🗣️/🤫 toggle, Silent mode, age bands), which later commits, SPEC.md and CLAUDE.md build on; the remote `speak()` version was dropped. Both use the same `localStorage.narration` key, so a device's setting carries over.
- Its one different behaviour (L1 stories wait for "read to me" when narration is off) was not kept: Ankit's call below is that read-to-you stories still read themselves.

## 2026-11-15 — Subject tiles open the levels (Ankit)
- Math / Reading tiles now open Level Select (after the one-time starting point) instead of jumping into the auto-picked game. The auto pick lives on as a big ▶️ Play next button at the top of Level Select. Picking a starting point also lands on Level Select.
- Tiles show the subject name ("Math", "Reading") above 1 2 3 / a b c; the "🗺️ … levels" links under the tiles are gone (the tiles do that now). Level Select's title is the subject name.

## 2026-11-15 — Age bands are 3–4, 4–5, 5–6 (Ankit)
- Ankit: highest range is 5–6, lowest is 3–4. Bands renamed (`a34`, `a45`, `a56`; display only, nothing saved uses them).
- 3–4: counting to 3/5, first letter sounds (s a t p, i n). 4–5: counting to 7/10, adding/subtracting within 10 with pictures, make-10 with pictures, picture story sums, more letter sounds, first short-word level, first tricky words. 5–6: everything else built today (numbers-only within 10/20, tens & ones, comparing, digraphs, blends, magic e, vowel teams, endings, sentences, all stories); planned money/clock/groups also 5–6.
- Supersedes the "advanced learner" bands below.

## 2026-11-15 — Age bands recalibrated for an advanced learner (Ankit)
- Ankit: reading stories and answering questions is a 5–6 skill; the app targets smart kids. Bands moved about a grade earlier than Common Core: Ages 5–6 now covers all phonics, short words, sh/ch/th, blends, first magic-e level, all stories, tricky words 1–2, adding/subtracting within 10 incl. numbers only, first make-10, first tens & ones and compare levels, first two story-sum levels. Ages 6–7 has the rest (within 20 numbers only, tens & ones to 100, close comparisons, vowel teams, -ed/-ing reading yourself, magic-e look-alikes). Nothing built is Ages 7–8 now; planned money/clock/groups are 6–7.
- Section subtitles changed from grade names to "K–Grade 1 skills" / "Grade 1–2 skills" / "Grade 2+ skills" so they stay honest.
- Display only: the adaptive engine and placement still set each child's level.

## 2026-11-15 — Narration off by default; levels grouped by age (Ankit)
- "Narration" = speech the app starts by itself (instructions, item prompts, praise, counting along). Off by default; the home 🔊 button became 🗣️/🤫 (talking on/off) and Grown-ups has the same toggle.
- Speech the child asks for still plays with narration off: 🔊 "say again", tapping a picture, a story word, an avatar, a sticker, the voice preview (`tapSay`). Without this, pre-reader games (Phonics Pop's letter sound, Build it's spoken word) would be unplayable. Stories at the "read to you" level still read themselves (`sayAlong`), since reading to the child is that level's content.
- The old all-sound mute moved to Grown-ups as "Silent mode" (no voice, no sound effects, even on tap). Sound effects stay on by default.
- Age bands per level from US Common Core (K.CC, K.OA, 1.OA, 1.NBT, K.RF, 1.RF, 2.RF; Dolch lists for tricky words). A track can span bands (e.g. Add within 10: two K levels, then Grade 1 for numbers only); Level Select shows the track in each age section with only that section's level chips. ▶ plays the child's current level when it's in that section, else the section's first level. Grade 2 shows only where a level is Grade 2 (vowel-team look-alikes, read-it-yourself stories) — math Grade 2 tracks aren't built yet.
## 2026-11-15 — Narration off by default (superseded by the merge above — remote build, not shipped)
- New Grown-ups toggle "💬 Talk by itself", **off by default**, per device (`localStorage.narration`). Off: screen prompts, answer feedback, hints and Move-mode prompts are silent; speech the child asks for still plays — every 🔊 "say again" button, tapping a title, word, picture or sticker, avatar names, the voice sample and "read to me". The 🔊/🔇 mute button still silences everything.
- In code: `say()` is narration (gated); `speak()` is asked-for speech (always, unless muted). New tap-to-hear code should use `speak()`.
- Stories: on read-to-you levels (L1) with narration off, the story isn't read aloud by itself — the "read to me" speaker is shown instead, and using it there doesn't count as a hint.

## 2026-11-15 — Hosted on Vercel (Ankit's call)
- Static Vite build on Vercel (Hobby, `*.vercel.app`), connected to this repo: every push to `main` deploys. No login, no custom domain for now. HTTPS there is also what the camera (Move mode) needs.
- Scheduled runs keep pushing to `main` (Ankit didn't ask for a review branch), so the test + build gate before every push is now the safety net for what the kids see. CLAUDE.md updated.
- No child data reaches Vercel: progress lives in each browser's IndexedDB; Vercel only serves files.

## 2026-11-15 — Move mode: smoother cursor (Ankit: "hand movement is not very smooth")
- Cause: the cursor only moved when a camera frame was tracked (≈15–30 fps) and used a fixed EMA (laggy and still jittery).
- Fix: tracking sets a *target*; the cursor is drawn every screen refresh and glides toward it (exponential, frame-rate independent, rate 20/s). Hit-testing and the hold ring also run per display frame.
- One Euro filter replaces the EMA: strong smoothing when the hand is still (steady while holding on a button), light when it moves fast (little lag). minCutoff 1.2 Hz, beta 0.004 (px/s).
- Body mode cursor point = mean of the wrist and the same hand's pinky/index/thumb points (when visible): steadier than the wrist alone.
- Camera asks for 30 fps. Possible next step if still choppy on the TV laptop: run the tracker in a Web Worker so detection never blocks drawing.

## 2026-11-15 — Move mode M4a: body tracking + raise-hand-to-claim (with Ankit)
- Body (pose) tracker is the default Move mode: it sees whole people (so a hand belongs to a body), works at TV distance, and makes "hand raised" easy (wrist above nose). The fingertip tracker stays as "Close to the laptop".
- Claim = a wrist above the head for 1 s (highest hand wins if two go up together). Follow = nearest shoulder-centre to last frame, max jump 25 % of the image; if two bodies are within 1.2× of each other (crossing paths) the cursor pauses that frame instead of guessing. Gone for 2 s → turn is free.
- Cursor = the player's higher wrist, and only when lifted above mid-body (between shoulders and hips) — arms at the sides must not press buttons by accident.
- Wrist → screen is relative to the player's own body: a reach box 4 shoulder-widths wide × 3 tall around the shoulders, so a child can reach every corner without walking, wherever they stand.
- Pose lite model (~6 MB) for speed on a laptop; up to 3 people.
- Preview: 30 vw (240–480 px), 16:9 in body mode so nobody at the edge of the room is cropped out; pages get right padding (landscape) / bottom padding (portrait) so buttons aren't under it.

## 2026-11-15 — Move mode (M1, M2) built interactively with Ankit
- Hand-as-mouse layer instead of per-game motion code: all games already answer via `<button onClick>`, so one root layer (`elementFromPoint` → nearest enabled button → hold → `click()`) makes every game playable by hand with no game changes.
- Hold-to-choose (0.9 s) rather than "touch = click": webcam tracking jitters, and a filling ring forgives it. Holding on keeps firing every 0.9 s so Feed the Monster can take cookie after cookie.
- Cursor = index fingertip, mirrored; the middle 80 % of the camera frame maps to the whole screen so corners are reachable. One hand tracked.
- `@mediapipe/tasks-vision` 0.10.14 added as a dependency (JS bundled into a lazy chunk, ~39 kB gz). The wasm runtime (jsDelivr) and hand model (Google storage) are fetched at runtime the first time Move mode starts — too big to precache (~9 MB + ~8 MB) and the build sandbox couldn't download the model. No child data is sent; only files are downloaded. Self-hosting for offline is M4.
- Parent gate and the 🙌 toggle are `[data-no-motion]` so a waving hand can't switch modes or enter the grown-ups area (the gate's press-and-hold also needs real pointer events).

## 2026-11-15 — AI3b "Why?" helper in the math games (split again: AI3b math, AI3c 3 reading games, AI3d Story Choose)
- AI3b covered six integrations of different shapes, so it was split: this run does the two math games (Feed the Monster — all four modes — and Story Sums). AI3c = Phonics Pop, Sight-Word Catch, Word Builder; AI3d = Story Choose questions.
- Counting and tens & ones feed modes: the "answer" is the target number, even though it is on screen. So a Claude hint can't say it ("count to 8" is rejected). Strict on purpose: the canned hint already says the target, and a Claude hint there should be about *how* to count (tap each cookie, boxes first). The request also leaves the target out of the question, so Claude isn't tempted.
- Question texts avoid number words that could equal the answer by accident ("one by one", "boxes of ten" → "full boxes"), so the request itself never contains the answer unless it's a number the child is shown (5 + ? = 10, or a story where 8 − 4 = 4).
- Compare: the answer is one of the two plate numbers and both are in the question; the hint may name the other plate but not the answer plate.
- Story Sums, per step: answer mode / build number → the result; equation mode → "a plus b" (the equation without its result); build sign step → "plus"/"minus". So a sign hint may not say "plus" (or "minus") — it has to talk about getting more / going away. The leak check for non-number answers now also normalises + / − and number words, so "5 + 3", "five plus three" and "5 plus 3" all count as giving it away.
- Story Sums requests: story + question if ≤ 160 chars, else question first then the story (cut at 160) so the question is never the part that gets cut. Story names are the built-in ones (Riya, Sam…); `redactIdentifiers` still swaps a name if it matches a local nickname.
- Cache key includes the round index (`index:itemId[:step]`) so an item id seen twice in a round still gets its own hint.
- When a Claude hint is used it replaces the whole canned hint, including "Not seven." / "That's twelve." prefixes — same as Number Line Hop.

## 2026-11-14 — AI3a "Why?" helper (split: core + 2 games now, other games in AI3b)
- AI3 touches all 8 games, so it was split: this run builds the checked hint pipeline (`src/ai/whyHint.ts`) and wires it into one math game (Number Line Hop) and one reading game (Word Detective). AI3b wires the rest.
- One Claude request per item (per step for make-10 items). If it fails or is rejected, later misses on that item use the canned hints (no retry: the 2 s budget leaves no room).
- The game waits for the hint (≤ 2 s) before speaking; the "oops" face and wrong sound play at once, so the child sees feedback immediately.
- Leak rules: math — if the answer is a number, it may not appear as digits or words ("7", "seven", "thirty-four"); other answers may not appear as written. Reading — the word may not be spelled out ("c, a, t", "c a t", "sh-i-p"); in Read it and sentences it may not be said either (that would do the reading); in Build it the word is spoken anyway, so saying it is allowed. Erring strict is fine — a rejected hint just means the built-in one.
- Also rejected: > 160 chars, > 2 sentences, > 14 words per sentence, anything other than letters/digits/basic punctuation (no emoji or links), kid-safe blocklist hits.
- Word Detective keeps the useful per-miss prefix ("That's dog.", the sentence read with their word, "Fix the red one") and replaces only the hint part with Claude's text.
- Level is sent 1-based (engine levels are 0-based; the request whitelist clamps to 1–20). Track ids are stripped to letters/digits to fit the whitelist.

## 2026-11-14 — C3 silly stories
- Rewrote 41 of the 43 built-in stories so each has a silly situation and a punchline last line (a pig gets off the bus "at the mud", the dog yells "Six!", a goat steps off the train). Kept "Glen Has a Plan" (box rocket → "Glen, lunch!") and "Grapes and a Lime" as they were already funny; small tweaks elsewhere. Story ids kept so saved "recent stories" still match.
- Added 10 new stories, 2 per pattern (Gus and the Wig, Pip the Yak, The Long Nap, Bath for a Yak, Pig in a Pink Dress, The Big Gift, The Snake and the Cake, Duke and the Flute, Toad on a Boat, Dee Can Not Sleep): 53 total, 10–13 per pattern.
- Where a new punchline made an old question ambiguous (e.g. Mom now also slips in the mud), the question was changed rather than the joke.
- The decodability rules make many funny words off-limits ("no", "me", "oops", "quack", apostrophes like "Raj's"), so jokes lean on situations and on decodable sounds (Bam, Ding, Splat, Yuck, Ruff).
- Added tests: last line ends in "!" or "?", ≥ 50 stories, no pictures in titles/lines/choices, built-in stories pass the kid-safe word list.

## 2026-11-14 — Story answers: words only (Ankit request, interactive session)
- Ankit chose to remove the pictures from Story Choose answer choices too (257 choices). Answers are now words only; on level 1 the choices are still read aloud, so pre-readers answer by listening. This supersedes the "kept pictures on the answer choices" point below.
- Only Stories changed. Other reading games keep pictures where the picture is the task or a level-1 clue: Word Detective "Read it" (read the word, tap the picture), Phonics Pop, Word Builder and finish-the-sentence clues.
- Claude stories: any picture on a choice is dropped, and emoji inside any text (line, question or choice) now rejects the story.

## 2026-11-14 — Stories: text only, funny first (Ankit request, interactive session)
- Removed the pictures beside every story line (210 lines) and the title picture: a child could match the line picture to the same picture on an answer choice without reading. Lines are now `{ text }` only, and Claude stories have any line pictures dropped by the checker. Tests guard both.
- Kept pictures on the **answer choices**: on level 1 the app reads the story and the choices aloud, and pictures help a pre-reader pick; with no pictures in the story there is nothing to match them against, so they now test understanding. Easy to remove too if Ankit prefers words only.
- SPEC "Stories" added: funny/silly first, gentle humour, punchline last line. Claude's story prompt (proxy) now asks for a silly story with a funny twist. Rewriting the 43 built-in stories is backlog item C3 (top of Next), so the next build run does it with the decodability tests.

## 2026-11-13 — C2: more word problems + sentences (scheduled run)
- **Word problems are now templates as data** (`content/wordProblems.ts`): story frames with small placeholders (`{P}`, `{He}`, `{his}`, `{A}` = number + noun, `{b?comes|come}` for verb agreement), filled by `fillFrame` in the generator. The first frame of each list is the old wording, so variant 0 reads exactly as before.
- **×3 growth**: names 14 → 44 (22 from across India, 22 US); things 15 → 54 (Indian everyday where an emoji exists: roti, momo 🥟, coconut, diya 🪔, lantern 🏮, parrot, peacock, monkey in the tree; no emoji for laddoo/samosa/idli, so left out — I1/I2 can add pictures later); story frames 8 → 37 (plus 6 opening lines); 11 scene openings ("At the mela, …", "On Diwali, …", "On the train, …") used on about half of the stories, matched to the thing's category so we never get "At the beach, … 5 diyas".
- **Take-away verbs follow the thing**: eaten, given / lost / taken home, balls and toy cars roll away, balloons fly away or pop, animals fly / swim / hop / run away. Given-away stories ask "does X have now/left?", everything else asks "how many are left / there now?".
- **Kept out on purpose**: "shares" (ambiguous — does she still have them?) and "takes … to play" (odd for diyas). Put-together stays two named people, so the existing "together means plus" hint still names both.
- **Sentences 13 → 47**, each tagged with its hardest `pattern`; tests check every word in the sentence, answer and look-alikes decodes at that pattern (or is a Sight-Word Catch word) and the tag isn't higher than needed. Replaced two old look-alikes that weren't decodable (boot, soup → coat, soak).
- **Easing in finish-the-sentence** now draws only CVC / digraph / blend sentences (no magic e or vowel teams), matching how Story Choose eases to the easiest pattern. Normal play still uses the whole bank.

## 2026-11-13 — AI2: personalized stories from Claude (scheduled run)
- **Where**: a ✨📖 button next to ✅ while a story is on screen, shown only when `ai.isLive()` (helpers on, proxy + passcode set, online). Tapping it opens six big topic icons (🏏 🐾 🚀 🍎 👪 🪔, spoken prompt "What should your story be about?"); the new story replaces the current one, so a round is still 2 stories.
- **Wait time — deviation from SPEC's ~2 s, please review**: generating a 4–5 line story with 2 questions takes a fast model a few seconds, so a 2 s cap would nearly always fall back. Story requests use 5 s per attempt and an 8 s total budget (no retry if < 1 s is left), with a wiggling ✏️ "writing" screen. The child asked for the story, so it is not a silent stall; every other live call keeps the 2 s default. Easy to change: `STORY_TIMEOUT_MS` / `STORY_BUDGET_MS` in `games/stories/aiStory.ts`.
- **Checks** (`checkAiStory`), all in code: 3–5 lines, ≤ 7 words per line; every line word decodable at the child's pattern cap (same checker as built-in stories; the cap is the same rule as the built-in pool, so easing = CVC only); title/lines/questions/choices free of markup, links and digits; exactly 2 questions ending in "?", each with 2 distinct wrong choices and an answer whose words all appear in the line it points at (plural -s tolerated: nap/naps). Titles are not decodability-checked (the app reads them aloud) but are blocklist-checked. Bad emoji are replaced with the topic icon rather than failing the story.
- **Kid-safe list** (`content/kidSafe.ts`): whole-word match with plural/-ed/-ing endings, covering violence, scary, unkind, adult and swear words. Everyday words a story needs are allowed on purpose (hit/kick for cricket and football, bite, drink, lost, fire, monster). All built-in stories pass it (tested).
- **Fallback**: invalid or failed → one retry → a built-in (or cached) story from the normal pool, silently. Offline/off → no request at all.
- **Cache**: Dexie v2 table `aiStories` (id = hash of the content, topic, story, createdAt — nothing about the child), newest 60 kept. Cached stories are re-checked on load and join the normal Story Choose pool at their own pattern, so they come back offline for every child on the device. Parents see the count and a **Clear** button in ⚙️ Grown-ups.
- Proxy prompt tightened to match the checks (3–N lines, numbers as words, questions end with "?", answers copied from the line, "a program checks every word"). Not deployed.

## 2026-11-13 — AI1: Claude helpers plumbing, parent gate, family proxy (scheduled run)
- **Parent gate**: hold a 🔒 button for 3 s (progress ring; releasing early resets), then type the answer to a×b with both factors 3–9. Typed, not multiple choice, so a child can't guess 1-in-4. A wrong answer gives a new question.
- Home's "🗣️ Voice" link became "⚙️ Grown-ups" (gate → Settings). The voice picker now lives inside Settings, as planned in the natural-voices decision.
- **Settings** (this device only, localStorage `ai-settings`): ✨ Claude helpers toggle (off by default; only a stored `true` turns it on), proxy URL (https only, or http://localhost for `wrangler dev`; no user:pass in the URL), family passcode, and a "Test connection" ping. The passcode is a family shared secret, not an API key.
- **Client** (`src/ai/`): one `request()` for three kinds — `ping`, `story`, `why`. Providers: `mock` (canned, valid responses; used whenever helpers are off, unconfigured or offline, and in tests) and `proxy`. `isLive()` tells AI2/AI3 whether to show ✨ buttons. Default timeout 2 s; failures come back as `{ ok: false, reason }`, never thrown, so callers can fall back silently.
- **Privacy filter**, three layers: (1) every request is rebuilt from a whitelist of fields (unknown kinds/topics/tracks rejected, numbers clamped, strings cut to 160/40 chars); (2) any local nickname or profile id inside item text is replaced with "Kai" (word problems use names, and a child could share one); (3) the exact JSON to be sent is checked again and blocked if an identifier remains. Nicknames under 2 letters are ignored so "a"/"I" aren't redacted.
- **Proxy** (`proxy/`): plain-JS Cloudflare Worker, no dependencies. Checks the passcode first (constant-time SHA-256 compare), then a per-isolate rate limit (20/min, 300/day — best effort, since Workers are stateless; the real cap is the spend limit on the key, called out in the README), a 2 KB body limit and its own whitelist validation. Model (`claude-haiku-4-5`, a known Haiku id; SPEC's `claude-haiku-5-5` was given as an example — Ankit can change the `MODEL` constant) and system prompt are fixed in code; prompts are built server-side from validated fields. No `console` calls (tested) and Workers observability off. Upstream errors return a generic 502 so the key or Anthropic error text never reaches the app. Not deployed.
- Proxy tests run in the normal `npm test` with a fake Claude API; `proxy/` is outside `tsc`'s `src` include and the Vite bundle.

## 2026-11-12 — Natural pauses in all speech (Ankit request)
- Problem: every prompt went to the speech engine as one utterance, so voices ran sentences, praise and the next question together with almost no gap.
- `say()` now splits text into phrases (`speechChunks`) and speaks them one at a time with real silence between: 380 ms after . / !, 520 ms after ?, 320 ms after a colon ("Catch the word: said"), 280 ms between spelled letters. Prompts can add `|` (450 ms beat) or `||` (850 ms, between parts such as praise → next question, story → question). A new prompt or `stopSpeech()` cancels the rest of the queue; a watchdog moves on if the engine drops `onend`.
- Content pass over all ~70 spoken lines: beats between praise and the next prompt, between story lines and the question, and between answer choices ("a hat, | a cup, | or a bag?"); run-ons with dashes rewritten; hints split into "what happened | what I want | try again".
- Spelled-out letters and Phonics Pop letter names are now upper-case so the voice says the letter name ("A"), not "uh".
- Read-along stories: 650 ms between lines (was 250 ms).
- Guard test: every phrase in story sums and hints is ≤ 12 words, and level-1 story questions speak each choice separately.

## 2026-11-12 — Natural voices + voice picker (option A, Ankit request)
- Auto voice choice ranks installed voices: Premium > Siri > Natural > Enhanced > neural/WaveNet > Google, American English first (narrator decision), then Indian, British, other English. macOS novelty voices (Bahh, Bells, Zarvox, Albert…) are excluded. On-device voices beat online ones (online voices fail offline and send the text out).
- Parents pick a voice from "🗣️ Voice" on the home screen (not behind a gate yet — AI1's parent gate can cover it). Each voice has a ▶️ sample; the choice is stored per device and falls back to the best voice if it is uninstalled.
- When no natural voice is installed, the picker shows free download steps for Mac, iPad and Android. The app can't download voices itself.
- Next step (option B, not yet in the backlog): pre-recorded Kokoro clips for fixed text.

## 2026-11-12 — Read-along never stalls (bug fix, interactive session)
- Found while testing Stories in the desktop app's browser pane: the speech engine accepted sentences but never fired start/end/error, and the safety timer only started on `onstart`, so the story froze on line 1. Chrome on tablets can hang the same way.
- `sayAlong` now has a 1.5 s start watchdog: if speech hasn't started, it highlights words on the estimated timing and moves on (silently), with a short 0.4 s tail instead of the 2.5 s slack used for real audio. It also calls `speechSynthesis.resume()` after `cancel()` (a known Chrome unstick). Tests use a fake, never-starting engine.

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
