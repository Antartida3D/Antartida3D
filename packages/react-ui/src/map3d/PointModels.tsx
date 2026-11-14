import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { BoxGeometry, Color, Frustum, IcosahedronGeometry, Matrix4, MeshBasicMaterial, Sphere, type BufferGeometry, type Group, type Mesh, type Vector3 } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { FOV, MODEL_MIN_PX, PTS, heightAt, screenPx, worldHeight, type MapPoint } from '@antartida/core';
import {
  AURORA_RAYS,
  auroraRay,
  BELGRANO_AURORA_ANCHOR,
  BELGRANO_FLAGS,
  BOMBS,
  calvingPose,
  EMPEROR_HUDDLE,
  EMPEROR_HUDDLE_CENTER,
  erebusSummit,
  flagCloth,
  flagSwing,
  huddleTurn,
  lavaBomb,
  PLUME_PUFFS,
  plumePuff,
  POINT_MODELS,
  POLO_FLAGS,
  STEAM_PER_TOWER,
  thwaitesFront,
  towerSteam,
  type ErebusSummit,
  type PointFlag,
  type PointModel,
} from '../voyage/pointModels.ts';
import { buildPolyGeometry, resolveRelief, type Tri, type Vec3 } from '../voyage/lowPoly.ts';
import { vehicleMaterial } from '../voyage/vehicles.ts';

/** Highest relief within `radius` map units of (x, y), searched on a fine grid: the top of a mountain, in map space. */
function summit(x: number, y: number, radius: number): { x: number; y: number } {
  let best = { x, y, h: heightAt(x, y) };
  for (let i = -8; i <= 8; i++) {
    for (let j = -8; j <= 8; j++) {
      const px = x + (i / 8) * radius;
      const py = y + (j / 8) * radius;
      const h = heightAt(px, py);
      if (h > best.h) best = { x: px, y: py, h };
    }
  }
  return best;
}

const frustum = new Frustum();
const viewProjection = new Matrix4();
const bounds = new Sphere();

/** Whether something of this size at this position is in front of the camera: off screen it asks for no frames. */
function inView(camera: { projectionMatrix: Matrix4; matrixWorldInverse: Matrix4 }, at: Vector3, size: number): boolean {
  frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  return frustum.intersectsSphere(bounds.set(at, size));
}

/** Below this width on screen the moving parts are too small to see move: no frames are asked for them. */
const MOVING_MIN_PX = 40;

// Effects are low-poly too (docs/diseno/estilo-voxel.md, rule 9), with their own flat materials.
const puffGeometry = new IcosahedronGeometry(0.5, 0);
const rayGeometry = new BoxGeometry(1, 1, 1);
const plumeMaterial = new MeshBasicMaterial({ color: 0xd3d9de, transparent: true, opacity: 0.75 });
const steamMaterial = new MeshBasicMaterial({ color: 0xf7fafb, transparent: true, opacity: 0.7 });
const bombMaterial = new MeshBasicMaterial({ color: 0xf0661c });
const auroraMaterial = new MeshBasicMaterial({ color: 0x6fe3a0, transparent: true, opacity: 0.2, depthWrite: false });
const LAVA_DIM = new Color(0xb8411c);
const LAVA_BRIGHT = new Color(0xffc24a);

type Placed = { id: string; point: MapPoint; model: PointModel & { map: readonly Tri[] } };

const PLACED: readonly Placed[] = Object.entries(POINT_MODELS).flatMap(([id, model]) => {
  const point = PTS.find((p) => p.id === id);
  return point && model.map ? [{ id, point, model: model as Placed['model'] }] : [];
});

/** A moving part of a model, moved every frame by `move(t)`. */
interface Part {
  move: (t: number) => void;
}

/** Registers a moving part with its model while it is mounted. */
function usePart(parts: MutableRefObject<Part[]>, move: (t: number) => void) {
  useEffect(() => {
    const part = { move };
    parts.current.push(part);
    return () => void parts.current.splice(parts.current.indexOf(part), 1);
  }, [parts, move]);
}

/**
 * From afar a model grows to about this height on screen in px (a small mark that invites to pick
 * the point), up to GROW_MAX times its width; up close it keeps its width, lying on the relief.
 */
const GROW_PX = 26;
const GROW_MAX = 12;

/** How far (world units) the feet of a model go into the relief: its foundations. */
const FOUNDATION = 0.06;

