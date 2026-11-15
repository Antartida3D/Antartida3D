import { describe, expect, it } from 'vitest';
// Break the pre-existing stationModels <-> sightingModels -> penguins import cycle in test isolation.
import '../src/voyage/sightingModels.ts';
import {
  MARAMBIO_GROUND_Y,
  MARAMBIO_HERCULES,
  MARAMBIO_LAYOUT,
  MARAMBIO_RUNWAY_HALF_LENGTH,
  MARAMBIO_RUNWAY_WIDTH,
  MARAMBIO_RUNWAY_Z,
  MARAMBIO_TAXIWAY,
  MARAMBIO_TAXIWAY_WIDTH,
  marambioCorners,
  marambioLayoutOf,
  marambioPlateauDistance,
  type MarambioLayoutEntry,
} from '@antartida/core';
import { normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS, type Tri, type Vec3 } from '../src/voyage/lowPoly.ts';
import { VOXEL_PALETTE } from '../src/orcadas/stationModels.ts';
import {
  buildHangarTris,
  buildMarambioWalkwaysTris,
  buildTerminalTris,
  buildWalkwayTris,
  CONTROL_TOWER_HEIGHT,
  HANGAR_INTERIOR,
  hangarSideDoorX,
  MARAMBIO_WALKWAYS,
  TOWER_GLASS,
  WALKWAY_DECK_HEIGHT,
} from '../src/marambio/lowPolyMarambio.ts';
import {
  buildMarambioGroundTris,
  buildMarambioRocksTris,
  buildMarambioSurfacesTris,
  MARAMBIO_PALLET_ORANGE,
  marambioGroundHeight,
} from '../src/marambio/marambioGround.ts';
import { inward } from './polyHelpers.ts';

interface BBox {
  readonly min: Vec3;
  readonly max: Vec3;
}

function triBBox(tris: readonly Tri[]): BBox {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const [a, b, c] of tris) {
    for (const p of [a, b, c]) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], p[k]);
        max[k] = Math.max(max[k], p[k]);
      }
    }
  }
  return { min: [min[0], min[1], min[2]], max: [max[0], max[1], max[2]] };
}

const bboxCenter = (b: BBox): Vec3 => [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
const centroid = (t: Tri): Vec3 => [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3, (t[0][2] + t[1][2] + t[2][2]) / 3];
const corners = (t: Tri): Vec3[] => [t[0], t[1], t[2]];

function expectSound(tris: readonly Tri[], maxTris: number) {
  expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
  expect(tris.length).toBeLessThanOrEqual(maxTris);
  expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
  for (const t of tris) {
    expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
    // No face collapsed to a line.
    expect(Math.hypot(...normalOf(t))).toBeGreaterThan(0.5);
  }
}

/** Distance from a world point to the plan of a layout element (0 inside it). */
function planDistance(x: number, z: number, e: Pick<MarambioLayoutEntry, 'position' | 'footprint' | 'rotationY'>): number {
  const c = Math.cos(e.rotationY);
  const s = Math.sin(e.rotationY);
  const lx = (x - e.position[0]) * c - (z - e.position[2]) * s;
  const lz = (x - e.position[0]) * s + (z - e.position[2]) * c;
  return Math.hypot(Math.max(Math.abs(lx) - e.footprint[0] / 2, 0), Math.max(Math.abs(lz) - e.footprint[1] / 2, 0));
}

function pathDistance(x: number, z: number, path: readonly (readonly [number, number])[]): number {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i];
    const [bx, bz] = path[i + 1];
    const l2 = (bx - ax) ** 2 + (bz - az) ** 2;
    const t = Math.min(1, Math.max(0, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / l2));
    best = Math.min(best, Math.hypot(x - ax - (bx - ax) * t, z - az - (bz - az) * t));
  }
  return best;
}

const pathLength = (path: readonly (readonly [number, number])[]) =>
  path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);

/** Points every 0.1 along a polyline, with both ends. */
function samples(path: readonly (readonly [number, number])[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const n = Math.max(1, Math.ceil(Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]) / 0.1));
    for (let j = 0; j <= n; j++) out.push([path[i][0] + ((path[i + 1][0] - path[i][0]) * j) / n, path[i][1] + ((path[i + 1][1] - path[i][1]) * j) / n]);
  }
  return out;
}

