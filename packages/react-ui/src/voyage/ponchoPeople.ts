import { footprintTris, observerStridePose, type TerrainHeightFn } from '../orcadas/lifeDetails.ts';
import {
  OBSERVER_HIP_Y,
  OBSERVER_HIP_Z,
  OBSERVER_SHOULDER_Y,
  OBSERVER_SHOULDER_Z,
  buildObserverPolyParts,
  type ObserverPolyParts,
} from '../orcadas/lowPolyPeople.ts';
import { VOXEL_PALETTE } from '../orcadas/stationModels.ts';
import { block, prism, shift, type Tri, type Vec3 } from './lowPoly.ts';

/**
 * People of Poncho's stops, low-poly (rule 30): the articulated Orcadas figure (lowPolyPeople.ts)
 * in several parka colors and a handful of working poses. Illustration, not a portrait of anyone.
 * Standing height ~1.0 model unit, feet on y = 0, facing +x. `L` is the -z side, `R` the +z side
 * (as in `assembleObserverTris`). Angles are radians about z, positive swings forward (+x) for
 * limbs; a negative `torsoPitch` leans the body forward.
 *
 * Every pose is a pure function of `phase` (radians, period 2π), with no clock: the scene advances
 * `phase`. Poses follow the book's work (walk, hammer a stake, probe, shovel, haul by a harness).
 */

const { ORANGE, RED, RED_DARK, NAVY_ROOF, CREAM, ZINC } = VOXEL_PALETTE;

/** Angles of the limbs and the trunk for one instant. */
export interface PersonPose {
  readonly legL: number;
  readonly legR: number;
  readonly armL: number;
  readonly armR: number;
  /** Lean of the whole upper body about the hips (negative leans forward). */
  readonly torsoPitch: number;
  /** Both arms moved this far (model units) towards the midline, to hold one thing in both hands. */
  readonly grip: number;
}

export type PersonAction = 'stand' | 'walk' | 'hammer' | 'probe' | 'shovel' | 'haul' | 'tend';
export const PERSON_ACTIONS: readonly PersonAction[] = ['stand', 'walk', 'hammer', 'probe', 'shovel', 'haul', 'tend'];

/** Period of every pose, in radians of `phase`. */
export const PONCHO_PHASE_PERIOD = Math.PI * 2;
/** Radians of the observer's stride per radian of `phase` (the stride angle is distance * 11.5). */
const STRIDE_PER_DISTANCE = 11.5;
/** 0..1..0 wave with the period of `phase`. */
/** Lateral shift of the arms when both hands hold one thing: the sleeves still come out of the chest. */
const GRIP = 0.1;
const wave = (phase: number) => 0.5 + 0.5 * Math.sin(phase);

export const standPose = (): PersonPose => ({ legL: 0, legR: 0, armL: 0, armR: 0, torsoPitch: 0, grip: 0 });

/** Walk: the swing of the Orcadas observer (`observerStridePose`), one stride per `phase` turn. */
export function walkPose(phase: number): PersonPose {
  const s = observerStridePose(phase / STRIDE_PER_DISTANCE, 1, false);
  return { legL: s.leftLegSwing, legR: s.rightLegSwing, armL: s.leftArmSwing, armR: s.rightArmSwing, torsoPitch: s.torsoPitchZ, grip: 0 };
}

/** Hammer: bent over, the L hand holds the stake and the R arm lifts a pick and brings it down on it. */
export function hammerPose(phase: number): PersonPose {
  const strike = wave(phase) ** 1.6;
  return { legL: 0.3, legR: -0.22, armL: 1.45, armR: 1.5 + 1.1 * strike, torsoPitch: -1.0 - 0.05 * strike, grip: GRIP };
}

/** Probe: a pole held in both hands is lifted and driven into the snow again and again. */
export function probePose(phase: number): PersonPose {
  const drive = wave(phase);
  const arm = 0.55 + 0.75 * drive;
  return { legL: 0.18, legR: -0.12, armL: arm, armR: arm + 0.08, torsoPitch: -0.22 - 0.1 * (1 - drive), grip: GRIP };
}

/** Shovel: the trunk bends to dig, comes up with the load and the arms follow the handle. */
export function shovelPose(phase: number): PersonPose {
  const dig = wave(phase);
  return { legL: 0.3, legR: -0.2, armL: 1.0 + 0.35 * dig, armR: 0.75 + 0.4 * dig, torsoPitch: -0.3 - 0.4 * dig, grip: GRIP };
}

