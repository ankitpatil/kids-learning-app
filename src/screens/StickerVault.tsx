import { useEffect, useState } from 'react';
import { STICKERS, STICKER_PAGES, type Sticker } from '../content/stickers';
import { collectedCount } from '../engine/stickers';
import { say, tapSay } from '../audio/speech';
import { Emoji, Icon } from '../components/Icon';

interface Props {
  owned: Record<string, number>;
  onBack: () => void;
}

/** The sticker book: every page, collected stickers in colour, missing ones as mystery shapes. */
export function StickerVault({ owned, onBack }: Props) {
  const [zoom, setZoom] = useState<Sticker | null>(null);
  const got = collectedCount(owned);
  useEffect(() => {
    say(got ? `You have ${got} stickers!` : 'Finish a game to get your first sticker!');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="screen vault">
      <div className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Back to home"><Emoji text="⬅️" /> Back</button>
        <div className="vault-count" role="img" aria-label={`${got} of ${STICKERS.length} stickers`}><Emoji text="📒" /> {got} / {STICKERS.length}</div>
        <span style={{ width: 64 }} />
      </div>
      {STICKER_PAGES.map(({ page, title }) => {
        const items = STICKERS.filter((s) => s.page === page);
        const have = items.filter((s) => owned[s.id]).length;
        return (
          <section key={page} className="vault-page">
            <h2>
              {title} <span className="page-count">{have}/{items.length}</span>
            </h2>
            <div className="vault-grid">
              {items.map((s) =>
                owned[s.id] ? (
                  <button key={s.id} className={`vault-sticker ${s.rarity}`} onClick={() => { setZoom(s); tapSay(s.name); }} aria-label={s.name}>
                    <span><Icon name={s.icon} /></span>
                    {owned[s.id] > 1 && <span className="dup">×{owned[s.id]}</span>}
                  </button>
                ) : (
                  <div key={s.id} className={`vault-sticker locked ${s.rarity}`} role="img" aria-label="Not collected yet">
                    <span><Icon name={s.icon} /></span>
                  </div>
                ),
              )}
            </div>
          </section>
        );
      })}
      {zoom && (
        <div className="sticker-zoom" onClick={() => setZoom(null)} role="dialog" aria-label={zoom.name}>
          <div className={`sticker-big ${zoom.rarity}`}><Icon name={zoom.icon} /></div>
          <div className="sticker-name">{zoom.name}</div>
        </div>
      )}
    </div>
  );
}
