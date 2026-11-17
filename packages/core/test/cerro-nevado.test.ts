import { describe, expect, it } from 'vitest';
import { CERRO_NEVADO_FACTS, CERRO_NEVADO_ID, CERRO_NEVADO_SOURCES, CERRO_NEVADO_SPOTS, cerroNevadoFacts } from '../src/content/cerro-nevado.ts';
import { AVAILABLE_COUNT, PTS } from '../src/content/points.ts';

describe('scene of Cerro Nevado (#206, docs/puntos-proximamente-fuentes.md)', () => {
  it('is a point of interest, not an expedition', () => {
    const p = PTS.find((q) => q.id === CERRO_NEVADO_ID)!;
    expect(p.tier).toBe('C');
    expect(PTS.filter((q) => q.tier === 'A')).toHaveLength(AVAILABLE_COUNT);
  });

  it('gives every point of the visit its facts, and every datum a source', () => {
    for (const spot of CERRO_NEVADO_SPOTS) expect(cerroNevadoFacts(spot.id).length, spot.id).toBeGreaterThan(1);
    for (const f of CERRO_NEVADO_FACTS) {
      if (f.kind === 'real') expect(f.sources.length, f.id).toBeGreaterThan(0);
      for (const id of f.sources) expect(CERRO_NEVADO_SOURCES[id], `${f.id} ${id}`).toBeDefined();
    }
    expect(cerroNevadoFacts('scene')[0].kind).toBe('recon');
  });

  it('records url, organisation and consultation date of every source', () => {
    for (const s of Object.values(CERRO_NEVADO_SOURCES)) {
      expect(s.url).toMatch(/^https:\/\//);
      expect(s.org.length).toBeGreaterThan(0);
      expect(s.consulted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
