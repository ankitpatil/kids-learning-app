import { useEffect, useRef, useState } from 'react';
import { FeedMonster } from './games/feedMonster/FeedMonster';
import { PhonicsPop } from './games/phonicsPop/PhonicsPop';
import { WordDetective } from './games/wordDetective/WordDetective';
import { NumberLineHop } from './games/numberLine/NumberLineHop';
import { SightWordCatch } from './games/sightWords/SightWordCatch';
import { WordBuilder } from './games/wordBuilder/WordBuilder';
import { StoryChoose } from './games/stories/StoryChoose';
import { StorySums } from './games/wordProblems/StorySums';
import { FunFair } from './games/fair/FunFair';
import { ClockGame } from './games/clock/ClockGame';
import { SnackParty } from './games/groups/SnackParty';
import { PopTheAnswer } from './games/popAnswer/PopTheAnswer';
import { DinoMaze } from './games/dinoMaze/DinoMaze';
import { TvGames } from './screens/TvGames';
import { pickPopTrack, type PopTrack } from './games/popAnswer/generator';
import { isHopTrack, type HopTrack } from './games/numberLine/generator';
import { WORD_TRACKS, type WordTrack } from './games/wordDetective/generator';
import { minutesPlayedToday, listProfiles, createProfile, touchProfile, addStars, addSticker, requestPersistence, setTrackLevels, setPlaced, getSkillStates, getSkillState, type Profile } from './store/db';
import { LevelSelect } from './screens/LevelSelect';
import { StickerVault } from './screens/StickerVault';
import { PetHome } from './screens/PetHome';
import { StreakBadge } from './components/StreakBadge';
import { starBalance } from './engine/pet';
import { PET_KIND_BY_ID } from './content/pet';
import { VoicePicker } from './screens/VoicePicker';
import { ParentGate } from './screens/ParentGate';
import { Settings } from './screens/Settings';
import { ParentDashboard } from './screens/ParentDashboard';
import { WorldMap } from './screens/WorldMap';
import { ProfilePicker, CreateProfile } from './screens/Profiles';
import { startupProfileId } from './engine/profiles';
import { pickSticker } from './engine/stickers';
import type { Sticker } from './content/stickers';
import { playCelebration } from './audio/sfx';
import { Confetti } from './components/Confetti';
import { levelsFromCheckpoint, masteredFromCheckpoint } from './engine/placement';
import { pickTrack } from './engine/tracks';
import { Placement, StartPoint } from './screens/Placement';
import type { Subject } from './engine/tracks';
import { say, isNarrationOn, setNarration, stopSpeech, tapSay } from './audio/speech';
import { MoveModeToggle } from './components/MotionLayer';
import { Emoji, Icon } from './components/Icon';
import { Bedtime } from './screens/Bedtime';
import { loadScreenTime, timeState, SCREEN_TIME_EVENT, type TimeState } from './engine/screenTime';

type Game = 'count' | 'missing' | 'placeValue' | 'compare2d' | HopTrack | 'phonics' | WordTrack | 'sightWords' | 'endings' | 'stories' | 'wordProblems' | 'money' | 'time' | 'grouping' | 'dino';
type Screen =
  | { name: 'home' }
  | { name: Game }
  | { name: 'pop'; trackId: PopTrack }
  | { name: 'reward'; game: Game; stars: number; leveledUp: boolean; sticker: Sticker; isNew: boolean; pop?: boolean }
  | { name: 'levels'; subject: Subject }
  | { name: 'map'; subject: Subject }
  | { name: 'tv' }
  | { name: 'vault'; from?: Screen }
  | { name: 'pet'; from?: Screen }
  | { name: 'startpoint'; subject: Subject }
  | { name: 'placement'; subject: Subject }
  | { name: 'profiles' }
  | { name: 'newProfile' }
  | { name: 'voice' }
  | { name: 'gate' }
  | { name: 'settings' }
  | { name: 'dashboard' };

