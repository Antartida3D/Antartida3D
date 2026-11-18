import { describe, expect, it } from 'vitest';
import { SIGHTINGS, TRANSPORTS } from '@antartida/core';
import { POLY_MIN_COLORS, POLY_MIN_TRIS } from '../src/voyage/lowPoly.ts';
import { PONCHO_MODELS } from '../src/voyage/ponchoModels.ts';
import { SCENE_MODELS, SIGHTING_POLY_MODELS } from '../src/voyage/sightingModels.ts';
import { VEHICLE_MODELS, VEHICLE_POLY_MODELS, VOXEL_MIN_BOXES, VOXEL_MIN_COLORS } from '../src/voyage/vehicles.ts';

const models = { ...VEHICLE_MODELS, ...SCENE_MODELS };

describe('voxel models (docs/diseno/estilo-voxel.md)', () => {
  it('registers the vehicles, the animals, the ice and the town', () => {
    expect(Object.keys(models).length + Object.keys(SIGHTING_POLY_MODELS).length).toBeGreaterThan(25);
  });

  it('has a model, of blocks or low-poly, for every vehicle of the voyage', () => {
    const registered = [...Object.keys(VEHICLE_MODELS), ...Object.keys(VEHICLE_POLY_MODELS)].sort();
    // The vehicles of every transport, plus the models Poncho's trip names for its own (his dog, the ship).
    const ids = new Set([...TRANSPORTS.map((v) => v.id), ...Object.keys(PONCHO_MODELS)]);
    expect(registered).toEqual([...ids].sort());
  });

  it('draws every sighting of Desde Ushuaia as a low-poly model', () => {
    expect(SIGHTINGS.map((s) => s.id).sort()).toEqual(Object.keys(SIGHTING_POLY_MODELS).sort());
  });

  for (const [name, tris] of Object.entries({ ...VEHICLE_POLY_MODELS, ...SIGHTING_POLY_MODELS })) {
    it(`${name} (low-poly) has the least detail`, () => {
      expect(tris.length, 'faces').toBeGreaterThanOrEqual(POLY_MIN_TRIS);
      expect(new Set(tris.map((t) => t[3])).size, 'colors').toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    });
  }

  for (const [name, boxes] of Object.entries(models)) {
    it(`${name} has the least detail`, () => {
      expect(boxes.length, 'boxes').toBeGreaterThanOrEqual(VOXEL_MIN_BOXES);
      expect(new Set(boxes.map((b) => b[6])).size, 'colors').toBeGreaterThanOrEqual(VOXEL_MIN_COLORS);
    });

    it(`${name} is made of boxes with a size and a solid color`, () => {
      for (const [, , , sx, sy, sz, color] of boxes) {
        expect(Math.min(sx, sy, sz)).toBeGreaterThan(0);
        expect(Number.isInteger(color) && color >= 0 && color <= 0xffffff).toBe(true);
      }
    });
  }
});
