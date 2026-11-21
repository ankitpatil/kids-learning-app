import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { E, OBSTACLES, S, makeDinoLevel, nextStop, type DinoLevel, type ObstacleDef } from './maze';
import { addHit, hitsNeeded, layoutTargets, makeDinoPuzzle, pickDinoSlot, type DinoSlot, type HitCounts, type TargetSpot } from './puzzles';
import { createGestureDetector, createHover, inside, type Target } from './gestures';
import { useBodyCamera, type CameraFrame } from './useBodyCamera';
import { scorePop, type PopItem, type PopState } from '../popAnswer/generator';
import { updateSkill, type SkillState } from '../../engine/adaptive';
import { maxLevel, type Subject } from '../../engine/tracks';
import { fresh } from '../../engine/recent';
import { getSkillStates, logAttempt, saveSkillState } from '../../store/db';
import { isNarrationOn, say, stopSpeech, tapSay } from '../../audio/speech';
import { playCorrect, playHit, playKidsCheer, playWrong } from '../../audio/sfx';
import { startChiptune, stopChiptune } from '../../audio/chiptune';
import { setMotionSuspended } from '../../motion/settings';
import { Emoji, Icon } from '../../components/Icon';

interface Props {
  profileId: string;
  onDone: (result: { correct: number; total: number; leveledUp: boolean }) => void;
  onExit: () => void;
}

type Phase = 'intro' | 'walk' | 'puzzle' | 'celebrate' | 'finale';

/** Ms per maze cell: a slow, steady walk (the music plays meanwhile). */
const STEP_MS = 750;
const INSTRUCTION_MS = 2600;
const HEAR_HOLD_MS = 1200;
/** Right answer → back to the maze after this long; then the babies cheer this long before Mom walks on. */
const BACK_TO_MAZE_MS = 1300;
const CELEBRATE_MS = 2600;

/** Hedge segments for the maze walls: one per closed side between two cells (the outside is the frame). */
function hedges(level: DinoLevel) {
  const { cols, rows, open } = level.maze;
  const out: { x: number; y: number; vertical: boolean }[] = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      if (x < cols - 1 && !(open[y][x] & E)) out.push({ x: x + 1, y, vertical: true });
      if (y < rows - 1 && !(open[y][x] & S)) out.push({ x, y: y + 1, vertical: false });
    }
  return out;
}

function MazeBoard({ level, pos, cleared, facing, phase, cheer }: { level: DinoLevel; pos: number; cleared: number; facing: 1 | -1; phase: Phase; cheer: string }) {
  const { maze, path, obstacles } = level;
  const mom = path[pos];
  const walls = useMemo(() => hedges(level), [level]);
  const goal = path[path.length - 1];
  const at = (x: number, y: number) => ({ left: `${((x + 0.5) / maze.cols) * 100}%`, top: `${((y + 0.5) / maze.rows) * 100}%` });
  const party = phase === 'celebrate' || phase === 'finale';
  return (
    <div className="dino-maze" style={{ ['--cols' as string]: maze.cols, ['--rows' as string]: maze.rows }}>
      {path.slice(1, pos).map((c, i) => (
        <span key={i} className="paw" style={at(c.x, c.y)}><Emoji text="🐾" /></span>
      ))}
      {walls.map((w, i) => (
        <span
          key={i}
          className={`hedge ${w.vertical ? 'v' : 'h'}`}
          style={
            w.vertical
              ? { left: `${(w.x / maze.cols) * 100}%`, top: `${(w.y / maze.rows) * 100}%`, height: `calc(${100 / maze.rows}% + var(--hedge))` }
              : { left: `${(w.x / maze.cols) * 100}%`, top: `${(w.y / maze.rows) * 100}%`, width: `calc(${100 / maze.cols}% + var(--hedge))` }
          }
        />
      ))}
      {obstacles.map((ob, k) => {
        const c = path[ob.at];
        const done = k < cleared;
        const justDone = done && k === cleared - 1 && phase === 'celebrate';
        return (
          <span key={k} className={`dino-obstacle ${done ? 'done' : ''} ${justDone ? 'poof' : ''}`} style={at(c.x, c.y)}>
            <Emoji text={done ? '✨' : OBSTACLES[ob.kind].icon} />
          </span>
        );
      })}
      <span className={`dino-nest ${party ? 'party' : ''}`} style={at(goal.x, goal.y)}>
        {phase === 'celebrate' && <span className="nest-yay">Yay!</span>}
        <span className="babies">
          <span className="baby b1"><Emoji text="🦖" /></span>
          <span className="baby b2"><Emoji text="🦖" /></span>
        </span>
        <Emoji text="🪺" />
      </span>
      <span className={`dino-mom ${phase === 'walk' ? 'walking' : ''}`} style={{ ...at(mom.x, mom.y), transitionDuration: `${STEP_MS}ms` }}>
        <span className="mom-flip" style={{ transform: `scaleX(${-facing})` }}>
          <Emoji text="🦕" />
        </span>
      </span>
      {phase === 'celebrate' && cheer && <div className="maze-banner">{cheer}</div>}
    </div>
  );
}

