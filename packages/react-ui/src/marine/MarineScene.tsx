import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Color, DoubleSide, Group, InstancedMesh, Matrix4,
  MeshBasicMaterial, Object3D, Points, PointsMaterial, Quaternion, ShaderMaterial, SphereGeometry, Vector2, Vector3,
} from 'three';
import {
  MARINE_LINKS, isUnderwater, linksOf, shouldTick, type MarineOrganism, type MarineState, type MarineView,
} from '@antartida/core';
import { InkEffect } from '../map3d/InkEffect.ts';
import { stationSkyFragmentShader, stationSkyVertexShader } from '../orcadas/stationSky.glsl.ts';
import { SEA_MODELS, emperorAt } from '../voyage/sightingModels.ts';
import { buildBoxGeometry, vehicleMaterial, type Box } from '../voyage/vehicles.ts';
import {
  BALEEN_DETAIL, DIATOM_CHAIN, DIATOM_DISC, EMPEROR_FLIPPER, EMPEROR_SHOULDER, EMPEROR_SWIM, HUMPBACK_BODY, HUMPBACK_HINGE,
  HUMPBACK_JAW, HUMPBACK_THROAT, KRILL, LEOPARD_BODY, LEOPARD_HINGE, LEOPARD_JAW, MINKE_FEED_BODY, MINKE_HINGE, MINKE_JAW,
  MINKE_THROAT, SILVERFISH, SQUID, TEETH_DETAIL, WEDDELL,
} from './models.ts';
import {
  DIVE_BOTTOM, EDGE_Z, FILTER_STILL, HOLE, ICE_TOP, LEAD, LEOPARD_LOOP, LEOPARD_PREY, MINKE_KRILL_PATCHES, MINKE_LOOP,
  MINKE_SCALE, ORCA_LOOP, ORCA_POD, STILL_TIME, SUCTION_PERIOD, WATER_Y, WAVE_FLOE, WAVE_PERIOD, buildIceBoxes, emperorDive,
  humpbackFilter, krillAt, leopardPose, minkePose, onLoop, orcaPose, orcaWave, suction, type Loop, type Pose,
} from './marinePoses.ts';

type Vec3 = readonly [number, number, number];

// --- Shared pieces --------------------------------------------------------------------------

const parts = new Map<string, BufferGeometry>();
/** Geometries of repeated parts, built once and shared. */
function partGeometry(key: string, boxes: () => readonly Box[]): BufferGeometry {
  let g = parts.get(key);
  if (!g) { g = buildBoxGeometry(boxes()); parts.set(key, g); }
  return g;
}

function Prop({ id, boxes, position, scale = 1, rotation = [0, 0, 0] }: {
  id: string; boxes: readonly Box[]; position: Vec3; scale?: number; rotation?: Vec3;
}) {
  return <mesh geometry={partGeometry(id, () => boxes)} material={vehicleMaterial} position={[...position]} scale={scale} rotation={[...rotation]} />;
}

/** Applies a pose every frame, or once at STILL_TIME when motion is reduced. */
function usePose(apply: (t: number) => void, reduced: boolean, still = STILL_TIME) {
  useLayoutEffect(() => apply(still));
  useFrame(({ clock }) => { if (!reduced) apply(clock.elapsedTime); });
}

const place = (g: Group | null, p: Pose) => {
  if (!g) return;
  g.position.set(p.x, p.y, p.z);
  g.rotation.set(0, p.yaw, p.pitch, 'YZX');
};

// --- Sky, water, ice and particles ---------------------------------------------------------

