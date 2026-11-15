import { useEffect, useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import {
  SCENE_STRIDE,
  sceneElementShown,
  sceneHop,
  scenePathLength,
  scenePersonPhase,
  sceneWalk,
  printsShown,
  stageProgress,
  stageScale,
  type SceneDef,
  type SceneElement,
  type ScenePath,
} from '@antartida/core';
import { OBSERVER_HIP_Y, OBSERVER_HIP_Z, OBSERVER_SHOULDER_Y, OBSERVER_SHOULDER_Z } from '../orcadas/lowPolyPeople.ts';
import { VOXEL_PALETTE } from '../orcadas/stationModels.ts';
import { boxShade, buildPolyGeometry, resolveRelief, type Vec3 } from './lowPoly.ts';
import { buildBeltTris, ponchoPersonParts, ponchoPoseLift, ponchoWaistAt, type PersonPose, type PersonVariant } from './ponchoPeople.ts';
import { ponchoDogTris } from './ponchoDog.ts';
import { PONCHO_PALETTE, type DogPalette } from './ponchoModels.ts';
import { PONCHO_PROPS } from './ponchoProps.ts';
import { DOG_SCALE, elementStaticTris, pathFootprints, type Ground } from './ponchoSceneBuild.ts';
import { ROPE_SEGMENTS, ropeIndices, ropePoints, ropeVertexCount, fillRopeTube } from './ponchoRope.ts';
import { TOOL_THICKNESS, heldTool, scenePose } from './ponchoTools.ts';
import { buildBoxGeometry, vehicleMaterial } from './vehicles.ts';

/**
 * What happens in a diorama of Poncho (issue #146), at human scale and never scaled by the camera: the
 * people who work (they walk leaving prints, hammer, probe, shovel, cheer), the tent, the poles, the plane
 * and the dogs, drawn low-poly (rule 30). What each scene shows is in `PONCHO_SCENES` (@antartida/core);
 * here only how it is drawn. All is illustration, and the screen says so once.
 *
 * Stages (issue #146): every element shows only at the steps of the tour it belongs to (`appearAt`, `until`
 * of the scene, core/poncho-scenes.ts) and grows out of the ground when it comes and sinks back when it goes
 * (`stageProgress`, `stageScale`); the clock of its walk starts when it shows. With reduced motion it simply is
 * or is not there.
 *
 * Cost: each prop (and the stake or drift of a person or dog) is ONE mesh, built once; the prints are one more
 * mesh revealed with the draw range; each person is five meshes (torso, two arms, two legs) turned by their
 * pose, plus two for the tool and one for the belt; each dog and sled is one; a line is one small mesh whose
 * ten points are moved every frame. No shadows. With reduced motion nothing moves.
 */

/** Longest frame the clock of a scene advances, in seconds. */
const MAX_FRAME = 0.1;
/** With reduced motion, the clock rests here: the walks are over and nothing hops. */
const REDUCED_CLOCK = 1e4;

// Colors of the tools and of the darker dogs of the team (rule 30, 5: named constants).
const { WOOD_LIGHT, ZINC } = VOXEL_PALETTE;
const PACK_DARKEN = 0.62;
/** A dog of the team that lies curled: how much it is squashed, and how far it sinks into its drift. */
const CURLED_HEIGHT = 0.55;
const CURLED_SINK = 0.03;
/** Sway of a dog standing (radians), its trot bob (scene units) and their speeds (radians per second). */
const DOG_SWAY = 0.04;
const DOG_BOB = 0.035;
const DOG_SWAY_RATE = 1.3;
const DOG_BOB_RATE = 13;
/** The sled leans with the ground over this length (scene units). */
const SLED_SPAN = 0.55;
/** Where the line is tied on a dog (its model frame: x ahead, y up): the back, over the hips. */
const DOG_HARNESS: Vec3 = [-0.28, 0.58, 0];
/** The line shows once both its ends are this grown. */
const ROPE_SHOW = 0.95;
const ropeMaterial = new MeshBasicMaterial({ vertexColors: true, side: DoubleSide });
const ROPE_COLOR = VOXEL_PALETTE.CREAM;

const darken = (hex: number, k: number): number =>
  (Math.round(((hex >> 16) & 255) * k) << 16) | (Math.round(((hex >> 8) & 255) * k) << 8) | Math.round((hex & 255) * k);
const darkened = (p: DogPalette, k: number): DogPalette => ({
  coat: darken(p.coat, k),
  shade: darken(p.shade, k),
  patch: darken(p.patch, k),
  muzzle: darken(p.muzzle, k),
  ear: p.ear,
  tail: darken(p.tail, k),
});

/** Geometries shared by every scene, built on first use. */
interface Shared {
  dogs: Record<string, BufferGeometry>;
  sled: BufferGeometry;
  woodBar: BufferGeometry;
  metalBar: BufferGeometry;
  belt: BufferGeometry;
  parts: Map<PersonVariant, Record<'torso' | 'legL' | 'legR' | 'armL' | 'armR', BufferGeometry>>;
}
let shared: Shared | null = null;
function sharedGeometry(): Shared {
  return (shared ??= {
    dogs: { poncho: buildPolyGeometry(ponchoDogTris(), boxShade), pack: buildPolyGeometry(ponchoDogTris(darkened(PONCHO_PALETTE, PACK_DARKEN)), boxShade) },
    // The ground faces of the prop (colored as the relief) would drag along with a moving sled: left out.
    sled: buildPolyGeometry(PONCHO_PROPS.nansenSled.tris.filter((t) => t[3] >= 0)),
    woodBar: buildBoxGeometry([[0, 0, 0, 1, 1, 1, WOOD_LIGHT]]),
    metalBar: buildBoxGeometry([[0, 0, 0, 1, 1, 1, ZINC]]),
    belt: buildPolyGeometry(buildBeltTris()),
    parts: new Map(),
  });
}
function personGeometry(variant: PersonVariant) {
  const s = sharedGeometry();
  let g = s.parts.get(variant);
  if (!g) {
    const p = ponchoPersonParts(variant);
    g = { torso: buildPolyGeometry(p.torso), legL: buildPolyGeometry(p.legL), legR: buildPolyGeometry(p.legR), armL: buildPolyGeometry(p.armL), armR: buildPolyGeometry(p.armR) };
    s.parts.set(variant, g);
  }
  return g;
}

/** The nodes of one person that the frame turns. */
interface PersonRig {
  root: Group;
  lift: Group;
  upper: Group;
  armL: Group;
  armR: Group;
  legL: Group;
  legR: Group;
  stick: Mesh;
  head: Mesh;
}

/** A person: the five parts of the articulated figure of Orcadas on pivots, the two meshes of the tool and, if they wear it, the belt. */
function Person({ variant, belt, onRig }: { variant: PersonVariant; belt: boolean; onRig: (rig: PersonRig | null) => void }) {
  const g = personGeometry(variant);
  const s = sharedGeometry();
  const root = useRef<Group>(null);
  const lift = useRef<Group>(null);
  const upper = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const legL = useRef<Group>(null);
  const legR = useRef<Group>(null);
  const stick = useRef<Mesh>(null);
  const head = useRef<Mesh>(null);
  useEffect(() => {
    const r = { root: root.current, lift: lift.current, upper: upper.current, armL: armL.current, armR: armR.current, legL: legL.current, legR: legR.current, stick: stick.current, head: head.current };
    if (Object.values(r).every(Boolean)) onRig(r as PersonRig);
    return () => onRig(null);
  }, [onRig]);
  return (
    <group ref={root}>
      <group ref={lift}>
        <group ref={upper} position={[0, OBSERVER_HIP_Y, 0]}>
          <mesh geometry={g.torso} material={vehicleMaterial} position={[0, -OBSERVER_HIP_Y, 0]} />
          {belt && <mesh geometry={s.belt} material={vehicleMaterial} position={[0, -OBSERVER_HIP_Y, 0]} />}
          <group ref={armL} position={[0, OBSERVER_SHOULDER_Y - OBSERVER_HIP_Y, -OBSERVER_SHOULDER_Z]}>
            <mesh geometry={g.armL} material={vehicleMaterial} />
          </group>
          <group ref={armR} position={[0, OBSERVER_SHOULDER_Y - OBSERVER_HIP_Y, OBSERVER_SHOULDER_Z]}>
            <mesh geometry={g.armR} material={vehicleMaterial} />
          </group>
        </group>
        <group ref={legL} position={[0, OBSERVER_HIP_Y, -OBSERVER_HIP_Z]}>
          <mesh geometry={g.legL} material={vehicleMaterial} />
        </group>
        <group ref={legR} position={[0, OBSERVER_HIP_Y, OBSERVER_HIP_Z]}>
          <mesh geometry={g.legR} material={vehicleMaterial} />
        </group>
      </group>
      <mesh ref={stick} geometry={s.woodBar} material={vehicleMaterial} visible={false} />
      <mesh ref={head} geometry={s.metalBar} material={vehicleMaterial} visible={false} />
    </group>
  );
}

/** The line from the waist of a person to the harness of a dog: its tube, moved every frame (the vertices only; faces and colors never change). */
function RopeLine({ onMesh }: { onMesh: (m: Mesh | null) => void }) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(ropeVertexCount() * 3), 3));
    const colors = new Float32Array(ropeVertexCount() * 3);
    const c = new Color(ROPE_COLOR);
    for (let i = 0; i < ropeVertexCount(); i++) colors.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new BufferAttribute(colors, 3));
    g.setIndex(ropeIndices());
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh ref={onMesh} geometry={geometry} material={ropeMaterial} frustumCulled={false} visible={false} />;
}