const HANGAR = marambioLayoutOf('hangar');
const TERMINAL = marambioLayoutOf('terminal');
const TERMINAL_HEIGHT = 4.5 / 3.5;
const HANGAR_HEIGHT = 10 / 3.5;

describe('Base Marambio hangar', () => {
  const [length, width] = HANGAR.footprint;
  const tris = buildHangarTris(length, width, HANGAR_HEIGHT);
  const box = triBBox(tris);

  it('meets detail, budget, finite vertices and outward winding', () => {
    expectSound(tris, 3000);
    expect(tris.length).toBeGreaterThanOrEqual(800);
    expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(8);
    expect(inward(tris, bboxCenter(box)) / tris.length).toBeLessThan(0.5);
  });

  it('keeps to the size passed in: base on the ground, crown at the height, kerb at the plan', () => {
    expect(box.min[1]).toBeGreaterThanOrEqual(-0.0151);
    expect(box.min[1]).toBeLessThan(0);
    expect(Math.abs(box.max[1] - HANGAR_HEIGHT)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(box.min[0] + length / 2)).toBeLessThanOrEqual(0.06);
    // The ramp in front of the door is the only thing past the +x end.
    expect(box.max[0]).toBeGreaterThan(length / 2 + 0.3);
    expect(box.max[0]).toBeLessThanOrEqual(length / 2 + 0.8);
    expect(box.max[2]).toBeGreaterThanOrEqual(width / 2);
    expect(box.max[2]).toBeLessThanOrEqual(width / 2 + 0.15);
    // Snow banks on the windward (-z) side only.
    expect(box.min[2]).toBeLessThan(-width / 2 - 0.15);
    expect(box.min[2]).toBeGreaterThanOrEqual(-width / 2 - 0.6);
  });

  it('opens at +x: the dark doorway and the white sign are in that gable and face outwards', () => {
    const doorway = tris.filter((t) => t[3] === HANGAR_INTERIOR);
    expect(doorway.length).toBeGreaterThan(0);
    for (const t of doorway) expect(centroid(t)[0]).toBeGreaterThan(length / 2 - 0.1);
    expect(doorway.some((t) => normalOf(t)[0] > 0.99)).toBe(true);

    // White above the walls is the sign (the snow drift is white too, but low on the -z side).
    const sign = tris.filter((t) => t[3] === VOXEL_PALETTE.WHITE && centroid(t)[1] > HANGAR_HEIGHT * 0.6);
    expect(sign.length).toBeGreaterThanOrEqual(8 * 12);
    for (const t of sign) expect(centroid(t)[0]).toBeGreaterThan(length / 2 - 0.1);
    expect(sign.filter((t) => normalOf(t)[0] > 0.99).length).toBeGreaterThanOrEqual(8 * 2);
    // Read from outside, -z is to the right: M (four strokes) starts at +z, I and O end at -z.
    const zs = sign.map((t) => centroid(t)[2]);
    const signHalf = (Math.max(...zs) - Math.min(...zs)) / 2;
    expect(Math.abs(Math.max(...zs) + Math.min(...zs))).toBeLessThan(0.1);
    const firstLetter = sign.filter((t) => centroid(t)[2] > signHalf * 0.74).length;
    const lastLetter = sign.filter((t) => centroid(t)[2] < -signHalf * 0.74).length;
    expect(firstLetter).toBe(4 * 12);
    expect(lastLetter).toBe(4 * 12);
    // Nothing of the sign sticks out of the vault.
    expect(Math.max(...sign.flatMap((t) => corners(t).map((p) => p[0])))).toBeLessThanOrEqual(length / 2);
  });

  it('has its side door on the +z wall, in the middle of a bay', () => {
    const x = hangarSideDoorX(length);
    expect(Math.abs(x)).toBeLessThan(length / 2);
    const door = tris.filter((t) => t[3] === VOXEL_PALETTE.CREAM && centroid(t)[2] > width / 2);
    expect(door.length).toBe(16);
    for (const t of door) expect(Math.abs(centroid(t)[0] - x)).toBeLessThan(0.2);
  });
});

