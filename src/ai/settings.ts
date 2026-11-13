// Parent settings for the optional Claude helpers. Stored on this device only (localStorage).
// Off by default; the passcode is the family passcode the proxy checks (not an API key).

export interface AiSettings {
  enabled: boolean;
  proxyUrl: string;
  passcode: string;
}

export const DEFAULT_AI_SETTINGS: AiSettings = { enabled: false, proxyUrl: '', passcode: '' };
const KEY = 'ai-settings';

type KV = Pick<Storage, 'getItem' | 'setItem'>;
const store = (): KV | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

/** Only https URLs (or http://localhost for testing the proxy with `wrangler dev`). */
export function normalizeProxyUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) return null;
    if (u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function loadAiSettings(kv: KV | null = store()): AiSettings {
  try {
    const parsed = JSON.parse(kv?.getItem(KEY) ?? 'null') as Partial<AiSettings> | null;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_AI_SETTINGS };
    return {
      enabled: parsed.enabled === true,
      proxyUrl: typeof parsed.proxyUrl === 'string' ? normalizeProxyUrl(parsed.proxyUrl) ?? '' : '',
      passcode: typeof parsed.passcode === 'string' ? parsed.passcode : '',
    };
  } catch {
    return { ...DEFAULT_AI_SETTINGS };
  }
}

export function saveAiSettings(s: AiSettings, kv: KV | null = store()): void {
  try {
    kv?.setItem(KEY, JSON.stringify({ enabled: s.enabled, proxyUrl: s.proxyUrl, passcode: s.passcode }));
  } catch {
    /* storage unavailable */
  }
}

/** Live helpers run only when switched on, configured and online. */
export function liveReady(s: AiSettings, online: boolean): boolean {
  return s.enabled && online && !!s.proxyUrl && !!s.passcode;
}
