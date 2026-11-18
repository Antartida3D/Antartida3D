import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { MeshBasicMaterial, type Group, type Mesh } from 'three';
import {
  IRIZAR_DEFAULT_SPEED,
  MODEL_MIN_PX,
  driftOffsetAtTime,
  irizarStateAtTime,
  screenPx,
  seaModelSize,
  voyageAt,
  voyageHeading,
  type SeaLifeInstance,
} from '@antartida/core';
import { buildPenguinPolyParts, mirrorZTris } from '../orcadas/lowPolyAnimals.ts';
import { PENGUIN_NECK, PENGUIN_SHOULDER, type PenguinSpecies } from '../orcadas/penguins.ts';
import {
  ICEBERG_DRAFT,
  ICEBERG_RIPPLE_SECONDS as RIPPLE_SECONDS,
  ICEBERG_RIPPLES as RIPPLES,
  icebergSwell as swell,
  POLY_ICEBERGS,
  rippleAt,
  waterline,
  waterMaterial,
} from '../voyage/icebergs.ts';
import { boxShade, buildPolyGeometry } from '../voyage/lowPoly.ts';
import {
  ALBATROSS_PARTS,
  BUOY_POLY,
  ICE_CHUNK_POLY,
  KRILL_POLY,
  PACK_ICE_POLYS,
  SHIP_WAKE_POLY,
} from '../voyage/seaImmersiveModels.ts';
import {
  PENGUIN_FLOE_TRIS,
  PENGUIN_FLOE_Y,
  PENGUINS_ON_FLOE,
  SEAL_FLOE_PLACEMENT,
  SEAL_FLOE_TRIS,
} from '../voyage/seaPolyModels.ts';
import { SEA_MODELS, type SeaModelId } from '../voyage/sightingModels.ts';
import { heightOf } from '../voyage/Voyage3D.tsx';
import type { VoyageBus } from '../voyage/useVoyage.ts';
import { buildVehicleGeometry, vehicleMaterial } from '../voyage/vehicles.ts';
import { HUMPBACK_PARTS, LEOPARD_PARTS } from '../marine/lowPolyMarine.ts';
import {
  MINKE_PARTS,
  ORCA_PARTS,
  SPLASH_POLY,
  SPOUT_POLY,
  type CetaceanPolyParts,
} from '../voyage/whalePolyModels.ts';
import {
  birdAnimation,
  cetaceanAnimation,
  penguinAnimation,
  reactionProgress,
  sealAnimation,
  swimPath,
} from './seaLifeAnimations.ts';
import { useSeaTime, type SeaTimeUniform } from './useAnimationClock.ts';

/** On-screen length in px at a 900 px tall viewport, up to MODEL_REFERENCE_DISTANCE (seaModelSize). */
const ANIMAL_PX = 65;
const ICE_PX = 78;
const VEHICLE_PX = 72;
const BIRD_PX = 34;
const PACK_ICE_PX = 38;

const HERCULES_SPEED = IRIZAR_DEFAULT_SPEED * 2.6;
const HERCULES_PHASE = 0.62;
const WHALE_FLOAT = 0.1;

const glowMaterial = waterMaterial();

/** Open-ocean seabird patrol anchors (map coordinates 0..1000, converted to -500..500). */
const SEA_BIRDS = [
  { x: 375, y: 215, radius: 42, phase: 0.1 },
  { x: 430, y: 270, radius: 36, phase: 0.37 },
  { x: 315, y: 310, radius: 44, phase: 0.62 },
  { x: 545, y: 235, radius: 38, phase: 0.85 },
] as const;

/** Seasonal drifting pack-ice plates in Antarctic coastal waters. */
const PACK_ICE_SPOTS = [
  { x: 425, y: 345, variant: 0, phase: 0.12, seed: 1.1 },
  { x: 465, y: 320, variant: 1, phase: 0.34, seed: 2.4 },
  { x: 525, y: 275, variant: 0, phase: 0.56, seed: 3.7 },
  { x: 385, y: 410, variant: 1, phase: 0.78, seed: 4.9 },
  { x: 590, y: 340, variant: 0, phase: 0.25, seed: 5.5 },
  { x: 350, y: 460, variant: 1, phase: 0.67, seed: 6.2 },
] as const;

/** Krill swarms in whale feeding waters; scatter when clicked. */
const KRILL_SPOTS = [
  { x: 355, y: 275, phase: 0.15 },
  { x: 510, y: 255, phase: 0.48 },
  { x: 265, y: 355, phase: 0.81 },
] as const;

/** Drifting oceanographic buoys in the Drake Passage; bob and pitch with the swell. */
const DRAKE_BUOYS = [
  { x: 165, y: 270, phase: 0.1 },
  { x: 245, y: 240, phase: 0.45 },
  { x: 315, y: 285, phase: 0.78 },
] as const;