function Sky({ reduced }: { reduced: boolean }) {
  const geometry = useMemo(() => new SphereGeometry(96, 32, 20), []);
  const uniforms = useMemo(() => ({
    uSunDir: { value: new Vector3(0.4, 0.25, -0.8).normalize() }, uCloudCover: { value: 0.45 }, uTime: { value: 0 }, uWindVec: { value: new Vector2(0.6, 0.2) },
  }), []);
  const material = useMemo(() => new ShaderMaterial({
    vertexShader: stationSkyVertexShader, fragmentShader: stationSkyFragmentShader, uniforms, side: BackSide, depthWrite: false, fog: false,
  }), [uniforms]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useFrame(({ clock }) => { if (!reduced) uniforms.uTime.value = clock.elapsedTime; });
  return <mesh geometry={geometry} material={material} renderOrder={-1} />;
}

/** Below the surface: a gradient dome, bright towards the ice and dark towards the deep. */
function WaterDome() {
  const geometry = useMemo(() => {
    const g = new SphereGeometry(80, 24, 16);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const top = new Color('#9CC9CF'), mid = new Color('#2F6F80'), deep = new Color('#0F2C3D'), out = new Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 80;
      if (y > 0) out.copy(mid).lerp(top, Math.min(1, y * 1.8)); else out.copy(mid).lerp(deep, Math.min(1, -y * 2.2));
      colors.set([out.r, out.g, out.b], i * 3);
    }
    g.setAttribute('color', new BufferAttribute(colors, 3));
    return g;
  }, []);
  const material = useMemo(() => new MeshBasicMaterial({ vertexColors: true, side: BackSide, depthWrite: false, fog: false }), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <mesh geometry={geometry} material={material} renderOrder={-1} />;
}

/** The sea surface: dark and opaque from above, a bright sheet seen from below. */
function SeaSurface({ under }: { under: boolean }) {
  return (
    <mesh position={[0, WATER_Y - 0.02, -6]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[120, 120]} />
      {under
        ? <meshBasicMaterial color="#CFEFF0" transparent opacity={0.55} side={DoubleSide} depthWrite={false} />
        : <meshBasicMaterial color="#2C5F73" />}
    </mesh>
  );
}

function Ice() {
  const geometry = useMemo(() => buildBoxGeometry(buildIceBoxes()), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={vehicleMaterial} />;
}

/** Light falling through the openings of the ice: the lead, the hole and the ice edge. */
function LightShafts({ reduced }: { reduced: boolean }) {
  const group = useRef<Group>(null);
  const material = useMemo(() => new MeshBasicMaterial({ color: '#E2F6F4', transparent: true, opacity: 0.08, depthWrite: false, blending: AdditiveBlending, fog: false }), []);
  useEffect(() => () => material.dispose(), [material]);
  const shafts: readonly (readonly [number, number, number])[] = [
    [-6, LEAD.z, 1.2], [-2, LEAD.z, 1.4], [2.5, LEAD.z, 1.2], [6.5, LEAD.z, 1.4], [HOLE.x, HOLE.z, 1.6],
    [-8, EDGE_Z + 1.5, 2.2], [-2, EDGE_Z + 2, 2.6], [4, EDGE_Z + 1.4, 2.4], [9, EDGE_Z + 2, 2.2],
  ];
  useFrame(({ clock }) => {
    if (reduced || !group.current) return;
    group.current.children.forEach((c, i) => { c.rotation.z = 0.12 + Math.sin(clock.elapsedTime * 0.3 + i) * 0.05; });
  });
  return <group ref={group}>{shafts.map(([x, z, w], i) => (
    <mesh key={i} material={material} position={[x, -5, z]} rotation={[0, 0, 0.12]}><boxGeometry args={[w, 10, w * 0.8]} /></mesh>
  ))}</group>;
}

/** Snow over the ice, or specks of plankton drifting under it. */
function Particles({ kind, reduced }: { kind: 'snow' | 'specks'; reduced: boolean }) {
  const count = kind === 'snow' ? 260 : 340;
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const h = (n: number) => { const s = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return s - Math.floor(s); };
      p.set([(h(1) - 0.5) * 36, kind === 'snow' ? h(2) * 12 : -h(2) * 9 - 0.6, (h(3) - 0.5) * 30], i * 3);
    }
    g.setAttribute('position', new BufferAttribute(p, 3));
    return g;
  }, [count, kind]);
  const material = useMemo(() => new PointsMaterial({
    color: kind === 'snow' ? '#F7FAFB' : '#CFE6C9', size: kind === 'snow' ? 0.08 : 0.05, transparent: true, opacity: kind === 'snow' ? 0.8 : 0.6, depthWrite: false,
  }), [kind]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  const points = useRef<Points>(null);
  useFrame(({ clock }, delta) => {
    if (reduced || !points.current) return;
    const arr = (geometry.getAttribute('position') as BufferAttribute).array as Float32Array;
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      if (kind === 'snow') {
        arr[k] += 0.8 * dt; arr[k + 1] -= (0.6 + (i % 5) * 0.1) * dt;
        if (arr[k + 1] < ICE_TOP) arr[k + 1] = 12;
      } else {
        arr[k] += Math.sin(clock.elapsedTime * 0.4 + i) * 0.05 * dt; arr[k + 1] += Math.cos(clock.elapsedTime * 0.3 + i) * 0.04 * dt;
      }
      if (arr[k] > 18) arr[k] -= 36;
    }
    (geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
  });
  if (reduced && kind === 'snow') return null;
  return <points ref={points} geometry={geometry} material={material} />;
}

// --- Small life -----------------------------------------------------------------------------

