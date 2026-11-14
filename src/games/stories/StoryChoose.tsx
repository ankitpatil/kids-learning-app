import { useEffect, useRef, useState } from 'react';
import { pickStory, unlockedPattern, readMode, makeQuestion, questionSpeech, STORIES_PER_ROUND, TRACK, type QuestionItem, type ReadMode } from './generator';
import type { Story, StoryChoice } from '../../content/stories';
import { tokenize } from '../../audio/readAlong';
import { updateSkill, type SkillState } from '../../engine/adaptive';
import { maxLevel } from '../../engine/tracks';
import { getSkillState, getSkillStates, saveSkillState, logAttempt } from '../../store/db';
import { say, sayAlong } from '../../audio/speech';
import { fresh, remember } from '../../engine/recent';
import { ai } from '../../ai/app';
import { STORY_TOPICS, type StoryTopic } from '../../ai/request';
import { listAiStories, saveAiStory } from '../../store/db';
import { newStory, patternCap, playableCached, fallbackStory, TOPIC_ICONS } from './aiStory';

/** Silence between story lines when reading aloud: a breath, so each sentence lands. */
const LINE_PAUSE_MS = 650;
import { feedback } from '../../components/Feedback';

const QUESTIONS_PER_STORY = 2;
const TOTAL = STORIES_PER_ROUND * QUESTIONS_PER_STORY;

interface Props {
  profileId: string;
  onDone: (result: { correct: number; total: number; leveledUp: boolean }) => void;
  onExit: () => void;
}

type Hi = { line: number; word: number | null } | null;

