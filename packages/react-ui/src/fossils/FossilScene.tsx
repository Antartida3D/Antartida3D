import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Color, Group, InstancedMesh, Matrix4,
  MeshBasicMaterial, Object3D, Points, PointsMaterial, ShaderMaterial, SphereGeometry, Vector2, Vector3,
} from 'three';
import { shouldTick, type FossilState, type FossilView } from '@antartida/core';
import { InkEffect } from '../map3d/InkEffect.ts';
import { ViewShift, type ViewShiftPx } from '../sceneFrame.tsx';
import { stationSkyFragmentShader, stationSkyVertexShader } from '../orcadas/stationSky.glsl.ts';
import { buildBoxGeometry, vehicleMaterial, type Box } from '../voyage/vehicles.ts';
import { block, boxShade, buildPolyGeometry, chamferRect, chunk, mirrorZ, prism, strut, type Tri } from '../voyage/lowPoly.ts';
import {
  PLESIO_SWIM, STILL_TIME, ammonitePose, columnWave, crinoidSway, dinoPose, geologistPose, plesioPose,
  restAmmonite, restDino, restGeologist, restPlesio, type Geologist, type Loop,
} from './fossilPoses.ts';
import {
  DISTANT_MESAS, FLOES, FLOE_TRIS, FOREST_PLANTS, WATER_LEVEL, buildFieldTris, buildForestTris, buildSeaFloorTris,
  fieldHeight, forestHeight, scatter, seaFloorHeight,
} from './fossilTerrain.ts';
import { FOSSIL_PALETTE as C, PLESIO_VERTEBRAE, plesioVertebra, type Parka } from './models.ts';
import {
  AMMONITE_ARM_COUNT, AMMONITE_BODY_TRIS, AMMONITE_FOSSIL_TRIS, DINO_HIPS, DINO_NECK, DINO_TAIL, DINO_TAIL_SEGMENT,
  GEOLOGIST_HIP, GEOLOGIST_NECK, GEOLOGIST_SHOULDER, geologistPolyParts,
  PLESIO_FLIPPERS, PLESIO_NECK, PLESIO_NECK_LENGTH, PLESIO_NECK_SEGMENTS, STAR_TRIS, ammoniteArm, dinosaurParts,
  plesiosaurParts,
} from './lowPolyFossils.ts';
import {
  BRACHIOPOD_TRIS, BROADLEAF_TRIS, BRYOZOAN_TRIS, CHITON_TRIS, CONIFER_TRIS, CRINOID_CROWN_TRIS, CRINOID_STALK_TRIS, CRINOID_TOP,
  CRATE_TRIS, CYCAD_TRIS, DINO_BONES_TRIS, FERN_TRIS, INOCERAMUS_TRIS, JAW_TOOTH_CENTER, JAW_TRIS, LOG_TRIS, MAST_TRIS,
  PLESIO_BONES_TRIS, SLED_TRIS, STAR_SLAB_TRIS, TENT_TRIS, URCHIN_TRIS, VERTEBRA_TRIS,
} from './lowPolyScenery.ts';

type Vec3 = readonly [number, number, number];
type World = 'field' | 'forest' | 'cretaceous-sea' | 'eocene-sea';

/** Which landscape each stop is drawn in: today's field camp, or one of the reconstructed pasts. */
export function worldOf(view: FossilView, state: Pick<FossilState, 'habitat' | 'reconstructed'>): World {
  switch (view) {
    case 'ammonite': case 'plesiosaur': return 'cretaceous-sea';
    case 'seafloor': return 'eocene-sea';
    case 'dinosaur': return state.reconstructed ? 'forest' : 'field';
    case 'habitat': return state.habitat === 'sea' ? 'cretaceous-sea' : state.habitat === 'land' ? 'forest' : 'eocene-sea';
    default: return 'field';
  }
}

// --- Shared pieces --------------------------------------------------------------------------

/** Geometries of small repeated parts, built once and shared by every figure that uses them. */
const parts = new Map<string, BufferGeometry>();
/** Geometry of a low-poly part, built once: faces shaded like the boxes of the other dioramas (#116). */
function polyGeometry(key: string, tris: () => readonly Tri[]): BufferGeometry {
  let g = parts.get(key);
  if (!g) { g = buildPolyGeometry(tris(), boxShade); parts.set(key, g); }
  return g;
}
/** A repeated low-poly model: the geometry is shared. */
function PolyProp({ id, tris, position, scale = 1, rotation = [0, 0, 0] }: {
  id: string; tris: readonly Tri[]; position: Vec3; scale?: number; rotation?: Vec3;
}) {
  return <mesh geometry={polyGeometry(id, () => tris)} material={vehicleMaterial} position={[...position]} scale={scale} rotation={[...rotation]} />;
}

/** A static low-poly model (a ground, far islands) built once per mount and released on unmount. */
function PolyModel({ tris, scale = 1 }: { tris: readonly Tri[]; scale?: number }) {
  const geometry = useMemo(() => buildPolyGeometry(tris, boxShade), [tris]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={vehicleMaterial} scale={scale} />;
}

// The ground is a field of faces over this height: things stand on it as it is, not on steps.
const fieldY = fieldHeight;
const at = (x: number, z: number, lift = 0): Vec3 => [x, fieldY(x, z) + lift, z];

// Spots of the present-day field where each find waits.
const SPOT = {
  ammonite: [3.2, 2.2], plesio: [-4.2, 2.6], jaw: [6.2, 1.0], stars: [-0.6, 4.2], display: [-0.4, 1.4],
} as const;

// --- Sky, water and particles ---------------------------------------------------------------

function Sky({ sun, clouds, reduced }: { sun: Vec3; clouds: number; reduced: boolean }) {
  const geometry = useMemo(() => new SphereGeometry(96, 32, 20), []);
  const uniforms = useMemo(() => ({
    uSunDir: { value: new Vector3() }, uCloudCover: { value: 0.5 }, uTime: { value: 0 }, uWindVec: { value: new Vector2(0.6, 0.2) },
  }), []);
  const material = useMemo(() => new ShaderMaterial({
    vertexShader: stationSkyVertexShader, fragmentShader: stationSkyFragmentShader, uniforms, side: BackSide, depthWrite: false, fog: false,
  }), [uniforms]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useLayoutEffect(() => {
    uniforms.uSunDir.value.set(...sun).normalize();
    uniforms.uCloudCover.value = clouds;
  }, [sun, clouds, uniforms]);
  useFrame(({ clock }) => { if (!reduced) uniforms.uTime.value = clock.elapsedTime; });
  return <mesh geometry={geometry} material={material} renderOrder={-1} />;
}

/** Seen from below the surface: a gradient dome, light from above and a bright ceiling. */
function WaterDome({ top, mid, bottom }: { top: string; mid: string; bottom: string }) {
  const geometry = useMemo(() => {
    const g = new SphereGeometry(80, 24, 16);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const a = new Color(top), b = new Color(mid), c = new Color(bottom), out = new Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 80;
      if (y > 0) out.copy(b).lerp(a, Math.min(1, y * 1.6)); else out.copy(b).lerp(c, Math.min(1, -y * 2.4));
      colors.set([out.r, out.g, out.b], i * 3);
    }
    g.setAttribute('color', new BufferAttribute(colors, 3));
    return g;
  }, [top, mid, bottom]);
  const material = useMemo(() => new MeshBasicMaterial({ vertexColors: true, side: BackSide, depthWrite: false, fog: false }), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <mesh geometry={geometry} material={material} renderOrder={-1} />;
}

/** Shafts of light through the water: transparent boxes that sway slowly. */
function LightShafts({ reduced, color }: { reduced: boolean; color: string }) {
  const group = useRef<Group>(null);
  const material = useMemo(() => new MeshBasicMaterial({ color, transparent: true, opacity: 0.07, depthWrite: false, blending: AdditiveBlending, fog: false }), [color]);
  useEffect(() => () => material.dispose(), [material]);
  const shafts = useMemo(() => [[-6, -4], [-2, -6], [3, -3], [7, -7], [-9, -9], [10, -2], [1, -10]] as const, []);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g || reduced) return;
    g.children.forEach((c, i) => { c.rotation.z = 0.28 + Math.sin(clock.elapsedTime * 0.25 + i) * 0.06; });
  });
  return <group ref={group}>{shafts.map(([x, z], i) => (
    <mesh key={i} material={material} position={[x, 6, z]} rotation={[0, 0, 0.28]}><boxGeometry args={[0.7 + (i % 3) * 0.3, 18, 0.7]} /></mesh>
  ))}</group>;
}

