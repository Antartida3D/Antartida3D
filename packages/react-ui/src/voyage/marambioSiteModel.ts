import {
  DIORAMA_METERS_PER_UNIT,
  HERCULES_LENGTH_M,
  MARAMBIO_ELEMENTS,
  MARAMBIO_HERCULES,
  MARAMBIO_POINT,
  MARAMBIO_RUNWAY_BEARING_DEG,
  MARAMBIO_RUNWAY_Z,
  MARAMBIO_TAXIWAY,
  marambioLayoutOf,
  project,
  unproject,
} from '@antartida/core';
import { VOXEL_PALETTE } from '../orcadas/stationModels.ts';
import { HERCULES_PARKED_POLY } from './herculesModel.ts';
import { block, extrude, groundField, lathe, prism, quad, RELIEF_ICE, RELIEF_ROCK, rect, scaled, shift, turn, type Tri } from './lowPoly.ts';
import { buildMiniModule, buildMiniRadioTower } from './orcadasSiteModel.ts';

const { BLACK, ORANGE, RED, RED_DARK, WHITE, WINDOW_DAY, ZINC } = VOXEL_PALETTE;

/** Graded gravel of the runway and the taxiway, darker than the pale relief round them so they read on the map. */
const RUNWAY_GRAVEL = 0x7d766c;
const TAXIWAY_GRAVEL = 0x8a8378;
/** Pale pad of the apron. */
const APRON_PAD = 0xc2bfb7;
/** Fluorescent orange of the pallets and edge markers of the runway. */
const MARKER_ORANGE = 0xff7a1a;
/** Dark open doorway of the hangar. */
const HANGAR_DOOR = 0x2b333b;
/** Tinted glass of the control tower cab. */
const TOWER_GLASS = 0x34495a;

/**
 * Model units per stage unit of the diorama (marambio-layout.ts): the maqueta is the same base as
 * the diorama, every element in the same place and with the same bearing, only smaller.
 */
const K = 1 / 60;
/** Stage point that becomes the centre of the maqueta. */
const CX = 1.5;
const CZ = 10.5;
/** Heights are drawn this many times taller than the plans would give, so the base reads from afar. */
const HEIGHT_EXAGGERATION = 2.2;

/** Height of the flat top of the plateau over the edge of the model. */
const PLATEAU_Y = 0.03;
/** Everything built stands a hair into the ground, so nothing floats. */
const BASE_Y = PLATEAU_Y - 0.002;

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Stage x/z of the diorama to the maqueta's own x/z. */
const local = (sx: number, sz: number): [number, number] => [(sx - CX) * K, (sz - CZ) * K];

/**
 * Turn of the maqueta on the map so its runway follows the bearing of the real one: local +x goes
 * along the runway to the north-east and local +z to the south-east, the side the base stands on.
 */
export const MARAMBIO_SITE_HEADING: number = (() => {
  const { lon, lat } = unproject(MARAMBIO_POINT.x, MARAMBIO_POINT.y);
  const b = (MARAMBIO_RUNWAY_BEARING_DEG * Math.PI) / 180;
  const e = 1e-3;
  const p = project(lon, lat);
  const q = project(lon + (Math.sin(b) * e) / Math.cos((lat * Math.PI) / 180), lat + Math.cos(b) * e);
  return Math.atan2(-(q.y - p.y), q.x - p.x);
})();

/** Ground cells of the plateau, and where it is flat: everything stands inside that. */
const COLS = 18;
const ROWS = 15;
const CELL = 0.078;
/** The plateau is flat out to this part of the model (a rounded square), then falls to its edge. */
const FLAT = 0.92;
const HALF_W = (COLS * CELL) / 2;
const HALF_D = (ROWS * CELL) / 2;

/** Rounded-square distance from the centre, 1 at the edge of the model. */
const edgeOf = (u: number, v: number) => (u ** 4 + v ** 4) ** 0.25;

/** Whether a point of the maqueta (local x/z) is on the flat top of the plateau. */
export const onMarambioSiteFlat = (x: number, z: number) => edgeOf(x / HALF_W, z / HALF_D) <= FLAT;

function buildPlateau(): Tri[] {
  return groundField(
    COLS,
    ROWS,
    CELL,
    6914,
    (u, v, noise) => {
      const edge = edgeOf(u, v);
      if (edge <= FLAT) return PLATEAU_Y;
      const rough = edge + (noise - 0.5) * 0.1;
      if (rough > 1) return null;
      return PLATEAU_Y * smooth(1, FLAT, rough);
    },
    // Bare permafrost with a few patches of snow, as in summer; the slopes are rock.
    (_u, _v, h, steep, noise) => (steep < 0.2 && h > PLATEAU_Y * 0.9 && noise > 0.9 ? RELIEF_ICE : RELIEF_ROCK),
    0
  );
}

