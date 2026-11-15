import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import '../src/voyage/sightingModels.ts';
import { POLY_MIN_COLORS, POLY_MIN_TRIS, normalOf } from '../src/voyage/lowPoly.ts';
import { poseForHotspot } from '../src/orcadas/Hotspots.tsx';
import {
  BAY_BIRD_SPEED_MULTIPLIER,
  CAMERA_TRANSITION_SECONDS,
  ERA_VISIBLE_THRESHOLD,
  OBSERVER_VISIBLE_START_U,
  OBSERVER_WALK_SECONDS,
  activeBayBirds,
  bayBirdPose,
  buildObserverWalkRoute,
  buildPathSnowFootprintsTris,
  createObserverState,
  hasSnowOnPath,
  observerStridePose,
  sampleObserverWalk,
  stepEraPresence,
  stepObserverState,
  syncObserverState,
} from '../src/orcadas/lifeDetails.ts';
import {
  PATH_CROWN_Y,
  buildStationPath,
  evaluateIsthmusTerrain,
} from '../src/orcadas/stationModels.ts';

const heightAt = (x: number, z: number) => evaluateIsthmusTerrain(x, z).y;

describe('Detail 4: Observer walk route along the new path', () => {
  const pathData = buildStationPath();
  const route = buildObserverWalkRoute(pathData, heightAt);

  it('connects module-360745961 door to Stevenson screen using buildStationPath waypoints', () => {
    const mod1Spur = pathData.spurCenterlines.find((s) => s.id === 'module-360745961')!;
    const screenSpur = pathData.spurCenterlines.find((s) => s.id === 'screen')!;

    expect(route.totalLength).toBeGreaterThan(5);
    const start = sampleObserverWalk(route, 0);
    const end = sampleObserverWalk(route, 1);

    const mod1Door = mod1Spur.centerline[mod1Spur.centerline.length - 1];
    const screenDoor = screenSpur.centerline[screenSpur.centerline.length - 1];

    expect(start.x).toBeCloseTo(mod1Door[0], 4);
    expect(start.z).toBeCloseTo(mod1Door[1], 4);
    expect(start.atScreen).toBe(false);

    expect(end.x).toBeCloseTo(screenDoor[0], 4);
    expect(end.z).toBeCloseTo(screenDoor[1], 4);
    expect(end.atScreen).toBe(true);
  });

  it('keeps feet seated near path crown height and flips heading when returning', () => {
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      const forward = sampleObserverWalk(route, u, false);
      const back = sampleObserverWalk(route, u, true);
      expect(forward.y).toBeCloseTo(heightAt(forward.x, forward.z) + PATH_CROWN_Y * 0.92, 4);
      if (u < 0.85) {
        const diff = Math.abs(Math.atan2(Math.sin(back.yaw - forward.yaw), Math.cos(back.yaw - forward.yaw)));
        expect(diff).toBeCloseTo(Math.PI, 4);
      }
    }

    const idleReading = observerStridePose(route.totalLength, 0, true);
    expect(idleReading.leftLegSwing).toBe(0);
    expect(idleReading.rightArmSwing).toBeGreaterThan(0.5);

    const walking = observerStridePose(1.0, 1, false);
    expect(Math.abs(walking.leftLegSwing) + Math.abs(walking.rightLegSwing)).toBeGreaterThan(0);
  });

  it('starts the visible walk in the final path stretch inside desktop and mobile screen framing', () => {
    expect(OBSERVER_VISIBLE_START_U).toBeGreaterThan(0.7);
    expect(OBSERVER_VISIBLE_START_U).toBeLessThan(1);

    const startWalk = sampleObserverWalk(route, OBSERVER_VISIBLE_START_U);
    expect(startWalk.atScreen).toBe(false);

    const checkFrame = (aspect: number, mobile: boolean, expanded: boolean) => {
      const pose = poseForHotspot('screen', mobile, expanded, false, false);
      const cam = new PerspectiveCamera(42, aspect, 0.5, 400);
      cam.position.set(...pose.pos);
      cam.lookAt(...pose.target);
      cam.updateMatrixWorld(true);
      cam.updateProjectionMatrix();
      return new Vector3(startWalk.x, startWalk.y + 0.3, startWalk.z).project(cam);
    };

    const desktopNdc = checkFrame(1440 / 900, false, false);
    expect(desktopNdc.x).toBeGreaterThan(-0.9);
    expect(desktopNdc.x).toBeLessThan(0.35);
    expect(Math.abs(desktopNdc.y)).toBeLessThan(0.9);

    const mobileNdc = checkFrame(390 / 844, true, true);
    expect(Math.abs(mobileNdc.x)).toBeLessThan(0.9);
    expect(Math.abs(mobileNdc.y)).toBeLessThan(0.95);
  });

  it('matches the camera zoom duration and snaps directly when reduced or noZoom', () => {
    expect(OBSERVER_WALK_SECONDS).toBe(CAMERA_TRANSITION_SECONDS);

    let state = createObserverState({ hasMainHouse: true, screenOpen: false, reduced: false });
    state = syncObserverState(state, { hasMainHouse: true, screenOpen: true, reduced: false });
    expect(state.progress).toBe(OBSERVER_VISIBLE_START_U);
    expect(state.doorReady).toBe(false);
    expect(state.isMoving).toBe(true);

    const dt = 0.05;
    const halfSteps = Math.floor(OBSERVER_WALK_SECONDS / 2 / dt);
    for (let i = 0; i < halfSteps; i++) {
      state = stepObserverState(state, route.totalLength, dt, {
        hasMainHouse: true,
        screenOpen: true,
        reduced: false,
      }).state;
    }
    expect(state.progress).toBeLessThan(1);
    expect(state.doorReady).toBe(false);

    const remainingSteps = Math.ceil(OBSERVER_WALK_SECONDS / dt) - halfSteps + 1;
    for (let i = 0; i < remainingSteps; i++) {
      state = stepObserverState(state, route.totalLength, dt, {
        hasMainHouse: true,
        screenOpen: true,
        reduced: false,
      }).state;
    }
    expect(state.progress).toBe(1);
    expect(state.doorReady).toBe(true);
    expect(state.isMoving).toBe(false);

    // Without zoom (already framed or reduced motion), observer appears directly at screen with door open.
    const noZoomState = syncObserverState(
      createObserverState({ hasMainHouse: true, screenOpen: false, reduced: false }),
      { hasMainHouse: true, screenOpen: true, reduced: false, noZoom: true },
    );
    expect(noZoomState.progress).toBe(1);
    expect(noZoomState.doorReady).toBe(true);
    expect(noZoomState.isMoving).toBe(false);

    const reducedState = syncObserverState(
      createObserverState({ hasMainHouse: true, screenOpen: false, reduced: true }),
      { hasMainHouse: true, screenOpen: true, reduced: true },
    );
    expect(reducedState.progress).toBe(1);
    expect(reducedState.doorReady).toBe(true);
    expect(reducedState.isMoving).toBe(false);
  });

  it('hides with modern buildings in pre-modern eras, never walks to an absent house, and opens door directly', () => {
    // Era without main house: no observer, door opens immediately when reading starts.
    const preModern = createObserverState({ hasMainHouse: false, screenOpen: true, reduced: false });
    expect(preModern.eraPresence).toBe(0);
    expect(preModern.progress).toBe(0);
    expect(preModern.isMoving).toBe(false);
    expect(preModern.doorReady).toBe(true);

    // Mid-walk in modern era -> jump to 1903 (time travel).
    let state = createObserverState({ hasMainHouse: true, screenOpen: false, reduced: false });
    state = syncObserverState(state, { hasMainHouse: true, screenOpen: true, reduced: false });
    state = stepObserverState(state, route.totalLength, 0.05, {
      hasMainHouse: true,
      screenOpen: true,
      reduced: false,
    }).state;
    const frozenProgress = state.progress;
    expect(frozenProgress).toBeGreaterThan(OBSERVER_VISIBLE_START_U);

    state = syncObserverState(state, { hasMainHouse: false, screenOpen: false, reduced: false });
    expect(state.movingBackward).toBe(false);
    expect(state.isMoving).toBe(false);

    let buildingPresence = 1;
    for (let i = 0; i < 60; i++) {
      const step = stepObserverState(state, route.totalLength, 0.05, {
        hasMainHouse: false,
        screenOpen: false,
        reduced: false,
      });
      state = step.state;
      buildingPresence = stepEraPresence(buildingPresence, false, 0.05, false);
      expect(state.eraPresence).toBeCloseTo(buildingPresence, 6);
      expect(state.progress).toBe(frozenProgress);
      expect(state.movingBackward).toBe(false);
    }
    expect(state.eraPresence).toBeLessThanOrEqual(ERA_VISIBLE_THRESHOLD);

    // Returning to modern era while temperature reading is still open: already at screen, no repeat walk.
    const backOpen = syncObserverState(state, { hasMainHouse: true, screenOpen: true, reduced: false });
    expect(backOpen.progress).toBe(1);
    expect(backOpen.doorReady).toBe(true);
    expect(backOpen.isMoving).toBe(false);

    // Returning to modern era when reading is not open: inside (not visible), as at start.
    const backClosed = syncObserverState(state, { hasMainHouse: true, screenOpen: false, reduced: false });
    expect(backClosed.progress).toBe(0);
    expect(backClosed.doorReady).toBe(false);
    expect(backClosed.isMoving).toBe(false);
  });
});

