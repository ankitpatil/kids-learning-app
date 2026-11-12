import { useEffect, useRef, useState } from 'react';
import { makeWordProblem, eqText, eqSpoken, hintFor, signHint, spokenStory, solve, type WordProblem, type Equation, type Op } from './generator';
import { updateSkill, type SkillState } from '../../engine/adaptive';
import { maxLevel } from '../../engine/tracks';
import { numberWord } from '../../engine/numberWords';
import { getSkillState, getSkillStates, saveSkillState, logAttempt } from '../../store/db';
import { planRound, resolveSlot, type Slot } from '../../engine/roundMix';
import { say } from '../../audio/speech';
import { fresh } from '../../engine/recent';
import { feedback } from '../../components/Feedback';

const ROUND_LENGTH = 8;
const TRACK = 'wordProblems';

interface Props {
  profileId: string;
  onDone: (result: { correct: number; total: number; leveledUp: boolean }) => void;
  onExit: () => void;
}

const ask = (it: WordProblem) =>
  `${spokenStory(it)} ${it.mode === 'equation' ? 'Which number sentence fits the story?' : it.mode === 'build' ? 'Plus or minus?' : ''}`.trim();

function Pictures({ it }: { it: WordProblem }) {
  const e = it.thing.emoji;
  const group = (n: number, cls = '') => (
    <span className={`sum-group ${cls}`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="sum-pic">{e}</span>
      ))}
    </span>
  );
  if (it.kind === 'takeFrom') {
    return (
      <div className="sum-pictures" aria-hidden="true">
        <span className="sum-group">
          {Array.from({ length: it.a }, (_, i) => (
            <span key={i} className={`sum-pic ${i >= it.a - it.b ? 'gone' : ''}`}>{e}</span>
          ))}
        </span>
      </div>
    );
  }
  return (
    <div className="sum-pictures" aria-hidden="true">
      {group(it.a)}
      <span className="sum-plus">+</span>
      {group(it.b, 'more')}
    </div>
  );
}

