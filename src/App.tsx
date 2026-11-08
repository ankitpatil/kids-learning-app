import { useEffect, useState } from 'react';
import { FeedMonster } from './games/feedMonster/FeedMonster';
import { PhonicsPop } from './games/phonicsPop/PhonicsPop';
import { WordDetective } from './games/wordDetective/WordDetective';
import { WORD_TRACKS, type WordTrack } from './games/wordDetective/generator';
import { ensureProfile, addStars, requestPersistence, setTrackLevels, setPlaced, getSkillStates, type Profile } from './store/db';
import { levelsFromCheckpoint, masteredFromCheckpoint } from './engine/placement';
import { pickTrack } from './engine/tracks';
import { Placement, StartPoint } from './screens/Placement';
import type { Subject } from './engine/tracks';
import { say, isMuted, setMuted } from './audio/speech';

type Game = 'count' | 'missing' | 'phonics' | WordTrack;
type Screen =
  | { name: 'home' }
  | { name: Game }
  | { name: 'reward'; game: Game; stars: number; leveledUp: boolean }
  | { name: 'startpoint'; subject: Subject }
  | { name: 'placement'; subject: Subject };

const SUBJECT_OF = (g: Game): Subject => (g === 'count' || g === 'missing' ? 'math' : 'reading');
const isWordTrack = (g: string): g is WordTrack => (WORD_TRACKS as readonly string[]).includes(g);

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [muted, setMutedState] = useState(isMuted());

  useEffect(() => {
    ensureProfile().then(setProfile);
    requestPersistence();
  }, []);

  if (!profile) return <div className="screen center">…</div>;

  async function finishRound(game: Game, r: { correct: number; total: number; leveledUp: boolean }) {
    const stars = Math.max(1, Math.round((r.correct / r.total) * 3)) + (r.leveledUp ? 1 : 0);
    const total = await addStars(profile!.id, stars);
    setProfile({ ...profile!, stars: total });
    setScreen({ name: 'reward', game, stars, leveledUp: r.leveledUp });
    say(r.leveledUp ? `Amazing! You earned ${stars} stars and unlocked a harder level!` : `Great job! You earned ${stars} stars!`);
  }

  async function launch(subject: Subject) {
    const game = pickTrack(subject, await getSkillStates(profile!.id)) as Game;
    say(game === 'phonics' ? 'Phonics pop!' : isWordTrack(game) ? 'Word detective!' : 'Feed the monster!');
    setScreen({ name: game });
  }

  async function applyStart(subject: Subject, best: number) {
    await setTrackLevels(profile!.id, levelsFromCheckpoint(subject, best), masteredFromCheckpoint(subject, best));
    setProfile(await setPlaced(profile!.id, subject, true));
    await launch(subject);
  }

  function openSubject(subject: Subject) {
    if (!profile!.placed?.[subject]) {
      setScreen({ name: 'startpoint', subject });
      return;
    }
    launch(subject);
  }

  if (screen.name === 'startpoint') {
    const subject = screen.subject;
    return (
      <StartPoint
        subject={subject}
        onCheck={() => setScreen({ name: 'placement', subject })}
        onPick={(best) => applyStart(subject, best)}
        onExit={() => setScreen({ name: 'home' })}
      />
    );
  }

  if (screen.name === 'placement') {
    const subject = screen.subject;
    return <Placement subject={subject} onDone={(best) => applyStart(subject, best)} onExit={() => setScreen({ name: 'startpoint', subject })} />;
  }

  if (screen.name === 'count' || screen.name === 'missing') {
    const track = screen.name;
    return <FeedMonster key={track} profileId={profile.id} trackId={track} onDone={(r) => finishRound(track, r)} onExit={() => setScreen({ name: 'home' })} />;
  }

  if (isWordTrack(screen.name)) {
    const track = screen.name;
    return <WordDetective key={track} profileId={profile.id} trackId={track} onDone={(r) => finishRound(track, r)} onExit={() => setScreen({ name: 'home' })} />;
  }

  if (screen.name === 'phonics') {
    return <PhonicsPop profileId={profile.id} onDone={(r) => finishRound('phonics', r)} onExit={() => setScreen({ name: 'home' })} />;
  }

  if (screen.name === 'reward') {
    return (
      <div className="screen center reward">
        <div className="burst">{'⭐'.repeat(screen.stars)}</div>
        {screen.leveledUp && <div className="unlock">🔓</div>}
        <button className="btn primary huge" onClick={() => launch(SUBJECT_OF(screen.game))} aria-label="Play again">▶️</button>
        <button className="btn secondary" onClick={() => setScreen({ name: 'home' })} aria-label="Home">🏠</button>
      </div>
    );
  }

  return (
    <div className="screen home">
      <div className="topbar">
        <div className="avatar">{profile.avatar}</div>
        <div className="stars" aria-label={`${profile.stars} stars`}>⭐ {profile.stars}</div>
        <button
          className="icon-btn"
          aria-label={muted ? 'Sound on' : 'Sound off'}
          onClick={() => {
            setMuted(!muted);
            setMutedState(!muted);
          }}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
      <h1 className="title" onClick={() => say('Pick a game!')}>Little Learners</h1>
      <div className="subjects">
        <button
          className="subject math"
          onClick={() => openSubject('math')}
          aria-label="Math: Feed the Monster"
        >
          <span className="big-emoji">👾🍪</span>
          <span className="label">1 2 3</span>
        </button>
        <button
          className="subject reading"
          onClick={() => openSubject('reading')}
          aria-label="Reading games"
        >
          <span className="big-emoji">🎈🔤</span>
          <span className="label">a b c</span>
        </button>
      </div>
      <div className="parent-links">
        <button className="link-btn" onClick={() => setScreen({ name: 'startpoint', subject: 'math' })}>🎯 Math level</button>
        <button className="link-btn" onClick={() => setScreen({ name: 'startpoint', subject: 'reading' })}>🎯 Reading level</button>
      </div>
    </div>
  );
}
