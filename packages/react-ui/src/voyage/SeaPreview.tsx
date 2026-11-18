import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { SeaPoint } from '@antartida/core';
import { cetaceanAnimation, sealAnimation } from '../map3d/seaLifeAnimations.ts';
import { ICEBERG_TABULAR_POLY } from './icebergs.ts';
import { IRIZAR_POLY } from './irizarModel.ts';
import { boxShade, buildPolyGeometry, emperor, emperorFlipper, EMPEROR_SHOULDER } from './lowPoly.ts';
import { ModelPreview } from './ModelPreview.tsx';
import { WAVE_RAISED } from './pointModels.ts';
import { PENGUIN_FLOE_TRIS, PENGUIN_FLOE_Y, SEAL_FLOE_TRIS } from './seaPolyModels.ts';
import { vehicleMaterial } from './vehicles.ts';
import { MINKE_PARTS, ORCA_PARTS } from './whalePolyModels.ts';
import { HUMPBACK_PARTS, LEOPARD_PARTS } from '../marine/lowPolyMarine.ts';

type Species = NonNullable<SeaPoint['targetSpecies']>;

/** Front-facing staggered formation of 4 emperor penguins (the emperor() of the map, one unit tall) waving in unison. */
const PREVIEW_PENGUINS: readonly {
  x: number;
  z: number;
  scale: readonly [number, number, number];
  yaw: number;
}[] = [
  { x: -0.02, z: 0.16, scale: [0.3, 0.31, 0.3], yaw: -Math.PI / 2 },
  { x: -0.14, z: -0.1, scale: [0.245, 0.38, 0.245], yaw: -Math.PI / 2 + 0.14 },
  { x: -0.25, z: 0.08, scale: [0.33, 0.25, 0.33], yaw: -Math.PI / 2 + 0.22 },
  { x: 0.24, z: 0.06, scale: [0.225, 0.225, 0.225], yaw: -Math.PI / 2 - 0.2 },
];

function PenguinsPreviewScene({ reduced }: { reduced: boolean }) {
  const geos = useMemo(() => ({
    floe: buildPolyGeometry(PENGUIN_FLOE_TRIS, boxShade),
    body: buildPolyGeometry(emperor(0, 0, 1), boxShade),
    flipR: buildPolyGeometry(emperorFlipper(1), boxShade),
    flipL: buildPolyGeometry(emperorFlipper(-1), boxShade),
  }), []);

  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  const rigs = useRef<{ root: Group | null; flipL: Group | null; flipR: Group | null }[]>(
    PREVIEW_PENGUINS.map(() => ({ root: null, flipL: null, flipR: null })),
  );

  useFrame(({ clock }) => {
    const wave = reduced ? WAVE_RAISED : WAVE_RAISED + Math.sin(clock.elapsedTime * 8.5) * 0.32;
    PREVIEW_PENGUINS.forEach((p, idx) => {
      const rig = rigs.current[idx];
      if (!rig) return;
      if (rig.root) {
        rig.root.position.set(p.x, PENGUIN_FLOE_Y, p.z);
        rig.root.rotation.set(0, p.yaw, 0);
      }
      if (rig.flipL) rig.flipL.rotation.x = 0.08;
      if (rig.flipR) rig.flipR.rotation.x = -(0.08 + wave);
    });
  });

  const [sx, sy, sz] = EMPEROR_SHOULDER;
  return (
    <group position={[0, -0.06, 0]}>
      <mesh geometry={geos.floe} material={vehicleMaterial} />
      {PREVIEW_PENGUINS.map((p, idx) => (
        <group
          key={idx}
          ref={(n) => void (rigs.current[idx].root = n)}
          position={[p.x, PENGUIN_FLOE_Y, p.z]}
          rotation={[0, p.yaw, 0]}
          scale={p.scale as [number, number, number]}
        >
          <mesh geometry={geos.body} material={vehicleMaterial} />
          <group ref={(n) => void (rigs.current[idx].flipR = n)} position={[sx, sy, sz]}>
            <mesh geometry={geos.flipR} material={vehicleMaterial} />
          </group>
          <group ref={(n) => void (rigs.current[idx].flipL = n)} position={[sx, sy, -sz]}>
            <mesh geometry={geos.flipL} material={vehicleMaterial} />
          </group>
        </group>
      ))}
    </group>
  );
}

/** The leopard seal of Océano on its floe (LEOPARD_PARTS), as on the map. */
function SealPreviewScene({ reduced }: { reduced: boolean }) {
  const geos = useMemo(() => {
    const p = LEOPARD_PARTS;
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
    // The leopard seal lies with its head on the ice: it raises it instead of dipping it.
    if (headRef.current) headRef.current.rotation.set(0, anim.headYaw, -anim.headPitch);
    if (flipLRef.current) flipLRef.current.rotation.x = anim.flipperL;
    if (flipRRef.current) flipRRef.current.rotation.x = anim.flipperR;
    if (tailRef.current) tailRef.current.rotation.y = anim.tailYaw;
  });

  const [fx, fy, fz] = LEOPARD_PARTS.flipperPivot;
  return (
    <group rotation={[0, -0.55, 0]} position={[0, -0.08, 0]}>
      <mesh geometry={geos.floe} material={vehicleMaterial} />
      <group ref={bodyRef} position={[0.02, 0.092, 0.02]} scale={0.86}>
        <mesh geometry={geos.body} material={vehicleMaterial} />
        <group ref={headRef} position={LEOPARD_PARTS.neck}>
          <mesh geometry={geos.head} material={vehicleMaterial} />
        </group>
        <group ref={flipLRef} position={[fx, fy, -fz]}>
          <mesh geometry={geos.flipL} material={vehicleMaterial} />
        </group>
        <group ref={flipRRef} position={[fx, fy, fz]}>
          <mesh geometry={geos.flipR} material={vehicleMaterial} />
        </group>
        <group ref={tailRef} position={LEOPARD_PARTS.tailPivot}>
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
