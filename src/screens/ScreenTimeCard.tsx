import { useEffect, useState } from 'react';
import { minutesPlayedToday, type Profile } from '../store/db';
import {
  addExtra,
  BEDTIME_CHOICES,
  bedtimeLabel,
  DAILY_CHOICES,
  dailyLabel,
  EXTRA_STEP_MIN,
  extraToday,
  loadScreenTime,
  saveScreenTime,
  type ScreenTimeSettings,
} from '../engine/screenTime';
import { Emoji } from '../components/Icon';

/** Grown-ups → ⏰ Screen time (#29): daily limit per child, bedtime, and "more time today". Per device. */
export function ScreenTimeCard({ child }: { child?: Profile | null }) {
  const [s, setS] = useState<ScreenTimeSettings>(() => loadScreenTime());
  const [played, setPlayed] = useState<number | null>(null);
  useEffect(() => {
    if (child) minutesPlayedToday(child.id).then((m) => setPlayed(m));
  }, [child]);
  const update = (next: ScreenTimeSettings) => {
    setS(next);
    saveScreenTime(next);
  };
  const extra = extraToday(s, Date.now());
  const on = s.dailyMinutes > 0 || s.bedtime !== null;
  return (
    <section className="settings-card">
      <span className="voice-name"><Emoji text="⏰" /> Screen time</span>
      <span className="voice-sub">
        A gentle stop: the game being played always finishes, then a friendly “Time to rest!” screen shows. Minutes are counted for each child separately (active play, like Progress). Bedtime lasts until 6 am. Saved for this device only.
      </span>
      <label className="field">
        <span>Play time each day</span>
        <select value={s.dailyMinutes} onChange={(e) => update({ ...s, dailyMinutes: Number(e.target.value) })}>
          {DAILY_CHOICES.map((m) => (
            <option key={m} value={m}>{dailyLabel(m)}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Bedtime</span>
        <select value={s.bedtime ?? ''} onChange={(e) => update({ ...s, bedtime: e.target.value === '' ? null : Number(e.target.value) })}>
          {BEDTIME_CHOICES.map((m) => (
            <option key={m ?? 'none'} value={m ?? ''}>{bedtimeLabel(m)}</option>
          ))}
        </select>
      </label>
      {child && played !== null && (
        <span className="voice-sub">{child.nickname} has played {Math.round(played)} min today.</span>
      )}
      <div className="test-row">
        <button className="link-btn strong" disabled={!on} onClick={() => update(addExtra(s, Date.now(), played ?? 0))}>
          + {EXTRA_STEP_MIN} minutes today
        </button>
        <span className="voice-sub" role="status">{extra ? `More time given today (+${extra} min on the limit and bedtime).` : ''}</span>
      </div>
    </section>
  );
}
