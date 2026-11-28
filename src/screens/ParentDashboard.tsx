import { useEffect, useState } from 'react';
import { listProfiles, listAttempts, getSkillStates, type Profile } from '../store/db';
import { summarize, DAY_MS, type DashboardSummary, type TrackRow } from '../engine/dashboard';
import { getTrack } from '../engine/tracks';
import { Emoji, Icon } from '../components/Icon';

const pct = (x: number | null) => (x === null ? '–' : `${Math.round(x * 100)}%`);
const dayName = (t: number) => new Date(t).toLocaleDateString(undefined, { weekday: 'short' });

function when(t: number | null, now: number): string {
  if (t === null) return 'Not played yet';
  const days = Math.floor((now - t) / DAY_MS);
  if (days <= 0 && new Date(t).getDate() === new Date(now).getDate()) return 'Played today';
  if (days <= 1) return 'Played yesterday';
  return `Played ${days} days ago`;
}

function TrackLine({ r }: { r: TrackRow }) {
  return (
    <li className={`dash-track ${r.weak ? 'weak' : ''}`}>
      <span className="dash-track-icon"><Icon name={r.icon} /></span>
      <span className="dash-track-main">
        <span className="voice-name">
          {r.name} {r.mastered && <Emoji text="🏆" label="mastered" />}
        </span>
        <span className="voice-sub">
          Level {r.level + 1} of {r.levels}: {r.levelLabel} · {r.ages}
          {r.recentAnswers > 0 && ` · ${r.recentCorrect}/${r.recentAnswers} right lately`}
        </span>
      </span>
      <span className="dash-meter" role="meter" aria-label={`${r.name} mastery`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.mastery * 100)}>
        <span style={{ width: `${Math.round(r.mastery * 100)}%` }} />
      </span>
    </li>
  );
}

/** Grown-ups: time played, level and mastery per track, weak spots and tricky items, per child. */
export function ParentDashboard({ onBack, currentId }: { onBack: () => void; currentId?: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pid, setPid] = useState<string | undefined>(currentId);
  const [sum, setSum] = useState<DashboardSummary | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    listProfiles().then((ps) => {
      setProfiles(ps);
      setPid((cur) => (cur && ps.some((p) => p.id === cur) ? cur : ps[0]?.id));
    });
  }, []);

  useEffect(() => {
    if (!pid) return;
    let live = true;
    setSum(null);
    Promise.all([listAttempts(pid, now - 30 * DAY_MS), getSkillStates(pid)]).then(([as, st]) => {
      if (live) setSum(summarize(as, st, now));
    });
    return () => {
      live = false;
    };
  }, [pid, now]);

  const maxMin = Math.max(1, ...(sum?.week.map((d) => d.minutes) ?? [1]));
  const started = sum?.tracks.filter((t) => t.started && t.playable) ?? [];
  const notStarted = sum?.tracks.filter((t) => !t.started && t.playable) ?? [];

  return (
    <div className="screen settings dashboard" data-no-motion>
      <div className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Back to grown-ups"><Emoji text="⬅️" /> Back</button>
        <h1 className="voices-title"><Emoji text="📊" /> Progress</h1>
        <span style={{ width: 64 }} />
      </div>

      {profiles.length > 1 && (
        <div className="dash-kids" role="tablist" aria-label="Child">
          {profiles.map((p) => (
            <button key={p.id} role="tab" aria-selected={p.id === pid} className={`dash-kid ${p.id === pid ? 'on' : ''}`} onClick={() => setPid(p.id)}>
              <Emoji text={p.avatar} /> {p.nickname}
            </button>
          ))}
        </div>
      )}

      {!sum ? (
        <p className="voice-sub">Loading…</p>
      ) : (
        <>
          <section className="settings-card">
            <span className="voice-name"><Emoji text="⏱️" /> This week</span>
            <span className="voice-sub">
              {sum.weekMinutes} min played · {sum.weekAnswers} answers · {pct(sum.weekRate)} right · {pct(sum.weekHintRate)} with a hint · {when(sum.lastPlayedAt, now)}
            </span>
            <div className="dash-week" role="group" aria-label="Minutes played per day">
              {sum.week.map((d) => (
                <div key={d.day} className="dash-day" title={`${d.minutes} min, ${d.answers} answers`}>
                  <span className="dash-day-min">{d.minutes || ''}</span>
                  <span className="dash-bar" style={{ height: `${Math.round((d.minutes / maxMin) * 100)}%` }} />
                  <span className="dash-day-name">{dayName(d.day)}</span>
                </div>
              ))}
            </div>
            <span className="voice-sub">Time counts while answering; breaks over 2 minutes are left out. The app aims for about 80% right.</span>
          </section>

          <section className="settings-card">
            <span className="voice-name"><Emoji text="🔎" /> Weak spots (last 2 weeks)</span>
            {sum.weak.length === 0 && sum.tricky.length === 0 ? (
              <span className="voice-sub">Nothing stands out. <Emoji text="👍" /></span>
            ) : (
              <>
                {sum.weak.length > 0 && (
                  <ul className="dash-list">
                    {sum.weak.map((r) => (
                      <li key={r.id}>
                        <Icon name={r.icon} /> <b>{r.name}</b> — {r.recentCorrect}/{r.recentAnswers} right ({pct(r.rate)}). The app makes it easier on its own; a little practice together helps.
                      </li>
                    ))}
                  </ul>
                )}
                {sum.tricky.length > 0 && (
                  <>
                    <span className="voice-sub">Tricky items (missed 2+ times):</span>
                    <div className="dash-chips">
                      {sum.tricky.map((t) => (
                        <span key={`${t.trackId}|${t.label}`} className="dash-chip" title={`${getTrack(t.trackId).name}: missed ${t.misses} of ${t.tries}`}>
                          {t.label} <small>×{t.misses}</small>
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </section>

          <section className="settings-card">
            <span className="voice-name"><Emoji text="🧭" /> Levels and mastery</span>
            {started.length === 0 ? (
              <span className="voice-sub">No tracks started yet.</span>
            ) : (
              <ul className="dash-tracks">
                {started.map((r) => (
                  <TrackLine key={r.id} r={r} />
                ))}
              </ul>
            )}
            {notStarted.length > 0 && <span className="voice-sub">Not started yet: {notStarted.map((r) => r.name).join(', ')}.</span>}
          </section>

          <p className="voice-sub">Everything here stays on this device.</p>
        </>
      )}
    </div>
  );
}
