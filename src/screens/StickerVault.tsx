import { useEffect, useState } from 'react';
import { STICKERS, STICKER_PAGES, type Sticker } from '../content/stickers';
import { collectedCount } from '../engine/stickers';
import { say } from '../audio/speech';

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
        <button className="back-btn" onClick={onBack} aria-label="Back to home">⬅️ Back</button>
        <div className="vault-count" aria-label={`${got} of ${STICKERS.length} stickers`}>📒 {got} / {STICKERS.length}</div>
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
                  <button key={s.id} className={`vault-sticker ${s.rarity}`} onClick={() => { setZoom(s); say(s.name); }} aria-label={s.name}>
                    <span>{s.emoji}</span>
                    {owned[s.id] > 1 && <span className="dup">×{owned[s.id]}</span>}
                  </button>
                ) : (
                  <div key={s.id} className={`vault-sticker locked ${s.rarity}`} aria-label="Not collected yet">
                    <span>{s.emoji}</span>
                  </div>
                ),
              )}
            </div>
          </section>
        );
      })}
      {zoom && (
        <div className="sticker-zoom" onClick={() => setZoom(null)} role="dialog" aria-label={zoom.name}>
          <div className={`sticker-big ${zoom.rarity}`}>{zoom.emoji}</div>
          <div className="sticker-name">{zoom.name}</div>
        </div>
      )}
    </div>
  );
}
