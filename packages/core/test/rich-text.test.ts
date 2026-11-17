import { describe, expect, it } from 'vitest';
import { plainText, richParts, strongParts } from '../src/richText.ts';

describe('strongParts', () => {
  it('splits bold passages', () => {
    expect(strongParts('a **b** c')).toEqual([{ text: 'a ', strong: false }, { text: 'b', strong: true }, { text: ' c', strong: false }]);
  });
  it('leaves a lone * and an open ** alone', () => {
    expect(strongParts('a * b')).toEqual([{ text: 'a * b', strong: false }]);
    expect(strongParts('a **b')).toEqual([{ text: 'a **b', strong: false }]);
  });
  it('keeps text without marks as is', () => {
    expect(strongParts('sin marcas')).toEqual([{ text: 'sin marcas', strong: false }]);
  });
});

describe('richParts', () => {
  it('combines bold and quotes', () => {
    const parts = richParts('x **y “z” w** v');
    expect(parts.find((p) => p.text === '“z”')).toEqual({ text: '“z”', strong: true, quoted: true });
    expect(parts.map((p) => p.text).join('')).toBe('x y “z” w v');
  });
  it('plainText gives back the words', () => {
    expect(plainText('un **dato** real')).toBe('un dato real');
  });
});
