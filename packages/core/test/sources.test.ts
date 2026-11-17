import { describe, expect, it } from 'vitest';
import {
  CERRO_NEVADO_SOURCES, FOSSIL_SOURCES, MARINE_SOURCES, VOYAGE_SOURCES, VOYAGE_SOURCE_CODES, MARAMBIO_SOURCES, ORCADAS_SOURCES,
  cerroNevadoCited, formatConsulted, orcadasUsedCited, ORCADAS_FACTS, isPublishable, fossilCited, marambioCited, marineCited, orcadasCited, pointCited, sourceNumber, voyageCited, voyageSourceNumber,
  type FossilSourceId, type MarineSourceId, type CerroNevadoSourceId,
} from '../src/index.ts';

describe('formatConsulted', () => {
  it('writes ISO and dd/mm/yyyy dates the same way and leaves free text', () => {
    expect(formatConsulted('2026-11-11')).toBe('11 de noviembre de 2026');
    expect(formatConsulted('05/03/2026')).toBe('5 de marzo de 2026');
    expect(formatConsulted('11 de noviembre de 2026')).toBe('11 de noviembre de 2026');
    expect(formatConsulted(undefined)).toBeUndefined();
  });
});

describe('adapters keep title, organism, url and date', () => {
  it('voyage', () => {
    for (const code of VOYAGE_SOURCE_CODES) {
      const c = voyageCited(code);
      expect(c).toMatchObject({ id: code, title: VOYAGE_SOURCES[code].title, org: VOYAGE_SOURCES[code].org, url: VOYAGE_SOURCES[code].url });
      expect(c.consulted).toBeTruthy();
    }
  });
  it('orcadas and marambio', () => {
    expect(orcadasCited().map((s) => [s.id, s.title, s.org, s.url])).toEqual(ORCADAS_SOURCES.map((s) => [s.id, s.label, s.org, s.url]));
    expect(marambioCited().slice(0, MARAMBIO_SOURCES.length).map((s) => [s.id, s.title, s.org, s.url, s.consulted])).toEqual(MARAMBIO_SOURCES.map((s) => [s.id, s.label, s.org, s.url, s.consulted]));
    expect(marambioCited().at(-1)).toMatchObject({ id: 'photo-archive', org: 'Familia Olivero' });
  });
  it('marine, fossils and cerro nevado', () => {
    for (const id of Object.keys(MARINE_SOURCES) as MarineSourceId[]) {
      expect(marineCited(id)).toMatchObject({ title: MARINE_SOURCES[id].title, org: MARINE_SOURCES[id].org, url: MARINE_SOURCES[id].url, consulted: MARINE_SOURCES[id].date });
    }
    for (const id of Object.keys(FOSSIL_SOURCES) as FossilSourceId[]) {
      expect(fossilCited(id)).toMatchObject({ title: FOSSIL_SOURCES[id].title, org: FOSSIL_SOURCES[id].org, consulted: FOSSIL_SOURCES[id].date });
    }
    for (const id of Object.keys(CERRO_NEVADO_SOURCES) as CerroNevadoSourceId[]) {
      expect(cerroNevadoCited(id)).toMatchObject({ title: CERRO_NEVADO_SOURCES[id].label, url: CERRO_NEVADO_SOURCES[id].url });
    }
  });
  it('point source', () => {
    expect(pointCited({ label: 'L', org: 'O', url: 'U', consulted: 'C' }, 2)).toEqual({ id: '2', title: 'L', org: 'O', url: 'U', consulted: 'C' });
  });
});

describe('sourceNumber', () => {
  it('matches voyageSourceNumber on the trip list', () => {
    const list = VOYAGE_SOURCE_CODES.map(voyageCited);
    for (const code of VOYAGE_SOURCE_CODES) expect(sourceNumber(list, code)).toBe(voyageSourceNumber(code));
    expect(sourceNumber(list, 'nope')).toBe(0);
  });
});

describe('orcadas list', () => {
  it('lists every source a publishable fact cites, and the map of the scene last', () => {
    const list = orcadasUsedCited();
    for (const fact of ORCADAS_FACTS.filter(isPublishable)) {
      for (const id of fact.sourceIds) expect(sourceNumber(list, id), `${fact.id} cites ${id}`).toBeGreaterThan(0);
    }
    expect(list[list.length - 1].id).toBe('osm-site');
  });
});

import { expeditionIntro } from '../src/index.ts';

describe('expeditionIntro', () => {
  it('has a text and numbered sources for the expeditions without a picker', () => {
    for (const id of ['marambio', 'oceano', 'fosiles', 'cerronevado']) {
      const intro = expeditionIntro(id)!;
      expect(intro.paragraphs.length, id).toBeGreaterThan(0);
      for (const p of intro.paragraphs) {
        expect(p.sourceIds.length, `${id} cites a source`).toBeGreaterThan(0);
        for (const sid of p.sourceIds) expect(sourceNumber(intro.sources, sid), `${id} lists ${sid}`).toBeGreaterThan(0);
      }
    }
    expect(expeditionIntro('orcadas')).toBeNull();
  });
});
