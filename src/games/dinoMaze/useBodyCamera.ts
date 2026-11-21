// Full-screen mirror camera for TV games: whole-body tracking (MediaPipe Pose, on this device — frames
// never leave it), raise a hand to claim the turn (same rules as Move mode), and the player's hands and
// shoulders mapped to screen pixels of the mirrored, full-screen video.
import { useEffect, useRef, useState } from 'react';
import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import { loadPoseTracker } from '../../motion/tracker';
import { ARM, L_SHOULDER, R_SHOULDER, createPlayerLock, handCentre, raisedWrist, type LockStep, type Pose } from '../../motion/player';
import type { BodyFrame, Pt } from './gestures';

export type CameraStatus = 'starting' | 'raise' | 'claiming' | 'ready' | 'blocked' | 'error';

export interface CameraFrame {
  body: BodyFrame;
  step: LockStep;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

const MIN_VIS = 0.5;
const seen = (l: { visibility?: number } | undefined) => !!l && (l.visibility ?? 1) >= MIN_VIS;

/** Camera coords (0–1, as the camera sees it) → screen px of a mirrored, object-fit: cover video. */
export function coverMirror(vw: number, vh: number, sw: number, sh: number) {
  const s = Math.max(sw / (vw || sw), sh / (vh || sh));
  const dw = (vw || sw) * s;
  const dh = (vh || sh) * s;
  const ox = (sw - dw) / 2;
  const oy = (sh - dh) / 2;
  return (x: number, y: number): Pt => ({ x: sw - (ox + x * dw), y: oy + y * dh });
}

/** The player's body this frame, in screen px. Hands only when the wrist is seen. */
export function bodyFrame(p: Pose | null, t: number, map: (x: number, y: number) => Pt): BodyFrame {
  if (!p) return { t, hands: {}, torso: null, size: 1 };
  const a = p[L_SHOULDER];
  const b = p[R_SHOULDER];
  let torso: Pt | null = null;
  let size = 1;
  if (seen(a) && seen(b)) {
    const sa = map(a.x, a.y);
    const sb = map(b.x, b.y);
    torso = { x: (sa.x + sb.x) / 2, y: (sa.y + sb.y) / 2 };
    size = Math.max(8, Math.hypot(sa.x - sb.x, sa.y - sb.y));
  }
  const hands: BodyFrame['hands'] = {};
  for (const side of ['left', 'right'] as const) {
    if (!seen(p[ARM[side].wrist])) continue;
    const c = handCentre(p, side);
    hands[side] = map(c.x, c.y);
  }
  return { t, hands, torso, size };
}

/** Bright rings on the player's hands, so the child sees what the game sees. */
function drawHands(ctx: CanvasRenderingContext2D, f: BodyFrame, h: number) {
  const r = Math.max(22, h * 0.05);
  for (const p of [f.hands.left, f.hands.right]) {
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(253, 203, 110, .35)';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e17055';
    ctx.stroke();
  }
}

/** A filling ring on the hand someone is raising to claim the turn. */
function drawClaim(ctx: CanvasRenderingContext2D, p: Pose, progress: number, h: number, map: (x: number, y: number) => Pt) {
  const w = raisedWrist(p);
  if (!w) return;
  const c = map(w.x, w.y);
  const r = Math.max(30, h * 0.07);
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#f5b301';
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
  ctx.stroke();
}

/**
 * Starts the camera while `on`; calls `onFrame` for every new camera frame (only once a pose tracker is
 * running). Returns refs for the <video> and <canvas> (both full screen) and the camera status.
 */
export function useBodyCamera(on: boolean, onFrame: (f: CameraFrame) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<CameraStatus>('starting');
  const [claim, setClaim] = useState(0);
  const cb = useRef(onFrame);
  cb.current = onFrame;

  useEffect(() => {
    if (!on) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let pose: PoseLandmarker | null = null;
    let raf = 0;
    let lastVideoTime = -1;
    let current: CameraStatus = 'starting';
    let lastClaim = 0;
    const lock = createPlayerLock();
    const set = (s: CameraStatus) => {
      if (s !== current) {
        current = s;
        setStatus(s);
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !pose || video.readyState < 2 || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const map = coverMirror(video.videoWidth, video.videoHeight, w, h);
      const poses = pose.detectForVideo(video, now).landmarks as Pose[];
      const step = lock.update(poses, now);
      set(step.phase === 'locked' ? 'ready' : step.phase === 'claiming' ? 'claiming' : 'raise');
      const progress = step.phase === 'claiming' ? step.progress : step.phase === 'locked' ? 1 : 0;
      if (Math.abs(progress - lastClaim) > 0.05 || (progress === 0) !== (lastClaim === 0)) {
        lastClaim = progress;
        setClaim(progress);
      }
      if (step.candidate >= 0) drawClaim(ctx, poses[step.candidate], step.progress, h, map);
      const body = bodyFrame(step.player >= 0 ? poses[step.player] : null, now, map);
      drawHands(ctx, body, h);
      cb.current({ body, step, ctx, width: w, height: h });
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', frameRate: { ideal: 30 }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (cancelled) return;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        pose = await loadPoseTracker();
        if (cancelled) return;
        set('raise');
        raf = requestAnimationFrame(frame);
      } catch (err) {
        if (cancelled) return;
        console.warn('TV camera could not start', err);
        set((err as DOMException)?.name === 'NotAllowedError' ? 'blocked' : 'error');
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [on]);

  return { videoRef, canvasRef, status, claim };
}