/** Haul: strong lean forward, short slow steps, one hand on the harness line at the hip. */
export function haulPose(phase: number): PersonPose {
  const s = walkPose(phase);
  return { legL: s.legL * 0.8, legR: s.legR * 0.8, armL: s.armL * 0.7 - 0.15, armR: 0.5 + 0.08 * Math.sin(phase), torsoPitch: -0.45, grip: 0 };
}

/** Tend: bent over, both hands working at something low in front (a harness on a dog), the hands moving a little. */
export function tendPose(phase: number): PersonPose {
  const work = Math.sin(phase);
  return { legL: 0.28, legR: -0.2, armL: 1.25 + 0.12 * work, armR: 1.15 - 0.12 * work, torsoPitch: -0.7, grip: GRIP };
}

export function ponchoPose(action: PersonAction, phase: number): PersonPose {
  switch (action) {
    case 'tend':
      return tendPose(phase);
    case 'walk':
      return walkPose(phase);
    case 'hammer':
      return hammerPose(phase);
    case 'probe':
      return probePose(phase);
    case 'shovel':
      return shovelPose(phase);
    case 'haul':
      return haulPose(phase);
    default:
      return standPose();
  }
}

// Hand and sole in the local frames of the limbs (buildLegTris / buildArmTris of lowPolyPeople.ts).
const HAND_LOCAL: readonly [number, number] = [0.03, -0.26];
const SOLE_X: readonly [number, number] = [-0.056, 0.106];

const rot = (x: number, y: number, a: number, px = 0, py = 0): [number, number] => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c];
};

/** How far the person is lifted so the lowest foot rests on y = 0 (the hips drop as the legs open). */
export function ponchoPoseLift(pose: PersonPose): number {
  const lowest = (a: number) => OBSERVER_HIP_Y + Math.min(...SOLE_X.map((x) => rot(x, -OBSERVER_HIP_Y, a)[1]));
  return -Math.min(lowest(pose.legL), lowest(pose.legR));
}

/** Where a mitten is, in the model frame of the person grounded by `ponchoPoseLift`. */
export function ponchoHandAt(pose: PersonPose, side: 'L' | 'R'): Vec3 {
  const arm = side === 'L' ? pose.armL : pose.armR;
  const [hx, hy] = rot(HAND_LOCAL[0], HAND_LOCAL[1], arm);
  const [x, y] = rot(hx, OBSERVER_SHOULDER_Y + hy, pose.torsoPitch, 0, OBSERVER_HIP_Y);
  return [x, y + ponchoPoseLift(pose), side === 'L' ? -(OBSERVER_SHOULDER_Z - pose.grip) : OBSERVER_SHOULDER_Z - pose.grip];
}

/**
 * Wide harness belt round the waist (book p. 9): a ring over the waist band of the parka (the model's
 * `loftY` ring at y 0.45 is 0.108 x 0.140 wide), and the point on its front where the line is tied. In
 * the model frame of the person grounded by `ponchoPoseLift`, so it follows the hips and the lean of the torso.
 */
export const BELT_Y: readonly [number, number] = [OBSERVER_HIP_Y - 0.03, OBSERVER_HIP_Y + 0.09];
export const BELT_RADIUS: readonly [number, number] = [0.122, 0.156];
/** Where the line is tied: the front of the belt, at its middle height, in the frame of the hips (x ahead, y up from the hips). */
const BELT_TIE: readonly [number, number] = [BELT_RADIUS[0] + 0.01, (BELT_Y[0] + BELT_Y[1]) / 2 - OBSERVER_HIP_Y];

/** The belt, in the model frame of the person (as the torso): a canvas band round the waist and a buckle on its front. */
export function buildBeltTris(): Tri[] {
  const ring = Array.from({ length: 8 }, (_, i): [number, number] => {
    const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
    return [Math.cos(a) * BELT_RADIUS[0] * 1.08, Math.sin(a) * BELT_RADIUS[1] * 1.08];
  });
  return [...prism(ring, BELT_Y[0], BELT_Y[1], CREAM), ...block(BELT_RADIUS[0] + 0.012, (BELT_Y[0] + BELT_Y[1]) / 2, 0, 0.03, 0.05, 0.06, ZINC)];
}

export function ponchoWaistAt(pose: PersonPose): Vec3 {
  const [x, y] = rot(BELT_TIE[0], OBSERVER_HIP_Y + BELT_TIE[1], pose.torsoPitch, 0, OBSERVER_HIP_Y);
  return [x, y + ponchoPoseLift(pose), 0];
}

/** Parka colors: the book's orange as the base, and two variations so a group is not made of clones. */
export type PersonVariant = 'orange' | 'red' | 'orangeNavy';
export const PERSON_VARIANTS: readonly PersonVariant[] = ['orange', 'red', 'orangeNavy'];

