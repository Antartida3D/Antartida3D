import { useEffect, useLayoutEffect, type RefObject } from 'react';
import type { Box3 } from 'three';
import { useThree } from '@react-three/fiber';
import { CameraControlsImpl, type CameraControls } from '@react-three/drei';
import {
  TILT_SCREEN_FRACTION,
  moveTwoFingers,
  startTwoFingers,
  type TwoFingerState,
} from '@antartida/core';

export interface MapGesturesOptions {
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  minAzimuthAngle?: number;
  maxAzimuthAngle?: number;
  smoothTime?: number;
  boundary?: Box3;
  invalidate?: () => void;
}

/**
 * Configures map-style pointer and touch gestures on CameraControls: left drag or one finger
 * pans over the ground, right drag orbits, and two fingers pinch to zoom, twist to turn, or
 * drag together vertically to tilt.
 */
export function useMapGestures(
  controlsRef: RefObject<CameraControls | null>,
  options: MapGesturesOptions = {}
) {
  const gl = useThree((s) => s.gl);
  const r3fInvalidate = useThree((s) => s.invalidate);
  const invalidate = options.invalidate ?? r3fInvalidate;
  const {
    minDistance,
    maxDistance,
    minPolarAngle,
    maxPolarAngle,
    minAzimuthAngle,
    maxAzimuthAngle,
    smoothTime,
    boundary,
  } = options;

  useLayoutEffect(() => {
    const cc = controlsRef.current;
    if (!cc) return;

    // Dragging moves over the ground; the right button turns and tilts. Two fingers are handled
    // below because CameraControls' built-in action cannot tell a twist from a drag.
    const { ACTION } = CameraControlsImpl;
    cc.mouseButtons.left = ACTION.SCREEN_PAN;
    cc.mouseButtons.right = ACTION.ROTATE;
    cc.touches.one = ACTION.TOUCH_SCREEN_PAN;
    cc.touches.two = ACTION.NONE;

    if (minDistance !== undefined) cc.minDistance = minDistance;
    if (maxDistance !== undefined) cc.maxDistance = maxDistance;
    if (minPolarAngle !== undefined) cc.minPolarAngle = minPolarAngle;
    if (maxPolarAngle !== undefined) cc.maxPolarAngle = maxPolarAngle;
    if (minAzimuthAngle !== undefined) cc.minAzimuthAngle = minAzimuthAngle;
    if (maxAzimuthAngle !== undefined) cc.maxAzimuthAngle = maxAzimuthAngle;
    if (smoothTime !== undefined) cc.smoothTime = smoothTime;
    if (boundary !== undefined) cc.setBoundary(boundary);
  }, [
    controlsRef,
    minDistance,
    maxDistance,
    minPolarAngle,
    maxPolarAngle,
    minAzimuthAngle,
    maxAzimuthAngle,
    smoothTime,
    boundary,
  ]);

  // Two fingers, like in a globe app: pinching zooms, twisting turns the camera and dragging both
  // up or down tilts it. The gesture itself is in @antartida/core (gestures.ts).
  useEffect(() => {
    const el = gl.domElement;
    const fingers = new Map<number, { x: number; y: number }>();
    let gesture: TwoFingerState | null = null;
    // Distance the pinch is heading to, and the easing to give back when the fingers lift.
    let goal = 0;
    let easing: number | null = null;
    const pair = () => [...fingers.values()] as [{ x: number; y: number }, { x: number; y: number }];

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      gesture = fingers.size === 2 ? startTwoFingers(...pair()) : null;
      const cc = controlsRef.current;
      if (gesture && cc && easing === null) {
        goal = cc.distance;
        // As quick as the library's own drags. It still eases a little: with no easing at all the
        // library never reports that the camera came to rest, and markers would not regroup.
        easing = cc.smoothTime;
        cc.smoothTime = cc.draggingSmoothTime;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!fingers.has(e.pointerId)) return;
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const cc = controlsRef.current;
      if (!gesture || !cc || !cc.enabled) return;
      const step = moveTwoFingers(gesture, ...pair());
      gesture = step.state;
      if (step.zoom !== 1) {
        goal = Math.min(cc.maxDistance, Math.max(cc.minDistance, goal / step.zoom));
        void cc.dollyTo(goal, true);
      }
      // Fingers up tilt the view towards the horizon; the whole range takes TILT_SCREEN_FRACTION of the screen.
      const polarRange = cc.maxPolarAngle - cc.minPolarAngle;
      const tilt = (-step.tilt * polarRange) / (TILT_SCREEN_FRACTION * Math.max(el.clientHeight, 1));
      if (step.turn !== 0 || tilt !== 0) void cc.rotate(step.turn, tilt, true);
      invalidate();
    };

    const onUp = (e: PointerEvent) => {
      if (!fingers.delete(e.pointerId)) return;
      gesture = null;
      const cc = controlsRef.current;
      if (cc && easing !== null) cc.smoothTime = easing;
      easing = null;
    };

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [gl, invalidate, controlsRef]);
}
