// I1c: UI emoji render through <Emoji>/<Icon> (bundled pictures), not as raw system-emoji text.
// Light source check with the TypeScript parser: flags emoji in JSX text, and string literals
// with emoji rendered directly as a JSX child ({'⭐'.repeat(n)}, {on ? '🙌' : '👆'}).
// Attributes (<Emoji text="⭐" />, aria-label) and plain data/variables are not flagged.
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

const EMOJI = /\p{Extended_Pictographic}/u;

function rawEmojiInJsx(code: string, file = 'x.tsx'): string[] {
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits: string[] = [];
  const line = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;

  // String literals inside a JSX child expression, not descending into nested JSX (visited on their own).
  const stringsIn = (n: ts.Node, out: ts.Node[]) => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) out.push(n);
    ts.forEachChild(n, (c) => stringsIn(c, out));
  };

  const visit = (n: ts.Node) => {
    if (ts.isJsxText(n) && EMOJI.test(n.text)) hits.push(`${file}:${line(n)}: ${n.text.trim()}`);
    if (ts.isJsxExpression(n) && n.expression && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) {
      const lits: ts.Node[] = [];
      stringsIn(n.expression, lits);
      for (const l of lits) if (EMOJI.test(l.getText(sf))) hits.push(`${file}:${line(l)}: ${l.getText(sf)}`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return hits;
}

const SOURCES = import.meta.glob(['/src/**/*.tsx', '!/src/**/*.test.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('raw emoji check', () => {
  it('flags emoji in JSX text and in literals rendered as children', () => {
    expect(rawEmojiInJsx('const a = <b>⭐ {n}</b>;')).toHaveLength(1);
    expect(rawEmojiInJsx("const a = <b>{on ? '🙌' : '👆'}</b>;")).toHaveLength(2);
    expect(rawEmojiInJsx("const a = <b>{'⭐'.repeat(n)}</b>;")).toHaveLength(1);
    expect(rawEmojiInJsx('const a = <b>{`${x} ➡️`}</b>;')).toHaveLength(1);
  });

  it('allows emoji in attributes, <Emoji text>, comments and plain data', () => {
    expect(rawEmojiInJsx('const a = <b aria-label="⭐"><Emoji text="⭐" /> {n}</b>;')).toEqual([]);
    expect(rawEmojiInJsx("const a = <b>{x && <Emoji text={on ? '🙌' : '👆'} />}</b>;")).toEqual([]);
    expect(rawEmojiInJsx("// ⭐ comment\nconst L = ['⭐'];\nconst a = <b>{/* 🎈 */}hi</b>;")).toEqual([]);
  });
});

describe('UI renders emoji as bundled icons (I1c)', () => {
  it('scans the app screens', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(15);
    expect(Object.keys(SOURCES)).toContain('/src/App.tsx');
  });

  it('no raw emoji text left outside <Emoji>/<Icon> in any screen or component', () => {
    const hits = Object.entries(SOURCES).flatMap(([f, code]) => rawEmojiInJsx(code, f));
    expect(hits).toEqual([]);
  });
});
