import { describe, it, expect } from 'vitest';
import { speechChunks, plainSpeech, PAUSE } from './readAlong';

const texts = (s: string) => speechChunks(s).map((c) => c.text);

describe('speechChunks', () => {
  it('speaks each sentence on its own with a pause after it; none after the last', () => {
    const c = speechChunks('Read the story. Tap a word for help! Are you done?');
    expect(c.map((x) => x.text)).toEqual(['Read the story.', 'Tap a word for help!', 'Are you done?']);
    expect(c.map((x) => x.pause)).toEqual([PAUSE.sentence, PAUSE.sentence, 0]);
  });

  it('questions get a longer pause than statements', () => {
    const c = speechChunks('What colour is the hen? Pick one.');
    expect(c[0].pause).toBe(PAUSE.question);
    expect(PAUSE.question).toBeGreaterThan(PAUSE.sentence);
  });

  it('`|` and `||` add a short / long beat', () => {
    const c = speechChunks('Yes! Seven plus two is nine. || Bonus challenge! | What is eight plus five?');
    expect(c.map((x) => x.text)).toEqual(['Yes!', 'Seven plus two is nine.', 'Bonus challenge!', 'What is eight plus five?']);
    expect(c[1].pause).toBe(PAUSE.long);
    expect(c[2].pause).toBe(PAUSE.short);
  });

  it('a colon introduces the target word after a beat', () => {
    expect(speechChunks('Catch the word: said')).toEqual([
      { text: 'Catch the word', pause: PAUSE.colon },
      { text: 'said', pause: 0 },
    ]);
  });

  it('spelled letters are said one by one, as capital letter names', () => {
    const c = speechChunks("That's cot. Look again: c, a, t.");
    expect(c.map((x) => x.text)).toEqual(["That's cot.", 'Look again', 'C', 'A', 'T']);
    expect(c[2].pause).toBe(PAUSE.letter);
  });

  it('does not split on commas inside a sentence, or on times like 3:30', () => {
    expect(texts('Hmm, three and four make seven.')).toEqual(['Hmm, three and four make seven.']);
    expect(texts('It is 3:30 now.')).toEqual(['It is 3:30 now.']);
  });

  it('copes with empty input, stray markers and text with no end mark', () => {
    expect(speechChunks('')).toEqual([]);
    expect(texts('|| Hi Mia')).toEqual(['Hi Mia']);
    expect(texts('Feed me ten cookies')).toEqual(['Feed me ten cookies']);
  });

  it('plainSpeech strips the markers', () => {
    expect(plainSpeech('Great job! || You got a star sticker!')).toBe('Great job! You got a star sticker!');
  });
});

import { makeWordProblem, spokenStory, hintFor, signHint } from '../games/wordProblems/generator';
import { makeQuestion, questionSpeech } from '../games/stories/generator';
import { STORIES } from '../content/stories';

describe('real prompts are phrased in short chunks', () => {
  const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  it('story sums: every spoken phrase is ≤ 12 words, and the question comes after a long beat', () => {
    for (let level = 0; level < 3; level++) {
      for (let i = 0; i < 40; i++) {
        const it = makeWordProblem(level, rng);
        for (const text of [spokenStory(it), hintFor(it), signHint(it)]) {
          for (const c of speechChunks(text)) expect([text, words(c.text) <= 12]).toEqual([text, true]);
        }
        const chunks = speechChunks(spokenStory(it));
        expect(chunks[chunks.length - 2].pause).toBe(PAUSE.long);
      }
    }
  });

  it('story questions on level 1 read each choice as its own phrase', () => {
    for (const s of STORIES.slice(0, 10)) {
      const q = makeQuestion(s, 0, rng);
      const chunks = speechChunks(questionSpeech(q, 0));
      expect(chunks.length).toBe(1 + q.choices.length);
      expect(chunks[chunks.length - 1].text.startsWith('or ')).toBe(true);
    }
  });
});