/** A flat strip along a polyline of local x/z, at a small height over the ground. */
function strip(points: readonly (readonly [number, number])[], width: number, y: number, color: number): Tri[] {
  const out: Tri[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    const l = Math.hypot(bx - ax, bz - az);
    const nx = (-(bz - az) / l) * (width / 2);
    const nz = ((bx - ax) / l) * (width / 2);
    // Each piece runs a half width past its ends, so the joints have no gaps.
    const ex = ((bx - ax) / l) * (width / 2);
    const ez = ((bz - az) / l) * (width / 2);
    out.push(...quad([ax - ex + nx, y, az - ez + nz], [bx + ex + nx, y, bz + ez + nz], [bx + ex - nx, y, bz + ez - nz], [ax - ex - nx, y, az - ez - nz], color));
  }
  // Seen from above, whatever the direction of the polyline.
  return out.map((t) => (t[1][2] - t[0][2]) * (t[2][0] - t[0][0]) - (t[1][0] - t[0][0]) * (t[2][2] - t[0][2]) > 0 ? t : [t[0], t[2], t[1], t[3]]);
}

/** Half length of the stretch of runway drawn, inside the flat top. */
const RUNWAY_HALF = 0.5;
/** Drawn narrower than the plans give (40 m would be a road), so it reads as a runway. */
const RUNWAY_WIDTH = 0.085;
const RUNWAY_Z = local(0, MARAMBIO_RUNWAY_Z)[1];

function buildRunway(): Tri[] {
  const y = BASE_Y + 0.003;
  const out: Tri[] = [...prism(rect(0, RUNWAY_Z, RUNWAY_HALF * 2, RUNWAY_WIDTH), BASE_Y, y, RUNWAY_GRAVEL)];
  // Orange pallets across both ends, small markers along both edges; no painted centreline.
  for (const end of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      out.push(...block(end * (RUNWAY_HALF - 0.012), y + 0.003, RUNWAY_Z + (k - 2) * 0.017, 0.01, 0.006, 0.01, MARKER_ORANGE));
    }
  }
  for (let x = -RUNWAY_HALF + 0.06; x < RUNWAY_HALF - 0.04; x += 0.08) {
    for (const side of [-1, 1]) out.push(...block(x, y + 0.003, RUNWAY_Z + side * (RUNWAY_WIDTH / 2 - 0.004), 0.007, 0.006, 0.007, MARKER_ORANGE));
  }
  return out;
}

function buildTaxiwayAndApron(): Tri[] {
  const taxiway = strip(MARAMBIO_TAXIWAY.map(([x, z]) => local(x, z)), 0.03, PLATEAU_Y + 0.0015, TAXIWAY_GRAVEL);
  const apron = marambioLayoutOf('apron');
  const [ax, az] = local(apron.position[0], apron.position[2]);
  const pad = shift(turn(prism(rect(0, 0, apron.footprint[0] * K, apron.footprint[1] * K), -0.004, 0.004, APRON_PAD), apron.rotationY), ax, BASE_Y, az);
  return [...taxiway, ...pad];
}

/** Arched hangar on a low kerb, long side along x, its open door at the +x end. */
function buildMiniHangar(length: number, width: number, height: number): Tri[] {
  const kerb = height * 0.12;
  const segments = 10;
  const arch = Array.from({ length: segments + 1 }, (_, i): [number, number] => {
    const a = (i / segments) * Math.PI;
    return [(Math.cos(a) * width) / 2, Math.sin(a) * (height - kerb)];
  });
  const out: Tri[] = [
    ...prism(rect(0, 0, length + 0.006, width + 0.006), 0, kerb, ZINC),
    ...shift(extrude(arch, -length / 2, length / 2, ORANGE, RED), 0, kerb, 0),
  ];
  // Dark ribs across the vault.
  for (let k = 1; k < 5; k++) {
    const x = -length / 2 + (k * length) / 5;
    for (let i = 0; i < segments; i++) {
      const [z0, y0] = arch[i];
      const [z1, y1] = arch[i + 1];
      out.push(...quad([x + 0.002, kerb + y0 * 1.01, z0 * 1.01], [x + 0.002, kerb + y1 * 1.01, z1 * 1.01], [x - 0.002, kerb + y1 * 1.01, z1 * 1.01], [x - 0.002, kerb + y0 * 1.01, z0 * 1.01], RED_DARK));
    }
  }
  // The open door and a white band over it, where the real one reads MARAMBIO.
  const doorH = (height - kerb) * 0.62;
  out.push(
    ...block(length / 2 + 0.002, kerb + doorH / 2, 0, 0.004, doorH, width * 0.62, HANGAR_DOOR),
    ...block(length / 2 + 0.002, kerb + doorH + 0.008, 0, 0.004, 0.008, width * 0.46, WHITE)
  );
  return out;
}

