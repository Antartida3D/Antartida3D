import type { Vec3 } from '../voyage/lowPoly.ts';

/** How the camera looks at a spot of a scene point, and where its dot stands. */
export interface SpotView {
  worldPos: Vec3;
  target: Vec3;
  distance: number;
  /** Bearing round y in degrees: 0 looks from +z (the sea, in every scene so far). */
  bearingDeg: number;
  elevationDeg: number;
}

/** Camera position for a view: `distance` from the target, at that bearing and elevation. */
export function poseOf(view: SpotView): { pos: Vec3; target: Vec3 } {
  const b = (view.bearingDeg * Math.PI) / 180;
  const e = (view.elevationDeg * Math.PI) / 180;
  const [tx, ty, tz] = view.target;
  return {
    pos: [tx + Math.sin(b) * Math.cos(e) * view.distance, ty + Math.sin(e) * view.distance, tz + Math.cos(b) * Math.cos(e) * view.distance],
    target: view.target,
  };
}

/** An iceberg of a scene: [x, z, size, turn, tabular, held in the ice]. One held in the ice has no waterline. */
export type SceneIceberg = readonly [number, number, number, number, boolean, boolean];
/** A floe of pack ice: [x, z, size, turn, variant of SEA_ICE_FLOE_POLY_VARIANTS]. */
export type SceneFloe = readonly [number, number, number, number, number];