type ParticleKind = 'snow' | 'bubbles' | 'leaves';
/** Snow over the field, bubbles rising in the sea, leaves and pollen drifting in the forest. */
function Particles({ kind, reduced }: { kind: ParticleKind; reduced: boolean }) {
  const count = kind === 'snow' ? 320 : kind === 'bubbles' ? 180 : 140;
  const points = useRef<Points>(null);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const h = (n: number) => { const s = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return s - Math.floor(s); };
      p.set([(h(1) - 0.5) * 36, h(2) * 14, (h(3) - 0.5) * 30 - 3], i * 3);
    }
    g.setAttribute('position', new BufferAttribute(p, 3));
    return g;
  }, [count]);
  const material = useMemo(() => new PointsMaterial({
    color: kind === 'snow' ? '#F7FAFB' : kind === 'bubbles' ? '#DDF2F4' : '#A9B86B',
    size: kind === 'leaves' ? 0.13 : kind === 'bubbles' ? 0.09 : 0.08, transparent: true, opacity: kind === 'bubbles' ? 0.55 : 0.8, depthWrite: false,
  }), [kind]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useFrame(({ clock }, delta) => {
    if (reduced || !points.current) return;
    const arr = (geometry.getAttribute('position') as BufferAttribute).array as Float32Array;
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      if (kind === 'snow') { arr[k] += 0.9 * dt; arr[k + 1] -= (0.7 + (i % 5) * 0.12) * dt; arr[k + 2] += 0.25 * dt; }
      else if (kind === 'bubbles') { arr[k] += Math.sin(t * 2 + i) * 0.2 * dt; arr[k + 1] += (0.5 + (i % 4) * 0.18) * dt; }
      else { arr[k] += (Math.sin(t * 0.8 + i) * 0.6 + 0.3) * dt; arr[k + 1] -= (0.35 + (i % 3) * 0.1) * dt; arr[k + 2] += Math.cos(t * 0.7 + i) * 0.3 * dt; }
      if (arr[k + 1] < -0.5) arr[k + 1] = 13.5;
      if (arr[k + 1] > 14) arr[k + 1] = 0;
      if (arr[k] > 18) arr[k] -= 36;
      if (arr[k + 2] > 12) arr[k + 2] -= 30;
    }
    (geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
  });
  if (reduced) return null;
  return <points ref={points} geometry={geometry} material={material} />;
}

// --- People ---------------------------------------------------------------------------------

function GeologistFigure({ who, parka, beard, scale = 1.1, reduced, heightAt = fieldY }: {
  who: Geologist; parka: Parka; beard: boolean; scale?: number; reduced: boolean; heightAt?: (x: number, z: number) => number;
}) {
  const key = `${parka}-${beard}`;
  const p = useMemo(() => geologistPolyParts(parka, beard), [parka, beard]);
  const geo = {
    torso: polyGeometry(`geo-torso-${key}`, () => p.torso.map(([a, b, c, col]): Tri => [
      [a[0], a[1] - GEOLOGIST_HIP[1], a[2]], [b[0], b[1] - GEOLOGIST_HIP[1], b[2]], [c[0], c[1] - GEOLOGIST_HIP[1], c[2]], col])),
    head: polyGeometry(`geo-head-${key}`, () => p.head),
    leg: polyGeometry(`geo-leg-${key}`, () => p.leg),
    arm: polyGeometry(`geo-arm-${key}`, () => p.arm),
    hammer: polyGeometry(`geo-hammer-${key}`, () => p.hammerArm),
    brush: polyGeometry(`geo-brush-${key}`, () => p.brushArm),
  };
  const root = useRef<Group>(null);
  const upper = useRef<Group>(null);
  const head = useRef<Group>(null);
  const limbs = useRef<(Group | null)[]>([]);
  const pose = useMemo(() => restGeologist(), []);
  const apply = (t: number) => {
    geologistPose(who, t, pose);
    const r = root.current;
    if (!r || !upper.current || !head.current) return;
    r.position.set(pose.x, heightAt(pose.x, pose.z) + pose.y * scale, pose.z);
    r.rotation.y = pose.yaw;
    upper.current.rotation.z = -pose.lean;
    head.current.rotation.set(0, pose.headYaw, -pose.headPitch);
    const [legL, legR, armL, armR] = limbs.current;
    if (legL) legL.rotation.z = pose.legL;
    if (legR) legR.rotation.z = pose.legR;
    if (armL) armL.rotation.z = pose.armL;
    if (armR) armR.rotation.z = pose.armR;
  };
  useLayoutEffect(() => apply(STILL_TIME));
  useFrame(({ clock }) => { if (!reduced) apply(clock.elapsedTime); });
  const [hx, hy, hz] = GEOLOGIST_HIP;
  const [sx, sy, sz] = GEOLOGIST_SHOULDER;
  return (
    <group ref={root} scale={scale}>
      <group ref={(n) => void (limbs.current[0] = n)} position={[hx, hy, hz]}><mesh geometry={geo.leg} material={vehicleMaterial} /></group>
      <group ref={(n) => void (limbs.current[1] = n)} position={[hx, hy, -hz]}><mesh geometry={geo.leg} material={vehicleMaterial} /></group>
      <group ref={upper} position={[0, hy, 0]}>
        <mesh geometry={geo.torso} material={vehicleMaterial} />
        <group ref={head} position={[GEOLOGIST_NECK[0], GEOLOGIST_NECK[1] - hy, 0]}><mesh geometry={geo.head} material={vehicleMaterial} /></group>
        <group ref={(n) => void (limbs.current[2] = n)} position={[sx, sy - hy, sz]}><mesh geometry={geo.arm} material={vehicleMaterial} /></group>
        <group ref={(n) => void (limbs.current[3] = n)} position={[sx, sy - hy, -sz]}>{/* Sitting or kneeling at a find they clean it with a brush; standing at the rock they use the hammer. */}<mesh geometry={who.act === 'sit' || who.act === 'kneel' ? geo.brush : geo.hammer} material={vehicleMaterial} /></group>
      </group>
    </group>
  );
}

