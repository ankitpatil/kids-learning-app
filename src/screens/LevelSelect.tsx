import { useEffect, useState } from 'react';
import { tracksFor, MASTERED, AGE_BANDS, levelsInBand, type Subject } from '../engine/tracks';
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
        {AGE_BANDS.map((band) => {
          // Each age section lists the tracks with levels suggested for that age, and only those levels.
          const rows = tracks.map((t) => ({ t, idx: levelsInBand(t, band.id) })).filter((r) => r.idx.length > 0);
          if (!rows.length) return null;
          return (
            <section key={band.id} className="age-group" aria-label={`${band.ages}, ${band.grade}`}>
              <h3 className="age-title">
                <span className="age-ages">{band.ages}</span>
                <span className="age-grade">{band.grade}</span>
              </h3>
              {rows.map(({ t, idx }) => {
                const s = states?.[t.id];
                const level = s?.level ?? 0;
                const done = s && level === t.levels.length - 1 && s.mastery > MASTERED;
                // ▶ plays the child's current level if it's in this age group, else this group's first level.
                const playLevel = idx.includes(level) ? undefined : idx[0];
                const bandDone = done || idx.every((i) => i < level);
                return (
                  <div key={t.id} className={`track-card ${subject}`}>
                    <button className="track-main" onClick={() => onPlay(t.id, playLevel)} aria-label={`Play ${t.name}`}>
                      <span className="track-emoji">{t.emoji}</span>
                      <span className="track-name">{t.name}</span>
                      {bandDone && <span className="track-done">✅</span>}
                      <span className="track-play">▶️</span>
                    </button>
                    <div className="level-chips">
                      {idx.map((i) => (
                        <button
                          key={i}
                          className={`chip ${i === level ? 'current' : ''} ${i < level || done ? 'passed' : ''}`}
                          onClick={() => onPlay(t.id, i)}
                          aria-label={`${t.name} level ${i + 1}: ${t.levels[i].label}`}
                          title={t.levels[i].label}
                        >
                          {i < level || done ? '⭐' : i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
      <button className="link-btn" onClick={onCheck}>🎯 Quick check / starting point</button>
    </div>
  );
}
