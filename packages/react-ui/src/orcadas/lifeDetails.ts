import { createSeededRng, layoutOf, snowDensityForMonth } from '@antartida/core';
import {
  ngon,
  prism,
  rect,
  shift,
  turn,
  type Tri,
} from '../voyage/lowPoly.ts';
import {
  PATH_CROWN_Y,
  PATH_GRAVEL_DARK,
  VOXEL_PALETTE,
  type StationPathData,
} from './stationModels.ts';

type Point2 = readonly [number, number];

export type TerrainHeightFn = (x: number, z: number) => number;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth01 = (v: number) => {
  const c = clamp01(v);
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};
const yawOf = (dx: number, dz: number) => Math.atan2(-dz, dx);

// ---- Shared diorama era & camera transition constants -------------------------------------

/** Exponential smoothing rate for era building scale transitions in StationScene. */
export const ERA_TRANSITION_RATE = 6.5;
export const ERA_SNAP_EPSILON = 0.005;
export const ERA_VISIBLE_THRESHOLD = 0.01;
export const ERA_MIN_SCALE = 0.001;

/**
 * Steps an era presence factor in `[0, 1]` toward `present ? 1 : 0` using the same
 * exponential curve as modern diorama buildings (snaps immediately when `reduced`).
 */
export function stepEraPresence(
  current: number,
  present: boolean,
  delta: number,
  reduced: boolean,
): number {
  const target = present ? 1 : 0;
  if (reduced || Math.abs(target - current) < ERA_SNAP_EPSILON) return target;
  return current + (target - current) * Math.min(1, delta * ERA_TRANSITION_RATE);
}

/**
 * Duration (seconds) of a CameraControls focus/return transition in StationScene
 * (matching the 1.4 s settle window at smoothTime = 0.32).
 */
export const CAMERA_TRANSITION_SECONDS = 1.4;

// ---- Detail 4: Observer walking along the gravel path --------------------------------------

/** Walking speed along the station path when returning to the house (world units per second). */
export const OBSERVER_WALK_SPEED = 2.15;

/** Visible walk to the Stevenson screen matches the camera zoom duration. */
export const OBSERVER_WALK_SECONDS = CAMERA_TRANSITION_SECONDS;

/**
 * Normalized route progress where the visible observation walk begins: the final stretch of
 * the gravel path approaching the Stevenson screen, already inside the screen camera frame
 * on desktop and mobile so the observer is seen arriving rather than off-frame at the house.
 */
export const OBSERVER_VISIBLE_START_U = 0.8;

/** Height clearance above path crown center when standing on gravel/packed snow. */
const OBSERVER_PATH_OFFSET_Y = PATH_CROWN_Y * 0.92;

export interface ObserverWalkInputs {
  hasMainHouse: boolean;
  screenOpen: boolean;
  reduced: boolean;
  /** True when the reading starts without an animated camera zoom. */
  noZoom?: boolean;
}

export interface ObserverWalkControllerState {
  /** Normalized progress along `buildObserverWalkRoute`: 0 = inside main house, 1 = at screen. */
  progress: number;
  /** Era visibility/scale presence in `[0, 1]` matching `modern` buildings. */
  eraPresence: number;
  /** True if the observer left the house for the current reading before leaving the modern era. */
  hadActiveObservation: boolean;
  movingBackward: boolean;
  isMoving: boolean;
  /** True when the screen door can open (observer arrived, no-zoom start, reduced, or era without observer). */
  doorReady: boolean;
  prevHasMainHouse: boolean;
  prevScreenOpen: boolean;
}

export function createObserverState({
  hasMainHouse,
  screenOpen,
  reduced,
  noZoom = false,
}: ObserverWalkInputs): ObserverWalkControllerState {
  if (!hasMainHouse) {
    return {
      progress: 0,
      eraPresence: 0,
      hadActiveObservation: false,
      movingBackward: false,
      isMoving: false,
      doorReady: screenOpen,
      prevHasMainHouse: false,
      prevScreenOpen: screenOpen,
    };
  }
  const direct = screenOpen && (reduced || noZoom);
  return {
    progress: direct ? 1 : screenOpen ? OBSERVER_VISIBLE_START_U : 0,
    eraPresence: 1,
    hadActiveObservation: screenOpen,
    movingBackward: false,
    isMoving: screenOpen && !direct,
    doorReady: direct,
    prevHasMainHouse: true,
    prevScreenOpen: screenOpen,
  };
}

