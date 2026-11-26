import { useEffect, useState } from 'react';
import { playStreak } from '../store/db';
import { streakLabel, streakLine, type Streak } from '../engine/streak';
import { tapSay } from '../audio/speech';
import { Emoji } from './Icon';

/** Soft streak (#27b): "🔥 5 play days". Hidden until the first play day. Tap to hear it. */
export function StreakBadge({ profileId, compact = false, refreshKey }: { profileId: string; compact?: boolean; refreshKey?: unknown }) {
  const [s, setS] = useState<Streak | null>(null);
  useEffect(() => {
    let live = true;
    playStreak(profileId).then((r) => live && setS(r));
    return () => { live = false; };
  }, [profileId, refreshKey]);
  if (!s || s.days === 0) return compact ? <span className="streak-spacer" /> : null;
  const label = streakLabel(s);
  return (
    <button
      className={`streak ${compact ? 'compact' : ''} ${s.today ? 'today' : 'paused'}`}
      onClick={() => tapSay(streakLine(s))}
      aria-label={`${label}. ${s.today ? 'You played today' : 'Play a game to add today'}`}
    >
      <Emoji text="🔥" /> {compact ? s.days : label}
    </button>
  );
}
