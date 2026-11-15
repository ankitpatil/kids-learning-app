import { useEffect, useRef, useState } from 'react';
import type { HandLandmarker } from '@mediapipe/tasks-vision';
import { MOTION_EVENT, loadMotionSettings, saveMotionSettings } from '../motion/settings';
import { LOST_GRACE_MS, createDwell, smooth, toScreen, type Pt } from '../motion/pointer';
import { INDEX_TIP, loadHandTracker } from '../motion/tracker';
import { say } from '../audio/speech';

/** Live Move-mode flag; re-renders when it changes anywhere in the app. */
export function useMotionEnabled(): boolean {
  const [on, setOn] = useState(() => loadMotionSettings().enabled);
  useEffect(() => {
    const sync = () => setOn(loadMotionSettings().enabled);
    window.addEventListener(MOTION_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(MOTION_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return on;
}

/** Mounted once at the root. Does nothing (no camera, no download) unless Move mode is on. */
export function MotionLayer() {
  const enabled = useMotionEnabled();
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');

  useEffect(() => {
    document.body.classList.toggle('move-mode', enabled);
  }, [enabled]);

  // Camera off whenever the tab is hidden.
  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return enabled && visible ? <MotionSession /> : null;
}

type Status = 'starting' | 'tracking' | 'noHand' | 'blocked' | 'error';
const NO_HAND_MS = 2000;

/** The thing a hand can press: a button (or role=button), enabled, not inside a [data-no-motion] area. */
function pickTarget(el: Element | null): HTMLElement | null {
  const t = el?.closest<HTMLElement>('button, [role="button"]') ?? null;
  if (!t) return null;
  if ((t as HTMLButtonElement).disabled || t.getAttribute('aria-disabled') === 'true') return null;
  if (t.closest('[data-no-motion]')) return null;
  return t;
}

function MotionSession() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('starting');

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let tracker: HandLandmarker | null = null;
    let lastVideoTime = -1;
    let lastSeen = performance.now();
    let pos: Pt | null = null;
    let hovered: HTMLElement | null = null;
    let current: Status = 'starting';
    const dwell = createDwell<HTMLElement>();
    const set = (s: Status) => {
      if (s !== current) {
        current = s;
        setStatus(s);
        if (s === 'noHand') say('Show me your hand!');
      }
    };
    const hover = (el: HTMLElement | null) => {
      if (el === hovered) return;
      hovered?.classList.remove('motion-hover');
      el?.classList.add('motion-hover');
      hovered = el;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const video = videoRef.current;
      const cursor = cursorRef.current;
      if (!tracker || !video || !cursor || video.readyState < 2 || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;

      const tip = tracker.detectForVideo(video, now).landmarks[0]?.[INDEX_TIP];
      if (!tip) {
        if (now - lastSeen > LOST_GRACE_MS) {
          cursor.style.opacity = '0';
          dwell.update(null, now);
          hover(null);
          pos = null;
        }
        if (now - lastSeen > NO_HAND_MS) set('noHand');
        return;
      }
      lastSeen = now;
      set('tracking');
      pos = smooth(pos, toScreen(tip, window.innerWidth, window.innerHeight));
      cursor.style.opacity = '1';
      cursor.style.transform = `translate(${pos.x}px, ${pos.y}px)`;

      const target = pickTarget(document.elementFromPoint(pos.x, pos.y));
      hover(target);
      const step = dwell.update(target, now);
      cursor.style.setProperty('--p', String(step.progress));
      if (step.fire && target?.isConnected) {
        target.click();
        cursor.classList.remove('fired');
        void cursor.offsetWidth; // restart the pop animation
        cursor.classList.add('fired');
      }
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) return;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        tracker = await loadHandTracker();
        if (cancelled) return;
        lastSeen = performance.now();
        raf = requestAnimationFrame(frame);
      } catch (err) {
        if (cancelled) return;
        console.warn('Move mode could not start', err);
        set((err as DOMException)?.name === 'NotAllowedError' ? 'blocked' : 'error');
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      hover(null);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const turnOff = () => saveMotionSettings({ enabled: false });

  return (
    <div className="motion-layer" aria-hidden={status === 'tracking'}>
      <video ref={videoRef} className={`motion-preview ${status === 'blocked' || status === 'error' ? 'off' : ''}`} playsInline muted />
      <div ref={cursorRef} className="motion-cursor" style={{ opacity: 0 }}>
        <span className="motion-dot">✋</span>
      </div>
      {status === 'starting' && <div className="motion-chip">📷 Getting the camera ready…</div>}
      {status === 'noHand' && <div className="motion-chip">✋ Show me your hand!</div>}
      {(status === 'blocked' || status === 'error') && (
        <div className="motion-chip warn" role="alert">
          {status === 'blocked' ? '📷 Camera is blocked — allow it in the browser, or' : '📷 Move mode could not start (needs internet the first time) —'}{' '}
          <button className="link-btn strong" onClick={turnOff}>use touch</button>
        </div>
      )}
    </div>
  );
}

/** 🙌 / 👆 toggle for the home screen top bar. */
export function MoveModeToggle() {
  const on = useMotionEnabled();
  return (
    <button
      className={`icon-btn move-toggle ${on ? 'on' : ''}`}
      data-no-motion /* a waving hand shouldn't switch Move mode off by accident */
      aria-label={on ? 'Move mode on. Switch to touch' : 'Play with your hands (camera)'}
      aria-pressed={on}
      onClick={() => {
        saveMotionSettings({ enabled: !on });
        say(on ? 'Touch mode.' : 'Move mode! Hold your hand on a button to pick it.');
      }}
    >
      {on ? '🙌' : '👆'}
    </button>
  );
}
