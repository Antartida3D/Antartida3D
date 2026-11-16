import { useEffect, useLayoutEffect, type RefObject } from 'react';
import { Plane, Raycaster, Vector2, Vector3, type Box3 } from 'three';
import { useThree } from '@react-three/fiber';
import { CameraControlsImpl, type CameraControls } from '@react-three/drei';
import {
  DOUBLE_TAP_ZOOM,
  ONE_FINGER_IDLE,
  TILT_SCREEN_FRACTION,
  moveTwoFingers,
  oneFingerDown,
  oneFingerMove,
  oneFingerUp,
  prefersReducedMotion,
  startTwoFingers,
  type OneFingerZoomState,
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

/** The point a one-finger zoom goes around is at most this many camera distances from the target. */
const ZOOM_AROUND_MAX = 4;

/** Where the camera was when a one-finger zoom started, and the ground point it zooms around. */
interface ZoomPose {
  pos: Vector3;
  target: Vector3;
  at: Vector3;
}

/**
 * The camera's end pose and the ground under screen point (x, y): the level plane through the
 * target, which is where the camera looks. Above the horizon, the target itself: a centred zoom.
 */
function zoomPose(cc: CameraControls, el: HTMLElement, x: number, y: number): ZoomPose {
  const pos = cc.getPosition(new Vector3());
  const target = cc.getTarget(new Vector3());
  const r = el.getBoundingClientRect();
  const ndc = new Vector2(((x - r.left) / Math.max(r.width, 1)) * 2 - 1, 1 - ((y - r.top) / Math.max(r.height, 1)) * 2);
  const ray = new Raycaster();
  ray.setFromCamera(ndc, cc.camera);
  const at = ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), -target.y), new Vector3()) ?? target.clone();
  // Near the horizon the ground point runs off far away: zooming around it would fling the view.
  const far = ZOOM_AROUND_MAX * pos.distanceTo(target);
  if (at.distanceTo(target) > far) at.sub(target).setLength(far).add(target);
  return { pos, target, at };
}

/**
 * Zooms by `factor` from `from` (over 1 comes closer), keeping its ground point where it is on
 * screen: camera and target both slide towards that point, so nothing turns or tilts. The
 * distance stays within cc.minDistance and cc.maxDistance.
 */
function zoomAround(cc: CameraControls, from: ZoomPose, factor: number, smooth: boolean) {
  const distance = from.pos.distanceTo(from.target);
  const next = Math.min(cc.maxDistance, Math.max(cc.minDistance, distance / factor));
  const s = next / Math.max(distance, 1e-6);
  const pos = from.pos.clone().sub(from.at).multiplyScalar(s).add(from.at);
  const target = from.target.clone().sub(from.at).multiplyScalar(s).add(from.at);
  void cc.setLookAt(pos.x, pos.y, pos.z, target.x, target.y, target.z, smooth);
}

/**
 * Configures map-style pointer and touch gestures on CameraControls: left drag or one finger
 * pans over the ground, right drag orbits, and two fingers pinch to zoom, twist to turn, or
 * drag together vertically to tilt. One finger also zooms (#165): a double tap comes one step
 * closer around the tapped point, and the second touch of a double tap, dragged up or down,
 * zooms in or out.
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
  // up or down tilts it. One finger zooms with a double tap, or by dragging the second touch of
  // one. The gestures themselves are in @antartida/core (gestures.ts).
  useEffect(() => {
    const el = gl.domElement;
    const fingers = new Map<number, { x: number; y: number }>();
    let gesture: TwoFingerState | null = null;
    // Distance the pinch is heading to, and the easing to give back when the fingers lift.
    let goal = 0;
    let easing: number | null = null;
    // One finger: the taps so far, and the second touch of a double tap while it is down, with
    // the library's one-finger action to give back.
    let taps: OneFingerZoomState = ONE_FINGER_IDLE;
    let second: { from: ZoomPose; pan: CameraControls['touches']['one'] } | null = null;
    const pair = () => [...fingers.values()] as [{ x: number; y: number }, { x: number; y: number }];

    // As quick as the library's own drags. It still eases a little: with no easing at all the
    // library never reports that the camera came to rest, and markers would not regroup.
    const quick = (cc: CameraControls) => {
      if (easing !== null) return;
      easing = cc.smoothTime;
      cc.smoothTime = cc.draggingSmoothTime;
    };
    const unquick = (cc: CameraControls | null) => {
      if (cc && easing !== null) cc.smoothTime = easing;
      easing = null;
    };
    const endSecond = (cc: CameraControls | null) => {
      if (!second) return;
      if (cc) cc.touches.one = second.pan;
      second = null;
      unquick(cc);
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const cc = controlsRef.current;
      if (fingers.size === 1) {
        taps = oneFingerDown(taps, { x: e.clientX, y: e.clientY, t: e.timeStamp });
        if (taps.down?.second && cc?.enabled) {
          // The second touch zooms instead of panning. The library reads its one-finger action
          // on every move, so turning it off here, before the finger moves, is enough.
          second = { from: zoomPose(cc, el, e.clientX, e.clientY), pan: cc.touches.one };
          cc.touches.one = CameraControlsImpl.ACTION.NONE;
          quick(cc);
        }
        return;
      }
      // Another finger: a pinch, not a tap.
      taps = ONE_FINGER_IDLE;
      endSecond(cc);
      gesture = fingers.size === 2 ? startTwoFingers(...pair()) : null;
      if (gesture && cc && easing === null) {
        goal = cc.distance;
        quick(cc);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!fingers.has(e.pointerId)) return;
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const cc = controlsRef.current;
      if (fingers.size === 1) {
        const step = oneFingerMove(taps, { x: e.clientX, y: e.clientY });
        taps = step.state;
        if (second && cc?.enabled && step.zoom !== 1) {
          zoomAround(cc, second.from, step.zoom, true);
          invalidate();
        }
        return;
      }
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
      const lone = fingers.size === 1;
      if (!fingers.delete(e.pointerId)) return;
      gesture = null;
      const cc = controlsRef.current;
      const from = second?.from;
      endSecond(cc);
      unquick(cc);
      if (!lone) return;
      if (e.type !== 'pointerup') {
        taps = ONE_FINGER_IDLE;
        return;
      }
      const up = oneFingerUp(taps, { x: e.clientX, y: e.clientY, t: e.timeStamp });
      taps = up.state;
      // A double tap: one step closer around the tapped point, at once with reduced motion.
      if (up.doubleTap && from && cc?.enabled) {
        zoomAround(cc, from, DOUBLE_TAP_ZOOM, !prefersReducedMotion());
        invalidate();
      }
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
      endSecond(controlsRef.current);
      unquick(controlsRef.current);
    };
  }, [gl, invalidate, controlsRef]);
}
