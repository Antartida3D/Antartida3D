import { useEffect, useMemo, useRef } from 'react';
import { Group, Mesh, Quaternion, Vector3, type BufferGeometry } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import {
  scenePathProgress,
  scenePersonPhase,
  sceneHop,
  printsShown,
  walkPhase,
  walkPosition,
  type SceneDef,
  type SceneElement,
  type ScenePath,
} from '@antartida/core';
import { OBSERVER_HIP_Y, OBSERVER_HIP_Z, OBSERVER_SHOULDER_Y, OBSERVER_SHOULDER_Z } from '../orcadas/lowPolyPeople.ts';
import { VOXEL_PALETTE } from '../orcadas/stationModels.ts';
import { buildPolyGeometry } from './lowPoly.ts';
import { ponchoPersonParts, ponchoPoseLift, type PersonVariant } from './ponchoPeople.ts';
import { PONCHO_MODELS } from './ponchoModels.ts';
import { PONCHO_PROPS } from './ponchoProps.ts';
import { DOG_SCALE, sceneFootprints, sceneStaticTris, type Ground } from './ponchoSceneBuild.ts';
import { TOOL_THICKNESS, heldTool, scenePose } from './ponchoTools.ts';
import { buildBoxGeometry, vehicleMaterial, type Box } from './vehicles.ts';