describe('Detail 5: Snow patches & footprints on snowy months', () => {
  it('activates only on months matching snowDensityForMonth > 0', () => {
    // Summer months (Jan, Feb, Mar, Dec) mean temp > -0.5 C
    for (const m of [1, 2, 3, 12]) {
      expect(hasSnowOnPath(m)).toBe(false);
    }
    // Cold months (Apr..Nov) mean temp < -0.5 C
    for (const m of [4, 5, 6, 7, 8, 9, 10, 11]) {
      expect(hasSnowOnPath(m)).toBe(true);
    }
  });

  it('builds low-poly snow footprints seated on the path with upward-facing tops', () => {
    const pathData = buildStationPath();
    const tris = buildPathSnowFootprintsTris(pathData, heightAt);

    expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    const colors = new Set(tris.map((t) => t[3]));
    expect(colors.size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);

    let upwardFaces = 0;
    for (const tri of tris) {
      const n = normalOf(tri);
      if (n[1] > 0.5) upwardFaces++;
      for (const [vx, vy, vz] of [tri[0], tri[1], tri[2]]) {
        expect(Number.isFinite(vy)).toBe(true);
        // Should stay close to terrain + path crown height without floating high
        expect(vy - heightAt(vx, vz)).toBeLessThan(PATH_CROWN_Y + 0.05);
      }
    }
    expect(upwardFaces).toBeGreaterThan(20);
  });
});