export function syncObserverState(
  state: ObserverWalkControllerState,
  { hasMainHouse, screenOpen, reduced, noZoom = false }: ObserverWalkInputs,
): ObserverWalkControllerState {
  const eraEntered = !state.prevHasMainHouse && hasMainHouse;
  const eraExited = state.prevHasMainHouse && !hasMainHouse;
  const readingStarted = !state.prevScreenOpen && screenOpen;
  const readingStopped = state.prevScreenOpen && !screenOpen;
  const eraPresence = reduced ? (hasMainHouse ? 1 : 0) : state.eraPresence;

  if (!hasMainHouse) {
    // Freeze walk progress: never walk back toward a main house that does not exist in this era.
    const hadActiveObservation =
      eraExited && state.progress > 0.005 ? true : state.hadActiveObservation;
    return {
      ...state,
      eraPresence,
      hadActiveObservation,
      movingBackward: false,
      isMoving: false,
      doorReady: screenOpen,
      prevHasMainHouse: false,
      prevScreenOpen: screenOpen,
    };
  }

  if (eraEntered) {
    if (screenOpen) {
      // Returning while temperature reading is still open: already at the screen with door open.
      const direct = state.hadActiveObservation || reduced || noZoom;
      return {
        ...state,
        progress: direct ? 1 : OBSERVER_VISIBLE_START_U,
        eraPresence,
        hadActiveObservation: true,
        movingBackward: false,
        isMoving: !direct,
        doorReady: direct,
        prevHasMainHouse: true,
        prevScreenOpen: true,
      };
    }
    return {
      ...state,
      progress: 0,
      eraPresence,
      hadActiveObservation: false,
      movingBackward: false,
      isMoving: false,
      doorReady: false,
      prevHasMainHouse: true,
      prevScreenOpen: false,
    };
  }

  if (reduced) {
    return {
      ...state,
      progress: screenOpen ? 1 : 0,
      eraPresence: 1,
      hadActiveObservation: screenOpen,
      movingBackward: false,
      isMoving: false,
      doorReady: screenOpen,
      prevHasMainHouse: true,
      prevScreenOpen: screenOpen,
    };
  }

  if (readingStarted) {
    if (noZoom) {
      return {
        ...state,
        progress: 1,
        eraPresence,
        hadActiveObservation: true,
        movingBackward: false,
        isMoving: false,
        doorReady: true,
        prevHasMainHouse: true,
        prevScreenOpen: true,
      };
    }
    const startU = Math.max(state.progress, OBSERVER_VISIBLE_START_U);
    const alreadyThere = startU >= 1 - 1e-4;
    return {
      ...state,
      progress: alreadyThere ? 1 : startU,
      eraPresence,
      hadActiveObservation: true,
      movingBackward: false,
      isMoving: !alreadyThere,
      doorReady: alreadyThere,
      prevHasMainHouse: true,
      prevScreenOpen: true,
    };
  }

  if (readingStopped) {
    const hasWalked = state.progress > 1e-4;
    return {
      ...state,
      progress: hasWalked ? state.progress : 0,
      eraPresence,
      hadActiveObservation: false,
      movingBackward: hasWalked,
      isMoving: hasWalked,
      doorReady: false,
      prevHasMainHouse: true,
      prevScreenOpen: false,
    };
  }

  return {
    ...state,
    eraPresence,
    prevHasMainHouse: true,
    prevScreenOpen: screenOpen,
  };
}

