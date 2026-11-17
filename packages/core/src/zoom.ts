export interface ZoomAvailability {
  canZoomIn: boolean;
  canZoomOut: boolean;
}

/** Ignore tiny numerical differences at the camera's effective limits. */
const LIMIT_EPSILON = 0.01;

/** Use the requested distance, so visual damping cannot delay a control's availability. */
export function cameraZoomAvailability(targetDistance: number, minDistance: number, maxDistance: number): ZoomAvailability {
  return {
    canZoomIn: targetDistance > minDistance + LIMIT_EPSILON,
    canZoomOut: targetDistance < maxDistance - LIMIT_EPSILON,
  };
}
