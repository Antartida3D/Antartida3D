export type MapViewMode = '2d' | '3d';

/**
 * The 2D map is turned off until it is polished (#227): nobody chooses it, and it only shows when
 * the 3D map cannot run (no WebGL, or the 3D map failed to load). Set to true to bring back the
 * view toggle, the «Ver mapa 2D» button and the 2D start for reduced motion or Save-Data.
 */
export const MAP_2D_ENABLED = false;

/** View the map starts in. With the 2D map off, WebGL alone decides it. */
export function initialViewMode(
  { webgl, saved, reduced, saveData }: { webgl: boolean; saved: MapViewMode | null; reduced: boolean; saveData: boolean },
  enabled2D: boolean = MAP_2D_ENABLED
): MapViewMode {
  if (!webgl) return '2d';
  if (!enabled2D) return '3d';
  if (saved) return saved;
  return reduced || saveData ? '2d' : '3d';
}
