import { describe, expect, it } from 'vitest';
import {
  GROUND_TARGET_MAX,
  groundTarget,
  CAMERA_RETURN_SECONDS,
  FOV,
  liftToward,
  shiftAcross,
  MAX_POLAR_DEG,
  cameraReturn,
  OCEAN_SIZE,
  PAN_LIMIT,
  WORLD_FADE_END,
  geometry,
  screenPx,
  placeModelSize,
  seaModelSize,
  MODEL_REFERENCE_DISTANCE,
  poseFromView,
  viewFromPose,
  HOME,
  homePose3D,
  DIVE_3D,
  approachPose3D,
  divePose3D,
  fromWorld,
  toWorld,
  heightAt,
  worldHeight,
  EXPEDITION_POINT,
  ORCADAS_POINT,
  homeDistance3D,
  voyageMaxDistance3D,
  VOYAGE_VIEW_SPAN,
  ICE_MIN_DISTANCE,
  kFromDistance3D,
  distanceFromK3D,
  viewFrom3D,
  MAX_K,
  MIN_K,
} from '../src/index.ts';

describe('camera', () => {
  const size = { vw: 1440, vh: 900 };
  const geo = geometry(size);

  it('round-trips view -> pose -> view within < 0.5 px', () => {
    const originalView = { ...HOME };
    const pose = poseFromView(size, geo, originalView);
    const restoredView = viewFromPose(pose, size, geo);

    expect(Math.abs(restoredView.k - originalView.k)).toBeLessThan(1e-4);
    expect(Math.abs(restoredView.px - originalView.px)).toBeLessThan(0.5);
    expect(Math.abs(restoredView.py - originalView.py)).toBeLessThan(0.5);
  });

  it('frames the continent closer on wide screens than on narrow ones', () => {
    const wide = homePose3D(16 / 10);
    const narrow = homePose3D(390 / 844);
    const dist = (p: typeof wide) => Math.hypot(p.pos.x - p.target.x, p.pos.y - p.target.y, p.pos.z - p.target.z);
    expect(wide.pos.y).toBeGreaterThan(0);
    expect(dist(wide)).toBeLessThan(dist(narrow));
    // Camera south of the target (+z), looking north.
    expect(wide.pos.z).toBeGreaterThan(wide.target.z);
  });

  it('reserves top headroom on short landscape screens while keeping standard viewports unchanged (#273)', () => {
    expect(homePose3D(1440 / 900, 1.08, 900)).toEqual(homePose3D(1440 / 900));
    expect(homePose3D(390 / 844, 1.08, 844)).toEqual(homePose3D(390 / 844));
    expect(homePose3D(1280 / 720, 1.08, 720)).toEqual(homePose3D(1280 / 720));

    for (const [vw, vh] of [[844, 390], [667, 375]]) {
      const pose = homePose3D(vw / vh, 1.08, vh);
      const f = { x: pose.target.x - pose.pos.x, y: pose.target.y - pose.pos.y, z: pose.target.z - pose.pos.z };
      const fLen = Math.hypot(f.x, f.y, f.z);
      f.x /= fLen;
      f.y /= fLen;
      f.z /= fLen;
      const u = { x: 0, y: -f.z, z: f.y };
      const tanV = Math.tan((FOV * Math.PI) / 360);
      const screenTop = (y: number) => {
        const w = toWorld((150.4 + 851.8) / 2, y, 0);
        const dx = w.x - pose.pos.x;
        const dy = w.y - pose.pos.y;
        const dz = w.z - pose.pos.z;
        const ndcY = (dx * u.x + dy * u.y + dz * u.z) / ((dx * f.x + dy * f.y + dz * f.z) * tanV);
        return ((1 - ndcY) * vh) / 2;
      };
      // North edge stays low enough for header.top + marker stick + fan lift; south edge stays on screen.
      expect(screenTop(197.3)).toBeGreaterThanOrEqual(150);
      expect(screenTop(783.4)).toBeLessThanOrEqual(vh - 18);
    }
  });

  it('maps the 3D overview to k = 1 and zooming in always moves the camera closer', () => {
    for (const s of [size, { vw: 390, vh: 844 }]) {
      const aspect = s.vw / s.vh;
      const home = homeDistance3D(aspect);
      expect(kFromDistance3D(aspect, home)).toBeCloseTo(1, 6);
      // Regression: the "+" button used to recompute a top-down height for k = 1.6 that was
      // farther than the overview on desktop, so the first zoom in moved the camera away.
      expect(distanceFromK3D(aspect, 1.6)).toBeLessThan(home);
      expect(kFromDistance3D(aspect, distanceFromK3D(aspect, 2.5))).toBeCloseTo(2.5, 6);
    }
  });

  it('during the trip the camera backs off much less than to the overview, the same ground on any screen (#167)', () => {
    const half = Math.tan((FOV * Math.PI) / 360);
    for (const s of [size, { vw: 390, vh: 844 }, { vw: 1920, vh: 1080 }]) {
      const aspect = s.vw / s.vh;
      const far = voyageMaxDistance3D(aspect);
      expect(far).toBeLessThan(homeDistance3D(aspect) / 3);
      expect(far).toBeGreaterThan(ICE_MIN_DISTANCE * 3);
      // The shorter side of the screen spans VOYAGE_VIEW_SPAN of ground at the target.
      expect(2 * far * half * Math.min(1, aspect)).toBeCloseTo(VOYAGE_VIEW_SPAN, 6);
    }
  });

  it('viewFrom3D centers the 2D view on the camera target, caps k and lets it fall below 1 far away', () => {
    const aspect = size.vw / size.vh;
    const target = { x: 0, y: 0, z: 0 }; // map center (500, 500)
    const v = viewFrom3D(size, geo, target, distanceFromK3D(aspect, 2));
    expect(v.k).toBeCloseTo(2, 6);
    const pxPerUnit = (geo.S * v.k) / 1000;
    expect(geo.ox + v.px + 500 * pxPerUnit).toBeCloseTo(size.vw / 2, 3);
    expect(geo.oy + v.py + 500 * pxPerUnit).toBeCloseTo(size.vh / 2, 3);
    expect(viewFrom3D(size, geo, target, 1).k).toBe(MAX_K);
    expect(viewFrom3D(size, geo, target, 1e6).k).toBeLessThan(MIN_K);
  });

  it('has DIVE_3D above ground heightAt Orcadas', () => {
    const orcadasH = heightAt(EXPEDITION_POINT.x, EXPEDITION_POINT.y);
    const targetMap = fromWorld(DIVE_3D.target);
    expect(Math.abs(targetMap.x - EXPEDITION_POINT.x)).toBeLessThan(1e-4);
    expect(Math.abs(targetMap.y - EXPEDITION_POINT.y)).toBeLessThan(1e-4);

    // Camera position y must be strictly above target.y
    expect(DIVE_3D.pos.y).toBeGreaterThan(DIVE_3D.target.y);
    expect(DIVE_3D.pos.y).toBeGreaterThan(worldHeight(orcadasH));
  });

  it('approachPose3D starts and ends on the given poses and reaches the geometric mean of the distances at half time', () => {
    const from = { pos: { x: 0, y: 1600, z: 0.001 }, target: { x: 0, y: 0, z: 0 } };
    const to = divePose3D(ORCADAS_POINT);
    const dist = (p: typeof from) => Math.hypot(p.pos.x - p.target.x, p.pos.y - p.target.y, p.pos.z - p.target.z);
    const start = approachPose3D(from, to, 0);
    const end = approachPose3D(from, to, 1);
    expect(start.pos.y).toBeCloseTo(1600, 4);
    expect(end.pos.x).toBeCloseTo(to.pos.x, 4);
    expect(end.pos.y).toBeCloseTo(to.pos.y, 4);
    expect(end.pos.z).toBeCloseTo(to.pos.z, 4);
    expect(end.target.x).toBeCloseTo(to.target.x, 4);
    const mid = approachPose3D(from, to, 0.5);
    expect(dist(mid)).toBeCloseTo(Math.sqrt(dist(from) * dist(to)), 3);
    // The target is nearly settled at half time: the point does not slide at the end.
    expect(Math.abs(mid.target.x - to.target.x)).toBeLessThan(Math.abs(from.target.x - to.target.x) * 0.2);
  });

  it('divePose3D for Orcadas looks at Orcadas and matches DIVE_3D', () => {
    const pose = divePose3D(ORCADAS_POINT);
    const expected = toWorld(208, 205);
    expect(pose.target.x).toBeCloseTo(expected.x, 4);
    expect(pose.target.z).toBeCloseTo(expected.z, 4);
    expect(pose.pos.y).toBeGreaterThan(pose.target.y);
    expect(pose.target).toEqual(DIVE_3D.target);
    expect(pose.pos).toEqual(DIVE_3D.pos);
  });
});

