import { useEffect, useState } from 'react';
import { AVATARS, MAX_NICKNAME, MAX_PROFILES, avatarName, suggestAvatar } from '../engine/profiles';
import type { Profile } from '../store/db';
import { say } from '../audio/speech';

interface PickerProps {
  profiles: Profile[];
  currentId?: string;
  onPick: (p: Profile) => void;
  onNew: () => void;
  onBack?: () => void;
}

/** "Who's playing?" — one big button per child (avatar + nickname + stars), plus ➕ for a new child. */
export function ProfilePicker({ profiles, currentId, onPick, onNew, onBack }: PickerProps) {
  useEffect(() => {
    say("Who's playing? Tap your animal!");
  }, []);
  const canAdd = profiles.length < MAX_PROFILES;
  return (
    <div className="screen profiles">
      <div className="topbar">
        {onBack ? <button className="back-btn" onClick={onBack} aria-label="Back to home">⬅️ Back</button> : <span />}
        <span />
      </div>
      <h1 className="title" onClick={() => say("Who's playing?")}>Who's playing?</h1>
      <div className="profile-grid">
        {profiles.map((p) => (
          <button
            key={p.id}
            className={`profile-card${p.id === currentId ? ' current' : ''}`}
            onClick={() => {
              say(`Hi ${p.nickname}!`);
              onPick(p);
            }}
            aria-label={`${p.nickname}, ${p.stars} stars`}
          >
            <span className="profile-avatar">{p.avatar}</span>
            <span className="profile-name">{p.nickname}</span>
            <span className="profile-stars">⭐ {p.stars}</span>
          </button>
        ))}
        {canAdd && (
          <button className="profile-card add" onClick={onNew} aria-label="New player">
            <span className="profile-avatar">➕</span>
            <span className="profile-name">New</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface CreateProps {
  usedAvatars: string[];
  onCreate: (nickname: string, avatar: string) => void;
  onBack?: () => void;
}

/** New player: tap an animal (spoken), optionally type a nickname (a grown-up can help), ✅. */
export function CreateProfile({ usedAvatars, onCreate, onBack }: CreateProps) {
  const [avatar, setAvatar] = useState(() => suggestAvatar(usedAvatars));
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    say('Pick your animal!');
  }, []);

  return (
    <div className="screen profiles">
      <div className="topbar">
        {onBack ? <button className="back-btn" onClick={onBack} aria-label="Back">⬅️ Back</button> : <span />}
        <div className="avatar big" aria-hidden>{avatar}</div>
        <span style={{ width: 64 }} />
      </div>
      <h1 className="title" onClick={() => say('Pick your animal!')}>Pick your animal</h1>
      <div className="avatar-grid" role="radiogroup" aria-label="Animals">
        {AVATARS.map((a) => (
          <button
            key={a.emoji}
            role="radio"
            aria-checked={a.emoji === avatar}
            aria-label={a.name}
            className={`avatar-choice${a.emoji === avatar ? ' chosen' : ''}`}
            onClick={() => {
              setAvatar(a.emoji);
              say(a.name);
            }}
          >
            {a.emoji}
          </button>
        ))}
      </div>
      <label className="nickname-field">
        <span>Nickname (a grown-up can help)</span>
        <input
          value={nickname}
          maxLength={MAX_NICKNAME + 4}
          placeholder={avatarName(avatar)}
          autoComplete="off"
          autoCapitalize="words"
          onChange={(e) => setNickname(e.target.value)}
        />
      </label>
      <div className="reward-actions">
        <button
          className="btn primary huge"
          disabled={busy}
          aria-label="Done"
          onClick={() => {
            setBusy(true);
            onCreate(nickname, avatar);
          }}
        >
          ✅
        </button>
      </div>
    </div>
  );
}