export function stepObserverState(
  state: ObserverWalkControllerState,
  routeLength: number,
  delta: number,
  { hasMainHouse, screenOpen, reduced }: ObserverWalkInputs,
): { state: ObserverWalkControllerState; needsFrame: boolean } {
  const dt = Math.min(Math.max(0, delta), 0.05);
  const nextEra = stepEraPresence(state.eraPresence, hasMainHouse, delta, reduced);
  const eraTarget = hasMainHouse ? 1 : 0;
  const eraMoving = nextEra !== eraTarget;

  if (reduced) {
    const next: ObserverWalkControllerState = {
      ...state,
      progress: hasMainHouse && screenOpen ? 1 : 0,
      eraPresence: eraTarget,
      movingBackward: false,
      isMoving: false,
      doorReady: screenOpen,
      prevHasMainHouse: hasMainHouse,
      prevScreenOpen: screenOpen,
    };
    return { state: next, needsFrame: false };
  }

  if (!hasMainHouse) {
    const next: ObserverWalkControllerState = {
      ...state,
      eraPresence: nextEra,
      movingBackward: false,
      isMoving: false,
      doorReady: screenOpen,
    };
    return { state: next, needsFrame: eraMoving };
  }

  if (screenOpen) {
    if (state.progress >= 1 - 1e-4) {
      const next: ObserverWalkControllerState = {
        ...state,
        progress: 1,
        eraPresence: nextEra,
        movingBackward: false,
        isMoving: false,
        doorReady: true,
      };
      return { state: next, needsFrame: eraMoving || state.progress !== 1 || !state.doorReady };
    }
    const step = ((1 - OBSERVER_VISIBLE_START_U) * dt) / OBSERVER_WALK_SECONDS;
    const nextProgress = Math.min(1, state.progress + step);
    const arrived = nextProgress >= 1 - 1e-4;
    const next: ObserverWalkControllerState = {
      ...state,
      progress: arrived ? 1 : nextProgress,
      eraPresence: nextEra,
      movingBackward: false,
      isMoving: !arrived,
      doorReady: arrived,
    };
    return { state: next, needsFrame: true };
  }

  if (state.progress <= 1e-4) {
    const next: ObserverWalkControllerState = {
      ...state,
      progress: 0,
      eraPresence: nextEra,
      movingBackward: false,
      isMoving: false,
      doorReady: false,
    };
    return { state: next, needsFrame: eraMoving || state.progress !== 0 || state.doorReady };
  }
  const step = (OBSERVER_WALK_SPEED * dt) / Math.max(routeLength, 0.1);
  const nextProgress = Math.max(0, state.progress - step);
  const inside = nextProgress <= 1e-4;
  const next: ObserverWalkControllerState = {
    ...state,
    progress: inside ? 0 : nextProgress,
    eraPresence: nextEra,
    movingBackward: !inside,
    isMoving: !inside,
    doorReady: false,
  };
  return { state: next, needsFrame: true };
}

export interface ObserverWalkSample {
  x: number;
  z: number;
  /** Cumulative 2D distance along the route from module door to screen. */
  d: number;
}

export interface ObserverWalkRoute {
  samples: readonly ObserverWalkSample[];
  totalLength: number;
  screenFocus: Point2;
  heightAt: TerrainHeightFn;
}

export interface ObserverWalkState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  atScreen: boolean;
}

export interface ObserverStridePose {
  leftLegSwing: number;
  rightLegSwing: number;
  leftArmSwing: number;
  rightArmSwing: number;
  bobY: number;
  torsoPitchZ: number;
  headPitchZ: number;
}

function appendUniquePoints(dst: Point2[], pts: readonly Point2[]) {
  for (const pt of pts) {
    const prev = dst[dst.length - 1];
    if (prev && Math.hypot(pt[0] - prev[0], pt[1] - prev[1]) < 1e-4) continue;
    dst.push(pt);
  }
}

/**
 * Builds the exact observer route from `module-360745961` (casa) to the Stevenson screen
 * (`screen`) using only the path geometry waypoints exported by `buildStationPath()`.
 */
export function buildObserverWalkRoute(
  pathData: StationPathData,
  heightAt: TerrainHeightFn,
): ObserverWalkRoute {
  const mod1Spur = pathData.spurCenterlines.find((s) => s.id === 'module-360745961');
  const screenSpur = pathData.spurCenterlines.find((s) => s.id === 'screen');
  if (!mod1Spur || !screenSpur || pathData.mainCenterline.length < 2) {
    throw new Error('Missing expected main centerline or building spurs in StationPathData');
  }

  const pts: Point2[] = [];
  // 1. Out the house spur from its door to the main path junction.
  appendUniquePoints(pts, [...mod1Spur.centerline].reverse());

  // 2. Along the main gravel path between the two spur junction segments.
  const mainStart = mod1Spur.mainSegmentIndex;
  const mainEnd = screenSpur.mainSegmentIndex;
  if (mainStart >= mainEnd) {
    for (let i = mainStart; i >= mainEnd + 1; i--) {
      pts.push(pathData.mainCenterline[i]);
    }
  } else {
    for (let i = mainStart + 1; i <= mainEnd; i++) {
      pts.push(pathData.mainCenterline[i]);
    }
  }

  // 3. Up the Stevenson screen spur to its front steps.
  appendUniquePoints(pts, screenSpur.centerline);

  const samples: ObserverWalkSample[] = [];
  let acc = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i];
    if (i > 0) {
      acc += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]);
    }
    samples.push({ x, z, d: acc });
  }

  const screenPos = layoutOf('screen').position;
  return {
    samples,
    totalLength: acc,
    screenFocus: [screenPos[0], screenPos[2]],
    heightAt,
  };
}

