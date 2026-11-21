import { handAngles, type Time } from './generator';

interface Props {
  time: Time;
  /** Colour the hands (short = hour, orange; long = minutes, blue — the minute labels are blue too). */
  scaffold?: boolean;
  /** 5, 10, 15 … 55 round the outside. */
  minuteLabels?: boolean;
  /** Draw it smaller (as an answer choice). */
  small?: boolean;
  /** Highlight a hand after a miss. */
  glow?: 'hour' | 'minute' | 'both';
}

/** Analog clock drawn in SVG (numbers 1–12, minute ticks, a short hour hand and a long minute hand). */
export function ClockFace({ time, scaffold, minuteLabels, small, glow }: Props) {
  const { hour, minute } = handAngles(time);
  const pt = (deg: number, r: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return { x: 100 + r * Math.cos(a), y: 100 + r * Math.sin(a) };
  };
  const hourColor = scaffold ? '#e17055' : '#333';
  const minuteColor = scaffold ? '#0984e3' : '#333';
  const glowHour = glow === 'hour' || glow === 'both';
  const glowMinute = glow === 'minute' || glow === 'both';
  const pad = minuteLabels ? 24 : 4;
  return (
    <svg
      className={`clock-face ${small ? 'small' : ''}`}
      viewBox={`${-pad} ${-pad} ${200 + 2 * pad} ${200 + 2 * pad}`}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="100" cy="106" r="96" fill="#0002" />
      <circle cx="100" cy="100" r="96" fill="#fff" stroke="#3b3b58" strokeWidth="6" />
      {Array.from({ length: 60 }, (_, i) => {
        const big = i % 5 === 0;
        const a = pt(i * 6, 92);
        const b = pt(i * 6, big ? 82 : 87);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3b3b58" strokeWidth={big ? 3 : 1.5} strokeLinecap="round" />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const p = pt(n * 30, 68);
        return (
          <text key={n} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="900" fill="#3b3b58">
            {n}
          </text>
        );
      })}
      {minuteLabels &&
        Array.from({ length: 12 }, (_, i) => {
          const p = pt(i * 30, 110);
          return (
            <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="800" fill="#0984e3">
              {i === 0 ? '00' : i * 5}
            </text>
          );
        })}
      {/* Minute hand (long, thin) under the hour hand (short, thick). */}
      <g transform={`rotate(${minute} 100 100)`} className={glowMinute ? 'hand-glow' : undefined}>
        <line x1="100" y1="112" x2="100" y2="40" stroke={minuteColor} strokeWidth="6" strokeLinecap="round" />
      </g>
      <g transform={`rotate(${hour} 100 100)`} className={glowHour ? 'hand-glow' : undefined}>
        <line x1="100" y1="110" x2="100" y2="58" stroke={hourColor} strokeWidth="11" strokeLinecap="round" />
      </g>
      <circle cx="100" cy="100" r="7" fill="#3b3b58" />
    </svg>
  );
}
