import { describe, expect, it } from 'vitest';
import { POLY_MIN_COLORS, POLY_MIN_TRIS } from '../src/voyage/lowPoly.ts';
import { PUERTO_ARGENTINO_POLY } from '../src/voyage/puertoArgentinoModel.ts';
import { buildVehicleGeometry, VEHICLE_POLY_MODELS } from '../src/voyage/vehicles.ts';

describe('ARA Puerto Argentino low-poly model', () => {
  it('meets the low-poly detail floor', () => {
    expect(PUERTO_ARGENTINO_POLY.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(new Set(PUERTO_ARGENTINO_POLY.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
  });

  it('fits unit length along +x and rests on y >= 0', () => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [a, b, c] of PUERTO_ARGENTINO_POLY) {
      for (const [x, y] of [a, b, c]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    expect(minX).toBeCloseTo(-0.5, 4);
    expect(maxX).toBeCloseTo(0.5, 4);
    expect(minY).toBeGreaterThanOrEqual(0);
    expect(maxY).toBeGreaterThan(0.25);
  });

  it('registers in VEHICLE_POLY_MODELS and builds a finite BufferGeometry', () => {
    expect(VEHICLE_POLY_MODELS['puerto-argentino']).toBe(PUERTO_ARGENTINO_POLY);
    const geometry = buildVehicleGeometry('puerto-argentino');
    const pos = geometry.getAttribute('position');
    expect(pos.count).toBe(PUERTO_ARGENTINO_POLY.length * 3);
    for (let i = 0; i < pos.count; i++) {
      expect(Number.isFinite(pos.getX(i))).toBe(true);
      expect(Number.isFinite(pos.getY(i))).toBe(true);
      expect(Number.isFinite(pos.getZ(i))).toBe(true);
    }
    geometry.dispose();
  });
});