/**
 * Samples the observer position, terrain-seated elevation, and heading at normalized progress
 * `u` in `[0, 1]`. Near `u = 1`, turns to face the Stevenson screen doorway; when `movingBackward`
 * is true (returning to the house), flips walking heading by pi radians.
 */
export function sampleObserverWalk(
  route: ObserverWalkRoute,
  u: number,
  movingBackward = false,
): ObserverWalkState {
  const clampedU = clamp01(u);
  const { samples, totalLength, screenFocus, heightAt } = route;
  const targetD = clampedU * totalLength;

  let segIdx = 0;
  for (let i = 0; i < samples.length - 1; i++) {
    if (samples[i + 1].d >= targetD || i === samples.length - 2) {
      segIdx = i;
      break;
    }
  }

  const a = samples[segIdx];
  const b = samples[Math.min(segIdx + 1, samples.length - 1)];
  const span = b.d - a.d;
  const segT = span > 1e-6 ? clamp01((targetD - a.d) / span) : 0;

  const x = lerp(a.x, b.x, segT);
  const z = lerp(a.z, b.z, segT);
  const y = heightAt(x, z) + OBSERVER_PATH_OFFSET_Y;

  // Tangent look-ahead keeps turns smooth across coarse centerline vertices.
  const aheadD = Math.min(totalLength, targetD + 0.35);
  const behindD = Math.max(0, targetD - 0.35);
  const evalAtD = (dist: number): Point2 => {
    for (let i = 0; i < samples.length - 1; i++) {
      if (samples[i + 1].d >= dist || i === samples.length - 2) {
        const s0 = samples[i];
        const s1 = samples[i + 1];
        const sp = s1.d - s0.d;
        const f = sp > 1e-6 ? clamp01((dist - s0.d) / sp) : 0;
        return [lerp(s0.x, s1.x, f), lerp(s0.z, s1.z, f)];
      }
    }
    const last = samples[samples.length - 1];
    return [last.x, last.z];
  };

  const p0 = evalAtD(behindD);
  const p1 = evalAtD(aheadD);
  let yaw = yawOf(p1[0] - p0[0], p1[1] - p0[1]);
  if (movingBackward) yaw += Math.PI;

  const screenYaw = yawOf(screenFocus[0] - x, screenFocus[1] - z);
  const faceBlend = smooth01((clampedU - 0.92) / 0.08);
  if (!movingBackward && faceBlend > 0) {
    yaw = lerpAngle(yaw, screenYaw, faceBlend);
  }

  return {
    x,
    y,
    z,
    yaw,
    atScreen: clampedU >= 0.995,
  };
}

/**
 * Limb swing and notebook posture while walking (`movingFactor` in [0, 1]) or standing
 * before the open Stevenson screen (`atScreen`).
 */
export function observerStridePose(
  distanceWalked: number,
  movingFactor: number,
  atScreen: boolean,
): ObserverStridePose {
  const m = clamp01(movingFactor);
  const strideAngle = distanceWalked * 11.5;
  const swing = Math.sin(strideAngle) * 0.52 * m;
  const bobY = Math.abs(Math.cos(strideAngle)) * 0.025 * m;

  // Right arm (with notebook) raises toward +x while reading instruments at the screen.
  const readArm = atScreen ? 0.65 * (1 - m) : 0;
  const readHead = atScreen ? -0.1 * (1 - m) : 0;

  return {
    leftLegSwing: swing,
    rightLegSwing: -swing,
    leftArmSwing: -swing * 0.72,
    rightArmSwing: swing * 0.72 + readArm,
    bobY,
    torsoPitchZ: -0.05 * m,
    headPitchZ: readHead,
  };
}

// ---- Detail 5: Snow patches & footprints on the path in snowy months ----------------------

const { WHITE, ICE, ICE_BLUE } = VOXEL_PALETTE;

/**
 * Uses the diorama's existing monthly snow criterion (`snowDensityForMonth`) to decide when
 * packed snow and boot footprints sit on the station path and route to the Stevenson screen.
 */
export function hasSnowOnPath(month: number): boolean {
  return snowDensityForMonth(month) > 0;
}

