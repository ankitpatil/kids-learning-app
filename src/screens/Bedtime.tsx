import { useEffect } from 'react';
import { restLine } from '../engine/screenTime';
import { say, tapSay } from '../audio/speech';
import { Emoji, Icon } from '../components/Icon';
import { PET_KIND_BY_ID } from '../content/pet';
import type { Profile } from '../store/db';

/** Screen-time cap (#29): friendly "time to rest" screen. Another child can still pick themselves; a grown-up can give more time. */
export function Bedtime({ profile, reason, onProfiles, onGrownUps }: { profile: Profile; reason: 'minutes' | 'bedtime'; onProfiles: () => void; onGrownUps: () => void }) {
  const line = restLine(reason);
  useEffect(() => {
    say(line);
  }, [line]);
  const pet = profile.pet && PET_KIND_BY_ID.get(profile.pet.kind);
  return (
    <div className="screen center bedtime">
      <button className="bedtime-moon" onClick={() => tapSay(line)} aria-label={line.replace(/\s*\|\s*/g, ' ')}>
        <Emoji text={reason === 'bedtime' ? '🌙' : '😴'} />
        {pet && <span className="bedtime-pet"><Icon name={pet.icon} /></span>}
      </button>
      <h1 className="bedtime-title" onClick={() => tapSay(line)}>{reason === 'bedtime' ? 'Bedtime!' : 'Time to rest!'}</h1>
      <p className="bedtime-sub">{reason === 'bedtime' ? 'See you in the morning.' : 'Great playing today. See you tomorrow!'}</p>
      <div className="bedtime-actions">
        <button className="avatar-btn" onClick={onProfiles} aria-label={`${profile.nickname}. Switch player`}>
          <span className="avatar"><Emoji text={profile.avatar} /></span>
          <span className="avatar-name">{profile.nickname}</span>
        </button>
      </div>
      <div className="parent-links">
        <button className="link-btn" onClick={onGrownUps}><Emoji text="⚙️" /> Grown-ups</button>
      </div>
    </div>
  );
}
