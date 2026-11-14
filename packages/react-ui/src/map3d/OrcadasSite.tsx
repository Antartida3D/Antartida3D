import { useEffect, useRef } from 'react';
import type { Group, Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import {
  MODEL_MIN_PX,
  ORCADAS_POINT,
  heightAt,
  placeModelSize,
  screenPx,
  toWorld,
  worldHeight,
} from '@antartida/core';
import { buildPolyGeometry, resolveRelief, type Tri, type Vec3 } from '../voyage/lowPoly.ts';
import { ORCADAS_SITE_POLY } from '../voyage/orcadasSiteModel.ts';
import { vehicleMaterial } from '../voyage/vehicles.ts';

export const buildOrcadasSiteGeometry = () => buildPolyGeometry(resolveRelief(ORCADAS_SITE_POLY));

/** Width as a fraction of the camera distance up close, fixed beyond that (placeModelSize). */
const SIZE_PER_DISTANCE = 0.028;
const MIN_SIZE = 0.2;

/** Close-up world width and orientation used to seat the ground skirt onto the relief. */
const SEAT_WIDTH = 2;
const HEADING = 0.25;
const PAD_R = 0.36 * SEAT_WIDTH;
const EDGE = 0.58 * SEAT_WIDTH;
const FOUNDATION = 0.06;

const CENTER = toWorld(ORCADAS_POINT.x, ORCADAS_POINT.y, 0);
const COS_H = Math.cos(HEADING);
const SIN_H = Math.sin(HEADING);

interface Seat {
  key: number;
  padY: number;
  floor: (wx: number, wz: number) => number;
}

const reliefAt = (wx: number, wz: number) => worldHeight(heightAt(wx + 500, wz + 500));

function terrainSampleKey(): number {
  return (
    heightAt(ORCADAS_POINT.x, ORCADAS_POINT.y) +
    heightAt(ORCADAS_POINT.x + PAD_R, ORCADAS_POINT.y) +
    heightAt(ORCADAS_POINT.x - PAD_R, ORCADAS_POINT.y) +
    heightAt(ORCADAS_POINT.x, ORCADAS_POINT.y + PAD_R) +
    heightAt(ORCADAS_POINT.x, ORCADAS_POINT.y - PAD_R)
  );
}

/** Local relief seating matching PointModels.tsx so the isthmus neither floats nor sinks. */
function seatOf(key: number): Seat {
  const samples = [reliefAt(CENTER.x, CENTER.z)];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    for (const r of [0.5, 1]) {
      samples.push(reliefAt(CENTER.x + Math.cos(a) * PAD_R * r, CENTER.z + Math.sin(a) * PAD_R * r));
    }
  }
  const padY = Math.max(...samples);
  return {
    key,
    padY,
    floor: (wx, wz) => {
      const r = Math.hypot(wx - CENTER.x, wz - CENTER.z);
      const t = Math.min(1, Math.max(0, (r - PAD_R) / Math.max(1e-6, EDGE - PAD_R)));
      return padY + (reliefAt(wx, wz) - padY) * t * t * (3 - 2 * t);
    },
  };
}

function seatLocalTris(seat: Seat): Tri[] {
  const place = ([x, y, z]: Vec3): Vec3 => {
    const wx = CENTER.x + (x * COS_H + z * SIN_H) * SEAT_WIDTH;
    const wz = CENTER.z + (-x * SIN_H + z * COS_H) * SEAT_WIDTH;
    return [wx, y * SEAT_WIDTH + seat.floor(wx, wz) - (y <= 0.0005 ? FOUNDATION : 0), wz];
  };
  return resolveRelief(ORCADAS_SITE_POLY.map(([a, b, c, col]) => [place(a), place(b), place(c), col])).map(
    ([a, b, c, col]): Tri => [
      [(a[0] - CENTER.x) / SEAT_WIDTH, (a[1] - seat.padY) / SEAT_WIDTH, (a[2] - CENTER.z) / SEAT_WIDTH],
      [(b[0] - CENTER.x) / SEAT_WIDTH, (b[1] - seat.padY) / SEAT_WIDTH, (b[2] - CENTER.z) / SEAT_WIDTH],
      [(c[0] - CENTER.x) / SEAT_WIDTH, (c[1] - seat.padY) / SEAT_WIDTH, (c[2] - CENTER.z) / SEAT_WIDTH],
      col,
    ],
  );
}

/**
 * Low-poly maqueta of Estación Orcadas on Laurie Island, seated on the ground relief
 * without covering or interfering with the HTML map marker.
 */
export function OrcadasSite({ reduced }: { reduced?: boolean }) {
  const group = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const seat = useRef<Seat | null>(null);

  useEffect(() => {
    const mesh = body.current;
    return () => mesh?.geometry.dispose();
  }, []);

  useFrame(({ camera, size, invalidate }) => {
    const g = group.current;
    const m = body.current;
    if (!g || !m) return;

    const key = terrainSampleKey();
    if (seat.current?.key !== key) {
      seat.current = seatOf(key);
      m.geometry.dispose();
      m.geometry = buildPolyGeometry(seatLocalTris(seat.current));
      g.position.set(CENTER.x, seat.current.padY, CENTER.z);
    }

    const distance = camera.position.distanceTo(g.position);
    const siteSize = placeModelSize(distance, SIZE_PER_DISTANCE, MIN_SIZE);
    g.visible = screenPx(siteSize, distance, size.height) >= MODEL_MIN_PX;
    g.scale.setScalar(siteSize);

    if (!reduced && distance < 80) {
      invalidate();
    }
  });

  return (
    <group ref={group}>
      <mesh ref={body} material={vehicleMaterial} />
    </group>
  );
}
