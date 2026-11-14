import { block, loftAlongX, mirrorZ, normalOf, shift, type LoftStation, type Tri, type Vec3 } from './lowPoly.ts';

/**
 * C-130H Hercules of the Argentine Air Force, low-poly (rule 30): nose to +x, y up, one unit is the
 * length of the aircraft. An illustration, not a measured model: the proportions follow the real
 * aircraft loosely and the flag on the fin is larger than the real one so it reads on screen.
 */

// Approximate livery, from photos: green and sand camouflage over a light grey belly.
const CAMO_GREEN = 0x55603f;
const CAMO_SAND = 0xa7845f;
const BELLY_GREY = 0xaab2b4;
const PLANE_DARK = 0x6f787e;
// Same values as BLACK in vehicles.ts and SKY and WHITE in sightingModels.ts: both import this
// file, directly or through vehicles.ts, so they cannot be imported here.
const BLACK = 0x1f2a36;
const FLAG_SKY = 0x7fb6dc;
const FLAG_WHITE = 0xf7fafb;

/** Wingspan in model units: the wing is wider than the aircraft is long. */
export const HERCULES_SPAN = 1.356;
const HALF_SPAN = HERCULES_SPAN / 2;

type Ring = readonly Vec3[];

const centroid = (ring: Ring): Vec3 => {
  const sum = ring.reduce<[number, number, number]>((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]);
  return [sum[0] / ring.length, sum[1] / ring.length, sum[2] / ring.length];
};

/** The face wound so that it looks away from `inside`. */
function facingOut(a: Vec3, b: Vec3, c: Vec3, color: number, inside: Vec3): Tri {
  const n = normalOf([a, b, c, color]);
  const out = n[0] * (a[0] + b[0] + c[0] - 3 * inside[0]) + n[1] * (a[1] + b[1] + c[1] - 3 * inside[1]) + n[2] * (a[2] + b[2] + c[2] - 3 * inside[2]);
  return out < 0 ? [a, c, b, color] : [a, b, c, color];
}

/**
 * A skin over convex rings of the same number of points set in any direction (a wing along z, a fin
 * along y): loftAlongX only runs along x. Each face is wound away from the middle of its band, so
 * the order of the points in a ring does not matter. An end is closed only when its color is given.
 */
function skin(rings: readonly Ring[], colorAt: (band: number, seg: number) => number, startCap?: number, endCap?: number): Tri[] {
  const out: Tri[] = [];
  const n = rings[0].length;
  const centers = rings.map(centroid);
  for (let k = 0; k < rings.length - 1; k++) {
    const inside: Vec3 = [(centers[k][0] + centers[k + 1][0]) / 2, (centers[k][1] + centers[k + 1][1]) / 2, (centers[k][2] + centers[k + 1][2]) / 2];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const color = colorAt(k, i);
      out.push(facingOut(rings[k][i], rings[k][j], rings[k + 1][j], color, inside), facingOut(rings[k][i], rings[k + 1][j], rings[k + 1][i], color, inside));
    }
  }
  const cap = (k: number, neighbour: number, color: number) => {
    for (let i = 0; i < n; i++) out.push(facingOut(centers[k], rings[k][i], rings[k][(i + 1) % n], color, centers[neighbour]));
  };
  if (startCap !== undefined) cap(0, 1, startCap);
  if (endCap !== undefined) cap(rings.length - 1, rings.length - 2, endCap);
  return out;
}

/**
 * A ring of `n` points [z, y] for loftAlongX, counter-clockwise seen from +x. It starts just past
 * the bottom, so the ring has a flat keel and a flat crown and segment i mirrors segment n - 2 - i.
 */
const ringZY = (cz: number, cy: number, rz: number, ry: number, n: number): [number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + Math.PI / n + (i / n) * Math.PI * 2;
    return [cz + Math.cos(a) * rz, cy + Math.sin(a) * ry];
  });