// --- Animals --------------------------------------------------------------------------------

function LivingAmmonite({ position, scale, seed, reduced, yaw = 0 }: { position: Vec3; scale: number; seed: number; reduced: boolean; yaw?: number }) {
  const body = polyGeometry('ammonite-body', () => AMMONITE_BODY_TRIS);
  const arms = useMemo(() => Array.from({ length: AMMONITE_ARM_COUNT }, (_, i) => ammoniteArm(i)), []);
  const root = useRef<Group>(null);
  const segs = useRef<(Group | null)[]>([]);
  const pose = useMemo(() => restAmmonite(AMMONITE_ARM_COUNT), []);
  const apply = (t: number) => {
    ammonitePose(t, seed, pose);
    if (!root.current) return;
    root.current.position.set(position[0], position[1] + pose.y, position[2]);
    root.current.rotation.set(pose.roll, yaw + pose.yaw, 0);
    segs.current.forEach((g, k) => { if (g) g.rotation.z = pose.arms[Math.floor(k / 3)] * (k % 3 === 0 ? 0.5 : 1); });
  };
  useLayoutEffect(() => apply(STILL_TIME));
  useFrame(({ clock }) => { if (!reduced) apply(clock.elapsedTime); });
  return (
    <group ref={root} scale={scale}>
      <mesh geometry={body} material={vehicleMaterial} />
      {arms.map((chain, i) => {
        const g = chain.map((part, s) => polyGeometry(`ammonite-arm-${i}-${s}`, () => part.tris));
        const ref = (k: number) => (n: Group | null) => void (segs.current[i * 3 + k] = n);
        return (
          <group key={i} ref={ref(0)} position={[...chain[0].pivot]}>
            <mesh geometry={g[0]} material={vehicleMaterial} />
            <group ref={ref(1)} position={[...chain[1].pivot]}>
              <mesh geometry={g[1]} material={vehicleMaterial} />
              <group ref={ref(2)} position={[...chain[2].pivot]}><mesh geometry={g[2]} material={vehicleMaterial} /></group>
            </group>
          </group>
        );
      })}
    </group>
  );
}

function Dinosaur({ loop, reduced, scale = 3.4, heightAt }: { loop: Loop | null; reduced: boolean; scale?: number; heightAt: (x: number, z: number) => number }) {
  const p = useMemo(() => dinosaurParts(), []);
  const geo = {
    body: polyGeometry('dino-body', () => p.body), head: polyGeometry('dino-head', () => p.head),
    tail: p.tail.map((tris, i) => polyGeometry(`dino-tail-${i}`, () => tris)), leg: polyGeometry('dino-leg', () => p.leg),
  };
  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const tail = useRef<(Group | null)[]>([]);
  const legs = useRef<(Group | null)[]>([]);
  const pose = useMemo(() => restDino(), []);
  const apply = (t: number) => {
    dinoPose(t, loop, pose);
    if (!root.current || !head.current) return;
    root.current.position.set(pose.x, heightAt(pose.x, pose.z) + pose.bob * scale, pose.z);
    root.current.rotation.y = pose.yaw;
    head.current.rotation.set(0, pose.headYaw, pose.headPitch);
    tail.current.forEach((g, i) => { if (g) g.rotation.y = pose.tail[i]; });
    legs.current.forEach((g, i) => { if (g) g.rotation.z = pose.legs[i]; });
  };
  useLayoutEffect(() => apply(STILL_TIME));
  useFrame(({ clock }) => { if (!reduced) apply(clock.elapsedTime); });
  const tailRef = (i: number) => (n: Group | null) => void (tail.current[i] = n);
  return (
    <group ref={root} scale={scale}>
      <mesh geometry={geo.body} material={vehicleMaterial} />
      <group ref={head} position={[...DINO_NECK]}><mesh geometry={geo.head} material={vehicleMaterial} /></group>
      <group ref={tailRef(0)} position={[...DINO_TAIL]}>
        <mesh geometry={geo.tail[0]} material={vehicleMaterial} />
        <group ref={tailRef(1)} position={[-DINO_TAIL_SEGMENT, 0, 0]}>
          <mesh geometry={geo.tail[1]} material={vehicleMaterial} />
          <group ref={tailRef(2)} position={[-DINO_TAIL_SEGMENT, 0, 0]}><mesh geometry={geo.tail[2]} material={vehicleMaterial} /></group>
        </group>
      </group>
      {DINO_HIPS.map((hip, i) => (
        <group key={i} ref={(n) => void (legs.current[i] = n)} position={[...hip]}><mesh geometry={geo.leg} material={vehicleMaterial} /></group>
      ))}
    </group>
  );
}

function Plesiosaur({ loop, depth, scale = 4.5, reduced }: { loop: Loop; depth: number; scale?: number; reduced: boolean }) {
  const p = useMemo(() => plesiosaurParts(), []);
  const geo = {
    body: polyGeometry('plesio-body', () => p.body), head: polyGeometry('plesio-head', () => p.head),
    neck: p.neck.map((tris, i) => polyGeometry(`plesio-neck-${i}`, () => tris)),
    flipL: polyGeometry('plesio-flip-l', () => p.flipper), flipR: polyGeometry('plesio-flip-r', () => mirrorZ(p.flipper)),
  };
  const root = useRef<Group>(null);
  const neck = useRef<(Group | null)[]>([]);
  const head = useRef<Group>(null);
  const flippers = useRef<(Group | null)[]>([]);
  const pose = useMemo(() => restPlesio(PLESIO_NECK_SEGMENTS), []);
  const apply = (t: number) => {
    plesioPose(t, loop, depth, pose);
    if (!root.current) return;
    root.current.position.set(pose.x, pose.y, pose.z);
    root.current.rotation.set(pose.roll, pose.yaw, 0, 'YXZ');
    neck.current.forEach((g, i) => g?.rotation.set(0, pose.neck[i], pose.neckPitch[i]));
    head.current?.rotation.set(0, 0, pose.headPitch);
    flippers.current.forEach((g, i) => { if (g) g.rotation.x = (PLESIO_FLIPPERS[i][2] > 0 ? -1 : 1) * pose.flippers[i]; });
  };
  useLayoutEffect(() => apply(STILL_TIME));
  useFrame(({ clock }) => { if (!reduced) apply(clock.elapsedTime); });
  // The neck is a chain: each segment hangs from the end of the previous one.
  const chain = (i: number): ReactNode => i === PLESIO_NECK_SEGMENTS
    ? <group ref={head}><mesh geometry={geo.head} material={vehicleMaterial} /></group>
    : (
      <group ref={(n) => void (neck.current[i] = n)} position={i === 0 ? [...PLESIO_NECK] : [PLESIO_NECK_LENGTH, 0, 0]}>
        <mesh geometry={geo.neck[i]} material={vehicleMaterial} />
        {chain(i + 1)}
      </group>
    );
  return (
    <group ref={root} scale={scale}>
      <mesh geometry={geo.body} material={vehicleMaterial} />
      {chain(0)}
      {PLESIO_FLIPPERS.map((pos, i) => (
        <group key={i} ref={(n) => void (flippers.current[i] = n)} position={[...pos]}>
          <mesh geometry={pos[2] > 0 ? geo.flipL : geo.flipR} material={vehicleMaterial} />
        </group>
      ))}
    </group>
  );
}

