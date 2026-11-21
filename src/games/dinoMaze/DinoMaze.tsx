import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ANSWERS_PER_OBSTACLE, E, N, OBSTACLES, S, W, makeDinoLevel, nextStop, type DinoLevel, type ObstacleDef } from './maze';
import { layoutTargets, makeDinoPuzzle, pickDinoSlot, type DinoSlot, type TargetSpot } from './puzzles';
import { createGestureDetector, createHover, inside, type Target } from './gestures';
import { useBodyCamera, type CameraFrame } from './useBodyCamera';
import { scorePop, type PopItem, type PopState } from '../popAnswer/generator';
import { updateSkill, type SkillState } from '../../engine/adaptive';
import { maxLevel, type Subject } from '../../engine/tracks';
import { fresh } from '../../engine/recent';
import { getSkillStates, logAttempt, saveSkillState } from '../../store/db';
import { isNarrationOn, say, stopSpeech, tapSay } from '../../audio/speech';
import { playKidsCheer, playWrong, playCorrect } from '../../audio/sfx';
import { startChiptune, stopChiptune } from '../../audio/chiptune';
import { setMotionSuspended } from '../../motion/settings';
import { Emoji, Icon } from '../../components/Icon';

interface Props {
  profileId: string;
  onDone: (result: { correct: number; total: number; leveledUp: boolean }) => void;
  onExit: () => void;
}

type Phase = 'intro' | 'walk' | 'puzzle' | 'cleared' | 'finale';

/** Ms per maze cell while walking (the music plays meanwhile). */
const STEP_MS = 320;
const INSTRUCTION_MS = 2600;
const HEAR_HOLD_MS = 1200;

function MazeBoard({ level, pos, cleared, facing, phase }: { level: DinoLevel; pos: number; cleared: number; facing: 1 | -1; phase: Phase }) {
  const { maze, path, obstacles } = level;
  const mom = path[pos];
  const walked = useMemo(() => new Set(path.slice(0, pos).map((c) => `${c.x},${c.y}`)), [path, pos]);
  const goal = path[path.length - 1];
  return (
    <div className="dino-maze" style={{ ['--cols' as string]: maze.cols, ['--rows' as string]: maze.rows }}>
      {maze.open.flatMap((row, y) =>
        row.map((o, x) => {
          const walls = [o & N ? '' : 'wn', o & E ? '' : 'we', o & S ? '' : 'ws', o & W ? '' : 'ww'].filter(Boolean).join(' ');
          return (
            <div key={`${x},${y}`} className={`dino-cell ${walls}`}>
              {walked.has(`${x},${y}`) && <span className="paw"><Emoji text="🐾" /></span>}
            </div>
          );
        }),
      )}
      {obstacles.map((ob, k) => {
        const c = path[ob.at];
        const done = k < cleared;
        return (
          <span key={k} className={`dino-obstacle ${done ? 'done' : ''}`} style={{ left: `${((c.x + 0.5) / maze.cols) * 100}%`, top: `${((c.y + 0.5) / maze.rows) * 100}%` }}>
            <Emoji text={done ? '✨' : OBSTACLES[ob.kind].icon} />
          </span>
        );
      })}
      <span className={`dino-nest ${phase === 'finale' ? 'party' : ''}`} style={{ left: `${((goal.x + 0.5) / maze.cols) * 100}%`, top: `${((goal.y + 0.5) / maze.rows) * 100}%` }}>
        <span className="babies"><Emoji text="🦖🦖" /></span>
        <Emoji text="🪺" />
      </span>
      <span
        className={`dino-mom ${phase === 'walk' ? 'walking' : ''}`}
        style={{ left: `${((mom.x + 0.5) / maze.cols) * 100}%`, top: `${((mom.y + 0.5) / maze.rows) * 100}%`, transitionDuration: `${STEP_MS}ms` }}
      >
        <span style={{ display: 'inline-block', transform: `scaleX(${-facing})` }}>
          <Emoji text="🦕" />
        </span>
      </span>
    </div>
  );
}