describe('screenPx', () => {
  it('halves when the distance doubles and grows with the viewport', () => {
    const near = screenPx(10, 400, 900);
    expect(screenPx(10, 800, 900)).toBeCloseTo(near / 2, 6);
    expect(screenPx(10, 400, 1800)).toBeCloseTo(near * 2, 6);
  });

  it('fills the viewport height with the frustum height at that distance', () => {
    const frustum = 2 * 500 * Math.tan((FOV * Math.PI) / 360);
    expect(screenPx(frustum, 500, 844)).toBeCloseTo(844, 6);
  });
});

describe('seaModelSize', () => {
  it('keeps a sea model at its size in px up close, instead of filling the screen (#51)', () => {
    // Around Tierra del Fuego the camera gets as close as 8: a 72 px ship must still be about 72 px.
    for (const distance of [8, 15, 60, MODEL_REFERENCE_DISTANCE]) {
      expect(screenPx(seaModelSize(72, distance), distance, 900)).toBeCloseTo(72, 6);
    }
  });

  it('stops growing beyond the reference distance, so it shrinks on screen', () => {
    const fixed = seaModelSize(72, MODEL_REFERENCE_DISTANCE);
    expect(seaModelSize(72, MODEL_REFERENCE_DISTANCE * 4)).toBe(fixed);
    expect(screenPx(fixed, MODEL_REFERENCE_DISTANCE * 4, 900)).toBeCloseTo(18, 6);
  });
});