// Fuselage: twelve-sided sections along x, tail to nose. The axis is y = 0; the nose droops under
// it and the rear rises to the tail (the cargo ramp).
const FUSELAGE_SIDES = 12;
/** [x, center y, half width, half height]. */
const FUSELAGE_STATIONS: readonly (readonly [number, number, number, number])[] = [
  [-0.5, 0.06, 0.006, 0.007],
  [-0.47, 0.055, 0.018, 0.017],
  [-0.4, 0.042, 0.04, 0.032],
  [-0.3, 0.022, 0.062, 0.053],
  [-0.2, 0.004, 0.071, 0.071],
  [-0.1, 0, 0.072, 0.075],
  [-0.02, 0, 0.072, 0.075],
  [0.06, 0, 0.072, 0.075],
  [0.13, 0, 0.072, 0.075],
  [0.2, 0, 0.072, 0.075],
  [0.27, 0, 0.072, 0.075],
  [0.34, 0, 0.072, 0.075],
  [0.385, -0.003, 0.069, 0.071],
  [0.425, -0.014, 0.06, 0.058],
  [0.46, -0.024, 0.046, 0.044],
  [0.485, -0.027, 0.032, 0.03],
  [0.5, -0.028, 0.012, 0.012],
];
// Segments of a fuselage ring: 11 is the keel, 0-1 and 9-10 the lower sides, 2 and 8 the walls,
// 3-4 and 6-7 the shoulders, 5 the crown.
const FUSELAGE_BELLY = [11, 0, 1, 9, 10];
/** First band (between station k and k + 1) of the radome. */
const RADOME_BAND = 14;
/** Glass of the cockpit: the windscreen band round the shoulders and the crown, and the side panes behind it. */
const GLASS: Readonly<Record<number, readonly number[]>> = { 12: [3, 4, 5, 6, 7], 11: [3, 7] };
/** Sand patches of the camouflage, by band: the segments they cover. Not the same on both sides, as on the aircraft. */
const FUSELAGE_SAND: Readonly<Record<number, readonly number[]>> = {
  2: [3, 4, 5, 6],
  3: [2, 3, 4],
  5: [5, 6, 7, 8],
  6: [6, 7, 8],
  7: [8],
  9: [2, 3],
  10: [2, 3, 4, 5],
};

function fuselage(): Tri[] {
  const stations: LoftStation[] = FUSELAGE_STATIONS.map(([x, cy, rz, ry]) => ({ x, ring: ringZY(0, cy, rz, ry, FUSELAGE_SIDES) }));
  return loftAlongX(
    stations,
    (band, seg) => {
      if (band >= RADOME_BAND) return BLACK;
      if (GLASS[band]?.includes(seg)) return BLACK;
      if (FUSELAGE_BELLY.includes(seg)) return BELLY_GREY;
      return FUSELAGE_SAND[band]?.includes(seg) ? CAMO_SAND : CAMO_GREEN;
    },
    CAMO_GREEN,
    BLACK,
  );
}

// Six-sided rings (ringZY): 5 is the bottom, 0 and 4 the lower sides, 1 and 3 the upper sides, 2 the top.
const HEX_LOWER = [0, 4, 5];

/** Main landing-gear fairing low on the +z side of the fuselage, sunk into it. */
function sponson(): Tri[] {
  const at = (x: number, k: number): LoftStation => ({ x, ring: ringZY(0.076, -0.048, 0.024 * k, 0.03 * k, 6) });
  return loftAlongX(
    [at(-0.15, 0.15), at(-0.1, 0.8), at(-0.04, 1), at(0.08, 1), at(0.13, 0.8), at(0.17, 0.15)],
    (_band, seg) => (HEX_LOWER.includes(seg) ? BELLY_GREY : CAMO_GREEN),
    BELLY_GREY,
    BELLY_GREY,
  );
}

/**
 * Six-point section of a wing, tailplane or fin: leading edge, the thickest point at a quarter of
 * the chord, a thinner one at 60 % and the trailing edge. `place(x, across)` sets it in space.
 * Segments: 0-2 one face from the leading to the trailing edge, 3-5 the other face coming back.
 * The second face is flatter (the underside of a wing) unless the section is `symmetric` (a fin).
 */
function airfoil(leading: number, chord: number, thickness: number, place: (x: number, across: number) => Vec3, symmetric = false): Ring {
  const h = thickness / 2;
  return [
    place(leading, 0),
    place(leading - chord * 0.25, h),
    place(leading - chord * 0.6, h * 0.8),
    place(leading - chord, 0),
    place(leading - chord * 0.6, -h * (symmetric ? 0.8 : 0.6)),
    place(leading - chord * 0.25, -h),
  ];
}
const AIRFOIL_UPPER = [0, 1, 2];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Wing: straight, on top of the fuselage. The centre section keeps its chord out to WING_TAPER_Z and
// the outer panel narrows to the tip; a slight dihedral lifts the tips.
const WING_Y = 0.068;
const WING_DIHEDRAL = 0.025;
const WING_TAPER_Z = 0.3;
const WING_Z = [0, 0.1, 0.2, WING_TAPER_Z, 0.4, 0.5, 0.6, HALF_SPAN];
/** Height of the middle of the wing at this distance from the fuselage axis. */
const wingY = (z: number) => WING_Y + WING_DIHEDRAL * (z / HALF_SPAN);
/** Sand patches on top of each half wing, by band from the root: the segments they cover. */
const WING_SAND: Readonly<Record<1 | -1, Readonly<Record<number, readonly number[]>>>> = {
  1: { 2: [0], 3: [0, 1, 2], 4: [1, 2] },
  [-1]: { 1: [1, 2], 2: [2], 5: [0, 1, 2], 6: [0, 1] },
};

