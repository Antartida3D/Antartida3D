import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { BoxGeometry, BufferGeometry, Group, Line, LineDashedMaterial, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, type CameraControls } from '@react-three/drei';
import {
  CAMERA_RETURN_SECONDS,
  DRAKE_STORM,
  easeToward,
  sightLift,
  sledFootprintPose,
  sledSize,
  sledTrot,
  trotRate,
  findTransport,
  TRANSPORTS,
  HELICOPTER_SHIP_RATIO,
  VEHICLE_MIN_SIZE,
  VEHICLE_SIZE_PER_DISTANCE,
  VOYAGE_TRANSFER,
  cameraReturn,
  flightClearance,
  heightAt,
  planeTurbulence,
  sceneOf,
  shiftAcross,
  shipDeckPose,
  shipWaterY,
  sightingsInView,
  stormAt,
  vehicleAt,
  transferAt,
  vehicleSize,
  voyagePace,
  voyageArrived,
  voyageAt,
  voyageHeading,
  voyageLength,
  voyageSightings,
  voyageStops,
  worldHeight,
  type TransportId,
  type TransportKind,
  type VehicleKind,
} from '@antartida/core';
import { HELICOPTER_BOXES, HELICOPTER_ROTOR_BOXES, HELICOPTER_ROTOR_ORIGIN } from '../orcadas/stationModels.ts';
import { PIN_HEAD_Y, buildPinGeometry, pinMaterial } from './pins.ts';
import { buildBoxGeometry, buildVehicleGeometry, vehicleMaterial, vehicleModel } from './vehicles.ts';
import { Sighting3D } from './Sighting3D.tsx';
import { sceneLookAt } from './ponchoSceneFocus.ts';
import { buildTrailGeometry, trailMaterial, updateTrail } from './trail.ts';
import { NARROW_PX, type VoyageBus } from './useVoyage.ts';

/** Vehicle length as a fraction of the camera distance: a 120 m ship is invisible on a 4000 km map. */
export const SIZE_PER_DISTANCE = VEHICLE_SIZE_PER_DISTANCE;
export const MIN_SIZE = VEHICLE_MIN_SIZE;
/** Height of a milestone pin as a fraction of its distance to the camera. */
const PIN_PER_DISTANCE = 0.042;
const MIN_PIN = 0.2;
const ROUTE_SAMPLES = 240;
/** Fraction of the screen height the picture moves up on a phone. */
const PANEL_SHIFT = 0.14;
/** Camera offset from the vehicle at departure: close and low, to see the Beagle Channel. */
const DEPARTURE_OFFSET = new Vector3(3, 9, 12);
/**
 * Sled: as close as the map lets the camera come (about ICE_MIN_DISTANCE, 25.4 here; minCameraDistance is 15 in
 * Tierra del Fuego), 50 degrees from straight down (under MAX_POLAR_DEG), to see the team with the peninsula behind it.
 * Height is over the ground at the start.
 */
const SLED_DEPARTURE_OFFSET = new Vector3(3, 16, 19.5);
/** The sight line to the team keeps this fraction of its length over the ground; the lift eases at this rate (per second). */
const SIGHT_MARGIN = 0.4;
const SIGHT_LIFT_RATE = 3;
/** The team is aimed at this fraction of its length over its belly. */
const SIGHT_AIM = 0.3;
/** How fast the team settles on the ground (per second): it neither sinks nor jumps while the relief loads. */
const SLED_SETTLE_RATE = 10;
/** Longest frame the trot advances, in seconds. */
const MAX_FRAME = 0.1;

/**
 * Half of what the transport picker takes of a wide screen, in px: 480 wide and 88 from the right
 * edge (voyage.css). Ushuaia is seen that far left of the middle, in the free part beside it.
 */
const PICKER_HALF_PX = (480 + 88) / 2;

/** In the storm the camera comes down to this world height: under the clouds, so they do not cover the vehicle. */
const STORM_CAMERA_HEIGHT = DRAKE_STORM.cloudBase - 2;

/**
 * Spray thrown up when the bow digs into a wave: [x, z] in ship lengths, in the order it rises.
 * The first ones burst at the bow; the rest run back along both sides, as the wave washes the hull.
 */