/** A swarm of krill drawn with one instanced mesh. */
function KrillSwarm({ center, count, spread, scale, reduced }: { center: Vec3; count: number; spread: number; scale: number; reduced: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = partGeometry('krill', () => KRILL);
  const dummy = useMemo(() => new Object3D(), []);
  usePose((t) => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < count; i++) {
      const k = krillAt(i, t, center, spread);
      dummy.position.set(k.x, k.y, k.z);
      dummy.rotation.set(0, k.yaw, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, reduced);
  return <instancedMesh ref={mesh} args={[geometry, vehicleMaterial, count]} frustumCulled={false} />;
}

/** A school of Antarctic silverfish swimming round together. */
function FishSchool({ loop, count, scale, reduced }: { loop: Loop; count: number; scale: number; reduced: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = partGeometry('silverfish', () => SILVERFISH);
  const dummy = useMemo(() => new Object3D(), []);
  const m4 = useMemo(() => new Matrix4(), []);
  usePose((t) => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < count; i++) {
      const p = onLoop(loop, t, -i * 0.11);
      const off = (n: number) => Math.sin(i * 7.31 + n) * 0.5;
      dummy.position.set(p.x + off(1), p.y + off(2) * 0.6, p.z + off(3));
      dummy.rotation.set(0, p.yaw + Math.sin(t * 2 + i) * 0.1, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      m.setMatrixAt(i, m4.copy(dummy.matrix));
    }
    m.instanceMatrix.needsUpdate = true;
  }, reduced);
  return <instancedMesh ref={mesh} args={[geometry, vehicleMaterial, count]} frustumCulled={false} />;
}

function Squids({ reduced }: { reduced: boolean }) {
  const refs = useRef<(Group | null)[]>([]);
  const loops: Loop[] = [
    { cx: DIVE_BOTTOM.x - 1, cy: DIVE_BOTTOM.y - 0.6, cz: DIVE_BOTTOM.z, rx: 1.4, rz: 1, period: 14 },
    { cx: DIVE_BOTTOM.x + 1.2, cy: DIVE_BOTTOM.y - 0.2, cz: DIVE_BOTTOM.z + 0.8, rx: 1, rz: 1.4, period: 17 },
  ];
  usePose((t) => loops.forEach((l, i) => place(refs.current[i], onLoop(l, t, i))), reduced);
  return <>{loops.map((_, i) => (
    <group key={i} ref={(n) => void (refs.current[i] = n)} scale={0.6}><mesh geometry={partGeometry('squid', () => SQUID)} material={vehicleMaterial} /></group>
  ))}</>;
}

/** Diatoms, tiny specks or magnified many times over. */
function Diatoms({ magnified, reduced }: { magnified: boolean; reduced: boolean }) {
  const group = useRef<Group>(null);
  const cells = useMemo(() => Array.from({ length: 16 }, (_, i) => {
    const h = (n: number) => { const s = Math.sin(i * 91.7 + n * 13.1) * 43758.5453; return s - Math.floor(s); };
    return { x: (h(1) - 0.5) * 6, y: -2.2 + (h(2) - 0.5) * 2.6, z: (h(3) - 0.5) * 3, disc: i % 2 === 0, spin: h(4) * 6 };
  }), []);
  const size = useRef(magnified ? 1 : 0.06);
  useFrame((_, delta) => {
    const goal = magnified ? 1 : 0.06;
    size.current = reduced ? goal : size.current + (goal - size.current) * Math.min(1, delta * 3);
    group.current?.children.forEach((c, i) => {
      c.scale.setScalar(size.current * (cells[i].disc ? 0.7 : 0.9));
      if (!reduced) c.rotation.y += delta * 0.15;
    });
  });
  return <group ref={group}>{cells.map((c, i) => (
    <mesh key={i} geometry={partGeometry(c.disc ? 'diatom-disc' : 'diatom-chain', () => (c.disc ? DIATOM_DISC : DIATOM_CHAIN))} material={vehicleMaterial}
      position={[c.x, c.y, c.z]} rotation={[c.disc ? 0.9 : 0.2, c.spin, c.disc ? 0.3 : 0.5]} scale={magnified ? 0.7 : 0.04} />
  ))}</group>;
}

// --- Animals ----------------------------------------------------------------------------------

const HUMPBACK_AT: Pose = { x: -2.6, y: -2.4, z: EDGE_Z + 3, yaw: 0, pitch: 0.08 };
const HUMPBACK_SCALE = 3.6;
/** Krill in front of the humpback's mouth. */
const HUMPBACK_SWARM: Vec3 = [HUMPBACK_AT.x + 3.3, HUMPBACK_AT.y - 0.2, HUMPBACK_AT.z];

function Humpback({ filtering, reduced }: { filtering: boolean; reduced: boolean }) {
  const root = useRef<Group>(null);
  const jaw = useRef<Group>(null);
  const throat = useRef<Group>(null);
  const water = useRef<Group>(null);
  usePose((t) => {
    const f = filtering ? humpbackFilter(t) : { phase: 'approach' as const, jaw: 0, throat: 1 };
    place(root.current, { ...HUMPBACK_AT, y: HUMPBACK_AT.y + Math.sin(t * 0.5) * 0.08, pitch: HUMPBACK_AT.pitch + (filtering ? f.jaw * 0.15 : 0) });
    if (jaw.current) jaw.current.rotation.z = -f.jaw;
    if (throat.current) throat.current.scale.y = f.throat;
    if (water.current) {
      water.current.visible = f.phase === 'expel';
      water.current.children.forEach((c, i) => { c.position.z = (i % 2 ? 1 : -1) * (0.14 + ((t * 0.6 + i * 0.13) % 0.3)); });
    }
  }, reduced, filtering ? FILTER_STILL : STILL_TIME);
  return (
    <group ref={root} scale={HUMPBACK_SCALE}>
      <mesh geometry={partGeometry('humpback-body', () => HUMPBACK_BODY)} material={vehicleMaterial} />
      <group ref={jaw} position={[...HUMPBACK_HINGE]}>
        <mesh geometry={partGeometry('humpback-jaw', () => HUMPBACK_JAW)} material={vehicleMaterial} />
        <group ref={throat} position={[0, -0.03, 0]}><mesh geometry={partGeometry('humpback-throat', () => HUMPBACK_THROAT)} material={vehicleMaterial} /></group>
      </group>
      {/* Water pushed out through the baleen while the krill stays inside: an effect, not a model. */}
      <group ref={water} visible={false}>
        {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[0.36 + (i >> 1) * 0.05, -0.08, 0]}><boxGeometry args={[0.02, 0.02, 0.02]} /><meshBasicMaterial color="#E9F6F6" transparent opacity={0.8} /></mesh>)}
      </group>
    </group>
  );
}

