import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Guard of the rule `.agents/rules/project/40-componentes-ui.md`: the look of a component is defined
 * once, in `components.css`, with the tokens of `tokens.css`. The sheet of a screen only lays it out.
 */
const DIR = new URL('../src/styles/', import.meta.url);
/** Sheets that may give a component its look. */
const OWNERS = ['tokens.css', 'components.css'];
/** Classes whose look lives only in `components.css`. */
const COMPONENTS = ['btn', 'iconbtn', 'pill', 'vchip', 'vnote', 'photo-modal'];
/** Properties that make the look. Size, spacing, type and layout stay free for each screen. */
const LOOK = ['background', 'background-color', 'color', 'border', 'border-color'];
/** Hex colors written by hand outside `tokens.css` (illustrations, charts). It may go down, not up. */
const HEX_CAP = 45;

const HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi;
const COMPONENT = new RegExp(`\\.(?:${COMPONENTS.join('|')})(?![\\w-])`);
const BLUE = /--deep|#1e3e5c/i;

const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

type Rule = { selector: string; decls: [prop: string, value: string][] };

/** Style rules of a sheet, with the ones inside `@media` and `@supports`. Enough for these sheets, not a full parser. */
function cssRules(css: string): Rule[] {
  const text = withoutComments(css);
  const rules: Rule[] = [];
  const walk = (from: number, to: number) => {
    let i = from;
    while (i < to) {
      const open = text.indexOf('{', i);
      if (open < 0 || open >= to) return;
      let depth = 1;
      let close = open + 1;
      while (depth > 0 && close < to) {
        if (text[close] === '{') depth++;
        else if (text[close] === '}') depth--;
        close++;
      }
      const head = text.slice(i, open);
      const selector = head.slice(head.lastIndexOf(';') + 1).trim();
      if (!selector.startsWith('@')) {
        const decls = text.slice(open + 1, close - 1).split(';').flatMap((d): Rule['decls'] => {
          const colon = d.indexOf(':');
          return colon < 0 ? [] : [[d.slice(0, colon).trim().toLowerCase(), d.slice(colon + 1).trim()]];
        });
        rules.push({ selector, decls });
      } else if (/^@(media|supports|layer)\b/.test(selector)) walk(open + 1, close - 1);
      i = close;
    }
  };
  walk(0, text.length);
  return rules;
}

/** Splits at `separator` outside parentheses: `:not(.a, .b)` stays whole. */
function splitOutside(text: string, separator: RegExp): string[] {
  const parts: string[] = [];
  let depth = 0;
  let part = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth === 0 && separator.test(ch)) {
      parts.push(part);
      part = '';
    } else part += ch;
  }
  return [...parts, part].filter((p) => p.trim() !== '');
}

/** The element a selector styles: its last compound, without what is inside `:not()` or `:has()`. */
const subject = (selector: string) => (splitOutside(selector, /[\s>+~]/).at(-1) ?? '').replace(/\([^)]*\)/g, '');

/** Rules that give a component its look from a sheet that does not own it. */
function lookLeaks(css: string): string[] {
  return cssRules(css).flatMap(({ selector, decls }) => {
    if (!splitOutside(selector, /,/).some((s) => COMPONENT.test(subject(s)))) return [];
    const props = decls.map(([prop]) => prop).filter((prop) => LOOK.includes(prop));
    return props.length > 0 ? [`${selector.replace(/\s+/g, ' ')} { ${props.join(', ')} }`] : [];
  });
}

/** Hover rules that paint the background blue: a hover only darkens the resting color a little. */
function blueHovers(css: string): string[] {
  return cssRules(css)
    .filter(({ selector, decls }) => selector.includes(':hover')
      && decls.some(([prop, value]) => prop.startsWith('background') && BLUE.test(value)))
    .map(({ selector }) => selector.replace(/\s+/g, ' '));
}

const sheets = readdirSync(DIR)
  .filter((name) => name.endsWith('.css'))
  .map((name) => ({ name, css: readFileSync(new URL(name, DIR), 'utf8') }));
const screens = sheets.filter(({ name }) => !OWNERS.includes(name));
const report = (found: (css: string) => string[]) =>
  screens.flatMap(({ name, css }) => found(css).map((line) => `${name}: ${line}`));

describe('the guard itself', () => {
  it('finds the look of a component given by a screen', () => {
    expect(lookLeaks('.sheet .btn{background:red}')).toHaveLength(1);
    expect(lookLeaks('@media (max-width:600px){.bar .btn.primary:hover{color:red}}')).toHaveLength(1);
    expect(lookLeaks('.a,.b .pill{border:1px solid red}')).toHaveLength(1);
  });

  it('lets a screen lay a component out', () => {
    expect(lookLeaks('.sheet .btn{width:100%;min-height:40px;font-size:14px}')).toEqual([]);
    // The component is not the element styled here.
    expect(lookLeaks('.stage:has(.btn.resume) .legend{color:red}')).toEqual([]);
    expect(lookLeaks('.vnote svg{color:red}')).toEqual([]);
    expect(lookLeaks('.orc-top-btn{background:red}')).toEqual([]);
  });

  it('finds a blue hover', () => {
    expect(blueHovers('.x:hover:not(:disabled){background:var(--deep)}')).toHaveLength(1);
    expect(blueHovers('.x:hover{background-color:#1E3E5C}')).toHaveLength(1);
    expect(blueHovers('.x:hover{border-color:var(--deep)}')).toEqual([]);
    expect(blueHovers('.x[aria-pressed="true"]{background:var(--deep)}')).toEqual([]);
  });
});

describe('interface components (rule 40)', () => {
  it('get their look only from components.css', () => {
    expect(report(lookLeaks)).toEqual([]);
  });

  it('have no blue hover in the sheet of a screen', () => {
    expect(report(blueHovers)).toEqual([]);
  });

  it('have no double line anywhere: borders and rules are one line', () => {
    const doubles = sheets.flatMap(({ name, css }) => cssRules(css)
      .filter(({ decls }) => decls.some(([prop, value]) => prop.startsWith('border') && /\bdouble\b/.test(value)))
      .map(({ selector }) => `${name}: ${selector.replace(/\s+/g, ' ')}`));
    expect(doubles).toEqual([]);
  });

  it('use tokens, not hex colors, in components.css', () => {
    const components = sheets.find(({ name }) => name === 'components.css');
    expect(withoutComments(components?.css ?? '').match(HEX) ?? []).toEqual([]);
  });

  it('do not add hex colors outside tokens.css', () => {
    const count = screens.reduce((n, { css }) => n + (withoutComments(css).match(HEX)?.length ?? 0), 0);
    expect(count).toBeLessThanOrEqual(HEX_CAP);
  });
});
