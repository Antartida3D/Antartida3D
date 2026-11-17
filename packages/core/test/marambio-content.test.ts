import { describe, expect, it } from 'vitest';
import {
  MARAMBIO_FACTS,
  MARAMBIO_GUIDING_QUESTION,
  MARAMBIO_OSM_SOURCE_ID,
  MARAMBIO_SOURCES,
  MARAMBIO_SPOTS,
  marambioFacts,
  marambioSourcesOf,
  MARAMBIO_STORM_MONTH,
} from '../src/content/marambio.ts';
import { MARAMBIO_BLIZZARD_HIGH_YEAR, MARAMBIO_CLIMATE } from '../src/content/marambio-climate.ts';
import { FACT_KIND_LABEL } from '../src/content/orcadas.ts';
import { MARAMBIO_POINT } from '../src/content/points.ts';
import { VOYAGE_SOURCES } from '../src/content/ushuaia.ts';

/** Words by which a fact that is not a datum says so itself. */
// A simulation says so too (the blizzard of the months, #160).
const NOT_DATA = /reconstrucci[oó]n|ilustra|fotos? de referencia|simulaci[oó]n/;

describe('Base Marambio content and sources (docs/expediciones/base-marambio.md)', () => {
  it('has unique ids in sources, facts and spots', () => {
    for (const ids of [MARAMBIO_SOURCES.map((s) => s.id), MARAMBIO_FACTS.map((f) => f.id), MARAMBIO_SPOTS.map((s) => s.id)]) {
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('records url, organisation and consultation date of every source', () => {
    for (const s of MARAMBIO_SOURCES) {
      expect(s.url, s.id).toMatch(/^https:\/\//);
      expect(s.org.length, s.id).toBeGreaterThan(0);
      expect(s.label.length, s.id).toBeGreaterThan(0);
      expect(s.short.length, s.id).toBeGreaterThan(0);
      expect(s.consulted, s.id).toMatch(/^\d{1,2} de [a-z]+ de \d{4}$/);
    }
  });

  it('shares its sources with «Desde Ushuaia» instead of copying their URLs', () => {
    const voyageUrls = new Set<string>(Object.values(VOYAGE_SOURCES).map((s) => s.url));
    expect(MARAMBIO_SOURCES.filter((s) => voyageUrls.has(s.url)).length).toBeGreaterThanOrEqual(5);
  });

  it('attributes OpenStreetMap with its licence', () => {
    const osm = MARAMBIO_SOURCES.find((s) => s.id === MARAMBIO_OSM_SOURCE_ID)!;
    expect(osm.license).toContain('ODbL');
    expect(osm.license).toContain('© colaboradores de OpenStreetMap');
  });

  it('cites only sources that exist, and uses every source', () => {
    const ids = new Set(MARAMBIO_SOURCES.map((s) => s.id));
    const used = new Set<string>();
    for (const f of MARAMBIO_FACTS) {
      for (const id of f.sourceIds) {
        expect(ids.has(id), `${f.id} -> ${id}`).toBe(true);
        used.add(id);
      }
      expect(marambioSourcesOf(f).map((s) => s.id)).toEqual([...f.sourceIds]);
    }
    expect([...used].sort()).toEqual([...ids].sort());
  });

  it('gives every real fact a source, and makes every other fact say what it is', () => {
    for (const f of MARAMBIO_FACTS) {
      expect(FACT_KIND_LABEL[f.kind], f.id).toBeDefined();
      if (f.kind === 'real') expect(f.sourceIds.length, f.id).toBeGreaterThan(0);
      else expect(f.text, f.id).toMatch(NOT_DATA);
    }
  });

  it('never labels as a real fact what rests only on OpenStreetMap, a collaborative map', () => {
    for (const f of MARAMBIO_FACTS) {
      const onlyOsm = f.sourceIds.length > 0 && f.sourceIds.every((id) => id === MARAMBIO_OSM_SOURCE_ID);
      if (!onlyOsm) continue;
      expect(f.kind, f.id).toBe('recon');
      expect(f.text, f.id).toMatch(/OpenStreetMap/);
    }
    for (const id of ['hangar-osm', 'buildings-nombres']) {
      expect(MARAMBIO_FACTS.find((f) => f.id === id)!.text, id).toMatch(/OpenStreetMap, un mapa colaborativo/);
    }
  });

  it('dates the runway size the Air Force gave in 2020 instead of giving it as the runway first built', () => {
    const runway = MARAMBIO_FACTS.find((f) => f.id === 'runway-medidas')!;
    expect(runway.text).toMatch(/300 m/);
    expect(runway.text).toMatch(/800 m/);
    expect(runway.text).toMatch(/En 2020 la Fuerza Aérea le daba 1\.200 m/);
    expect(runway.sourceIds).toEqual(['dna-base', 'faa-aniversario']);
  });

  it('labels the diorama as an illustrated reconstruction', () => {
    const scene = marambioFacts('scene');
    expect(scene.length).toBeGreaterThan(0);
    expect(scene.every((f) => f.kind === 'recon')).toBe(true);
    expect(scene[0].text).toContain('reconstrucción ilustrada, no un modelo a escala');
  });

  it('has the spots in tour order, each with facts of its own', () => {
    expect(MARAMBIO_SPOTS.map((s) => s.id)).toEqual(['plateau', 'runway', 'hercules', 'hangar', 'tower', 'buildings']);
    for (const s of MARAMBIO_SPOTS) {
      expect(marambioFacts(s.id).length, s.id).toBeGreaterThan(0);
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.shortLabel.length).toBeGreaterThan(0);
    }
    // Besides the points: the scene label, the strip of months (#160) and the blizzard button (#263).
    expect(MARAMBIO_FACTS.length).toBe(
      MARAMBIO_SPOTS.reduce((n, s) => n + marambioFacts(s.id).length, marambioFacts('scene').length + marambioFacts('months').length + marambioFacts('storm').length)
    );
  });

  it('explains the blizzard of the button with sources, from the SMN numbers, and says the scene is a simulation (#263)', () => {
    const storm = marambioFacts('storm');
    expect(storm.filter((f) => f.kind === 'real').every((f) => f.sourceIds.length > 0)).toBe(true);
    expect(storm.some((f) => f.kind === 'sim')).toBe(true);
    // The numbers come from the normals, not typed in.
    const peak = Math.max(...MARAMBIO_CLIMATE.map((c) => c.blizzardHighDays));
    const marambio = storm.find((f) => f.id === 'storm-marambio')!;
    expect(marambio.text).toContain(`${Math.round(MARAMBIO_BLIZZARD_HIGH_YEAR)} días al año`);
    expect(marambio.text).toContain(`${Math.round(peak)} en julio`);
    expect(MARAMBIO_CLIMATE[MARAMBIO_STORM_MONTH - 1].blizzardHighDays).toBe(peak);
  });

  it('keeps the facts short and without exclamation marks', () => {
    for (const f of MARAMBIO_FACTS) {
      expect(f.text, f.id).not.toMatch(/[¡!]/);
      expect(f.text.length, f.id).toBeLessThan(300);
    }
  });

  it('publishes neither a current runway length nor a count of buildings (pending, see the docs)', () => {
    for (const f of MARAMBIO_FACTS.filter((q) => q.kind === 'real')) {
      expect(f.text, f.id).not.toMatch(/1\.208|1\.260|\d+ edificios|m² |sin puerto|no tiene puerto/);
    }
  });

  it('asks the question of the map point', () => {
    expect(MARAMBIO_POINT.q).toBe(MARAMBIO_GUIDING_QUESTION);
    expect(MARAMBIO_POINT.tier).toBe('A');
    expect(MARAMBIO_GUIDING_QUESTION).toMatch(/^¿.+\?$/);
  });
});
