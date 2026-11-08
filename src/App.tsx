import { useEffect, useState } from 'react';
import { FeedMonster } from './games/feedMonster/FeedMonster';
import { PhonicsPop } from './games/phonicsPop/PhonicsPop';
import { ensureProfile, addStars, requestPersistence, setTrackLevels, setPlaced, type Profile } from './store/db';
import { Placement, StartPoint } from './screens/Placement';
import type { Subject } from './engine/tracks';
import { say, isMuted, setMuted } from './audio/speech';

type Game = 'count' | 'phonics';
type Screen =
  | { name: 'home' }
  | { name: Game }
  | { name: 'reward'; game: Game; stars: number; leveledUp: boolean }
  | { name: 'startpoint'; subject: Subject }
  | { name: 'placement'; subject: Subject };

const GAME_FOR: Record<Subject, Game> = { math: 'count', reading: 'phonics' };

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

  async function applyStart(subject: Subject, levels: Record<string, number>) {
    await setTrackLevels(profile!.id, levels);
    setProfile(await setPlaced(profile!.id, subject, true));
    setScreen({ name: GAME_FOR[subject] });
  }

  function openSubject(subject: Subject) {
    if (!profile!.placed?.[subject]) {
      setScreen({ name: 'startpoint', subject });
      return;
    }
    say(subject === 'math' ? 'Feed the monster!' : 'Phonics pop!');
    setScreen({ name: GAME_FOR[subject] });
  }

  if (screen.name === 'startpoint') {
    const subject = screen.subject;
    return (
      <StartPoint
        subject={subject}
        onCheck={() => setScreen({ name: 'placement', subject })}
        onPick={(levels) => applyStart(subject, levels)}
        onExit={() => setScreen({ name: 'home' })}
      />
    );
  }

  if (screen.name === 'placement') {
    const subject = screen.subject;
    return <Placement subject={subject} onDone={(levels) => applyStart(subject, levels)} onExit={() => setScreen({ name: 'home' })} />;
  }

  if (screen.name === 'count') {
    return <FeedMonster profileId={profile.id} onDone={(r) => finishRound('count', r)} onExit={() => setScreen({ name: 'home' })} />;
  }

  if (screen.name === 'phonics') {
    return <PhonicsPop profileId={profile.id} onDone={(r) => finishRound('phonics', r)} onExit={() => setScreen({ name: 'home' })} />;
  }

  if (screen.name === 'reward') {
    return (
      <div className="screen center reward">
        <div className="burst">{'⭐'.repeat(screen.stars)}</div>
        {screen.leveledUp && <div className="unlock">🔓</div>}
        <button className="btn primary huge" onClick={() => setScreen({ name: screen.game })} aria-label="Play again">▶️</button>
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
          aria-label="Reading: Phonics Pop"
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
