// AI3b "Why?" helper context for Feed the Monster (all modes). Pure: what the child is being
// asked and the number they must find. The answer is never put in the question (not even as a
// word like "ten" or "one", unless it is a number shown on screen); the hint check
// (src/ai/whyHint.ts) then rejects any Claude hint that says it as digits or words.
import type { WhyContext } from '../../ai/whyHint';
import { isPlaceValue, type AnyFeedItem } from './generator';
import type { CompareItem } from './compare';

export type FeedGameItem = AnyFeedItem | CompareItem;

/**
 * `picked`: what the child gave — a number they picked (choose modes), or how many cookies they
 * fed (feed modes; for tens & ones pass the fed boxes and loose cookies).
 */
export function feedWhyContext(
  item: FeedGameItem,
  level: number,
  picked?: number | { boxes: number; loose: number },
): WhyContext {
  const base = { subject: 'math' as const, track: item.trackId, level };
  if (item.trackId === 'compare2d') {
    const c = item as CompareItem;
    return {
      ...base,
      question: `Two plates have ${c.left} and ${c.right} cookies. Which plate has ${c.ask === 'more' ? 'more' : 'fewer'}? Compare tens first, then ones.`,
      answer: c.need,
      picked: typeof picked === 'number' ? picked : undefined,
    };
  }
  if (isPlaceValue(item)) {
    if (item.mode === 'choose') {
      return { ...base, question: `${item.tens} tens and ${item.ones} ones. What number is that?`, answer: item.total, picked: typeof picked === 'number' ? picked : undefined };
    }
    const fed = typeof picked === 'object' ? `${picked.boxes} full boxes and ${picked.loose} loose cookies` : undefined;
    return {
      ...base,
      question: `Feed the monster a 2-digit number of cookies with full boxes and loose cookies. The number has ${item.tens} tens and ${item.ones} ones.`,
      answer: item.total,
      picked: fed,
    };
  }
  const n = typeof picked === 'number' ? picked : undefined;
  if (item.have === 0) {
    return { ...base, question: 'Count the cookies as you feed the monster, and stop at the number it shows.', answer: item.total, picked: n === undefined ? undefined : `${n} cookies` };
  }
  if (item.mode === 'choose') return { ...base, question: `${item.have} + ? = ${item.total}. How many more make ${item.total}?`, answer: item.need, picked: n };
  return {
    ...base,
    question: `The monster has ${item.have} cookies and wants ${item.total}. Feed cookies until it has ${item.total}.`,
    answer: item.need,
    picked: n === undefined ? undefined : `fed ${n} more`,
  };
}
