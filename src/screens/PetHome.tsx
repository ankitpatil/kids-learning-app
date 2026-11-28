import { useEffect, useState } from 'react';
import { MAX_HEARTS, PET_FOODS, PET_KIND_BY_ID, PET_KINDS, PET_OUTFIT_BY_ID, PET_OUTFITS, type OutfitSlot } from '../content/pet';
import { adoptPet, buyOutfit, feedPet, heartsNow, petMood, starBalance, toggleOutfit, type PetMood, type ShopResult } from '../engine/pet';
import { updatePet, type Profile } from '../store/db';
import { say, tapSay } from '../audio/speech';
import { playSparkle } from '../audio/sfx';
import { Emoji, Icon } from '../components/Icon';
import { StreakBadge } from '../components/StreakBadge';

interface Props {
  profile: Profile;
  onChange: (p: Profile) => void;
  onBack: () => void;
}

const MOOD_LINE: Record<PetMood, string> = {
  hungry: 'I’m hungry! Can I have a snack?',
  ok: 'I would love a snack!',
  happy: 'I love you!',
  full: 'I’m so full and happy!',
};

const SLOTS: OutfitSlot[] = ['head', 'eyes', 'neck'];

/** #27a: the child's pet — adopt once, then feed it and dress it up with stars. */
export function PetHome({ profile, onChange, onBack }: Props) {
  const [tab, setTab] = useState<'food' | 'clothes'>('food');
  const [eating, setEating] = useState<string | null>(null);
  const [bounce, setBounce] = useState(0);
  const pet = profile.pet;
  const kind = pet ? PET_KIND_BY_ID.get(pet.kind) : undefined;
  const hearts = pet ? heartsNow(pet) : 0;
  const mood = petMood(hearts);
  const wallet = starBalance(profile);

  useEffect(() => {
    say(pet ? MOOD_LINE[mood] : 'Pick a pet!');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(step: (p: Profile) => ShopResult) {
    const { result, profile: next } = await updatePet(profile.id, step);
    if (result.ok) onChange(next);
    return result;
  }

  const needMore = (cost: number) => {
    const n = cost - wallet;
    tapSay(`You need ${n} more ${n === 1 ? 'star' : 'stars'}. | Play a game to get more!`);
  };

  async function adopt(id: string) {
    const k = PET_KIND_BY_ID.get(id)!;
    const r = await run((p) => (p.pet ? { ok: false, why: 'owned' } : { ok: true, pet: adoptPet(id)! }));
    if (r.ok) {
      playSparkle();
      tapSay(`Hi! I’m your ${k.name}!`);
    }
  }

  async function feed(id: string) {
    const food = PET_FOODS.find((f) => f.id === id)!;
    const r = await run((p) => feedPet(p.pet, p.stars, id));
    if (r.ok) {
      setEating(food.icon);
      setBounce((b) => b + 1);
      playSparkle();
      tapSay(`Yum! ${food.name}!`);
      window.setTimeout(() => setEating(null), 900);
    } else if (r.why === 'full') tapSay('I’m full! | Let’s play a game!');
    else if (r.why === 'stars') needMore(food.cost);
  }

  async function outfit(id: string) {
    const o = PET_OUTFIT_BY_ID.get(id)!;
    if (pet?.outfits.includes(id)) {
      const on = pet.wearing[o.slot] !== id;
      const r = await run((p) => toggleOutfit(p.pet, id));
      if (r.ok) {
        setBounce((b) => b + 1);
        tapSay(on ? `Looking good! | ${o.name}!` : 'Off it goes!');
      }
      return;
    }
    const r = await run((p) => buyOutfit(p.pet, p.stars, id));
    if (r.ok) {
      setBounce((b) => b + 1);
      playSparkle();
      tapSay(`Wow! A ${o.name}!`);
    } else if (r.why === 'stars') needMore(o.cost);
  }

  return (
    <div className="screen pet">
      <div className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Back"><Emoji text="⬅️" /> Back</button>
        <button className="stars" onClick={() => tapSay(`You have ${wallet} ${wallet === 1 ? 'star' : 'stars'} to spend!`)} aria-label={`${wallet} stars to spend`}>
          <Emoji text="⭐" /> {wallet}
        </button>
        <StreakBadge profileId={profile.id} compact />
      </div>

      {!pet || !kind ? (
        <>
          <h1 className="title" onClick={() => tapSay('Pick a pet!')}>Pick a pet!</h1>
          <div className="pet-adopt">
            {PET_KINDS.map((k) => (
              <button key={k.id} className="pet-choice" onClick={() => adopt(k.id)} aria-label={k.name}>
                <Icon name={k.icon} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button key={bounce} className={`pet-stage mood-${mood} ${bounce ? 'happy-bounce' : ''}`} onClick={() => tapSay(MOOD_LINE[mood])} aria-label={`Your ${kind.name}. ${MOOD_LINE[mood]}`}>
            <span className="pet-face"><Icon name={kind.icon} /></span>
            {SLOTS.map((slot) => {
              const o = pet.wearing[slot] ? PET_OUTFIT_BY_ID.get(pet.wearing[slot]!) : undefined;
              return o ? <span key={slot} className={`pet-wear ${slot}`}><Icon name={o.icon} /></span> : null;
            })}
            {mood === 'hungry' && !eating && <span className="pet-bubble"><Icon name="red-apple" /></span>}
            {eating && <span className="pet-eat"><Icon name={eating} /></span>}
          </button>
          <div className="pet-hearts" role="img" aria-label={`${hearts} of ${MAX_HEARTS} hearts`}>
            {Array.from({ length: MAX_HEARTS }, (_, i) => (
              <span key={i} className={i < hearts ? 'on' : 'off'}><Emoji text={i < hearts ? '❤️' : '🤍'} /></span>
            ))}
          </div>

          <div className="pet-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'food'} className={tab === 'food' ? 'on' : ''} onClick={() => { setTab('food'); tapSay('Food'); }} aria-label="Food">
              <Emoji text="🍎" />
            </button>
            <button role="tab" aria-selected={tab === 'clothes'} className={tab === 'clothes' ? 'on' : ''} onClick={() => { setTab('clothes'); tapSay('Dress up'); }} aria-label="Dress up">
              <Emoji text="👒" />
            </button>
          </div>

          <div className="pet-shelf">
            {tab === 'food'
              ? PET_FOODS.map((f) => (
                  <button key={f.id} className={`pet-item ${wallet >= f.cost ? '' : 'dear'}`} onClick={() => feed(f.id)} aria-label={`${f.name}, ${f.cost} stars`}>
                    <span className="pet-item-icon"><Icon name={f.icon} /></span>
                    <span className="pet-cost"><Emoji text="⭐" />{f.cost}</span>
                  </button>
                ))
              : PET_OUTFITS.map((o) => {
                  const owned = pet.outfits.includes(o.id);
                  const worn = pet.wearing[o.slot] === o.id;
                  return (
                    <button
                      key={o.id}
                      className={`pet-item ${owned ? 'owned' : wallet >= o.cost ? '' : 'dear'} ${worn ? 'worn' : ''}`}
                      onClick={() => outfit(o.id)}
                      aria-label={owned ? `${o.name}. ${worn ? 'Take off' : 'Put on'}` : `${o.name}, ${o.cost} stars`}
                      aria-pressed={owned ? worn : undefined}
                    >
                      <span className="pet-item-icon"><Icon name={o.icon} /></span>
                      {owned ? <span className="pet-cost">{worn ? <Emoji text="✅" /> : <Emoji text="👕" />}</span> : <span className="pet-cost"><Emoji text="⭐" />{o.cost}</span>}
                    </button>
                  );
                })}
          </div>
        </>
      )}
    </div>
  );
}