const X_AXIS = new Vector3(1, 0, 0);
const shaft = new Vector3();
const turn = new Quaternion();

/** Where the person stands in the scene frame and what they do, for the clock `t`. */
interface Stance {
  x: number;
  z: number;
  yaw: number;
  moving: boolean;
  action: SceneElement['action'];
  phase: number;
}

/** The place an element has: its own, or the one on its path `t` seconds after it showed (ahead of the point of the path and to its left, if it has a lead or a side). */
interface Spot {
  x: number;
  z: number;
  yaw: number;
  moving: boolean;
  /** Distance walked so far, without wrapping on a loop. */
  travel: number;
}

function placeOf(e: SceneElement, path: ScenePath | undefined, t: number): Spot {
  if (!path) return { x: e.x, z: e.z, yaw: e.yaw, moving: false, travel: 0 };
  const w = sceneWalk(path, t, e.lag ?? 0);
  // (cos, -sin) is where a yaw faces; its left is the next turn of 90 degrees.
  const dx = Math.cos(w.yaw);
  const dz = -Math.sin(w.yaw);
  const lead = e.lead ?? 0;
  const side = e.side ?? 0;
  return { x: w.x + dx * lead - dz * side, z: w.z + dz * lead + dx * side, yaw: w.yaw, moving: w.moving, travel: w.travel };
}

