import { useEffect, useState } from 'react';
import { FeedMonster } from './games/feedMonster/FeedMonster';
import { PhonicsPop } from './games/phonicsPop/PhonicsPop';
import { WordDetective } from './games/wordDetective/WordDetective';
import { NumberLineHop } from './games/numberLine/NumberLineHop';
import { isHopTrack, type HopTrack } from './games/numberLine/generator';
import { WORD_TRACKS, type WordTrack } from './games/wordDetective/generator';
import { listProfiles, createProfile, touchProfile, addStars, addSticker, requestPersistence, setTrackLevels, setPlaced, getSkillStates, getSkillState, type Profile } from './store/db';
import { LevelSelect } from './screens/LevelSelect';
import { StickerVault } from './screens/StickerVault';
import { ProfilePicker, CreateProfile } from './screens/Profiles';
import { startupProfileId } from './engine/profiles';
import { pickSticker } from './engine/stickers';
import type { Sticker } from './content/stickers';
import { playSparkle } from './audio/sfx';
import { levelsFromCheckpoint, masteredFromCheckpoint } from './engine/placement';
import { pickTrack } from './engine/tracks';
import { Placement, StartPoint } from './screens/Placement';
import type { Subject } from './engine/tracks';
import { say, isMuted, setMuted } from './audio/speech';

type Game = 'count' | 'missing' | HopTrack | 'phonics' | WordTrack;
type Screen =
  | { name: 'home' }
  | { name: Game }
  | { name: 'reward'; game: Game; stars: number; leveledUp: boolean; sticker: Sticker; isNew: boolean }
  | { name: 'levels'; subject: Subject }
  | { name: 'vault'; from?: Screen }
  | { name: 'startpoint'; subject: Subject }
  | { name: 'placement'; subject: Subject }
  | { name: 'profiles' }
  | { name: 'newProfile' };

