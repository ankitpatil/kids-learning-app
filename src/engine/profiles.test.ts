import { describe, it, expect } from 'vitest';
import { AVATARS, cleanNickname, resolveNickname, suggestAvatar, startupProfileId, sortProfiles, MAX_NICKNAME } from './profiles';

describe('profiles helpers', () => {
  it('avatars are unique', () => {
    expect(new Set(AVATARS.map((a) => a.emoji)).size).toBe(AVATARS.length);
  });

  it('cleans nicknames: trims, collapses spaces, strips odd characters, caps length', () => {
    expect(cleanNickname('  Riya   K  ')).toBe('Riya K');
    expect(cleanNickname('<b>Max</b>!!')).toBe('bMaxb');
    expect(cleanNickname('Anaïs')).toBe('Anaïs');
    expect(cleanNickname('आरव')).toBe('आरव');
    expect(cleanNickname('A'.repeat(40)).length).toBe(MAX_NICKNAME);
    expect(cleanNickname('   ')).toBe('');
  });

  it('defaults to the avatar name and de-duplicates names case-insensitively', () => {
    expect(resolveNickname('', '🐼', [])).toBe('Panda');
    expect(resolveNickname('  ', '❓', [])).toBe('Explorer');
    expect(resolveNickname('riya', '🦊', ['Riya'])).toBe('riya 2');
    expect(resolveNickname('Riya', '🦊', ['Riya', 'riya 2'])).toBe('Riya 3');
    const long = resolveNickname('Abcdefghijkl', '🦊', ['Abcdefghijkl']);
    expect(long.length).toBeLessThanOrEqual(MAX_NICKNAME);
    expect(long.endsWith(' 2')).toBe(true);
  });

  it('suggests an animal no sibling already has', () => {
    expect(suggestAvatar([])).toBe(AVATARS[0].emoji);
    expect(suggestAvatar([AVATARS[0].emoji])).toBe(AVATARS[1].emoji);
    expect(suggestAvatar(AVATARS.map((a) => a.emoji))).toBe(AVATARS[0].emoji);
  });

  it('opens the only profile directly, otherwise shows the picker', () => {
    expect(startupProfileId([])).toBeNull();
    expect(startupProfileId(['default'])).toBe('default');
    expect(startupProfileId(['a', 'b'])).toBeNull();
  });

  it('sorts most recently played first, then oldest created', () => {
    const list = [
      { id: 'a', createdAt: 1 },
      { id: 'b', createdAt: 2, lastPlayedAt: 50 },
      { id: 'c', createdAt: 0 },
      { id: 'd', createdAt: 3, lastPlayedAt: 90 },
    ];
    expect(sortProfiles(list).map((p) => p.id)).toEqual(['d', 'b', 'c', 'a']);
  });
});
