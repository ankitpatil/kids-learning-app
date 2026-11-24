import { useEffect, useRef, useState } from 'react';
import { makeFairItem, parseFairId, checkPay, trayTotal, canAdd, countUp, fairPrompt, fairHint, fairWhyContext, FAIR_TRACK, type FairItem } from './generator';
import { denomFor, loadCurrency, moneyText, moneyWords, type CurrencyId } from '../../content/money';
import { updateSkill, type SkillState } from '../../engine/adaptive';
import { maxLevel } from '../../engine/tracks';
import { getSkillState, getSkillStates, saveSkillState, logAttempt, dueReviews } from '../../store/db';
import { placeSpaced, takeCard, spacedLead, type ReviewCard } from '../../engine/spacedReview';
import { planRound, resolveSlot, type Slot } from '../../engine/roundMix';
import { say, tapSay } from '../../audio/speech';
import { fresh, remember } from '../../engine/recent';
import { feedback } from '../../components/Feedback';
import { ai } from '../../ai/app';
import { createWhyHinter } from '../../ai/whyHint';
import { Emoji, Icon } from '../../components/Icon';

const ROUND_LENGTH = 8;

interface Props {
  profileId: string;
  onDone: (result: { correct: number; total: number; leveledUp: boolean }) => void;
  onExit: () => void;
}

/** A coin or note drawn with CSS (no pictures of real currency needed). */
export function MoneyPiece({ currency, value, small }: { currency: CurrencyId; value: number; small?: boolean }) {
  const d = denomFor(currency, value);
  return (
    <span className={`money ${d.kind} ${currency}-${value} ${small ? 'small' : ''}`} aria-hidden="true">
      {moneyText(currency, value)}
    </span>
  );
}

