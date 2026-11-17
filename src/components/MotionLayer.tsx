import { useEffect, useRef, useState } from 'react';
import type { HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { MOTION_EVENT, loadMotionSettings, saveMotionSettings, type MotionSettings, type TrackingMode } from '../motion/settings';
import { EURO_BODY, EURO_HAND, LOST_GRACE_MS, createDwell, createOneEuro, holdFor, glide, nearBox, scrollSpeed, toScreen, type Pt } from '../motion/pointer';
import { INDEX_TIP, loadHandTracker, loadPoseTracker } from '../motion/tracker';
import { ARM, createBodyFrame, createHandPicker, createPlayerLock, reachToScreen, torso, type ActiveHand, type LockStep, type Pose } from '../motion/player';
import { say } from '../audio/speech';

/** Live Move-mode settings; re-render when they change anywhere in the app. */
export function useMotionSettings(): MotionSettings {
  const [s, setS] = useState(() => loadMotionSettings());
  useEffect(() => {
    const sync = () => setS(loadMotionSettings());
    window.addEventListener(MOTION_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(MOTION_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return s;
}

/** Mounted once at the root. Does nothing (no camera, no download) unless Move mode is on. */
export function MotionLayer() {
  const { enabled, tracking } = useMotionSettings();
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

  return enabled && visible ? <MotionSession key={tracking} mode={tracking} /> : null;
}

type Status = 'starting' | 'tracking' | 'noHand' | 'raise' | 'claiming' | 'blocked' | 'error';
const NO_HAND_MS = 2000;
const COLORS = { player: '#00b894', candidate: '#f5b301', other: 'rgba(255,255,255,.75)' };

/** The thing a hand can press: a button (or role=button), enabled, not inside a [data-no-motion] area. */
function pickTarget(el: Element | null): HTMLElement | null {
  const t = el?.closest<HTMLElement>('button, [role="button"]') ?? null;
  if (!t) return null;
  if ((t as HTMLButtonElement).disabled || t.getAttribute('aria-disabled') === 'true') return null;
  if (t.closest('[data-no-motion]')) return null;
  return t;
}

/** Camera coords (0–1) → preview pixels, matching the mirrored, object-fit: cover video. */
type ToPreview = (x: number, y: number) => Pt;

/** Box around a body's visible landmarks, in preview pixels. */
function bodyBox(p: Pose, map: ToPreview) {
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
  for (const l of p) {
    if ((l.visibility ?? 1) < 0.5) continue;
    x0 = Math.min(x0, l.x); x1 = Math.max(x1, l.x);
    y0 = Math.min(y0, l.y); y1 = Math.max(y1, l.y);
  }
  if (x1 <= x0 || y1 <= y0) return null;
  const pad = 0.03;
  const a = map(Math.max(0, x0 - pad), Math.max(0, y0 - pad));
  const b = map(Math.min(1, x1 + pad), Math.min(1, y1 + pad));
  return { x: Math.min(a.x, b.x), y: a.y, w: Math.abs(b.x - a.x), h: b.y - a.y };
}

/** Boxes around everyone in the preview: green = the player, yellow = claiming, dashed = ignored. */
function drawBodies(ctx: CanvasRenderingContext2D, poses: Pose[], step: LockStep, h: number, map: ToPreview) {
  const fs = Math.round(h * 0.075);
  ctx.font = `700 ${fs}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  poses.forEach((p, i) => {
    const b = bodyBox(p, map);
    if (!b) return;
    const role = i === step.player ? 'player' : i === step.candidate ? 'candidate' : 'other';
    ctx.strokeStyle = COLORS[role];
    ctx.lineWidth = role === 'other' ? 2 : 5;
    ctx.setLineDash(role === 'other' ? [6, 6] : []);
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.setLineDash([]);
    const label = role === 'player' ? '⭐ Player' : role === 'candidate' ? '🙋 Hold it…' : '';
    if (label) {
      const tw = ctx.measureText(label).width + 14;
      const th = fs * 1.4;
      const ly = Math.max(0, b.y - th);
      ctx.fillStyle = COLORS[role];
      ctx.fillRect(b.x, ly, tw, th);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, b.x + 7, ly + th / 2);
    }
    if (role === 'candidate') {
      ctx.fillStyle = '#0006';
      ctx.fillRect(b.x, b.y + b.h - 12, b.w, 12);
      ctx.fillStyle = COLORS.candidate;
      ctx.fillRect(b.x, b.y + b.h - 12, b.w * step.progress, 12);
    }
  });
}

/** The player's tracked hand in the preview: the arm drawn bright, a big ring + ✋ on the hand. */
function drawTrackedHand(ctx: CanvasRenderingContext2D, p: Pose, hand: ActiveHand, h: number, map: ToPreview) {
  const arm = ARM[hand.side];
  const pts = [arm.shoulder, arm.elbow, arm.wrist].map((i) => p[i]).filter((l) => l && (l.visibility ?? 1) >= 0.3).map((l) => map(l.x, l.y));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (pts.length >= 2) {
    ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = COLORS.player;
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  const c = map(hand.at.x, hand.at.y);
  const r = Math.max(14, h * 0.085);
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 184, 148, .35)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.font = `${Math.round(r * 1.2)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✋', c.x, c.y + 1);
  ctx.textAlign = 'start';
}

function MotionSession({ mode }: { mode: TrackingMode }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const upRef = useRef<HTMLDivElement>(null);
  const downRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('starting');

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let hand: HandLandmarker | null = null;
    let pose: PoseLandmarker | null = null;
    let lastVideoTime = -1;
    let lastSeen = performance.now();
    let pos: Pt | null = null;
    let hovered: HTMLElement | null = null;
    let current: Status = 'starting';
    const dwell = createDwell<HTMLElement>();
    const lock = createPlayerLock();
    const picker = createHandPicker();
    const frameOf = createBodyFrame();

    const set = (s: Status) => {
      if (s === current) return;
      const prev = current;
      current = s;
      setStatus(s);
      if (s === 'noHand') say('Show me your hand!');
      if (s === 'raise' && prev !== 'claiming') say('Raise your hand to play!');
      if (s === 'tracking' && prev === 'claiming') say("Got you! Let's play.");
    };
    const hover = (el: HTMLElement | null) => {
      if (el === hovered) return;
      hovered?.classList.remove('motion-hover');
      el?.classList.add('motion-hover');
      hovered = el;
    };
    // Tracking (≈15–30 fps) only sets where the hand is; the cursor is drawn every screen refresh,
    // gliding toward that point, so it moves smoothly between camera frames.
    const tune = mode === 'body' ? EURO_BODY : EURO_HAND;
    const euro = createOneEuro(tune.minCutoff, tune.beta);
    let target: Pt | null = null;
    let lastRender = 0;
    /** New tracked hand point from the camera (or null = hand gone). */
    const drive = (pt: Pt | null, now: number) => {
      if (!pt) {
        target = null;
        euro.reset();
        return;
      }
      target = euro.filter(pt, now);
    };
    // Scroll pads: shown only while someone is playing and the page can scroll that way.
    let scrollDir = 0;
    let scrollSince = 0;
    const onPad = (el: HTMLElement | null, p: Pt) => {
      if (!el || !el.classList.contains('show')) return false;
      const r = el.getBoundingClientRect();
      return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
    };
    /** Show/hide the pads; scroll if the hand is on one. Returns true when the hand is on a pad. */
    const pads = (p: Pt | null, now: number, dt: number) => {
      const up = upRef.current;
      const down = downRef.current;
      const doc = document.scrollingElement ?? document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const live = current === 'tracking';
      up?.classList.toggle('show', live && doc.scrollTop > 1);
      down?.classList.toggle('show', live && doc.scrollTop < max - 1);
      const dir = p ? (onPad(up, p) ? -1 : onPad(down, p) ? 1 : 0) : 0;
      if (dir !== scrollDir) {
        scrollDir = dir;
        scrollSince = now;
      }
      up?.classList.toggle('on', dir === -1);
      down?.classList.toggle('on', dir === 1);
      if (dir) {
        const v = scrollSpeed(now - scrollSince, window.innerHeight);
        if (v) window.scrollBy({ top: (dir * v * dt) / 1000, behavior: 'instant' });
      }
      return dir !== 0;
    };
    /** Every display frame: glide the cursor, then run hold-to-choose under it. */
    const render = (now: number) => {
      const cursor = cursorRef.current;
      const dt = lastRender ? Math.min(100, now - lastRender) : 16;
      lastRender = now;
      if (!cursor) return;
      if (!target) pads(null, now, dt);
      if (!target) {
        if (pos) {
          cursor.style.opacity = '0';
          dwell.update(null, now);
          hover(null);
          pos = null;
        }
        return;
      }
      pos = pos ? glide(pos, target, dt) : target;
      cursor.style.opacity = '1';
      cursor.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (pads(pos, now, dt)) {
        // on a scroll pad: scrolling, not choosing
        hover(null);
        dwell.update(null, now);
        cursor.style.setProperty('--p', '0');
        return;
      }
      let hit = pickTarget(document.elementFromPoint(pos.x, pos.y));
      // Sticky: a small wobble off the edge of the button being held doesn't restart the hold.
      if (!hit && hovered?.isConnected && nearBox(hovered.getBoundingClientRect(), pos)) hit = hovered;
      hover(hit);
      const step = dwell.update(hit, now, holdFor(hit?.dataset.motionHold));
      cursor.style.setProperty('--p', String(step.progress));
      if (step.fire && hit?.isConnected) {
        hit.click();
        cursor.classList.remove('fired');
        void cursor.offsetWidth; // restart the pop animation
        cursor.classList.add('fired');
      }
    };
    /** Clear the preview overlay and size it to the preview box. */
    const overlay = () => {
      const c = canvasRef.current!;
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      const ctx = c.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const video = videoRef.current!;
      const s = Math.max(w / (video.videoWidth || w), h / (video.videoHeight || h));
      const dw = (video.videoWidth || w) * s;
      const dh = (video.videoHeight || h) * s;
      const ox = (w - dw) / 2;
      const oy = (h - dh) / 2;
      const map: ToPreview = (x, y) => ({ x: w - (ox + x * dw), y: oy + y * dh });
      return { ctx, h, map };
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      render(now);
      const video = videoRef.current;
      if (!video || !cursorRef.current || !canvasRef.current || video.readyState < 2 || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (pose) {
        // Body mode: raise a hand to claim the turn, then only that body's lifted hand drives the cursor.
        const poses = pose.detectForVideo(video, now).landmarks as Pose[];
        const step = lock.update(poses, now);
        if (step.justLocked || step.justLost) {
          picker.reset();
          frameOf.reset();
        }
        const { ctx, h, map } = overlay();
        drawBodies(ctx, poses, step, h, map);
        set(step.phase === 'locked' ? 'tracking' : step.phase === 'claiming' ? 'claiming' : 'raise');
        const p = step.player >= 0 ? poses[step.player] : null;
        const t = p ? torso(p) : null;
        const frame = t ? frameOf.update(t, now) : null;
        const active = p ? picker.update(p, step.side) : null; // only the hand that claimed the turn
        if (p && active && frame) {
          drawTrackedHand(ctx, p, active, h, map);
          lastSeen = now;
          drive(reachToScreen(active.at, p, vw, vh, frame), now);
        } else if (step.phase !== 'locked' || now - lastSeen > LOST_GRACE_MS) {
          drive(null, now);
        }
        return;
      }

      if (hand) {
        // Hand mode (close to the laptop): the index fingertip is the cursor.
        const tip = hand.detectForVideo(video, now).landmarks[0]?.[INDEX_TIP];
        const { ctx, map } = overlay();
        if (tip) {
          const d = map(tip.x, tip.y);
          ctx.fillStyle = COLORS.player;
          ctx.beginPath();
          ctx.arc(d.x, d.y, 10, 0, Math.PI * 2);
          ctx.fill();
          lastSeen = now;
          set('tracking');
          drive(toScreen(tip, vw, vh), now);
        } else {
          if (now - lastSeen > LOST_GRACE_MS) drive(null, now);
          if (now - lastSeen > NO_HAND_MS) set('noHand');
        }
      }
    };

    (async () => {
      try {
        const size = mode === 'body' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 640 }, height: { ideal: 480 } };
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', frameRate: { ideal: 30 }, ...size }, audio: false });
        if (cancelled) return;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        if (mode === 'body') pose = await loadPoseTracker();
        else hand = await loadHandTracker();
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
  }, [mode]);

  const failed = status === 'blocked' || status === 'error';
  const badge =
    status === 'tracking' ? (mode === 'body' ? '⭐ Playing' : '✋ Tracking')
    : status === 'claiming' ? '🙋 Keep it up…'
    : status === 'raise' ? '🙋 Raise your hand!'
    : status === 'noHand' ? '✋ Show your hand'
    : status === 'starting' ? '📷 Starting…'
    : '';

  return (
    <div className={`motion-layer ${mode}`}>
      <div className={`motion-preview ${mode} ${failed ? 'off' : ''} ${status === 'tracking' ? 'live' : ''}`} aria-hidden>
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} />
        {badge && <span className="motion-badge">{badge}</span>}
      </div>
      <div ref={upRef} className="motion-scroll up">⬆️</div>
      <div ref={downRef} className="motion-scroll down">⬇️</div>
      <div ref={cursorRef} className="motion-cursor" style={{ opacity: 0 }}>
        <span className="motion-dot">✋</span>
      </div>
      {status === 'raise' && <div className="motion-chip">🙋 Whoever is playing — raise your hand!</div>}
      {status === 'noHand' && <div className="motion-chip">✋ Show me your hand!</div>}
      {failed && (
        <div className="motion-chip warn" role="alert">
          {status === 'blocked' ? '📷 Camera is blocked — allow it in the browser, or' : '📷 Move mode could not start (needs internet the first time) —'}{' '}
          <button className="link-btn strong" onClick={() => saveMotionSettings({ enabled: false })}>
            use touch
          </button>
        </div>
      )}
    </div>
  );
}

/** 🙌 / 👆 toggle for the home screen top bar. */
export function MoveModeToggle() {
  const { enabled: on } = useMotionSettings();
  return (
    <button
      className={`icon-btn move-toggle ${on ? 'on' : ''}`}
      data-no-motion /* a waving hand shouldn't switch Move mode off by accident */
      aria-label={on ? 'Move mode on. Switch to touch' : 'Play with your hands (camera)'}
      aria-pressed={on}
      onClick={() => {
        saveMotionSettings({ enabled: !on });
        say(on ? 'Touch mode.' : 'Move mode!');
      }}
    >
      {on ? '🙌' : '👆'}
    </button>
  );
}
