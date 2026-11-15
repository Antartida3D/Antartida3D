import { useEffect, useMemo, useRef } from 'react';
import { Group, Mesh, Vector3 } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { CameraControls } from '@react-three/drei';
import {
  HELICOPTER_SHIP_RATIO,
  IRIZAR_ARRIVAL_POSE,
  ORCADAS_SHIP_LENGTH,
  ORCADAS_SHIP_PHASE,
  ORCADAS_TRAVEL_SECONDS,
  ORCADAS_ZODIAC_WATER_LENGTH,
  ZODIAC_LOWER_PHASE,
  ZODIAC_SHIP_RATIO,
  approachPose3D,
  irizarArrivalWorldPose,
  orcadasShipAtDistance,
  orcadasTravelAt,
  orcadasZodiacWaterAt,
  shipWaterY,
  smooth01,
  toWorld,
  vehicleSize,
  type ArrivalId,
  type CameraPose,
} from '@antartida/core';
import { buildHelicopterRotorTris, buildHelicopterTris, buildZodiacTris } from '../orcadas/lowPolyProps.ts';
import { HELICOPTER_ROTOR_ORIGIN } from '../orcadas/stationModels.ts';
import {
  HELICOPTER_TILT,
  ROTOR_SPEED,
  shipSway,
} from './Voyage3D.tsx';
import { buildPolyGeometry } from './lowPoly.ts';
import { buildTrailGeometry, trailMaterial, updateTrail } from './trail.ts';
import { buildVehicleGeometry, vehicleMaterial } from './vehicles.ts';

/** Seconds over which the camera glides from its current map pose onto the moving vehicle. */
const ENTRY_SECONDS = 1.6;
/** Side-on follow distances kept >= ICE_MIN_DISTANCE (25) and < MAX_POLAR_DEG (60 deg) so ControlsBridge never fights them. */
const SHIP_SIDE_DISTANCE = 44;
const SHIP_HEIGHT_OFFSET = 32;
const ZODIAC_SIDE_DISTANCE = 21;
const ZODIAC_HEIGHT_OFFSET = 15;
const HELI_SIDE_DISTANCE = 26;
const HELI_HEIGHT_OFFSET = 18;
/** Anchored Irízar world length matched to the ship-following camera distance so it does not shrink as the camera zooms in on the Zodiac. */
const ANCHOR_SHIP_SIZE = vehicleSize(Math.hypot(SHIP_SIDE_DISTANCE, SHIP_HEIGHT_OFFSET));
/** Fraction of the Zodiac leg over which the follow camera glides closer and shifts focus from the Irízar to the Zodiac. */
const ZODIAC_CAMERA_BLEND = 0.4;
/** Local model length of `buildZodiacTris()` (-1.173..1.145), used to normalize its world size for trail.ts. */
const ZODIAC_MODEL_LENGTH = 2.3;

/**
 * Animates the Orcadas travel leg from Isla Marambio to Laurie Island on the 3D map during the
 * `travel` phase, framing the vehicle side-on so travel reads left-to-right on screen.
 */