/** The minke lunges into krill under the floes: its jaw drops and its throat stretches with water. */
function Minke({ reduced, showBlow }: { reduced: boolean; showBlow: boolean }) {
  const root = useRef<Group>(null);
  const blow = useRef<Group>(null);
  const jaw = useRef<Group>(null);
  const throat = useRef<Group>(null);
  usePose((t) => {
    const p = minkePose(t);
    place(root.current, p);
    if (jaw.current) jaw.current.rotation.z = -p.jaw;
    if (throat.current) throat.current.scale.y = p.throat;
    if (blow.current) {
      blow.current.visible = showBlow && p.breathing;
      blow.current.position.set(p.x + Math.cos(p.yaw) * 0.6, ICE_TOP, p.z - Math.sin(p.yaw) * 0.6);
    }
  // Still frame: the middle of a lunge, mouth open in the krill.
  }, reduced, MINKE_LOOP.period / 2);
  return <>
    <group ref={root} scale={MINKE_SCALE}>
      <mesh geometry={partGeometry('minke-feed', () => MINKE_FEED_BODY)} material={vehicleMaterial} />
      <group ref={jaw} position={[...MINKE_HINGE]}>
        <mesh geometry={partGeometry('minke-jaw', () => MINKE_JAW)} material={vehicleMaterial} />
        <group ref={throat} position={[0, -0.02, 0]}><mesh geometry={partGeometry('minke-throat', () => MINKE_THROAT)} material={vehicleMaterial} /></group>
      </group>
    </group>
    <group ref={blow} visible={false}>
      {[[0, 0.15, 0, 0.18], [0.05, 0.35, 0.06, 0.24], [-0.05, 0.55, -0.05, 0.22]].map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]}><boxGeometry args={[s, s, s]} /><meshBasicMaterial color="#F4F8F9" transparent opacity={0.7} /></mesh>
      ))}
    </group>
  </>;
}

/** Follows a moving animal with the camera: it moves target and camera together. */
function Follow({ pose, active, reduced }: { pose: (t: number) => Pose; active: boolean; reduced: boolean }) {
  const controls = useThree((s) => s.controls) as CameraControls | null;
  useFrame(({ clock }) => {
    if (!active || reduced || !controls) return;
    const p = pose(clock.elapsedTime);
    void controls.moveTo(p.x, p.y, p.z, true);
  });
  return null;
}

function SwimmingEmperor({ pose, reduced, still }: { pose: (t: number) => Pose & { stroke?: number }; reduced: boolean; still?: number }) {
  const root = useRef<Group>(null);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  usePose((t) => {
    const p = pose(t);
    place(root.current, p);
    const beat = (p.stroke ?? Math.sin(t * 6)) * 0.5;
    if (right.current) right.current.rotation.x = beat;
    if (left.current) left.current.rotation.x = -beat;
  }, reduced, still);
  const [sx, sy, sz] = EMPEROR_SHOULDER;
  const flipper = partGeometry('emperor-flipper', () => EMPEROR_FLIPPER);
  return (
    <group ref={root} scale={1.3}>
      <mesh geometry={partGeometry('emperor-swim', () => EMPEROR_SWIM)} material={vehicleMaterial} />
      <group ref={right} position={[sx, sy, sz - 0.1]}><mesh geometry={flipper} material={vehicleMaterial} /></group>
      <group ref={left} position={[sx, sy, -sz + 0.1]} scale={[1, 1, -1]}><mesh geometry={flipper} material={vehicleMaterial} /></group>
    </group>
  );
}

/** Emperors standing on the floe by the hole. */
const STANDING: readonly Box[] = [
  ...emperorAt(0, 0, 1), ...emperorAt(0.5, -0.45, 0.95), ...emperorAt(-0.4, 0.5, 1.05), ...emperorAt(0.7, 0.55, 0.9),
];

const LEOPARD_STILL: Pose = { x: 0.6, y: -2.2, z: 0.2, yaw: 0, pitch: 0 };
const LEOPARD_SCALE = 2.8;
/** Where the mouth of the still leopard seal is, in the world. */
const LEOPARD_MOUTH: Vec3 = [LEOPARD_STILL.x + 0.5 * LEOPARD_SCALE, LEOPARD_STILL.y - 0.03 * LEOPARD_SCALE, LEOPARD_STILL.z];

/** Swimming, it bites at the fish and sucks in krill; still, it filters krill through its teeth. */
function LeopardSeal({ swimming, reduced }: { swimming: boolean; reduced: boolean }) {
  const root = useRef<Group>(null);
  const jaw = useRef<Group>(null);
  usePose((t) => {
    if (swimming) {
      const p = leopardPose(t);
      place(root.current, p);
      if (jaw.current) jaw.current.rotation.z = -p.jaw;
    } else {
      place(root.current, { ...LEOPARD_STILL, y: LEOPARD_STILL.y + Math.sin(t * 0.6) * 0.04 });
      if (jaw.current) jaw.current.rotation.z = -suction(t).jaw;
    }
  // Still frames: the bite at the fish, or the mouth open drawing in krill.
  }, reduced, swimming ? LEOPARD_LOOP.period / 4 : SUCTION_PERIOD * 0.2);
  return (
    <group ref={root} scale={LEOPARD_SCALE}>
      <mesh geometry={partGeometry('leopard-body', () => LEOPARD_BODY)} material={vehicleMaterial} />
      <group ref={jaw} position={[...LEOPARD_HINGE]}><mesh geometry={partGeometry('leopard-jaw', () => LEOPARD_JAW)} material={vehicleMaterial} /></group>
    </group>
  );
}

/**
 * Krill drawn into the leopard seal's mouth while it opens, and water pushed out at both sides
 * between the back teeth once it closes (P04). Effects, not models.
 */
