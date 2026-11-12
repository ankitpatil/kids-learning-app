import { useEffect, useState } from 'react';
import { listVoices, previewVoice, getVoicePref, setVoicePref, say } from '../audio/speech';
import { AUTO, chooseVoice, isNatural, voiceLabel } from '../audio/voices';

/** Parent screen: pick the narrator voice. Natural (neural) voices first, each with a preview. */
export function VoicePicker({ onBack }: { onBack: () => void }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => listVoices());
  const [pref, setPref] = useState(getVoicePref());

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const update = () => setVoices(listVoices());
    synth.addEventListener?.('voiceschanged', update);
    const t = setTimeout(update, 500); // some browsers fill the list late without firing the event
    return () => {
      synth.removeEventListener?.('voiceschanged', update);
      clearTimeout(t);
    };
  }, []);

  const auto = chooseVoice(voices, AUTO);
  const pick = (id: string) => {
    setVoicePref(id);
    setPref(id);
    say('Hi! This is my reading voice.');
  };
  const id = (v: SpeechSynthesisVoice) => v.voiceURI || v.name;
  const hasNatural = voices.some(isNatural);

  return (
    <div className="screen voices">
      <div className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Back to home">⬅️ Back</button>
        <h2 className="voices-title">🗣️ Reading voice</h2>
        <span style={{ width: 64 }} />
      </div>

      <div className="voice-list" role="radiogroup" aria-label="Reading voice">
        <div className={`voice-row ${pref === AUTO ? 'on' : ''}`}>
          <button className="voice-pick" role="radio" aria-checked={pref === AUTO} onClick={() => pick(AUTO)}>
            <span className="voice-name">⭐ Best available</span>
            <span className="voice-sub">{auto ? voiceLabel(auto) : 'No English voice found'}</span>
          </button>
          {auto && <button className="voice-play" aria-label="Play sample" onClick={() => previewVoice(auto)}>▶️</button>}
        </div>
        {voices.map((v) => (
          <div key={id(v)} className={`voice-row ${pref === id(v) ? 'on' : ''}`}>
            <button className="voice-pick" role="radio" aria-checked={pref === id(v)} onClick={() => pick(id(v))}>
              <span className="voice-name">{isNatural(v) ? '✨ ' : ''}{voiceLabel(v)}</span>
              {!v.localService && <span className="voice-sub">needs internet</span>}
            </button>
            <button className="voice-play" aria-label={`Play ${v.name}`} onClick={() => previewVoice(v)}>▶️</button>
          </div>
        ))}
      </div>

      {!hasNatural && (
        <div className="voice-help">
          <b>Get a more natural voice (free):</b>
          <ul>
            <li><b>Mac:</b> System Settings → Accessibility → Spoken Content → System voice → Manage Voices… → English → download <i>Ava (Premium)</i> or <i>Isha (Premium)</i>.</li>
            <li><b>iPad / iPhone:</b> Settings → Accessibility → Spoken Content → Voices → English → download a Premium or Enhanced voice.</li>
            <li><b>Android:</b> Settings → Text-to-speech → Google → Install voice data.</li>
          </ul>
          Then reopen the browser and come back here.
        </div>
      )}
    </div>
  );
}