/** Builds a single low-poly boot-sole footprint at origin pointing toward `+x`. */
function footprintTris(x: number, z: number, yaw: number, heightAt: TerrainHeightFn): Tri[] {
  const minGround = Math.min(
    heightAt(x, z),
    heightAt(x - 0.045, z - 0.045),
    heightAt(x + 0.045, z - 0.045),
    heightAt(x - 0.045, z + 0.045),
    heightAt(x + 0.045, z + 0.045),
  );
  const base = minGround + PATH_CROWN_Y;
  // Subtle compacted snow rim plus recessed boot print in ICE_BLUE / dark gravel tone.
  const rim = shift(
    turn(prism(rect(0, 0, 0.082, 0.044), base - 0.012, base + 0.011, ICE, ICE, false), yaw),
    x,
    0,
    z,
  );
  const print = shift(
    turn(
      prism(rect(0.004, 0, 0.064, 0.032), base + 0.002, base + 0.016, PATH_GRAVEL_DARK, ICE_BLUE, false),
      yaw,
    ),
    x,
    0,
    z,
  );
  return [...rim, ...print];
}

/**
 * Generates low-poly snow drifts tucked along the gravel path plus alternating boot footprints
 * from `module-360745961` to the Stevenson screen (`screen`) and along the eastern path.
 */
export function buildPathSnowFootprintsTris(
  pathData: StationPathData,
  heightAt: TerrainHeightFn,
  seed = 1904,
): Tri[] {
  const rng = createSeededRng(seed);
  const tris: Tri[] = [];

  // 1. Irregular low-poly snow crusts hugging the edges & patches of the main gravel path.
  for (let i = 0; i < pathData.mainCenterline.length; i++) {
    const [cx, cz] = pathData.mainCenterline[i];
    if (rng() > 0.75) continue;
    const prev = pathData.mainCenterline[Math.max(0, i - 1)];
    const next = pathData.mainCenterline[Math.min(pathData.mainCenterline.length - 1, i + 1)];
    const tx = next[0] - prev[0];
    const tz = next[1] - prev[1];
    const len = Math.hypot(tx, tz) || 1;
    const nx = -tz / len;
    const nz = tx / len;
    const side = rng() < 0.5 ? -1 : 1;
    const ox = cx + nx * side * (0.09 + rng() * 0.08) + (rng() - 0.5) * 0.05;
    const oz = cz + nz * side * (0.09 + rng() * 0.08) + (rng() - 0.5) * 0.05;
    const r = 0.09 + rng() * 0.07;
    const ring = ngon(ox, oz, r, 6, rng() * Math.PI);
    let minY = heightAt(ox, oz);
    for (const [vx, vz] of ring) {
      const y = heightAt(vx, vz);
      if (y < minY) minY = y;
    }
    const gy = minY + PATH_CROWN_Y;
    const col = rng() < 0.6 ? WHITE : ICE;
    tris.push(...prism(ring, gy - 0.018, gy + 0.012, col, col, false));
  }

  // 2. Alternating left/right footprints along the observer route to the Stevenson screen.
  const route = buildObserverWalkRoute(pathData, heightAt);
  const stepSpacing = 0.24;
  const numSteps = Math.max(6, Math.floor(route.totalLength / stepSpacing));

  for (let i = 1; i < numSteps; i++) {
    const d = i * stepSpacing;
    const u = d / route.totalLength;
    const sample = sampleObserverWalk(route, u, false);
    const prevSample = sampleObserverWalk(
      route,
      Math.max(0, (d - 0.1) / route.totalLength),
      false,
    );
    const dx = sample.x - prevSample.x;
    const dz = sample.z - prevSample.z;
    const stepLen = Math.hypot(dx, dz) || 1;
    const lateralX = -dz / stepLen;
    const lateralZ = dx / stepLen;
    const side = i % 2 === 0 ? 1 : -1;
    const fx = sample.x + lateralX * side * 0.048 + (rng() - 0.5) * 0.01;
    const fz = sample.z + lateralZ * side * 0.048 + (rng() - 0.5) * 0.01;
    const stepYaw = yawOf(dx, dz) + side * 0.08;
    tris.push(...footprintTris(fx, fz, stepYaw, heightAt));
  }

  return tris;
}

// ---- Detail 8: Skuas and snow petrels soaring over Bahía Scotia --------------------------

/**
 * Speed multiplier raising bay bird flight from slow drift (~60-75 s per circuit)
 * to a credible skua/petrel soaring pace (~20-27 s per circuit).
 */
