import { useEffect, useRef, useState } from 'react';
import { makeHopItem, checkHops, frogAt, maxHops, splitText, type HopItem, type HopTrack } from './generator';
import { updateSkill, type SkillState } from '../../engine/adaptive';
import { maxLevel } from '../../engine/tracks';
import { getSkillState, getSkillStates, saveSkillState, logAttempt } from '../../store/db';
import { planRound, resolveSlot, type Slot } from '../../engine/roundMix';
import { say } from '../../audio/speech';
import { fresh } from '../../engine/recent';
import { feedback } from '../../components/Feedback';

const ROUND_LENGTH = 8;
const NUMBER_WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
const w = (n: number) => NUMBER_WORDS[n] ?? String(n);
const opWord = (it: HopItem) => (it.op === '+' ? 'plus' : 'take away');
const sym = (it: HopItem) => (it.op === '+' ? '+' : '−');

interface Props {
  profileId: string;
  trackId: HopTrack;
  onDone: (result: { correct: number; total: number; leveledUp: boolean }) => void;
  onExit: () => void;
}

type Step = 'hop' | 'split' | 'land' | 'choose';

function firstStep(it: HopItem): Step {
  return it.mode === 'make10' ? 'split' : it.mode === 'choose' ? 'choose' : 'hop';
}

function promptFor(it: HopItem, step: Step) {
  const q = `${w(it.a)} ${opWord(it)} ${w(it.b)}.`;
  if (step === 'hop') return `${q} Start at ${w(it.a)}. Hop ${w(it.b)} time${it.b === 1 ? '' : 's'} ${it.op === '+' ? 'forward' : 'back'}!`;
  if (step === 'split') return `${q} How many hops to get to ten?`;
  if (step === 'land') return `${w(it.b)} is ${w(it.toTen)} and ${w(it.rest)}. Now hop ${w(it.rest)} more from ten. Where does the frog land?`;
  return `What is ${w(it.a)} ${opWord(it)} ${w(it.b)}?`;
}

/** The number line: ticks 0..max, frog on `frog`, trail of hops from `from`. */
function Line({ max, frog, from, mark10 }: { max: number; frog: number; from: number; mark10: boolean }) {
  const lo = Math.min(from, frog);
  const hi = Math.max(from, frog);
  return (
    <div className="numline" style={{ ['--n' as string]: max + 1 }} aria-hidden>
      {Array.from({ length: max + 1 }, (_, n) => (
        <div key={n} className={`tick ${n === from ? 'start' : ''} ${n > lo && n <= hi && from < frog ? 'trail' : ''} ${n >= lo && n < hi && from > frog ? 'trail' : ''} ${mark10 && n === 10 ? 'ten' : ''}`}>
          <span className="frog-slot">{n === frog ? '🐸' : ''}</span>
          <span className="tick-num">{n}</span>
        </div>
      ))}
    </div>
  );
}

