import { useEffect, useRef, useState } from 'react';
import { makeFeedItem, makePlaceValueItem, checkFeed, checkPlaceValue, isPlaceValue, type AnyFeedItem, type FeedItem, type PlaceValueItem } from './generator';
import { numberWord, tensOnesWords } from '../../engine/numberWords';
import { updateSkill, type SkillState } from '../../engine/adaptive';
import { maxLevel } from '../../engine/tracks';
import { getSkillState, getSkillStates, saveSkillState, logAttempt } from '../../store/db';
import { planRound, resolveSlot, type Slot } from '../../engine/roundMix';
import { say } from '../../audio/speech';
import { fresh } from '../../engine/recent';
import { feedback } from '../../components/Feedback';
import { makeCompareItem, comparePrompt, compareHint, comparePraise, type CompareItem } from './compare';

const ROUND_LENGTH = 8;
const w = numberWord;

interface Props {
  profileId: string;
  trackId: FeedTrack;
  onDone: (result: { correct: number; total: number; leveledUp: boolean }) => void;
  onExit: () => void;
}

export type FeedTrack = 'count' | 'missing' | 'placeValue' | 'compare2d';
type GameItem = AnyFeedItem | CompareItem;
const isCompare = (it: GameItem): it is CompareItem => it.trackId === 'compare2d';

function makeItem(trackId: string, level: number, ease: boolean, avoid: number | undefined): GameItem {
  if (trackId === 'compare2d') return makeCompareItem(level, Math.random, ease, avoid);
  if (trackId === 'placeValue') return makePlaceValueItem(level, Math.random, ease, avoid);
  return makeFeedItem(trackId as 'count' | 'missing', level, Math.random, ease, avoid);
}

function promptFor(it: GameItem) {
  if (isCompare(it)) return comparePrompt(it);
  if (isPlaceValue(it)) {
    if (it.mode === 'choose') return `${tensOnesWords(it.tens, it.ones)}. What number is that?`;
    const guide = it.split ? ` ${w(it.total)} is ${tensOnesWords(it.tens, it.ones)}.` : ' A box has ten cookies.';
    return `Feed me ${w(it.total)} cookies!${guide}`;
  }
  if (it.have === 0) return `Feed the monster ${w(it.total)} cookie${it.total === 1 ? '' : 's'}!`;
  if (it.mode === 'choose') return `I have ${w(it.have)}. | How many more make ${w(it.total)}?`;
  return `I have ${w(it.have)} cookies. | Feed me until I have ${w(it.total)}!`;
}

/** Gentle, specific hint for a tens & ones mistake. */
function placeValueHint(it: PlaceValueItem, pv: ReturnType<typeof checkPlaceValue> | null, boxes: number, loose: number, given: number) {
  const want = `I want ${w(it.total)}: ${tensOnesWords(it.tens, it.ones)}.`;
  if (it.mode === 'choose') {
    return `Hmm, ${w(given)} is ${tensOnesWords(Math.floor(given / 10), given % 10)}. || ${want} | Try again!`;
  }
  const got = `That's ${w(boxes * 10 + loose)}.`;
  if (pv === 'swapped') return `${got} || Oops, the boxes and cookies swapped! | ${want}`;
  if (pv === 'tens') return `${got} || The cookies are right! | Now count the boxes. I want ${w(it.tens)} box${it.tens === 1 ? '' : 'es'}.`;
  if (pv === 'ones') return `${got} || The boxes are right! | Now count the cookies. I want ${w(it.ones)} cookie${it.ones === 1 ? '' : 's'}.`;
  return `${got} || ${want}`;
}

