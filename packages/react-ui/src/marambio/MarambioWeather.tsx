import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, Color, FogExp2, Points, PointsMaterial, Vector3 } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import {
  MARAMBIO_LAT,
  MARAMBIO_RUNWAY_BEARING_DEG,
  createSeededRng,
  marambioBlizzard,
  midMonthDayOfYear,
  shouldTick,
  solarAzimuthDeg,
  solarElevationDeg,
} from '@antartida/core';

/** Solar hour the scene is drawn at: early afternoon, with the sun past north. */
const SCENE_HOUR = 13;

/** A compass bearing as a direction on the stage, whose x axis is the runway and z its south-east side. */
const bearingOnStage = (bearingDeg: number): [number, number] => {
  const a = ((bearingDeg - MARAMBIO_RUNWAY_BEARING_DEG) * Math.PI) / 180;
  return [Math.cos(a), Math.sin(a)];
};

/** Direction to the sun at Marambio in the middle of a month, and how high it stands. */
export function marambioSun(month: number): { dir: Vector3; elevationDeg: number } {
  const day = midMonthDayOfYear(month);
  const elevationDeg = solarElevationDeg(MARAMBIO_LAT, day, SCENE_HOUR);
  const [x, z] = bearingOnStage(solarAzimuthDeg(MARAMBIO_LAT, day, SCENE_HOUR));
  const el = (elevationDeg * Math.PI) / 180;
  return { dir: new Vector3(Math.cos(el) * x, Math.sin(el), Math.cos(el) * z).normalize(), elevationDeg };
}

/**
 * The blizzard blows from the south-west, the side most storms come from at Marambio (Asmi et al.,
 * Tellus B 2018, pending human review): towards the north-east, with snow drifting low.
 */
const WIND: [number, number] = bearingOnStage(45);

/** Box round the base where the snow flies, in stage units. */
const BOX = { x: [-80, 80], y: [0, 36], z: [-55, 80] } as const;
const MAX_FLAKES = 2600;
/** Speed of the snow at the strongest month, stage units per second. */
const MAX_SPEED = 42;
const FPS = 30;

/** Fog of the blizzard: almost none in summer, a white-out at a hundred units in July. */
const FOG_AT_PEAK = 0.0085;
const FOG_LIGHT = new Color('#dfe6ea');
/** The blizzard of the button (#263): all the snow, faster and bigger, and a pale haze that leaves the base faint. */
const STORM_FOG = 0.013;
const STORM_SPEED = 1.7;
const STORM_FLAKE = 0.8;
/** Camera distance the storm haze is set for: farther, it thins, so a phone's wider view still shows the base faint. */
const STORM_FOG_DISTANCE = 100;
const FLAKE = 0.45;
const FOG_DIM = new Color('#8e9ba5');

/**
 * Blowing snow and the haze it makes, as strong as the month's days of «ventisca alta» in the SMN
 * normals (marambioBlizzard). A simulation: it does not show the real strength of the wind. With
 * reduced motion the snow stands still. `storm` is the blizzard of the button (#263): every flake,
 * faster, and a thick haze.
 */
export function Blizzard({ month, reduced, storm = false }: { month: number; reduced: boolean; storm?: boolean }) {
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const intensity = storm ? 1 : marambioBlizzard(month);
  const count = Math.round(MAX_FLAKES * intensity);
  const points = useRef<Points>(null);

  const { geometry, material, speeds } = useMemo(() => {
    const rng = createSeededRng(160 + month);
    const positions = new Float32Array(MAX_FLAKES * 3);
    const speeds = new Float32Array(MAX_FLAKES);
    for (let i = 0; i < MAX_FLAKES; i++) {
      positions[i * 3] = BOX.x[0] + rng() * (BOX.x[1] - BOX.x[0]);
      // Most of the snow goes low over the ground: drifting snow more than falling snow.
      positions[i * 3 + 1] = BOX.y[0] + rng() ** 2 * (BOX.y[1] - BOX.y[0]);
      positions[i * 3 + 2] = BOX.z[0] + rng() * (BOX.z[1] - BOX.z[0]);
      speeds[i] = 0.6 + rng() * 0.8;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    const material = new PointsMaterial({ color: '#f7fafb', size: FLAKE, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
    return { geometry, material, speeds };
  }, [month]);
  useEffect(() => {
    material.size = storm ? STORM_FLAKE : FLAKE;
    invalidate();
  }, [material, storm, invalidate]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );
  useEffect(() => geometry.setDrawRange(0, count), [geometry, count]);

  // The haze: a fog over everything but the sky, darker when the sun is low.
  useLayoutEffect(() => {
    const { elevationDeg } = marambioSun(month);
    // In the storm the haze is the snow itself: pale, whatever the sun.
    const light = storm ? 1 : Math.min(1, Math.max(0, (elevationDeg + 2) / 30));
    scene.fog = new FogExp2(FOG_DIM.clone().lerp(FOG_LIGHT, light).getHex(), storm ? STORM_FOG : FOG_AT_PEAK * intensity);
    invalidate();
    return () => {
      scene.fog = null;
    };
  }, [scene, month, intensity, storm, invalidate]);

  // Snow moves only while it is drawn: a clock asks for frames, like the sea of the map.
  useEffect(() => {
    if (reduced || count === 0) return;
    let id = 0;
    let last = 0;
    const loop = (now: number) => {
      if (!document.hidden && shouldTick(now, last, FPS)) {
        last = now;
        invalidate();
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, count, invalidate]);

  useFrame(({ camera }, delta) => {
    if (storm && scene.fog instanceof FogExp2) {
      const far = Math.max(STORM_FOG_DISTANCE, camera.position.length());
      scene.fog.density = (STORM_FOG * STORM_FOG_DISTANCE) / far;
    }
    if (reduced || count === 0) return;
    const step = Math.min(delta, 0.1) * MAX_SPEED * (0.4 + 0.6 * intensity) * (storm ? STORM_SPEED : 1);
    const pos = geometry.getAttribute('position') as BufferAttribute;
    const a = pos.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const s = step * speeds[i];
      let x = a[i * 3] + WIND[0] * s;
      let y = a[i * 3 + 1] - s * 0.08;
      let z = a[i * 3 + 2] + WIND[1] * s;
      // Out of the box downwind, back in upwind.
      if (x > BOX.x[1]) x -= BOX.x[1] - BOX.x[0];
      if (z < BOX.z[0]) z += BOX.z[1] - BOX.z[0];
      if (z > BOX.z[1]) z -= BOX.z[1] - BOX.z[0];
      if (y < BOX.y[0]) y = BOX.y[1] * 0.6;
      a[i * 3] = x;
      a[i * 3 + 1] = y;
      a[i * 3 + 2] = z;
    }
    pos.needsUpdate = true;
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