/** A geometry built from faces, disposed when it changes or unmounts. */
function usePolyGeometry(tris: readonly Tri[]): BufferGeometry {
  const geometry = useMemo(() => buildPolyGeometry(tris), [tris]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

/** Flag cloths hanging from their pole tops, each its own geometry so it can swing. */
function Flags({ flags, parts }: { flags: readonly PointFlag[]; parts: MutableRefObject<Part[]> }) {
  const geometries = useMemo(() => flags.map((f) => buildPolyGeometry(flagCloth({ ...f, top: [0, 0, 0] }))), [flags]);
  const groups = useRef<(Group | null)[]>([]);
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);
  const move = useMemo(() => (t: number) => groups.current.forEach((g, i) => g && (g.rotation.y = flagSwing(i, t))), []);
  usePart(parts, move);
  return (
    <>
      {flags.map((f, i) => (
        <group key={i} position={f.top as [number, number, number]} ref={(g) => void (groups.current[i] = g)}>
          <mesh geometry={geometries[i]} material={vehicleMaterial} />
        </group>
      ))}
    </>
  );
}

/** Emperors: the huddle turns slowly round its centre. */
function HuddlePart({ parts }: { parts: MutableRefObject<Part[]> }) {
  const geometry = usePolyGeometry(EMPEROR_HUDDLE);
  const pivot = useRef<Group>(null);
  const move = useMemo(() => (t: number) => void (pivot.current && (pivot.current.rotation.y = huddleTurn(t))), []);
  usePart(parts, move);
  return (
    <group ref={pivot} position={EMPEROR_HUDDLE_CENTER as [number, number, number]}>
      <mesh geometry={geometry} material={vehicleMaterial} />
    </group>
  );
}

/** Belgrano II: a curtain of aurora sways over the base. */
function AuroraPart({ parts }: { parts: MutableRefObject<Part[]> }) {
  const rays = useRef<(Mesh | null)[]>([]);
  const move = useMemo(
    () => (t: number) =>
      rays.current.forEach((m, i) => {
        if (!m) return;
        const { x, height, z } = auroraRay(i, t);
        m.position.set(x, BELGRANO_AURORA_ANCHOR[1], z);
        m.scale.set(0.035, height, 0.01);
      }),
    [],
  );
  usePart(parts, move);
  return (
    <>
      {Array.from({ length: AURORA_RAYS }, (_, i) => (
        <mesh key={i} ref={(m) => void (rays.current[i] = m)} geometry={rayGeometry} material={auroraMaterial} renderOrder={2} />
      ))}
    </>
  );
}

/** World height of the relief at a world position. */
const reliefAt = (wx: number, wz: number) => worldHeight(heightAt(wx + 500, wz + 500));

/** Where a model sits on the map: its pad height and how its ground lies on the relief. */
interface Seat {
  ground: number;
  padY: number;
  /** World height the model's ground has at a world position: the pad inside, the relief outside. */
  floor: (wx: number, wz: number) => number;
}

/** World x, z of the middle of a model: its point, moved by its offset. */
const centerOf = (point: MapPoint, model: PointModel) => ({ x: point.x - 500 + (model.offset?.[0] ?? 0), z: point.y - 500 + (model.offset?.[1] ?? 0) });

/** Every model's seat once it is set on the relief: the close-up looks at it. */
const SEATS = new Map<string, Seat>();

function seatOf(point: MapPoint, model: Placed['model'], ground: number): Seat {
  const width = model.width ?? 1;
  const { x: cx, z: cz } = centerOf(point, model);
  const padR = (model.pad ?? 0) * width;
  const samples = [reliefAt(cx, cz)];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    for (const r of [0.5, 1]) samples.push(reliefAt(cx + Math.cos(a) * padR * r, cz + Math.sin(a) * padR * r));
  }
  const padY = model.footing === 'highest' ? Math.max(...samples) : samples.reduce((a, b) => a + b, 0) / samples.length;
  const edge = width / 2;
  return {
    ground,
    padY,
    floor: (wx, wz) => {
      const r = Math.hypot(wx - cx, wz - cz);
      const t = Math.min(1, Math.max(0, (r - padR) / Math.max(1e-6, edge - padR)));
      return padY + (reliefAt(wx, wz) - padY) * t * t * (3 - 2 * t);
    },
  };
}

/**
 * The model in world space, lying on the relief: turned to its heading, scaled to its width and
 * every vertex raised to the floor under it (the levelled pad, then the relief). Its ground faces
 * take the colors of the relief from their real slope (resolveRelief).
 */
