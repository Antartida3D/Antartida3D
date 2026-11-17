import { describe, expect, it } from 'vitest';
// Break the pre-existing stationModels <-> sightingModels -> penguins import cycle in test isolation.
import '../src/voyage/sightingModels.ts';
import { PONCHO_SCENES } from '@antartida/core';
import { normalOf, type Tri } from '../src/voyage/lowPoly.ts';
import {
  buildEsperanzaMainHouse,
  buildFlagContainer,
  ESPERANZA_CLEARINGS,
  ESPERANZA_HUTS,
  ESPERANZA_PIER,
  ESPERANZA_SCENE_Z,
  FLAG_BLUE,
  FLAG_SUN,
  HUT_GAP,
  HUT_ROW_BAND,
  SIGN_INK,
} from '../src/voyage/ponchoBase.ts';
import { buildDioramaWorld, dioramaDetails, dioramaOnLand, dioramaRadius, DIORAMA_WATER_Y } from '../src/voyage/ponchoDioramaGround.ts';
import { sceneClearings } from '../src/voyage/ponchoSceneBuild.ts';

const extent = (tris: readonly Tri[], k: 0 | 1 | 2) => {
  const v = tris.flatMap(([a, b, c]) => [a[k], b[k], c[k]]);
  return Math.max(...v) - Math.min(...v);
};
const station = PONCHO_SCENES.nacimiento;
const base = station.elements.find((e) => e.kind === 'prop' && e.id === 'baseEsperanza')!;

describe('Base Esperanza (#261)', () => {
  it('stands where its layout expects it in the scene', () => {
    expect([base.x, base.z, base.yaw, base.scale ?? 1]).toEqual([0, ESPERANZA_SCENE_Z, 0, 1]);
  });

  it('has its main house long across the shore, with the sign «BASE ESPERANZA» on the gable end that looks at the sea', () => {
    const house = buildEsperanzaMainHouse();
    expect(extent(house, 2)).toBeGreaterThan(extent(house, 0) * 1.8);
    const letters = house.filter((t) => t[3] === SIGN_INK);
    // 13 letters of a 5-row pixel font: well over a hundred pixels, two faces each, all turned to the sea (-z).
    expect(letters.length).toBeGreaterThan(200);
    for (const t of letters) expect(normalOf(t)[2]).toBeLessThan(-0.99);
  });

  it('paints the flag on the side of the container that looks at the sea', () => {
    const container = buildFlagContainer();
    const flag = container.filter((t) => t[3] === FLAG_BLUE || t[3] === FLAG_SUN);
    expect(flag.some((t) => t[3] === FLAG_BLUE)).toBe(true);
    expect(flag.some((t) => t[3] === FLAG_SUN)).toBe(true);
    for (const t of flag) expect(normalOf(t)[2]).toBeLessThan(-0.99);
  });

  it('has its walkway from the land out over the water', () => {
    const at = (p: readonly [number, number]) => [base.x + p[0], base.z + p[1] - ESPERANZA_SCENE_Z] as const;
    const [fx, fz] = at(ESPERANZA_PIER.from);
    const [tx, tz] = at(ESPERANZA_PIER.to);
    expect(dioramaOnLand(station, fx, fz)).toBe(true);
    expect(dioramaOnLand(station, tx, tz)).toBe(false);
    // On a station the props sit on the water past the shore, so the walkway ends at the water and not on the sea bed.
    expect(buildDioramaWorld(station).ground(tx, tz)).toBeCloseTo(DIORAMA_WATER_Y, 6);
  });

  it('scatters six more buildings of different sizes, far apart and not in rows', () => {
    expect(ESPERANZA_HUTS).toHaveLength(6);
    expect(new Set(ESPERANZA_HUTS.map((h) => h.scale)).size).toBe(6);
    for (const [i, a] of ESPERANZA_HUTS.entries()) {
      for (const b of ESPERANZA_HUTS.slice(i + 1)) {
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(HUT_GAP + 1.5 * (a.scale + b.scale));
      }
    }
    // Not in rows: no three of them at about the same depth.
    const zs = ESPERANZA_HUTS.map((h) => h.z).sort((a, b) => a - b);
    for (let i = 2; i < zs.length; i++) expect(zs[i] - zs[i - 2]).toBeGreaterThanOrEqual(HUT_ROW_BAND);
  });

  it('keeps the rocks and pebbles of the diorama out of its houses', () => {
    const clear = sceneClearings(station);
    expect(clear).toHaveLength(ESPERANZA_CLEARINGS.length);
    for (const t of dioramaDetails(station, dioramaRadius(station), 1)) {
      for (const v of t.slice(0, 3) as readonly (readonly [number, number, number])[]) {
        for (const [x, z, r] of clear) expect(Math.hypot(v[0] - x, v[2] - z)).toBeGreaterThan(r * 0.6);
      }
    }
  });
});
