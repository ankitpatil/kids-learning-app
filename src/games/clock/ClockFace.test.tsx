import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClockFace } from './ClockFace';

const texts = (html: string) => [...html.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

describe('ClockFace', () => {
  it('draws 1–12 and rotates the hands for the time', () => {
    const html = renderToStaticMarkup(<ClockFace time={{ h: 3, m: 30 }} />);
    expect(texts(html)).toEqual(Array.from({ length: 12 }, (_, i) => String(i + 1)));
    expect(html).toContain('rotate(180 100 100)'); // minute hand on the 6
    expect(html).toContain('rotate(105 100 100)'); // hour hand between 3 and 4
  });

  it('adds 00, 5 … 55 round the outside when asked, and colours the hands as a scaffold', () => {
    const html = renderToStaticMarkup(<ClockFace time={{ h: 7, m: 25 }} minuteLabels scaffold glow="minute" />);
    expect(texts(html).slice(12)).toEqual(['00', ...Array.from({ length: 11 }, (_, i) => String((i + 1) * 5))]);
    expect(html).toContain('#e17055');
    expect(html).toContain('hand-glow');
    expect(renderToStaticMarkup(<ClockFace time={{ h: 7, m: 25 }} />)).not.toContain('#e17055');
  });
});
