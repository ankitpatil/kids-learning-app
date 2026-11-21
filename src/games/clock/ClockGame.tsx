import { useEffect, useRef, useState } from 'react';
import { makeClockItem, clockPrompt, clockHint, timeText, timeWords, timeKey, sameTime, fivesTo, CLOCK_TRACK, type ClockItem, type Time } from './generator';
import { ClockFace } from './ClockFace';
import { updateSkill, type SkillState } from '../../engine/adaptive';
import { maxLevel } from '../../engine/tracks';
import { getSkillState, getSkillStates, saveSkillState, logAttempt } from '../../store/db';
import { planRound, resolveSlot, type Slot } from '../../engine/roundMix';
import { say, tapSay } from '../../audio/speech';
import { fresh } from '../../engine/recent';
import { feedback } from '../../components/Feedback';
import { Emoji } from '../../components/Icon';

const ROUND_LENGTH = 8;

interface Props {
  profileId: string;
  onDone: (result: { correct: number; total: number; leveledUp: boolean }) => void;
  onExit: () => void;
}

/** #22 Tick Tock Clock: read the clock (pick the time) or find the clock for a time. */
export function ClockGame({ profileId, onDone, onExit }: Props) {
  const [state, setState] = useState<SkillState | null>(null);
  const [item, setItem] = useState<ClockItem | null>(null);
  const [tried, setTried] = useState<string[]>([]);
  const [glow, setGlow] = useState<'hour' | 'minute' | 'both' | undefined>(undefined);
  const [help, setHelp] = useState(false);
  const [mood, setMood] = useState<'idle' | 'yay' | 'oops'>('idle');
  const [index, setIndex] = useState(0);
  const hinted = useRef(false);
  const correctCount = useRef(0);
  const leveledUp = useRef(false);
  const ease = useRef(false);
  const started = useRef(Date.now());
  const busy = useRef(false);
  const plan = useRef(planRound(ROUND_LENGTH));
  const all = useRef<Awaited<ReturnType<typeof getSkillStates>>>({});
  const slot = useRef<Slot>({ kind: 'current', trackId: CLOCK_TRACK, level: 0 });

  useEffect(() => {
    Promise.all([getSkillState(profileId, CLOCK_TRACK), getSkillStates(profileId)]).then(([s, states]) => {
      all.current = states;
      setState(s);
      next(s.level, undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  function next(level: number, prevId: string | undefined, i = 0) {
    const easy = ease.current;
    // Single track: review = level below, stretch = level above.
    const sl = (slot.current = resolveSlot(plan.current[i], CLOCK_TRACK, level, all.current, easy));
    const it = fresh(CLOCK_TRACK, () => makeClockItem(sl.level, Math.random, easy, prevId), (x) => x.id);
    hinted.current = easy;
    ease.current = false;
    setItem(it);
    setTried([]);
    setGlow(undefined);
    setHelp(false);
    setMood('idle');
    started.current = Date.now();
    busy.current = false;
    setTimeout(() => say((sl.kind === 'stretch' ? 'Bonus challenge! || ' : '') + clockPrompt(it)), 250);
  }

  async function record(correct: boolean) {
    const timeMs = Date.now() - started.current;
    const sl = slot.current;
    await logAttempt({ profileId, skillId: CLOCK_TRACK, itemId: item!.id, level: sl.level, correct, hintUsed: hinted.current, timeMs, at: Date.now(), mix: sl.kind });
    // Review and stretch items are logged but don't move the level.
    if (sl.kind !== 'current') return { state: state!, change: 'same' as const, ease: false };
    const out = updateSkill(state!, { correct, hintUsed: hinted.current, timeMs }, maxLevel(CLOCK_TRACK));
    await saveSkillState(out.state);
    setState(out.state);
    if (out.change === 'up') leveledUp.current = true;
    if (out.ease) ease.current = true;
    return out;
  }

  async function pick(t: Time) {
    if (!item || !state || busy.current) return;
    busy.current = true;
    if (sameTime(t, item.time)) {
      const out = await record(true);
      feedback(out.change === 'up' ? 'levelup' : 'correct');
      setMood('yay');
      if (!hinted.current) correctCount.current += 1;
      say(`Yes! | It's ${timeWords(item.time)}!`);
      setTimeout(() => {
        const n = index + 1;
        if (n >= ROUND_LENGTH) {
          onDone({ correct: correctCount.current, total: ROUND_LENGTH, leveledUp: leveledUp.current });
          return;
        }
        setIndex(n);
        next(out.state.level, item.id, n);
      }, 2000);
      return;
    }
    await record(false);
    feedback('wrong');
    setMood('oops');
    hinted.current = true;
    setTried((x) => [...x, timeKey(t)]);
    // Gentle help: colour the hands, light up the one that was misread, and show the fives on 5-minute clocks.
    setHelp(true);
    setGlow(t.h !== item.time.h && t.m !== item.time.m ? 'both' : t.h !== item.time.h ? 'hour' : 'minute');
    say(clockHint(item, t));
    setTimeout(() => {
      setMood('idle');
      busy.current = false;
      started.current = Date.now();
    }, 900);
  }

  if (!item || !state) return <div className="screen center">Loading…</div>;

  const scaffold = item.scaffold || help;
  const fives = item.minuteLabels || (help && item.time.m % 30 !== 0);

  return (
    <div className="screen game clock-game">
      <div className="topbar">
        <button className="back-btn" onClick={onExit} aria-label="Back to levels"><Emoji text="⬅️" /> Levels</button>
        <div className="progress" aria-label={`Question ${index + 1} of ${ROUND_LENGTH}`}>
          {Array.from({ length: ROUND_LENGTH }, (_, i) => (
            <span key={i} className={i < index ? 'dot done' : i === index ? `dot now${slot.current.kind === 'stretch' ? ' bonus' : ''}` : 'dot'} />
          ))}
        </div>
        <button className="icon-btn" onClick={() => tapSay(clockPrompt(item))} aria-label="Say again"><Emoji text="🔊" /></button>
      </div>

      {item.mode === 'read' ? (
        <>
          <button className={`clock-big ${mood}`} onClick={() => tapSay(clockPrompt(item))} aria-label="What time does the clock show?">
            <ClockFace time={item.time} scaffold={scaffold} minuteLabels={fives} glow={mood === 'yay' ? undefined : glow} />
          </button>
          {scaffold && <HandKey />}
          {help && item.time.m % 30 !== 0 && (
            <div className="count-up fives" aria-hidden="true">
              {fivesTo(item.time.m).map((n) => (
                <span key={n} className="cu-step">{n}</span>
              ))}
            </div>
          )}
          <div className="quick-choices clock-times">
            {item.choices.map((t) => (
              <button
                key={timeKey(t)}
                className={`quick-choice ${tried.includes(timeKey(t)) ? 'tried' : ''} ${mood === 'yay' && sameTime(t, item.time) ? 'picked' : ''}`}
                onClick={() => pick(t)}
                aria-label={timeWords(t)}
              >
                {timeText(t)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button className={`clock-target ${mood}`} onClick={() => tapSay(timeWords(item.time))} aria-label={`Hear the time: ${timeWords(item.time)}`}>
            {timeText(item.time)} <Emoji text="🔊" />
          </button>
          {help && <HandKey />}
          <div className="clock-choices">
            {item.choices.map((t, i) => (
              <button
                key={timeKey(t)}
                className={`clock-choice ${tried.includes(timeKey(t)) ? 'tried' : ''} ${mood === 'yay' && sameTime(t, item.time) ? 'picked' : ''}`}
                onClick={() => pick(t)}
                aria-label={`Clock ${i + 1}`}
              >
                <ClockFace time={t} scaffold={scaffold} small />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** "Short hand = hour, long hand = minutes", with tap-to-hear. */
function HandKey() {
  return (
    <button className="hand-key" onClick={() => tapSay('The short hand shows the hour. | The long hand shows the minutes.')} aria-label="Which hand is which?">
      <span className="hk hour">short = hour</span>
      <span className="hk minute">long = minutes</span>
    </button>
  );
}