function Crinoid({ position, scale, seed, reduced }: { position: Vec3; scale: number; seed: number; reduced: boolean }) {
  const crown = useRef<Group>(null);
  useLayoutEffect(() => { if (crown.current) crown.current.rotation.z = crinoidSway(STILL_TIME, seed); });
  useFrame(({ clock }) => {
    if (reduced || !crown.current) return;
    crown.current.rotation.z = crinoidSway(clock.elapsedTime, seed);
    crown.current.rotation.x = crinoidSway(clock.elapsedTime * 0.7, seed + 2) * 0.5;
  });
  return (
    <group position={[...position]} scale={scale}>
      <PolyProp id="crinoid-stalk" tris={CRINOID_STALK_TRIS} position={[0, 0, 0]} />
      <group ref={crown} position={[...CRINOID_TOP]}><PolyProp id="crinoid-crown" tris={CRINOID_CROWN_TRIS} position={[0, 0, 0]} /></group>
    </group>
  );
}

/** Sea stars crawl very slowly over the floor, turning as they go. */
function CrawlingStar({ position, scale, seed, reduced }: { position: Vec3; scale: number; seed: number; reduced: boolean }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (reduced || !g.current) return;
    const t = clock.elapsedTime * 0.05 + seed;
    g.current.position.set(position[0] + Math.sin(t) * 0.25, position[1], position[2] + Math.cos(t * 0.8) * 0.2);
    g.current.rotation.y = t * 0.6;
  });
  return <group ref={g} position={[...position]} scale={scale} rotation={[0, seed, 0]}><PolyProp id="star" tris={STAR_TRIS} position={[0, 0, 0]} /></group>;
}

// --- Finds and their interactions -----------------------------------------------------------

/** Sediment over the spiral: each cleaning pass sweeps eight blocks away. */
const DUST: readonly Box[] = Array.from({ length: 24 }, (_, i): Box => {
  const c = i % 4, r = Math.floor(i / 4);
  const depth = 0.12 + ((c * 7 + r * 3) % 4) * 0.025;
  return [-0.33 + c * 0.22, 0.1 + r * 0.155, 0.1 + depth / 2, 0.22, 0.155, depth, (c + r) % 3 ? C.sand : C.light];
});
const DUST_ORDER = [17, 2, 9, 22, 5, 13, 0, 19, 11, 6, 23, 3, 15, 8, 20, 1, 12, 18, 4, 10, 21, 7, 14, 16];

function Sediment({ cleaned, reduced }: { cleaned: number; reduced: boolean }) {
  const geometry = useMemo(() => buildBoxGeometry([[0, 0, 0, 1, 1, 1, 0xffffff]]), []);
  const materials = useMemo(() => DUST.map((b) => new MeshBasicMaterial({ color: b[6], vertexColors: true })), []);
  useEffect(() => () => { geometry.dispose(); materials.forEach((m) => m.dispose()); }, [geometry, materials]);
  const meshes = useRef<(Object3D | null)[]>([]);
  const started = useRef<(number | null)[]>(DUST.map(() => null));
  useFrame(({ clock }) => {
    DUST.forEach(([x, y, z, sx, sy, sz], i) => {
      const m = meshes.current[i];
      if (!m) return;
      const gone = DUST_ORDER.indexOf(i) < cleaned * 8;
      if (!gone) { started.current[i] = null; m.visible = true; m.position.set(x, y, z); m.scale.set(sx, sy, sz); return; }
      if (reduced) { m.visible = false; return; }
      started.current[i] ??= clock.elapsedTime + (DUST_ORDER.indexOf(i) % 8) * 0.05;
      const u = Math.max(0, clock.elapsedTime - started.current[i]) / 0.9;
      m.visible = u < 1;
      const dir = (i % 2 ? 1 : -1) * (0.4 + (i % 3) * 0.2);
      m.position.set(x + dir * u, y + 0.9 * u - 1.4 * u * u, z + 0.5 * u);
      m.rotation.set(u * 3 * dir, u * 2, 0);
      const s = 1 - u;
      m.scale.set(sx * s, sy * s, sz * s);
    });
  });
  return <group>{DUST.map((_, i) => <mesh key={i} ref={(n) => void (meshes.current[i] = n)} geometry={geometry} material={materials[i]} />)}</group>;
}

function Glow({ position, size, active, reduced }: { position: Vec3; size: Vec3; active: boolean; reduced: boolean }) {
  const material = useMemo(() => new MeshBasicMaterial({ color: C.glow, transparent: true, opacity: 0.35, depthWrite: false, blending: AdditiveBlending }), []);
  useEffect(() => () => material.dispose(), [material]);
  const mesh = useRef<Object3D>(null);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const pulse = reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 3.2) * 0.12;
    mesh.current.scale.set(size[0] * pulse, size[1] * pulse, size[2] * pulse);
    material.opacity = reduced ? 0.35 : 0.25 + Math.sin(clock.elapsedTime * 3.2) * 0.12;
  });
  if (!active) return null;
  return <mesh ref={mesh} material={material} position={[...position]}><boxGeometry args={[1, 1, 1]} /></mesh>;
}

