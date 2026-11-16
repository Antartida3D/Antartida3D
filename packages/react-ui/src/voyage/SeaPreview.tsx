import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { SeaPoint } from '@antartida/core';
import { cetaceanAnimation, penguinAnimation, sealAnimation } from '../map3d/seaLifeAnimations.ts';
import { buildPenguinPolyParts, buildWeddellSealPolyParts, mirrorZTris } from '../orcadas/lowPolyAnimals.ts';
import { PENGUIN_NECK, PENGUIN_SHOULDER, type PenguinSpecies } from '../orcadas/penguins.ts';
import { WEDDELL_FLIPPER_L, WEDDELL_FLIPPER_R, WEDDELL_NECK, WEDDELL_TAIL } from '../orcadas/seals.ts';
import { ICEBERG_TABULAR_POLY } from './icebergs.ts';
import { IRIZAR_POLY } from './irizarModel.ts';
import { boxShade, buildPolyGeometry } from './lowPoly.ts';
import { ModelPreview } from './ModelPreview.tsx';
import { PENGUIN_FLOE_TRIS, PENGUIN_FLOE_Y, SEAL_FLOE_TRIS } from './seaPolyModels.ts';
import { vehicleMaterial } from './vehicles.ts';
import { HUMPBACK_PARTS, MINKE_PARTS, ORCA_PARTS } from './whalePolyModels.ts';

type Species = NonNullable<SeaPoint['targetSpecies']>;

/** Front-facing staggered formation so all 4 squad penguins are clearly visible in the modal. */
const PREVIEW_PENGUINS: readonly {
  species: PenguinSpecies;
  x: number;
  z: number;
  scale: readonly [number, number, number];
  yaw: number;
}[] = [
  { species: 'adelie', x: -0.02, z: 0.16, scale: [0.43, 0.44, 0.43], yaw: -Math.PI / 2 },
  { species: 'chinstrap', x: -0.14, z: -0.1, scale: [0.35, 0.54, 0.35], yaw: -Math.PI / 2 + 0.14 },
  { species: 'adelie', x: -0.25, z: 0.08, scale: [0.47, 0.36, 0.47], yaw: -Math.PI / 2 + 0.22 },
  { species: 'chinstrap', x: 0.24, z: 0.06, scale: [0.32, 0.32, 0.32], yaw: -Math.PI / 2 - 0.2 },
];

function PenguinsPreviewScene({ reduced }: { reduced: boolean }) {
  const geos = useMemo(() => {
    const make = (sp: PenguinSpecies) => {
      const p = buildPenguinPolyParts(sp);
      return {
        body: buildPolyGeometry(p.body, boxShade),
        head: buildPolyGeometry(p.head, boxShade),
        flipR: buildPolyGeometry(p.flipper, boxShade),
        flipL: buildPolyGeometry(mirrorZTris(p.flipper), boxShade),
      };
    };
    return { floe: buildPolyGeometry(PENGUIN_FLOE_TRIS, boxShade), adelie: make('adelie'), chinstrap: make('chinstrap') };
  }, []);

  useEffect(() => () => {
    geos.floe.dispose();
    for (const p of [geos.adelie, geos.chinstrap]) {
      p.body.dispose();
      p.head.dispose();
      p.flipR.dispose();
      p.flipL.dispose();
    }
  }, [geos]);

  const rigs = useRef<{ root: Group | null; head: Group | null; flipL: Group | null; flipR: Group | null }[]>(
    PREVIEW_PENGUINS.map(() => ({ root: null, head: null, flipL: null, flipR: null })),
  );

  useFrame(({ clock }) => {
    const t = reduced ? 0.25 : clock.elapsedTime;
    const wavePhase = reduced ? 0.25 : (t * 0.42) % 1;
    PREVIEW_PENGUINS.forEach((p, idx) => {
      const rig = rigs.current[idx];
      if (!rig) return;
      const anim = penguinAnimation(t, 0.2, idx, wavePhase);
      if (rig.root) {
        rig.root.position.y = PENGUIN_FLOE_Y + (reduced ? 0 : anim.hopY * 0.55);
        rig.root.rotation.set(0, p.yaw, reduced ? 0 : anim.bodyTiltZ);
      }
      if (rig.head) rig.head.rotation.set(0, anim.headYaw * 0.5, anim.headPitch);
      if (rig.flipL) rig.flipL.rotation.x = anim.flipperL;
      if (rig.flipR) rig.flipR.rotation.x = anim.flipperR;
    });
  });

  const [sx, sy, sz] = PENGUIN_SHOULDER;
  return (
    <group position={[0, -0.06, 0]}>
      <mesh geometry={geos.floe} material={vehicleMaterial} />
      {PREVIEW_PENGUINS.map((p, idx) => {
        const g = geos[p.species];
        return (
          <group
            key={idx}
            ref={(n) => void (rigs.current[idx].root = n)}
            position={[p.x, PENGUIN_FLOE_Y, p.z]}
            rotation={[0, p.yaw, 0]}
            scale={p.scale as [number, number, number]}
          >
            <mesh geometry={g.body} material={vehicleMaterial} />
            <group ref={(n) => void (rigs.current[idx].head = n)} position={PENGUIN_NECK}>
              <mesh geometry={g.head} material={vehicleMaterial} />
            </group>
            <group ref={(n) => void (rigs.current[idx].flipR = n)} position={[sx, sy, sz]}>
              <mesh geometry={g.flipR} material={vehicleMaterial} />
            </group>
            <group ref={(n) => void (rigs.current[idx].flipL = n)} position={[sx, sy, -sz]}>
              <mesh geometry={g.flipL} material={vehicleMaterial} />
            </group>
          </group>
        );
      })}
    </group>
  );
}