function SuctionFlow({ reduced }: { reduced: boolean }) {
  const krill = useRef<InstancedMesh>(null);
  const water = useRef<Group>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const starts = useMemo(() => Array.from({ length: 16 }, (_, i) => [
    LEOPARD_MOUTH[0] + 0.9 + (i % 4) * 0.25, LEOPARD_MOUTH[1] + (((i * 7) % 5) - 2) * 0.12, LEOPARD_MOUTH[2] + (((i * 3) % 5) - 2) * 0.14,
  ] as const), []);
  usePose((t) => {
    const f = suction(t);
    const k = krill.current;
    if (k) {
      starts.forEach((s, i) => {
        const d = Math.min(1, f.draw * (1.2 - (i % 4) * 0.08));
        dummy.position.set(s[0] + (LEOPARD_MOUTH[0] - s[0]) * d, s[1] + (LEOPARD_MOUTH[1] - s[1]) * d, s[2] + (LEOPARD_MOUTH[2] - s[2]) * d);
        dummy.rotation.set(0, Math.PI, 0);
        dummy.scale.setScalar(f.draw > 0 && d < 0.97 ? 0.12 : 0.0001);
        dummy.updateMatrix();
        k.setMatrixAt(i, dummy.matrix);
      });
      k.instanceMatrix.needsUpdate = true;
    }
    if (water.current) {
      water.current.visible = f.expel > 0;
      water.current.children.forEach((c, i) => {
        const side = i % 2 ? 1 : -1;
        c.position.set(LEOPARD_MOUTH[0] - 0.35 - (i >> 1) * 0.08, LEOPARD_MOUTH[1], LEOPARD_MOUTH[2] + side * (0.2 + f.expel * 0.6));
      });
    }
  }, reduced, SUCTION_PERIOD * 0.2);
  return <>
    <instancedMesh ref={krill} args={[partGeometry('krill', () => KRILL), vehicleMaterial, starts.length]} frustumCulled={false} />
    <group ref={water} visible={false}>
      {Array.from({ length: 8 }, (_, i) => <mesh key={i}><boxGeometry args={[0.05, 0.05, 0.05]} /><meshBasicMaterial color="#E9F6F6" transparent opacity={0.75} /></mesh>)}
    </group>
  </>;
}

/** A small floe with a Weddell seal, for the documented example of the orcas' wave. */
const WAVE_FLOE_BOXES: readonly Box[] = [
  [0, 0.06, 0, WAVE_FLOE.half * 2, 0.24, WAVE_FLOE.half * 1.6, 0xb4d5ea],
  [0, 0.19, 0, WAVE_FLOE.half * 1.9, 0.03, WAVE_FLOE.half * 1.5, 0xf7fafb],
];

/**
 * Pitman and Durban (2012), illustrated: type B orcas swim together to the floe, dive under it and
 * the wave washes over the ice. The seal slides on the wet ice; the capture is not shown.
 */
function OrcaWave({ reduced }: { reduced: boolean }) {
  const orcas = useRef<(Group | null)[]>([]);
  const floe = useRef<Group>(null);
  const seal = useRef<Group>(null);
  const wave = useRef<Group>(null);
  usePose((t) => {
    for (let i = 0; i < 3; i++) place(orcas.current[i], orcaWave(t, i));
    const w = orcaWave(t, 0);
    if (floe.current) floe.current.rotation.z = -w.tilt;
    if (seal.current) seal.current.position.x = -0.2 + w.slide;
    if (wave.current) {
      wave.current.visible = w.height > 0.02;
      wave.current.position.set(w.crest, WATER_Y, WAVE_FLOE.z);
      wave.current.scale.set(1, Math.max(0.01, w.height / 0.4), 1);
    }
  }, reduced, WAVE_PERIOD * 0.68);
  return <>
    {[0, 1, 2].map((i) => (
      <group key={i} ref={(n) => void (orcas.current[i] = n)} scale={2.2}><mesh geometry={partGeometry('orca', () => SEA_MODELS.orca)} material={vehicleMaterial} /></group>
    ))}
    <group ref={floe} position={[WAVE_FLOE.x, 0, WAVE_FLOE.z]}>
      <mesh geometry={partGeometry('wave-floe', () => WAVE_FLOE_BOXES)} material={vehicleMaterial} />
      <group ref={seal} position={[-0.2, 0.2, 0]} rotation={[0, 0.3, 0]} scale={1.3}>
        <mesh geometry={partGeometry('weddell', () => WEDDELL)} material={vehicleMaterial} />
      </group>
    </group>
    {/* The wave: a stepped swell with foam on its crest, as wide as the group of orcas. An effect. */}
    <group ref={wave} visible={false}>
      {[[-0.9, 0.12, 0.6], [-0.45, 0.24, 0.5], [0, 0.4, 0.45], [0.35, 0.3, 0.3]].map(([x, h, w], i) => (
        <mesh key={i} position={[x, h / 2, 0]}><boxGeometry args={[w, h, WAVE_FLOE.half * 2.6]} /><meshBasicMaterial color={i === 2 ? '#6FA8B8' : '#4E8A9C'} /></mesh>
      ))}
      <mesh position={[0.08, 0.43, 0]}><boxGeometry args={[0.32, 0.07, WAVE_FLOE.half * 2.5]} /><meshBasicMaterial color="#F4F8F9" /></mesh>
      <mesh position={[0.4, 0.33, 0.3]}><boxGeometry args={[0.18, 0.05, WAVE_FLOE.half * 1.6]} /><meshBasicMaterial color="#F4F8F9" /></mesh>
    </group>
  </>;
}

function OrcaPod({ reduced }: { reduced: boolean }) {
  const refs = useRef<(Group | null)[]>([]);
  usePose((t) => ORCA_POD.forEach((_, i) => place(refs.current[i], orcaPose(t, i))), reduced);
  return <>{ORCA_POD.map((m, i) => (
    <group key={i} ref={(n) => void (refs.current[i] = n)} scale={m.scale}><mesh geometry={partGeometry('orca', () => SEA_MODELS.orca)} material={vehicleMaterial} /></group>
  ))}</>;
}

// --- Food web -------------------------------------------------------------------------------