export function FunFair({ profileId, onDone, onExit }: Props) {
  const [state, setState] = useState<SkillState | null>(null);
  const [item, setItem] = useState<FairItem | null>(null);
  const [tray, setTray] = useState<number[]>([]);
  const [tried, setTried] = useState<number[]>([]);
  const [showStrip, setShowStrip] = useState(false);
  const [mood, setMood] = useState<'idle' | 'yay' | 'oops'>('idle');
  const [index, setIndex] = useState(0);
  const hinted = useRef(false);
  const correctCount = useRef(0);
  const leveledUp = useRef(false);
  const ease = useRef(false);
  const started = useRef(Date.now());
  const busy = useRef(false);
  const misses = useRef(0);
  const hinter = useRef(createWhyHinter(ai));
  const plan = useRef(planRound(ROUND_LENGTH));
  const all = useRef<Awaited<ReturnType<typeof getSkillStates>>>({});
  const slot = useRef<Slot>({ kind: 'current', trackId: FAIR_TRACK, level: 0 });
  const due = useRef<ReviewCard[]>([]); // #25d: missed items back after 1/3/7 days
  const currency = useRef<CurrencyId>(loadCurrency());

  useEffect(() => {
    Promise.all([getSkillState(profileId, FAIR_TRACK), getSkillStates(profileId), dueReviews(profileId, [FAIR_TRACK])]).then(([s, states, cards]) => {
      all.current = states;
      due.current = cards.filter((c) => parseFairId(c.itemId, c.level, currency.current) !== undefined);
      plan.current = placeSpaced(plan.current, due.current.length);
      setState(s);
      next(s.level, undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  function next(level: number, prevId: string | undefined, i = 0) {
    const easy = ease.current;
    // Single track: review = level below, stretch = level above.
    // #25d: a spaced item is asked at the level it was missed at (its mode and numbers belong there).
    const card = plan.current[i] === 'spaced' && !easy ? takeCard(due.current) : undefined;
    const sl = (slot.current = card
      ? { kind: 'spaced', trackId: FAIR_TRACK, level: card.level }
      : resolveSlot(plan.current[i] === 'spaced' ? 'review' : plan.current[i], FAIR_TRACK, level, all.current, easy));
    const it = card
      ? makeFairItem(sl.level, currency.current, Math.random, false, undefined, card.itemId)
      : fresh(FAIR_TRACK, () => makeFairItem(sl.level, currency.current, Math.random, easy, prevId), (x) => x.id);
    if (card) remember(FAIR_TRACK, it.id); // so the rest of the round doesn't repeat it
    hinted.current = easy;
    ease.current = false;
    setItem(it);
    setTray([]);
    setTried([]);
    setShowStrip(it.mode === 'change' && it.scaffold);
    setMood('idle');
    misses.current = 0;
    started.current = Date.now();
    busy.current = false;
    setTimeout(() => say(spacedLead(sl.kind) + fairPrompt(it)), 250);
  }

  async function record(correct: boolean) {
    const timeMs = Date.now() - started.current;
    const sl = slot.current;
    await logAttempt({ profileId, skillId: FAIR_TRACK, itemId: item!.id, level: sl.level, correct, hintUsed: hinted.current, timeMs, at: Date.now(), mix: sl.kind });
    // Review and stretch items are logged but don't move the level.
    if (sl.kind !== 'current') return { state: state!, change: 'same' as const, ease: false };
    const out = updateSkill(state!, { correct, hintUsed: hinted.current, timeMs }, maxLevel(FAIR_TRACK));
    await saveSkillState(out.state);
    setState(out.state);
    if (out.change === 'up') leveledUp.current = true;
    if (out.ease) ease.current = true;
    return out;
  }

  async function win() {
    const it = item!;
    const out = await record(true);
    feedback(out.change === 'up' ? 'levelup' : 'correct');
    setMood('yay');
    if (!hinted.current) correctCount.current += 1;
    const what = `${it.thing.a} ${it.thing.name}`;
    say(
      it.mode === 'pay'
        ? `Yes! | ${moneyWords(it.currency, it.price)}. || Enjoy your ${it.thing.name}!`
        : `Yes! | ${moneyWords(it.currency, it.answer)} comes back. || You got ${what}!`,
    );
    setTimeout(() => {
      const n = index + 1;
      if (n >= ROUND_LENGTH) {
        onDone({ correct: correctCount.current, total: ROUND_LENGTH, leveledUp: leveledUp.current });
        return;
      }
      setIndex(n);
      next(out.state.level, it.id, n);
    }, 2300);
  }

  async function miss(canned: string, picked?: number) {
    await record(false);
    feedback('wrong');
    setMood('oops');
    hinted.current = true;
    misses.current += 1;
    const it = item!;
    // Change questions: from the 2nd miss a checked Claude hint if helpers are on, else the canned hint.
    const text = it.mode === 'change' ? (await hinter.current.hint(it.id, misses.current, fairWhyContext(it, slot.current.level, picked), canned)).text : canned;
    say(text);
    setTimeout(() => {
      setMood('idle');
      busy.current = false;
      started.current = Date.now();
    }, 900);
  }

  function add(v: number) {
    if (!item || busy.current || !canAdd(tray)) return;
    setTray((t) => [...t, v]);
    tapSay(moneyWords(item.currency, v), { rate: 1.1 });
  }

  function takeBack(i: number) {
    if (busy.current) return;
    setTray((t) => t.filter((_, j) => j !== i));
  }

  async function pay() {
    if (!item || !state || busy.current || tray.length === 0) return;
    busy.current = true;
    const v = checkPay(item, tray);
    if (v === 'correct') return win();
    return miss(fairHint(item, tray));
  }

  async function pick(n: number) {
    if (!item || !state || busy.current) return;
    busy.current = true;
    if (n === item.answer) return win();
    setTried((t) => [...t, n]);
    setShowStrip(true); // the count-up strip comes back as the hint
    return miss(fairHint(item, [], n), n);
  }

  if (!item || !state) return <div className="screen center">Loading…</div>;

  const total = trayTotal(tray);
  const c = item.currency;

  return (
    <div className="screen game fair-game">
      <div className="topbar">
        <button className="back-btn" onClick={onExit} aria-label="Back to levels"><Emoji text="⬅️" /> Levels</button>
        <div className="progress" aria-label={`Question ${index + 1} of ${ROUND_LENGTH}`}>
          {Array.from({ length: ROUND_LENGTH }, (_, i) => (
            <span key={i} className={i < index ? 'dot done' : i === index ? `dot now${slot.current.kind === 'stretch' ? ' bonus' : ''}` : 'dot'} />
          ))}
        </div>
        <button className="icon-btn" onClick={() => tapSay(fairPrompt(item))} aria-label="Say again"><Emoji text="🔊" /></button>
      </div>

      <button className={`fair-stall ${mood}`} onClick={() => tapSay(fairPrompt(item))} aria-label={`${item.thing.name}, ${moneyWords(c, item.price)}`}>
        <span className="fair-thing"><Icon name={item.thing.icon} /></span>
        <span className="price-tag">{moneyText(c, item.price)}</span>
      </button>

      {item.mode === 'pay' ? (
        <>
          <div className={`fair-tray ${mood}`} aria-label={`You are paying ${moneyWords(c, total)}`}>
            {tray.length === 0 && <span className="tray-empty">{moneyText(c, 0).replace('0', '?')}</span>}
            {tray.map((v, i) => (
              <button key={i} className="money-btn in-tray" onClick={() => takeBack(i)} aria-label={`Take back ${moneyWords(c, v)}`}>
                <MoneyPiece currency={c} value={v} small />
              </button>
            ))}
          </div>
          <div className="tray-total" aria-hidden="true">= {item.scaffold || mood === 'yay' ? moneyText(c, total) : '?'}</div>
          <div className="fair-wallet">
            {item.wallet.map((v) => (
              <button key={v} className="money-btn" onClick={() => add(v)} disabled={!canAdd(tray)} aria-label={`Add ${denomFor(c, v).name}`}>
                <MoneyPiece currency={c} value={v} />
              </button>
            ))}
          </div>
          <div className="actions">
            <button className="btn primary huge" onClick={pay} disabled={tray.length === 0} aria-label="Pay"><Emoji text="✅" /></button>
          </div>
        </>
      ) : (
        <>
          <div className="fair-paid" aria-label={`You pay ${moneyWords(c, item.paid)}`}>
            <MoneyPiece currency={c} value={item.paid} />
            <span className="change-q">→ <span className={`blank ${mood === 'yay' ? 'filled' : ''}`}>{mood === 'yay' ? moneyText(c, item.answer) : '?'}</span></span>
          </div>
          {showStrip && (
            <div className="count-up" aria-hidden="true">
              <span className="cu-start">{item.price}</span>
              {countUp(item).map((n) => (
                <span key={n} className="cu-step">{n}</span>
              ))}
            </div>
          )}
          <div className="quick-choices number-pick">
            {item.choices.map((n) => (
              <button key={n} className={`quick-choice ${tried.includes(n) ? 'tried' : ''}`} onClick={() => pick(n)} aria-label={moneyWords(c, n)}>
                {moneyText(c, n)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