/** Red cylinder of the control tower with its glazed cab, white balcony and antenna. */
function buildMiniControlTower(height: number): Tri[] {
  const r = 0.011;
  return [
    ...lathe(0, 0, [[0, r], [height * 0.78, r]], 8, RED),
    ...lathe(0, 0, [[height * 0.78, r * 1.75], [height * 0.8, r * 1.75]], 8, WHITE),
    ...lathe(0, 0, [[height * 0.8, r * 1.45], [height * 0.93, r * 1.6]], 8, (i) => (i % 2 ? TOWER_GLASS : WINDOW_DAY)),
    ...lathe(0, 0, [[height * 0.93, r * 1.75], [height * 0.97, r * 0.5], [height * 1.12, 0]], 8, BLACK),
  ];
}

/** An element of the layout placed in the maqueta: its local tris turned and moved to its place. */
const placed = (id: string, tris: readonly Tri[]): Tri[] => {
  const { position, rotationY } = marambioLayoutOf(id);
  const [x, z] = local(position[0], position[2]);
  return shift(turn(tris, rotationY), x, BASE_Y, z);
};

const heightOf = (meters: number) => (meters / DIORAMA_METERS_PER_UNIT) * K * HEIGHT_EXAGGERATION;

export const MARAMBIO_SITE_PARTS = (() => {
  const ground = buildPlateau();
  const runway = buildRunway();
  const apron = buildTaxiwayAndApron();

  const hangarEntry = marambioLayoutOf('hangar');
  const hangar = placed('hangar', buildMiniHangar(hangarEntry.footprint[0] * K, hangarEntry.footprint[1] * K, heightOf(10)));

  // The terminal module with the control tower at its -x end (from a photo; see the diorama).
  const terminalEntry = marambioLayoutOf('terminal');
  const [tl, tw] = [terminalEntry.footprint[0] * K, terminalEntry.footprint[1] * K];
  const terminal = placed('terminal', [
    ...buildMiniModule(0, 0, 0, 0, tl, tw, heightOf(4.5), 'gabled'),
    ...shift(buildMiniControlTower(heightOf(12)), -tl / 2 - 0.006, 0, 0),
  ]);

  // The communication tower, at half the size of the Orcadas one so its footing fits beside the stores.
  const commTower = placed('commTower', scaled(buildMiniRadioTower(0, 0, 0, heightOf(24) / 0.5), 0.5));

  const modules: Tri[] = [];
  for (const e of MARAMBIO_ELEMENTS) {
    if (e.kind !== 'module') continue;
    const { footprint } = marambioLayoutOf(e.id);
    modules.push(...placed(e.id, buildMiniModule(0, 0, 0, 0, footprint[0] * K, footprint[1] * K, heightOf(e.heightM), 'gabled')));
  }

  // The C-130 on the apron, at the scale of the plans like everything else.
  const [hx, hz] = local(MARAMBIO_HERCULES.position[0], MARAMBIO_HERCULES.position[2]);
  const hercules = shift(turn(scaled(HERCULES_PARKED_POLY, (HERCULES_LENGTH_M / DIORAMA_METERS_PER_UNIT) * K), MARAMBIO_HERCULES.rotationY), hx, BASE_Y + 0.004, hz);

  return { ground, runway, apron, hangar, terminal, commTower, modules, hercules };
})();

/**
 * Low-poly maqueta of Base Marambio for the open map (about 1.4 wide, base at y = 0): the same base
 * as the diorama, smaller. On a plateau of bare ground with patches of snow, the runway along its
 * north-west side, the taxiway down to the apron with the C-130 and the hangar, the terminal with
 * its control tower, the stores, the communication tower and the row of buildings. Illustration:
 * heights are exaggerated and only a stretch of the runway is drawn.
 */
export const MARAMBIO_SITE_POLY: Tri[] = Object.values(MARAMBIO_SITE_PARTS).flat();

/** Local x/z of the centre of an element of the layout in the maqueta (for tests). */
export const marambioSiteXZ = (id: string): [number, number] => {
  const { position } = marambioLayoutOf(id);
  return local(position[0], position[2]);
};
export const MARAMBIO_SITE_SCALE = K;
/**
 * Radius (model units) round the centre that SiteOnRelief keeps flat: it reaches the corners of the
 * flat top of the plateau, so the runway at its far side does not sink into the relief.
 */
export const MARAMBIO_SITE_FLAT_RADIUS = Math.hypot(HALF_W, HALF_D) * FLAT;
export const MARAMBIO_SITE_PLATEAU_Y = PLATEAU_Y;
