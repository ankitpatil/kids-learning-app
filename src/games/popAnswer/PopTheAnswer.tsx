import { useEffect, useMemo, useRef, useState } from 'react';
import { makePopItem, layoutBalloons, scorePop, popSlot, type PopItem, type PopState } from './generator';
import { updateSkill, type SkillState } from '../../engine/adaptive';
import { maxLevel } from '../../engine/tracks';
import { getSkillState, getSkillStates, saveSkillState, logAttempt } from '../../store/db';
import { planRound, type Slot } from '../../engine/roundMix';
import { say, tapSay } from '../../audio/speech';
import { fresh } from '../../engine/recent';
import { feedback } from '../../components/Feedback';
import { TOUCH_HOLD_MS } from '../../motion/pointer';
import { Emoji, Icon } from '../../components/Icon';

const ROUND_LENGTH = 8;

interface Props {
  profileId: string;
  trackId: string;
  onDone: (result: { correct: number; total: number; leveledUp: boolean }) => void;
  onExit: () => void;
}

/**
 * M3 Pop the Answer: answer balloons float up; pop the right one (tap, or touch it with the
 * Move-mode hand — balloons pop on a short touch instead of the usual long hold).
 * Wrong pops wobble; only the first counts as a miss; after two the answer balloon glows.
 */