export function StoryChoose({ profileId, onDone, onExit }: Props) {
  const [state, setState] = useState<SkillState | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [mode, setMode] = useState<ReadMode>('auto');
  const [phase, setPhase] = useState<'read' | 'question'>('read');
  const [question, setQuestion] = useState<QuestionItem | null>(null);
  const [hi, setHi] = useState<Hi>(null);
  const [reading, setReading] = useState(false);
  const [tried, setTried] = useState<string[]>([]);
  const [mood, setMood] = useState<'idle' | 'yay' | 'oops'>('idle');
  const [answered, setAnswered] = useState(0);
  /** ✨ New story: only when Claude helpers are on, set up and online. */
  const [live] = useState(() => ai.isLive());
  const [picker, setPicker] = useState(false);
  const [writing, setWriting] = useState(false);
  const cached = useRef<Story[]>([]);
  const alive = useRef(true);
  const storyNo = useRef(0);
  const qi = useRef(0);
  const unlocked = useRef(0);
  const readHelp = useRef(false);
  const hinted = useRef(false);
  const ease = useRef(false);
  const correctCount = useRef(0);
  const leveledUp = useRef(false);
  const started = useRef(Date.now());
  const busy = useRef(false);
  const level = useRef(0);
  /** Bumped whenever the screen moves on, so stale timers from an earlier step do nothing. */
  const step = useRef(0);
  const cancel = useRef<() => void>(() => {});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  function stop() {
    cancel.current();
    cancel.current = () => {};
    setReading(false);
  }

  useEffect(() => {
    alive.current = true;
    Promise.all([getSkillState(profileId, TRACK), getSkillStates(profileId), listAiStories().catch(() => [])]).then(([s, states, saved]) => {
      cached.current = playableCached(saved);
      unlocked.current = unlockedPattern(states);
      level.current = s.level;
      setState(s);
      beginStory(s.level);
    });
    return () => {
      alive.current = false;
      cancel.current();
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  /** Read lines from..to aloud with word highlighting, then call `then`. */
  function readLines(s: Story, from: number, to: number, then?: () => void) {
    stop();
    setReading(true);
    let stopped = false;
    let inner = () => {};
    cancel.current = () => {
      stopped = true;
      inner();
    };
    const readLine = (i: number) => {
      if (stopped) return;
      if (i > to) {
        setHi(null);
        setReading(false);
        then?.();
        return;
      }
      inner = sayAlong(s.lines[i].text, {
        onWord: (w) => setHi({ line: i, word: w }),
        onEnd: () => later(() => readLine(i + 1), LINE_PAUSE_MS),
      });
    };
    readLine(from);
  }

  function beginStory(lv: number, given?: Story) {
    const token = ++step.current;
    const easy = ease.current;
    const s = given ?? fresh(TRACK, () => pickStory(lv, unlocked.current, Math.random, easy, [], cached.current), (x) => x.id);
    if (given) remember(TRACK, given.id);
    const m = readMode(lv, easy);
    qi.current = 0;
    readHelp.current = false;
    setStory(s);
    setMode(m);
    setPhase('read');
    setQuestion(null);
    setHi(null);
    setTried([]);
    setMood('idle');
    busy.current = false;
    if (m === 'auto') {
      say(`${s.title}.`);
      later(() => token === step.current && readLines(s, 0, s.lines.length - 1, () => later(() => token === step.current && startQuestions(s), 600)), 1500);
    } else {
      later(() => say(m === 'button' ? 'Read the story. | Tap a word, or the speaker, for help. | Tap the green tick when you are done.' : 'Read the story yourself! | Tap a word if you need help. | Then tap the green tick.'), 250);
    }
  }

  function openPicker() {
    if (phase !== 'read' || writing) return;
    step.current++; // cancel the pending auto read-along
    stop();
    setHi(null);
    setPicker(true);
    say('What should your story be about?');
  }

  async function pickTopic(topic: StoryTopic) {
    setPicker(false);
    setWriting(true);
    say('Writing a new story for you!');
    const lv = level.current;
    const easy = ease.current;
    const res = await newStory(lv, patternCap(lv, unlocked.current, easy), topic, {
      client: ai,
      fallback: () => fresh(TRACK, () => fallbackStory(lv, unlocked.current, cached.current, Math.random, easy), (x) => x.id),
      save: (st, t) => saveAiStory(st, t),
    });
    if (!alive.current) return;
    if (res.source === 'claude' && !cached.current.some((c) => c.id === res.story.id)) cached.current = [res.story, ...cached.current];
    setWriting(false);
    beginStory(lv, res.story);
  }

  function readToMe() {
    if (!story || phase !== 'read') return;
    readHelp.current = true; // on levels where the child reads, hearing the whole story counts as a hint
    readLines(story, 0, story.lines.length - 1);
  }

  function tapWord(word: string) {
    stop();
    setHi(null);
    say(word);
  }

  function startQuestions(s: Story = story!) {
    step.current++;
    stop();
    setPhase('question');
    askQuestion(s, 0);
  }

  function askQuestion(s: Story, i: number) {
    const easy = ease.current;
    ease.current = false;
    qi.current = i;
    const q = makeQuestion(s, i, Math.random, easy);
    hinted.current = easy || readHelp.current;
    setQuestion(q);
    setTried([]);
    setMood('idle');
    // Easing: point at the line with the answer straight away.
    setHi(easy ? { line: q.line, word: null } : null);
    started.current = Date.now();
    busy.current = false;
    later(() => say(questionSpeech(q, level.current)), 300);
  }

  async function record(correct: boolean) {
    const timeMs = Date.now() - started.current;
    await logAttempt({ profileId, skillId: TRACK, itemId: question!.id, level: state!.level, correct, hintUsed: hinted.current, timeMs, at: Date.now(), mix: 'current' });
    const out = updateSkill(state!, { correct, hintUsed: hinted.current, timeMs }, maxLevel(TRACK));
    await saveSkillState(out.state);
    setState(out.state);
    level.current = out.state.level;
    if (out.change === 'up') leveledUp.current = true;
    if (out.ease) ease.current = true;
    return out;
  }

  async function choose(c: StoryChoice) {
    if (!story || !question || busy.current || tried.includes(c.text)) return;
    busy.current = true;
    stop();
    if (c.text === question.answer.text) {
      const out = await record(true);
      feedback(out.change === 'up' ? 'levelup' : 'correct');
      if (!hinted.current) correctCount.current += 1;
      setMood('yay');
      setHi({ line: question.line, word: null });
      say(`${out.change === 'up' ? 'Super reading! | New stories unlocked!' : 'Yes!'} || ${story.lines[question.line].text}`);
      const n = answered + 1;
      later(() => {
        setAnswered(n);
        if (qi.current + 1 < QUESTIONS_PER_STORY) return askQuestion(story, qi.current + 1);
        storyNo.current += 1;
        if (storyNo.current >= STORIES_PER_ROUND) return onDone({ correct: correctCount.current, total: TOTAL, leveledUp: leveledUp.current });
        beginStory(out.state.level);
      }, 2600);
      return;
    }
    await record(false);
    feedback('wrong');
    hinted.current = true;
    setTried((t) => [...t, c.text]);
    setMood('oops');
    // Hint: go back to the story and read the line that answers the question.
    say("Let's look at the story again.");
    later(() => readLines(story, question.line, question.line, () => setHi({ line: question.line, word: null })), 1400);
    later(() => {
      setMood('idle');
      busy.current = false;
      started.current = Date.now();
    }, 1600);
  }

  if (!story || !state) return <div className="screen center">Loading…</div>;

  if (picker || writing) {
    return (
      <div className="screen game stories">
        <div className="topbar">
          <button className="back-btn" onClick={() => {
              setPicker(false);
              beginStory(level.current, story);
            }} disabled={writing} aria-label="Back to the story">⬅️</button>
          <span />
          <span style={{ width: 64 }} />
        </div>
        {writing ? (
          <div className="story-writing" role="status" aria-label="Writing a new story">
            <span className="story-writing-pen" aria-hidden="true">✏️</span>
            <span aria-hidden="true">✨📖✨</span>
          </div>
        ) : (
          <div className="topic-grid">
            {STORY_TOPICS.map((t) => (
              <button key={t} className="topic-btn" onClick={() => pickTopic(t)} aria-label={t}>
                <span aria-hidden="true">{TOPIC_ICONS[t]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="screen game stories">
      <div className="topbar">
        <button className="back-btn" onClick={onExit} aria-label="Back to levels">⬅️ Levels</button>
        <div className="progress" aria-label={`Question ${Math.min(answered + 1, TOTAL)} of ${TOTAL}`}>
          {Array.from({ length: TOTAL }, (_, i) => (
            <span key={i} className={i < answered ? 'dot done' : i === answered && phase === 'question' ? 'dot now' : 'dot'} />
          ))}
        </div>
        <button
          className="icon-btn"
          onClick={() => (phase === 'question' && question ? say(questionSpeech(question, state.level)) : say(story.title))}
          aria-label="Say again"
        >
          🔊
        </button>
      </div>

      <div className={`story-card ${phase === 'question' ? 'compact' : ''}`}>
        <h2 className="story-title">
          {story.title}
        </h2>
        {story.lines.map((line, li) => {
          const toks = tokenize(line.text);
          const parts: (string | { w: string; i: number })[] = [];
          let pos = 0;
          toks.forEach((t, i) => {
            if (t.start > pos) parts.push(line.text.slice(pos, t.start));
            parts.push({ w: t.word, i });
            pos = t.end;
          });
          if (pos < line.text.length) parts.push(line.text.slice(pos));
          const lit = hi?.line === li;
          return (
            <p key={li} className={`story-line ${lit ? 'lit' : ''}`}>
              <span>
                {parts.map((p, k) =>
                  typeof p === 'string' ? (
                    <span key={k}>{p}</span>
                  ) : (
                    <span key={k} role="button" tabIndex={0} className={`story-word ${lit && hi?.word === p.i ? 'hi' : ''}`} onClick={() => tapWord(p.w)}>
                      {p.w}
                    </span>
                  ),
                )}
              </span>
            </p>
          );
        })}
      </div>

      {phase === 'read' ? (
        <div className="story-actions">
          {live && (
            <button className="btn secondary" onClick={openPicker} aria-label="New story">✨📖</button>
          )}
          {mode === 'button' && (
            <button className="btn secondary" onClick={readToMe} disabled={reading} aria-label="Read it to me">🔊📖</button>
          )}
          <button className="btn primary huge done-reading" onClick={() => startQuestions()} aria-label="I read it">✅</button>
        </div>
      ) : (
        question && (
          <>
            <p className={`story-question ${mood}`}>{question.q}</p>
            <div className="story-choices">
              {question.choices.map((c) => (
                <button
                  key={c.text}
                  className={`story-choice ${tried.includes(c.text) ? 'tried' : ''} ${mood === 'yay' && c.text === question.answer.text ? 'right' : ''}`}
                  onClick={() => choose(c)}
                  aria-label={c.text}
                >
                  <span className="choice-pic" aria-hidden="true">{c.emoji}</span>
                  <span>{c.text}</span>
                </button>
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
}
