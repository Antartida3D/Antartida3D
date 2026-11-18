import { useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { buildPolyGeometry, type Vec3 } from '../voyage/lowPoly.ts';
import { flagCloth, flagSwing, type PointFlag } from '../voyage/pointModels.ts';
import { vehicleMaterial } from '../voyage/vehicles.ts';
import { sceneShade } from './PointScene3D.tsx';

/**
 * The flags of a map model (pointModels.ts) in a scene, at its scale `k` with its base at `at`
 * (sceneGround atScene): each cloth swings like on the map (flagSwing). With reduced motion they hang still.
 */
export function SceneFlags({ flags, k, at, reduced }: { flags: readonly PointFlag[]; k: number; at: Vec3; reduced: boolean }) {
  const geometries = useMemo(() => flags.map((f) => buildPolyGeometry(flagCloth({ ...f, top: [0, 0, 0] }), sceneShade)), [flags]);
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);
  const groups = useRef<(Group | null)[]>([]);
  const invalidate = useThree((s) => s.invalidate);
  useFrame(({ clock }) => {
    if (reduced) return;
    groups.current.forEach((g, i) => g && (g.rotation.y = flagSwing(i, clock.elapsedTime)));
    if (!document.hidden) invalidate();
  });
  return (
    <group position={at as [number, number, number]} scale={k}>
      {flags.map((f, i) => (
        <group key={i} position={f.top as [number, number, number]} ref={(g) => void (groups.current[i] = g)}>
          <mesh geometry={geometries[i]} material={vehicleMaterial} />
        </group>
      ))}
    </group>
  );
}