const SUBJECT_OF = (g: Game): Subject => (g === 'count' || g === 'missing' || g === 'placeValue' || g === 'compare2d' || g === 'wordProblems' || g === 'money' || g === 'time' || g === 'grouping' || isHopTrack(g) ? 'math' : 'reading');
/** Screens a grown-up or another child still needs when time is up; everything else shows the bedtime screen. */
const OPEN_WHEN_UP = new Set<Screen['name']>(['profiles', 'newProfile', 'gate', 'settings', 'voice', 'dashboard', 'reward']);
/** Screens where the time check runs. Games are not on it, so a round in progress is never cut off. */
const CHECK_ON = new Set<Screen['name']>(['home', 'levels', 'map', 'tv', 'reward', 'vault', 'pet', 'startpoint', 'profiles', 'settings']);
const isWordTrack = (g: string): g is WordTrack => (WORD_TRACKS as readonly string[]).includes(g);

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const praiseTimer = useRef<number | undefined>(undefined);
  // Leaving the reward screen early cancels the delayed spoken praise.
  useEffect(() => {
    if (screen.name !== 'reward') window.clearTimeout(praiseTimer.current);
  }, [screen.name]);
  const [narrating, setNarrating] = useState(isNarrationOn());
  const [time, setTime] = useState<TimeState>({ state: 'off' });

  // Screen-time cap (#29): re-check on every non-game screen, each minute there, and when a grown-up changes it.
  const checking = CHECK_ON.has(screen.name);
  const profileId = profile?.id;
  useEffect(() => {
    if (!checking || !profileId) return;
    let live = true;
    const check = async () => {
      const s = loadScreenTime();
      const played = s.dailyMinutes ? await minutesPlayedToday(profileId) : 0;
      if (live) setTime(timeState(s, played, Date.now()));
    };
    check();
    const id = window.setInterval(check, 60_000);
    window.addEventListener(SCREEN_TIME_EVENT, check);
    return () => {
      live = false;
      window.clearInterval(id);
      window.removeEventListener(SCREEN_TIME_EVENT, check);
    };
  }, [checking, profileId, screen]);

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
    stopSpeech();
    if (p.id !== profile?.id) setTime({ state: 'off' }); // re-checked for this child on the home screen
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

  if (time.state === 'up' && !OPEN_WHEN_UP.has(screen.name)) {
    return <Bedtime profile={profile} reason={time.reason} onProfiles={openProfiles} onGrownUps={() => setScreen({ name: 'gate' })} />;
  }
  const almost = time.state === 'soon' ? (
    <button className="time-left" onClick={() => tapSay(`Almost time to rest. | ${time.minutesLeft === 1 ? 'One more minute' : `${time.minutesLeft} more minutes`}!`)} aria-label={`${time.minutesLeft} minutes left today`}>
      <Emoji text="🌙" /> {time.minutesLeft} min
    </button>
  ) : null;

  async function finishRound(game: Game, r: { correct: number; total: number; leveledUp: boolean }, pop = false) {
    const stars = Math.max(1, Math.round((r.correct / r.total) * 3)) + (r.leveledUp ? 1 : 0);
    const total = await addStars(profile!.id, stars);
    // One sticker per round; a level-up or a perfect round earns a rare one.
    const owned = profile!.stickers ?? {};
    const sticker = pickSticker(owned, r.leveledUp || r.correct === r.total);
    const isNew = !owned[sticker.id];
    const updated = await addSticker(profile!.id, sticker.id);
    setProfile({ ...updated, stars: total });
    setScreen({ name: 'reward', game, stars, leveledUp: r.leveledUp, sticker, isNew, pop });
    // Trumpet fanfare + applause, then the spoken praise once it quietens down.
    const quietIn = playCelebration();
    praiseTimer.current = window.setTimeout(() => say(`${r.leveledUp ? 'Amazing! | A harder level is unlocked!' : 'Great job!'} || You got a ${sticker.name} sticker!`), quietIn);
  }

  async function launch(subject: Subject) {
    const game = pickTrack(subject, await getSkillStates(profile!.id)) as Game;
    say(game === 'phonics' ? 'Phonics pop!' : game === 'sightWords' ? 'Sight word catch!' : game === 'endings' ? 'Word builder!' : game === 'stories' ? 'Story time!' : game === 'wordProblems' ? 'Story sums!' : game === 'money' ? 'Fun at the fair!' : game === 'time' ? 'Tick tock clock!' : game === 'grouping' ? 'Snack party!' : isWordTrack(game) ? 'Word detective!' : isHopTrack(game) ? 'Number line hop!' : 'Feed the monster!');
    setScreen({ name: game });
  }

  /** M3 🎈 Pop the Answer on the child's next skill that Pop can play. */
  async function startPop(subject: Subject) {
    const trackId = pickPopTrack(subject, await getSkillStates(profile!.id));
    say('Pop the answer!');
    setScreen({ name: 'pop', trackId });
  }

  async function applyStart(subject: Subject, best: number) {
    await setTrackLevels(profile!.id, levelsFromCheckpoint(subject, best), masteredFromCheckpoint(subject, best));
    setProfile(await setPlaced(profile!.id, subject, true));
    setScreen({ name: 'levels', subject }); // starting point set → show the levels (▶️ Play next is on top)
  }

  /** Subject tile: first time → starting point; after that → the level screen (with ▶️ Play next on top). */
  function openSubject(subject: Subject) {
    if (!profile!.placed?.[subject]) {
      setScreen({ name: 'startpoint', subject });
      return;
    }
    setScreen({ name: 'levels', subject });
  }

  const toLevels = (subject: Subject) => {
    stopSpeech();
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
        onPlayNext={() => launch(subject)}
        onPop={() => startPop(subject)}
        onCheck={() => setScreen({ name: 'startpoint', subject })}
        onMap={() => setScreen({ name: 'map', subject })}
        onBack={() => setScreen({ name: 'home' })}
      />
    );
  }

  if (screen.name === 'map') {
    const subject = screen.subject;
    return <WorldMap profileId={profile.id} subject={subject} onPlay={(t) => playTrack(t)} onBack={() => toLevels(subject)} />;
  }

  if (screen.name === 'voice') {
    return <VoicePicker onBack={() => setScreen({ name: 'settings' })} />;
  }

  if (screen.name === 'gate') {
    return <ParentGate onPass={() => setScreen({ name: 'settings' })} onBack={() => setScreen({ name: 'home' })} />;
  }

  if (screen.name === 'settings') {
    return <Settings onBack={() => setScreen({ name: 'home' })} onVoice={() => setScreen({ name: 'voice' })} onProgress={() => setScreen({ name: 'dashboard' })} child={profile} />;
  }

  if (screen.name === 'dashboard') {
    return <ParentDashboard currentId={profile?.id} onBack={() => setScreen({ name: 'settings' })} />;
  }

  if (screen.name === 'vault') {
    const from = screen.from;
    return <StickerVault owned={profile.stickers ?? {}} onBack={() => setScreen(from ?? { name: 'home' })} />;
  }

  if (screen.name === 'pet') {
    const from = screen.from;
    return <PetHome profile={profile} onChange={setProfile} onBack={() => setScreen(from ?? { name: 'home' })} />;
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

  if (screen.name === 'count' || screen.name === 'missing' || screen.name === 'placeValue' || screen.name === 'compare2d') {
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

  if (screen.name === 'pop') {
    const track = screen.trackId;
    return <PopTheAnswer key={track} profileId={profile.id} trackId={track} onDone={(r) => finishRound(track, r, true)} onExit={() => toLevels(SUBJECT_OF(track))} />;
  }

  if (screen.name === 'tv') {
    return <TvGames onPlay={() => setScreen({ name: 'dino' })} onBack={() => setScreen({ name: 'home' })} />;
  }

  if (screen.name === 'dino') {
    return <DinoMaze profileId={profile.id} onDone={(r) => finishRound('dino', r)} onExit={() => setScreen({ name: 'tv' })} />;
  }

  if (screen.name === 'endings') {
    return <WordBuilder profileId={profile.id} onDone={(r) => finishRound('endings', r)} onExit={() => toLevels('reading')} />;
  }

  if (screen.name === 'wordProblems') {
    return <StorySums profileId={profile.id} onDone={(r) => finishRound('wordProblems', r)} onExit={() => toLevels('math')} />;
  }

  if (screen.name === 'grouping') {
    return <SnackParty profileId={profile.id} onDone={(r) => finishRound('grouping', r)} onExit={() => toLevels('math')} />;
  }

  if (screen.name === 'time') {
    return <ClockGame profileId={profile.id} onDone={(r) => finishRound('time', r)} onExit={() => toLevels('math')} />;
  }

  if (screen.name === 'money') {
    return <FunFair profileId={profile.id} onDone={(r) => finishRound('money', r)} onExit={() => toLevels('math')} />;
  }

  if (screen.name === 'stories') {
    return <StoryChoose profileId={profile.id} onDone={(r) => finishRound('stories', r)} onExit={() => toLevels('reading')} />;
  }

  if (screen.name === 'sightWords') {
    return <SightWordCatch profileId={profile.id} onDone={(r) => finishRound('sightWords', r)} onExit={() => toLevels('reading')} />;
  }

  if (screen.name === 'phonics') {
    return <PhonicsPop profileId={profile.id} onDone={(r) => finishRound('phonics', r)} onExit={() => toLevels('reading')} />;
  }

  if (screen.name === 'reward') {
    return (
      <div className="screen center reward">
        <Confetti />
        {almost}
        <div className="burst"><Emoji text={'⭐'.repeat(screen.stars)} /></div>
        {screen.leveledUp && <div className="unlock"><Emoji text="🔓" /></div>}
        <button className={`sticker-reveal ${screen.sticker.rarity}`} onClick={() => setScreen({ name: 'vault', from: screen })} aria-label={`New sticker: ${screen.sticker.name}. Open sticker book`}>
          <span className="sticker-emoji"><Icon name={screen.sticker.icon} /></span>
          {screen.isNew && <span className="new-tag">NEW</span>}
        </button>
        <div className="reward-actions">
          <button className="btn secondary" onClick={() => (screen.game === 'dino' ? setScreen({ name: 'tv' }) : toLevels(SUBJECT_OF(screen.game)))} aria-label={screen.game === 'dino' ? 'TV games' : 'Pick a level'}><Emoji text="⬅️" /></button>
          <button className="btn primary huge" onClick={() => (screen.game === 'dino' ? setScreen({ name: 'dino' }) : screen.pop ? startPop(SUBJECT_OF(screen.game)) : launch(SUBJECT_OF(screen.game)))} aria-label="Play again"><Emoji text="▶️" /></button>
          <button className="btn secondary" onClick={() => setScreen({ name: 'vault', from: screen })} aria-label="Sticker book"><Emoji text="📒" /></button>
          <button className="btn secondary" onClick={() => setScreen({ name: 'pet', from: screen })} aria-label="My pet"><Emoji text="🐾" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen home">
      <div className="topbar">
        <button className="avatar-btn" onClick={openProfiles} aria-label={`${profile.nickname}. Switch player`}>
          <span className="avatar"><Emoji text={profile.avatar} /></span>
          <span className="avatar-name">{profile.nickname}</span>
        </button>
        <button className="stars pet-btn" onClick={() => setScreen({ name: 'pet' })} aria-label={`My pet. ${starBalance(profile)} stars to spend`}>
          {profile.pet && PET_KIND_BY_ID.has(profile.pet.kind) ? <Icon name={PET_KIND_BY_ID.get(profile.pet.kind)!.icon} /> : <Emoji text="🐾" />} <Emoji text="⭐" /> {starBalance(profile)}
        </button>
        <button className="icon-btn" onClick={() => setScreen({ name: 'vault' })} aria-label="Sticker book"><Emoji text="📒" /></button>
        <MoveModeToggle />
        <button
          className={`icon-btn ${narrating ? '' : 'quiet'}`}
          aria-label={narrating ? 'Talking on. Turn talking off' : 'Talking off. Turn talking on'}
          aria-pressed={narrating}
          onClick={() => {
            setNarration(!narrating);
            setNarrating(!narrating);
            if (!narrating) tapSay('Talking on!');
          }}
        >
          <Emoji text={narrating ? '🗣️' : '🤫'} />
        </button>
      </div>
      <h1 className="title" onClick={() => tapSay('Pick a game!')}>Little Learners</h1>
      <StreakBadge profileId={profile.id} refreshKey={profile.stars} />
      {almost}
      <div className="subjects">
        <button
          className="subject math"
          onClick={() => openSubject('math')}
          aria-label="Math games"
        >
          <span className="big-emoji"><Emoji text="👾🍪" /></span>
          <span className="subject-name">Math</span>
          <span className="label">1 2 3</span>
        </button>
        <button
          className="subject reading"
          onClick={() => openSubject('reading')}
          aria-label="Reading games"
        >
          <span className="big-emoji"><Emoji text="🎈🔤" /></span>
          <span className="subject-name">Reading</span>
          <span className="label">a b c</span>
        </button>
        <button
          className="subject tv"
          onClick={() => setScreen({ name: 'tv' })}
          aria-label="TV games: play with your whole body"
        >
          <span className="big-emoji"><Emoji text="📺🦕" /></span>
          <span className="subject-name">TV Games</span>
          <span className="label">jump &amp; play</span>
        </button>
      </div>
      <div className="parent-links">
        <button className="link-btn" onClick={() => setScreen({ name: 'gate' })}><Emoji text="⚙️" /> Grown-ups</button>
      </div>
    </div>
  );
}