/** The clock of an element at rest (reduced motion): the end of a walk, half way round a loop. */
const restClock = (path: ScenePath | undefined): number => (path ? (path.loop ? path.delay + path.duration / 2 : REDUCED_CLOCK) : 0);

const stanceOf = (e: SceneElement, spot: Spot, t: number, reduced: boolean): Stance => {
  // A walker walks while it goes along its path, then stands; with reduced motion it stands.
  if (e.path && e.action === 'walk') {
    const walking = spot.moving && !reduced;
    return { ...spot, moving: walking, action: walking ? 'walk' : 'stand', phase: walking ? (spot.travel * Math.PI) / SCENE_STRIDE + (e.phaseOffset ?? 0) : 0 };
  }
  const offset = e.phaseOffset ?? 0;
  return { ...spot, action: e.action ?? 'stand', phase: reduced ? offset : scenePersonPhase(t, offset) };
};

/** Turns the figure to the stance; returns its pose and where the line is tied on it (scene frame), for the one who wears the belt. */
function turnPerson(rig: PersonRig, st: Stance, scale: number, groundY: number, reduced: boolean): { pose: PersonPose; waist: Vec3 } {
  const pose = scenePose(st.action ?? 'stand', st.phase);
  rig.upper.rotation.z = pose.torsoPitch;
  rig.armL.rotation.z = pose.armL;
  rig.armR.rotation.z = pose.armR;
  rig.armL.position.z = -(OBSERVER_SHOULDER_Z - pose.grip);
  rig.armR.position.z = OBSERVER_SHOULDER_Z - pose.grip;
  rig.legL.rotation.z = pose.legL;
  rig.legR.rotation.z = pose.legR;
  rig.lift.position.y = ponchoPoseLift(pose);
  const hop = st.action === 'cheer' && !reduced ? sceneHop(st.phase) : 0;
  rig.root.position.set(st.x, groundY + hop * scale, st.z);
  rig.root.rotation.y = st.yaw;
  rig.root.scale.setScalar(scale);
  const tool = heldTool(st.action ?? 'stand', pose);
  rig.stick.visible = rig.head.visible = !!tool;
  const waist = ponchoWaistAt(pose);
  const at = placed(waist, st.x, groundY, st.z, st.yaw, scale);
  if (!tool) return { pose, waist: at };
  // The shaft goes from `a` to `b`: a box one unit long along x, moved to the middle, turned and stretched.
  shaft.set(tool.b[0] - tool.a[0], tool.b[1] - tool.a[1], tool.b[2] - tool.a[2]);
  const length = shaft.length();
  turn.setFromUnitVectors(X_AXIS, shaft.divideScalar(length || 1));
  rig.stick.position.set((tool.a[0] + tool.b[0]) / 2, (tool.a[1] + tool.b[1]) / 2, (tool.a[2] + tool.b[2]) / 2);
  rig.stick.quaternion.copy(turn);
  rig.stick.scale.set(length, TOOL_THICKNESS, TOOL_THICKNESS);
  rig.head.position.set(...tool.b);
  rig.head.quaternion.copy(turn);
  rig.head.scale.set(...tool.head);
  return { pose, waist: at };
}