function SealPreviewScene({ reduced }: { reduced: boolean }) {
  const geos = useMemo(() => {
    const p = buildWeddellSealPolyParts();
    return {
      floe: buildPolyGeometry(SEAL_FLOE_TRIS, boxShade),
      body: buildPolyGeometry(p.body, boxShade),
      head: buildPolyGeometry(p.head, boxShade),
      flipL: buildPolyGeometry(p.flipperL, boxShade),
      flipR: buildPolyGeometry(p.flipperR, boxShade),
      tail: buildPolyGeometry(p.tail, boxShade),
    };
  }, []);

  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  const bodyRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const flipLRef = useRef<Group>(null);
  const flipRRef = useRef<Group>(null);
  const tailRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.elapsedTime;
    const anim = sealAnimation(t, 0, (t * 0.32) % 1);
    if (bodyRef.current) bodyRef.current.rotation.z = anim.bodyPitch;
    if (headRef.current) headRef.current.rotation.set(0, anim.headYaw, anim.headPitch);
    if (flipLRef.current) flipLRef.current.rotation.x = anim.flipperL;
    if (flipRRef.current) flipRRef.current.rotation.x = anim.flipperR;
    if (tailRef.current) tailRef.current.rotation.y = anim.tailYaw;
  });

  return (
    <group rotation={[0, -0.55, 0]} position={[0, -0.08, 0]}>
      <mesh geometry={geos.floe} material={vehicleMaterial} />
      <group ref={bodyRef} position={[0.02, 0.092, 0.02]} scale={0.76}>
        <mesh geometry={geos.body} material={vehicleMaterial} />
        <group ref={headRef} position={WEDDELL_NECK}>
          <mesh geometry={geos.head} material={vehicleMaterial} />
        </group>
        <group ref={flipLRef} position={WEDDELL_FLIPPER_L}>
          <mesh geometry={geos.flipL} material={vehicleMaterial} />
        </group>
        <group ref={flipRRef} position={WEDDELL_FLIPPER_R}>
          <mesh geometry={geos.flipR} material={vehicleMaterial} />
        </group>
        <group ref={tailRef} position={WEDDELL_TAIL}>
          <mesh geometry={geos.tail} material={vehicleMaterial} />
        </group>
      </group>
    </group>
  );
}

const CETACEAN_PARTS = { humpback: HUMPBACK_PARTS, orca: ORCA_PARTS, minke: MINKE_PARTS } as const;

function CetaceanPreviewScene({ species, reduced }: { species: 'humpback' | 'orca' | 'minke'; reduced: boolean }) {
  const parts = CETACEAN_PARTS[species];
  const geos = useMemo(
    () => ({
      body: buildPolyGeometry(parts.body, boxShade),
      tail: buildPolyGeometry(parts.tail, boxShade),
      flipL: buildPolyGeometry(parts.flipperL, boxShade),
      flipR: buildPolyGeometry(parts.flipperR, boxShade),
    }),
    [parts],
  );

  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  const rootRef = useRef<Group>(null);
  const tailRef = useRef<Group>(null);
  const flipLRef = useRef<Group>(null);
  const flipRRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.elapsedTime;
    const anim = cetaceanAnimation(species, t, 0, null);
    if (rootRef.current) {
      rootRef.current.position.y = -0.02 + Math.sin(t * 0.9) * 0.05;
      rootRef.current.rotation.z = Math.sin(t * 0.9 + 1) * 0.1;
    }
    if (tailRef.current) tailRef.current.rotation.z = anim.tailPitch;
    if (flipLRef.current) flipLRef.current.rotation.x = anim.flipperFlap * 1.4;
    if (flipRRef.current) flipRRef.current.rotation.x = -anim.flipperFlap * 1.4;
  });

  const [fx, fy, fz] = parts.flipperPivot;
  return (
    <group ref={rootRef} rotation={[0, -0.6, 0]} position={[0, -0.02, 0]}>
      <mesh geometry={geos.body} material={vehicleMaterial} />
      <group ref={tailRef} position={parts.tailPivot}>
        <mesh geometry={geos.tail} material={vehicleMaterial} />
      </group>
      <group ref={flipRRef} position={[fx, fy, fz]}>
        <mesh geometry={geos.flipR} material={vehicleMaterial} />
      </group>
      <group ref={flipLRef} position={[fx, fy, -fz]}>
        <mesh geometry={geos.flipL} material={vehicleMaterial} />
      </group>
    </group>
  );
}

/** View of the model of a sea point, for its card, with articulated animations for every animal. */
export function SeaPreview({ species, reduced }: { species: Species; reduced: boolean }) {
  if (species === 'penguins') {
    return (
      <ModelPreview motion="sway" lift={0.14} reduced={reduced} sea>
        <PenguinsPreviewScene reduced={reduced} />
      </ModelPreview>
    );
  }
  if (species === 'seal') {
    return (
      <ModelPreview motion="sway" lift={0.08} reduced={reduced} sea>
        <SealPreviewScene reduced={reduced} />
      </ModelPreview>
    );
  }
  if (species === 'humpback' || species === 'orca' || species === 'minke') {
    return (
      <ModelPreview motion="swim" reduced={reduced} sea>
        <CetaceanPreviewScene species={species} reduced={reduced} />
      </ModelPreview>
    );
  }
  if (species === 'iceberg') {
    return <ModelPreview tris={ICEBERG_TABULAR_POLY} motion="sway" reduced={reduced} sea />;
  }
  return <ModelPreview tris={IRIZAR_POLY} motion="still" reduced={reduced} sea />;
}
