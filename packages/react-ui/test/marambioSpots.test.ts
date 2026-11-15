import { describe, expect, it } from 'vitest';
import { MARAMBIO_SPOTS, marambioPlateauDistance, type MarambioSpotId } from '@antartida/core';
import { poseForSpot, SPOT_VIEWS, VIEW_BOUNDARY, VIEW_ELEVATION_DEG, VIEW_MAX_DISTANCE, VIEW_MIN_DISTANCE } from '../src/marambio/spots.ts';

const spots: (MarambioSpotId | null)[] = [null, ...MARAMBIO_SPOTS.map((s) => s.id)];
/** Layouts the screen can have: [portrait, sheetTall, sidePanel]. The sheet is tall only without the side card. */
const layouts: [boolean, boolean, boolean][] = [
  [false, false, true],
  [false, false, false],
  [false, true, false],
  [true, false, false],
  [true, true, false],
];
const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('Marambio camera poses', () => {
  it('has a view for every point of interest, with its dot on the plateau', () => {
    for (const spot of MARAMBIO_SPOTS) {
      const view = SPOT_VIEWS[spot.id];
      expect(view, spot.id).toBeDefined();
      expect(marambioPlateauDistance(view.worldPos[0], view.worldPos[2]), spot.id).toBeGreaterThan(0);
      for (const pct of view.fallbackPct) {
        expect(pct, spot.id).toBeGreaterThan(0);
        expect(pct, spot.id).toBeLessThan(100);
      }
    }
  });

  it('keeps every pose inside what the controls allow', () => {
    for (const spot of spots) {
      for (const [portrait, tall, side] of layouts) {
        const { pos, target } = poseForSpot(spot, portrait, tall, side);
        const name = `${spot} ${portrait} ${tall} ${side}`;
        for (let k = 0; k < 3; k++) {
          expect(target[k], name).toBeGreaterThanOrEqual(VIEW_BOUNDARY.min[k]);
          expect(target[k], name).toBeLessThanOrEqual(VIEW_BOUNDARY.max[k]);
        }
        const d = distance(pos, target);
        expect(d, name).toBeGreaterThanOrEqual(VIEW_MIN_DISTANCE);
        expect(d, name).toBeLessThanOrEqual(VIEW_MAX_DISTANCE);
        const elevation = (Math.asin((pos[1] - target[1]) / d) * 180) / Math.PI;
        expect(elevation, name).toBeGreaterThanOrEqual(VIEW_ELEVATION_DEG[0]);
        expect(elevation, name).toBeLessThanOrEqual(VIEW_ELEVATION_DEG[1]);
      }
    }
  });

  it('looks lower when the panel is a sheet at the bottom, and lower still when it is tall', () => {
    for (const spot of spots) {
      const card = poseForSpot(spot, false, false, true);
      const sheet = poseForSpot(spot, false, false, false);
      const tall = poseForSpot(spot, false, true, false);
      expect(sheet.target[1]).toBeLessThan(card.target[1]);
      expect(tall.target[1]).toBeLessThan(sheet.target[1]);
    }
  });

  it('pulls back on a portrait screen', () => {
    for (const spot of spots) {
      const wide = poseForSpot(spot, false, false, false);
      const narrow = poseForSpot(spot, true, false, false);
      expect(distance(narrow.pos, narrow.target)).toBeGreaterThan(distance(wide.pos, wide.target));
    }
  });

  it('moves the view to the right of the camera when the card covers that side', () => {
    for (const spot of spots) {
      const card = poseForSpot(spot, false, false, true);
      const plain = poseForSpot(spot, false, false, false);
      const forward = [card.target[0] - card.pos[0], card.target[2] - card.pos[2]];
      const moved = [card.target[0] - plain.target[0], card.target[2] - plain.target[2]];
      // Right of the camera: forward turned a quarter clockwise seen from above.
      expect(-forward[1] * moved[0] + forward[0] * moved[1]).toBeGreaterThan(0);
    }
  });
});