describe('Base Marambio terminal and control tower', () => {
  const [length, width] = TERMINAL.footprint;
  const tris = buildTerminalTris(length, width, TERMINAL_HEIGHT);
  const box = triBBox(tris);

  it('meets detail, budget, finite vertices and outward winding', () => {
    expectSound(tris, 3500);
    expect(tris.length).toBeGreaterThanOrEqual(900);
    expect(inward(tris, bboxCenter(box)) / tris.length).toBeLessThan(0.5);
  });

  it('keeps the module to its plan and sets the tower at the -x end, taller than the module', () => {
    expect(box.min[1]).toBeGreaterThanOrEqual(-0.0151);
    expect(Math.abs(box.max[2]) - width / 2).toBeLessThanOrEqual(0.9);
    expect(Math.abs(box.min[2]) - width / 2).toBeLessThanOrEqual(0.9);
    // Stairs of the module at +x, as in every module.
    expect(box.max[0]).toBeGreaterThan(length / 2);
    expect(box.max[0]).toBeLessThanOrEqual(length / 2 + 0.2);
    // The tower stands out of the -x end by about its balcony.
    expect(box.min[0]).toBeLessThan(-length / 2 - 0.8);
    expect(box.min[0]).toBeGreaterThan(-length / 2 - 1.3);

    expect(CONTROL_TOWER_HEIGHT).toBeGreaterThan(TERMINAL_HEIGHT * 2);
    expect(box.max[1]).toBeGreaterThan(CONTROL_TOWER_HEIGHT);
    expect(box.max[1]).toBeLessThan(CONTROL_TOWER_HEIGHT + 0.6);
    const aboveModule = tris.filter((t) => centroid(t)[1] > TERMINAL_HEIGHT + 0.1);
    expect(aboveModule.length).toBeGreaterThan(200);
    for (const t of aboveModule) expect(centroid(t)[0]).toBeLessThan(-length / 2 + 0.6);
  });

  it('has a glazed cab all round and a white railing', () => {
    const glass = tris.filter((t) => t[3] === TOWER_GLASS);
    expect(glass.length).toBe(20);
    const facing = new Set(glass.map((t) => Math.round((Math.atan2(normalOf(t)[2], normalOf(t)[0]) * 180) / Math.PI / 36)));
    expect(facing.size).toBeGreaterThanOrEqual(10);
    for (const t of glass) expect(centroid(t)[1]).toBeGreaterThan(TERMINAL_HEIGHT);
    const rail = tris.filter((t) => t[3] === VOXEL_PALETTE.WHITE && centroid(t)[1] > CONTROL_TOWER_HEIGHT * 0.7);
    expect(rail.length).toBeGreaterThan(100);
  });
});