export function OrcadasTravel3D({ arrival, reduced }: { arrival: ArrivalId; reduced: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as unknown as CameraControls | null;

  const shipGroup = useRef<Group>(null);
  const zodiacGroup = useRef<Group>(null);
  const zodiacTrailMesh = useRef<Mesh>(null);
  const heliGroup = useRef<Group>(null);
  const rotor = useRef<Group>(null);
  const startMs = useRef<number | null>(null);
  const entryPose = useRef<CameraPose | null>(null);
  const camVec = useRef(new Vector3());
  const tgtVec = useRef(new Vector3());

  const shipGeometry = useMemo(() => buildVehicleGeometry('irizar'), []);
  useEffect(() => () => shipGeometry.dispose(), [shipGeometry]);

  const shipTrail = useMemo(
    () => (arrival === 'ship' ? buildTrailGeometry('ship') : null),
    [arrival],
  );
  useEffect(() => () => shipTrail?.dispose(), [shipTrail]);

  const zodiacGeometry = useMemo(
    () => (arrival === 'ship' ? buildPolyGeometry(buildZodiacTris()) : null),
    [arrival],
  );
  useEffect(() => () => zodiacGeometry?.dispose(), [zodiacGeometry]);

  const zodiacTrail = useMemo(
    () => (arrival === 'ship' ? buildTrailGeometry('ship') : null),
    [arrival],
  );
  useEffect(() => () => zodiacTrail?.dispose(), [zodiacTrail]);

  const heliGeometry = useMemo(
    () =>
      arrival === 'helicopter'
        ? {
            body: buildPolyGeometry(buildHelicopterTris()),
            rotor: buildPolyGeometry(buildHelicopterRotorTris()),
          }
        : null,
    [arrival],
  );
  useEffect(() => () => {
    heliGeometry?.body.dispose();
    heliGeometry?.rotor.dispose();
  }, [heliGeometry]);

  const shipAnchor = useMemo(() => orcadasTravelAt('ship', ORCADAS_SHIP_PHASE), []);

  useEffect(() => {
    invalidate();
  }, [arrival, invalidate]);

  useFrame(({ camera }) => {
    const now = performance.now();
    if (startMs.current === null) startMs.current = now;
    if (!entryPose.current && controls) {
      const p = controls.getPosition(camVec.current);
      const tgt = controls.getTarget(tgtVec.current);
      entryPose.current = {
        pos: { x: p.x, y: p.y, z: p.z },
        target: { x: tgt.x, y: tgt.y, z: tgt.z },
      };
    }

    const totalSeconds = ORCADAS_TRAVEL_SECONDS[arrival];
    const elapsed = reduced ? totalSeconds : (now - startMs.current) / 1000;
    const t = Math.min(1, Math.max(0, elapsed / totalSeconds));
    const time = reduced ? 0 : now / 1000;

    let camTarget: { x: number; y: number; z: number };
    let camHeading: number;
    let sideDistance: number;
    let heightOffset: number;

    if (arrival === 'ship') {
      const sg = shipGroup.current;
      const zg = zodiacGroup.current;
      if (!sg || !zg) return;

      const shipT = Math.min(t, ORCADAS_SHIP_PHASE);
      const anchored = t > ORCADAS_SHIP_PHASE;
      const shipPose = anchored ? shipAnchor : orcadasTravelAt('ship', shipT, undefined, { shipSize: ANCHOR_SHIP_SIZE });

      // Place before measuring distance so frame 0 does not scale from the origin.
      const shipWorld = toWorld(shipPose.x, shipPose.y);
      sg.position.set(shipWorld.x, 0, shipWorld.z);
      const shipSize = anchored ? ANCHOR_SHIP_SIZE : vehicleSize(camera.position.distanceTo(sg.position));
      const sway = anchored ? { roll: 0, pitch: 0, lift: 0 } : shipSway(time);
      sg.position.y = shipWaterY(shipSize) + sway.lift * shipSize;
      sg.rotation.set(sway.roll, -shipPose.heading, sway.pitch, 'YZX');
      sg.scale.setScalar(shipSize);

      if (shipTrail) {
        const shipDist = smooth01(shipT / ORCADAS_SHIP_PHASE) * ORCADAS_SHIP_LENGTH;
        updateTrail(shipTrail, 'ship', shipSize, (lengthsBehind) => {
          const p = orcadasShipAtDistance(Math.max(0, shipDist - lengthsBehind * shipSize));
          const w = toWorld(p.x, p.y, 0.05);
          return { ...w, heading: p.heading };
        });
      }

      const pose = orcadasTravelAt('ship', t, undefined, { shipSize: ANCHOR_SHIP_SIZE });
      const zProgress = anchored ? (t - ORCADAS_SHIP_PHASE) / (1 - ORCADAS_SHIP_PHASE) : 0;
      const zodiacOnWater = anchored && zProgress > ZODIAC_LOWER_PHASE;

      zg.visible = anchored;
      if (zodiacTrailMesh.current) zodiacTrailMesh.current.visible = zodiacOnWater;

      if (anchored) {
        const zodiacSize = ANCHOR_SHIP_SIZE * ZODIAC_SHIP_RATIO;
        const zWorld = toWorld(pose.x, pose.y);
        const zSway = shipSway(time);
        const waterEase = zProgress <= ZODIAC_LOWER_PHASE ? 0 : smooth01((zProgress - ZODIAC_LOWER_PHASE) / 0.1);
        zg.position.set(
          zWorld.x,
          shipWaterY(zodiacSize) + pose.height + zSway.lift * zodiacSize * waterEase,
          zWorld.z,
        );
        zg.rotation.set(zSway.roll * waterEase, -pose.heading, zSway.pitch * waterEase, 'YZX');
        zg.scale.setScalar(zodiacSize / ZODIAC_MODEL_LENGTH);

        if (zodiacOnWater && zodiacTrail) {
          const u = smooth01((zProgress - ZODIAC_LOWER_PHASE) / (1 - ZODIAC_LOWER_PHASE));
          updateTrail(zodiacTrail, 'ship', zodiacSize, (lengthsBehind) => {
            const backU = Math.max(0, u - (lengthsBehind * zodiacSize) / ORCADAS_ZODIAC_WATER_LENGTH);
            const p = orcadasZodiacWaterAt(backU, ANCHOR_SHIP_SIZE);
            const w = toWorld(p.x, p.y, 0.05);
            return { ...w, heading: p.heading };
          });
        }
      }

      const camU = anchored ? smooth01(zProgress / ZODIAC_CAMERA_BLEND) : 0;
      const anchorWorld = toWorld(shipAnchor.x, shipAnchor.y);
      const poseWorld = toWorld(pose.x, pose.y, Math.max(0, pose.height));
      camTarget = {
        x: anchorWorld.x + (poseWorld.x - anchorWorld.x) * camU,
        y: poseWorld.y * camU,
        z: anchorWorld.z + (poseWorld.z - anchorWorld.z) * camU,
      };
      camHeading = pose.heading;
      sideDistance = SHIP_SIDE_DISTANCE + (ZODIAC_SIDE_DISTANCE - SHIP_SIDE_DISTANCE) * camU;
      heightOffset = SHIP_HEIGHT_OFFSET + (ZODIAC_HEIGHT_OFFSET - SHIP_HEIGHT_OFFSET) * camU;
    } else {
      const sg = shipGroup.current;
      const hg = heliGroup.current;
      if (!sg || !hg) return;

      // Keep the Irízar stationary at its exact Ushuaia arrival pose while the helicopter flies.
      const shipBase = toWorld(IRIZAR_ARRIVAL_POSE.x, IRIZAR_ARRIVAL_POSE.y);
      sg.position.set(shipBase.x, 0, shipBase.z);
      const shipSize = vehicleSize(camera.position.distanceTo(sg.position));
      const arrivalPose = irizarArrivalWorldPose(shipSize);
      sg.position.set(arrivalPose.world.x, arrivalPose.world.y, arrivalPose.world.z);
      sg.rotation.set(0, -arrivalPose.heading, 0, 'YZX');
      sg.scale.setScalar(shipSize);

      const pose = orcadasTravelAt('helicopter', t, undefined, { shipSize });
      const heliWorld = toWorld(pose.x, pose.y, pose.height);
      hg.position.set(heliWorld.x, heliWorld.y, heliWorld.z);
      const heliBaseSize = vehicleSize(camera.position.distanceTo(hg.position));
      hg.rotation.set(0, -pose.heading, -HELICOPTER_TILT * Math.sin(Math.PI * t), 'YZX');
      hg.scale.setScalar(heliBaseSize * HELICOPTER_SHIP_RATIO);
      if (rotor.current && t < 1) rotor.current.rotation.y = time * ROTOR_SPEED;

      camTarget = { x: heliWorld.x, y: Math.max(0, heliWorld.y), z: heliWorld.z };
      camHeading = pose.heading;
      sideDistance = HELI_SIDE_DISTANCE;
      heightOffset = HELI_HEIGHT_OFFSET;
    }

    if (controls) {
      const cosH = Math.cos(camHeading);
      const sinH = Math.sin(camHeading);
      // Offset perpendicular to the heading (starboard side) so forward travel reads left-to-right on screen.
      const desired: CameraPose = {
        pos: {
          x: camTarget.x - sinH * sideDistance,
          y: camTarget.y + heightOffset,
          z: camTarget.z + cosH * sideDistance,
        },
        target: camTarget,
      };
      const enterU = reduced ? 1 : smooth01(elapsed / ENTRY_SECONDS);
      const camPose = entryPose.current ? approachPose3D(entryPose.current, desired, enterU) : desired;
      void controls.setLookAt(
        camPose.pos.x,
        camPose.pos.y,
        camPose.pos.z,
        camPose.target.x,
        camPose.target.y,
        camPose.target.z,
        false,
      );
    }

    if (!reduced) invalidate();
  });

  if (arrival === 'ship') {
    return (
      <>
        {shipTrail && <mesh geometry={shipTrail} material={trailMaterial} frustumCulled={false} />}
        <group ref={shipGroup}>
          <mesh geometry={shipGeometry} material={vehicleMaterial} />
        </group>
        {zodiacTrail && (
          <mesh ref={zodiacTrailMesh} geometry={zodiacTrail} material={trailMaterial} frustumCulled={false} visible={false} />
        )}
        {zodiacGeometry && (
          <group ref={zodiacGroup} visible={false}>
            <mesh geometry={zodiacGeometry} material={vehicleMaterial} />
          </group>
        )}
      </>
    );
  }

  return (
    <>
      <group ref={shipGroup}>
        <mesh geometry={shipGeometry} material={vehicleMaterial} />
      </group>
      <group ref={heliGroup}>
        {heliGeometry && (
          <>
            <mesh geometry={heliGeometry.body} material={vehicleMaterial} />
            <group ref={rotor} position={HELICOPTER_ROTOR_ORIGIN}>
              <mesh geometry={heliGeometry.rotor} material={vehicleMaterial} />
            </group>
          </>
        )}
      </group>
    </>
  );
}