/** Vertebrae drawn one by one, so a light can run along the column when the visitor follows it. */
function Column({ follow, reduced }: { follow: boolean; reduced: boolean }) {
  const geometry = useMemo(() => buildPolyGeometry(VERTEBRA_TRIS, boxShade), []);
  const mesh = useMemo(() => new InstancedMesh(geometry, vehicleMaterial, PLESIO_VERTEBRAE), [geometry]);
  useEffect(() => () => { geometry.dispose(); mesh.dispose(); }, [geometry, mesh]);
  const start = useRef<number | null>(null);
  const bone = useMemo(() => new Color(C.bone), []);
  const shade = useMemo(() => new Color(C.boneShade), []);
  const glow = useMemo(() => new Color(C.glow), []);
  useLayoutEffect(() => {
    const m = new Matrix4();
    for (let i = 0; i < PLESIO_VERTEBRAE; i++) {
      const [x, y, z, s] = plesioVertebra(i);
      m.makeScale(s * 0.85, s, s * 1.15).setPosition(x, y, z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, i % 2 ? bone : shade);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [mesh, bone, shade]);
  const color = useMemo(() => new Color(), []);
  useFrame(({ clock }) => {
    if (!follow) { start.current = null; return; }
    start.current ??= clock.elapsedTime;
    // Reduced motion: the whole column stays lit, without a running wave.
    const t = clock.elapsedTime - start.current;
    for (let i = 0; i < PLESIO_VERTEBRAE; i++) {
      const w = reduced ? 0.6 : Math.max(columnWave(i, PLESIO_VERTEBRAE, t % 6), t > 3 ? 0.35 : 0);
      color.copy(i % 2 ? bone : shade).lerp(glow, w);
      mesh.setColorAt(i, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

/** The measured arm: a bar grows from the center of the star to the tip of one arm. */
function StarRuler({ active, reduced, length }: { active: boolean; reduced: boolean; length: number }) {
  const bar = useRef<Object3D>(null);
  const start = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (!bar.current) return;
    if (!active) { start.current = null; bar.current.visible = false; return; }
    start.current ??= clock.elapsedTime;
    const u = reduced ? 1 : Math.min(1, (clock.elapsedTime - start.current) / 0.7);
    bar.current.visible = true;
    bar.current.scale.set(Math.max(0.001, u * length), 1, 1);
  });
  return (
    <group ref={bar}>
      <mesh position={[0.5, 0, 0]}><boxGeometry args={[1, 0.02, 0.025]} /><meshBasicMaterial color={C.glow} /></mesh>
    </group>
  );
}

/** Bones of the dinosaur rise from the ground and gather where the reconstructed animal appears. */
function Reconstruction({ reduced, children }: { reduced: boolean; children: ReactNode }) {
  const animal = useRef<Group>(null);
  const bones = useRef<Group>(null);
  const start = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (!animal.current || !bones.current) return;
    if (reduced) { animal.current.scale.setScalar(1); bones.current.visible = false; return; }
    start.current ??= clock.elapsedTime;
    const t = clock.elapsedTime - start.current;
    const gather = Math.min(1, t / 1.1);
    bones.current.visible = t < 1.4;
    bones.current.position.y = gather * 1.1;
    bones.current.scale.setScalar(2.6 * (1 - gather * 0.75));
    bones.current.rotation.y = gather * 2.4;
    const grow = Math.min(1, Math.max(0, (t - 0.8) / 0.7));
    // Ease out with a small overshoot, so the animal "lands" in its place.
    const s = grow === 0 ? 0.001 : 1 + 2.2 * (grow - 1) ** 3 + 1.2 * (grow - 1) ** 2;
    animal.current.scale.setScalar(Math.max(0.001, s));
  });
  return (
    <>
      <group ref={bones}><PolyProp id="dino-bones" tris={DINO_BONES_TRIS} position={[0, 0, 0]} /></group>
      <group ref={animal} scale={reduced ? 1 : 0.001}>{children}</group>
    </>
  );
}

// --- Worlds ---------------------------------------------------------------------------------

/** An outcrop of stacked strata with a flat front face, where the ammonite shows. */
/**
 * An outcrop of stacked strata with bevelled edges and a flat front face, where the ammonite shows;
 * two loose stones at its foot.
 */
const ROCK: readonly Tri[] = [
  ...prism(chamferRect(0, 0, 1.7, 1.1, 0.06), 0, 0.4, C.strataBrown),
  ...prism(chamferRect(0.05, 0, 1.6, 1.1, 0.08), 0.4, 0.6, C.strataTan),
  ...prism(chamferRect(-0.05, -0.02, 1.4, 1.06, 0.1), 0.6, 0.78, C.strataGrey),
  ...prism(chamferRect(0.1, -0.15, 0.9, 0.6, 0.1), 0.78, 0.93, C.strataTan),
  ...chunk(-0.5, 0.06, 0.62, 0.3, 0.14, 0.2, 701, C.gravelMid),
  ...chunk(0.62, 0.05, 0.55, 0.22, 0.12, 0.18, 702, C.gravelLight),
];
/** The excavation: a dark pit framed by gravel, a string grid over it and four corner posts. */
const PIT: readonly Tri[] = [
  ...block(0, -0.02, 0, 2.6, 0.06, 1.5, C.dark),
  ...[-1.3, 1.3].flatMap((x) => block(x, 0.1, 0, 0.06, 0.2, 1.56, C.gravelLight)),
  ...[-0.75, 0.75].flatMap((z) => block(0, 0.1, z, 2.66, 0.2, 0.06, C.gravelLight)),
  ...[-0.65, 0, 0.65].flatMap((x) => strut([x, 0.22, -0.75], [x, 0.22, 0.75], 0.006, C.parkaRed, false)),
  ...[-0.35, 0.35].flatMap((z) => strut([-1.3, 0.22, z], [1.3, 0.22, z], 0.006, C.parkaRed, false)),
  ...[[-1.3, -0.75], [1.3, -0.75], [-1.3, 0.75], [1.3, 0.75]].flatMap(([x, z]) => strut([x, 0, z], [x, 0.36, z], 0.025, C.crate)),
];
/** Patches of ice in the frozen ground of the dig. */
const FROZEN: readonly Tri[] = [
  ...chunk(0.6, 0.01, 0.3, 0.7, 0.04, 0.4, 711, C.iceBlue), ...chunk(-0.8, 0.01, -0.35, 0.5, 0.04, 0.3, 712, C.snow),
  ...chunk(-0.3, 0.012, 0.45, 0.35, 0.035, 0.2, 713, C.iceBlue),
];
/** The tarp the bones are laid on, with its two orange edges. */
const TARP: readonly Tri[] = [
  ...prism(chamferRect(0, 0, 2.2, 1.4, 0.05), 0, 0.02, C.canvas),
  ...block(0, 0.015, 0.68, 2.2, 0.02, 0.04, C.tent), ...block(0, 0.015, -0.68, 2.2, 0.02, 0.04, C.tent),
];

function FieldWorld({ view, state, reduced }: { view: FossilView; state: FossilState; reduced: boolean }) {
  const ground = useMemo(() => buildFieldTris(), []);
  const floes = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (reduced || !floes.current) return;
    floes.current.children.forEach((c, i) => { c.position.y = WATER_LEVEL + 0.04 + Math.sin(clock.elapsedTime * 0.7 + i) * 0.03; });
  });
  const people = useMemo(() => ({
    walker: { act: 'walk', x: 0, z: 0, yaw: 0, seed: 0.6, loop: { cx: -0.6, cz: -0.6, rx: 2.4, rz: 1.1, period: 34 } } as Geologist,
    hammer: { act: 'hammer', x: SPOT.ammonite[0] + 1.25, z: SPOT.ammonite[1] - 0.55, yaw: Math.PI * 0.9, seed: 0.2 } as Geologist,
    plesio: { act: 'sit', x: SPOT.plesio[0] + 0.3, z: SPOT.plesio[1] + 1.1, yaw: Math.PI / 2, seed: 1.3 } as Geologist,
    plesio2: { act: 'sit', x: SPOT.plesio[0] - 1.1, z: SPOT.plesio[1] - 0.9, yaw: -0.4, seed: 2.1 } as Geologist,
    finder: { act: 'look', x: SPOT.jaw[0] + 1.3, z: SPOT.jaw[1] + 0.6, yaw: Math.PI * 0.85, seed: 0.9 } as Geologist,
    // Kneeling at the edge of the slab: the brush reaches the stone and the legs stay off it.
    stars: { act: 'kneel', x: SPOT.stars[0] - 1.2, z: SPOT.stars[1] - 0.2, yaw: -0.12, seed: 3.3 } as Geologist,
  }), []);
  const closing = view === 'closing';
  const [ax, az] = SPOT.ammonite, [px, pz] = SPOT.plesio, [jx, jz] = SPOT.jaw, [sx, sz] = SPOT.stars, [dx, dz] = SPOT.display;
  return (
    <>
      <Sky sun={closing ? [-0.75, 0.05, -0.65] : [0.35, 0.3, -0.85]} clouds={closing ? 0.35 : 0.55} reduced={reduced} />
      <fog attach="fog" args={[closing ? '#E9C9A0' : '#DCE4E7', 30, 110]} />
      <PolyModel tris={ground} />
      <PolyModel tris={DISTANT_MESAS} />
      <mesh position={[-40, WATER_LEVEL - 0.05, -20]}><boxGeometry args={[110, 0.1, 110]} /><meshBasicMaterial color={C.sea} /></mesh>
      <group ref={floes}>{FLOES.map(([x, z, s, seed]) => (
        <PolyProp key={seed} id="floe" tris={FLOE_TRIS} position={[x, WATER_LEVEL + 0.04, z]} scale={s} rotation={[0, seed, 0]} />
      ))}</group>

      {/* Camp: pyramid tents, crates, radio mast and a fossil trunk on the gravel */}
      <PolyProp id="tent" tris={TENT_TRIS} position={at(-3.2, -2.4)} scale={1.9} rotation={[0, 0.2, 0]} />
      <PolyProp id="tent" tris={TENT_TRIS} position={at(-0.9, -3.5)} scale={1.7} rotation={[0, -0.15, 0]} />
      <PolyProp id="tent" tris={TENT_TRIS} position={at(-5.3, -4.3)} scale={1.6} rotation={[0, 0.5, 0]} />
      <PolyProp id="tent" tris={TENT_TRIS} position={at(1.7, -2.8)} scale={1.5} rotation={[0, -0.4, 0]} />
      <PolyProp id="mast" tris={MAST_TRIS} position={at(-2.1, -0.9)} scale={3.2} />
      <PolyProp id="crate" tris={CRATE_TRIS} position={at(0.3, -1.4)} scale={0.9} rotation={[0, 0.3, 0]} />
      <PolyProp id="crate" tris={CRATE_TRIS} position={at(0.95, -1.15)} scale={0.8} rotation={[0, -0.2, 0]} />
      <PolyProp id="crate" tris={CRATE_TRIS} position={at(-4.4, -1.9)} scale={0.85} />
      <PolyProp id="log" tris={LOG_TRIS} position={at(8.5, -3.6)} scale={3.4} rotation={[0, 0.5, 0]} />
      <PolyProp id="sled" tris={SLED_TRIS} position={at(ax - 1.4, az + 1.2)} scale={1.2} rotation={[0, 0.4, 0]} />

      {/* Ammonite in its outcrop, under the sediment */}
      <group position={at(ax, az)}>
        <PolyModel tris={ROCK} />
        {/* Set into the face of the rock, only its front half showing, as a fossil the weather has uncovered. */}
        <group position={[0, 0.04, 0.52]} scale={0.6}>
          <PolyProp id="ammonite-fossil" tris={AMMONITE_FOSSIL_TRIS} position={[0, 0, 0]} />
          <Sediment cleaned={view === 'ammonite-rock' || closing ? state.cleaned : 3} reduced={reduced} />
        </group>
      </group>

      {/* Plesiosaur skeleton in its excavation */}
      <group position={at(px, pz)}>
        <PolyModel tris={PIT} />
        <group scale={2.3} position={[0, 0.02, 0]} rotation={[0, 0.1, 0]}>
          <PolyProp id="plesio-bones" tris={PLESIO_BONES_TRIS} position={[0, 0, 0]} />
          <Column follow={state.column && view === 'plesio-dig'} reduced={reduced} />
        </group>
      </group>

      {/* The jaw with its tooth, then the frozen dig and the bones on a tarp */}
      <group position={at(jx, jz)}>
        {view === 'dig' ? <>
          <PolyModel tris={PIT} />
          <PolyModel tris={FROZEN} />
          <PolyProp id="dino-bones" tris={DINO_BONES_TRIS} position={[0, 0.03, 0]} scale={2} />
        </> : view === 'dinosaur' ? <>
          <PolyModel tris={TARP} />
          <PolyProp id="dino-bones" tris={DINO_BONES_TRIS} position={[0, 0.03, 0]} scale={2.4} />
          <PolyProp id="jaw" tris={JAW_TRIS} position={[0.7, 0.02, 0.35]} scale={0.8} />
        </> : <>
          <PolyModel tris={ROCK} scale={0.6} />
          <group position={[0.05, 0.42, 0.3]} scale={1.1}>
            <PolyProp id="jaw" tris={JAW_TRIS} position={[0, 0, 0]} />
            <Glow position={JAW_TOOTH_CENTER} size={[0.16, 0.2, 0.1]} active={state.tooth && view === 'jaw'} reduced={reduced} />
          </group>
        </>}
      </group>

      {/* Slab of the Eocene sea stars, with its printed scale */}
      <group position={at(sx, sz)} scale={1.4}>
        <PolyProp id="star-slab" tris={STAR_SLAB_TRIS} position={[0, 0, 0]} />
        <PolyProp id="star" tris={STAR_TRIS} position={[0.08, 0.135, -0.08]} scale={0.34} rotation={[0, 0.3, 0]} />
        <PolyProp id="star" tris={STAR_TRIS} position={[-0.22, 0.135, 0.12]} scale={0.3} rotation={[0, 1.1, 0]} />
        <group position={[0.08, 0.2, -0.08]}><StarRuler active={state.measured && view === 'star-slab'} reduced={reduced} length={0.16} /></group>
      </group>

      {/* Closing: the four finds displayed on crates at sunset */}
      {closing && <group position={at(dx, dz)}>
        {[-1.6, -0.55, 0.55, 1.6].map((x, i) => <PolyProp key={i} id="crate" tris={CRATE_TRIS} position={[x, 0, 0]} scale={0.9} />)}
        <PolyProp id="ammonite-fossil" tris={AMMONITE_FOSSIL_TRIS} position={[-1.6, 0.38, 0]} scale={0.55} />
        <PolyProp id="plesio-bones" tris={PLESIO_BONES_TRIS} position={[-0.55, 0.39, 0]} scale={0.5} />
        <PolyProp id="jaw" tris={JAW_TRIS} position={[0.55, 0.38, 0]} scale={0.7} />
        <PolyProp id="star" tris={STAR_TRIS} position={[1.6, 0.39, 0]} scale={0.32} />
      </group>}

      <GeologistFigure who={people.walker} parka="red" beard reduced={reduced} />
      <GeologistFigure who={people.hammer} parka="yellow" beard={false} reduced={reduced} />
      <GeologistFigure who={people.plesio} parka="orange" beard reduced={reduced} />
      <GeologistFigure who={people.plesio2} parka="red" beard={false} reduced={reduced} />
      <GeologistFigure who={people.finder} parka="orange" beard reduced={reduced} />
      <GeologistFigure who={people.stars} parka="yellow" beard reduced={reduced} />
      <Particles kind="snow" reduced={reduced} />
    </>
  );
}

function SeaWorld({ eocene, view, reduced }: { eocene: boolean; view: FossilView; reduced: boolean }) {
  const floor = useMemo(() => buildSeaFloorTris(eocene), [eocene]);
  const floorY = (x: number, z: number) => seaFloorHeight(x, z, eocene);
  const dwellers = useMemo(() => scatter(eocene ? 46 : 26, eocene ? 61 : 62, 11), [eocene]);
  const water = eocene ? { top: '#A9D3D2', mid: '#4C9AA3', bottom: '#1F5865', fog: '#4E95A0' } : { top: '#8CC2C8', mid: '#3B8293', bottom: '#173F52', fog: '#3A7D8E' };
  const focusPlesio = view === 'plesiosaur';
  return (
    <>
      <WaterDome top={water.top} mid={water.mid} bottom={water.bottom} />
      <fog attach="fog" args={[water.fog, 1, 28]} />
      <mesh position={[0, 11, -4]}><boxGeometry args={[80, 0.1, 80]} /><meshBasicMaterial color={water.top} transparent opacity={0.6} fog={false} /></mesh>
      <LightShafts reduced={reduced} color={eocene ? '#E4F6F2' : '#D6F0F2'} />
      <PolyModel tris={floor} />
      {eocene ? <>
        {dwellers.map(([x, z, s, seed], i) => {
          const pos: Vec3 = [x, floorY(x, z), z];
          switch (i % 6) {
            case 0: return <CrawlingStar key={i} position={pos} scale={0.55 * s} seed={seed} reduced={reduced} />;
            case 1: return <PolyProp key={i} id="bryozoan" tris={BRYOZOAN_TRIS} position={pos} scale={1.4 * s} rotation={[0, seed, 0]} />;
            case 2: return <PolyProp key={i} id="brachiopod" tris={BRACHIOPOD_TRIS} position={pos} scale={1.2 * s} rotation={[0, seed, 0]} />;
            case 3: return <PolyProp key={i} id="urchin" tris={URCHIN_TRIS} position={pos} scale={1.1 * s} rotation={[0, seed, 0]} />;
            case 4: return <Crinoid key={i} position={pos} scale={1.6 * s} seed={seed} reduced={reduced} />;
            default: return <CrawlingStar key={i} position={pos} scale={0.45 * s} seed={seed + 1} reduced={reduced} />;
          }
        })}
        {/* On the rock wall: bryozoans, brachiopods, the chiton and stars feeding on them */}
        {[-3, -1.2, 0.8, 2.6, 4.2].map((x, i) => {
          const z = -4.6 - (i % 2) * 0.6;
          return <group key={x}>
            <PolyProp id="bryozoan" tris={BRYOZOAN_TRIS} position={[x, floorY(x, z), z]} scale={1.8} rotation={[0, i, 0]} />
            <PolyProp id="brachiopod" tris={BRACHIOPOD_TRIS} position={[x + 0.6, floorY(x + 0.6, z + 0.4), z + 0.4]} scale={1.3} rotation={[0, i * 2, 0]} />
          </group>;
        })}
        <PolyProp id="chiton" tris={CHITON_TRIS} position={[0.6, floorY(0.6, 0.6), 0.6]} scale={0.9} rotation={[0, 0.4, 0]} />
        <CrawlingStar position={[-0.6, floorY(-0.6, 0.2), 0.2]} scale={0.9} seed={0.4} reduced={reduced} />
        <CrawlingStar position={[1.3, floorY(1.3, -0.6), -0.6]} scale={0.75} seed={2.2} reduced={reduced} />
      </> : <>
        {dwellers.map(([x, z, s, seed], i) => {
          const pos: Vec3 = [x, floorY(x, z), z];
          if (i % 3 === 0) return <PolyProp key={i} id="inoceramus" tris={INOCERAMUS_TRIS} position={pos} scale={1.4 * s} rotation={[0, seed, 0]} />;
          if (i % 3 === 1) return <PolyProp key={i} id="urchin" tris={URCHIN_TRIS} position={pos} scale={1.0 * s} rotation={[0, seed, 0]} />;
          return <Crinoid key={i} position={pos} scale={1.8 * s} seed={seed} reduced={reduced} />;
        })}
        <LivingAmmonite position={focusPlesio ? [-3.5, 2.2, -2] : [0, 1.1, 0]} scale={focusPlesio ? 1.4 : 2.4} seed={0} reduced={reduced} />
        <LivingAmmonite position={[-3.4, 1.8, -3.6]} scale={1.3} seed={1.7} reduced={reduced} yaw={0.6} />
        <LivingAmmonite position={[3.8, 2.6, -5]} scale={1.1} seed={3.1} reduced={reduced} yaw={-0.4} />
        <LivingAmmonite position={[2.2, 0.9, 2.4]} scale={0.8} seed={4.6} reduced={reduced} yaw={2.4} />
        <Plesiosaur loop={focusPlesio ? PLESIO_SWIM : { cx: 0, cz: -6, rx: 7, rz: 3, period: 40 }} depth={focusPlesio ? 2.2 : 4.2} scale={focusPlesio ? 5.6 : 4.5} reduced={reduced} />
      </>}
      <Particles kind="bubbles" reduced={reduced} />
    </>
  );
}

function ForestWorld({ view, reduced }: { view: FossilView; reduced: boolean }) {
  const ground = useMemo(() => buildForestTris(), []);
  const groundY = forestHeight;
  const plantTris = { conifer: CONIFER_TRIS, cycad: CYCAD_TRIS, fern: FERN_TRIS, broadleaf: BROADLEAF_TRIS } as const;
  const walking: Loop = { cx: 0, cz: -0.5, rx: 2.8, rz: 1.6, period: 46 };
  return (
    <>
      <Sky sun={[0.45, 0.42, -0.7]} clouds={0.3} reduced={reduced} />
      <fog attach="fog" args={['#E8E4CF', 22, 70]} />
      <PolyModel tris={ground} />
      {FOREST_PLANTS.map((p, i) => (
        <PolyProp key={i} id={`plant-${p.kind}`} tris={plantTris[p.kind]} position={[p.x, groundY(p.x, p.z), p.z]} scale={p.scale} rotation={[0, i, 0]} />
      ))}
      {view === 'dinosaur'
        ? <Reconstruction reduced={reduced}><Dinosaur loop={null} reduced={reduced} heightAt={groundY} /></Reconstruction>
        : <Dinosaur loop={walking} reduced={reduced} heightAt={groundY} />}
      <Particles kind="leaves" reduced={reduced} />
    </>
  );
}

// --- Camera ---------------------------------------------------------------------------------

interface Framing { target: Vec3; distance: number; direction: Vec3 }
function framingFor(view: FossilView, state: FossilState, narrow: boolean): Framing {
  const k = narrow ? 1.25 : 1;
  const spot = (s: readonly [number, number], lift: number): Vec3 => at(s[0], s[1], lift);
  switch (view) {
    case 'camp': return { target: [-1, 0.9, -1.4], distance: 15 * k, direction: [0.75, 0.42, 1] };
    case 'ammonite-rock': return { target: spot(SPOT.ammonite, 0.45), distance: 5.2 * k, direction: [0.15, 0.5, 1] };
    case 'plesio-dig': return { target: spot(SPOT.plesio, 0.1), distance: (state.column ? 4.8 : 5.8) * k, direction: [0.35, 0.95, 0.75] };
    case 'jaw': return { target: spot(SPOT.jaw, state.tooth ? 0.78 : 0.55), distance: (state.tooth ? 2.4 : 4.4) * k, direction: [0.35, 0.45, 1] };
    case 'dig': return { target: spot(SPOT.jaw, 0.2), distance: 6.2 * k, direction: [0.6, 0.95, 1] };
    case 'dinosaur': return state.reconstructed
      ? { target: [0, 1.1, 0], distance: 9.5 * k, direction: [0.7, 0.3, 1] }
      : { target: spot(SPOT.jaw, 0.2), distance: 5.6 * k, direction: [0.5, 0.75, 1] };
    case 'star-slab': return { target: spot(SPOT.stars, 0.2), distance: (state.measured ? 2.8 : 3.8) * k, direction: [0.25, 1.15, 0.7] };
    case 'ammonite': return { target: [0, 1.5, 0], distance: 6.6 * k, direction: [0.4, 0.12, 1] };
    case 'plesiosaur': return { target: [0, 2.2, 0], distance: 9.5 * k, direction: [0.45, 0.22, 1] };
    case 'seafloor': return { target: [0, 0.5, -1.2], distance: 6.2 * k, direction: [0.3, 0.42, 1] };
    case 'habitat':
      if (state.habitat === 'sea') return { target: [0, 2, 0], distance: 11 * k, direction: [0.45, 0.2, 1] };
      if (state.habitat === 'land') return { target: [0, 1.2, 0], distance: 11 * k, direction: [0.6, 0.32, 1] };
      return { target: [0, 0.5, -1.2], distance: 7 * k, direction: [0.3, 0.42, 1] };
    case 'closing': return { target: at(SPOT.display[0], SPOT.display[1], 0.8), distance: 13 * k, direction: [0.9, 0.42, 1] };
  }
}

function SceneCamera({ view, state, reduced, reset }: { view: FossilView; state: FossilState; reduced: boolean; reset: number }) {
  const controls = useRef<CameraControls>(null);
  const initialized = useRef(false);
  const size = useThree((s) => s.size);
  const { habitat, tooth, column, measured, reconstructed } = state;
  useEffect(() => {
    const cc = controls.current;
    if (!cc) return;
    const { target, distance, direction } = framingFor(view, state, size.width / size.height < 1.05);
    const len = Math.hypot(...direction);
    cc.minDistance = distance * 0.6;
    cc.maxDistance = distance * 1.4;
    cc.minPolarAngle = Math.PI * 0.12;
    cc.maxPolarAngle = Math.PI * 0.5;
    cc.smoothTime = 0.6;
    void cc.setLookAt(
      target[0] + (direction[0] / len) * distance, target[1] + (direction[1] / len) * distance, target[2] + (direction[2] / len) * distance,
      ...target, initialized.current && !reduced,
    );
    initialized.current = true;
  }, [view, habitat, tooth, column, measured, reconstructed, reduced, size.width, size.height, reset]);
  return <CameraControls ref={controls} makeDefault dollySpeed={0.6} truckSpeed={0} />;
}

// --- Canvas ---------------------------------------------------------------------------------

const SCENE_FPS = 60;
const LOW_QUALITY_FPS = 30;

/** Keeps the demand-driven canvas drawing while the scene animates, as in Orcadas. */
function SceneClock({ reduced, lowQuality }: { reduced: boolean; lowQuality: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (reduced) return;
    let id = 0;
    let last = 0;
    const loop = (now: number) => {
      if (!document.hidden && shouldTick(now, last, lowQuality ? LOW_QUALITY_FPS : SCENE_FPS)) { last = now; invalidate(); }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [invalidate, reduced, lowQuality]);
  return null;
}

/** The second frame confirms the scene, not just the canvas element, has rendered. */
function SceneReady() {
  const frames = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  useFrame(({ gl }) => {
    frames.current++;
    if (frames.current >= 2) gl.domElement.dataset.ready = 'true';
    else invalidate();
  });
  return null;
}

/** Interactions that animate also when motion is reduced need a few frames to settle. */
function Settle({ state }: { state: FossilState }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => { invalidate(); if (++n > 3) clearInterval(id); }, 60);
    return () => clearInterval(id);
  }, [state, invalidate]);
  return null;
}