/** Where each organism floats in the illustrated web: food below, consumers above. */
export const WEB_LAYOUT: Readonly<Record<MarineOrganism, Vec3>> = {
  producers: [-1.9, -7, -1],
  krill: [-1.9, -5.2, -1], fish: [0.5, -5.2, -1], squid: [2.4, -5.2, -1], 'penguins-seals': [4.3, -5.2, -1],
  humpback: [-4.6, -2.9, -1], minke: [-2.3, -2.9, -1], emperor: [0, -2.9, -1], leopard: [2.2, -2.9, -1], orca: [4.5, -2.9, -1],
};
const WEB_MODEL: Readonly<Record<MarineOrganism, { boxes: readonly Box[]; scale: number }>> = {
  producers: { boxes: DIATOM_DISC, scale: 0.9 },
  krill: { boxes: KRILL, scale: 0.9 },
  fish: { boxes: SILVERFISH, scale: 1 },
  squid: { boxes: SQUID, scale: 1 },
  'penguins-seals': { boxes: SEA_MODELS.seal, scale: 1.1 },
  humpback: { boxes: HUMPBACK_BODY, scale: 1.6 },
  minke: { boxes: SEA_MODELS.minke, scale: 1.4 },
  emperor: { boxes: EMPEROR_SWIM, scale: 1.3 },
  leopard: { boxes: LEOPARD_BODY, scale: 1.4 },
  orca: { boxes: SEA_MODELS.orca, scale: 1.3 },
};

const UP = new Vector3(0, 1, 0);
function Arrow({ from, to, material }: { from: Vec3; to: Vec3; material: MeshBasicMaterial }) {
  const { mid, len, quat, head } = useMemo(() => {
    const a = new Vector3(...from), b = new Vector3(...to);
    const dir = b.clone().sub(a);
    const full = dir.length();
    dir.normalize();
    // Leave room around both models.
    const start = a.clone().addScaledVector(dir, 0.55), end = b.clone().addScaledVector(dir, -0.6);
    return {
      mid: start.clone().add(end).multiplyScalar(0.5), len: start.distanceTo(end) || full,
      quat: new Quaternion().setFromUnitVectors(UP, dir), head: end,
    };
  }, [from, to]);
  return <>
    <mesh position={mid} quaternion={quat} material={material}><boxGeometry args={[0.05, len, 0.05]} /></mesh>
    <mesh position={head} quaternion={quat} material={material}><boxGeometry args={[0.2, 0.2, 0.2]} /></mesh>
  </>;
}

function FoodWeb3D({ selected, reduced }: { selected: MarineOrganism | null; reduced: boolean }) {
  const lit = useMemo(() => new MeshBasicMaterial({ color: '#B4532A' }), []);
  const plain = useMemo(() => new MeshBasicMaterial({ color: '#E8EFEF', transparent: true, opacity: 0.75 }), []);
  const faded = useMemo(() => new MeshBasicMaterial({ color: '#7FA3AC', transparent: true, opacity: 0.35 }), []);
  useEffect(() => () => { lit.dispose(); plain.dispose(); faded.dispose(); }, [lit, plain, faded]);
  const active = selected ? new Set(linksOf(selected)) : null;
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (reduced || !group.current) return;
    group.current.children.forEach((c, i) => { c.rotation.y = 0.6 + Math.sin(clock.elapsedTime * 0.5 + i) * 0.25; });
  });
  return <>
    <group ref={group}>
      {(Object.keys(WEB_LAYOUT) as MarineOrganism[]).map((o) => {
        const m = WEB_MODEL[o];
        const dim = selected && selected !== o && !linksOf(selected).some((l) => l.from === o || l.to === o);
        return <group key={o} position={[...WEB_LAYOUT[o]]} rotation={[0, 0.6, 0]} scale={dim ? m.scale * 0.75 : m.scale}>
          <mesh geometry={partGeometry(`web-${o}`, () => m.boxes)} material={vehicleMaterial} />
        </group>;
      })}
    </group>
    {MARINE_LINKS.map((l) => (
      <Arrow key={`${l.from}>${l.to}`} from={WEB_LAYOUT[l.from]} to={WEB_LAYOUT[l.to]} material={!active ? plain : active.has(l) ? lit : faded} />
    ))}
  </>;
}

// --- Worlds -----------------------------------------------------------------------------------

const KRILL_SWARM: Vec3 = [1.6, -1.9, -1];

