import { useEffect, useState } from 'react';
import { clearAiStories, listAiStories } from '../store/db';
import { loadAiSettings, normalizeProxyUrl, saveAiSettings, type AiSettings } from '../ai/settings';
import { createProxyProvider } from '../ai/client';
import { ai } from '../ai/app';
import { loadMotionSettings, saveMotionSettings } from '../motion/settings';
import { isMuted, setMuted, isNarrationOn, setNarration } from '../audio/speech';
import { Emoji } from '../components/Icon';

type Test = { state: 'idle' } | { state: 'testing' } | { state: 'ok' } | { state: 'fail'; why: string };

/** Parent settings (behind the parent gate): Claude helpers and the narrator voice. */
const MOVE_CHOICES = [
  ['body', '📺 Standing back (TV)', 'Whole body. The player raises a hand to take the turn; others are ignored.'],
  ['hand', '💻 Close to the laptop', 'Fingertip, one hand. Best within arm’s reach.'],
] as const;

export function Settings({ onBack, onVoice }: { onBack: () => void; onVoice: () => void }) {
  const [s, setS] = useState<AiSettings>(() => loadAiSettings());
  const [move, setMove] = useState(() => loadMotionSettings());
  const [talk, setTalk] = useState(() => isNarrationOn());
  const [silent, setSilent] = useState(() => isMuted());
  const [urlText, setUrlText] = useState(s.proxyUrl);
  const [test, setTest] = useState<Test>({ state: 'idle' });
  const urlOk = normalizeProxyUrl(urlText) !== null;
  const [saved, setSaved] = useState<number | null>(null);
  useEffect(() => {
    listAiStories().then((l) => setSaved(l.length), () => setSaved(0));
  }, []);
  const clearSaved = async () => {
    if (!window.confirm('Delete all saved Claude stories on this device?')) return;
    await clearAiStories();
    setSaved(0);
  };

  const update = (next: AiSettings) => {
    setS(next);
    saveAiSettings(next);
    setTest({ state: 'idle' });
  };

  const runTest = async () => {
    setTest({ state: 'testing' });
    const r = await ai.request({ kind: 'ping' }, { provider: createProxyProvider(s), timeoutMs: 5000 });
    setTest(r.ok ? { state: 'ok' } : { state: 'fail', why: r.reason === 'http' ? 'wrong passcode or URL' : r.reason === 'timeout' ? 'no answer in 5 s' : 'could not reach it' });
  };

  return (
    <div className="screen settings">
      <div className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Back to home"><Emoji text="⬅️" /> Back</button>
        <h2 className="voices-title"><Emoji text="⚙️" /> Grown-ups</h2>
        <span style={{ width: 64 }} />
      </div>

      <section className="settings-card">
        <button className="voice-pick" onClick={onVoice}>
          <span className="voice-name"><Emoji text="🗣️" /> Reading voice</span>
          <span className="voice-sub">Pick the narrator voice</span>
        </button>
      </section>

      <section className="settings-card">
        <label className="toggle-row">
          <span>
            <span className="voice-name"><Emoji text="🗣️" /> Talking (narration)</span>
            <span className="voice-sub">The app speaks instructions and praise by itself. Off by default. Tapping <Emoji text="🔊" /> or a picture always speaks. Kids can also switch it with <Emoji text="🗣️" />/<Emoji text="🤫" /> on the home screen.</span>
          </span>
          <input type="checkbox" className="toggle" checked={talk} onChange={(e) => { setTalk(e.target.checked); setNarration(e.target.checked); }} />
        </label>
        <label className="toggle-row">
          <span>
            <span className="voice-name"><Emoji text="🔇" /> Silent mode</span>
            <span className="voice-sub">No voice and no sound effects at all — even when <Emoji text="🔊" /> is tapped.</span>
          </span>
          <input type="checkbox" className="toggle" checked={silent} onChange={(e) => { setSilent(e.target.checked); setMuted(e.target.checked); }} />
        </label>
      </section>

      <section className="settings-card">
        <label className="toggle-row">
          <span>
            <span className="voice-name"><Emoji text="🙌" /> Move mode (camera)</span>
            <span className="voice-sub">Play with hands in front of the camera — great with the laptop on the TV. Hold a hand on a button to pick it. Video stays on this device. Saved for this device only.</span>
          </span>
          <input
            type="checkbox"
            className="toggle"
            checked={move.enabled}
            onChange={(e) => {
              const next = { ...move, enabled: e.target.checked };
              setMove(next);
              saveMotionSettings(next);
            }}
          />
        </label>
        <div className="move-choice" role="radiogroup" aria-label="How far from the camera">
          {MOVE_CHOICES.map(([value, label, sub]) => (
            <label key={value} className={`move-option ${move.tracking === value ? 'on' : ''}`}>
              <input
                type="radio"
                name="move-tracking"
                checked={move.tracking === value}
                onChange={() => {
                  const next = { ...move, tracking: value };
                  setMove(next);
                  saveMotionSettings(next);
                }}
              />
              <span>
                <span className="voice-name"><Emoji text={label} /></span>
                <span className="voice-sub">{sub}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="settings-card">
        <label className="toggle-row">
          <span>
            <span className="voice-name"><Emoji text="✨" /> Claude helpers</span>
            <span className="voice-sub">New stories and “Why?” hints from Claude, through your family proxy. Off by default.</span>
          </span>
          <input type="checkbox" className="toggle" checked={s.enabled} onChange={(e) => update({ ...s, enabled: e.target.checked })} />
        </label>

        <label className="field">
          <span>Family proxy URL</span>
          <input
            type="url"
            placeholder="https://little-learners-proxy.example.workers.dev"
            value={urlText}
            autoComplete="off"
            onChange={(e) => {
              setUrlText(e.target.value);
              const n = normalizeProxyUrl(e.target.value);
              if (n !== null) update({ ...s, proxyUrl: n });
            }}
          />
          {!urlOk && <span className="field-error">Use an https:// address.</span>}
        </label>

        <label className="field">
          <span>Family passcode</span>
          <input type="password" value={s.passcode} autoComplete="off" onChange={(e) => update({ ...s, passcode: e.target.value })} />
        </label>

        <div className="test-row">
          <button className="link-btn strong" disabled={!s.proxyUrl || !s.passcode || test.state === 'testing'} onClick={runTest}>
            Test connection
          </button>
          <span className="voice-sub" role="status">
            <Emoji text={test.state === 'testing' ? 'Checking…' : test.state === 'ok' ? '✅ Connected' : test.state === 'fail' ? `❌ ${test.why}` : ''} />
          </span>
        </div>

        <div className="test-row">
          <span className="voice-sub"><Emoji text="📚" /> Saved Claude stories on this device: {saved ?? '…'}</span>
          <button className="link-btn strong" disabled={!saved} onClick={clearSaved}>
            Clear
          </button>
        </div>

        <p className="voice-sub">
          Only learning details are sent (level, phonics patterns, topic, the current question) — never a name, profile or voice recording. No API key is stored here; it lives in your proxy. See <code>proxy/README.md</code> to set one up.
        </p>
      </section>

      <section className="settings-card about-credits">
        <span className="voice-name">About &amp; credits</span>
        <p className="voice-sub">
          Pictures: Fluent Emoji by Microsoft (MIT licence) and{' '}
          <a href="https://openmoji.org" target="_blank" rel="noreferrer">OpenMoji</a> – the open-source emoji and icon project, licence{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. Fonts: Nunito and Andika (SIL Open Font License).
        </p>
      </section>
    </div>
  );
}