/** Ten-frame belly: 2×5 grids. Pre-filled cookies are solid, fed ones bounce in, ghosts show the gap. */
function TenFrames({ have, fed, ghost }: { have: number; fed: number; ghost: number }) {
  const cells: ('have' | 'fed' | 'ghost' | 'empty')[] = [];
  for (let i = 0; i < have; i++) cells.push('have');
  for (let i = 0; i < fed; i++) cells.push('fed');
  for (let i = 0; i < ghost; i++) cells.push('ghost');
  const frames = Math.max(1, Math.ceil(cells.length / 10));
  while (cells.length < frames * 10) cells.push('empty');
  return (
    <div className="frames">
      {Array.from({ length: frames }, (_, f) => (
        <div key={f} className="frame">
          {cells.slice(f * 10, f * 10 + 10).map((c, i) => (
            <span key={i} className={`cell ${c}`}>{c === 'empty' ? '' : '🍪'}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function FeedMonster({ profileId, trackId, onDone, onExit }: Props) {
  const [state, setState] = useState<SkillState | null>(null);
  const [item, setItem] = useState<GameItem | null>(null);
  const [fed, setFed] = useState(0);
  /** Boxes of ten fed (tens & ones). `fed` is then the loose cookies. */
  const [boxes, setBoxes] = useState(0);
  const [mood, setMood] = useState<'idle' | 'yum' | 'oops'>('idle');
  const [index, setIndex] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const correctCount = useRef(0);
  const leveledUp = useRef(false);
  const ease = useRef(false);
  const started = useRef(Date.now());
  const busy = useRef(false);
  const plan = useRef(planRound(ROUND_LENGTH));
  const all = useRef<Awaited<ReturnType<typeof getSkillStates>>>({});
  const slot = useRef<Slot>({ kind: 'current', trackId, level: 0 });

  useEffect(() => {
    Promise.all([getSkillState(profileId, trackId), getSkillStates(profileId)]).then(([s, states]) => {
      all.current = states;
      setState(s);
      next(s.level, undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, trackId]);

  function next(level: number, prevNeed: number | undefined, i = 0) {
    const easy = ease.current;
    const sl = (slot.current = resolveSlot(plan.current[i], trackId, level, all.current, easy));
    const it = fresh(sl.trackId, () => makeItem(sl.trackId, sl.level, easy, prevNeed), (x) => x.id);
    setHintUsed(ease.current);
    ease.current = false;
    setItem(it);
    setFed(0);
    setBoxes(0);
    setMood('idle');
    setWrongPick(null);
    started.current = Date.now();
    busy.current = false;
    setTimeout(() => say((sl.kind === 'stretch' ? 'Bonus challenge! || ' : '') + promptFor(it)), 250);
  }

  function feed() {
    if (!item || busy.current || fed >= item.supply) return;
    const n = fed + 1;
    setFed(n);
    say(w(item.have + boxes * 10 + n), { rate: 1.1 }); // count on from what the monster already has
  }

  function feedBox() {
    if (!item || isCompare(item) || !isPlaceValue(item) || busy.current || boxes >= item.boxSupply) return;
    const b = boxes + 1;
    setBoxes(b);
    say(w(b * 10 + fed), { rate: 1.1 }); // count by tens: ten, twenty, thirty…
  }

  function takeBack() {
    if (busy.current) return;
    if (fed > 0) setFed(fed - 1);
    else if (boxes > 0) setBoxes(boxes - 1);
  }

  async function submit(given: number) {
    if (!item || !state || busy.current) return;
    busy.current = true;
    const pv = !isCompare(item) && isPlaceValue(item) && item.mode === 'feed' ? checkPlaceValue(item, boxes, fed) : null;
    const verdict = pv ? (pv === 'correct' ? 'correct' : 'too-few') : checkFeed(item, given);
    const correct = verdict === 'correct';
    const timeMs = Date.now() - started.current;
    const sl = slot.current;
    await logAttempt({ profileId, skillId: sl.trackId, itemId: item.id, level: sl.level, correct, hintUsed, timeMs, at: Date.now(), mix: sl.kind });
    // Review and stretch items are logged but don't move the current track's level.
    const out = sl.kind === 'current' ? updateSkill(state, { correct, hintUsed, timeMs }, maxLevel(trackId)) : { state, change: 'same' as const, ease: false };
    if (sl.kind === 'current') await saveSkillState(out.state);
    setState(out.state);
    if (out.change === 'up') leveledUp.current = true;
    if (out.ease) ease.current = true;

    feedback(correct ? (out.change === 'up' ? 'levelup' : 'correct') : 'wrong');
    if (correct) {
      setMood('yum');
      if (item.mode === 'feed' && !isCompare(item) && !isPlaceValue(item)) setFed(given);
      if (!isCompare(item) && isPlaceValue(item)) {
        setBoxes(item.tens);
        setFed(item.ones);
      }
      if (!hintUsed) correctCount.current += 1;
      const sum = isCompare(item) ? comparePraise(item) + ' ' : isPlaceValue(item) ? `${tensOnesWords(item.tens, item.ones)} make ${w(item.total)}! ` : item.have > 0 ? `${w(item.have)} and ${w(item.need)} make ${w(item.total)}! ` : '';
      say(sum + (sum ? '|| ' : '') + (out.change === 'up' ? 'Yum yum! | You are getting so good!' : 'Yum yum! | Thank you!'));
      setTimeout(() => {
        const nextIndex = index + 1;
        if (nextIndex >= ROUND_LENGTH) {
          onDone({ correct: correctCount.current, total: ROUND_LENGTH, leveledUp: leveledUp.current });
          return;
        }
        setIndex(nextIndex);
        next(out.state.level, item.need, nextIndex);
      }, item.have > 0 || isCompare(item) || isPlaceValue(item) ? 2400 : 1400);
    } else {
      setMood('oops');
      setHintUsed(true);
      if (isCompare(item)) {
        setWrongPick(given);
        say(compareHint(item));
      } else if (isPlaceValue(item)) {
        say(placeValueHint(item, pv, boxes, fed, given));
        if (item.mode === 'choose') setWrongPick(given);
      } else if (item.mode === 'choose') {
        setWrongPick(given);
        say(`Hmm, | ${w(item.have)} and ${w(given)} make ${w(item.have + given)}. | I want ${w(item.total)}. | Try again!`);
      } else {
        const now = item.have + given;
        const diff = Math.abs(item.total - now);
        say(
          verdict === 'too-few'
            ? `That's ${w(now)}. | I want ${w(item.total)}. | Can you give me ${w(diff)} more?`
            : `Oh, that's too many! | I want ${w(item.total)}. | Take ${w(diff)} back.`,
        );
      }
      setTimeout(() => {
        setMood('idle');
        busy.current = false;
        started.current = Date.now();
      }, 900);
    }
  }

  if (!item || !state) return <div className="screen center">Loading…</div>;

  if (isCompare(item)) {
    const done = mood === 'yum';
    // Picture on levels 0–1 and after a miss; the hint speech walks through boxes, then cookies.
    const picture = item.picture || hintUsed;
    return (
      <div className="screen game">
        <div className="topbar">
          <button className="back-btn" onClick={onExit} aria-label="Back to levels">⬅️ Levels</button>
          <div className="progress" aria-label={`Question ${index + 1} of ${ROUND_LENGTH}`}>
            {Array.from({ length: ROUND_LENGTH }, (_, i) => (
              <span key={i} className={i < index ? 'dot done' : i === index ? `dot now${slot.current.kind === 'stretch' ? ' bonus' : ''}` : 'dot'} />
            ))}
          </div>
          <button className="icon-btn" onClick={() => say(promptFor(item))} aria-label="Say again">🔊</button>
        </div>
        <div className={`monster cmp-monster ${mood}`} aria-hidden>
          <div className="monster-face">{done ? '😋' : mood === 'oops' ? '😮' : item.ask === 'more' ? '🤤' : '😌'}</div>
          <div className="cmp-ask">{item.ask === 'more' ? 'more 🍪🍪🍪' : 'fewer 🍪'}</div>
        </div>
        <div className="cmp-plates">
          {[item.left, item.right].map((n) => {
            const t = Math.floor(n / 10), o = n % 10;
            const cls = done ? (n === item.need ? 'right' : 'other') : wrongPick === n ? 'tried' : '';
            return (
              <button key={n} className={`cmp-plate ${cls}`} onClick={() => submit(n)} aria-label={String(n)}>
                <span className="cmp-number">{n}</span>
                {picture && (
                  <span className="cmp-pic">
                    <span className="pv-row">{Array.from({ length: t }, (_, i) => <span key={i} className="pv-box">📦<b>10</b></span>)}</span>
                    <span className="pv-row">{Array.from({ length: o }, (_, i) => <span key={i} className="cookie small">🍪</span>)}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (isPlaceValue(item)) {
    const done = mood === 'yum';
    const shownBoxes = done ? item.tens : boxes;
    const shownLoose = done ? item.ones : fed;
    // Guide (level 0, easing, or after a miss): grey ghost boxes/cookies show what's still missing.
    const guide = item.split || hintUsed;
    const ghostBoxes = guide && item.mode === 'feed' ? Math.max(0, item.tens - boxes) : 0;
    const ghostLoose = guide && item.mode === 'feed' ? Math.max(0, item.ones - fed) : 0;
    return (
      <div className="screen game">
      <div className="topbar">
        <button className="back-btn" onClick={onExit} aria-label="Back to levels">⬅️ Levels</button>
        <div className="progress" aria-label={`Question ${index + 1} of ${ROUND_LENGTH}`}>
          {Array.from({ length: ROUND_LENGTH }, (_, i) => (
            <span key={i} className={i < index ? 'dot done' : i === index ? `dot now${slot.current.kind === 'stretch' ? ' bonus' : ''}` : 'dot'} />
          ))}
        </div>
        <button className="icon-btn" onClick={() => say(promptFor(item))} aria-label="Say again">🔊</button>
      </div>

        {item.mode === 'choose' ? (
          <div className="pv-words" aria-hidden>
            <span className="pv-part tens">{item.tens} <span className="pv-icon">📦</span></span>
            <span className="pv-part ones">{item.ones} <span className="pv-icon">🍪</span></span>
          </div>
        ) : item.split ? (
          <div className="target-number pv-split" aria-hidden>
            <span className="pv-digit tens">{item.tens}<small>📦</small></span>
            <span className="pv-digit ones">{item.ones}<small>🍪</small></span>
          </div>
        ) : (
          <div className="target-number" aria-hidden>{item.total}</div>
        )}

        <div className={`monster ${mood}`} onClick={item.mode === 'feed' ? takeBack : undefined} role="button" aria-label="Monster">
          <div className="monster-face">{done ? '😋' : mood === 'oops' ? '😮' : '👾'}</div>
          {(item.mode === 'feed' || done || hintUsed) && (
            <div className="belly pv-belly">
              {Array.from({ length: shownBoxes }, (_, i) => <span key={`b${i}`} className="pv-box">📦<b>10</b></span>)}
              {Array.from({ length: ghostBoxes }, (_, i) => <span key={`gb${i}`} className="pv-box ghost">📦<b>10</b></span>)}
              {Array.from({ length: shownLoose }, (_, i) => <span key={`c${i}`} className="cookie small">🍪</span>)}
              {Array.from({ length: ghostLoose }, (_, i) => <span key={`gc${i}`} className="cookie ghost">🍪</span>)}
              {item.mode === 'choose' && !done && hintUsed && (
                <>
                  {Array.from({ length: item.tens }, (_, i) => <span key={`hb${i}`} className="pv-box ghost">📦<b>10</b></span>)}
                  {Array.from({ length: item.ones }, (_, i) => <span key={`hc${i}`} className="cookie ghost">🍪</span>)}
                </>
              )}
            </div>
          )}
          {item.mode === 'feed' && (
            <div className="pv-total" aria-hidden>{boxes * 10 + fed || ''}</div>
          )}
        </div>

        {item.mode === 'feed' ? (
          <>
            <div className="plate pv-plate">
              <div className="pv-row">
                {Array.from({ length: item.boxSupply - boxes }, (_, i) => (
                  <button key={i} className="pv-box big" onClick={feedBox} aria-label="Box of ten cookies">📦<b>10</b></button>
                ))}
              </div>
              <div className="pv-row">
                {Array.from({ length: item.supply - fed }, (_, i) => (
                  <button key={i} className="cookie big" onClick={feed} aria-label="Cookie">🍪</button>
                ))}
              </div>
            </div>
            <div className="actions">
              <button className="btn secondary" onClick={takeBack} disabled={fed === 0 && boxes === 0} aria-label="Take one back">↩️</button>
              <button className="btn primary" onClick={() => submit(boxes * 10 + fed)} disabled={fed === 0 && boxes === 0} aria-label="Done">✅</button>
            </div>
          </>
        ) : (
          <div className="quick-choices number-pick">
            {item.choices.map((c) => (
              <button key={c} className={`quick-choice ${wrongPick === c ? 'tried' : ''}`} onClick={() => submit(c)} aria-label={String(c)}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const remaining = item.supply - fed;
  const showGuide = hintUsed;
  const ghosts = showGuide ? Math.max(0, item.need - fed) : 0;

  return (
    <div className="screen game">
      <div className="topbar">
        <button className="back-btn" onClick={onExit} aria-label="Back to levels">⬅️ Levels</button>
        <div className="progress" aria-label={`Question ${index + 1} of ${ROUND_LENGTH}`}>
          {Array.from({ length: ROUND_LENGTH }, (_, i) => (
            <span key={i} className={i < index ? 'dot done' : i === index ? `dot now${slot.current.kind === 'stretch' ? ' bonus' : ''}` : 'dot'} />
          ))}
        </div>
        <button className="icon-btn" onClick={() => say(promptFor(item))} aria-label="Say again">🔊</button>
      </div>

      {item.have > 0 ? (
        <div className="equation" aria-hidden>
          <span>{item.have}</span> + <span className={`blank ${mood === 'yum' ? 'filled' : ''}`}>{mood === 'yum' ? item.need : item.mode === 'feed' ? fed || '?' : '?'}</span> = <span>{item.total}</span>
        </div>
      ) : (
        <div className="target-number" aria-hidden>{item.total}</div>
      )}

      <div className={`monster ${mood}`} onClick={item.mode === 'feed' ? takeBack : undefined} role="button" aria-label="Monster">
        <div className="monster-face">{mood === 'yum' ? '😋' : mood === 'oops' ? '😮' : '👾'}</div>
        {item.frames && item.mode === 'choose' && !showGuide && mood !== 'yum' ? null : item.frames ? (
          <TenFrames have={item.have} fed={item.mode === 'feed' || mood === 'yum' ? (mood === 'yum' ? item.need : fed) : 0} ghost={item.mode === 'choose' && showGuide ? item.need : ghosts} />
        ) : (
          <div className="belly">
            {Array.from({ length: fed }, (_, i) => (
              <span key={i} className="cookie small">🍪</span>
            ))}
            {Array.from({ length: ghosts }, (_, i) => (
              <span key={`g${i}`} className="cookie ghost">🍪</span>
            ))}
          </div>
        )}
      </div>

      {item.mode === 'feed' ? (
        <>
          <div className="plate">
            {Array.from({ length: remaining }, (_, i) => (
              <button key={i} className="cookie big" onClick={feed} aria-label="Cookie">🍪</button>
            ))}
          </div>
          <div className="actions">
            <button className="btn secondary" onClick={takeBack} disabled={fed === 0} aria-label="Take one back">↩️</button>
            <button className="btn primary" onClick={() => submit(fed)} disabled={fed === 0} aria-label="Done">✅</button>
          </div>
        </>
      ) : (
        <div className="quick-choices number-pick">
          {item.choices.map((c) => (
            <button key={c} className={`quick-choice ${wrongPick === c ? 'tried' : ''}`} onClick={() => submit(c)} aria-label={String(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
