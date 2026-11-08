// Back-compat shim: games used to read levels from here. Track configs now live in tracks.ts.
import { getTrack } from './tracks';

export const COUNT_MAX_BY_LEVEL = getTrack('count').levels.map((l) => l.range);