function seatTris(tris: readonly Tri[], point: MapPoint, model: Placed['model'], seat: Seat): Tri[] {
  const width = model.width ?? 1;
  const c = Math.cos(model.heading ?? 0);
  const s = Math.sin(model.heading ?? 0);
  const { x: cx, z: cz } = centerOf(point, model);
  const place = ([x, y, z]: Vec3): Vec3 => {
    const wx = cx + (x * c + z * s) * width;
    const wz = cz + (-x * s + z * c) * width;
    // What stands on the ground goes on below it: on a bump of the relief it does not float.
    return [wx, y * width + seat.floor(wx, wz) - (y <= 0.0005 ? FOUNDATION : 0), wz];
  };
  return resolveRelief(tris.map(([a, b, d, col]) => [place(a), place(b), place(d), col]));
}

function PointModelMesh({ id, point, model, reduced }: Placed & { reduced: boolean }) {
  const group = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const parts = useRef<Part[]>([]);
  const seat = useRef<Seat | null>(null);
  const width = model.width ?? 1;
  // With reduced motion switched on, draw once more so the parts settle at rest.
  const invalidateScene = useThree((st) => st.invalidate);
  useEffect(() => invalidateScene(), [reduced, invalidateScene]);
  useEffect(() => {
    const mesh = body.current;
    return () => mesh?.geometry.dispose();
  }, []);

  useFrame(({ camera, size, clock, invalidate }) => {
    const g = group.current;
    const m = body.current;
    if (!g || !m) return;
    // The relief loads after the scene and changes its detail: seat the model again when it does.
    // Every point with a model is on land: before the relief loads there is nothing to stand on.
    const ground = heightAt(point.x, point.y);
    if (ground === 0) return void (m.visible = g.visible = false);
    if (seat.current?.ground !== ground) {
      seat.current = seatOf(point, model, ground);
      SEATS.set(id, seat.current);
      const center = centerOf(point, model);
      // The geometry is kept relative to the middle of the pad, so the model can grow from there.
      const local = seatTris(model.map, point, model, seat.current).map(([a, b, c, col]): Tri => [
        [a[0] - center.x, a[1] - seat.current!.padY, a[2] - center.z],
        [b[0] - center.x, b[1] - seat.current!.padY, b[2] - center.z],
        [c[0] - center.x, c[1] - seat.current!.padY, c[2] - center.z],
        col,
      ]);
      m.geometry.dispose();
      m.geometry = buildPolyGeometry(local);
      g.position.set(center.x, seat.current.padY, center.z);
    }
    const distance = camera.position.distanceTo(g.position);
    // Up close the model has its width and lies on the relief; farther it grows so it is still seen
    // (GROW_PX on screen at most GROW_MAX times its width) and invites to pick the point.
    const grow = Math.min(GROW_MAX, Math.max(1, (GROW_PX * 2 * distance * Math.tan((FOV * Math.PI) / 360)) / (size.height * width)));
    g.scale.setScalar(grow);
    const px = screenPx(width * grow, distance, size.height);
    m.visible = g.visible = px >= MODEL_MIN_PX;
    if (!parts.current.length || !g.visible) return;
    const t = reduced ? 0 : clock.elapsedTime;
    for (const p of parts.current) p.move(t);
    // A hidden tab asks for no frames, like the sea clock (useAnimationClock).
    if (!reduced && !document.hidden && px >= MOVING_MIN_PX && inView(camera, g.position, width * grow)) invalidate();
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={body} material={vehicleMaterial} />
      {/* The moving parts, in model units on the pad: this group carries the model's turn and width. */}
      <group rotation-y={model.heading ?? 0} scale={width}>
        {id === 'emperador' && <HuddlePart parts={parts} />}
        {id === 'polo' && <Flags flags={POLO_FLAGS} parts={parts} />}
        {id === 'belgrano' && (
          <>
            <Flags flags={BELGRANO_FLAGS} parts={parts} />
            <AuroraPart parts={parts} />
          </>
        )}
      </group>
    </group>
  );
}

const EREBUS = PTS.find((p) => p.id === 'erebus')!;
/** The summit is searched this far (map units) round the point: the peak of Ross Island. */
const EREBUS_SEARCH = 3;
/** World width of the summit (twice EREBUS_REACH of pointModels.ts), for visibility and frames. */
const EREBUS_WIDTH = 4.4;

/**
 * Mount Erebus: the summit is raised from the relief of Ross Island, at the scale of the map (its
 * crater a few times wider, so it can be seen), so it does not grow or shrink with the camera. It
 * is rebuilt when the relief loads or changes its detail. The lava lake flickers, the plume rises
 * from the vent, steam leaves the ice towers and now and then bombs fly onto the rim.
 */
function ErebusSummitMesh({ reduced }: { reduced: boolean }) {
  const group = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const lava = useRef<Mesh>(null);
  const built = useRef<{ ground: number; summit: ErebusSummit | null }>({ ground: NaN, summit: null });
  const glowMaterial = useMemo(() => new MeshBasicMaterial({ color: LAVA_BRIGHT }), []);
  const glow = useRef<Mesh>(null);
  const puffs = useRef<(Mesh | null)[]>([]);
  const steam = useRef<(Mesh | null)[]>([]);
  const bombs = useRef<(Mesh | null)[]>([]);
  const invalidateScene = useThree((st) => st.invalidate);
  useEffect(() => invalidateScene(), [reduced, invalidateScene]);
  useEffect(() => {
    const bodyMesh = body.current;
    const lavaMesh = lava.current;
    return () => {
      bodyMesh?.geometry.dispose();
      lavaMesh?.geometry.dispose();
      glowMaterial.dispose();
    };
  }, [glowMaterial]);

  useFrame(({ camera, size, clock, invalidate }) => {
    const g = group.current;
    if (!g || !body.current || !lava.current) return;
    const ground = heightAt(EREBUS.x, EREBUS.y);
    // Without the relief there is no island to stand on.
    if (ground === 0) return void (g.visible = false);
    if (ground !== built.current.ground) {
      const top = summit(EREBUS.x, EREBUS.y, EREBUS_SEARCH);
      const s = erebusSummit((dx, dz) => worldHeight(heightAt(top.x + dx, top.y + dz)));
      body.current.geometry.dispose();
      body.current.geometry = buildPolyGeometry(s.tris);
      lava.current.geometry.dispose();
      lava.current.geometry = buildPolyGeometry(s.lava);
      glow.current?.position.set(s.vent[0] + 0.02, s.vent[1] - 0.004, s.vent[2] - 0.01);
      g.position.set(top.x - 500, 0, top.y - 500);
      built.current = { ground, summit: s };
    }
    const s = built.current.summit!;
    const center = g.position.clone().setY(s.rim);
    const px = screenPx(EREBUS_WIDTH, camera.position.distanceTo(center), size.height);
    g.visible = px >= MODEL_MIN_PX;
    if (!g.visible) return;
    const t = reduced ? 0 : clock.elapsedTime;
    glowMaterial.color.lerpColors(LAVA_DIM, LAVA_BRIGHT, 0.6 + 0.4 * Math.sin(t * 3.1) * Math.sin(t * 1.7));
    glow.current?.scale.set(0.09 + 0.03 * Math.sin(t * 2.3), 0.006, 0.09 + 0.03 * Math.cos(t * 1.9));
    puffs.current.forEach((m, i) => {
      if (!m) return;
      const { at, size: d } = plumePuff(s.vent, i, t);
      m.position.set(...at);
      m.scale.setScalar(d);
    });
    steam.current.forEach((m, k) => {
      if (!m) return;
      const tower = Math.floor(k / STEAM_PER_TOWER);
      const { at, size: d } = towerSteam(s.towers[tower], tower, k % STEAM_PER_TOWER, t);
      m.position.set(...at);
      m.scale.setScalar(d);
    });
    bombs.current.forEach((m, i) => {
      if (!m) return;
      const at = lavaBomb(s.vent, s.rim, i, t);
      m.visible = at !== null;
      if (at) m.position.set(...at);
    });
    if (!reduced && !document.hidden && px >= MOVING_MIN_PX && inView(camera, center, EREBUS_WIDTH)) invalidate();
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={body} material={vehicleMaterial} />
      <mesh ref={lava} material={vehicleMaterial} />
      <mesh ref={glow} geometry={puffGeometry} material={glowMaterial} />
      {Array.from({ length: PLUME_PUFFS }, (_, i) => (
        <mesh key={`p${i}`} ref={(m) => void (puffs.current[i] = m)} geometry={puffGeometry} material={plumeMaterial} />
      ))}
      {Array.from({ length: 3 * STEAM_PER_TOWER }, (_, i) => (
        <mesh key={`s${i}`} ref={(m) => void (steam.current[i] = m)} geometry={puffGeometry} material={steamMaterial} />
      ))}
      {Array.from({ length: BOMBS }, (_, i) => (
        <mesh key={`b${i}`} ref={(m) => void (bombs.current[i] = m)} geometry={puffGeometry} material={bombMaterial} scale={0.05} />
      ))}
    </group>
  );
}

/**
 * Where the close-up of a point looks (world space): the middle of its model on the relief, or for
 * Erebus the crater on the peak of Ross Island.
 */
export function pointFocus(id: string): { x: number; y: number; z: number } {
  const p = PTS.find((q) => q.id === id)!;
  if (id === THWAITES.id) return { x: p.x - 500, y: worldHeight(heightAt(p.x, p.y)), z: p.y - 500 + 0.4 };
  if (id === EREBUS.id) {
    const top = summit(p.x, p.y, EREBUS_SEARCH);
    return { x: top.x - 500, y: worldHeight(heightAt(top.x, top.y)), z: top.y - 500 };
  }
  const model = POINT_MODELS[id];
  const center = centerOf(p, model);
  return { x: center.x, y: SEATS.get(id)?.padY ?? worldHeight(heightAt(center.x + 500, center.z + 500)), z: center.z };
}

const THWAITES = PTS.find((p) => p.id === 'thwaites')!;
/** World width of the front (twice its reach in pointModels.ts), for visibility and frames. */
const THWAITES_WIDTH = 6;

/**
 * Thwaites Glacier: the ice cliff, crevasses and brash ice are built from the real coastline round
 * its point, at the scale of the map, and rebuilt when the relief loads or changes its detail. Now
 * and then a block of the front tips over into the sea and sinks.
 */
function ThwaitesMesh({ reduced }: { reduced: boolean }) {
  const group = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const block = useRef<Mesh>(null);
  const pivot = useRef<Group>(null);
  const turnRef = useRef<Group>(null);
  const built = useRef<{ ground: number; ok: boolean }>({ ground: NaN, ok: false });
  const invalidateScene = useThree((st) => st.invalidate);
  useEffect(() => invalidateScene(), [reduced, invalidateScene]);
  useEffect(() => {
    const a = body.current;
    const b = block.current;
    return () => {
      a?.geometry.dispose();
      b?.geometry.dispose();
    };
  }, []);

  useFrame(({ camera, size, clock, invalidate }) => {
    const g = group.current;
    if (!g || !body.current || !block.current || !pivot.current || !turnRef.current) return;
    const ground = heightAt(THWAITES.x, THWAITES.y);
    if (ground === 0) return void (g.visible = false);
    if (ground !== built.current.ground) {
      const f = thwaitesFront((dx, dz) => {
        const h = heightAt(THWAITES.x + dx, THWAITES.y + dz);
        return h > 0 ? worldHeight(h) : 0;
      });
      body.current.geometry.dispose();
      body.current.geometry = buildPolyGeometry(resolveRelief(f.tris));
      block.current.geometry.dispose();
      block.current.geometry = buildPolyGeometry(f.calving?.tris ?? []);
      if (f.calving) {
        turnRef.current.position.set(...f.calving.pivot);
        turnRef.current.rotation.y = f.calving.heading;
      }
      g.position.set(THWAITES.x - 500, 0, THWAITES.y - 500);
      built.current = { ground, ok: !!f.calving };
    }
    const px = screenPx(THWAITES_WIDTH, camera.position.distanceTo(g.position), size.height);
    g.visible = px >= MODEL_MIN_PX;
    if (!g.visible || !built.current.ok) return;
    const t = reduced ? 0 : clock.elapsedTime;
    const { tilt, sink, visible } = calvingPose(t);
    pivot.current.rotation.x = tilt;
    pivot.current.position.y = sink;
    pivot.current.visible = visible;
    if (!reduced && !document.hidden && px >= MOVING_MIN_PX && inView(camera, g.position, THWAITES_WIDTH)) invalidate();
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={body} material={vehicleMaterial} />
      <group ref={turnRef}>
        <group ref={pivot}>
          <mesh ref={block} material={vehicleMaterial} />
        </group>
      </group>
    </group>
  );
}

/** Low-poly models of the map points that have no expedition yet, standing on the relief, with their moving parts. */
export function PointModels({ reduced = false }: { reduced?: boolean }) {
  return (
    <>
      {PLACED.map((p) => (
        <PointModelMesh key={p.id} {...p} reduced={reduced} />
      ))}
      <ErebusSummitMesh reduced={reduced} />
      <ThwaitesMesh reduced={reduced} />
    </>
  );
}
