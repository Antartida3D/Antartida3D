import { describe, expect, it } from 'vitest';
// Break the pre-existing stationModels <-> sightingModels -> penguins import cycle in test isolation.
import '../src/voyage/sightingModels.ts';
import { PONCHO_SCENES, sceneBodyRadius, sceneTrack, sceneCoastZ, shipWalkwayAt, type SceneDef } from '@antartida/core';
import {
  DIORAMA_CLEAR_MARGIN,
  DIORAMA_FOG_FAR,
  DIORAMA_SWELL,
  DIORAMA_WATER_Y,
  buildDioramaWorld,
  dioramaBlocked,
  dioramaDetails,
  dioramaGround,
  dioramaOnLand,
  dioramaRadius,
  dioramaShoreZ,
  stationMountain,
} from '../src/voyage/ponchoDioramaGround.ts';
import { PRESHADED } from '../src/voyage/lowPoly.ts';
import { sceneClearings } from '../src/voyage/ponchoSceneBuild.ts';
import { SKY_HAZE, SKY_ZENITH, skyColorAt } from '../src/voyage/ponchoSky.ts';

/** The most faces the land and the sea of a diorama may have: two draw calls, light on a phone. */
const MAX_LAND_TRIS = 9000;
const MAX_SEA_TRIS = 6500;

const faces = (tris: readonly (readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number], number])[]) =>
  tris.flatMap((t) => t.slice(0, 3) as unknown as readonly (readonly [number, number, number])[]);

describe('ground of the diorama', () => {
  it('has gentle swells: the snow near the stage stays within DIORAMA_SWELL of flat', () => {
    for (let x = -8; x <= 8; x += 0.37) {
      for (let z = -8; z <= 8; z += 0.41) expect(Math.abs(dioramaGround(x, z))).toBeLessThanOrEqual(DIORAMA_SWELL + 1e-9);
    }
  });

  for (const [id, scene] of Object.entries(PONCHO_SCENES)) {
    describe(id, () => {
      const radius = dioramaRadius(scene);

      it('has every element and path on the ice, with no sea under them', () => {
        const spots = [...scene.elements.map((e) => [e.x, e.z] as const), ...scene.paths.flatMap((p) => [p.from, ...(p.via ?? []), p.to])];
        // (The gangway of the ship and its foredeck reach out over the water: they are the way aboard, not the sea.)
        for (const [x, z] of spots) if (!shipWalkwayAt(x, z)) expect(dioramaOnLand(scene, x, z)).toBe(true);
      });

      it('builds finite faces with resolved colors, within the budget, and the same every time', () => {
        const a = buildDioramaWorld(scene);
        const b = buildDioramaWorld(scene);
        expect(a.land.length).toBeGreaterThan(1500);
        expect(a.land.length).toBeLessThanOrEqual(MAX_LAND_TRIS);
        expect(a.sea.length).toBeLessThanOrEqual(MAX_SEA_TRIS);
        for (const t of [...a.land, ...a.sea]) {
          expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
          // A relief marker left (negative) would break the geometry.
          expect(t[3]).toBeGreaterThanOrEqual(0);
        }
        expect(b.land).toEqual(a.land);
        expect(b.sea).toEqual(a.sea);
      });

      it('goes on to the horizon: ground far past the stage in every direction, and ridges rising beyond it', () => {
        // (The ground of a station ends at its shore; past it the water goes on to the horizon.)
        const { land, sea } = buildDioramaWorld(scene);
        const pts = faces(scene.setting === 'station' ? [...land, ...sea] : land);
        const reach = (a: number) => Math.max(...pts.filter((p) => Math.cos(a) * p[0] + Math.sin(a) * p[2] > Math.hypot(p[0], p[2]) * 0.9).map((p) => Math.hypot(p[0], p[2])));
        for (let k = 0; k < 8; k++) expect(reach((k / 8) * Math.PI * 2)).toBeGreaterThan(DIORAMA_FOG_FAR * 0.9);
        // Ridges: faces much higher than the swells at the stage, all of them far from it.
        const high = pts.filter((p) => p[1] > 3);
        expect(high.length).toBeGreaterThan(50);
        // (The mountain of a station starts closer: it is the backdrop of the base.)
        for (const p of high) expect(Math.hypot(p[0], p[2])).toBeGreaterThan(scene.setting === 'station' ? 15 : 40);
      });

      it('keeps the stage free of height: the ground under the elements is the swell and nothing else', () => {
        const { land } = buildDioramaWorld(scene);
        for (const p of faces(land)) {
          if (Math.hypot(p[0], p[2]) < 5 && dioramaOnLand(scene, p[0], p[2])) expect(Math.abs(p[1])).toBeLessThan(0.45);
        }
      });

      it('has pebbles, rocks and drifts scattered, and leaves clear what the scene shows', () => {
        const details = dioramaDetails(scene, radius, 1);
        expect(details.length).toBeGreaterThan(150);
        for (const t of details) {
          for (const v of t.slice(0, 3) as readonly (readonly [number, number, number])[]) {
            expect(v.every(Number.isFinite)).toBe(true);
            for (const e of scene.elements) {
              // A rock may lean on the edge of the clearance, never sit under the thing.
              expect(Math.hypot(v[0] - e.x, v[2] - e.z), `${e.kind} ${e.id}`).toBeGreaterThan((sceneBodyRadius(e) + DIORAMA_CLEAR_MARGIN) * 0.4);
            }
            expect(dioramaOnLand(scene, v[0], v[2]), 'not in the sea').toBe(true);
          }
        }
      });

      it('reports a place on an element as blocked and a free one as open', () => {
        const e = scene.elements[0];
        expect(dioramaBlocked(scene, e.x, e.z)).toBe(true);
        // A free place: on land, away from the scene (a station has its sea on -z, and its huts scattered behind: #261).
        expect(dioramaBlocked(scene, scene.setting === 'station' ? -3 : -9, scene.setting === 'station' ? 9 : -9)).toBe(false);
      });
    });
  }
});