const SPRAY: readonly (readonly [number, number])[] = [
  [0.5, 0.05], [0.47, -0.07], [0.54, -0.01], [0.44, 0.09], [0.5, -0.11], [0.57, 0.04],
  [0.36, 0.13], [0.36, -0.13], [0.26, 0.15], [0.26, -0.15], [0.14, 0.16], [0.14, -0.16],
];
const sprayGeometry = new BoxGeometry(1, 1, 1);
const sprayMaterial = new MeshBasicMaterial({ color: 0xf7fafb, transparent: true, opacity: 0.9 });

/** The flight profile, sampled once: it costs a few hundred relief lookups per point. */
const CLEARANCE_SAMPLES = 512;
let clearanceTable: Float32Array | null = null;

function clearanceAt(t: number): number {
  if (!clearanceTable) {
    const end = voyageAt('plane', 1);
    if (heightAt(end.x, end.y) <= 0) return flightClearance(t); // the relief is still loading
    clearanceTable = Float32Array.from({ length: CLEARANCE_SAMPLES + 1 }, (_, i) => flightClearance(i / CLEARANCE_SAMPLES));
  }
  const at = Math.min(1, Math.max(0, t)) * CLEARANCE_SAMPLES;
  const i = Math.min(CLEARANCE_SAMPLES - 1, Math.floor(at));
  return clearanceTable[i] + (clearanceTable[i + 1] - clearanceTable[i]) * (at - i);
}

/** Whether the relief is loaded: before that every height is 0, and a team on a peak would be drawn on the sea. */
function reliefReady(kind: TransportKind): boolean {
  return [0, 0.25, 0.5, 0.75, 1].some((t) => {
    const p = voyageAt(kind, t);
    return heightAt(p.x, p.y) > 0;
  });
}

/** World height of the ground at map position (x, y) (0 while the relief loads and on the sea). */
function groundAt(x: number, y: number): number {
  return Math.max(0, worldHeight(heightAt(x, y)));
}

/** World height of the ground under the sled's path at `t`. */
function sledGround(kind: TransportKind, t: number): number {
  const p = voyageAt(kind, t);
  return groundAt(p.x, p.y);
}

/**
 * World height of the vehicle at `t`. A plane flies over the relief under its path, and higher the
 * farther the camera is, to stay readable; a ship sits slightly into the water.
 */
export function heightOf(kind: TransportKind, t: number, size: number): number {
  const vehicle = vehicleAt(kind, t);
  if (vehicle === 'ship') return shipWaterY(size);
  if (vehicle === 'sled') {
    const p = voyageAt(kind, t);
    return sledFootprintPose(groundAt, p.x, p.y, voyageHeading(kind, t), size).height;
  }
  return Math.max(clearanceAt(t), Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 0.6 * size * 0.9) + size * 0.07;
}

/** Trip fraction used to measure the slope of the flight for the plane's pitch. */
const PITCH_SPAN = 0.004;
const MAX_PITCH = 0.4;
/** Clearance of the sled's tracks over the snow, in map units: enough not to fight the terrain surface. */
const TRACK_LIFT = 0.03;

/** A place farther than this from the vehicle, in map units, is out of view: the camera goes to it while its card is open. */
const VISIT_DISTANCE = 6;

/** How far (world units) the vehicle has to move for the camera to follow it. */
const FOLLOW_EPSILON = 1e-4;
const followGoal = new Vector3();
const followTarget = new Vector3();
const followEye = new Vector3();

/** Nose down while it flies forward, in radians at the middle of the hop. */
export const HELICOPTER_TILT = 0.14;
/** Turns of the main rotor, in radians per second. */
export const ROTOR_SPEED = 22;

/** Builds body and main rotor geometries for the Sea King helicopter model. */
const buildSeaKingGeometry = () => ({
  body: buildBoxGeometry(HELICOPTER_BOXES),
  rotor: buildBoxGeometry(HELICOPTER_ROTOR_BOXES),
});

/** Gentle roll, pitch and vertical heave for a ship on water, amplified by `rough` storm factor. */
export function shipSway(time: number, rough = 0) {
  const wave = time * 2.1;
  return {
    roll: Math.sin(time * 1.1) * 0.04 + rough * Math.sin(wave * 0.63 + 1) * 0.22,
    pitch: Math.sin(time * 0.8) * 0.025 + rough * Math.sin(wave) * 0.24,
    lift: Math.sin(time * 1.3) * 0.012 + rough * Math.sin(wave - 0.9) * 0.1,
  };
}