describe('placeModelSize', () => {
  it('stays small up close, where a trip starts (#47)', () => {
    // The Ushuaia trip starts with the camera at about 15: the town must not cover the channel.
    expect(placeModelSize(15, 0.036, 0.25)).toBeCloseTo(0.54, 6);
    expect(placeModelSize(1, 0.036, 0.25)).toBe(0.25);
  });

  it('stops growing beyond the reference distance, so it shrinks on screen', () => {
    const fixed = placeModelSize(MODEL_REFERENCE_DISTANCE, 0.036, 0.25);
    expect(placeModelSize(MODEL_REFERENCE_DISTANCE * 4, 0.036, 0.25)).toBe(fixed);
  });
});

describe('camera limits and the drawn world', () => {
  /**
   * Farthest ground point seen by the farthest, most tilted camera, over every target of the pan
   * area and every heading: its distance from the pole and from the camera target. The farthest
   * points on the ground are at the top corners of the screen.
   */
  function farthestGround(vw: number, vh: number) {
    const aspect = vw / vh;
    const distance = homeDistance3D(aspect, vh);
    const polar = (MAX_POLAR_DEG * Math.PI) / 180;
    const tanV = Math.tan((FOV * Math.PI) / 360);
    let fromPole = 0;
    let fromTarget = 0;
    for (let tx = -PAN_LIMIT; tx <= PAN_LIMIT; tx += PAN_LIMIT / 4) {
      for (let tz = -PAN_LIMIT; tz <= PAN_LIMIT; tz += PAN_LIMIT / 4) {
        for (let deg = 0; deg < 360; deg += 5) {
          const az = (deg * Math.PI) / 180;
          const cam = [tx + distance * Math.sin(polar) * Math.sin(az), distance * Math.cos(polar), tz + distance * Math.sin(polar) * Math.cos(az)];
          const fwd = [(tx - cam[0]) / distance, -cam[1] / distance, (tz - cam[2]) / distance];
          const rightLen = Math.hypot(fwd[2], fwd[0]);
          const right = [-fwd[2] / rightLen, 0, fwd[0] / rightLen];
          const up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
          for (const side of [-1, 1]) {
            const ray = [0, 1, 2].map((i) => fwd[i] + side * tanV * aspect * right[i] + tanV * up[i]);
            // The camera never looks above the horizon, so the ray reaches the ground.
            expect(ray[1]).toBeLessThan(0);
            const t = -cam[1] / ray[1];
            const gx = cam[0] + t * ray[0];
            const gz = cam[2] + t * ray[2];
            fromPole = Math.max(fromPole, Math.hypot(gx, gz));
            fromTarget = Math.max(fromTarget, Math.hypot(gx - tx, gz - tz));
          }
        }
      }
    }
    return { fromPole, fromTarget };
  }

  it.each([
    ['a phone', 390, 844],
    ['a landscape phone', 844, 390],
    ['a desktop', 1440, 900],
    ['an ultrawide screen', 2560, 1080],
  ])('never shows the paper beyond the world on %s', (_name, vw, vh) => {
    const { fromPole, fromTarget } = farthestGround(vw, vh);
    // The lands of the rest of the world are drawn up to there.
    expect(fromPole).toBeLessThan(WORLD_FADE_END);
    // The ocean plane follows the camera target.
    expect(fromTarget).toBeLessThan(OCEAN_SIZE / 2);
  });
});

