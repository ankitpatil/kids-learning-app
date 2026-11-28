import { useEffect, useRef, useState } from 'react';
import {
  makeGroupItem, parseGroupId, groupPrompt, groupCaption, groupHint, groupPraise, repeatedSum, skipCounts,
  GROUP_TRACK, type GroupItem,
} from './generator';
import { updateSkill, type SkillState } from '../../engine/adaptive';
import { maxLevel } from '../../engine/tracks';
import { getSkillState, getSkillStates, saveSkillState, logAttempt, dueReviews } from '../../store/db';
import { placeSpaced, takeCard, spacedLead, type ReviewCard } from '../../engine/spacedReview';
import { planRound, resolveSlot, type Slot } from '../../engine/roundMix';
import { say, tapSay } from '../../audio/speech';
import { fresh, remember } from '../../engine/recent';
import { feedback } from '../../components/Feedback';
import { Emoji, Icon } from '../../components/Icon';

const ROUND_LENGTH = 8;

interface Props {
  profileId: string;
  onDone: (result: { correct: number; total: number; leveledUp: boolean }) => void;
  onExit: () => void;
}

/** #28 Snack Party: equal groups (how many in all), sharing (how many each) and making plates. */
export function SnackParty({ profileId, onDone, onExit }: Props) {
  const [state, setState] = useState<SkillState | null>(null);
  const [item, setItem] = useState<GroupItem | null>(null);
  const [tried, setTried] = useState<number[]>([]);
  const [help, setHelp] = useState(false);
  const [mood, setMood] = useState<'idle' | 'yay' | 'oops'>('idle');
  const [index, setIndex] = useState(0);
  const hinted = useRef(false);
  const correctCount = useRef(0);
  const leveledUp = useRef(false);
  const ease = useRef(false);
  const started = useRef(Date.now());
  const busy = useRef(false);
  const plan = useRef(planRound(ROUND_LENGTH));
  const all = useRef<Awaited<ReturnType<typeof getSkillStates>>>({});
  const slot = useRef<Slot>({ kind: 'current', trackId: GROUP_TRACK, level: 0 });
  const due = useRef<ReviewCard[]>([]); // missed items back after 1/3/7 days

  useEffect(() => {
    Promise.all([getSkillState(profileId, GROUP_TRACK), getSkillStates(profileId), dueReviews(profileId, [GROUP_TRACK])]).then(([s, states, cards]) => {
      all.current = states;
      due.current = cards.filter((c) => parseGroupId(c.itemId, c.level) !== undefined);
      plan.current = placeSpaced(plan.current, due.current.length);
      setState(s);
      next(s.level, undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  function next(level: number, prevId: string | undefined, i = 0) {
    const easy = ease.current;
    // Single track: review = level below, stretch = level above; a spaced item is asked at the level it was missed at.
    const card = plan.current[i] === 'spaced' && !easy ? takeCard(due.current) : undefined;
    const sl = (slot.current = card
      ? { kind: 'spaced', trackId: GROUP_TRACK, level: card.level }
      : resolveSlot(plan.current[i] === 'spaced' ? 'review' : plan.current[i], GROUP_TRACK, level, all.current, easy));
    const it = card
      ? makeGroupItem(sl.level, Math.random, false, undefined, card.itemId)
      : fresh(GROUP_TRACK, () => makeGroupItem(sl.level, Math.random, easy, prevId), (x) => x.id);
    if (card) remember(GROUP_TRACK, it.id);
    hinted.current = easy;
    ease.current = false;
    setItem(it);
    setTried([]);
    setHelp(false);
    setMood('idle');
    started.current = Date.now();
    busy.current = false;
    setTimeout(() => say(spacedLead(sl.kind) + groupPrompt(it)), 250);
  }

  async function record(correct: boolean) {
    const timeMs = Date.now() - started.current;
    const sl = slot.current;
    await logAttempt({ profileId, skillId: GROUP_TRACK, itemId: item!.id, level: sl.level, correct, hintUsed: hinted.current, timeMs, at: Date.now(), mix: sl.kind });
    if (sl.kind !== 'current') return { state: state!, change: 'same' as const, ease: false };
    const out = updateSkill(state!, { correct, hintUsed: hinted.current, timeMs }, maxLevel(GROUP_TRACK));
    await saveSkillState(out.state);
    setState(out.state);
    if (out.change === 'up') leveledUp.current = true;
    if (out.ease) ease.current = true;
    return out;
  }

  async function pick(n: number) {
    if (!item || !state || busy.current) return;
    busy.current = true;
    if (n === item.answer) {
      const out = await record(true);
      feedback(out.change === 'up' ? 'levelup' : 'correct');
      setMood('yay');
      setHelp(true); // show the worked picture (dealt plates, groups, running counts) as the reward
      if (!hinted.current) correctCount.current += 1;
      say(groupPraise(item));
      setTimeout(() => {
        const i = index + 1;
        if (i >= ROUND_LENGTH) {
          onDone({ correct: correctCount.current, total: ROUND_LENGTH, leveledUp: leveledUp.current });
          return;
        }
        setIndex(i);
        next(out.state.level, item.id, i);
      }, 2200);
      return;
    }
    await record(false);
    feedback('wrong');
    setMood('oops');
    hinted.current = true;
    setTried((x) => [...x, n]);
    setHelp(true);
    say(groupHint(item));
    setTimeout(() => {
      setMood('idle');
      busy.current = false;
      started.current = Date.now();
    }, 900);
  }

  if (!item || !state) return <div className="screen center">Loading…</div>;

  return (
    <div className="screen game groups-game">
      <div className="topbar">
        <button className="back-btn" onClick={onExit} aria-label="Back to levels"><Emoji text="⬅️" /> Levels</button>
        <div className="progress" role="img" aria-label={`Question ${index + 1} of ${ROUND_LENGTH}`}>
          {Array.from({ length: ROUND_LENGTH }, (_, i) => (
            <span key={i} className={i < index ? 'dot done' : i === index ? `dot now${slot.current.kind === 'stretch' ? ' bonus' : ''}` : 'dot'} />
          ))}
        </div>
        <button className="icon-btn" onClick={() => tapSay(groupPrompt(item))} aria-label="Say again"><Emoji text="🔊" /></button>
      </div>

      <button className={`group-caption ${mood}`} onClick={() => tapSay(groupPrompt(item))} aria-label="Hear the question">
        {groupCaption(item)} <Emoji text="🔊" />
      </button>

      <div className={`group-scene ${mood}`}>
        <GroupPicture item={item} help={help} solved={mood === 'yay'} />
      </div>

      <div className="quick-choices groups-choices">
        {item.choices.map((c) => (
          <button
            key={c}
            className={`quick-choice ${tried.includes(c) ? 'tried' : ''} ${mood === 'yay' && c === item.answer ? 'picked' : ''}`} aria-disabled={tried.includes(c) || undefined}
            onClick={() => pick(c)}
            aria-label={String(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function Snacks({ icon, count }: { icon: string; count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="g-snack"><Icon name={icon} /></span>
      ))}
    </>
  );
}

/** Plates in a row; `counts` = running total under each plate (skip counting). */
/** The last running count stays "?" until solved, so the help shows the counting, not the answer. */
function Plates({ item, filled, counts, badge, solved }: { item: GroupItem; filled: boolean; counts: boolean; badge: boolean; solved: boolean }) {
  const totals = skipCounts(item.size, item.groups);
  return (
    <div className="g-plates">
      {Array.from({ length: item.groups }, (_, i) => (
        <div key={i} className="g-plate-wrap">
          {item.kind === 'each' && <span className="g-friend"><Icon name={item.friends[i]} /></span>}
          <div className={`g-plate${item.size >= 10 ? ' ten' : item.size >= 5 ? ' five' : ''}`}>
            {filled && <Snacks icon={item.snack.icon} count={item.size} />}
            {badge && filled && <span className="g-badge">{item.size}</span>}
          </div>
          {counts && <span className="g-count">{i < item.groups - 1 || solved ? totals[i] : '?'}</span>}
        </div>
      ))}
    </div>
  );
}

/** The picture for an item. `help` = after a miss or a right answer: the worked version. */
function GroupPicture({ item, help, solved }: { item: GroupItem; help: boolean; solved: boolean }) {
  if (item.kind === 'sum') {
    return (
      <div className="g-sum">
        <div className="g-equation">{repeatedSum(item)}</div>
        {help && (
          <div className="count-up" aria-hidden="true">
            {skipCounts(item.size, item.groups).map((n, i) => <span key={n} className="cu-step">{i < item.groups - 1 || solved ? n : '?'}</span>)}
          </div>
        )}
      </div>
    );
  }
  if (item.kind === 'all') return <Plates item={item} filled counts={help} badge={item.scaffold} solved={solved} />;
  if (item.kind === 'each') {
    // Pile first; dealt onto the friends' plates as help. Scaffold lays the pile out in rows of one-each.
    return (
      <>
        {!help && (
          <div className={`g-pile${item.scaffold ? ' rows' : ''}`} style={item.scaffold ? { gridTemplateColumns: `repeat(${item.groups}, auto)` } : undefined}>
            <Snacks icon={item.snack.icon} count={item.total} />
          </div>
        )}
        <Plates item={item} filled={help} counts={false} badge={false} solved={solved} />
      </>
    );
  }
  // plates: the pile, then (help) put into groups of `size`.
  return help ? (
    <Plates item={item} filled counts={false} badge={false} solved={solved} />
  ) : (
    <div className="g-pile"><Snacks icon={item.snack.icon} count={item.total} /></div>
  );
}