/**
 * What happens in a diorama of Poncho (issue #146), at human scale and never scaled by the camera: the
 * people who work (they walk leaving prints, hammer, probe, shovel, cheer), the tent, the poles, the plane
 * and the dogs, drawn low-poly (rule 30). What each scene shows is in `PONCHO_SCENES` (@antartida/core);
 * here only how it is drawn. All is illustration, and the screen says so once.
 *
 * Cost: the still parts (props, drifts) are ONE mesh per scene, built once; the prints are one more mesh
 * revealed with the draw range; each person is five meshes (torso, two arms, two legs) turned by their
 * pose, plus two for the tool; each dog and sled is one. No shadows, no per-frame geometry. With reduced
 * motion nothing moves.
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

const tint = (boxes: readonly Box[], k: number): Box[] =>
  boxes.map(([cx, cy, cz, sx, sy, sz, hex]) => {
    const r = Math.round(((hex >> 16) & 255) * k);
    const g = Math.round(((hex >> 8) & 255) * k);
    const b = Math.round((hex & 255) * k);
    return [cx, cy, cz, sx, sy, sz, (r << 16) | (g << 8) | b];
  });

/** Geometries shared by every scene, built on first use. */
interface Shared {
  dogs: Record<string, BufferGeometry>;
  sled: BufferGeometry;
  woodBar: BufferGeometry;
  metalBar: BufferGeometry;
  parts: Map<PersonVariant, Record<'torso' | 'legL' | 'legR' | 'armL' | 'armR', BufferGeometry>>;
}
let shared: Shared | null = null;
function sharedGeometry(): Shared {
  return (shared ??= {
    dogs: { poncho: buildBoxGeometry(PONCHO_MODELS['poncho-dog']), pack: buildBoxGeometry(tint(PONCHO_MODELS['poncho-dog'], PACK_DARKEN)) },
    // The ground faces of the prop (colored as the relief) would drag along with a moving sled: left out.
    sled: buildPolyGeometry(PONCHO_PROPS.nansenSled.tris.filter((t) => t[3] >= 0)),
    woodBar: buildBoxGeometry([[0, 0, 0, 1, 1, 1, WOOD_LIGHT]]),
    metalBar: buildBoxGeometry([[0, 0, 0, 1, 1, 1, ZINC]]),
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

/** A person: the five parts of the articulated figure of Orcadas on pivots, and the two meshes of the tool. */
function Person({ variant, onRig }: { variant: PersonVariant; onRig: (rig: PersonRig | null) => void }) {
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

/** The place of an element that follows a path (or its own place), at the clock `t`. */
function placeOf(e: SceneElement, paths: ReadonlyMap<string, ScenePath>, t: number, reduced: boolean): { x: number; z: number; yaw: number; moving: boolean; u: number } {
  const path = e.path ? paths.get(e.path) : undefined;
  if (!path) return { x: e.x, z: e.z, yaw: e.yaw, moving: false, u: 0 };
  const u = reduced ? 1 : scenePathProgress(path, t);
  const p = walkPosition(path, u);
  // Ahead of the point of the path and to its left: (cos, -sin) is where a yaw faces; its left is the next turn of 90 degrees.
  const dx = Math.cos(p.yaw);
  const dz = -Math.sin(p.yaw);
  const lead = e.lead ?? 0;
  const side = e.side ?? 0;
  return { x: p.x + dx * lead - dz * side, z: p.z + dz * lead + dx * side, yaw: p.yaw, moving: u > 0 && u < 1, u };
}

const stanceOf = (e: SceneElement, spot: ReturnType<typeof placeOf>, path: ScenePath | undefined, t: number, reduced: boolean): Stance => {
  // A walker walks while it goes along its path, then stands.
  if (path && e.action === 'walk') {
    return { ...spot, action: spot.moving ? 'walk' : 'stand', phase: spot.moving ? walkPhase(path, spot.u) + (e.phaseOffset ?? 0) : 0 };
  }
  const offset = e.phaseOffset ?? 0;
  return { ...spot, action: e.action ?? 'stand', phase: reduced ? offset : scenePersonPhase(t, offset) };
};

function turnPerson(rig: PersonRig, st: Stance, scale: number, groundY: number, reduced: boolean) {
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
  if (!tool) return;
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
}


/**
 * The still and moving parts of a scene, in its own frame (x ahead, z to the left, y up) on `ground`.
 * The canvas draws on demand: while something can move (not reduced, page in view) every frame asks for
 * the next one; with reduced motion it draws once, everything at rest.
 */
export function DioramaActors({ scene, ground, reduced }: { scene: SceneDef; ground: Ground; reduced: boolean }) {
  const invalidateAll = useThree((st) => st.invalidate);
  const printsMesh = useRef<Mesh>(null);
  const rigs = useRef<(PersonRig | null)[]>([]);
  const nodes = useRef<(Group | null)[]>([]);
  const clock = useRef(0);
  const paths = useMemo(() => new Map(scene.paths.map((p) => [p.id, p])), [scene]);
  const printed = scene.paths.find((p) => p.prints);
  const still = useMemo(() => buildPolyGeometry(sceneStaticTris(scene, ground, () => 0)), [scene, ground]);
  const prints = useMemo(() => sceneFootprints(scene, ground), [scene, ground]);
  const printsGeometry = useMemo(() => buildPolyGeometry(prints?.tris ?? []), [prints]);

  useEffect(() => () => still.dispose(), [still]);
  useEffect(() => () => printsGeometry.dispose(), [printsGeometry]);
  // With reduced motion switched on or off, draw once more so everything settles.
  useEffect(() => invalidateAll(), [reduced, invalidateAll]);
  // Back on the page, the loop that stopped while it was hidden starts again.
  useEffect(() => {
    const wake = () => invalidateAll();
    document.addEventListener('visibilitychange', wake);
    return () => document.removeEventListener('visibilitychange', wake);
  }, [invalidateAll]);

  useFrame(({ invalidate }, delta) => {
    if (!reduced) clock.current += Math.min(MAX_FRAME, delta);
    const t = reduced ? REDUCED_CLOCK : clock.current;
    scene.elements.forEach((e, i) => {
      const path = e.path ? paths.get(e.path) : undefined;
      const spot = placeOf(e, paths, t, reduced);
      const k = e.scale ?? 1;
      if (e.kind === 'person') {
        const rig = rigs.current[i];
        if (rig) turnPerson(rig, stanceOf(e, spot, path, t, reduced), k, ground(spot.x, spot.z), reduced);
        return;
      }
      const node = nodes.current[i];
      if (!node) return;
      const gy = ground(spot.x, spot.z);
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
      const sway = reduced || e.curled ? 0 : Math.sin(t * DOG_SWAY_RATE + i) * DOG_SWAY;
      const bob = reduced || !spot.moving ? 0 : Math.abs(Math.sin(t * DOG_BOB_RATE + i)) * DOG_BOB;
      node.position.set(spot.x, gy + bob - (e.curled ? CURLED_SINK : 0), spot.z);
      node.rotation.set(sway, spot.yaw, 0, 'YZX');
      node.scale.set(DOG_SCALE * k, DOG_SCALE * k * (e.curled ? CURLED_HEIGHT : 1), DOG_SCALE * k);
    });

    // The prints show as far as the walker has come.
    const pm = printsMesh.current;
    if (printed && prints && pm) {
      const u = reduced ? 1 : scenePathProgress(printed, t);
      pm.geometry.setDrawRange(0, (u > 0 ? printsShown(printed, u) : 0) * prints.perPrint * 3);
    }
    if (!reduced && !document.hidden) invalidate();
  });

  return (
    <group>
      <mesh geometry={still} material={vehicleMaterial} frustumCulled={false} />
      <mesh ref={printsMesh} geometry={printsGeometry} material={vehicleMaterial} frustumCulled={false} />
      {scene.elements.map((e, i) => {
        if (e.kind === 'person') {
          return <Person key={i} variant={e.id as PersonVariant} onRig={(rig) => void (rigs.current[i] = rig)} />;
        }
        if (e.kind === 'prop') return null;
        const geometry = e.kind === 'sled' ? sharedGeometry().sled : sharedGeometry().dogs[e.id];
        return (
          <group key={i} ref={(n) => void (nodes.current[i] = n)}>
            <mesh geometry={geometry} material={vehicleMaterial} />
          </group>
        );
      })}
    </group>
  );
}