const VARIANT_COLORS: Readonly<Record<PersonVariant, ReadonlyMap<number, number>>> = {
  orange: new Map(),
  red: new Map([[ORANGE, RED]]),
  orangeNavy: new Map([[RED_DARK, NAVY_ROOF]]),
};

const recolor = (tris: readonly Tri[], map: ReadonlyMap<number, number>): Tri[] =>
  map.size === 0 ? [...tris] : tris.map(([a, b, c, col]) => [a, b, c, map.get(col) ?? col]);

const recolorParts = (parts: ObserverPolyParts, map: ReadonlyMap<number, number>): ObserverPolyParts => ({
  torso: recolor(parts.torso, map),
  legL: recolor(parts.legL, map),
  legR: recolor(parts.legR, map),
  armL: recolor(parts.armL, map),
  armR: recolor(parts.armR, map),
});

const PARTS = new Map<PersonVariant, ObserverPolyParts>();

/**
 * Articulated parts of a person in a parka variant, cached per variant. Pivots: hips
 * (`OBSERVER_HIP_Y`, `OBSERVER_HIP_Z`) and shoulders (`OBSERVER_SHOULDER_Y`, `OBSERVER_SHOULDER_Z`).
 * Both arms are the bare arm (the notebook of the observer is left out) and both legs are equal.
 */
export function ponchoPersonParts(variant: PersonVariant = 'orange'): ObserverPolyParts {
  let parts = PARTS.get(variant);
  if (!parts) {
    const base = buildObserverPolyParts();
    parts = recolorParts({ ...base, armR: base.armL }, VARIANT_COLORS[variant]);
    PARTS.set(variant, parts);
  }
  return parts;
}

const rotateTris = (tris: readonly Tri[], a: number, px = 0, py = 0): Tri[] => {
  if (a === 0) return [...tris];
  const r = ([x, y, z]: Vec3): Vec3 => {
    const [rx, ry] = rot(x, y, a, px, py);
    return [rx, ry, z];
  };
  return tris.map(([p, q, s, col]) => [r(p), r(q), r(s), col]);
};

/**
 * The person in `pose`, in the model frame: feet on y = 0, facing +x. Rebuilt per call from the
 * cached parts (rotations and shifts of a few hundred faces), so it can be drawn frame by frame.
 */
export function buildPonchoPerson(pose: PersonPose, variant: PersonVariant = 'orange'): Tri[] {
  const parts = ponchoPersonParts(variant);
  const upper = [
    ...parts.torso,
    ...shift(rotateTris(parts.armL, pose.armL), 0, OBSERVER_SHOULDER_Y, -(OBSERVER_SHOULDER_Z - pose.grip)),
    ...shift(rotateTris(parts.armR, pose.armR), 0, OBSERVER_SHOULDER_Y, OBSERVER_SHOULDER_Z - pose.grip),
  ];
  return shift(
    [
      ...rotateTris(upper, pose.torsoPitch, 0, OBSERVER_HIP_Y),
      ...shift(rotateTris(parts.legL, pose.legL), 0, OBSERVER_HIP_Y, -OBSERVER_HIP_Z),
      ...shift(rotateTris(parts.legR, pose.legR), 0, OBSERVER_HIP_Y, OBSERVER_HIP_Z),
    ],
    0,
    ponchoPoseLift(pose),
    0,
  );
}

/** The boot print number `index` of a person who is at (x, z) walking towards `yaw`: alternating feet, a gauge apart. */
export function ponchoPrint(x: number, z: number, yaw: number, index: number, heightAt: TerrainHeightFn, halfGauge = 0.045): Tri[] {
  const dx = Math.cos(yaw);
  const dz = -Math.sin(yaw);
  const side = index % 2 === 0 ? -1 : 1;
  return footprintTris(x - dz * halfGauge * side, z + dx * halfGauge * side, yaw, heightAt);
}

/** Boot prints of a person walking from `from` towards `yaw` (same yaw as `turn`), alternating feet. */
export function ponchoFootprints(
  from: readonly [number, number],
  yaw: number,
  count: number,
  stride: number,
  heightAt: TerrainHeightFn,
  halfGauge = 0.045,
): Tri[] {
  const dx = Math.cos(yaw);
  const dz = -Math.sin(yaw);
  const out: Tri[] = [];
  for (let i = 0; i < count; i++) out.push(...ponchoPrint(from[0] + dx * stride * i, from[1] + dz * stride * i, yaw, i, heightAt, halfGauge));
  return out;
}