describe('Detail 8: Bay birds soaring over Bahía Scotia', () => {
  it('respects active species in the diorama month', () => {
    expect(activeBayBirds(['adelie', 'weddell'])).toEqual([]);
    const winter = activeBayBirds(['snowPetrel', 'adelie']);
    expect(winter.length).toBe(5);
    expect(winter.every((b) => b.species === 'snowPetrel')).toBe(true);

    const summer = activeBayBirds(['skua', 'snowPetrel']);
    expect(summer.some((b) => b.species === 'skua')).toBe(true);
    expect(summer.some((b) => b.species === 'snowPetrel')).toBe(true);
  });

  it('soars at credible speed over Bahía Scotia (z > 4), flaps actively, and freezes under reduced motion', () => {
    expect(BAY_BIRD_SPEED_MULTIPLIER).toBeGreaterThanOrEqual(2.5);
    expect(BAY_BIRD_SPEED_MULTIPLIER).toBeLessThanOrEqual(3.0);

    for (let i = 0; i < 5; i++) {
      const p0 = bayBirdPose(i, 'skua', 0, false);
      const p1 = bayBirdPose(i, 'skua', 0.5, false);
      expect(p0.z).toBeGreaterThan(4);
      expect(p1.z).toBeGreaterThan(4);

      const speed = Math.hypot(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z) / 0.5;
      expect(speed).toBeGreaterThan(0.8);
      expect(speed).toBeLessThan(5.0);

      // Wingbeat range reflects active flapping across a cycle
      let minWing = Infinity;
      let maxWing = -Infinity;
      for (let s = 0; s < 40; s++) {
        const w = bayBirdPose(i, 'snowPetrel', s * 0.08, false).wingAngle;
        if (w < minWing) minWing = w;
        if (w > maxWing) maxWing = w;
      }
      expect(maxWing - minWing).toBeGreaterThan(0.3);

      // Reduced motion keeps exact static pose across times
      const r0 = bayBirdPose(i, 'snowPetrel', 0, true);
      const r25 = bayBirdPose(i, 'snowPetrel', 25, true);
      expect(r25).toEqual(r0);
    }
  });
});