type CetaceanSpecies = 'humpback' | 'orca' | 'minke';
const isCetacean = (s: string): s is CetaceanSpecies => s === 'humpback' || s === 'orca' || s === 'minke';

const modelOf = (inst: SeaLifeInstance): SeaModelId | null => {
  if (inst.species === 'iceberg') return inst.sprite === 'iceberg-lg' ? 'iceberg-lg' : 'iceberg-sm';
  return inst.species in SEA_MODELS ? (inst.species as SeaModelId) : null;
};

interface PenguinRig {
  root: Group | null;
  head: Group | null;
  flipL: Group | null;
  flipR: Group | null;
}

interface SealRig {
  body: Group | null;
  head: Group | null;
  flipL: Group | null;
  flipR: Group | null;
  tail: Group | null;
}

interface CetaceanRig {
  tail: Group | null;
  flipL: Group | null;
  flipR: Group | null;
  foam: Mesh | null;
  splash: Mesh | null;
  ripples: (Mesh | null)[];
}

interface BirdRig {
  root: Group | null;
  wingL: Group | null;
  wingR: Group | null;
}

function buildCetaceanGeos(parts: CetaceanPolyParts) {
  return {
    body: buildPolyGeometry(parts.body, boxShade),
    tail: buildPolyGeometry(parts.tail, boxShade),
    flipperR: buildPolyGeometry(parts.flipperR, boxShade),
    flipperL: buildPolyGeometry(parts.flipperL, boxShade),
    tailPivot: parts.tailPivot,
    flipperPivot: parts.flipperPivot,
  };
}

function buildPenguinGeos(species: PenguinSpecies) {
  const parts = buildPenguinPolyParts(species);
  return {
    body: buildPolyGeometry(parts.body, boxShade),
    head: buildPolyGeometry(parts.head, boxShade),
    flipperR: buildPolyGeometry(parts.flipper, boxShade),
    flipperL: buildPolyGeometry(mirrorZTris(parts.flipper), boxShade),
  };
}

/** The leopard seal of Océano, on its floe (LEOPARD_PARTS). */
function buildSealGeos() {
  const parts = LEOPARD_PARTS;
  return {
    body: buildPolyGeometry(parts.body, boxShade),
    head: buildPolyGeometry(parts.head, boxShade),
    flipperL: buildPolyGeometry(parts.flipperL, boxShade),
    flipperR: buildPolyGeometry(parts.flipperR, boxShade),
    tail: buildPolyGeometry(parts.tail, boxShade),
  };
}

const setCursor = (pointer: boolean) => {
  if (typeof document !== 'undefined') document.body.style.cursor = pointer ? 'pointer' : '';
};

/**
 * Sea life, ice, seabirds, pack ice and Argentine transports on the open map, in low-poly with
 * smooth swimming paths, water interaction, and custom tap animations per species.
 */
