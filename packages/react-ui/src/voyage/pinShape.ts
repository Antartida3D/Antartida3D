/**
 * Shape of the pin of a milestone, one unit tall with its point at y = 0 and y up: a round head over a
 * point. Shared by the pin of the map (pins.ts) and its icon in the lists (PinIcon.tsx). No three.js
 * here: the panels of the trip load without it.
 */
/** Height of the center of the round head. */
export const PIN_HEAD_Y = 0.68;
export const PIN_HEAD_R = 0.32;
/** Width of the ink line around the pin, like the line around the markers of the map. */
export const PIN_LINE = 0.055;
/** Radius of the light dot in the head. */
export const PIN_DOT_R = PIN_HEAD_R * 0.4;

/** Where a straight side that starts at the point (0, tipY) meets a round head of `radius`, on the right. */
export function pinTangent(radius: number, tipY: number): { side: number; x: number; y: number } {
  // Angle where the straight sides meet the round head.
  const side = Math.asin(radius / (PIN_HEAD_Y - tipY));
  return { side, x: radius * Math.cos(side), y: PIN_HEAD_Y - radius * Math.sin(side) };
}

/** Outline of a pin as an SVG path, with y down: the point at (0, -tipY) and the head above it. */
export function pinPath(radius: number, tipY: number): string {
  const { x, y } = pinTangent(radius, tipY);
  const n = (v: number) => +v.toFixed(4);
  return `M0 ${n(-tipY)}L${n(x)} ${n(-y)}A${radius} ${radius} 0 1 0 ${n(-x)} ${n(-y)}Z`;
}