describe('Base Marambio walkways', () => {
  it('builds a deck at its height over the ground, with rails on both sides, within budget', () => {
    const y = 2;
    const tris = buildWalkwayTris([[0, 0], [5, 0]], y);
    expectSound(tris, 60 * 5);
    const box = triBBox(tris);
    expect(box.min[1]).toBeGreaterThanOrEqual(y - 0.0151);
    expect(box.min[1]).toBeLessThan(y);
    expect(box.max[1]).toBeGreaterThan(y + WALKWAY_DECK_HEIGHT + 0.25);
    expect(box.max[1]).toBeLessThan(y + WALKWAY_DECK_HEIGHT + 0.4);
    expect(box.min[0]).toBeCloseTo(0, 6);
    expect(box.max[0]).toBeCloseTo(5, 6);
    expect(box.max[2]).toBeCloseTo(0.225, 6);
    expect(box.min[2]).toBeCloseTo(-0.225, 6);
    // The widest faces that look up are the deck, at its height.
    const deck = tris.filter((t) => normalOf(t)[1] > 0.99 && Math.max(...corners(t).map((p) => p[2])) - Math.min(...corners(t).map((p) => p[2])) > 0.4);
    expect(deck.length).toBe(2);
    for (const t of deck) for (const p of corners(t)) expect(p[1]).toBeCloseTo(y + WALKWAY_DECK_HEIGHT, 9);
    // A rail on each side.
    const high = tris.filter((t) => centroid(t)[1] > y + WALKWAY_DECK_HEIGHT + 0.2);
    expect(high.some((t) => centroid(t)[2] > 0.15)).toBe(true);
    expect(high.some((t) => centroid(t)[2] < -0.15)).toBe(true);
  });

  it('closes the corners of a bent walkway and opens the rail where another joins', () => {
    const bent = buildWalkwayTris([[0, 0], [4, 0], [4, 3]], 0);
    expectSound(bent, 60 * 7);
    const box = triBBox(bent);
    expect(box.max[0]).toBeCloseTo(4.225, 6);
    expect(box.min[2]).toBeCloseTo(-0.225, 6);

    const railAt = (tris: readonly Tri[], x: number, z: number) =>
      tris.some((t) => centroid(t)[1] > WALKWAY_DECK_HEIGHT + 0.1 && Math.abs(centroid(t)[2] - z) < 0.03 && Math.min(...corners(t).map((p) => p[0])) <= x && Math.max(...corners(t).map((p) => p[0])) >= x);
    const closed = buildWalkwayTris([[0, 0], [6, 0]], 0);
    const open = buildWalkwayTris([[0, 0], [6, 0]], 0, [[3, 0.225]]);
    expect(railAt(closed, 3, 0.205)).toBe(true);
    expect(railAt(open, 3, 0.205)).toBe(false);
    expect(railAt(open, 3, -0.205)).toBe(true);
    expect(railAt(open, 1, 0.205)).toBe(true);
    expect(railAt(open, 5, 0.205)).toBe(true);
  });

  it('draws one main line from the hangar and a spur to each building of the row', () => {
    expect(MARAMBIO_WALKWAYS).toHaveLength(4);
    const [main, ...spurs] = MARAMBIO_WALKWAYS;
    expect(main).toHaveLength(4);
    // It starts just outside the wall of the hangar and ends just outside the Comedor.
    expect(planDistance(main[0][0], main[0][1], HANGAR)).toBeGreaterThan(0.05);
    expect(planDistance(main[0][0], main[0][1], HANGAR)).toBeLessThan(0.2);
    const comedor = planDistance(main[3][0], main[3][1], marambioLayoutOf('comedor'));
    // The steps and handrail posts of a door reach 0.17 out of the wall: the deck stops just short of them.
    expect(comedor).toBeGreaterThan(0.17);
    expect(comedor).toBeLessThan(0.3);
    ['sanidad', 'jefatura', 'palermo'].forEach((id, i) => {
      const spur = spurs[i];
      // Each spur leaves the edge of the main deck and stops at the steps of the door.
      expect(pathDistance(spur[0][0], spur[0][1], main)).toBeCloseTo(0.225, 6);
      const gap = planDistance(spur[1][0], spur[1][1], marambioLayoutOf(id));
      expect(gap).toBeGreaterThan(0.17);
      expect(gap).toBeLessThan(0.3);
    });
  });

  it('ends the main line and every spur in front of a door: on the axis of the +x end of its building', () => {
    const [main, ...spurs] = MARAMBIO_WALKWAYS;
    const tips = [...spurs.map((spur) => spur[1]), main[3]];
    ['sanidad', 'jefatura', 'palermo', 'comedor'].forEach((id, i) => {
      const { position, rotationY, footprint } = marambioLayoutOf(id);
      const dx = tips[i][0] - position[0];
      const dz = tips[i][1] - position[2];
      // Local coordinates of the tip in the building: the door is at +x, in the middle of the end wall.
      const lx = dx * Math.cos(rotationY) - dz * Math.sin(rotationY);
      const lz = dx * Math.sin(rotationY) + dz * Math.cos(rotationY);
      expect(lx - footprint[0] / 2, id).toBeGreaterThan(0.17);
      expect(lx - footprint[0] / 2, id).toBeLessThan(0.3);
      expect(lz, id).toBeCloseTo(0, 6);
    });
  });

  it('never crosses a building, the apron, the taxiway, the runway or the parked aircraft, and stays on the flat top', () => {
    const plans = MARAMBIO_LAYOUT;
    for (const line of MARAMBIO_WALKWAYS) {
      for (const [x, z] of samples(line)) {
        for (const e of plans) expect(planDistance(x, z, e), `${e.id} at ${x}, ${z}`).toBeGreaterThan(0.04);
        expect(pathDistance(x, z, MARAMBIO_TAXIWAY)).toBeGreaterThan(MARAMBIO_TAXIWAY_WIDTH / 2 + 0.225);
        expect(planDistance(x, z, { position: MARAMBIO_HERCULES.position, rotationY: MARAMBIO_HERCULES.rotationY, footprint: [8.5, 11.5] })).toBeGreaterThan(0.225);
        expect(marambioGroundHeight(x, z)).toBe(MARAMBIO_GROUND_Y);
      }
    }
    // Past the row, the main line keeps 0.7 from the end of every building.
    const [main] = MARAMBIO_WALKWAYS;
    for (const [x, z] of samples([main[1], main[2]])) {
      for (const id of ['sanidad', 'jefatura', 'palermo', 'comedor']) {
        expect(planDistance(x, z, marambioLayoutOf(id))).toBeGreaterThanOrEqual(0.7 - 1e-9);
      }
    }
    // The hangar is left through its long wall, not through the door end.
    expect(planDistance(main[1][0], main[1][1], HANGAR)).toBeGreaterThan(3);
  });

  it('keeps the whole set within the budget per unit of length, at the height of the plateau', () => {
    const tris = buildMarambioWalkwaysTris();
    const length = MARAMBIO_WALKWAYS.reduce((sum, line) => sum + pathLength(line), 0);
    expectSound(tris, 60 * length);
    expect(buildWalkwayTris(MARAMBIO_WALKWAYS[0], MARAMBIO_GROUND_Y).length).toBeLessThanOrEqual(60 * pathLength(MARAMBIO_WALKWAYS[0]));
    const box = triBBox(tris);
    expect(box.min[1]).toBeGreaterThanOrEqual(MARAMBIO_GROUND_Y - 0.0151);
    expect(box.max[1]).toBeLessThan(MARAMBIO_GROUND_Y + WALKWAY_DECK_HEIGHT + 0.4);
    // The rail of the main line is open at each spur: fewer faces than with no openings.
    const closed = MARAMBIO_WALKWAYS.flatMap((line) => buildWalkwayTris(line, MARAMBIO_GROUND_Y));
    expect(box.min[0]).toBeCloseTo(triBBox(closed).min[0], 6);
    const deckTop = MARAMBIO_GROUND_Y + WALKWAY_DECK_HEIGHT;
    const up = tris.filter((t) => normalOf(t)[1] > 0.99 && Math.abs(centroid(t)[1] - deckTop) < 1e-6);
    expect(up.length).toBeGreaterThanOrEqual(2 * 6);
  });
});

