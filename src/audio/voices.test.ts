import { describe, it, expect } from 'vitest';
import { rankVoices, chooseVoice, voiceScore, isNovelty, isNatural, voiceLabel, AUTO } from './voices';

const V = (name: string, lang: string, localService = true) => ({ name, lang, localService, voiceURI: name });

// Roughly what Chrome on a Mac lists (plus a few from other platforms).
const MAC = [
  V('Albert', 'en-US'), V('Bad News', 'en-US'), V('Bahh', 'en-US'), V('Bells', 'en-US'), V('Zarvox', 'en-US'),
  V('Samantha', 'en-US'), V('Daniel', 'en-GB'), V('Rishi', 'en-IN'),
  V('Ava (Premium)', 'en-US'), V('Zoe (Enhanced)', 'en-US'), V('Isha (Premium)', 'en-IN'),
  V('Google US English', 'en-US', false), V('Amélie', 'fr-CA'), V('Microsoft Aria Online (Natural) - English (United States)', 'en-US', false),
];

describe('voice ranking', () => {
  it('drops novelty and non-English voices', () => {
    const names = rankVoices(MAC).map((v) => v.name);
    for (const n of ['Albert', 'Bad News', 'Bahh', 'Bells', 'Zarvox', 'Amélie']) expect(names).not.toContain(n);
    expect(isNovelty(V('Bahh', 'en-US'))).toBe(true);
    expect(isNovelty(V('Samantha', 'en-US'))).toBe(false);
  });

  it('puts US Premium first, then other natural voices, then plain ones', () => {
    const names = rankVoices(MAC).map((v) => v.name);
    expect(names[0]).toBe('Ava (Premium)');
    expect(names.indexOf('Isha (Premium)')).toBeLessThan(names.indexOf('Samantha'));
    expect(names.indexOf('Zoe (Enhanced)')).toBeLessThan(names.indexOf('Samantha'));
    expect(names.indexOf('Samantha')).toBeLessThan(names.indexOf('Daniel'));
  });

  it('prefers an on-device natural voice over an online one', () => {
    const names = rankVoices(MAC).map((v) => v.name);
    expect(names.indexOf('Zoe (Enhanced)')).toBeLessThan(names.indexOf('Microsoft Aria Online (Natural) - English (United States)'));
  });

  it('with only basic voices, prefers US Samantha over UK/India basic voices', () => {
    const basic = [V('Daniel', 'en-GB'), V('Rishi', 'en-IN'), V('Samantha', 'en-US'), V('Bells', 'en-US')];
    expect(chooseVoice(basic, AUTO)?.name).toBe('Samantha');
  });

  it("uses the parent's pick if installed, else falls back to the best voice", () => {
    expect(chooseVoice(MAC, 'Isha (Premium)')?.name).toBe('Isha (Premium)');
    expect(chooseVoice(MAC, 'Removed Voice')?.name).toBe('Ava (Premium)');
    expect(chooseVoice([], AUTO)).toBeUndefined();
  });

  it('handles underscore locales (Android) and labels voices for the picker', () => {
    expect(voiceScore(V('English United States', 'en_US'))).toBeGreaterThan(0);
    expect(voiceLabel(V('Isha (Premium)', 'en-IN'))).toBe('Isha (Premium) · India');
    expect(isNatural(V('Ava (Premium)', 'en-US'))).toBe(true);
    expect(isNatural(V('Samantha', 'en-US'))).toBe(false);
  });
});