describe('trip camera coming back to the vehicle from a place off the path', () => {
  const cape = { x: -40, y: 0, z: 110 };
  /** A ship that sails on while the camera comes back: `speed` world units per second along x. */
  const ship = (seconds: number, speed: number) => ({ x: -34 + speed * seconds, y: 0, z: 112 });
  const FPS = 60;
  /** Looked-at point on each frame of the way back, and how far it moved since the frame before. */
  const fly = (speed: number) => {
    const frames = Math.round(CAMERA_RETURN_SECONDS * FPS);
    const points = Array.from({ length: frames + 1 }, (_, i) => cameraReturn(cape, ship(i / FPS, speed), i / frames));
    const steps = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.z - points[i].z));
    return { points, steps };
  };

  it('leaves the place and ends on the vehicle, wherever the vehicle is by then', () => {
    expect(cameraReturn(cape, ship(0, 4), 0)).toEqual(cape);
    expect(cameraReturn(cape, ship(CAMERA_RETURN_SECONDS, 4), 1)).toEqual(ship(CAMERA_RETURN_SECONDS, 4));
    // Out of range it stays at either end.
    expect(cameraReturn(cape, ship(0, 4), -1)).toEqual(cape);
    expect(cameraReturn(cape, ship(9, 4), 2)).toEqual(ship(9, 4));
  });

  it('starts from rest and speeds up little by little, with the vehicle stopped or sailing', () => {
    for (const speed of [0, 4, 14]) {
      const { steps } = fly(speed);
      const whole = Math.hypot(ship(CAMERA_RETURN_SECONDS, speed).x - cape.x, ship(CAMERA_RETURN_SECONDS, speed).z - cape.z);
      // The first tenth of the time covers less than a hundredth of the way: no lurch when the card closes.
      const first = steps.slice(0, steps.length / 10).reduce((a, b) => a + b, 0);
      expect(first, `speed ${speed}`).toBeLessThan(whole / 100);
      // No frame moves much more than the one before it.
      for (let i = 1; i < steps.length; i++) expect(steps[i] - steps[i - 1], `speed ${speed}, frame ${i}`).toBeLessThan(whole / 400);
    }
  });

  it('reaches the vehicle at the speed of the vehicle: no jump when the camera goes on following it', () => {
    for (const speed of [0, 4, 14]) {
      const { steps } = fly(speed);
      // The last frames move as much as the vehicle does in a frame.
      for (const step of steps.slice(-3)) expect(step, `speed ${speed}`).toBeCloseTo(speed / FPS, 2);
    }
  });

  it('is never faster than about twice its average speed', () => {
    const { steps } = fly(0);
    const whole = steps.reduce((a, b) => a + b, 0);
    expect(Math.max(...steps)).toBeLessThan((2 * whole) / steps.length);
  });
});

describe('groundTarget (#127)', () => {
  it('leaves a target on the ground or at a model alone', () => {
    expect(groundTarget({ x: 0, y: 20, z: 20 }, { x: 0, y: 0, z: 0 })).toBeNull();
    expect(groundTarget({ x: 0, y: 20, z: 20 }, { x: 0, y: GROUND_TARGET_MAX, z: 0 })).toBeNull();
  });

  it('brings a target that sank under the map back to sea level, on the same line of sight', () => {
    const pos = { x: 0, y: -37.6, z: 10 };
    const sunk = groundTarget({ x: 0, y: 12.4, z: 10 }, { x: 0, y: -50, z: -40 })!;
    expect(sunk.y).toBe(0);
    // From (0, 12.4, 10) towards (0, -50, -40): sea level is a fifth of the way.
    expect(sunk.z).toBeCloseTo(10 - 50 * (12.4 / 62.4), 6);
    // Camera already under the map: straight up to sea level.
    expect(groundTarget(pos, { x: 3, y: -50, z: -40 })).toEqual({ x: 3, y: 0, z: -40 });
  });

  it('brings a target that climbed into the air down along the line of sight', () => {
    const t = groundTarget({ x: 0, y: 73.7, z: 12.5 }, { x: 0, y: 61.3, z: -9 })!;
    expect(t.y).toBe(0);
    const s = 73.7 / (73.7 - 61.3);
    expect(t.z).toBeCloseTo(12.5 + (-9 - 12.5) * s, 6);
  });
});