/** A point of a model (feet on y = 0, facing +x) placed in the scene: scaled, turned by `yaw` (as three's rotation.y) and moved. */
function placed(p: Vec3, x: number, y: number, z: number, yaw: number, scale: number): Vec3 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [x + (p[0] * c + p[2] * s) * scale, y + p[1] * scale, z + (-p[0] * s + p[2] * c) * scale];
}

/**
 * The still and moving parts of a scene, in its own frame (x ahead, z to the left, y up) on `ground`, as the
 * tour reaches `step`. The canvas draws on demand: while something can move (not reduced, page in view) every
 * frame asks for the next one; with reduced motion it draws once per change, everything at rest.
 */
export function DioramaActors({ scene, step, ground, reduced }: { scene: SceneDef; step: number; ground: Ground; reduced: boolean }) {
  const invalidateAll = useThree((st) => st.invalidate);
  const printsMesh = useRef<Mesh>(null);
  const rigs = useRef<(PersonRig | null)[]>([]);
  const nodes = useRef<(Group | null)[]>([]);
  const ropeMeshes = useRef<(Mesh | null)[]>([]);
  const stills = useRef<(Group | null)[]>([]);
  const stepRef = useRef(step);
  stepRef.current = step;
  // How far each element has grown out of the ground (0 to 1), and the clock of each since it showed.
  const grown = useRef<number[]>([]);
  const clocks = useRef<number[]>([]);
  const travels = useRef<number[]>([]);
  const paths = useMemo(() => new Map(scene.paths.map((p) => [p.id, p])), [scene]);
  const printed = scene.paths.find((p) => p.prints);
  const printedIndex = printed ? scene.elements.findIndex((e) => e.path === printed.id) : -1;
  // One mesh for each element that has a still part, seated on the ground.
  const stillGeometries = useMemo(() => scene.elements.map((e, i) => {
    const tris = elementStaticTris(e, i, ground);
    return tris.length ? buildPolyGeometry(resolveRelief(tris, () => 0)) : null;
  }), [scene, ground]);
  const prints = useMemo(() => (printed ? pathFootprints(printed, ground) : null), [printed, ground]);
  const printsGeometry = useMemo(() => buildPolyGeometry(prints?.tris ?? []), [prints]);

  useEffect(() => () => stillGeometries.forEach((g) => g?.dispose()), [stillGeometries]);
  useEffect(() => () => printsGeometry.dispose(), [printsGeometry]);
  // With reduced motion switched on or off, or a new step, draw once more so everything settles.
  useEffect(() => invalidateAll(), [reduced, step, invalidateAll]);
  // Back on the page, the loop that stopped while it was hidden starts again.
  useEffect(() => {
    const wake = () => invalidateAll();
    document.addEventListener('visibilitychange', wake);
    return () => document.removeEventListener('visibilitychange', wake);
  }, [invalidateAll]);

  useFrame(({ invalidate }, delta) => {
    const dt = reduced ? 0 : Math.min(MAX_FRAME, delta);
    let settling = false;
    // Where the ends of the lines are tied this frame: the waist of the one who wears the belt, the harness of the dog.
    const waists = new Map<number, Vec3>();
    const harnesses = new Map<number, Vec3>();
    scene.elements.forEach((e, i) => {
      const shown = sceneElementShown(e, stepRef.current);
      const before = grown.current[i] ?? 0;
      const p = stageProgress(before, shown, dt, reduced);
      grown.current[i] = p;
      if (p !== (shown ? 1 : 0)) settling = true;
      // The clock of the element runs from the moment it shows; it starts over each time it comes back.
      clocks.current[i] = p <= 0 ? 0 : (clocks.current[i] ?? 0) + dt;
      const t = reduced ? restClock(e.path ? paths.get(e.path) : undefined) : clocks.current[i];
      const grow = stageScale(p);
      const k = (e.scale ?? 1) * grow;
      const spot = placeOf(e, e.path ? paths.get(e.path) : undefined, t);
      travels.current[i] = spot.travel;
      const gy = ground(spot.x, spot.z);
      const still = stills.current[i];
      if (still) {
        // Grows out of its foot: the faces are already seated, so the group scales about the foot.
        const gx = e.x;
        const gz = e.z;
        const base = ground(gx, gz);
        still.visible = p > 0;
        still.scale.setScalar(grow);
        still.position.set(gx * (1 - grow), base * (1 - grow), gz * (1 - grow));
      }
      if (e.kind === 'person') {
        const rig = rigs.current[i];
        if (!rig) return;
        rig.root.visible = p > 0;
        if (p <= 0) return;
        const out = turnPerson(rig, stanceOf(e, spot, t, reduced), k, gy, reduced);
        if (e.rope) waists.set(i, out.waist);
        return;
      }
      const node = nodes.current[i];
      if (!node) return;
      node.visible = p > 0;
      if (p <= 0) return;
      if (e.kind === 'sled') {
        const fx = Math.cos(spot.yaw) * SLED_SPAN;
        const fz = -Math.sin(spot.yaw) * SLED_SPAN;
        const pitch = Math.atan2(ground(spot.x + fx, spot.z + fz) - ground(spot.x - fx, spot.z - fz), 2 * SLED_SPAN);
        node.position.set(spot.x, gy, spot.z);
        node.rotation.set(0, spot.yaw, pitch, 'YZX');
        node.scale.setScalar(k);
        return;
      }
      // A dog sways a little where it stands, and bobs while it trots with the team.
      const moving = spot.moving && !reduced;
      const sway = reduced || e.curled ? 0 : Math.sin(t * DOG_SWAY_RATE + i) * DOG_SWAY;
      const bob = !moving ? 0 : Math.abs(Math.sin(t * DOG_BOB_RATE + i)) * DOG_BOB;
      node.position.set(spot.x, gy + bob - (e.curled ? CURLED_SINK : 0), spot.z);
      node.rotation.set(sway, spot.yaw, 0, 'YZX');
      node.scale.set(DOG_SCALE * k, DOG_SCALE * k * (e.curled ? CURLED_HEIGHT : 1), DOG_SCALE * k);
      harnesses.set(i, placed(DOG_HARNESS, spot.x, gy + bob, spot.z, spot.yaw, DOG_SCALE * k));
    });

    // The lines: from the waist to the harness, slack when the two are close and tight when they are far.
    scene.elements.forEach((e, i) => {
      const mesh = ropeMeshes.current[i];
      if (!e.rope || !mesh) return;
      const a = waists.get(i);
      const b = harnesses.get(e.rope.to);
      const both = (grown.current[i] ?? 0) >= ROPE_SHOW && (grown.current[e.rope.to] ?? 0) >= ROPE_SHOW;
      mesh.visible = both && !!a && !!b;
      if (!mesh.visible || !a || !b) return;
      const attr = mesh.geometry.getAttribute('position') as BufferAttribute;
      fillRopeTube(attr.array as Float32Array, ropePoints(a, b, e.rope.length, ground, ROPE_SEGMENTS));
      attr.needsUpdate = true;
    });

    // The prints show as far as the walker has come.
    const pm = printsMesh.current;
    if (printed && prints && pm) {
      const here = printedIndex >= 0 ? (grown.current[printedIndex] ?? 0) : 0;
      const walked = reduced ? 1 : Math.min(1, (travels.current[printedIndex] ?? 0) / scenePathLength(printed));
      pm.visible = here > 0;
      pm.geometry.setDrawRange(0, (walked > 0 ? printsShown(printed, walked) : 0) * prints.perPrint * 3);
    }
    if ((!reduced && !document.hidden) || settling) invalidate();
  });

  return (
    <group>
      <mesh ref={printsMesh} geometry={printsGeometry} material={vehicleMaterial} frustumCulled={false} />
      {scene.elements.map((e, i) => {
        const still = stillGeometries[i];
        const stillNode = still ? (
          <group key={`still-${i}`} ref={(n) => void (stills.current[i] = n)} visible={false}>
            <mesh geometry={still} material={vehicleMaterial} frustumCulled={false} />
          </group>
        ) : null;
        if (e.kind === 'person') {
          return (
            <group key={i}>
              {stillNode}
              <Person variant={e.id as PersonVariant} belt={!!e.rope} onRig={(rig) => void (rigs.current[i] = rig)} />
              {e.rope && (
                <RopeLine
                  onMesh={(m) => {
                    ropeMeshes.current[i] = m;
                  }}
                />
              )}
            </group>
          );
        }
        if (e.kind === 'prop') return stillNode;
        const geometry = e.kind === 'sled' ? sharedGeometry().sled : sharedGeometry().dogs[e.id];
        return (
          <group key={i}>
            {stillNode}
            <group ref={(n) => void (nodes.current[i] = n)}>
              <mesh geometry={geometry} material={vehicleMaterial} />
            </group>
          </group>
        );
      })}
    </group>
  );
}
