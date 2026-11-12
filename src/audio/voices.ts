// Voice choice: prefer the natural-sounding neural voices (Apple Premium/Enhanced/Siri, Microsoft
// "Natural", Google) in American English, skip macOS novelty voices, and let a parent pick one.

export interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
  voiceURI?: string;
}

/** macOS/iOS joke and robot voices — never right for reading to a child. */
const NOVELTY = /^(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|deranged|hysterical|pipe organ|princess)\b/i;

/** Natural-voice markers, best first. */
const QUALITY: [RegExp, number][] = [
  [/premium/i, 60],
  [/\bsiri\b/i, 55],
  [/natural/i, 50],
  [/enhanced/i, 45],
  [/neural|wavenet|studio/i, 40],
  [/google/i, 30],
];

/** Accent preference: American English narrator first (DECISIONS 2026-11-08), then Indian, British, other English. */
function langScore(lang: string): number {
  const l = lang.replace('_', '-').toLowerCase();
  if (l === 'en-us') return 30;
  if (l === 'en-in') return 20;
  if (l === 'en-gb') return 15;
  if (l.startsWith('en')) return 10;
  return -1000;
}

export function isNovelty(v: VoiceLike): boolean {
  return NOVELTY.test(v.name.trim());
}

/** Higher is better; English only; novelty voices sink to the bottom. */
export function voiceScore(v: VoiceLike): number {
  if (isNovelty(v)) return -500;
  let s = langScore(v.lang);
  const q = QUALITY.find(([re]) => re.test(v.name));
  if (q) s += q[1];
  if (/samantha|ava|zoe|allison|susan|aria|jenny|isha/i.test(v.name)) s += 5; // clear female narrator voices
  if (v.localService === false) s -= 20; // online voices fail offline and send the text out; prefer on-device ones
  return s;
}

/** English, non-novelty voices, best first. */
export function rankVoices<T extends VoiceLike>(voices: T[]): T[] {
  return voices
    .filter((v) => langScore(v.lang) > 0 && !isNovelty(v))
    .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
}

export const AUTO = 'auto';

/** The chosen voice: the parent's pick if it is still installed, otherwise the best ranked one. */
export function chooseVoice<T extends VoiceLike>(voices: T[], preferred: string | null): T | undefined {
  if (preferred && preferred !== AUTO) {
    const hit = voices.find((v) => (v.voiceURI ?? v.name) === preferred);
    if (hit) return hit;
  }
  return rankVoices(voices)[0];
}

/** Short, human label for the picker: "Ava (Premium) · US". */
export function voiceLabel(v: VoiceLike): string {
  const region = v.lang.replace('_', '-').split('-')[1]?.toUpperCase();
  const where: Record<string, string> = { US: 'US', IN: 'India', GB: 'UK', AU: 'Australia', IE: 'Ireland', ZA: 'South Africa' };
  return `${v.name}${region ? ` · ${where[region] ?? region}` : ''}`;
}

/** True for voices that sound natural (shown with a ✨ in the picker). */
export function isNatural(v: VoiceLike): boolean {
  return QUALITY.some(([re, pts]) => pts >= 40 && re.test(v.name));
}