/** Dino Mom's progress through one obstacle: she moves one step on with each right answer. */
function ObstacleProgress({ def, answers }: { def: ObstacleDef; answers: number }) {
  const cells = [];
  for (let i = 0; i <= ANSWERS_PER_OBSTACLE; i++) {
    if (i === answers) cells.push(<span key="mom" className="dino-step here"><Emoji text="🦕" /></span>);
    if (i < ANSWERS_PER_OBSTACLE) cells.push(<span key={i} className={`dino-step ${i < answers ? 'done' : ''}`}><Emoji text={i < answers ? def.done : def.todo} /></span>);
  }
  return (
    <div className="dino-progress" aria-label={`${answers} of ${ANSWERS_PER_OBSTACLE} done`}>
      {cells}
      <span className="dino-step goal"><Emoji text={def.icon} /></span>
    </div>
  );
}

/** The answer target: a rock, a vine, a key, a stepping stone or a bat, with the choice on it. */
function TargetBody({ def, label, smashed }: { def: ObstacleDef; label: string; smashed: boolean }) {
  const text = <span className="dino-label">{label}</span>;
  if (smashed) return <span className="dino-boom"><Emoji text={def.kind === 'door' ? '🔓' : def.kind === 'river' ? '🦕' : '💥'} /></span>;
  switch (def.kind) {
    case 'vines':
      return (
        <>
          <span className="vine-rope" />
          <span className="vine-sign">{text}</span>
        </>
      );
    case 'door':
      return (
        <>
          <span className="key-pic"><Emoji text="🔑" /></span>
          {text}
        </>
      );
    case 'bats':
      return (
        <>
          <span className="bat-pic"><Emoji text="🦇" /></span>
          {text}
        </>
      );
    default:
      return text;
  }
}

/**
 * 🦕 Dino Maze — a TV game. Dino Mom walks the maze (8-bit music) to her babies; each obstacle on the
 * way opens a full-screen mirror puzzle answered with a body move (smash, chop, two-hand grab, jump).
 * Three right answers clear an obstacle; Mom moves on a step with each one and the babies cheer.
 * Works with touch too (tap the targets) when there's no camera.
 */
