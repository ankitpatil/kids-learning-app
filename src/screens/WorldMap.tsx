import { useEffect, useState } from 'react';
import { getTrack, type Subject } from '../engine/tracks';
import { worldMap, lockedMessage, type Island } from '../engine/worldMap';
import { getSkillStates } from '../store/db';
import { say, tapSay } from '../audio/speech';
import { Emoji, Icon } from '../components/Icon';

interface Props {
  profileId: string;
  subject: Subject;
  /** Play a track at the child's current level. */
  onPlay: (trackId: string) => void;
  onBack: () => void;
}

const BLOOM = ['🌱', '🌿', '🌷', '🌸'];
const BLOOM_WORD = ['new', 'growing', 'halfway', 'all done'];

/** #24 World map: an island per skill along a winding path; locked islands say what opens them. */
export function WorldMap({ profileId, subject, onPlay, onBack }: Props) {
  const [islands, setIslands] = useState<Island[] | null>(null);
  const [wobble, setWobble] = useState<string | null>(null);
  useEffect(() => {
    getSkillStates(profileId).then((s) => setIslands(worldMap(subject, s)));
    say('Your island map! | Tap an island to play.');
  }, [profileId, subject]);

  function tap(i: Island) {
    if (i.status === 'locked') {
      setWobble(i.trackId);
      window.setTimeout(() => setWobble(null), 600);
      tapSay(lockedMessage(i));
      return;
    }
    onPlay(i.trackId);
  }

  return (
    <div className={`screen world-map ${subject}`}>
      <div className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Back to levels"><Emoji text="⬅️" /> Back</button>
        <div className="levels-title">{subject === 'math' ? 'Math islands' : 'Reading islands'}</div>
        <span style={{ width: 64 }} />
      </div>
      <ol className="island-path">
        {(islands ?? []).map((i, n) => {
          const t = getTrack(i.trackId);
          const locked = i.status === 'locked';
          return (
            <li key={i.trackId} className={`island-row ${n % 2 ? 'right' : 'left'}`}>
              <button
                className={`island ${i.status} ${wobble === i.trackId ? 'wobble' : ''}`}
                onClick={() => tap(i)}
                aria-label={locked ? `${t.name}: locked. ${lockedMessage(i)}` : `Play ${t.name}: ${BLOOM_WORD[i.bloom]}`}
              >
                <span className="island-icon">{locked ? <Emoji text="🔒" /> : <Icon name={t.icon} />}</span>
                <span className="island-name">{t.name}</span>
                {!locked && <span className={`island-bloom b${i.bloom}`} aria-hidden="true"><Emoji text={BLOOM[i.bloom]} /></span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
