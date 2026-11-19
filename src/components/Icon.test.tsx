import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Emoji, Icon } from './Icon';

const EMOJI = /\p{Extended_Pictographic}/u;
const text = (html: string) => html.replace(/<[^>]*>/g, '');

describe('<Icon> / <Emoji> (I1c)', () => {
  it('renders a bundled icon as an <img>, with no emoji text', () => {
    const html = renderToStaticMarkup(<Icon name="cookie" />);
    expect(html).toMatch(/<img[^>]+src="[^"]*icons\/cookie\.svg"/);
    expect(text(html)).toBe('');
  });

  it('falls back to the icon’s own emoji for an unknown name only when given one', () => {
    expect(renderToStaticMarkup(<Icon name="no-such-icon" />)).toBe('');
    expect(renderToStaticMarkup(<Icon name="no-such-icon" fallback="🦄" />)).toBe('🦄');
    expect(renderToStaticMarkup(<Icon name="no-such-icon" fallback="🦄" label="Unicorn" />)).toContain('aria-label="Unicorn"');
  });

  it('turns UI strings with emoji into pictures + plain text', () => {
    for (const s of ['⬅️ Levels', '⭐⭐⭐', '⚙️ Grown-ups', '🦊', '🍎🍎 + 🍏\n2 + 1 = ?', '📺 Standing back (TV)']) {
      const html = renderToStaticMarkup(<Emoji text={s} />);
      expect(html).toContain('<img');
      expect(EMOJI.test(text(html)), s).toBe(false);
    }
    expect(text(renderToStaticMarkup(<Emoji text="⬅️ Levels" />))).toBe(' Levels');
  });
});
