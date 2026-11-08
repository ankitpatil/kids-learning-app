import { useEffect, useState } from 'react';
import { FeedMonster } from './games/feedMonster/FeedMonster';
import { ensureProfile, addStars, requestPersistence, type Profile } from './store/db';
import { say, isMuted, setMuted } from './audio/speech';

type Screen = { name: 'home' } | { name: 'count' } | { name: 'reward'; stars: number; leveledUp: boolean };

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [muted, setMutedState] = useState(isMuted());

  useEffect(() => {
    ensureProfile().then(setProfile);
    requestPersistence();
  }, []);

  if (!profile) return <div className="screen center">…</div>;

  async function finishRound(r: { correct: number; total: number; leveledUp: boolean }) {
    const stars = Math.max(1, Math.round((r.correct / r.total) * 3)) + (r.leveledUp ? 1 : 0);
    const total = await addStars(profile!.id, stars);
    setProfile({ ...profile!, stars: total });
    setScreen({ name: 'reward', stars, leveledUp: r.leveledUp });
    say(r.leveledUp ? `Amazing! You earned ${stars} stars and unlocked a harder level!` : `Great job! You earned ${stars} stars!`);
  }

  if (screen.name === 'count') {
    return <FeedMonster profileId={profile.id} onDone={finishRound} onExit={() => setScreen({ name: 'home' })} />;
  }

  if (screen.name === 'reward') {
    return (
      <div className="screen center reward">
        <div className="burst">{'⭐'.repeat(screen.stars)}</div>
        {screen.leveledUp && <div className="unlock">🔓</div>}
        <button className="btn primary huge" onClick={() => setScreen({ name: 'count' })} aria-label="Play again">▶️</button>
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
          onClick={() => {
            say('Feed the monster!');
            setScreen({ name: 'count' });
          }}
          aria-label="Math: Feed the Monster"
        >
          <span className="big-emoji">👾🍪</span>
          <span className="label">1 2 3</span>
        </button>
        <button className="subject reading locked" onClick={() => say('Reading games are coming soon!')} aria-label="Reading, coming soon">
          <span className="big-emoji">🎈🔤</span>
          <span className="label">A B C</span>
          <span className="lock">🔒</span>
        </button>
      </div>
    </div>
  );
}