function Underwater({ view, state, reduced }: { view: MarineView; state: MarineState; reduced: boolean }) {
  const near = view === 'micro' || view === 'teeth';
  return <>
    <WaterDome />
    <fog attach="fog" args={['#2E6D7E', near ? 1 : 2, near ? 14 : 30]} />
    {view !== 'web' && <>
      <SeaSurface under />
      <Ice />
      <LightShafts reduced={reduced} />
    </>}
    <Particles kind="specks" reduced={reduced} />
    {view === 'micro' && <Diatoms magnified={state.magnified} reduced={reduced} />}
    {(view === 'ceiling' || view === 'krill') && (
      <KrillSwarm center={KRILL_SWARM} count={view === 'krill' ? 150 : 110} spread={view === 'krill' ? 2 : 2.6} scale={view === 'krill' ? 0.3 : 0.2} reduced={reduced} />
    )}
    {view === 'minke' && MINKE_KRILL_PATCHES.map((c, i) => <KrillSwarm key={i} center={c} count={45} spread={1} scale={0.2} reduced={reduced} />)}
    {view === 'humpback' && <>
      <Humpback filtering={state.filtered} reduced={reduced} />
      <KrillSwarm center={HUMPBACK_SWARM} count={140} spread={1.6} scale={0.16} reduced={reduced} />
    </>}
    {(view === 'ceiling' || view === 'minke') && <Minke reduced={reduced} showBlow={false} />}
    {view === 'minke' && <Follow pose={minkePose} active={state.followed} reduced={reduced} />}
    {view === 'emperor' && <>
      <SwimmingEmperor pose={(t) => onLoop({ cx: HOLE.x + 2, cy: -2, cz: HOLE.z - 0.5, rx: 2.2, rz: 1.3, period: 9 }, t)} reduced={reduced} />
      <FishSchool loop={{ cx: HOLE.x + 3, cy: -2.6, cz: HOLE.z - 1.2, rx: 1.6, rz: 1.1, period: 11 }} count={14} scale={0.5} reduced={reduced} />
      <KrillSwarm center={[HOLE.x + 1, -1.8, HOLE.z - 1.6]} count={60} spread={1.2} scale={0.14} reduced={reduced} />
    </>}
    {view === 'emperor-dive' && <>
      <SwimmingEmperor pose={state.dived ? emperorDive : (t) => ({ ...emperorDive(0), stroke: Math.sin(t) * 0.1 })} reduced={reduced} still={state.dived ? 0.5 * 16 : 0} />
      <Follow pose={emperorDive} active={state.dived} reduced={reduced} />
      <FishSchool loop={{ cx: DIVE_BOTTOM.x, cy: DIVE_BOTTOM.y, cz: DIVE_BOTTOM.z, rx: 1.4, rz: 1, period: 10 }} count={16} scale={0.5} reduced={reduced} />
      <Squids reduced={reduced} />
    </>}
    {view === 'leopard' && <>
      <LeopardSeal swimming reduced={reduced} />
      <FishSchool loop={{ cx: LEOPARD_PREY.fish[0], cy: LEOPARD_PREY.fish[1], cz: LEOPARD_PREY.fish[2], rx: 0.6, rz: 0.5, period: 6 }} count={12} scale={0.5} reduced={reduced} />
      <KrillSwarm center={LEOPARD_PREY.krill} count={60} spread={0.9} scale={0.2} reduced={reduced} />
    </>}
    {view === 'teeth' && <>
      <LeopardSeal swimming={false} reduced={reduced} />
      <SuctionFlow reduced={reduced} />
      <KrillSwarm center={[LEOPARD_MOUTH[0] + 1.6, LEOPARD_MOUTH[1], LEOPARD_MOUTH[2]]} count={40} spread={0.8} scale={0.12} reduced={reduced} />
      {state.compared && <>
        <Prop id="baleen" boxes={BALEEN_DETAIL} position={[-0.2, -1.15, 1.4]} scale={0.75} rotation={[0, 0.25, 0]} />
        <Prop id="teeth" boxes={TEETH_DETAIL} position={[1.9, -1.15, 1.4]} scale={0.75} rotation={[0, -0.25, 0]} />
      </>}
    </>}
    {view === 'orcas' && <OrcaPod reduced={reduced} />}
    {view === 'web' && <FoodWeb3D selected={state.selected} reduced={reduced} />}
  </>;
}

function AboveIce({ view, reduced }: { view: MarineView; reduced: boolean }) {
  const closing = view === 'closing';
  if (view === 'orcas') return <>
    <Sky reduced={reduced} />
    <fog attach="fog" args={['#DCE8EC', 30, 90]} />
    <SeaSurface under={false} />
    <Ice />
    <OrcaWave reduced={reduced} />
  </>;
  return <>
    <Sky reduced={reduced} />
    <fog attach="fog" args={['#DCE8EC', 30, 90]} />
    <SeaSurface under={false} />
    <Ice />
    <Prop id="standing-emperors" boxes={STANDING} position={[HOLE.x + 1.6, ICE_TOP + 0.12, HOLE.z - 0.4]} scale={0.9} rotation={[0, -0.75, 0]} />
    <Prop id="iceberg" boxes={SEA_MODELS['iceberg-lg']} position={[-14, -0.05, -22]} scale={9} rotation={[0, 0.4, 0]} />
    <Prop id="iceberg-sm" boxes={SEA_MODELS['iceberg-sm']} position={[16, -0.05, 12]} scale={6} rotation={[0, -0.8, 0]} />
    {view === 'emperor' && <SwimmingEmperor pose={() => ({ ...emperorDive(0), stroke: 0 })} reduced />}
    <Minke reduced={reduced} showBlow />
    {(closing || view === 'ceiling') && <OrcaPod reduced={reduced} />}
    <Particles kind="snow" reduced={reduced} />
  </>;
}

// --- Camera -----------------------------------------------------------------------------------