const SUBJECT_OF = (g: Game): Subject => (g === 'count' || g === 'missing' || isHopTrack(g) ? 'math' : 'reading');
const isWordTrack = (g: string): g is WordTrack => (WORD_TRACKS as readonly string[]).includes(g);

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [muted, setMutedState] = useState(isMuted());

  useEffect(() => {
    listProfiles().then((list) => {
      setProfiles(list);
      const only = startupProfileId(list.map((p) => p.id));
      if (only) setProfile(list[0]);
      else setScreen(list.length ? { name: 'profiles' } : { name: 'newProfile' });
    });
    requestPersistence();
  }, []);

  function choose(p: Profile) {
    window.speechSynthesis?.cancel();
    setProfile(p);
    touchProfile(p.id);
    setScreen({ name: 'home' });
  }

  async function openProfiles() {
    setProfiles(await listProfiles());
    setScreen({ name: 'profiles' });
  }

  if (!profiles) return <div className="screen center">…</div>;

  if (screen.name === 'profiles') {
    return <ProfilePicker profiles={profiles} currentId={profile?.id} onPick={choose} onNew={() => setScreen({ name: 'newProfile' })} onBack={profile ? () => setScreen({ name: 'home' }) : undefined} />;
  }

  if (screen.name === 'newProfile') {
    return (
      <CreateProfile
        usedAvatars={profiles.map((p) => p.avatar)}
        onBack={profiles.length ? () => setScreen({ name: 'profiles' }) : undefined}
        onCreate={async (nickname, avatar) => {
          const p = await createProfile(nickname, avatar);
          setProfiles(await listProfiles());
          say(`Hi ${p.nickname}!`);
          choose(p);
        }}
      />
    );
  }

  if (!profile) return <div className="screen center">…</div>;

  async function finishRound(game: Game, r: { correct: number; total: number; leveledUp: boolean }) {
    const stars = Math.max(1, Math.round((r.correct / r.total) * 3)) + (r.leveledUp ? 1 : 0);
    const total = await addStars(profile!.id, stars);
    // One sticker per round; a level-up or a perfect round earns a rare one.
    const owned = profile!.stickers ?? {};
    const sticker = pickSticker(owned, r.leveledUp || r.correct === r.total);
    const isNew = !owned[sticker.id];
    const updated = await addSticker(profile!.id, sticker.id);
    setProfile({ ...updated, stars: total });
    setScreen({ name: 'reward', game, stars, leveledUp: r.leveledUp, sticker, isNew });
    setTimeout(playSparkle, 600);
    say(`${r.leveledUp ? 'Amazing! A harder level is unlocked!' : 'Great job!'} You got a ${sticker.name} sticker!`);
  }

  async function launch(subject: Subject) {
    const game = pickTrack(subject, await getSkillStates(profile!.id)) as Game;
    say(game === 'phonics' ? 'Phonics pop!' : isWordTrack(game) ? 'Word detective!' : isHopTrack(game) ? 'Number line hop!' : 'Feed the monster!');
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

  const toLevels = (subject: Subject) => {
    window.speechSynthesis?.cancel();
    setScreen({ name: 'levels', subject });
  };

  async function playTrack(trackId: string, level?: number) {
    if (level !== undefined) {
      const cur = await getSkillState(profile!.id, trackId);
      if (cur.level !== level) await setTrackLevels(profile!.id, { [trackId]: level });
    }
    setScreen({ name: trackId as Game });
  }

  if (screen.name === 'levels') {
    const subject = screen.subject;
    return (
      <LevelSelect
        profileId={profile.id}
        subject={subject}
        onPlay={playTrack}
        onCheck={() => setScreen({ name: 'startpoint', subject })}
        onBack={() => setScreen({ name: 'home' })}
      />
    );
  }

  if (screen.name === 'vault') {
    const from = screen.from;
    return <StickerVault owned={profile.stickers ?? {}} onBack={() => setScreen(from ?? { name: 'home' })} />;
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
    return <FeedMonster key={track} profileId={profile.id} trackId={track} onDone={(r) => finishRound(track, r)} onExit={() => toLevels('math')} />;
  }

  if (isHopTrack(screen.name)) {
    const track = screen.name;
    return <NumberLineHop key={track} profileId={profile.id} trackId={track} onDone={(r) => finishRound(track, r)} onExit={() => toLevels('math')} />;
  }

  if (isWordTrack(screen.name)) {
    const track = screen.name;
    return <WordDetective key={track} profileId={profile.id} trackId={track} onDone={(r) => finishRound(track, r)} onExit={() => toLevels('reading')} />;
  }

  if (screen.name === 'phonics') {
    return <PhonicsPop profileId={profile.id} onDone={(r) => finishRound('phonics', r)} onExit={() => toLevels('reading')} />;
  }

  if (screen.name === 'reward') {
    return (
      <div className="screen center reward">
        <div className="burst">{'⭐'.repeat(screen.stars)}</div>
        {screen.leveledUp && <div className="unlock">🔓</div>}
        <button className={`sticker-reveal ${screen.sticker.rarity}`} onClick={() => setScreen({ name: 'vault', from: screen })} aria-label={`New sticker: ${screen.sticker.name}. Open sticker book`}>
          <span className="sticker-emoji">{screen.sticker.emoji}</span>
          {screen.isNew && <span className="new-tag">NEW</span>}
        </button>
        <div className="reward-actions">
          <button className="btn secondary" onClick={() => toLevels(SUBJECT_OF(screen.game))} aria-label="Pick a level">⬅️</button>
          <button className="btn primary huge" onClick={() => launch(SUBJECT_OF(screen.game))} aria-label="Play again">▶️</button>
          <button className="btn secondary" onClick={() => setScreen({ name: 'vault', from: screen })} aria-label="Sticker book">📒</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen home">
      <div className="topbar">
        <button className="avatar-btn" onClick={openProfiles} aria-label={`${profile.nickname}. Switch player`}>
          <span className="avatar">{profile.avatar}</span>
          <span className="avatar-name">{profile.nickname}</span>
        </button>
        <div className="stars" aria-label={`${profile.stars} stars`}>⭐ {profile.stars}</div>
        <button className="icon-btn" onClick={() => setScreen({ name: 'vault' })} aria-label="Sticker book">📒</button>
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
          aria-label="Math games"
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
        <button className="link-btn" onClick={() => setScreen({ name: 'levels', subject: 'math' })}>🗺️ Math levels</button>
        <button className="link-btn" onClick={() => setScreen({ name: 'levels', subject: 'reading' })}>🗺️ Reading levels</button>
      </div>
    </div>
  );
}