export function PopTheAnswer({ profileId, trackId, onDone, onExit }: Props) {
  const [item, setItem] = useState<PopItem | null>(null);
  const [index, setIndex] = useState(0);
  const [pop, setPop] = useState<PopState>({ tried: [], misses: 0 });
  const [wobble, setWobble] = useState<string | null>(null);
  const [popped, setPopped] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const states = useRef<Record<string, SkillState>>({});
  const correctCount = useRef(0);
  const leveledUp = useRef(false);
  const ease = useRef(false);
  const started = useRef(Date.now());
  const busy = useRef(false);
  const plan = useRef(planRound(ROUND_LENGTH));
  const slot = useRef<Slot>({ kind: 'current', trackId, level: 0 });
  const popRef = useRef(pop);
  popRef.current = pop;

  useEffect(() => {
    Promise.all([getSkillState(profileId, trackId), getSkillStates(profileId)]).then(([s, all]) => {
      states.current = { ...all, [trackId]: s };
      next(s.level, 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, trackId]);

  const balloons = useMemo(() => (item ? layoutBalloons(item.choices, item.answer) : []), [item]);

  function next(level: number, i: number) {
    const easy = ease.current;
    const sl = (slot.current = popSlot(plan.current[i], trackId, level, states.current, easy));
    const it = fresh(`pop-${sl.trackId}`, () => makePopItem(sl.trackId, sl.level, Math.random, easy), (x) => x.id);
    ease.current = false;
    setItem(it);
    setPop({ tried: [], misses: 0 });
    setWobble(null);
    setPopped(null);
    setHint(false);
    started.current = Date.now();
    busy.current = false;
    setTimeout(() => say((sl.kind === 'stretch' ? 'Bonus challenge! || ' : '') + it.say), 250);
  }

  async function record(correct: boolean, hintUsed: boolean) {
    const sl = slot.current;
    const timeMs = Date.now() - started.current;
    await logAttempt({ profileId, skillId: sl.trackId, itemId: item!.id, level: sl.level, correct, hintUsed, timeMs, at: Date.now(), mix: sl.kind });
    const cur = states.current[trackId];
    // Review and stretch items are logged but don't move the level.
    if (sl.kind !== 'current' || !cur) return cur?.level ?? sl.level;
    const out = updateSkill(cur, { correct, hintUsed, timeMs }, maxLevel(trackId));
    await saveSkillState(out.state);
    states.current = { ...states.current, [trackId]: out.state };
    if (out.change === 'up') leveledUp.current = true;
    if (out.ease) ease.current = true;
    return out.state.level;
  }

  async function hit(label: string) {
    if (!item || busy.current || popped) return;
    const prev = popRef.current;
    const r = scorePop(prev, label, item.answer);
    if (r.outcome === 'right') {
      busy.current = true;
      setPopped(label);
      const hintUsed = prev.tried.length > 0;
      const before = leveledUp.current;
      const level = await record(true, hintUsed);
      const up = leveledUp.current && !before;
      feedback(up ? 'levelup' : 'correct');
      if (!hintUsed) correctCount.current += 1;
      say(up ? `Pop! | ${label}! || A harder level is unlocked!` : `Pop! | ${label}!`);
      setTimeout(() => {
        const ni = index + 1;
        if (ni >= ROUND_LENGTH) {
          onDone({ correct: correctCount.current, total: ROUND_LENGTH, leveledUp: leveledUp.current });
          return;
        }
        setIndex(ni);
        next(level, ni);
      }, 1400);
      return;
    }
    // Wrong: wobble, no pop, no penalty spiral (only the first wrong pop is logged as a miss).
    setPop(r.state);
    popRef.current = r.state;
    setWobble(label);
    setTimeout(() => setWobble((w) => (w === label ? null : w)), 700);
    if (r.hint) setHint(true);
    if (r.outcome === 'wrong') {
      feedback('wrong');
      await record(false, false);
      say(`That one is ${label}. || ${item.say}`);
    }
  }

  if (!item) return <div className="screen center">Loading…</div>;

  return (
    <div className="screen game pop-answer">
      <div className="topbar">
        <button className="back-btn" onClick={onExit} aria-label="Back to levels"><Emoji text="⬅️" /> Levels</button>
        <div className="progress" role="img" aria-label={`Question ${index + 1} of ${ROUND_LENGTH}`}>
          {Array.from({ length: ROUND_LENGTH }, (_, i) => (
            <span key={i} className={i < index ? 'dot done' : i === index ? `dot now${slot.current.kind === 'stretch' ? ' bonus' : ''}` : 'dot'} />
          ))}
        </div>
        <button className="icon-btn" onClick={() => tapSay(item.say)} aria-label="Say again"><Emoji text="🔊" /></button>
      </div>

      <button className={`pop-question ${item.visual ? '' : 'listen'}`} onClick={() => tapSay(item.say)} aria-label={`Hear the question: ${item.say}`}>
        {item.icon ? <Icon name={item.icon} /> : <Emoji text={item.visual || '👂'} />}
      </button>

      <div className="pop-sky">
        {balloons.map((b) => {
          const tried = pop.tried.includes(b.label);
          const cls = ['pop-balloon', b.label.length > 2 ? 'long' : '', wobble === b.label ? 'wobble' : '', tried ? 'tried' : '', popped === b.label ? 'popped' : '', hint && b.correct ? 'glow' : '']
            .filter(Boolean)
            .join(' ');
          return (
            <div
              key={`${item.id}-${b.label}`}
              className="pop-lane"
              style={{ left: `${b.x * 100}%`, animationDuration: `${b.duration}s`, animationDelay: `${b.delay}s`, animationPlayState: popped ? 'paused' : undefined }}
            >
              <button
                className={cls}
                aria-disabled={tried || undefined}
                style={{ ['--c' as string]: b.color }}
                data-motion-hold={TOUCH_HOLD_MS}
                onPointerDown={(e) => {
                  // Pop on touch-down: a moving balloon is hard to "click" (finger lifts off elsewhere).
                  if (e.pointerType !== 'mouse' || e.button === 0) hit(b.label);
                }}
                onClick={(e) => {
                  // Keyboard and the Move-mode hand (synthetic click, detail 0); real taps popped on pointerdown.
                  if (e.detail === 0) hit(b.label);
                }}
                aria-label={`Balloon ${b.label}`}
              >
                <span className="pop-label"><Emoji text={popped === b.label ? '💥' : b.label} /></span>
                <span className="string" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