/** The +z half of the wing; the caller mirrors the one of `side` -1, so each side has its own patches. */
function halfWing(side: 1 | -1): Tri[] {
  const rings = WING_Z.map((z) => {
    const t = Math.max(0, (z - WING_TAPER_Z) / (HALF_SPAN - WING_TAPER_Z));
    const y = wingY(z);
    return airfoil(lerp(0.145, 0.138, t), lerp(0.164, 0.085, t), lerp(0.03, 0.026, Math.min(1, z / WING_TAPER_Z)) * lerp(1, 0.46, t), (x, up) => [x, y + up, z]);
  });
  // No cap at the root: the two halves meet there, inside the fuselage.
  return skin(rings, (band, seg) => (AIRFOIL_UPPER.includes(seg) ? (WING_SAND[side][band]?.includes(seg) ? CAMO_SAND : CAMO_GREEN) : BELLY_GREY), undefined, CAMO_GREEN);
}

// Tailplane: at the fuselage, under the fin (not a T-tail).
const TAILPLANE_Y = 0.058;
const TAILPLANE_HALF_SPAN = 0.268;
const TAILPLANE_SAND: Readonly<Record<1 | -1, number>> = { 1: 1, [-1]: 2 };

function halfTailplane(side: 1 | -1): Tri[] {
  const rings = [0, 1 / 3, 2 / 3, 1].map((t) => airfoil(lerp(-0.35, -0.4, t), lerp(0.135, 0.065, t), lerp(0.012, 0.006, t), (x, up) => [x, TAILPLANE_Y + up, t * TAILPLANE_HALF_SPAN]));
  return skin(rings, (band, seg) => (AIRFOIL_UPPER.includes(seg) ? (band === TAILPLANE_SAND[side] ? CAMO_SAND : CAMO_GREEN) : BELLY_GREY), undefined, CAMO_GREEN);
}

// Fin: tall, with its foot sunk in the rear fuselage. The heights are set so that three thin bands
// make the flag (light blue, white, light blue) on the middle of the chord, on both sides.
const FIN_FOOT = 0.055;
const FIN_TOP = 0.29;
const FIN_Y = [FIN_FOOT, 0.12, 0.185, 0.203, 0.221, 0.239, FIN_TOP];
const FLAG_BANDS = [FLAG_SKY, FLAG_WHITE, FLAG_SKY];
const FLAG_FIRST_BAND = 2;
/** Segments of the middle of the chord on each side of the fin. */
const FIN_MID = [1, 4];
/** Segments of the rear of the fin (the rudder) on each side. */
const FIN_REAR = [2, 3];

function fin(): Tri[] {
  const rings = FIN_Y.map((y) => {
    const t = (y - FIN_FOOT) / (FIN_TOP - FIN_FOOT);
    const leading = lerp(-0.3, -0.405, t);
    return airfoil(leading, leading - lerp(-0.497, -0.487, t), lerp(0.02, 0.01, t), (x, across) => [x, y, across], true);
  });
  return skin(
    rings,
    (band, seg) => {
      const stripe = FLAG_BANDS[band - FLAG_FIRST_BAND];
      if (stripe !== undefined && FIN_MID.includes(seg)) return stripe;
      return band < 2 && FIN_REAR.includes(seg) ? CAMO_SAND : CAMO_GREEN;
    },
    CAMO_GREEN,
    CAMO_GREEN,
  );
}

// Engines: four turboprops slung under the wing, well ahead of its leading edge.
const ENGINE_Z = [0.165, 0.345];
const NACELLE_RADIUS = 0.022;
/** How far under the middle of the wing the axis of an engine runs: the top of the nacelle is inside the wing. */
const NACELLE_DROP = 0.023;
const PROPELLER_X = 0.236;
const PROPELLER_RADIUS = 0.069;
const BLADE_CHORD = 0.013;
const BLADE_THICKNESS = 0.004;
/** First band of the spinner in the nacelle loft. */
const SPINNER_BAND = 4;