describe('liftToward (#148)', () => {
  const polar = (52 * Math.PI) / 180;
  // Height on screen (-1 bottom, 1 top) of a point on the target plane, `ahead` units past the target.
  const ndcOf = (distance: number, ahead: number) => {
    const height = distance * Math.cos(polar);
    const across = distance * Math.sin(polar);
    const axis = Math.PI / 2 - polar;
    return Math.tan(axis - Math.atan(height / (across + ahead))) / Math.tan((FOV * Math.PI) / 360);
  };

  it('does not move the target to keep the point in the middle of the screen', () => {
    expect(liftToward(3, polar, 0)).toBeCloseTo(0, 9);
  });

  it('puts the point at the asked height on screen, at any distance', () => {
    for (const distance of [2.2, 4.5, 7]) {
      for (const ndcY of [0.25, 0.5]) expect(ndcOf(distance, liftToward(distance, polar, ndcY))).toBeCloseTo(ndcY, 9);
    }
  });

  it('above the middle of a phone, the point is in the free half over the sheet', () => {
    const lift = liftToward(3, polar, 0.5);
    expect(lift).toBeGreaterThan(0);
    expect(ndcOf(3, lift)).toBeGreaterThan(0);
  });
});

describe('shiftAcross (#190)', () => {
  const pose = { pos: { x: -464, y: 9, z: -175 }, target: { x: -467, y: 0, z: -187 } };
  const distance = Math.hypot(3, 9, 12);
  // Px to the right of the middle of the screen at which a camera in `from` sees `point`.
  const screenX = (from: typeof pose, point: { x: number; y: number; z: number }, viewportHeight: number) => {
    const f = { x: from.target.x - from.pos.x, y: from.target.y - from.pos.y, z: from.target.z - from.pos.z };
    const len = Math.hypot(f.x, f.y, f.z);
    const flat = Math.hypot(f.x, f.z);
    const right = { x: -f.z / flat, z: f.x / flat };
    const v = { x: point.x - from.pos.x, y: point.y - from.pos.y, z: point.z - from.pos.z };
    const depth = (v.x * f.x + v.y * f.y + v.z * f.z) / len;
    const across = v.x * right.x + v.z * right.z;
    return (across / depth / Math.tan((FOV * Math.PI) / 360)) * (viewportHeight / 2);
  };

  it('does not move the pose for no shift', () => {
    expect(shiftAcross(pose, 0, 900)).toEqual(pose);
  });

  it('shows the old target that many px to the left of the middle, on any screen height', () => {
    for (const viewportHeight of [390, 900, 1064]) {
      for (const px of [120, 284]) expect(screenX(shiftAcross(pose, px, viewportHeight), pose.target, viewportHeight)).toBeCloseTo(-px, 6);
    }
  });

  it('keeps the height, the distance and the direction of the camera', () => {
    const moved = shiftAcross(pose, 284, 900);
    expect(moved.pos.y).toBe(pose.pos.y);
    expect(moved.target.y).toBe(pose.target.y);
    expect(moved.pos.x - moved.target.x).toBeCloseTo(3, 9);
    expect(moved.pos.z - moved.target.z).toBeCloseTo(12, 9);
    expect(Math.hypot(moved.pos.x - moved.target.x, moved.pos.y - moved.target.y, moved.pos.z - moved.target.z)).toBeCloseTo(distance, 9);
  });

  it('leaves a camera straight above its target where it is: it has no side', () => {
    const above = { pos: { x: 5, y: 40, z: 7 }, target: { x: 5, y: 0, z: 7 } };
    expect(shiftAcross(above, 284, 900)).toEqual(above);
  });
});
