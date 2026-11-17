import { describe, expect, it } from 'vitest';
import { VOYAGE_POINT, guideNextText, guidePinText, guideRegistryText, guideTotal, introStartLabel } from '../src/index.ts';

const other = { id: 'orcadas', title: 'Estación Orcadas' };

describe('guide texts (#256)', () => {
  it('names Ushuaia for the first trip and the point otherwise', () => {
    expect(introStartLabel(VOYAGE_POINT)).toBe('Empezar en Ushuaia');
    expect(introStartLabel(other)).toBe('Empezar en Estación Orcadas');
    expect(guidePinText(VOYAGE_POINT)).toContain('Desde Ushuaia');
    expect(guidePinText(other)).toBe('**Ocre:** una expedición. Esta es la sugerida: **Estación Orcadas**.');
    expect(guidePinText(null)).not.toContain('Esta es');
  });

  it('says where the progress is saved by device', () => {
    expect(guideRegistryText(true)).toContain('en este celular');
    expect(guideRegistryText(false)).toContain('en este navegador');
  });

  it('explains the orange button with the suggested title and «Continuar»', () => {
    const t = guideNextText(other);
    expect(t).toContain('**Siguiente: Estación Orcadas**');
    expect(t).toContain('**Continuar**');
  });

  it('has three steps, or two when the six expeditions are done', () => {
    expect(guideTotal(true)).toBe(3);
    expect(guideTotal(false)).toBe(2);
  });
});