export function NumberLineHop({ profileId, trackId, onDone, onExit }: Props) {
  const [state, setState] = useState<SkillState | null>(null);
  const [item, setItem] = useState<HopItem | null>(null);
  const [step, setStep] = useState<Step>('hop');
  const [hops, setHops] = useState(0);
  const [frog, setFrog] = useState(0);
  const [mood, setMood] = useState<'idle' | 'yay' | 'oops'>('idle');
  const [index, setIndex] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [tried, setTried] = useState<number[]>([]);
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

  function next(level: number, prevId: string | undefined, i = 0) {
    const easy = ease.current;
    const sl = (slot.current = resolveSlot(plan.current[i], trackId, level, all.current, easy));
    const it = fresh(sl.trackId, () => makeHopItem(sl.trackId as HopTrack, sl.level, Math.random, easy, prevId), (x) => x.id);
    setHintUsed(easy);
    ease.current = false;
    const s = firstStep(it);
    setItem(it);
    setStep(s);
    setHops(0);
    setFrog(it.a);
    setMood('idle');
    setTried([]);
    started.current = Date.now();
    busy.current = false;
    setTimeout(() => say((sl.kind === 'stretch' ? 'Bonus challenge! ' : '') + promptFor(it, s)), 250);
  }

  function hop() {
    if (!item || busy.current || step !== 'hop' || hops >= maxHops(item)) return;
    const n = hops + 1;
    setHops(n);
    setFrog(frogAt(item, n));
    say(w(n), { rate: 1.1 }); // count the hops
  }

  function undo() {
    if (!item || busy.current || hops === 0) return;
    setHops(hops - 1);
    setFrog(frogAt(item, hops - 1));
  }

  /** Log the attempt and update the engine. Returns the engine result. */
  async function record(correct: boolean) {
    const timeMs = Date.now() - started.current;
    const sl = slot.current;
    await logAttempt({ profileId, skillId: sl.trackId, itemId: item!.id, level: sl.level, correct, hintUsed, timeMs, at: Date.now(), mix: sl.kind });
    // Review and stretch items are logged but don't move the current track's level.
    if (sl.kind !== 'current') return { state: state!, change: 'same' as const, ease: false };
    const out = updateSkill(state!, { correct, hintUsed, timeMs }, maxLevel(trackId));
    await saveSkillState(out.state);
    setState(out.state);
    if (out.change === 'up') leveledUp.current = true;
    if (out.ease) ease.current = true;
    return out;
  }

  async function finishCorrect() {
    const it = item!;
    const out = await record(true);
    feedback(out.change === 'up' ? 'levelup' : 'correct');
    setMood('yay');
    setFrog(it.answer);
    if (!hintUsed) correctCount.current += 1;
    say(`${w(it.a)} ${opWord(it)} ${w(it.b)} is ${w(it.answer)}! ${out.change === 'up' ? 'You are a super hopper!' : 'Hop hop hooray!'}`);
    setTimeout(() => {
      const nextIndex = index + 1;
      if (nextIndex >= ROUND_LENGTH) {
        onDone({ correct: correctCount.current, total: ROUND_LENGTH, leveledUp: leveledUp.current });
        return;
      }
      setIndex(nextIndex);
      next(out.state.level, it.id, nextIndex);
    }, 2300);
  }

  async function wrong(msg: string) {
    await record(false);
    feedback('wrong');
    setMood('oops');
    setHintUsed(true);
    say(msg);
    setTimeout(() => {
      setMood('idle');
      busy.current = false;
      started.current = Date.now();
    }, 900);
  }

  async function submitHops() {
    if (!item || !state || busy.current || hops === 0) return;
    busy.current = true;
    const v = checkHops(item, hops);
    if (v === 'correct') return finishCorrect();
    await wrong(
      v === 'too-few'
        ? `You hopped ${w(hops)}. We need ${w(item.b)} hops. Hop ${w(item.b - hops)} more!`
        : `Oops, that's ${w(hops)} hops. We need ${w(item.b)}. Hop back ${w(hops - item.b)}.`,
    );
  }

  async function pick(n: number) {
    if (!item || !state || busy.current) return;
    busy.current = true;
    if (step === 'split') {
      if (n === item.toTen) {
        feedback('correct');
        setFrog(10);
        setTried([]);
        setStep('land');
        say(`Yes! ${w(item.a)} ${opWord(item)} ${w(n)} is ten. ${promptFor(item, 'land')}`);
        setTimeout(() => (busy.current = false), 600);
        return;
      }
      setTried((t) => [...t, n]);
      return wrong(`Let's count the hops from ${w(item.a)} to ten. Try again!`);
    }
    if (n === item.answer) return finishCorrect();
    setTried((t) => [...t, n]);
    if (step === 'land') return wrong(`Start at ten and hop ${w(item.rest)} ${item.op === '+' ? 'forward' : 'back'}. Try again!`);
    return wrong(`Hmm, start at ${w(item.a)} on the line and hop ${w(item.b)} ${item.op === '+' ? 'forward' : 'back'}. Try again!`);
  }

  if (!item || !state) return <div className="screen center">Loading…</div>;

  const showLine = step !== 'choose' || hintUsed || mood === 'yay';
  const shownAnswer = mood === 'yay' ? item.answer : step === 'hop' && hops > 0 ? frog : '?';
  const choices = step === 'split' ? item.splitChoices : item.choices;

  return (
    <div className="screen game hop-game">
      <div className="topbar">
        <button className="back-btn" onClick={onExit} aria-label="Back to levels">⬅️ Levels</button>
        <div className="progress" aria-label={`Question ${index + 1} of ${ROUND_LENGTH}`}>
          {Array.from({ length: ROUND_LENGTH }, (_, i) => (
            <span key={i} className={i < index ? 'dot done' : i === index ? `dot now${slot.current.kind === 'stretch' ? ' bonus' : ''}` : 'dot'} />
          ))}
        </div>
        <button className="icon-btn" onClick={() => say(promptFor(item, step))} aria-label="Say again">🔊</button>
      </div>

      <div className="equation" aria-hidden>
        <span>{item.a}</span> {sym(item)} <span>{item.b}</span> = <span className={`blank ${mood === 'yay' ? 'filled' : ''}`}>{shownAnswer}</span>
      </div>
      {item.mode === 'make10' && (
        <div className="split-eq" aria-hidden>
          {step === 'split' ? `${item.a} ${item.op === '+' ? '➡️' : '⬅️'} 10 = ? 🐾` : `= ${splitText(item)}`}
        </div>
      )}
      {step === 'hop' && <div className="hop-count" aria-label={`${hops} hops`}>{'🐾'.repeat(hops) || ' '}</div>}

      <div className={`line-wrap ${mood}`}>
        {showLine && <Line max={item.lineMax} frog={frog} from={item.a} mark10={item.mode === 'make10'} />}
      </div>

      {step === 'hop' ? (
        <div className="actions">
          <button className="btn secondary" onClick={undo} disabled={hops === 0} aria-label="Hop back one">↩️</button>
          <button className="btn primary huge" onClick={hop} aria-label="Hop">🐸 {item.op === '+' ? '➡️' : '⬅️'}</button>
          <button className="btn primary" onClick={submitHops} disabled={hops === 0} aria-label="Done">✅</button>
        </div>
      ) : (
        <div className="quick-choices number-pick">
          {choices.map((c) => (
            <button key={c} className={`quick-choice ${tried.includes(c) ? 'tried' : ''}`} onClick={() => pick(c)} aria-label={String(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
