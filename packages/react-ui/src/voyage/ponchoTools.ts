import { HAMMER_STAKE_AT } from './ponchoProps.ts';
import { ponchoHandAt, ponchoPose, type PersonAction, type PersonPose } from './ponchoPeople.ts';
import type { SceneAction } from '@antartida/core';
import type { Vec3 } from './lowPoly.ts';

/**
 * Tool a person holds in the pose of a work (ponchoPeople.ts has the arms, not the tool): a straight
 * shaft from `a` to `b` in the frame of the person (feet on y = 0, facing +x), and a head at `b`.
 * Illustration: a pole to probe, the pick that strikes the stake, the shovel. The mittens come
 * from `ponchoHandAt`, so the shaft follows the hands frame by frame.
 */
export interface HeldTool {
  readonly a: Vec3;
  readonly b: Vec3;
  /** Size [along the shaft, up, across] of the head at `b`. */
  readonly head: Vec3;
}

/** Thickness of a shaft, in model units. */
export const TOOL_THICKNESS = 0.035;
/** How far above the hands the pole sticks out, as a fraction of its length from the hands to the snow. */
const POLE_OVER_HANDS = 0.35;
/** Where the point of the pole and of the shovel go into the snow, ahead of the hands (model units). */
const POLE_REACH = 0.13;
const SHOVEL_REACH = 0.38;
/** Length of the handle of the pick beyond the hand, and the stake's top height (stakeAndPick is 0.39 high). */
const PICK_REACH = 0.34;
const STAKE_TOP = 0.39;

const sub = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const add = (p: Vec3, q: Vec3, k: number): Vec3 => [p[0] + q[0] * k, p[1] + q[1] * k, p[2] + q[2] * k];

/** The tool of `action` in `pose`, or null for the ones with no tool (stand, walk, haul, cheer). */
export function heldTool(action: SceneAction, pose: PersonPose): HeldTool | null {
  const l = ponchoHandAt(pose, 'L');
  const r = ponchoHandAt(pose, 'R');
  const mid: Vec3 = [(l[0] + r[0]) / 2, (l[1] + r[1]) / 2, (l[2] + r[2]) / 2];
  if (action === 'probe' || action === 'shovel') {
    const reach = action === 'probe' ? POLE_REACH : SHOVEL_REACH;
    const tip: Vec3 = [mid[0] + reach, 0.02, mid[2]];
    const down = sub(tip, mid);
    return { a: add(mid, down, -POLE_OVER_HANDS), b: tip, head: action === 'probe' ? [0.05, 0.05, 0.05] : [0.17, 0.03, 0.13] };
  }
  if (action === 'hammer') {
    const stake: Vec3 = [HAMMER_STAKE_AT[0], STAKE_TOP, HAMMER_STAKE_AT[1]];
    const d = sub(stake, r);
    const n = Math.hypot(...d) || 1;
    const dir: Vec3 = [d[0] / n, d[1] / n, d[2] / n];
    return { a: add(r, dir, -0.1), b: add(r, dir, PICK_REACH), head: [0.1, 0.06, 0.05] };
  }
  return null;
}

/** Cheer: both arms thrown up and swinging, the knees a little bent; the scene adds the hop (`sceneHop`). */
export function cheerPose(phase: number): PersonPose {
  const wave = Math.sin(phase);
  return { legL: 0.12 * wave, legR: -0.12 * wave, armL: 2.7 + 0.35 * wave, armR: 2.7 - 0.35 * wave, torsoPitch: 0.06, grip: 0 };
}

/** The pose of a scene action: the ones of ponchoPeople.ts, plus the cheer of the rescue. */
export const scenePose = (action: SceneAction, phase: number): PersonPose =>
  action === 'cheer' ? cheerPose(phase) : ponchoPose(action satisfies PersonAction, phase);