export function DinoMaze({ profileId, onDone, onExit }: Props) {
  const level = useMemo(() => makeDinoLevel(), []);
  const first = useMemo<Subject>(() => (Math.random() < 0.5 ? 'math' : 'reading'), []);
  const [phase, setPhase] = useState<Phase>('intro');
  const [pos, setPos] = useState(0);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [cleared, setCleared] = useState(0);
  const [obstacle, setObstacle] = useState(-1);
  const [answers, setAnswers] = useState(0);
  const [item, setItem] = useState<PopItem | null>(null);
  const [spots, setSpots] = useState<TargetSpot[]>([]);
  const [pop, setPop] = useState<PopState>({ tried: [], misses: 0 });
  const [hint, setHint] = useState(false);
  const [wobble, setWobble] = useState<string | null>(null);
  const [smashed, setSmashed] = useState<string | null>(null);
  const [aimed, setAimed] = useState<string>('');
  const [hear, setHear] = useState(0);
  const [instruction, setInstruction] = useState(false);
  const [yay, setYay] = useState(0);

  const states = useRef<Record<string, SkillState>>({});
  const asked = useRef(0);
  const correct = useRef(0);
  const leveledUp = useRef(false);
  const ease = useRef(false);
  const slot = useRef<DinoSlot | null>(null);
  const started = useRef(Date.now());
  const busy = useRef(false);
  const targetEls = useRef<Record<string, HTMLElement | null>>({});
  const hearEl = useRef<HTMLButtonElement>(null);
  const detector = useRef(createGestureDetector('bash'));
  const hover = useRef(createHover(HEAR_HOLD_MS));
  const live = useRef({ phase, item, obstacle, pop });
  live.current = { phase, item, obstacle, pop };
  const def = obstacle >= 0 ? OBSTACLES[level.obstacles[obstacle].kind] : null;
  const total = level.obstacles.length * ANSWERS_PER_OBSTACLE;

  // The app-wide Move-mode camera pauses while this game has its own.
  useEffect(() => {
    setMotionSuspended(true);
    getSkillStates(profileId).then((s) => (states.current = s));
    return () => {
      setMotionSuspended(false);
      stopChiptune();
      stopSpeech();
    };
  }, [profileId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onExit();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  // 8-bit music only while Mom is walking.
  useEffect(() => {
    if (phase === 'walk') startChiptune();
    else stopChiptune();
  }, [phase]);

  const newQuestion = useCallback(
    (k: number) => {
      const kind = level.obstacles[k].kind;
      const sl = pickDinoSlot(asked.current, first, states.current, isNarrationOn());
      slot.current = sl;
      const easy = ease.current;
      ease.current = false;
      const it = fresh(`dino-${sl.trackId}`, () => makeDinoPuzzle(sl, Math.random, easy), (x) => x.id);
      setItem(it);
      setSpots(layoutTargets(kind, it.choices.length));
      setPop({ tried: [], misses: 0 });
      setHint(false);
      setWobble(null);
      setSmashed(null);
      started.current = Date.now();
      busy.current = false;
      detector.current.reset(performance.now());
      return it;
    },
    [level, first],
  );

  const openPuzzle = useCallback(
    (k: number) => {
      const d = OBSTACLES[level.obstacles[k].kind];
      detector.current = createGestureDetector(d.gesture);
      setObstacle(k);
      setAnswers(0);
      const it = newQuestion(k);
      setPhase('puzzle');
      setInstruction(true);
      window.setTimeout(() => setInstruction(false), INSTRUCTION_MS);
      say(`Oh no, a ${d.name.toLowerCase()}! | ${d.instruction} || ${it.say}`);
    },
    [level, newQuestion],
  );

  // Walking: one cell per step up to the next obstacle (or the nest).
  useEffect(() => {
    if (phase !== 'walk') return;
    const stop = nextStop(level, pos);
    if (pos >= stop.to) {
      if (stop.obstacle >= 0) openPuzzle(stop.obstacle);
      else {
        setPhase('finale');
        playKidsCheer();
        say('You found the babies! | Hooray for Dino Mom!');
        window.setTimeout(() => onDone({ correct: correct.current, total, leveledUp: leveledUp.current }), 3200);
      }
      return;
    }
    const t = window.setTimeout(() => {
      const a = level.path[pos];
      const b = level.path[pos + 1];
      if (b.x !== a.x) setFacing(b.x > a.x ? 1 : -1);
      setPos(pos + 1);
    }, STEP_MS);
    return () => window.clearTimeout(t);
  }, [phase, pos, level, openPuzzle, onDone, total]);

  function start() {
    if (phase !== 'intro') return;
    say('Help Dino Mom find her babies!');
    setPhase('walk');
  }

  async function record(ok: boolean, hintUsed: boolean) {
    const sl = slot.current!;
    await logAttempt({ profileId, skillId: sl.trackId, itemId: item!.id, level: sl.level, correct: ok, hintUsed, timeMs: Date.now() - started.current, at: Date.now(), mix: sl.kind });
    if (sl.kind !== 'current') return;
    const cur = states.current[sl.trackId];
    if (!cur) return; // first time on this skill: logged; its level starts when the child plays it
    const out = updateSkill(cur, { correct: ok, hintUsed, timeMs: Date.now() - started.current }, maxLevel(sl.trackId));
    await saveSkillState(out.state);
    states.current = { ...states.current, [sl.trackId]: out.state };
    if (out.change === 'up') leveledUp.current = true;
    if (out.ease) ease.current = true;
  }

  async function hit(label: string) {
    const { phase: ph, item: it, obstacle: k, pop: prev } = live.current;
    if (ph !== 'puzzle' || !it || busy.current || k < 0) return;
    const r = scorePop(prev, label, it.answer);
    const d = OBSTACLES[level.obstacles[k].kind];
    if (r.outcome === 'right') {
      busy.current = true;
      setSmashed(label);
      const hintUsed = prev.tried.length > 0;
      if (!hintUsed) correct.current += 1;
      asked.current += 1;
      playCorrect();
      playKidsCheer();
      setYay((y) => y + 1);
      const done = answers + 1;
      setAnswers(done);
      say(`Yay! | ${label}!`);
      await record(true, hintUsed);
      window.setTimeout(() => {
        if (done >= ANSWERS_PER_OBSTACLE) {
          setPhase('cleared');
          say(d.cleared);
          window.setTimeout(() => {
            setCleared(k + 1);
            setPos(level.obstacles[k].at);
            setObstacle(-1);
            setItem(null);
            setPhase('walk');
          }, 1900);
        } else {
          const next = newQuestion(k);
          say(next.say);
        }
      }, 1300);
      return;
    }
    setPop(r.state);
    live.current.pop = r.state;
    setWobble(label);
    window.setTimeout(() => setWobble((w) => (w === label ? null : w)), 700);
    if (r.hint) setHint(true);
    if (r.outcome === 'wrong') {
      playWrong();
      say(`That one is ${label}. || ${it.say}`);
      await record(false, false);
    }
  }
  const hitRef = useRef(hit);
  hitRef.current = hit;

  // Camera frames → body moves on the targets.
  const onFrame = useCallback(
    (f: CameraFrame) => {
      const cur = live.current;
      if (cur.phase === 'intro' && f.step.justLocked) {
        start();
        return;
      }
      if (cur.phase !== 'puzzle' || !cur.item || busy.current) {
        if (aimedRef.current) setAimedIf('');
        return;
      }
      const targets: Target[] = [];
      for (const label of cur.item.choices) {
        const el = targetEls.current[label];
        if (el) targets.push({ id: label, rect: el.getBoundingClientRect() });
      }
      const step = detector.current.update(f.body, targets);
      setAimedIf(step.aimed.join('|'));
      // Hand on the question card for a moment: hear it again.
      const card = hearEl.current?.getBoundingClientRect();
      const onCard = !!card && [f.body.hands.left, f.body.hands.right].some((p) => p && inside(card, p));
      const hv = hover.current.update(onCard ? 'card' : null, f.body.t);
      setHearIf(hv.progress);
      if (hv.fire) tapSay(cur.item.say);
      // River: a marker under the player's feet shows which stone they're standing by.
      if (cur.obstacle >= 0 && level.obstacles[cur.obstacle].kind === 'river' && f.body.torso) {
        const { ctx, height } = f;
        ctx.font = `${Math.round(height * 0.07)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(step.airborne ? '🦘' : '⬇️', f.body.torso.x, height * 0.66);
        ctx.textAlign = 'start';
      }
      if (step.fired) void hitRef.current(step.fired);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level],
  );
  const aimedRef = useRef('');
  const setAimedIf = (s: string) => {
    if (s !== aimedRef.current) {
      aimedRef.current = s;
      setAimed(s);
    }
  };
  const hearRef = useRef(0);
  const setHearIf = (p: number) => {
    if (Math.abs(p - hearRef.current) > 0.04 || (p === 0 && hearRef.current !== 0)) {
      hearRef.current = p;
      setHear(p);
    }
  };

  const cam = useBodyCamera(true, onFrame);
  const camOk = cam.status !== 'blocked' && cam.status !== 'error';
  const mirror = camOk && (phase === 'puzzle' || phase === 'cleared' || phase === 'intro');
  const aimedSet = new Set(aimed ? aimed.split('|') : []);

  return (
    <div className={`screen dino-game phase-${phase} ${def ? def.kind : ''} ${mirror ? 'mirror' : ''}`}>
      <video ref={cam.videoRef} className="dino-video" playsInline muted aria-hidden />
      <canvas ref={cam.canvasRef} className="dino-canvas" aria-hidden />

      <div className="dino-top">
        <button className="back-btn" onClick={onExit} aria-label="Back to TV games"><Emoji text="⬅️" /></button>
        <div className="dino-title"><Emoji text="🦕" /> Dino Maze</div>
        <div className="dino-hearts" aria-label={`${cleared} of ${level.obstacles.length} obstacles cleared`}>
          {level.obstacles.map((o, k) => (
            <span key={k} className={k < cleared ? 'done' : k === obstacle ? 'now' : ''}><Emoji text={k < cleared ? '✨' : OBSTACLES[o.kind].icon} /></span>
          ))}
          <span><Emoji text="🪺" /></span>
        </div>
      </div>

      {(phase === 'walk' || phase === 'finale' || (phase === 'intro' && !camOk)) && (
        <div className="dino-board">
          <MazeBoard level={level} pos={pos} cleared={cleared} facing={facing} phase={phase} />
        </div>
      )}

      {phase === 'intro' && (
        <div className="dino-intro">
          <div className="dino-intro-card">
            <div className="dino-intro-pic"><Emoji text="🦕 ➡️ 🦖🦖" /></div>
            <h2>Help Dino Mom find her babies!</h2>
            {camOk ? (
              <p className="dino-raise">
                <Emoji text="🙋" /> {cam.status === 'starting' ? 'Starting the camera…' : cam.status === 'claiming' ? 'Keep your hand up…' : 'Raise your hand to start!'}
              </p>
            ) : (
              <p className="dino-raise warn"><Emoji text="📷" /> {cam.status === 'blocked' ? 'The camera is blocked — tap to play instead.' : 'No camera — tap to play instead.'}</p>
            )}
            <button className="btn primary huge" onClick={start} aria-label="Start"><Emoji text="▶️" /></button>
          </div>
        </div>
      )}

      {(phase === 'puzzle' || phase === 'cleared') && def && item && (
        <div className="dino-puzzle">
          <button ref={hearEl} className="dino-question" onClick={() => tapSay(item.say)} aria-label={`Hear the question: ${item.say}`} style={{ ['--hear' as string]: hear }}>
            {item.icon ? <span className="dino-q-pic"><Icon name={item.icon} /></span> : item.visual ? <span className="dino-q-pic">{item.visual}</span> : null}
            <span className="dino-q-text">{item.say}</span>
            <span className="dino-q-hear"><Emoji text="🔊" /></span>
          </button>
          <ObstacleProgress def={def} answers={answers} />

          {def.kind === 'river' && <div className="dino-water" />}
          {item.choices.map((label, i) => {
            const s = spots[i];
            if (!s) return null;
            const cls = ['dino-target', def.kind, aimedSet.has(label) ? 'aim' : '', wobble === label ? 'wobble' : '', pop.tried.includes(label) ? 'tried' : '', smashed === label ? 'smashed' : '', hint && label === item.answer ? 'glow' : '']
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={`${item.id}-${label}`}
                ref={(el) => (targetEls.current[label] = el)}
                className={cls}
                style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, width: `${s.w * 100}vh`, height: `${s.h * 100}vh`, animationDelay: `${-i * 0.7}s` }}
                onPointerDown={() => hit(label)}
                aria-label={label}
              >
                <TargetBody def={def} label={label} smashed={smashed === label} />
              </button>
            );
          })}

          {instruction && phase === 'puzzle' && (
            <div className="dino-instruction" aria-live="polite">
              <span className="dino-move"><Emoji text={def.move} /></span>
              <span>{def.instruction}</span>
            </div>
          )}
          {!instruction && camOk && cam.status !== 'ready' && (
            <div className="dino-chip"><Emoji text="🙋" /> {cam.status === 'claiming' ? 'Keep it up…' : 'Raise your hand to play!'}</div>
          )}
          {!instruction && camOk && cam.status === 'ready' && phase === 'puzzle' && (
            <div className="dino-chip small"><Emoji text={def.move} /> {def.instruction}</div>
          )}
          {phase === 'cleared' && (
            <div className="dino-cleared"><span className="dino-cleared-pic"><Emoji text={`${def.done} 🦕 ${def.done}`} /></span><span>{def.cleared}</span></div>
          )}
        </div>
      )}

      {yay > 0 && (phase === 'puzzle' || phase === 'cleared') && (
        <div key={yay} className="dino-yay" aria-hidden>
          <span className="baby b1"><Emoji text="🦖" /></span>
          <span className="yay-bubble">Yay!</span>
          <span className="baby b2"><Emoji text="🦖" /></span>
        </div>
      )}

      {phase === 'finale' && (
        <div className="dino-finale">
          <div className="dino-hug"><span className="baby"><Emoji text="🦖" /></span><Emoji text="🦕" /><span className="baby"><Emoji text="🦖" /></span></div>
          <h2><Emoji text="💞" /> You found the babies! <Emoji text="💞" /></h2>
        </div>
      )}
    </div>
  );
}
