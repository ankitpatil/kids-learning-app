import { describe, expect, it } from 'vitest';
import { CHIP_BASS, CHIP_DRUMS, CHIP_LEAD, LOOP_STEPS, noteHz, parseDrums, parseTrack } from './chiptune';

describe('8-bit walking music', () => {
  it('note names to frequencies', () => {
    expect(noteHz('A4')).toBeCloseTo(440);
    expect(noteHz('C4')).toBeCloseTo(261.63, 1);
    expect(noteHz('F#4')).toBeCloseTo(369.99, 1);
    expect(noteHz('Bb3')).toBeCloseTo(233.08, 1);
    expect(() => noteHz('H2')).toThrow();
  });

  it('"-" holds the note before it; "." rests', () => {
    const { notes, steps } = parseTrack(['C5 - - . E5 . G5 -']);
    expect(steps).toBe(8);
    expect(notes.map((n) => [n.step, n.len])).toEqual([[0, 3], [4, 1], [6, 2]]);
  });

  it('lead, bass and drums are the same length, 8 bars of 8 eighths', () => {
    expect(LOOP_STEPS).toBe(64);
    expect(parseTrack(CHIP_BASS).steps).toBe(LOOP_STEPS);
    expect(parseDrums(CHIP_DRUMS).steps).toBe(LOOP_STEPS);
    expect(parseTrack(CHIP_LEAD).notes.length).toBeGreaterThan(20);
  });

  it('every note stays in a comfortable range (no squeals, no rumble)', () => {
    for (const n of [...parseTrack(CHIP_LEAD).notes, ...parseTrack(CHIP_BASS).notes]) {
      expect(n.hz).toBeGreaterThan(80);
      expect(n.hz).toBeLessThan(1400);
    }
  });
});