const routeMaterial = new LineDashedMaterial({ color: 0x1f2a36, dashSize: 0.8, gapSize: 0.6, transparent: true, opacity: 0.75 });

/** The vehicle travelling on the live map, its path and the camera, which stays centered on it. */
export function Voyage3D({ bus, picker, reduced, overlay }: {
  bus: VoyageBus;
  /** The trip opens on the vehicle picker (Ushuaia), not on a trip of one team (Poncho). */
  picker: boolean;
  reduced: boolean;
  /** Element over the canvas where the animals go: they are real buttons, reachable by keyboard. */
  overlay: RefObject<HTMLElement | null>;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);
  const viewport = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as CameraControls | null;
  const group = useRef<Group>(null);
  const trailMesh = useRef<Mesh>(null);
  const [transport, setTransport] = useState<TransportId | null>(bus.state?.transport ?? null);
  // What is drawn now: a trip of the dogs changes it with its legs.
  const [vehicle, setVehicle] = useState<VehicleKind | null>(bus.state ? vehicleAt(bus.state.kind, bus.state.t) : null);
  const drawn = useRef({ t: -1, transport: null as TransportId | null });
  // Far place the camera is at, and its way back to the vehicle: where it left from and the fraction of the time gone.
  const visit = useRef({ id: null as string | null, back: null as { from: Vector3; u: number } | null });
  const spray = useRef<(Mesh | null)[]>([]);
  // Sled: settled height over the ground, the phase of the trot and the frame count to know the pace.
  const sled = useRef({ height: null as number | null, phase: 0 });
  // Height (world units) the camera has been raised to see the sled over a ridge.
  const sight = useRef(0);
  const helicopter = useRef<Group>(null);
  const rotor = useRef<Group>(null);
  // Whether the vehicle is in the storm.
  const storm = useRef({ inside: false });
  // Ids of the animals in view and of the ones already spotted, joined: React re-renders only when they change.
  const [inView, setInView] = useState('||');
  // Milestones passed: their pins open their cards (#157).
  const [passed, setPassed] = useState(0);

  useEffect(() => {
    const onChange = () => {
      setTransport(bus.state?.transport ?? null);
      const s = bus.state;
      setVehicle(s ? vehicleAt(s.kind, s.t) : null);
      // They stay on the map while a milestone card is open.
      const visible = s ? sightingsInView(s.kind, s.t).map((v) => v.sighting.id) : [];
      // A card open beside an animal goes away with it.
      if (bus.beside && !visible.includes(bus.beside)) return bus.closeSighting();
      setInView(`${visible.join(',')}|${bus.seen.join(',')}|${bus.beside ?? ''}`);
      // Not while the helicopter flies to the base: its pin gives way to it.
      setPassed(s && bus.transfer === null ? s.reached : 0);
      invalidate();
    };
    bus.listeners.add(onChange);
    return () => void bus.listeners.delete(onChange);
  }, [bus, invalidate]);

  // On a phone the trip panel covers the lower part of the map: shift the picture up so the vehicle,
  // which the camera keeps at its center, stays in view above the panel.
  useEffect(() => {
    if (!('setViewOffset' in camera) || viewport.width > NARROW_PX) return;
    const { width, height } = viewport;
    camera.setViewOffset(width, height, 0, height * PANEL_SHIFT, width, height);
    invalidate();
    return () => {
      camera.clearViewOffset();
      invalidate();
    };
  }, [camera, viewport, invalidate]);

  // Opening the trip, before a vehicle is picked: down to where the first one leaves from, at the
  // departure pose, so the picker opens over Ushuaia (#190). Without it the camera only came closer
  // around whatever it was looking at (the trip's farthest zoom, ControlsBridge).
  useEffect(() => {
    if (!controls || !picker || bus.state) return;
    const p = voyageAt(TRANSPORTS[0].kind, 0);
    const target = { x: p.x - 500, y: 0, z: p.y - 500 };
    const pos = { x: target.x + DEPARTURE_OFFSET.x, y: DEPARTURE_OFFSET.y, z: target.z + DEPARTURE_OFFSET.z };
    const pose = shiftAcross({ pos, target }, viewport.width > NARROW_PX ? PICKER_HALF_PX : 0, viewport.height);
    void controls.setLookAt(pose.pos.x, pose.pos.y, pose.pos.z, pose.target.x, pose.target.y, pose.target.z, !reduced);
    invalidate();
  }, [controls]);

  const kind = transport ? findTransport(transport).kind : null;
  const geometry = useMemo(() => (transport && vehicle ? buildVehicleGeometry(vehicleModel(transport, vehicle)) : null), [transport, vehicle]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  const route = useMemo(() => {
    if (!kind) return null;
    const points = Array.from({ length: ROUTE_SAMPLES + 1 }, (_, i) => {
      const p = voyageAt(kind, i / ROUTE_SAMPLES);
      return new Vector3(p.x - 500, 0.12, p.y - 500);
    });
    const line = new Line(new BufferGeometry().setFromPoints(points), routeMaterial);
    line.computeLineDistances();
    return line;
  }, [kind]);
  useEffect(() => () => route?.geometry.dispose(), [route]);

  // The Sea King that takes people and cargo from the icebreaker to the base: the model of the Orcadas helipad.
  const seaKing = useMemo(
    () => (transport === VOYAGE_TRANSFER.transport ? buildSeaKingGeometry() : null),
    [transport],
  );
  useEffect(() => () => {
    seaKing?.body.dispose();
    seaKing?.rotor.dispose();
  }, [seaKing]);

  const trail = useMemo(() => (vehicle ? buildTrailGeometry(vehicle) : null), [vehicle]);
  useEffect(() => () => trail?.dispose(), [trail]);

  // One pin per milestone ahead of the departure, so the user sees them coming.
  const stops = kind ? voyageStops(kind) : [];
  const pins = useMemo(() => (kind ? voyageStops(kind).slice(1).map((stop) => stop.pin) : []), [kind]);
  const pinGroups = useRef<(Group | null)[]>([]);
  // Off the 3D map (the 2D map draws no camera) the trip goes at its own pace.
  useEffect(() => () => void (bus.pace = 1), [bus]);
  const pinGeometry = useMemo(buildPinGeometry, []);
  useEffect(() => () => Object.values(pinGeometry).forEach((g) => g.dispose()), [pinGeometry]);

  useFrame(({ camera }, delta) => {
    const s = bus.state;
    const g = group.current;
    if (!s) storm.current = { inside: false };
    if (!s || !g) return;
    const p = voyageAt(s.kind, s.t);
    const veh = vehicleAt(s.kind, s.t);
    const distance = camera.position.distanceTo(g.position);
    const size = veh === 'sled' ? sledSize(distance) : vehicleSize(distance);
    const heading = voyageHeading(s.kind, s.t) + (bus.back ? Math.PI : 0);
    // The team looks at all of its footprint, not only under its middle: height and tilt come from the same pose.
    const sledPose = veh === 'sled' ? sledFootprintPose(groundAt, p.x, p.y, heading, size) : null;
    let height = sledPose ? sledPose.height : heightOf(s.kind, s.t, size);
    const length = voyageLength(s.kind);
    const dt = Math.min(MAX_FRAME, delta);
    // The team settles on the ground: the first frame snaps, later ones ease, so a late relief does not make it jump.
    let trotLift = 0;
    if (veh === 'sled') {
      const ready = reliefReady(s.kind);
      const wanted = ready ? height : (sled.current.height ?? height);
      sled.current.height = sled.current.height === null || !ready ? wanted : easeToward(sled.current.height, wanted, dt, SLED_SETTLE_RATE);
      height = sled.current.height;
      // Pace in map units per second, from how far the trip moved since the last frame; 0 when paused.
      const pace = dt > 0 && drawn.current.transport === s.transport ? (Math.abs(s.t - drawn.current.t) * length) / dt : 0;
      sled.current.phase += dt * trotRate(pace);
      trotLift = sledTrot(sled.current.phase, size, pace, reduced);
    }

    // Nose up while climbing, down while descending; a ship stays level.
    let pitch = 0;
    if (veh === 'plane') {
      const rise = heightOf(s.kind, s.t + PITCH_SPAN, size) - heightOf(s.kind, s.t - PITCH_SPAN, size);
      pitch = Math.min(MAX_PITCH, Math.max(-MAX_PITCH, Math.atan2(rise, 2 * PITCH_SPAN * length))) * (bus.back ? -1 : 1);
    }
    if (sledPose) pitch = sledPose.pitch;
    // A gentle sway, so the vehicle is alive even when the trip is paused.
    const time = reduced ? 0 : performance.now() / 1000;
    const rough = stormAt(p.x, p.y);
    const wave = time * 2.1;
    const sway = veh === 'sled'
      ? { roll: 0, pitch: 0, lift: 0 } // the team does not sway: it trots (trotLift)
      : veh === 'ship'
      ? shipSway(time, rough)
      : { roll: Math.sin(time * 0.9) * 0.05, pitch: Math.sin(time * 0.7) * 0.015, lift: Math.sin(time * 1.4) * 0.035 };
    if (veh === 'plane') {
      // The plane flies over the storm, and the rough air shakes it a little.
      const shake = planeTurbulence(time, rough);
      sway.roll += shake.roll;
      sway.pitch += shake.pitch;
      sway.lift += shake.lift;
    }
    // Spray bursts when the bow comes down into the water.
    const burst = veh === 'ship' ? rough * Math.max(0, -Math.sin(wave + 0.5)) ** 2 : 0;
    spray.current.forEach((drop, i) => {
      if (!drop) return;
      const [x, z] = SPRAY[i];
      // Each one a little higher and wider than the one before; big enough to read from the trip camera.
      const reach = i % 6;
      // Started above the deck: the bow is under the water when the spray bursts.
      drop.position.set(x + burst * 0.04 * reach, 0.17 + burst * (0.12 + 0.05 * reach), z * (1 + 0.8 * burst));
      drop.scale.setScalar(burst * (0.11 - 0.011 * reach));
    });

    g.position.set(p.x - 500, height + sway.lift * size + trotLift, p.y - 500);
    g.rotation.set(sway.roll, -heading, pitch + sway.pitch, 'YZX');
    g.scale.setScalar(size);

    // The helicopter shows once its hop to the base starts, and stays on the base after it lands.
    const heli = helicopter.current;
    if (heli) {
      const flown = bus.transfer;
      heli.visible = flown !== null;
      if (flown !== null) {
        const deck = shipDeckPose({ x: p.x, y: p.y, height: g.position.y, heading }, size);
        const at = transferAt(deck, flown);
        heli.position.set(at.x - 500, at.height, at.y - 500);
        heli.rotation.set(0, -at.heading, -HELICOPTER_TILT * Math.sin(Math.PI * flown), 'YZX');
        heli.scale.setScalar(size * HELICOPTER_SHIP_RATIO);
        // The rotor turns while it flies and stops once it is down.
        if (rotor.current && flown < 1) rotor.current.rotation.y = time * ROTOR_SPEED;
      }
    }

    pins.forEach((at, i) => {
      const pin = pinGroups.current[i];
      if (!pin) return;
      // The point touches the ground (Marambio) or the water; the relief may load after the trip starts.
      pin.position.set(at.x - 500, Math.max(0, worldHeight(heightAt(at.x, at.y))), at.y - 500);
      pin.scale.setScalar(Math.max(MIN_PIN, camera.position.distanceTo(pin.position) * PIN_PER_DISTANCE));
      pin.quaternion.copy(camera.quaternion); // always facing the camera
      // Grey once its milestone was read, not just passed: the ones left unread stand out (#157).
      (pin.children[0] as Mesh).material = bus.opened.includes(stops[i + 1].milestone.id) ? pinMaterial.read : pinMaterial.unread;
      // A pin is drawn over everything: the one of the base would cover the helicopter that lands on it.
      pin.visible = bus.transfer === null || i < pins.length - 1;
    });

    if (trailMesh.current) trailMesh.current.visible = !bus.back;
    if (trail && !bus.back) {
      updateTrail(trail, vehicle ?? veh, size, (lengthsBehind) => {
        const t = Math.max(0, s.t - (lengthsBehind * size) / length);
        const q = voyageAt(s.kind, t);
        // A ship's wake lies on the water, a plane's contrails at its height, the sled's tracks on the snow.
        const behind = vehicleAt(s.kind, t);
        const y = behind === 'ship' ? 0.05 : behind === 'sled' ? sledGround(s.kind, t) + TRACK_LIFT : heightOf(s.kind, t, size);
        return { x: q.x - 500, y, z: q.y - 500, heading: voyageHeading(s.kind, t) };
      });
    }

    // The camera always stays on the vehicle: the user can orbit and zoom around it, not pan away.
    if (controls) {
      // From farther the trip goes faster: the vehicle keeps its size on the screen, and so does its speed (#168).
      bus.pace = voyagePace(controls.distance);
      // The controls apply a move on the next frame, and the canvas draws on demand: a move asks for
      // that frame, or a move without animation (reduced motion) is not drawn until something else redraws (#76).
      let moved = false;
      // A ridge between the camera and the team: how much higher the camera has to be to see it (sled only).
      const wantedLift = () => {
        if (veh !== 'sled') return 0;
        const eyeY = camera.position.y - sight.current;
        const eye = { x: camera.position.x + 500, y: camera.position.z + 500, height: eyeY };
        const aim = { x: p.x, y: p.y, height: height + size * SIGHT_AIM };
        return sightLift(groundAt, eye, aim, size * SIGHT_MARGIN);
      };
      // Entering the storm, the camera comes down under the clouds. Leaving it, it keeps its distance:
      // going back to where it was before the storm pulled it far away (#127); over the ice it only
      // backs off to the closest distance there (minCameraDistance).
      // Only for a ship: the plane is above the clouds, and the camera stays up there with it.
      const inside = veh === 'ship' && rough > 0;
      if (inside !== storm.current.inside) {
        if (inside && camera.position.y > STORM_CAMERA_HEIGHT) {
          void controls.dollyTo((controls.distance * STORM_CAMERA_HEIGHT) / camera.position.y, !reduced);
          moved = true;
        }
        storm.current.inside = inside;
      }
      const departing = s.t === 0 && (drawn.current.t !== 0 || drawn.current.transport !== s.transport);
      if (departing) {
        moved = true;
        sight.current = 0; // the camera is placed anew, at its base height
        // At the vehicle, so the camera does not jump to it when the trip starts moving.
        // The sled starts over its ground, which the relief may place well above the sea.
        const offset = veh === 'sled' ? SLED_DEPARTURE_OFFSET : DEPARTURE_OFFSET;
        const base = veh === 'sled' ? sledGround(s.kind, 0) : 0;
        void controls.setLookAt(p.x - 500 + offset.x, base + offset.y, p.y - 500 + offset.z, p.x - 500, base, p.y - 500, !reduced);
      } else {
        const open = bus.open ? voyageSightings(s.kind).find((v) => v.sighting.id === bus.open) : undefined;
        // A milestone about a place off the path (Cabo de Hornos): its card shows the place, where its pin stands.
        const stop = s.card >= 0 ? voyageStops(s.kind)[s.card] : undefined;
        // On arrival a ship stays off the island: the camera goes halfway to the base, to show both.
        // A plane lands on the base: the camera stays with it.
        const arrived = voyageArrived(s);
        const place = !stop?.milestone.place || (arrived && s.kind === 'plane') ? null
          : arrived ? { x: (stop.pin.x + p.x) / 2, y: (stop.pin.y + p.y) / 2 } : stop.pin;
        // A stop of Poncho with a diorama: its card brings the camera down to the stop, under the screen that fades in over the map (#146).
        const scene = stop && s.kind === 'dogs' ? sceneOf(stop.milestone.id) : undefined;
        const far = open?.sighting.place && Math.hypot(open.x - p.x, open.y - p.y) > VISIT_DISTANCE
          ? { id: open.sighting.id, x: open.x, y: open.y }
          : stop && place ? { id: stop.milestone.id, ...place }
          : stop && scene ? { id: stop.milestone.id, x: stop.pin.x, y: stop.pin.y, scene } : null;
        const vehicle = { x: g.position.x, y: Math.max(0, height), z: g.position.z };
        if (far) {
          // Opening a far place takes the camera there, to see it; the trip waits.
          if (visit.current.id !== far.id) {
            visit.current = { id: far.id, back: null };
            moved = true;
            sight.current = 0;
            if (far.scene) {
              // Closest the map allows (minCameraDistance), low, from the side of the team.
              const look = sceneLookAt(stop!, far.scene);
              void controls.setLookAt(...look.eye, ...look.target, !reduced);
            } else {
              void controls.moveTo(far.x - 500, 0, far.y - 500, !reduced);
            }
          }
        } else {
          if (visit.current.id) {
            // Closing it brings the camera back to the vehicle: at once with reduced motion, else little by little.
            visit.current = { id: null, back: reduced ? null : { from: controls.getTarget(new Vector3(), false), u: 0 } };
            if (reduced) {
              moved = true;
              void controls.moveTo(vehicle.x, vehicle.y, vehicle.z, false);
            }
          }
          const back = visit.current.back;
          if (back) {
            // The vehicle may be moving again: the camera goes to where it is now, not to where it was.
            // A long frame does not make it leap.
            back.u = Math.min(1, back.u + Math.min(delta, 0.1) / CAMERA_RETURN_SECONDS);
            const at = cameraReturn(back.from, vehicle, back.u);
            moved = true;
            void controls.moveTo(at.x, at.y, at.z, false);
            if (back.u >= 1) visit.current.back = null;
          } else if (s.t > 0) {
            // With reduced motion nothing else moves: follow only when the vehicle moved, or each move would
            // ask for a frame and the canvas would never rest. Otherwise the sway keeps it drawing, as before.
            const goal = followGoal.set(vehicle.x, vehicle.y, vehicle.z);
            if (!reduced || controls.getTarget(followTarget).distanceToSquared(goal) > FOLLOW_EPSILON ** 2) {
              moved = true;
              void controls.moveTo(goal.x, goal.y, goal.z, false);
            }
            // The camera rises just enough to see the team over a ridge, and comes back down when it clears.
            // Only the change is applied, so the user's orbit and zoom stay; the polar limit is not an issue
            // since going higher means looking more from above.
            const wanted = wantedLift();
            const next = reduced ? wanted : easeToward(sight.current, wanted, dt, SIGHT_LIFT_RATE);
            const delta = next - sight.current;
            if (Math.abs(delta) > FOLLOW_EPSILON) {
              moved = true;
              const at = controls.getPosition(followEye, true);
              void controls.setPosition(at.x, at.y + delta, at.z, false);
              sight.current = next;
            }
          }
        }
      }
      if (moved) invalidate();
    }
    drawn.current = { t: s.t, transport: s.transport };
  });

  if (!geometry || !route || !kind) return null;
  const [ids, seen, [open]] = inView.split('|').map((list) => list.split(','));
  const wide = viewport.width > NARROW_PX;
  return (
    <>
      {voyageSightings(kind).map((v, i) => ids.includes(v.sighting.id) && (
        <Sighting3D
          key={v.sighting.id}
          spot={v}
          turn={i * 1.3}
          seen={seen.includes(v.sighting.id)}
          open={v.sighting.id === open}
          wide={wide}
          bus={bus}
          reduced={reduced}
          overlay={overlay}
        />
      ))}
      <primitive object={route} />
      {pins.map((_, i) => (
        <group key={i} ref={(g) => void (pinGroups.current[i] = g)}>
          <mesh geometry={pinGeometry.fill} material={pinMaterial.unread} renderOrder={1001} />
          <mesh geometry={pinGeometry.line} material={pinMaterial.line} renderOrder={1000} />
          <mesh geometry={pinGeometry.dot} material={pinMaterial.dot} renderOrder={1002} />
          {/* A pin passed opens its milestone: the trip does not stop at it (#157). A real button, over its head. */}
          {i + 1 < passed && i + 1 < pins.length && (
            <Html position={[0, PIN_HEAD_Y, 0]} center portal={overlay as RefObject<HTMLElement>} zIndexRange={[3, 3]}>
              <button
                type="button"
                className="vpin"
                onClick={() => bus.openStop(i + 1)}
                aria-label={`Hito: ${stops[i + 1].milestone.title}. Tocá para leerlo.`}
                title={stops[i + 1].milestone.title}
              />
            </Html>
          )}
        </group>
      ))}
      {trail && <mesh ref={trailMesh} geometry={trail} material={trailMaterial} frustumCulled={false} />}
      <group ref={group}>
        <mesh geometry={geometry} material={vehicleMaterial} />
        {vehicle === 'ship' && SPRAY.map((_, i) => (
          <mesh key={i} ref={(m) => void (spray.current[i] = m)} geometry={sprayGeometry} material={sprayMaterial} scale={0} />
        ))}
      </group>
      {seaKing && (
        <group ref={helicopter} visible={false}>
          <mesh geometry={seaKing.body} material={vehicleMaterial} />
          <group ref={rotor} position={HELICOPTER_ROTOR_ORIGIN}>
            <mesh geometry={seaKing.rotor} material={vehicleMaterial} />
          </group>
        </group>
      )}
    </>
  );
}
