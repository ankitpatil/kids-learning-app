import { useEffect, useState } from 'react';
import { tracksFor, MASTERED, type Subject } from '../engine/tracks';
import { getSkillStates } from '../store/db';
import type { SkillState } from '../engine/adaptive';
import { say } from '../audio/speech';

interface Props {
  profileId: string;
  subject: Subject;
  /** Play a track; `level` is set only when a level chip was tapped. */
  onPlay: (trackId: string, level?: number) => void;
  onCheck: () => void;
  onBack: () => void;
}

/** Pick a skill (and optionally a level) to play. Reached from the in-game Back button. */
export function LevelSelect({ profileId, subject, onPlay, onCheck, onBack }: Props) {
  const [states, setStates] = useState<Record<string, SkillState> | null>(null);
  useEffect(() => {
    getSkillStates(profileId).then(setStates);
    say('Pick what to play!');
  }, [profileId]);

  const tracks = tracksFor(subject).filter((t) => t.playable);
  return (
    <div className="screen levels">
      <div className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Back to home">⬅️ Back</button>
        <div className="levels-title">{subject === 'math' ? '1 2 3' : 'a b c'}</div>
        <span style={{ width: 64 }} />
      </div>
      <div className="track-list">
        {tracks.map((t) => {
          const s = states?.[t.id];
          const level = s?.level ?? 0;
          const done = s && level === t.levels.length - 1 && s.mastery > MASTERED;
          return (
            <div key={t.id} className={`track-card ${subject}`}>
              <button className="track-main" onClick={() => onPlay(t.id)} aria-label={`Play ${t.name}`}>
                <span className="track-emoji">{t.emoji}</span>
                <span className="track-name">{t.name}</span>
                {done && <span className="track-done">✅</span>}
                <span className="track-play">▶️</span>
              </button>
              <div className="level-chips">
                {t.levels.map((l, i) => (
                  <button
                    key={i}
                    className={`chip ${i === level ? 'current' : ''} ${i < level || done ? 'passed' : ''}`}
                    onClick={() => onPlay(t.id, i)}
                    aria-label={`${t.name} level ${i + 1}: ${l.label}`}
                    title={l.label}
                  >
                    {i < level || done ? '⭐' : i + 1}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <button className="link-btn" onClick={onCheck}>🎯 Quick check / starting point</button>
    </div>
  );
}