interface Framing { target: Vec3; distance: number; direction: Vec3 }
function framingFor(view: MarineView, state: MarineState, narrow: boolean): Framing {
  const k = narrow ? 1.3 : 1;
  const under = isUnderwater(view, state);
  switch (view) {
    case 'ceiling': return under
      ? { target: [0.5, -1.4, -1.5], distance: 10 * k, direction: [0.5, -0.32, 1] }
      : { target: [-0.5, 0, -1.5], distance: 17 * k, direction: [0.55, 0.5, 1] };
    case 'micro': return { target: [0, -2.2, 0], distance: (state.magnified ? 5.6 : 4.2) * k, direction: [0.2, -0.1, 1] };
    case 'krill': return { target: KRILL_SWARM, distance: 5.2 * k, direction: [0.45, -0.18, 1] };
    case 'humpback': return { target: [HUMPBACK_AT.x + 1.2, HUMPBACK_AT.y - 0.2, HUMPBACK_AT.z], distance: (state.filtered ? 7.5 : 9) * k, direction: [0.35, -0.12, 1] };
    // Framed on the middle krill patch, where the minke lunges, with the lead in view behind.
    case 'minke': return { target: MINKE_KRILL_PATCHES[1], distance: (state.followed ? 8 : 10) * k, direction: [0.3, -0.2, -1] };
    case 'emperor': return under
      ? { target: [HOLE.x + 2, -1.8, HOLE.z - 0.6], distance: 8 * k, direction: [0.45, -0.25, 1] }
      : { target: [HOLE.x + 1, 0.5, HOLE.z - 0.2], distance: 7 * k, direction: [0.8, 0.4, 1] };
    // From below the hole, looking up: the emperor is seen breathing in the opening and then diving.
    case 'emperor-dive': return state.dived
      ? { target: [HOLE.x + 1.4, -2.4, HOLE.z - 0.5], distance: 9 * k, direction: [0.35, -0.75, 0.6] }
      : { target: [HOLE.x, -0.3, HOLE.z], distance: 6.5 * k, direction: [0.35, -0.75, 0.6] };
    case 'leopard': return { target: [LEOPARD_LOOP.cx, LEOPARD_LOOP.cy, LEOPARD_LOOP.cz], distance: 9 * k, direction: [0.35, -0.2, 1] };
    case 'teeth': return { target: [LEOPARD_STILL.x + 0.9, -1.75, LEOPARD_STILL.z + 0.6], distance: (state.compared ? 5.6 : 4.6) * k, direction: [0.2, -0.12, 1] };
    case 'orcas': return state.example
      ? { target: [WAVE_FLOE.x - 2, 0, WAVE_FLOE.z], distance: 13 * k, direction: [0.25, 0.5, 1] }
      : { target: [ORCA_LOOP.cx, -0.9, ORCA_LOOP.cz], distance: 19 * k, direction: [0.45, -0.2, 1] };
    case 'web': return { target: [0, -4.8, -1], distance: 13 * (narrow ? 1.6 : 1), direction: [0, -0.04, 1] };
    case 'closing': return { target: [-1, 0, 0], distance: 24 * k, direction: [0.7, 0.45, 1] };
  }
}

function SceneCamera({ view, state, reduced, reset }: { view: MarineView; state: MarineState; reduced: boolean; reset: number }) {
  const controls = useRef<CameraControls>(null);
  const initialized = useRef(false);
  const size = useThree((s) => s.size);
  const { under, magnified, filtered, followed, dived, compared, example } = state;
  useEffect(() => {
    const cc = controls.current;
    if (!cc) return;
    const { target, distance, direction } = framingFor(view, state, size.width / size.height < 1.05);
    const len = Math.hypot(...direction);
    const below = isUnderwater(view, state);
    cc.minDistance = distance * 0.6;
    cc.maxDistance = distance * 1.4;
    // Under the ice the camera stays below its target, so it never leaves the water.
    cc.minPolarAngle = below ? Math.PI * 0.5 : Math.PI * 0.12;
    cc.maxPolarAngle = below ? Math.PI * 0.82 : Math.PI * 0.45;
    cc.smoothTime = 0.6;
    void cc.setLookAt(
      target[0] + (direction[0] / len) * distance, target[1] + (direction[1] / len) * distance, target[2] + (direction[2] / len) * distance,
      ...target, initialized.current && !reduced,
    );
    initialized.current = true;
  }, [view, under, magnified, filtered, followed, dived, compared, example, reduced, size.width, size.height, reset]);
  return <CameraControls ref={controls} makeDefault dollySpeed={0.6} truckSpeed={0} />;
}

// --- Canvas -----------------------------------------------------------------------------------

const SCENE_FPS = 60;
const LOW_QUALITY_FPS = 30;

/** Keeps the demand-driven canvas drawing while the scene animates, as in Orcadas and Fósiles. */
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

/** With reduced motion the canvas only draws on demand: give a changed scene a few frames to settle. */
function Settle({ state }: { state: MarineState }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => { invalidate(); if (++n > 6) clearInterval(id); }, 60);
    return () => clearInterval(id);
  }, [state, invalidate]);
  return null;
}

export function MarineScene({ view, state, reduced, reset }: { view: MarineView; state: MarineState; reduced: boolean; reset: number }) {
  const [lowQuality, setLowQuality] = useState(false);
  const [ink, setInk] = useState(false);
  const under = isUnderwater(view, state);
  return (
    <Canvas role="img" aria-label={under ? 'Escena ilustrativa bajo el hielo marino' : 'Escena ilustrativa sobre el hielo marino'}
      frameloop="demand" dpr={lowQuality ? 0.7 : [1, 1.5]} camera={{ position: [10, 12, 18], fov: 38, near: 0.1, far: 300 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
      <SceneClock reduced={reduced} lowQuality={lowQuality} />
      {!reduced && (
        <PerformanceMonitor bounds={() => (lowQuality ? [24, 27] : [36, 42])} flipflops={4}
          onIncline={() => { setLowQuality(false); setInk(true); }} onDecline={() => { setLowQuality(true); setInk(false); }} />
      )}
      <SceneCamera view={view} state={state} reduced={reduced} reset={reset} />
      {under ? <Underwater view={view} state={state} reduced={reduced} /> : <AboveIce view={view} reduced={reduced} />}
      {ink && !lowQuality && <EffectComposer multisampling={0}><InkEffect /></EffectComposer>}
      <Settle state={state} />
      <SceneReady />
    </Canvas>
  );
}