export function SeaLife({ visible = true, timeUniform, instances, voyage }: {
  visible?: boolean;
  timeUniform?: SeaTimeUniform;
  instances: readonly SeaLifeInstance[];
  voyage?: VoyageBus | null;
}) {
  const root = useRef<Group>(null);
  const contextTime = useSeaTime();
  const clock = timeUniform || contextTime;

  const geometry = useMemo(() => {
    const icebergs = {
      'iceberg-lg': buildPolyGeometry(POLY_ICEBERGS['iceberg-lg']),
      'iceberg-sm': buildPolyGeometry(POLY_ICEBERGS['iceberg-sm']),
    };
    const cetaceans: Record<CetaceanSpecies, ReturnType<typeof buildCetaceanGeos>> = {
      humpback: buildCetaceanGeos(HUMPBACK_PARTS),
      orca: buildCetaceanGeos(ORCA_PARTS),
      minke: buildCetaceanGeos(MINKE_PARTS),
    };
    const penguins = {
      floe: buildPolyGeometry(PENGUIN_FLOE_TRIS, boxShade),
      adelie: buildPenguinGeos('adelie'),
      chinstrap: buildPenguinGeos('chinstrap'),
    };
    const seal = {
      floe: buildPolyGeometry(SEAL_FLOE_TRIS, boxShade),
      leopard: buildSealGeos(),
    };
    const bird = {
      body: buildPolyGeometry(ALBATROSS_PARTS.body, boxShade),
      wingR: buildPolyGeometry(ALBATROSS_PARTS.wingR, boxShade),
      wingL: buildPolyGeometry(ALBATROSS_PARTS.wingL, boxShade),
    };
    const packIce = PACK_ICE_POLYS.map((tris) => buildPolyGeometry(tris, boxShade));
    const waterlines = { 'iceberg-lg': waterline('iceberg-lg'), 'iceberg-sm': waterline('iceberg-sm') };
    return {
      icebergs,
      cetaceans,
      penguins,
      seal,
      bird,
      packIce,
      waterlines,
      spout: buildPolyGeometry(SPOUT_POLY, boxShade),
      splash: buildPolyGeometry(SPLASH_POLY, boxShade),
      iceChunk: buildPolyGeometry(ICE_CHUNK_POLY, boxShade),
      shipWake: buildPolyGeometry(SHIP_WAKE_POLY, boxShade),
      krill: buildPolyGeometry(KRILL_POLY, boxShade),
      buoy: buildPolyGeometry(BUOY_POLY, boxShade),
      irizar: buildVehicleGeometry('irizar'),
      hercules: buildVehicleGeometry('hercules'),
    };
  }, []);

  useEffect(() => () => {
    Object.values(geometry.icebergs).forEach((g) => g.dispose());
    Object.values(geometry.cetaceans).forEach((c) => {
      c.body.dispose();
      c.tail.dispose();
      c.flipperL.dispose();
      c.flipperR.dispose();
    });
    geometry.penguins.floe.dispose();
    for (const p of [geometry.penguins.adelie, geometry.penguins.chinstrap]) {
      p.body.dispose();
      p.head.dispose();
      p.flipperL.dispose();
      p.flipperR.dispose();
    }
    geometry.seal.floe.dispose();
    Object.values(geometry.seal.leopard).forEach((g) => g.dispose());
    geometry.bird.body.dispose();
    geometry.bird.wingL.dispose();
    geometry.bird.wingR.dispose();
    geometry.packIce.forEach((g) => g.dispose());
    Object.values(geometry.waterlines).forEach((w) => (w.glow.dispose(), w.foam.dispose(), w.ripple.dispose()));
    geometry.spout.dispose();
    geometry.splash.dispose();
    geometry.iceChunk.dispose();
    geometry.shipWake.dispose();
    geometry.krill.dispose();
    geometry.buoy.dispose();
    geometry.irizar.dispose();
    geometry.hercules.dispose();
  }, [geometry]);

  const drawn = useMemo(() => instances.filter((inst) => inst.species === 'irizar' || isCetacean(inst.species) || modelOf(inst)), [instances]);
  const waterMaterials = useMemo(() => Array.from({ length: drawn.length * (RIPPLES + 1) }, waterMaterial), [drawn.length]);
  useEffect(() => () => waterMaterials.forEach((m) => m.dispose()), [waterMaterials]);

  const groups = useRef<(Group | null)[]>([]);
  const spouts = useRef<(Mesh | null)[]>([]);
  const bodies = useRef<(Group | null)[]>([]);
  const foams = useRef<(Mesh | null)[]>([]);
  const ripples = useRef<(Mesh | null)[]>([]);
  const iceCalving = useRef<(Group | null)[]>([]);
  const penguinRigs = useRef<PenguinRig[][]>([]);
  const sealRigs = useRef<SealRig[]>([]);
  const cetaceanRigs = useRef<CetaceanRig[]>([]);
  const birdRigs = useRef<BirdRig[]>([]);
  const packIceRefs = useRef<(Group | null)[]>([]);
  const krillRefs = useRef<(Group | null)[]>([]);
  const buoyRefs = useRef<(Group | null)[]>([]);
  const shipWakeRef = useRef<Mesh | null>(null);
  const reactionStart = useRef<number[]>([]);
  const birdReactionStart = useRef<number[]>([]);
  const krillReactionStart = useRef<number[]>([]);
  const buoyReactionStart = useRef<number[]>([]);
  const plane = useRef<Group>(null);

  const triggerReaction = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    reactionStart.current[i] = clock.value;
  };

  const triggerBirdReaction = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    birdReactionStart.current[i] = clock.value;
  };

  useFrame(({ camera, size }) => {
    if (!root.current) return;
    root.current.visible = visible && !voyage?.state;
    if (!root.current.visible) return;
    const time = clock.value;
    const sized = (g: Group, px: number) => {
      const distance = camera.position.distanceTo(g.position);
      const s = seaModelSize(px, distance);
      g.scale.setScalar(s);
      g.visible = screenPx(s, distance, size.height) >= MODEL_MIN_PX;
      return s;
    };

    drawn.forEach((inst, i) => {
      const g = groups.current[i];
      if (!g) return;
      const reaction = reactionProgress(time, reactionStart.current[i] ?? -1);

      if (inst.species === 'irizar') {
        const ship = irizarStateAtTime(time, inst.speed, inst.phase);
        g.position.set(ship.x - 500, 0, ship.y - 500);
        const s = sized(g, VEHICLE_PX);
        g.position.y = -s * 0.02 + Math.sin(time * 1.3) * 0.012 * s;
        g.rotation.set(Math.sin(time * 1.1) * 0.04 * ship.speed, -ship.headingRad, 0, 'YZX');
        if (shipWakeRef.current) {
          const wakePulse = 0.92 + Math.sin(time * 4.5) * 0.1;
          shipWakeRef.current.scale.set(wakePulse, 1, 0.95 + Math.sin(time * 3.2) * 0.08);
        }
        return;
      }

      if (isCetacean(inst.species)) {
        const swim = swimPath(inst.species, time, inst.speed, inst.phase, inst.radius);
        const anim = cetaceanAnimation(inst.species, time, inst.phase, reaction);

        g.position.set(inst.x + swim.dx - 500, 0, inst.y + swim.dz - 500);
        const s = sized(g, ANIMAL_PX * inst.scale);
        const alpha = reaction !== null ? 1 : swim.surfaceAlpha;
        const verticalOffset = reaction !== null ? anim.breachY : swim.diveY;
        g.position.y = (WHALE_FLOAT + verticalOffset) * s;

        const pitch = swim.divePitch * (reaction !== null ? 0.2 : 1) + anim.pitch;
        g.rotation.set(anim.roll + swim.bank, swim.heading, pitch, 'YZX');

        const rig = cetaceanRigs.current[i];
        if (rig) {
          if (rig.tail) rig.tail.rotation.z = anim.tailPitch;
          if (rig.flipL) rig.flipL.rotation.x = anim.flipperFlap;
          if (rig.flipR) rig.flipR.rotation.x = -anim.flipperFlap;
          if (rig.foam) {
            (rig.foam.material as MeshBasicMaterial).opacity = Math.min(1, alpha * (0.55 + anim.splashBoost * 0.45));
          }
          if (rig.splash) {
            rig.splash.visible = anim.splashBoost > 0.12;
            if (rig.splash.visible) {
              const spScale = 0.7 + anim.splashBoost * 0.9;
              rig.splash.scale.set(spScale, 0.6 + anim.splashBoost * 0.9, spScale);
              rig.splash.rotation.y = time * 1.6;
            }
          }
          for (let r = 0; r < RIPPLES; r++) {
            const m = rig.ripples[r];
            if (!m) continue;
            const rp = ((time + inst.phase * 5) / (RIPPLE_SECONDS * 0.75) + r / RIPPLES) % 1;
            const { scale, opacity } = rippleAt(rp);
            const boost = 1 + anim.splashBoost * 0.85;
            m.scale.set(scale * 0.95 * boost, 1, scale * 0.95 * boost);
            (m.material as MeshBasicMaterial).opacity = opacity * alpha * (0.45 + anim.splashBoost * 0.55);
          }
        }

        const spout = spouts.current[i];
        if (spout) {
          const showSpout = swim.spoutActive || anim.forceSpout;
          spout.visible = showSpout;
          if (showSpout) {
            const pulse = 0.85 + Math.sin(time * 12) * 0.15;
            spout.scale.set(pulse, 0.9 + anim.splashBoost * 0.5, pulse);
          }
        }
        return;
      }

      // Icebergs, penguins on floe, and seal on floe: drift + swell + water ripples + calving
      const drift = driftOffsetAtTime(time, inst.speed, inst.phase, inst.radius);
      g.position.set(inst.x + drift.dx - 500, 0, inst.y + drift.dy - 500);
      sized(g, (inst.species === 'iceberg' ? ICE_PX : ANIMAL_PX) * inst.scale);
      const sway = time * (inst.species === 'iceberg' ? 0.4 : 1.15) + inst.phase * Math.PI * 2;
      const iceberg = inst.species === 'iceberg';
      const heave = iceberg ? swell(time, inst.phase) : swell(time, inst.phase) * 0.75;
      const iceRock = iceberg && reaction !== null ? Math.sin(reaction * Math.PI * 4) * Math.sin(reaction * Math.PI) * 0.16 : 0;
      const body = bodies.current[i];
      if (body) {
        body.position.y = heave - ICEBERG_DRAFT;
        body.rotation.set(
          Math.sin(sway) * (iceberg ? 0.045 : 0.032) + iceRock,
          0,
          Math.sin(sway * 1.2 + 0.7) * (iceberg ? 0.035 : 0.024) + iceRock * 0.6,
        );
      }
      g.rotation.set(0, inst.seed * 2.4 + (iceberg ? 0 : Math.sin(time * 0.12 + inst.phase * 6) * 0.35), 0);

      if (iceberg) {
        const calve = iceCalving.current[i];
        if (calve) {
          calve.visible = reaction !== null;
          if (reaction !== null) {
            const spread = 0.4 + reaction * 0.95;
            const drop = Math.sin(reaction * Math.PI) * 0.22 - reaction * 0.18;
            calve.scale.setScalar(spread);
            calve.position.y = drop;
            calve.rotation.y = reaction * 1.4;
          }
        }
      } else if (inst.species === 'penguins') {
        const rigs = penguinRigs.current[i];
        if (rigs) {
          PENGUINS_ON_FLOE.forEach((p, pIdx) => {
            const rig = rigs[pIdx];
            if (!rig) return;
            const anim = penguinAnimation(time, inst.phase, pIdx, reaction);
            if (rig.root) {
              rig.root.position.y = PENGUIN_FLOE_Y + anim.hopY;
              rig.root.rotation.set(0, p.angle, anim.bodyTiltZ);
            }
            if (rig.head) rig.head.rotation.set(0, anim.headYaw, anim.headPitch);
            if (rig.flipL) rig.flipL.rotation.x = anim.flipperL;
            if (rig.flipR) rig.flipR.rotation.x = anim.flipperR;
          });
        }
      } else if (inst.species === 'seal') {
        const rig = sealRigs.current[i];
        if (rig) {
          const anim = sealAnimation(time, inst.phase, reaction);
          if (rig.body) rig.body.rotation.z = anim.bodyPitch;
          // The leopard seal lies with its head on the ice: it raises it instead of dipping it.
          if (rig.head) rig.head.rotation.set(0, anim.headYaw, -anim.headPitch);
          if (rig.flipL) rig.flipL.rotation.x = anim.flipperL;
          if (rig.flipR) rig.flipR.rotation.x = anim.flipperR;
          if (rig.tail) rig.tail.rotation.y = anim.tailYaw;
        }
      }

      const foam = foams.current[i];
      if (foam) {
        const boost = iceberg && reaction !== null ? 0.35 * Math.sin(reaction * Math.PI) : 0;
        (foam.material as MeshBasicMaterial).opacity = Math.min(1, 0.55 + boost + 0.45 * Math.min(1, Math.max(0, -heave / 0.012)));
      }
      const rScale = iceberg ? 1 + (reaction !== null ? 0.45 * Math.sin(reaction * Math.PI) : 0) : 0.78;
      for (let r = 0; r < RIPPLES; r++) {
        const m = ripples.current[i * RIPPLES + r];
        if (!m) continue;
        const { scale, opacity } = rippleAt(((time + inst.phase * 7) / RIPPLE_SECONDS + r / RIPPLES) % 1);
        m.scale.set(scale * rScale, 1, scale * rScale);
        (m.material as MeshBasicMaterial).opacity = opacity * (iceberg ? 1 : 0.72);
      }
    });

    // Idea 1: Soaring seabirds
    SEA_BIRDS.forEach((b, bIdx) => {
      const rig = birdRigs.current[bIdx];
      if (!rig?.root) return;
      const reaction = reactionProgress(time, birdReactionStart.current[bIdx] ?? -1);
      const anim = birdAnimation(time, b.phase, b.radius, reaction);
      rig.root.position.set(b.x + anim.dx - 500, anim.y, b.y + anim.dz - 500);
      const s = sized(rig.root, BIRD_PX);
      rig.root.position.y = anim.y * Math.max(0.7, s * 0.16);
      rig.root.rotation.set(anim.bank, anim.heading, anim.pitch, 'YZX');
      if (rig.wingR) rig.wingR.rotation.x = anim.wingFlap;
      if (rig.wingL) rig.wingL.rotation.x = -anim.wingFlap;
    });

    // Idea 4: Seasonal drifting pack-ice plates
    PACK_ICE_SPOTS.forEach((p, pIdx) => {
      const g = packIceRefs.current[pIdx];
      if (!g) return;
      const drift = driftOffsetAtTime(time, 0.018, p.phase, 1.5);
      g.position.set(p.x + drift.dx - 500, 0, p.y + drift.dy - 500);
      sized(g, PACK_ICE_PX);
      g.position.y = swell(time, p.phase) * 0.65 - ICEBERG_DRAFT * 0.4;
      g.rotation.set(
        Math.sin(time * 0.9 + p.seed) * 0.03,
        p.seed + Math.sin(time * 0.15 + p.phase * 5) * 0.25,
        Math.cos(time * 1.1 + p.seed) * 0.025,
      );
    });

    // Krill swarms: swirl at surface, scatter outward on click
    KRILL_SPOTS.forEach((k, kIdx) => {
      const g = krillRefs.current[kIdx];
      if (!g) return;
      const reaction = reactionProgress(time, krillReactionStart.current[kIdx] ?? -1);
      g.position.set(k.x - 500, 0.01, k.y - 500);
      const s = sized(g, 42);
      const scatter = reaction !== null ? 1 + Math.sin(reaction * Math.PI) * 1.1 : 1;
      g.scale.set(s * scatter, s, s * scatter);
      g.rotation.y = time * (reaction !== null ? 3.2 : 0.45) + k.phase * 6;
    });

    // Oceanographic buoys in the Drake Passage: drift gently, pitch with swell, rock + spin on click
    DRAKE_BUOYS.forEach((b, bIdx) => {
      const g = buoyRefs.current[bIdx];
      if (!g) return;
      const reaction = reactionProgress(time, buoyReactionStart.current[bIdx] ?? -1);
      const driftX = Math.sin(time * 0.18 + b.phase * Math.PI * 2) * 3.5;
      const driftZ = Math.cos(time * 0.14 + b.phase * Math.PI * 2) * 2.5;
      g.position.set(b.x + driftX - 500, 0.01, b.y + driftZ - 500);
      sized(g, 34);
      const rockBoost = reaction !== null ? 1 + Math.sin(reaction * Math.PI) * 1.4 : 1;
      const pitch = Math.sin(time * 1.6 + b.phase * 6) * 0.16 * rockBoost;
      const roll = Math.cos(time * 1.3 + b.phase * 5) * 0.14 * rockBoost;
      const spin = reaction !== null ? 0.5 * (1 - Math.cos(reaction * Math.PI)) * Math.PI * 2 : time * 0.15 + b.phase * 4;
      g.position.y = 0.01 + swell(time, b.phase) * 0.7;
      g.rotation.set(pitch, spin, roll);
    });

    if (plane.current) {
      const flight = irizarStateAtTime(time, HERCULES_SPEED, HERCULES_PHASE);
      const p = voyageAt('plane', flight.routeT);
      const g = plane.current;
      g.position.set(p.x - 500, 0, p.y - 500);
      const s = sized(g, VEHICLE_PX);
      g.position.y = heightOf('plane', flight.routeT, s);
      const heading = voyageHeading('plane', flight.routeT) + (flight.dirSign < 0 ? Math.PI : 0);
      g.rotation.set(Math.sin(time * 0.9) * 0.05, -heading, 0, 'YZX');
    }
  });

  if (drawn.length === 0) return null;
  return (
    <group ref={root}>
      {drawn.map((inst, i) => {
        const model = modelOf(inst);

        if (isCetacean(inst.species)) {
          const geos = geometry.cetaceans[inst.species];
          const [fx, fy, fz] = geos.flipperPivot;
          const rig = (cetaceanRigs.current[i] ??= {
            tail: null,
            flipL: null,
            flipR: null,
            foam: null,
            splash: null,
            ripples: [],
          });
          return (
            <group
              key={inst.id}
              ref={(g) => void (groups.current[i] = g)}
              onClick={triggerReaction(i)}
              onPointerOver={() => setCursor(true)}
              onPointerOut={() => setCursor(false)}
            >
              <mesh geometry={geos.body} material={vehicleMaterial} />
              <group ref={(g) => void (rig.tail = g)} position={geos.tailPivot}>
                <mesh geometry={geos.tail} material={vehicleMaterial} />
              </group>
              <group ref={(g) => void (rig.flipR = g)} position={[fx, fy, fz]}>
                <mesh geometry={geos.flipperR} material={vehicleMaterial} />
              </group>
              <group ref={(g) => void (rig.flipL = g)} position={[fx, fy, -fz]}>
                <mesh geometry={geos.flipperL} material={vehicleMaterial} />
              </group>
              {(inst.species === 'humpback' || inst.species === 'minke') && (
                <mesh
                  ref={(m) => void (spouts.current[i] = m)}
                  geometry={geometry.spout}
                  material={vehicleMaterial}
                  position={[0.35, 0.04, 0]}
                  visible={false}
                />
              )}
              <mesh
                ref={(m) => void (rig.splash = m)}
                geometry={geometry.splash}
                material={vehicleMaterial}
                position-y={0.01}
                visible={false}
              />
              <mesh
                ref={(m) => void (rig.foam = m)}
                geometry={geometry.waterlines['iceberg-sm'].foam}
                material={waterMaterials[drawn.length * RIPPLES + i]}
                scale={0.85}
                position-y={0.005}
                renderOrder={3}
              />
              {Array.from({ length: RIPPLES }, (_, r) => (
                <mesh
                  key={r}
                  ref={(m) => void (rig.ripples[r] = m)}
                  geometry={geometry.waterlines['iceberg-sm'].ripple}
                  material={waterMaterials[i * RIPPLES + r]}
                  position-y={0.004}
                  renderOrder={2}
                />
              ))}
            </group>
          );
        }

        if (inst.species === 'penguins') {
          const rigs = (penguinRigs.current[i] ??= PENGUINS_ON_FLOE.map(() => ({ root: null, head: null, flipL: null, flipR: null })));
          const [sx, sy, sz] = PENGUIN_SHOULDER;
          return (
            <group
              key={inst.id}
              ref={(g) => void (groups.current[i] = g)}
              onClick={triggerReaction(i)}
              onPointerOver={() => setCursor(true)}
              onPointerOut={() => setCursor(false)}
            >
              <group ref={(g) => void (bodies.current[i] = g)}>
                <mesh geometry={geometry.penguins.floe} material={vehicleMaterial} />
                {PENGUINS_ON_FLOE.map((p, pIdx) => {
                  const pGeo = geometry.penguins[p.species];
                  return (
                    <group
                      key={pIdx}
                      ref={(g) => void (rigs[pIdx].root = g)}
                      position={[p.x, PENGUIN_FLOE_Y, p.z]}
                      rotation={[0, p.angle, 0]}
                      scale={p.scale as [number, number, number]}
                    >
                      <mesh geometry={pGeo.body} material={vehicleMaterial} />
                      <group ref={(g) => void (rigs[pIdx].head = g)} position={PENGUIN_NECK}>
                        <mesh geometry={pGeo.head} material={vehicleMaterial} />
                      </group>
                      <group ref={(g) => void (rigs[pIdx].flipR = g)} position={[sx, sy, sz]}>
                        <mesh geometry={pGeo.flipperR} material={vehicleMaterial} />
                      </group>
                      <group ref={(g) => void (rigs[pIdx].flipL = g)} position={[sx, sy, -sz]}>
                        <mesh geometry={pGeo.flipperL} material={vehicleMaterial} />
                      </group>
                    </group>
                  );
                })}
              </group>
              <mesh geometry={geometry.waterlines['iceberg-sm'].glow} material={glowMaterial} scale={0.78} position-y={0.002} renderOrder={1} />
              {Array.from({ length: RIPPLES }, (_, r) => (
                <mesh
                  key={r}
                  ref={(m) => void (ripples.current[i * RIPPLES + r] = m)}
                  geometry={geometry.waterlines['iceberg-sm'].ripple}
                  material={waterMaterials[i * RIPPLES + r]}
                  position-y={0.004}
                  renderOrder={2}
                />
              ))}
              <mesh
                ref={(m) => void (foams.current[i] = m)}
                geometry={geometry.waterlines['iceberg-sm'].foam}
                material={waterMaterials[drawn.length * RIPPLES + i]}
                scale={0.72}
                position-y={0.006}
                renderOrder={3}
              />
            </group>
          );
        }

        if (inst.species === 'seal') {
          const rig = (sealRigs.current[i] ??= { body: null, head: null, flipL: null, flipR: null, tail: null });
          const sGeo = geometry.seal.leopard;
          const [fx, fy, fz] = LEOPARD_PARTS.flipperPivot;
          return (
            <group
              key={inst.id}
              ref={(g) => void (groups.current[i] = g)}
              onClick={triggerReaction(i)}
              onPointerOver={() => setCursor(true)}
              onPointerOut={() => setCursor(false)}
            >
              <group ref={(g) => void (bodies.current[i] = g)}>
                <mesh geometry={geometry.seal.floe} material={vehicleMaterial} />
                <group
                  ref={(g) => void (rig.body = g)}
                  position={[SEAL_FLOE_PLACEMENT.x, SEAL_FLOE_PLACEMENT.y, SEAL_FLOE_PLACEMENT.z]}
                  rotation={[0, SEAL_FLOE_PLACEMENT.angle, 0]}
                  scale={SEAL_FLOE_PLACEMENT.scale}
                >
                  <mesh geometry={sGeo.body} material={vehicleMaterial} />
                  <group ref={(g) => void (rig.head = g)} position={LEOPARD_PARTS.neck}>
                    <mesh geometry={sGeo.head} material={vehicleMaterial} />
                  </group>
                  <group ref={(g) => void (rig.flipL = g)} position={[fx, fy, -fz]}>
                    <mesh geometry={sGeo.flipperL} material={vehicleMaterial} />
                  </group>
                  <group ref={(g) => void (rig.flipR = g)} position={[fx, fy, fz]}>
                    <mesh geometry={sGeo.flipperR} material={vehicleMaterial} />
                  </group>
                  <group ref={(g) => void (rig.tail = g)} position={LEOPARD_PARTS.tailPivot}>
                    <mesh geometry={sGeo.tail} material={vehicleMaterial} />
                  </group>
                </group>
              </group>
              <mesh geometry={geometry.waterlines['iceberg-sm'].glow} material={glowMaterial} scale={0.72} position-y={0.002} renderOrder={1} />
              {Array.from({ length: RIPPLES }, (_, r) => (
                <mesh
                  key={r}
                  ref={(m) => void (ripples.current[i * RIPPLES + r] = m)}
                  geometry={geometry.waterlines['iceberg-sm'].ripple}
                  material={waterMaterials[i * RIPPLES + r]}
                  position-y={0.004}
                  renderOrder={2}
                />
              ))}
              <mesh
                ref={(m) => void (foams.current[i] = m)}
                geometry={geometry.waterlines['iceberg-sm'].foam}
                material={waterMaterials[drawn.length * RIPPLES + i]}
                scale={0.68}
                position-y={0.006}
                renderOrder={3}
              />
            </group>
          );
        }

        const isIceberg = model === 'iceberg-lg' || model === 'iceberg-sm';
        return (
          <group
            key={inst.id}
            ref={(g) => void (groups.current[i] = g)}
            onClick={isIceberg ? triggerReaction(i) : undefined}
            onPointerOver={isIceberg ? () => setCursor(true) : undefined}
            onPointerOut={isIceberg ? () => setCursor(false) : undefined}
          >
            <group ref={(g) => void (bodies.current[i] = g)}>
              <mesh
                geometry={isIceberg ? geometry.icebergs[model] : geometry.irizar}
                material={vehicleMaterial}
              />
            </group>
            {inst.species === 'irizar' && (
              <mesh ref={shipWakeRef} geometry={geometry.shipWake} material={vehicleMaterial} position-y={0.005} />
            )}
            {isIceberg && (
              <>
                <group ref={(g) => void (iceCalving.current[i] = g)} visible={false}>
                  <mesh geometry={geometry.iceChunk} material={vehicleMaterial} position={[0.38, 0.02, 0.14]} rotation={[0.2, 0.5, 0]} />
                  <mesh geometry={geometry.iceChunk} material={vehicleMaterial} position={[-0.36, 0.01, -0.18]} rotation={[-0.1, 1.8, 0.2]} />
                  <mesh geometry={geometry.iceChunk} material={vehicleMaterial} position={[0.05, 0.01, -0.38]} rotation={[0.15, 2.7, -0.1]} />
                </group>
                <mesh geometry={geometry.waterlines[model].glow} material={glowMaterial} position-y={0.002} renderOrder={1} />
                {Array.from({ length: RIPPLES }, (_, r) => (
                  <mesh
                    key={r}
                    ref={(m) => void (ripples.current[i * RIPPLES + r] = m)}
                    geometry={geometry.waterlines[model].ripple}
                    material={waterMaterials[i * RIPPLES + r]}
                    position-y={0.004}
                    renderOrder={2}
                  />
                ))}
                <mesh
                  ref={(m) => void (foams.current[i] = m)}
                  geometry={geometry.waterlines[model].foam}
                  material={waterMaterials[drawn.length * RIPPLES + i]}
                  position-y={0.006}
                  renderOrder={3}
                />
              </>
            )}
          </group>
        );
      })}
      {SEA_BIRDS.map((_, bIdx) => {
        const rig = (birdRigs.current[bIdx] ??= { root: null, wingL: null, wingR: null });
        return (
          <group
            key={`bird-${bIdx}`}
            ref={(g) => void (rig.root = g)}
            onClick={triggerBirdReaction(bIdx)}
            onPointerOver={() => setCursor(true)}
            onPointerOut={() => setCursor(false)}
          >
            <mesh geometry={geometry.bird.body} material={vehicleMaterial} />
            <group ref={(g) => void (rig.wingR = g)}>
              <mesh geometry={geometry.bird.wingR} material={vehicleMaterial} />
            </group>
            <group ref={(g) => void (rig.wingL = g)}>
              <mesh geometry={geometry.bird.wingL} material={vehicleMaterial} />
            </group>
          </group>
        );
      })}
      {PACK_ICE_SPOTS.map((p, pIdx) => (
        <group key={`pack-${pIdx}`} ref={(g) => void (packIceRefs.current[pIdx] = g)}>
          <mesh geometry={geometry.packIce[p.variant]} material={vehicleMaterial} />
        </group>
      ))}
      {KRILL_SPOTS.map((_, kIdx) => (
        <group
          key={`krill-${kIdx}`}
          ref={(g) => void (krillRefs.current[kIdx] = g)}
          onClick={(e) => {
            e.stopPropagation();
            krillReactionStart.current[kIdx] = clock.value;
          }}
          onPointerOver={() => setCursor(true)}
          onPointerOut={() => setCursor(false)}
        >
          <mesh geometry={geometry.krill} material={vehicleMaterial} />
        </group>
      ))}
      {DRAKE_BUOYS.map((_, bIdx) => (
        <group
          key={`buoy-${bIdx}`}
          ref={(g) => void (buoyRefs.current[bIdx] = g)}
          onClick={(e) => {
            e.stopPropagation();
            buoyReactionStart.current[bIdx] = clock.value;
          }}
          onPointerOver={() => setCursor(true)}
          onPointerOut={() => setCursor(false)}
        >
          <mesh geometry={geometry.buoy} material={vehicleMaterial} />
        </group>
      ))}
      <group ref={plane}>
        <mesh geometry={geometry.hercules} material={vehicleMaterial} />
      </group>
    </group>
  );
}
