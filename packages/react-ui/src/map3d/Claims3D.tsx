import { useEffect, useMemo, useRef, useState } from 'react';
import { BufferAttribute, BufferGeometry, Color, DoubleSide, type Group } from 'three';
import { useFrame } from '@react-three/fiber';
import {
  ANTARCTIC_CLAIMS, buildClaimIslandSurface, buildClaimSurface, buildClaimSectorSurface, buildClaimOutline, loadTerrainMesh,
  MODEL_MIN_PX, placeModelSize, project, screenPx, terrainSurfaceHeight,
  type ClaimId, type ClaimsCoverage, type TerrainMesh,
} from '@antartida/core';
import { buildBoxGeometry, vehicleMaterial } from '../voyage/vehicles.ts';
import { CLAIM_FLAG_MODELS } from './claimFlagModels.ts';
import type { ClaimsSelection, ClaimsStatus } from '../map/ClaimsControl.tsx';

function makeGeometry(positions: Float32Array): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

function ClaimFlag({ id, position, geometry }: {
  id: ClaimId; position: [number, number, number]; geometry: BufferGeometry;
}) {
  const group = useRef<Group>(null);
  useFrame(({ camera, size }) => {
    if (!group.current) return;
    const distance = camera.position.distanceTo(group.current.position);
    const height = placeModelSize(distance, .045, .4);
    group.current.scale.setScalar(height);
    // Keep the mast vertical and the national design legible from every camera azimuth.
    group.current.rotation.y = Math.atan2(camera.position.x - position[0], camera.position.z - position[2]);
    group.current.visible = screenPx(height, distance, size.height) >= MODEL_MIN_PX;
  });
  return (
    <group ref={group} name={`claim-flag-${id}`} position={position}>
      <mesh geometry={geometry} material={vehicleMaterial} raycast={() => {}} />
    </group>
  );
}

/** Only mounted on demand. Political claims are overlays, never replacements for base cartography. */
export function Claims3D({ wide, selection, coverage, onStatus }: {
  wide: boolean; selection: ClaimsSelection; coverage: ClaimsCoverage; onStatus: (status: ClaimsStatus) => void;
}) {
  const [terrain, setTerrain] = useState<TerrainMesh | null>(null);
  useEffect(() => {
    let alive = true;
    setTerrain(null);
    onStatus('loading');
    loadTerrainMesh(wide ? 'hi' : 'lo').then((mesh) => {
      if (alive) setTerrain(mesh);
    }).catch((error: unknown) => {
      if (!alive) return;
      onStatus('error');
      console.warn('Antarctic claims data unavailable', error);
    });
    return () => { alive = false; };
  }, [wide, onStatus]);

  const layers = useMemo(() => {
    if (!terrain) return [];
    return ANTARCTIC_CLAIMS.map((claim, index) => {
      // Tiny deterministic offsets prevent coincident surfaces in the overlapping claims.
      const lift = .22 + index * .08;
      const land = buildClaimSurface(terrain, claim.sectors, lift);
      // In land-only mode the coast is the coverage edge. With sea, only the sector
      // meridians remain edges over land; the coastline is internal to the overlay.
      if (coverage === 'land') land.outline = buildClaimOutline(land.positions);
      const parts = [land, ...claim.islands.map((island) => buildClaimIslandSurface(terrain, island, lift))];
      // Ocean is at -0.05 and land starts at 0. The sea sheet lies between them:
      // opaque terrain hides it, while the land sheet follows the actual relief.
      if (coverage === 'sectors') parts.unshift(buildClaimSectorSurface(claim.sectors, -.04 + index * .001));
      const geometries = parts.map((part) => ({ surface: makeGeometry(part.positions), outline: makeGeometry(part.outline) }));
      const flags = [...claim.sectors.map((sector) => sector.flag), ...claim.islands].flatMap(({ lon, lat }) => {
        const point = project(lon, lat);
        const height = terrainSurfaceHeight(terrain, point.x, point.y);
        return height === null ? [] : [[point.x - 500, height + lift, point.y - 500] as [number, number, number]];
      });
      return { claim, geometries, flags, borderColor: new Color(claim.color).multiplyScalar(.65), flagGeometry: buildBoxGeometry(CLAIM_FLAG_MODELS[claim.id]) };
    });
  }, [terrain, coverage]);

  useEffect(() => {
    if (layers.length) onStatus('ready');
    return () => {
      for (const layer of layers) {
        layer.flagGeometry.dispose();
        for (const geometry of layer.geometries) {
          geometry.surface.dispose(); geometry.outline.dispose();
        }
      }
    };
  }, [layers, onStatus]);

  return (
    <group name="antarctic-claims" userData={{ coverage }}>
      {layers.map(({ claim, geometries, flags, flagGeometry, borderColor }, index) => (
        <group key={claim.id} name={`claim-${claim.id}`} visible={selection === 'all' || selection === claim.id}>
          {geometries.map((geometry, part) => (
            <group key={part}>
              <mesh name={`claim-area-${claim.id}-${part}`} geometry={geometry.surface} renderOrder={80 + index} raycast={() => {}}>
                <meshBasicMaterial color={claim.color} transparent opacity={selection === 'all' ? .42 : .52}
                  depthWrite={false} side={DoubleSide} forceSinglePass />
              </mesh>
              <lineSegments name={`claim-border-${claim.id}-${part}`} geometry={geometry.outline} renderOrder={90 + index}
                onUpdate={(line) => line.computeLineDistances()} raycast={() => {}}>
                <lineDashedMaterial color={borderColor} dashSize={1} gapSize={2.5} transparent opacity={.95} depthWrite={false} />
              </lineSegments>
            </group>
          ))}
          {flags.map((position, i) => <ClaimFlag key={i} id={claim.id} position={position} geometry={flagGeometry} />)}
        </group>
      ))}
    </group>
  );
}
