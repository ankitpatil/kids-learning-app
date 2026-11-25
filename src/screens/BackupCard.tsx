import { useRef, useState } from 'react';
import { listProfiles } from '../store/db';
import { backupFileName, exportProgress, importProgress, parseBackup, summarizeBackup, type Backup, type BackupSummary } from '../store/backup';
import { Emoji } from '../components/Icon';
import { MAX_PROFILES } from '../engine/profiles';

type State =
  | { s: 'idle' }
  | { s: 'busy' }
  | { s: 'saved'; name: string }
  | { s: 'confirm'; backup: Backup; summary: BackupSummary }
  | { s: 'restored' }
  | { s: 'error'; why: string };

/** Grown-ups → Save / restore progress (#26). The file goes to the grown-up's own device only. */
export function BackupCard() {
  const [st, setSt] = useState<State>({ s: 'idle' });
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    setSt({ s: 'busy' });
    try {
      const b = await exportProgress();
      const name = backupFileName();
      const url = URL.createObjectURL(new Blob([JSON.stringify(b)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setSt({ s: 'saved', name });
    } catch {
      setSt({ s: 'error', why: 'Could not read progress on this device.' });
    }
  };

  const pick = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return setSt({ s: 'error', why: 'That file is too big to be a backup.' });
    const r = parseBackup(await file.text());
    if (!r.ok) return setSt({ s: 'error', why: r.why });
    const ids = (await listProfiles()).map((p) => p.id);
    setSt({ s: 'confirm', backup: r.backup, summary: summarizeBackup(r.backup, ids) });
  };

  const restore = async (b: Backup) => {
    setSt({ s: 'busy' });
    try {
      await importProgress(b);
      setSt({ s: 'restored' });
    } catch {
      setSt({ s: 'error', why: 'Could not restore. Nothing was changed.' });
    }
  };

  return (
    <section className="settings-card backup-card">
      <span className="voice-name"><Emoji text="💾" /> Save / restore progress</span>
      <span className="voice-sub">
        Save every child’s stars, stickers, levels and answers to a file on this device, and load it on another device or after clearing the browser. The file is not sent anywhere. Settings (voice, Move mode, Claude passcode) are not included.
      </span>
      <div className="test-row">
        <button className="link-btn strong" disabled={st.s === 'busy'} onClick={save}><Emoji text="⬇️" /> Save backup file</button>
        <button className="link-btn strong" disabled={st.s === 'busy'} onClick={() => fileRef.current?.click()}><Emoji text="⬆️" /> Restore from file</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>

      {st.s === 'saved' && <span className="voice-sub" role="status">Saved as {st.name} (look in Downloads).</span>}
      {st.s === 'error' && <span className="field-error" role="alert">{st.why}</span>}
      {st.s === 'restored' && (
        <div className="test-row" role="status">
          <span className="voice-sub">Progress restored.</span>
          <button className="link-btn strong" onClick={() => window.location.reload()}>Done</button>
        </div>
      )}
      {st.s === 'confirm' && (
        <div className="backup-confirm" role="dialog" aria-label="Restore progress?">
          <span className="voice-sub">This file has:</span>
          <ul className="backup-list">
            {st.summary.children.map((c, i) => (
              <li key={i}>
                <Emoji text={c.avatar} /> <b>{c.nickname}</b> — {c.stars} <Emoji text="⭐" />, {c.answers} answers
                {c.onDevice && <span className="voice-sub"> (replaces this child’s progress here)</span>}
              </li>
            ))}
          </ul>
          {st.summary.keptOnDevice > 0 && <span className="voice-sub">{st.summary.keptOnDevice} other child(ren) on this device stay as they are.</span>}
          {st.summary.tooMany ? (
            <span className="field-error">That would make more than {MAX_PROFILES} children on this device, so this file can’t be restored here.</span>
          ) : null}
          <div className="test-row">
            <button className="link-btn strong" disabled={st.summary.tooMany} onClick={() => restore(st.backup)}>Restore</button>
            <button className="link-btn" onClick={() => setSt({ s: 'idle' })}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