/** Nacelle, spinner and four-blade propeller of the engine at +z. */
function engine(z: number): Tri[] {
  const y = wingY(z) - NACELLE_DROP;
  const at = (x: number, r: number, lift = 0): LoftStation => ({ x, ring: ringZY(z, y + lift, r, r, 8) });
  const nacelle = loftAlongX(
    // The tail of the nacelle rises into the underside of the wing.
    [at(-0.01, 0.006, 0.012), at(0.05, 0.02, 0.002), at(0.14, NACELLE_RADIUS), at(0.205, 0.021), at(0.222, 0.015), at(0.238, 0.009), at(0.252, 0.002)],
    (band) => (band >= SPINNER_BAND ? BLACK : PLANE_DARK),
    PLANE_DARK,
    BLACK,
  );
  // Each blade starts inside the spinner.
  const reach = PROPELLER_RADIUS / 2 + 0.002;
  const length = PROPELLER_RADIUS - 0.004;
  const blades = [-1, 1].flatMap((s) => [
    ...block(PROPELLER_X, y + s * reach, z, BLADE_THICKNESS, length, BLADE_CHORD, BLACK),
    ...block(PROPELLER_X, y, z + s * reach, BLADE_THICKNESS, BLADE_CHORD, length, BLACK),
  ]);
  return [...nacelle, ...blades];
}

// External fuel tank between the two engines of each wing, on a short pylon.
const TANK_Z = 0.255;

function fuelTank(): Tri[] {
  const y = wingY(TANK_Z) - 0.034;
  const at = (x: number, r: number): LoftStation => ({ x, ring: ringZY(TANK_Z, y, r, r, 6) });
  return [
    ...loftAlongX([at(0, 0.003), at(0.04, 0.014), at(0.09, 0.016), at(0.14, 0.013), at(0.17, 0.003)], (_band, seg) => (HEX_LOWER.includes(seg) ? BELLY_GREY : CAMO_GREEN), BELLY_GREY, CAMO_GREEN),
    // The pylon runs from inside the tank to inside the wing.
    ...block(0.075, wingY(TANK_Z) - 0.015, TANK_Z, 0.05, 0.024, 0.006, CAMO_GREEN),
  ];
}

// Landing gear: the wheels stand on GROUND_Y, under the fuselage axis, and their tops stay inside the
// nose and the sponsons, as on the aircraft, where little more than half a wheel shows.
const GROUND_Y = -0.096;
const NOSE_WHEEL_RADIUS = 0.0165;
const MAIN_WHEEL_RADIUS = 0.024;

/** A wheel on an axle along z, resting on GROUND_Y. */
function wheel(x: number, z: number, radius: number, halfWidth: number): Tri[] {
  const ring = (wz: number): Ring =>
    Array.from({ length: 8 }, (_, i): Vec3 => {
      const a = -Math.PI / 2 + (i / 8) * Math.PI * 2;
      return [x + Math.cos(a) * radius, GROUND_Y + radius + Math.sin(a) * radius, wz];
    });
  return skin([ring(z - halfWidth), ring(z + halfWidth)], () => BLACK, BLACK, BLACK);
}

/** Wheels of the +z side: one of the two nose wheels and the tandem pair under the sponson. */
function gear(): Tri[] {
  return [...wheel(0.37, 0.011, NOSE_WHEEL_RADIUS, 0.006), ...wheel(0.045, 0.076, MAIN_WHEEL_RADIUS, 0.009), ...wheel(-0.025, 0.076, MAIN_WHEEL_RADIUS, 0.009)];
}

/** A part of the +z side with its mirror on the other. */
const bothSides = (tris: readonly Tri[]): Tri[] => [...tris, ...mirrorZ(tris)];

function airframe(): Tri[] {
  return [
    ...fuselage(),
    ...bothSides(sponson()),
    ...halfWing(1),
    ...mirrorZ(halfWing(-1)),
    ...halfTailplane(1),
    ...mirrorZ(halfTailplane(-1)),
    ...fin(),
    ...ENGINE_Z.flatMap((z) => bothSides(engine(z))),
    ...bothSides(fuelTank()),
  ];
}

/** In flight, gear up: the fuselage axis runs along y = 0 and the model is centered on the origin. */
export const HERCULES_FLIGHT_POLY: readonly Tri[] = airframe();

/** On the ground, gear down and propellers still: the wheels rest on y = 0. */
export const HERCULES_PARKED_POLY: readonly Tri[] = shift([...airframe(), ...bothSides(gear())], 0, -GROUND_Y, 0);
