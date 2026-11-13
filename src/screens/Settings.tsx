import { useState } from 'react';
import { loadAiSettings, normalizeProxyUrl, saveAiSettings, type AiSettings } from '../ai/settings';
import { createProxyProvider } from '../ai/client';
import { ai } from '../ai/app';

type Test = { state: 'idle' } | { state: 'testing' } | { state: 'ok' } | { state: 'fail'; why: string };

/** Parent settings (behind the parent gate): Claude helpers and the narrator voice. */
export function Settings({ onBack, onVoice }: { onBack: () => void; onVoice: () => void }) {
  const [s, setS] = useState<AiSettings>(() => loadAiSettings());
  const [urlText, setUrlText] = useState(s.proxyUrl);
  const [test, setTest] = useState<Test>({ state: 'idle' });
  const urlOk = normalizeProxyUrl(urlText) !== null;

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
        <button className="back-btn" onClick={onBack} aria-label="Back to home">⬅️ Back</button>
        <h2 className="voices-title">⚙️ Grown-ups</h2>
        <span style={{ width: 64 }} />
      </div>

      <section className="settings-card">
        <button className="voice-pick" onClick={onVoice}>
          <span className="voice-name">🗣️ Reading voice</span>
          <span className="voice-sub">Pick the narrator voice</span>
        </button>
      </section>

      <section className="settings-card">
        <label className="toggle-row">
          <span>
            <span className="voice-name">✨ Claude helpers</span>
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
            {test.state === 'testing' ? 'Checking…' : test.state === 'ok' ? '✅ Connected' : test.state === 'fail' ? `❌ ${test.why}` : ''}
          </span>
        </div>

        <p className="voice-sub">
          Only learning details are sent (level, phonics patterns, topic, the current question) — never a name, profile or voice recording. No API key is stored here; it lives in your proxy. See <code>proxy/README.md</code> to set one up.
        </p>
      </section>
    </div>
  );
}