export function FossilScene({ view, state, reduced, reset, shift }: {
  view: FossilView; state: FossilState; reduced: boolean; reset: number;
  /** Moves the view into the part of the screen the side panel leaves free. */
  shift: ViewShiftPx;
}) {
  const [lowQuality, setLowQuality] = useState(false);
  const [ink, setInk] = useState(false);
  const world = worldOf(view, state);
  return (
    <Canvas role="img" aria-label="Reconstrucción ilustrativa de la expedición: campamento, fósiles y ambientes del pasado"
      frameloop="demand" dpr={lowQuality ? 0.7 : [1, 1.5]} camera={{ position: [12, 10, 19], fov: 36, near: 0.1, far: 300 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
      <SceneClock reduced={reduced} lowQuality={lowQuality} />
      {!reduced && (
        <PerformanceMonitor bounds={() => (lowQuality ? [24, 27] : [36, 42])} flipflops={4}
          onIncline={() => { setLowQuality(false); setInk(true); }} onDecline={() => { setLowQuality(true); setInk(false); }} />
      )}
      <SceneCamera view={view} state={state} reduced={reduced} reset={reset} />
      <ViewShift shift={shift} />
      {world === 'field' && <FieldWorld view={view} state={state} reduced={reduced} />}
      {world === 'forest' && <ForestWorld view={view} reduced={reduced} />}
      {(world === 'cretaceous-sea' || world === 'eocene-sea') && <SeaWorld eocene={world === 'eocene-sea'} view={view} reduced={reduced} />}
      {ink && !lowQuality && <EffectComposer multisampling={0}><InkEffect /></EffectComposer>}
      <Settle state={state} />
      <SceneReady />
    </Canvas>
  );
}