describe('the sea of a coast scene', () => {
  const coast = PONCHO_SCENES['rumbo-a-belgrano'];
  const plain: SceneDef = PONCHO_SCENES['expedicion-invernal-1962'];

  it('is only on a coast: a plain has none', () => {
    expect(coast.setting).toBe('coast');
    expect(buildDioramaWorld(plain).sea).toHaveLength(0);
    expect(buildDioramaWorld(coast).sea.length).toBeGreaterThan(500);
  });

  it('lies at the water level, beyond the ice, and as far as the haze', () => {
    const { sea } = buildDioramaWorld(coast);
    const pts = faces(sea);
    // The water and the foam are preshaded flat colors; the floating ice has its foot under them.
    for (const p of faces(sea.filter((t) => t[3] >= PRESHADED))) expect(Math.abs(p[1] - DIORAMA_WATER_Y)).toBeLessThan(0.05);
    expect(Math.max(...pts.map((p) => p[2]))).toBeGreaterThan(DIORAMA_FOG_FAR * 0.9);
    // Nothing of the sea on the stage side of the coast, except the water that hides under the ice (it is lower than the ice).
    for (const p of pts) if (p[1] > DIORAMA_WATER_Y + 0.02) expect(p[2]).toBeGreaterThan(sceneCoastZ(p[0]) - 0.3);
  });

  it('drops the ice to the water in a cliff at the coast line, with sea bed under the water', () => {
    const { land } = buildDioramaWorld(coast);
    const pts = faces(land);
    const inland = pts.filter((p) => Math.abs(p[0]) < 4 && p[2] < sceneCoastZ(p[0]) - 1 && p[2] > 0);
    const offshore = pts.filter((p) => Math.abs(p[0]) < 4 && p[2] > sceneCoastZ(p[0]) + 1.2 && p[2] < 12);
    expect(Math.min(...inland.map((p) => p[1]))).toBeGreaterThan(-0.2);
    expect(Math.max(...offshore.map((p) => p[1]))).toBeLessThan(DIORAMA_WATER_Y);
  });

  it('keeps details out of the sea', () => {
    expect(dioramaBlocked(coast, 0, sceneCoastZ(0) + 1)).toBe(true);
    expect(dioramaOnLand(coast, 0, sceneCoastZ(0) - 1)).toBe(true);
    expect(dioramaOnLand(coast, 0, sceneCoastZ(0) + 0.2)).toBe(false);
  });
});