describe('Base Marambio ground', () => {
  const ground = buildMarambioGroundTris();

  it('is exactly flat under everything built and along the runway', () => {
    for (const e of MARAMBIO_LAYOUT) {
      for (const [x, z] of marambioCorners(e.id)) expect(marambioGroundHeight(x, z), e.id).toBe(MARAMBIO_GROUND_Y);
      expect(marambioGroundHeight(e.position[0], e.position[2]), e.id).toBe(MARAMBIO_GROUND_Y);
    }
    for (let x = -MARAMBIO_RUNWAY_HALF_LENGTH; x <= MARAMBIO_RUNWAY_HALF_LENGTH; x += 0.5) {
      for (const dz of [-0.5, -0.25, 0, 0.25, 0.5]) {
        expect(marambioGroundHeight(x, MARAMBIO_RUNWAY_Z + dz * MARAMBIO_RUNWAY_WIDTH)).toBe(MARAMBIO_GROUND_Y);
      }
    }
    for (const [x, z] of MARAMBIO_TAXIWAY) expect(marambioGroundHeight(x, z)).toBe(MARAMBIO_GROUND_Y);
    expect(marambioGroundHeight(MARAMBIO_HERCULES.position[0], MARAMBIO_HERCULES.position[2])).toBe(MARAMBIO_GROUND_Y);
  });

  it('never rises over the plateau, sags towards the rim and falls under the sea beyond it', () => {
    let below = 0;
    for (let x = -70; x <= 70; x += 1.7) {
      for (let z = -45; z <= 58; z += 1.7) {
        const h = marambioGroundHeight(x, z);
        const d = marambioPlateauDistance(x, z);
        expect(Number.isFinite(h)).toBe(true);
        expect(h).toBeLessThanOrEqual(MARAMBIO_GROUND_Y);
        expect(h).toBeGreaterThanOrEqual(-1.5);
        if (d >= 0) expect(h).toBeGreaterThan(MARAMBIO_GROUND_Y - 0.5);
        if (d < -9) expect(h).toBeLessThan(-1);
        if (h < 0) below++;
      }
    }
    expect(below).toBeGreaterThan(100);
    // The scarp is steep: the ground is already well down a third of the way out.
    expect(marambioGroundHeight(56, 5)).toBeLessThan(MARAMBIO_GROUND_Y - 1.5);
    expect(marambioGroundHeight(0, 60)).toBeLessThan(0);
    expect(marambioGroundHeight(0, -45)).toBeLessThan(0);
    expect(marambioGroundHeight(-70, 0)).toBeLessThan(0);
  });

  it('meets detail and budget, every face looks up and its corners lie on the height function', () => {
    expectSound(ground, 9000);
    expect(ground.length).toBeGreaterThanOrEqual(4000);
    expect(new Set(ground.map((t) => t[3])).size).toBeGreaterThanOrEqual(8);
    for (const t of ground) {
      expect(normalOf(t)[1]).toBeGreaterThan(0);
      for (const [x, y, z] of corners(t)) {
        const h = marambioGroundHeight(x, z);
        // Snow streaks lie a hair over the flat top; everything else is the ground itself.
        expect(y - h).toBeGreaterThanOrEqual(-1e-9);
        expect(y - h).toBeLessThanOrEqual(0.0061);
      }
    }
  });

  it('reaches the sea all round: its outer edge is under water', () => {
    const box = triBBox(ground);
    expect(box.max[1]).toBeLessThanOrEqual(MARAMBIO_GROUND_Y + 0.0061);
    expect(box.min[1]).toBeLessThan(-1);
    // Every face that touches the edge of the mesh, or the cut where the sea floor starts, is under the sea.
    for (const t of ground) {
      for (const [x, y, z] of corners(t)) {
        if (x === box.min[0] || x === box.max[0] || z === box.min[2] || z === box.max[2]) expect(y).toBeLessThan(0);
      }
    }
    // No hole inside: the area of the faces over the sea matches the area of ground over the sea.
    let meshArea = 0;
    for (const t of ground) {
      if (t[3] === VOXEL_PALETTE.WHITE || t[3] === VOXEL_PALETTE.ICE) {
        // Streaks are drawn over the ground, not part of it.
        if (corners(t).every((p) => p[1] === MARAMBIO_GROUND_Y + 0.006)) continue;
      }
      const [a, b, c] = corners(t);
      if (Math.min(a[1], b[1], c[1]) < 0) continue;
      meshArea += Math.abs((b[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (b[2] - a[2])) / 2;
    }
    let fieldArea = 0;
    const step = 0.25;
    for (let x = -66; x <= 66; x += step) for (let z = -44; z <= 58; z += step) if (marambioGroundHeight(x, z) >= 0) fieldArea += step * step;
    expect(meshArea / fieldArea).toBeGreaterThan(0.93);
    expect(meshArea / fieldArea).toBeLessThan(1.02);
  });

  it('has snow streaks on the bare top only, clear of the runway and the apron', () => {
    const streaks = ground.filter((t) => corners(t).every((p) => p[1] === MARAMBIO_GROUND_Y + 0.006));
    expect(streaks.length).toBeGreaterThanOrEqual(200);
    const runway = marambioLayoutOf('runway');
    const apron = marambioLayoutOf('apron');
    for (const t of streaks) {
      const [x, , z] = centroid(t);
      expect(marambioPlateauDistance(x, z)).toBeGreaterThan(2);
      expect(planDistance(x, z, runway)).toBeGreaterThan(0);
      expect(planDistance(x, z, apron)).toBeGreaterThan(0);
    }
  });

  it('lays no snow streak over another: they share one height and would flicker', () => {
    const streaks = ground.filter((t) => corners(t).every((p) => p[1] === MARAMBIO_GROUND_Y + 0.006));
    // Each streak is a hexagon of four faces; its two tips are its farthest corners.
    expect(streaks.length % 4).toBe(0);
    const spans: { x: number; z: number; len: number }[] = [];
    for (let i = 0; i < streaks.length; i += 4) {
      const pts = streaks.slice(i, i + 4).flatMap(corners);
      let best = { x: 0, z: 0, len: 0 };
      for (const a of pts) {
        for (const b of pts) {
          const len = Math.hypot(a[0] - b[0], a[2] - b[2]);
          if (len > best.len) best = { x: (a[0] + b[0]) / 2, z: (a[2] + b[2]) / 2, len };
        }
      }
      spans.push(best);
    }
    expect(spans.length).toBeGreaterThanOrEqual(50);
    // Circles round each streak do not meet, so neither do the streaks.
    for (let i = 0; i < spans.length; i++) {
      for (let j = i + 1; j < spans.length; j++) {
        const apart = Math.hypot(spans[i].x - spans[j].x, spans[i].z - spans[j].z);
        expect(apart, `${i} / ${j}`).toBeGreaterThanOrEqual((spans[i].len + spans[j].len) / 2 - 1e-9);
      }
    }
  });
});

describe('Base Marambio surfaces', () => {
  const tris = buildMarambioSurfacesTris();

  it('meets detail and budget, on the plateau and a hair over it', () => {
    expectSound(tris, 2500);
    expect(tris.length).toBeGreaterThanOrEqual(600);
    for (const t of tris) {
      for (const [x, y, z] of corners(t)) {
        expect(marambioPlateauDistance(x, z)).toBeGreaterThan(0);
        expect(marambioGroundHeight(x, z)).toBe(MARAMBIO_GROUND_Y);
        expect(y).toBeGreaterThanOrEqual(MARAMBIO_GROUND_Y);
        expect(y).toBeLessThanOrEqual(MARAMBIO_GROUND_Y + 0.4);
      }
      // Nothing looks down: these are laid on the ground.
      expect(normalOf(t)[1]).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it('lays flat layers at different heights between 0.012 and 0.03 over the ground', () => {
    const flat = tris.filter((t) => normalOf(t)[1] > 0.99 && corners(t).every((p) => p[1] - MARAMBIO_GROUND_Y < 0.031));
    const lifts = new Set(flat.map((t) => Math.round((t[0][1] - MARAMBIO_GROUND_Y) * 1000)));
    expect(lifts.size).toBeGreaterThanOrEqual(4);
    for (const lift of lifts) {
      expect(lift).toBeGreaterThanOrEqual(12);
      expect(lift).toBeLessThanOrEqual(30);
    }
    // Layers that overlap in plan are at least 0.004 apart.
    const sorted = [...lifts].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(4);
  });

  it('marks the ends of the runway with orange pallets and draws nothing of it beyond', () => {
    const pallets = tris.filter((t) => t[3] === MARAMBIO_PALLET_ORANGE);
    expect(pallets.length).toBeGreaterThanOrEqual(2 * 4 * 12);
    for (const end of [-1, 1]) {
      const here = pallets.filter((t) => Math.sign(centroid(t)[0]) === end);
      expect(here.length).toBe(pallets.length / 2);
      for (const t of here) {
        expect(Math.abs(centroid(t)[0])).toBeGreaterThan(MARAMBIO_RUNWAY_HALF_LENGTH - 2);
        expect(Math.abs(centroid(t)[2] - MARAMBIO_RUNWAY_Z)).toBeLessThan(MARAMBIO_RUNWAY_WIDTH / 2);
      }
    }
    for (const t of tris) for (const p of corners(t)) expect(Math.abs(p[0])).toBeLessThanOrEqual(MARAMBIO_RUNWAY_HALF_LENGTH + 1);
  });

  it('covers the runway, the taxiway and the apron with no hole, and paints no centreline', () => {
    const runway = marambioLayoutOf('runway');
    const apron = marambioLayoutOf('apron');
    const flat = tris.filter((t) => normalOf(t)[1] > 0.99);
    const covered = (x: number, z: number) =>
      flat.some(([a, b, c]) => {
        const s1 = (b[0] - a[0]) * (z - a[2]) - (b[2] - a[2]) * (x - a[0]);
        const s2 = (c[0] - b[0]) * (z - b[2]) - (c[2] - b[2]) * (x - b[0]);
        const s3 = (a[0] - c[0]) * (z - c[2]) - (a[2] - c[2]) * (x - c[0]);
        return (s1 <= 1e-9 && s2 <= 1e-9 && s3 <= 1e-9) || (s1 >= -1e-9 && s2 >= -1e-9 && s3 >= -1e-9);
      });
    for (let x = -60; x <= 60; x += 0.7) {
      for (let z = -22; z <= 26; z += 0.7) {
        const onSurface =
          planDistance(x, z, runway) === 0 || planDistance(x, z, apron) === 0 || pathDistance(x, z, MARAMBIO_TAXIWAY) < MARAMBIO_TAXIWAY_WIDTH / 2 - 0.05;
        if (onSurface) expect(covered(x, z), `${x}, ${z}`).toBe(true);
      }
    }
    // Along the middle of the runway there is only gravel: no strip of another colour on the axis.
    const onAxis = flat.filter((t) => {
      const zs = corners(t).map((p) => p[2]);
      return Math.min(...zs) < MARAMBIO_RUNWAY_Z && Math.max(...zs) > MARAMBIO_RUNWAY_Z && Math.abs(centroid(t)[0]) < MARAMBIO_RUNWAY_HALF_LENGTH - 2 && centroid(t)[0] > -15;
    });
    expect(onAxis.length).toBeGreaterThan(0);
    expect(new Set(onAxis.map((t) => t[3])).size).toBeLessThanOrEqual(2);
    for (const t of onAxis) expect(Math.max(...corners(t).map((p) => p[2])) - Math.min(...corners(t).map((p) => p[2]))).toBeGreaterThan(3);
  });
});

describe('Base Marambio rocks and drifts', () => {
  const tris = buildMarambioRocksTris();

  it('meets detail and budget and rests on the ground', () => {
    expectSound(tris, 1500);
    expect(tris.length).toBeGreaterThanOrEqual(600);
    for (const t of tris) {
      const [x, y, z] = centroid(t);
      expect(marambioPlateauDistance(x, z)).toBeGreaterThan(0);
      const h = marambioGroundHeight(x, z);
      // Sunk a little, never floating: no face is far over or under the ground it lies on.
      expect(y - h).toBeGreaterThan(-0.25);
      expect(y - h).toBeLessThan(0.45);
    }
  });

  it('keeps clear of everything built, graded or parked', () => {
    const hercules = { position: MARAMBIO_HERCULES.position, rotationY: MARAMBIO_HERCULES.rotationY, footprint: [8.5, 11.5] as const };
    for (const t of tris) {
      for (const [x, , z] of corners(t)) {
        for (const e of MARAMBIO_LAYOUT) expect(planDistance(x, z, e), e.id).toBeGreaterThanOrEqual(0.6);
        expect(planDistance(x, z, hercules)).toBeGreaterThanOrEqual(0.6);
        expect(pathDistance(x, z, MARAMBIO_TAXIWAY)).toBeGreaterThanOrEqual(MARAMBIO_TAXIWAY_WIDTH / 2 + 0.6);
        for (const line of MARAMBIO_WALKWAYS) expect(pathDistance(x, z, line)).toBeGreaterThanOrEqual(0.225 + 0.6);
      }
    }
  });
});

describe('Base Marambio models are deterministic', () => {
  it('gives the same faces on every call', () => {
    const [hl, hw] = HANGAR.footprint;
    const [tl, tw] = TERMINAL.footprint;
    expect(buildHangarTris(hl, hw, HANGAR_HEIGHT)).toEqual(buildHangarTris(hl, hw, HANGAR_HEIGHT));
    expect(buildTerminalTris(tl, tw, TERMINAL_HEIGHT)).toEqual(buildTerminalTris(tl, tw, TERMINAL_HEIGHT));
    expect(buildMarambioWalkwaysTris()).toEqual(buildMarambioWalkwaysTris());
    expect(buildMarambioGroundTris()).toEqual(buildMarambioGroundTris());
    expect(buildMarambioSurfacesTris()).toEqual(buildMarambioSurfacesTris());
    expect(buildMarambioRocksTris()).toEqual(buildMarambioRocksTris());
    expect(marambioGroundHeight(51.3, 12.7)).toBe(marambioGroundHeight(51.3, 12.7));
  });
});
