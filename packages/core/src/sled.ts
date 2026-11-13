/** Pure rules of how the sled team rides over the relief (3D map). Lengths in map units; `size` is the team length. */

/** Gap between the runners and the snow, as a fraction of the team length. */
export const SLED_MARGIN = 0.03;
/** Steepest tilt of the team, in radians (about 17 degrees): the relief is exaggerated and would tip it over. */
export const SLED_MAX_PITCH = 0.3;
/** Trot: strides per second at 1 map unit per second, the floor and the ceiling of the rhythm. */
const TROT_PER_PACE = 1.2;
const TROT_MIN_RATE = 3;
const TROT_MAX_RATE = 9;
/** Vertical bounce of the trot, as a fraction of the team length. */
const TROT_BOB = 0.012;
/** Pace (map units per second) under which the team is taken as standing. */
const STANDING_PACE = 0.01;

/** World height of the team over the ground: on the ice and snow with a small gap, on the frozen sea (level 0) at 0. */
export function sledRideHeight(ground: number, size: number): number {
  return ground > 0 ? ground + size * SLED_MARGIN : 0;
}

/** Nose up (positive) or down from the ground heights behind and ahead, `run` apart; limited to SLED_MAX_PITCH. */
export function sledPitch(behind: number, ahead: number, run: number): number {
  if (!(run > 0)) return 0;
  const pitch = Math.atan2(ahead - behind, run);
  return Math.min(SLED_MAX_PITCH, Math.max(-SLED_MAX_PITCH, pitch));
}

/** Strides per second at this pace; 0 when standing. Quicker pace, quicker trot, within a range. */
export function trotRate(pace: number): number {
  if (!(pace > STANDING_PACE)) return 0;
  return Math.min(TROT_MAX_RATE, Math.max(TROT_MIN_RATE, pace * TROT_PER_PACE));
}

/** Vertical bounce at the stride `phase` (radians); 0 when standing or with reduced motion. */
export function sledTrot(phase: number, size: number, pace: number, reduced: boolean): number {
  if (reduced || trotRate(pace) === 0) return 0;
  return Math.abs(Math.sin(phase)) * size * TROT_BOB;
}

/** Moves `current` towards `target` without jumps: frame-rate independent smoothing. */
export function easeToward(current: number, target: number, dt: number, rate: number): number {
  return target + (current - target) * Math.exp(-Math.max(0, dt) * rate);
}