describe('the sky of the diorama', () => {
  const channels = (c: number) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

  it('is the haze at and under the horizon and the zenith blue straight up', () => {
    expect(skyColorAt(0)).toBe(SKY_HAZE);
    expect(skyColorAt(-1)).toBe(SKY_HAZE);
    expect(skyColorAt(1)).toBe(SKY_ZENITH);
  });

  it('gets bluer, steadily, going up', () => {
    let prev = channels(skyColorAt(0))[0];
    for (let i = 1; i <= 10; i++) {
      const red = channels(skyColorAt(i / 10))[0];
      expect(red).toBeLessThanOrEqual(prev);
      prev = red;
    }
  });
});

describe('the ground of a station (#216)', () => {
  const station = PONCHO_SCENES.nacimiento;

  it('is a station: bare ground with a mountain behind it and the sea in front, on -z', () => {
    expect(station.setting).toBe('station');
    expect(dioramaOnLand(station, 0, 3)).toBe(true);
    expect(dioramaOnLand(station, 0, -2)).toBe(true);
    expect(dioramaOnLand(station, 0, dioramaShoreZ(station, 0))).toBe(false);
    // There is room of land in front of the stage before the water.
    expect(dioramaShoreZ(station, 0)).toBeLessThan(-4.5);
    const { sea } = buildDioramaWorld(station);
    expect(sea.length).toBeGreaterThan(500);
    expect(sea.length).toBeLessThanOrEqual(MAX_SEA_TRIS);
    // Only water and its foam: nothing white afloat in front of the base.
    expect(sea.every((t) => t[3] >= PRESHADED)).toBe(true);
    const pts = faces(sea);
    // Water at its level, as far as the haze, and none of it behind the base.
    for (const p of faces(sea.filter((t) => t[3] >= PRESHADED))) expect(Math.abs(p[1] - DIORAMA_WATER_Y)).toBeLessThan(0.05);
    expect(Math.min(...pts.map((p) => p[2]))).toBeLessThan(-DIORAMA_FOG_FAR * 0.9);
    for (const p of pts) if (p[1] > DIORAMA_WATER_Y + 0.02) expect(p[2]).toBeLessThan(dioramaShoreZ(station, p[0]) + 0.3);
  });

  it('has its sea faces turned up, as the sea of a coast', () => {
    const { sea } = buildDioramaWorld(station);
    const water = sea.filter((t) => t[3] >= PRESHADED);
    expect(water.length).toBeGreaterThan(200);
    for (const t of water.slice(0, 200)) {
      const [a, b, c] = t;
      const nY = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      expect(Math.abs(nY)).toBeGreaterThan(0);
    }
  });

  it('is flat round the stage and rises behind it, to a mountain, and comes down again in the haze', () => {
    for (let x = -6; x <= 6; x += 1.5) expect(stationMountain(x, -2)).toBeCloseTo(0, 6);
    const around = Math.max(...[0, 2, 4].map((z) => stationMountain(0, z)));
    expect(around).toBeLessThan(0.5);
    expect(Math.max(...[30, 40, 50].map((z) => stationMountain(0, z)))).toBeGreaterThan(5);
    expect(stationMountain(0, DIORAMA_FOG_FAR * 1.1)).toBeLessThan(0.1);
  });

  it('paints gravel round the stage and snow on the mountain, within the budget of faces', () => {
    const { land } = buildDioramaWorld(station);
    expect(land.length).toBeLessThanOrEqual(MAX_LAND_TRIS);
    const colors = new Set(land.map((t) => t[3]));
    expect(colors.size).toBeGreaterThan(4);
    // Every face has a real color already (the relief paints only the faces that ask for it).
    expect(land.filter((t) => t[3] < 0).length).toBeLessThan(land.length);
  });
});

describe('the last stop of Poncho at the Base Esperanza (#223)', () => {
  it('keeps every walk off the huts of the base: the team goes off and Poncho walks away without going into a house', () => {
    const scene = PONCHO_SCENES['brujula-perdida'];
    const huts = sceneClearings(scene);
    expect(huts.length).toBeGreaterThan(0);
    for (const e of scene.elements.filter((el) => el.path)) {
      for (const [x, z] of sceneTrack(scene, e)) {
        for (const [hx, hz, r] of huts) expect(Math.hypot(x - hx, z - hz), `${e.kind} ${e.id} on ${e.path}`).toBeGreaterThan(r);
      }
    }
  });
});