/** The answer target (rock, ice block, vine, web, key, log, stepping stone, bat, coconut) with the choice on it. */
function TargetBody({ def, label, chosen }: { def: ObstacleDef; label: string; chosen: boolean }) {
  const text = <span className="dino-label">{label}</span>;
  if (chosen) return <span className="dino-boom"><Emoji text={def.burst} /></span>;
  if (def.layout === 'hang')
    return (
      <>
        <span className="vine-rope" />
        <span className="vine-sign">{text}</span>
      </>
    );
  if (def.layout === 'high' || def.kind === 'door')
    return (
      <>
        <span className="target-pic"><Emoji text={def.kind === 'door' ? '🔑' : def.target} /></span>
        {text}
      </>
    );
  return text;
}

/**
 * 🦕 Dino Maze — a TV game. Dino Mom walks slowly through the maze (8-bit music) to her babies. Each
 * obstacle on the way opens a full-screen mirror puzzle — one question, answered with a body move
 * (smash, karate chop, two-hand grab/lift, jump, reach up and bonk). An option takes 3–4 hits to
 * choose; each hit changes its colour and plays a rising note. A right answer clears the obstacle:
 * back on the maze the babies jump and cheer, then Mom walks on. Without a camera, tap the targets.
 */
export function DinoMaze({ profileId, onDone, onExit }: Props) {
  const level = useMemo(() => makeDinoLevel(), []);
  const first = useMemo<Subject>(() => (Math.random() < 0.5 ? 'math' : 'reading'), []);
  const [phase, setPhase] = useState<Phase>('intro');
  const [pos, setPos] = useState(0);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [cleared, setCleared] = useState(0);
  const [obstacle, setObstacle] = useState(-1);
  const [item, setItem] = useState<PopItem | null>(null);
  const [spots, setSpots] = useState<TargetSpot[]>([]);
  const [pop, setPop] = useState<PopState>({ tried: [], misses: 0 });
  const [hint, setHint] = useState(false);
  const [wobble, setWobble] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [aimed, setAimed] = useState<string>('');
  const [hear, setHear] = useState(0);
  const [instruction, setInstruction] = useState(false);
  const [hits, setHits] = useState<HitCounts>({});
  const [need, setNeed] = useState(3);
  const [cheer, setCheer] = useState('');

  const states = useRef<Record<string, SkillState>>({});
  const asked = useRef(0);
  const correct = useRef(0);
  const leveledUp = useRef(false);
  const ease = useRef(false);
  const slot = useRef<DinoSlot | null>(null);
  const started = useRef(Date.now());
  const busy = useRef(false);
  const hitsRef = useRef<HitCounts>({});
  const targetEls = useRef<Record<string, HTMLElement | null>>({});
  const hearEl = useRef<HTMLButtonElement>(null);
  const detector = useRef(createGestureDetector('bash'));
  const hover = useRef(createHover(HEAR_HOLD_MS));
  const live = useRef({ phase, item, obstacle, pop, need });
  live.current = { phase, item, obstacle, pop, need };
  const def = obstacle >= 0 ? OBSTACLES[level.obstacles[obstacle].kind] : null;
  const total = level.obstacles.length;

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

  const openPuzzle = useCallback(
    (k: number) => {
      const d = OBSTACLES[level.obstacles[k].kind];
      detector.current = createGestureDetector(d.gesture);
      const sl = pickDinoSlot(asked.current, first, states.current, isNarrationOn());
      slot.current = sl;
      const easy = ease.current;
      ease.current = false;
      const it = fresh(`dino-${sl.trackId}`, () => makeDinoPuzzle(sl, Math.random, easy), (x) => x.id);
      const n = hitsNeeded();
      setObstacle(k);
      setItem(it);
      setSpots(layoutTargets(d.kind, it.choices.length));
      setPop({ tried: [], misses: 0 });
      setHint(false);
      setWobble(null);
      setChosen(null);
      hitsRef.current = {};
      setHits({});
      setNeed(n);
      started.current = Date.now();
      busy.current = false;
      detector.current.reset(performance.now());
      setPhase('puzzle');
      setInstruction(true);
      window.setTimeout(() => setInstruction(false), INSTRUCTION_MS);
      say(`Oh no, a ${d.name.toLowerCase()}! | ${d.instruction} Hit it ${n} times! || ${it.say}`);
    },
    [level, first],
  );

  // Walking: one slow step per cell up to the next obstacle (or the nest).
  useEffect(() => {
    if (phase !== 'walk') return;
    const stop = nextStop(level, pos, cleared);
    if (pos >= stop.to) {
      if (stop.obstacle >= 0) openPuzzle(stop.obstacle);
      else {
        setPhase('finale');
        playKidsCheer();
        say('You found the babies! | Hooray for Dino Mom!');
        window.setTimeout(() => onDone({ correct: correct.current, total, leveledUp: leveledUp.current }), 3400);
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
  }, [phase, pos, cleared, level, openPuzzle, onDone, total]);

  function start() {
    if (live.current.phase !== 'intro') return;
    say('Help Dino Mom find her babies!');
    setPhase('walk');
  }

  async function record(ok: boolean, hintUsed: boolean) {
    const sl = slot.current!;
    const it = live.current.item!;
    await logAttempt({ profileId, skillId: sl.trackId, itemId: it.id, level: sl.level, correct: ok, hintUsed, timeMs: Date.now() - started.current, at: Date.now(), mix: sl.kind });
    if (sl.kind !== 'current') return;
    const cur = states.current[sl.trackId];
    if (!cur) return; // first time on this skill: logged; its level starts when the child plays it
    const out = updateSkill(cur, { correct: ok, hintUsed, timeMs: Date.now() - started.current }, maxLevel(sl.trackId));
    await saveSkillState(out.state);
    states.current = { ...states.current, [sl.trackId]: out.state };
    if (out.change === 'up') leveledUp.current = true;
    if (out.ease) ease.current = true;
  }

  /** An option has been hit enough times: it's chosen. */
  async function choose(label: string) {
    const { item: it, obstacle: k, pop: prev } = live.current;
    if (!it || k < 0) return;
    const r = scorePop(prev, label, it.answer);
    const d = OBSTACLES[level.obstacles[k].kind];
    if (r.outcome === 'right') {
      busy.current = true;
      setChosen(label);
      const hintUsed = prev.tried.length > 0;
      if (!hintUsed) correct.current += 1;
      asked.current += 1;
      playCorrect();
      say(`Yes! | ${label}!`);
      // Back to the maze: the obstacle goes poof, the babies jump and cheer, then Mom walks on.
      window.setTimeout(() => {
        setCleared(k + 1);
        setObstacle(-1);
        setItem(null);
        setCheer(d.cleared);
        setPhase('celebrate');
        playKidsCheer();
        say(d.cleared);
        window.setTimeout(() => setPhase('walk'), CELEBRATE_MS);
      }, BACK_TO_MAZE_MS);
      await record(true, hintUsed);
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

  /** One hit (a swing, chop, grab, jump or tap) on an option. */
  function hitOption(label: string) {
    const { phase: ph, item: it, need: n } = live.current;
    if (ph !== 'puzzle' || !it || busy.current) return;
    const r = addHit(hitsRef.current, label, n);
    hitsRef.current = r.counts;
    setHits({ ...r.counts, [label]: r.hits });
    playHit(r.hits, n);
    if (r.chosen) {
      if (label !== it.answer) window.setTimeout(() => setHits((h) => ({ ...h, [label]: 0 })), 500);
      void choose(label);
    }
  }
  const hitRef = useRef(hitOption);
  hitRef.current = hitOption;

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

  // Camera frames → body moves on the targets.
  const onFrame = useCallback(
    (f: CameraFrame) => {
      const cur = live.current;
      if (cur.phase === 'intro' && f.step.justLocked) {
        start();
        return;
      }
      if (cur.phase !== 'puzzle' || !cur.item || busy.current) {
        setAimedIf('');
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
      // Stepping stones: a marker under the player shows which stone they're standing by.
      if (cur.obstacle >= 0 && OBSTACLES[level.obstacles[cur.obstacle].kind].layout === 'floor' && f.body.torso) {
        const { ctx, height } = f;
        ctx.font = `${Math.round(height * 0.07)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(step.airborne ? '🦘' : '⬇️', f.body.torso.x, height * 0.66);
        ctx.textAlign = 'start';
      }
      if (step.fired) hitRef.current(step.fired);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level],
  );

  const cam = useBodyCamera(true, onFrame);
  const camOk = cam.status !== 'blocked' && cam.status !== 'error';
  const mirror = camOk && (phase === 'puzzle' || phase === 'intro');
  const aimedSet = new Set(aimed ? aimed.split('|') : []);
  const onMaze = phase === 'walk' || phase === 'celebrate' || phase === 'finale' || (phase === 'intro' && !camOk);

  return (
    <div className={`screen dino-game phase-${phase} ${def ? `${def.kind} lay-${def.layout}` : ''} ${mirror ? 'mirror' : ''}`}>
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

      {onMaze && (
        <div className="dino-board">
          <MazeBoard level={level} pos={pos} cleared={cleared} facing={facing} phase={phase} cheer={cheer} />
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

      {phase === 'puzzle' && def && item && (
        <div className="dino-puzzle">
          <button ref={hearEl} className="dino-question" onClick={() => tapSay(item.say)} aria-label={`Hear the question: ${item.say}`} style={{ ['--hear' as string]: hear }}>
            {item.icon ? <span className="dino-q-pic"><Icon name={item.icon} /></span> : item.visual ? <span className="dino-q-pic">{item.visual}</span> : null}
            <span className="dino-q-text">{item.say}</span>
            <span className="dino-q-hear"><Emoji text="🔊" /></span>
          </button>

          {def.layout === 'floor' && <div className={`dino-water ${def.kind}`} />}
          {item.choices.map((label, i) => {
            const s = spots[i];
            if (!s) return null;
            const h = hits[label] ?? 0;
            const cls = ['dino-target', def.kind, `lay-${def.layout}`, aimedSet.has(label) ? 'aim' : '', h > 0 ? 'hit' : '', wobble === label ? 'wobble' : '', pop.tried.includes(label) ? 'tried' : '', chosen === label ? 'smashed' : '', hint && label === item.answer ? 'glow' : '']
              .filter(Boolean)
              .join(' ');
            return (
              <button
                // a new key on every hit restarts the "bump" animation
                key={`${item.id}-${label}-${h}`}
                ref={(el) => (targetEls.current[label] = el)}
                className={cls}
                data-hits={Math.min(h, 4)}
                style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, width: `${s.w * 100}vh`, height: `${s.h * 100}vh`, animationDelay: h > 0 ? undefined : `${-i * 0.7}s` }}
                onPointerDown={() => hitOption(label)}
                aria-label={`${label}: ${h} of ${need} hits`}
              >
                <TargetBody def={def} label={label} chosen={chosen === label} />
                {chosen !== label && (
                  <span className="dino-pips" aria-hidden>
                    {Array.from({ length: need }, (_, j) => (
                      <i key={j} className={j < h ? 'on' : ''} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}

          {instruction && (
            <div className="dino-instruction" aria-live="polite">
              <span className="dino-move"><Emoji text={def.move} /></span>
              <span>
                {def.instruction}
                <small>Hit it {need} times!</small>
              </span>
            </div>
          )}
          {!instruction && camOk && cam.status !== 'ready' && (
            <div className="dino-chip"><Emoji text="🙋" /> {cam.status === 'claiming' ? 'Keep it up…' : 'Raise your hand to play!'}</div>
          )}
          {!instruction && camOk && cam.status === 'ready' && (
            <div className="dino-chip small"><Emoji text={def.move} /> {def.instruction} ×{need}</div>
          )}
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
