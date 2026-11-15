import { useEffect, useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { MODEL_MIN_PX, heightAt, placeModelSize, screenPx, toWorld, worldHeight } from '@antartida/core';
import { buildPolyGeometry, resolveRelief, type Tri, type Vec3 } from '../voyage/lowPoly.ts';
import { vehicleMaterial } from '../voyage/vehicles.ts';

/** Close-up world width the ground skirt of a site is seated with. */
const SEAT_WIDTH = 2;
const FOUNDATION = 0.06;

const reliefAt = (wx: number, wz: number) => worldHeight(heightAt(wx + 500, wz + 500));

interface Seat {
  key: number;
  padY: number;
  floor: (wx: number, wz: number) => number;
}

export interface SiteOnReliefProps {
  /** Point of the map (0..1000 space) the site stands on. */
  point: { x: number; y: number };
  /** The miniature: about one unit wide, base at y = 0, ground faces in RELIEF_ROCK / RELIEF_ICE. */
  poly: readonly Tri[];
  /** Turn of the miniature round y, in radians (local +x goes to world (cos, -sin)). */
  heading: number;
  /** Width as a fraction of the camera distance up close, fixed beyond that (placeModelSize). */
  sizePerDistance: number;
  minSize: number;
  /**
   * Radius of the model (its own units) where the ground is flat at the highest relief under it,
   * and where it has blended back into the relief. Everything built has to stand inside the first.
   */
  flatRadius?: number;
  blendRadius?: number;
  reduced?: boolean;
  /** Not drawn at all, for example while a trip lands its own vehicle there. */
  hidden?: boolean;
}

/**
 * A low-poly maqueta of a place (a station, a base) set on the painted relief of the open map: its
 * ground is flattened to the highest relief under it and blends into the slopes round it, and its
 * faces take the colour of the relief, so only what is built stands out. Like the other place
 * models, it keeps its size on screen up close and shrinks with the distance (placeModelSize).
 */
export function SiteOnRelief({ point, poly, heading, sizePerDistance, minSize, flatRadius = 0.36, blendRadius = 0.58, reduced, hidden }: SiteOnReliefProps) {
  const group = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const seat = useRef<Seat | null>(null);

  const frame = useMemo(() => {
    const center = toWorld(point.x, point.y, 0);
    const PAD_R = flatRadius * SEAT_WIDTH;
    const EDGE = blendRadius * SEAT_WIDTH;
    const cos = Math.cos(heading);
    const sin = Math.sin(heading);
    // The relief loads late: these few samples change when it arrives, and the site is seated again.
    const sampleKey = () =>
      heightAt(point.x, point.y) +
      heightAt(point.x + PAD_R, point.y) +
      heightAt(point.x - PAD_R, point.y) +
      heightAt(point.x, point.y + PAD_R) +
      heightAt(point.x, point.y - PAD_R);
    const seatOf = (key: number): Seat => {
      const samples = [reliefAt(center.x, center.z)];
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        for (const r of [0.5, 1]) samples.push(reliefAt(center.x + Math.cos(a) * PAD_R * r, center.z + Math.sin(a) * PAD_R * r));
      }
      const padY = Math.max(...samples);
      return {
        key,
        padY,
        floor: (wx, wz) => {
          const r = Math.hypot(wx - center.x, wz - center.z);
          const t = Math.min(1, Math.max(0, (r - PAD_R) / Math.max(1e-6, EDGE - PAD_R)));
          return padY + (reliefAt(wx, wz) - padY) * t * t * (3 - 2 * t);
        },
      };
    };
    // Every corner goes onto the relief, then back to the model's own units round its centre.
    const seatedTris = (s: Seat): Tri[] => {
      const place = ([x, y, z]: Vec3): Vec3 => {
        const wx = center.x + (x * cos + z * sin) * SEAT_WIDTH;
        const wz = center.z + (-x * sin + z * cos) * SEAT_WIDTH;
        return [wx, y * SEAT_WIDTH + s.floor(wx, wz) - (y <= 0.0005 ? FOUNDATION : 0), wz];
      };
      const local = ([x, y, z]: Vec3): Vec3 => [(x - center.x) / SEAT_WIDTH, (y - s.padY) / SEAT_WIDTH, (z - center.z) / SEAT_WIDTH];
      return resolveRelief(poly.map(([a, b, c, col]) => [place(a), place(b), place(c), col])).map(([a, b, c, col]): Tri => [local(a), local(b), local(c), col]);
    };
    return { center, sampleKey, seatOf, seatedTris };
  }, [point.x, point.y, poly, heading, flatRadius, blendRadius]);

  useEffect(() => {
    const mesh = body.current;
    return () => mesh?.geometry.dispose();
  }, []);
  // Another place or model: seated again on the next frame.
  useEffect(() => {
    seat.current = null;
  }, [frame]);

  useFrame(({ camera, size, invalidate }) => {
    const g = group.current;
    const m = body.current;
    if (!g || !m) return;
    if (hidden) {
      g.visible = false;
      return;
    }

    const key = frame.sampleKey();
    if (seat.current?.key !== key) {
      seat.current = frame.seatOf(key);
      m.geometry.dispose();
      m.geometry = buildPolyGeometry(frame.seatedTris(seat.current));
      g.position.set(frame.center.x, seat.current.padY, frame.center.z);
    }

    const distance = camera.position.distanceTo(g.position);
    const siteSize = placeModelSize(distance, sizePerDistance, minSize);
    g.visible = screenPx(siteSize, distance, size.height) >= MODEL_MIN_PX;
    g.scale.setScalar(siteSize);

    if (!reduced && distance < 80) invalidate();
  });

  return (
    <group ref={group}>
      <mesh ref={body} material={vehicleMaterial} />
    </group>
  );
}
