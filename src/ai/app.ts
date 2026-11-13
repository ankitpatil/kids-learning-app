// The app-wide Claude helpers client: parent settings from this device, and every local
// nickname + profile id as identifiers that must never leave the device.
import { listProfiles } from '../store/db';
import { createAiClient } from './client';
import { loadAiSettings } from './settings';

export const ai = createAiClient({
  settings: loadAiSettings,
  identifiers: async () => {
    try {
      return (await listProfiles()).flatMap((p) => [p.nickname, p.id]);
    } catch {
      return [];
    }
  },
});