export const BAY_BIRD_SPEED_MULTIPLIER = 2.75;

export type BayBirdSpecies = 'skua' | 'snowPetrel';

export interface BayBirdSpec {
  id: number;
  species: BayBirdSpecies;
}

export interface BayBirdPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  /** Wing dihedral/flap angle in radians. */
  wingAngle: number;
}

/**
 * Selects active gliding birds matching `animals` in the scene (`'skua'` and/or `'snowPetrel'`).
 * Never spawns skuas when only `'snowPetrel'` is present (e.g. winter).
 */
export function activeBayBirds(animals: readonly string[]): BayBirdSpec[] {
  const hasSkua = animals.includes('skua');
  const hasPetrel = animals.includes('snowPetrel');
  if (!hasSkua && !hasPetrel) return [];

  const specs: BayBirdSpec[] = [];
  for (let i = 0; i < 5; i++) {
    let species: BayBirdSpecies;
    if (hasSkua && hasPetrel) species = i % 2 === 0 ? 'snowPetrel' : 'skua';
    else species = hasPetrel ? 'snowPetrel' : 'skua';
    specs.push({ id: i, species });
  }
  return specs;
}

/**
 * Pure soaring trajectory over Bahía Scotia (`z > 4` waters in front of the island).
 * Skuas and snow petrels glide at a credible pace scaled by `BAY_BIRD_SPEED_MULTIPLIER`,
 * banking into turns with matching wingbeat bursts; under `reduced` motion returns a fixed
 * soaring pose at `t = 0`.
 */
export function bayBirdPose(
  index: number,
  species: BayBirdSpecies,
  t: number,
  reduced: boolean,
): BayBirdPose {
  const time = reduced ? 0 : t;
  // Elliptical soaring circuit strictly over Bahía Scotia water in front of the peninsula.
  const centerX = (index % 2 === 0 ? -1 : 1) * 1.4;
  const centerZ = 10.6 + (index % 3) * 1.6;
  const rx = 8.2 + (index % 3) * 2.1;
  const rz = 3.8 + (index % 2) * 1.1;
  const omega =
    (species === 'snowPetrel' ? 0.105 : 0.088) *
    BAY_BIRD_SPEED_MULTIPLIER *
    (1 - (index % 3) * 0.07);
  const phase = index * 1.27;
  const ang = time * omega + phase;

  const x = centerX + Math.cos(ang) * rx;
  const z = centerZ + Math.sin(ang) * rz;
  const vx = -Math.sin(ang) * rx * omega;
  const vz = Math.cos(ang) * rz * omega;
  const yaw = yawOf(vx, vz);

  const baseAlt = (species === 'snowPetrel' ? 4.4 : 5.4) + (index % 2) * 1.1;
  const y = baseAlt + Math.sin(time * 0.35 * BAY_BIRD_SPEED_MULTIPLIER + phase) * 0.38;

  // Dynamic soaring: glide interspersed with brisk bursts of wingbeats matching flight speed.
  const flapCycle = (time * 0.14 * BAY_BIRD_SPEED_MULTIPLIER + index * 0.31) % 1;
  const flapBurst = flapCycle < 0.32 ? Math.sin((flapCycle / 0.32) * Math.PI) : 0;
  const flapReach = species === 'snowPetrel' ? 0.42 : 0.34;
  const flapFreq = species === 'snowPetrel' ? 12.5 : 9.2;
  const wingAngle =
    0.07 +
    Math.sin(time * 1.8 + index) * 0.035 +
    flapBurst * Math.sin(time * flapFreq + index) * flapReach;

  const bank =
    -0.24 *
    (0.65 + 0.35 * Math.cos(ang)) *
    (1 + Math.sin(time * 0.4 * BAY_BIRD_SPEED_MULTIPLIER + index) * 0.2);
  const pitch = 0.04 + Math.cos(time * 0.35 * BAY_BIRD_SPEED_MULTIPLIER + phase) * 0.03;

  return { x, y, z, yaw, pitch, roll: bank, wingAngle };
}

/** Helper to compute triangle vertices/normals bounding-box floor check in tests. */
export function lowestVertexY(tris: readonly Tri[]): number {
  let min = Infinity;
  for (const [a, b, c] of tris) {
    if (a[1] < min) min = a[1];
    if (b[1] < min) min = b[1];
    if (c[1] < min) min = c[1];
  }
  return min;
}