export function StorySums({ profileId, onDone, onExit }: Props) {
  const [state, setState] = useState<SkillState | null>(null);
  const [item, setItem] = useState<WordProblem | null>(null);
  const [index, setIndex] = useState(0);
  const [tried, setTried] = useState<string[]>([]);
  const [sign, setSign] = useState<Op | null>(null);
  const [pics, setPics] = useState(false);
  const [mood, setMood] = useState<'idle' | 'yay' | 'oops'>('idle');
  const hinted = useRef(false);
  const correctCount = useRef(0);
  const leveledUp = useRef(false);
  const ease = useRef(false);
  const started = useRef(Date.now());
  const busy = useRef(false);
  const plan = useRef(planRound(ROUND_LENGTH));
  const all = useRef<Awaited<ReturnType<typeof getSkillStates>>>({});
  const slot = useRef<Slot>({ kind: 'current', trackId: TRACK, level: 0 });

  useEffect(() => {
    Promise.all([getSkillState(profileId, TRACK), getSkillStates(profileId)]).then(([s, states]) => {
      all.current = states;
      setState(s);
      next(s.level, undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  function next(level: number, prevId: string | undefined, i = 0) {
    const easy = ease.current;
    // Single track: review = level below, stretch = level above.
    const sl = (slot.current = resolveSlot(plan.current[i], TRACK, level, all.current, easy));
    const it = fresh(TRACK, () => makeWordProblem(sl.level, Math.random, easy, prevId), (x) => x.id);
    hinted.current = ease.current;
    ease.current = false;
    setItem(it);
    setTried([]);
    setSign(null);
    setPics(it.showPictures);
    setMood('idle');
    started.current = Date.now();
    busy.current = false;
    setTimeout(() => say((sl.kind === 'stretch' ? 'Bonus challenge! ' : '') + ask(it)), 250);
  }

  async function record(correct: boolean) {
    const timeMs = Date.now() - started.current;
    const sl = slot.current;
    await logAttempt({ profileId, skillId: TRACK, itemId: item!.id, level: sl.level, correct, hintUsed: hinted.current, timeMs, at: Date.now(), mix: sl.kind });
    // Review and stretch items are logged but don't move the level.
    if (sl.kind !== 'current') return { state: state!, change: 'same' as const, ease: false };
    const out = updateSkill(state!, { correct, hintUsed: hinted.current, timeMs }, maxLevel(TRACK));
    await saveSkillState(out.state);
    setState(out.state);
    if (out.change === 'up') leveledUp.current = true;
    if (out.ease) ease.current = true;
    return out;
  }

  async function win() {
    const it = item!;
    const out = await record(true);
    feedback(out.change === 'up' ? 'levelup' : 'correct');
    if (!hinted.current) correctCount.current += 1;
    setMood('yay');
    const fact: Equation = { a: it.a, op: it.op, b: it.b, result: it.answer };
    say(`${out.change === 'up' ? 'Super! Harder stories unlocked! ' : 'Yes! '}${eqSpoken(fact)}.`);
    setTimeout(() => {
      const ni = index + 1;
      if (ni >= ROUND_LENGTH) {
        onDone({ correct: correctCount.current, total: ROUND_LENGTH, leveledUp: leveledUp.current });
        return;
      }
      setIndex(ni);
      next(out.state.level, it.id, ni);
    }, 2400);
  }

  async function miss(key: string, hint: string, showPics = true) {
    await record(false);
    feedback('wrong');
    hinted.current = true;
    setTried((t) => [...t, key]);
    setMood('oops');
    if (showPics && item!.answer <= 20) setPics(true);
    say(hint);
    setTimeout(() => {
      setMood('idle');
      busy.current = false;
      started.current = Date.now();
    }, 1600);
  }

  async function pickNumber(n: number) {
    if (!item || busy.current || tried.includes(`n${n}`)) return;
    busy.current = true;
    if (n === item.answer) return win();
    return miss(`n${n}`, `Not ${numberWord(n)}. ${hintFor(item)}`);
  }

  async function pickEquation(e: Equation) {
    if (!item || busy.current || tried.includes(eqText(e))) return;
    busy.current = true;
    if (e.a === item.a && e.b === item.b && e.op === item.op) return win();
    // Wrong sign → explain the action; right sign, wrong number → look at the story's numbers.
    const hint = e.op !== item.op ? signHint(item) : `Look at the numbers in the story. ${item.spokenLines.join(' ')}`;
    return miss(eqText(e), hint, false);
  }

  async function pickSign(op: Op) {
    if (!item || busy.current || sign || tried.includes(`s${op}`)) return;
    busy.current = true;
    if (op === item.op) {
      setSign(op);
      say(`Yes, ${op === '+' ? 'plus' : 'minus'}! ${numberWord(item.a)} ${op === '+' ? 'plus' : 'minus'} ${numberWord(item.b)} equals?`);
      busy.current = false;
      return;
    }
    return miss(`s${op}`, signHint(item), false);
  }

  if (!item || !state) return <div className="screen center">Loading…</div>;

  const right = item.mode === 'equation' ? null : { a: item.a, op: item.op, b: item.b, result: solve(item) };
  return (
    <div className="screen game sums">
      <div className="topbar">
        <button className="back-btn" onClick={onExit} aria-label="Back to levels">⬅️ Levels</button>
        <div className="progress" aria-label={`Question ${index + 1} of ${ROUND_LENGTH}`}>
          {Array.from({ length: ROUND_LENGTH }, (_, i) => (
            <span key={i} className={i < index ? 'dot done' : i === index ? `dot now${slot.current.kind === 'stretch' ? ' bonus' : ''}` : 'dot'} />
          ))}
        </div>
        <button className="icon-btn" onClick={() => say(ask(item))} aria-label="Say again">🔊</button>
      </div>

      <div className={`story-card sum-story ${mood}`} onClick={() => say(spokenStory(item))}>
        {item.lines.map((l, i) => (
          <p key={i} className="story-line">{l}</p>
        ))}
        <p className="story-line sum-question">{item.question}</p>
      </div>

      {pics && <Pictures it={item} />}

      {item.mode === 'build' && right && (
        <div className={`sum-equation ${mood}`} aria-label="Number sentence">
          <span>{item.a}</span>
          <span className={`sum-slot ${sign ? 'filled' : ''}`}>{sign ? (sign === '+' ? '+' : '−') : '?'}</span>
          <span>{item.b}</span>
          <span>=</span>
          <span className={`sum-slot ${mood === 'yay' ? 'filled' : ''}`}>{mood === 'yay' ? item.answer : '?'}</span>
        </div>
      )}

      <div className="word-choices">
        {item.mode === 'build' && !sign &&
          (['+', '-'] as Op[]).map((op) => (
            <button key={op} className={`word-choice sign ${tried.includes(`s${op}`) ? 'tried' : ''}`} onClick={() => pickSign(op)} aria-label={op === '+' ? 'Plus' : 'Minus'}>
              {op === '+' ? '+' : '−'}
            </button>
          ))}
        {(item.mode === 'answer' || (item.mode === 'build' && sign)) &&
          item.choices.map((n) => (
            <button
              key={n}
              className={`word-choice ${tried.includes(`n${n}`) ? 'tried' : ''} ${mood === 'yay' && n === item.answer ? 'right' : ''}`}
              onClick={() => pickNumber(n)}
              aria-label={numberWord(n)}
            >
              {n}
            </button>
          ))}
        {item.mode === 'equation' &&
          item.equations.map((e) => {
            const ok = e.a === item.a && e.b === item.b && e.op === item.op;
            return (
              <button
                key={eqText(e)}
                className={`word-choice equation ${tried.includes(eqText(e)) ? 'tried' : ''} ${mood === 'yay' && ok ? 'right' : ''}`}
                onClick={() => pickEquation(e)}
                aria-label={eqSpoken(e)}
              >
                {eqText(e)}
              </button>
            );
          })}
      </div>
    </div>
  );
}
