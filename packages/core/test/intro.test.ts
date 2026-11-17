import { describe, expect, it } from 'vitest';
import { VOYAGE_POINT, introStartLabel, introSuggestion, startHereText } from '../src/index.ts';

const other = { id: 'orcadas', title: 'Estación Orcadas' };

describe('intro letter texts (#256)', () => {
  it('names Ushuaia for the first trip and the point otherwise', () => {
    expect(introStartLabel(VOYAGE_POINT)).toBe('Empezar en Ushuaia');
    expect(introStartLabel(other)).toBe('Empezar en Estación Orcadas');
    expect(introSuggestion(VOYAGE_POINT)).toContain('Desde Ushuaia');
    expect(introSuggestion(other)).toBe('Te sugerimos seguir por Estación Orcadas.');
    expect(introSuggestion(null)).toBe('');
  });

  it('has a card text for each width and for another point', () => {
    expect(startHereText(VOYAGE_POINT, true)).not.toBe(startHereText(VOYAGE_POINT, false));
    expect(startHereText(other, true)).toBe('Tocá el punto para empezar la expedición.');
  });
});
