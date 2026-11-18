import { facingOut, loftBody, prism, type Station, type Tri, type Vec3 } from '../lowPoly.ts';

/**
 * Low-poly cape petrel (Daption capense) for the Desde Ushuaia sightings, a direct replacement of
 * `bird(BLACK, WHITE, WHITE, BLACK, ...)` in sightingModels.ts: about one unit long, bill to +x,
 * y up, the body axis on y = 0 as the block model (moveSighting flies it round that point), and the
 * right wing measured from WING_ROOT so it beats round its root (child 1; the left one is mirrored
 * in z). Black hood, white belly, back and upperwings checkered black and white, a white flash at
 * the base of the primaries, white tail with a black band. ILLUSTRATIVE: shape and pattern are
 * drawn, not measured.
 */

// Same values as BLACK and WHITE of sightingModels.ts. Not imported from there: that module will
// import this one, and a cycle would read them before they are set.
const PETREL_BLACK = 0x1f2a36;
const PETREL_WHITE = 0xf7fafb;
/** The bill, a lighter slate than the hood so it reads against it. */
const PETREL_BILL = 0x4a525a;
/** The eye, dark brown on the black hood, with a white catchlight facet. */
const PETREL_EYE = 0x5a3a24;

/** Torso from the rump to the base of the bill, as (x, center y, half height, half width). */
const TORSO: readonly Station[] = [
  [-0.3, 0.01, 0.022, 0.034],
  [-0.2, 0.006, 0.042, 0.055],
  [-0.1, 0.002, 0.058, 0.07],
  [0, 0, 0.064, 0.075],
  [0.1, 0.004, 0.062, 0.07],
  [0.22, 0.022, 0.05, 0.056],
  [0.3, 0.04, 0.05, 0.05],
  [0.36, 0.046, 0.04, 0.04],
  [0.395, 0.042, 0.024, 0.026],
];
/** Segments round the torso; the first half (0..3) is the upper side. */
const TORSO_SEGS = 8;
/** Bands of the torso: the rump (band 0) is white, the back up to the nape checkered, the head black. */
const NAPE_BAND = 4;

function torso(): Tri[] {
  return loftBody(TORSO, (band, seg) => {
    const upper = seg < TORSO_SEGS / 2;
    if (band > NAPE_BAND) return PETREL_BLACK;
    if (!upper) return PETREL_WHITE;
    if (band === 0) return PETREL_WHITE;
    return (band + seg) % 2 ? PETREL_BLACK : PETREL_WHITE;
  }, [PETREL_WHITE, PETREL_BLACK], TORSO_SEGS);
}

/** Short tube-nosed bill with a hooked tip, and the nostril tube on top. */
function bill(): Tri[] {
  return [
    ...loftBody([
      [0.39, 0.038, 0.017, 0.018],
      [0.43, 0.035, 0.012, 0.012],
      [0.46, 0.029, 0.007, 0.007],
      [0.478, 0.02, 0.003, 0.003],
    ], () => PETREL_BILL, [PETREL_BILL, PETREL_BILL], 6),
    ...loftBody([
      [0.395, 0.052, 0.007, 0.008],
      [0.425, 0.047, 0.004, 0.005],
    ], () => PETREL_BILL, [PETREL_BILL, PETREL_BILL], 4),
  ];
}

/** Each eye a low pyramid on the side of the head; its upper front facet is the catchlight. */
function eyes(): Tri[] {
  const out: Tri[] = [];
  const [x, y, z, r] = [0.345, 0.062, 0.04, 0.012];
  for (const side of [1, -1] as const) {
    const ring = Array.from({ length: 4 }, (_, i): Vec3 => {
      const a = (i / 4) * Math.PI * 2;
      return [x + Math.cos(a) * r, y + Math.sin(a) * r, side * (z - 0.004)];
    });
    const apex: Vec3 = [x, y, side * (z + 0.008)];
    const inside: Vec3 = [x, y, side * z];
    for (let i = 0; i < 4; i++) out.push(facingOut(apex, ring[i], ring[(i + 1) % 4], i === 0 ? PETREL_WHITE : PETREL_EYE, inside));
  }
  return out;
}

/** Fanned tail: white at its base, a broad black band at its tip. */
function tail(): Tri[] {
  return [
    ...prism([[-0.26, -0.03], [-0.26, 0.03], [-0.38, 0.075], [-0.38, -0.075]], -0.004, 0.014, PETREL_WHITE, PETREL_WHITE, true),
    ...prism([[-0.38, -0.075], [-0.38, 0.075], [-0.44, 0.06], [-0.455, 0], [-0.44, -0.06]], -0.003, 0.012, PETREL_BLACK, PETREL_BLACK, true),
  ];
}

/** Dark feet tucked under the base of the tail. */
function feet(): Tri[] {
  return prism([[-0.12, -0.03], [-0.12, 0.03], [-0.22, 0.035], [-0.22, -0.035]], -0.05, -0.03, PETREL_BLACK, PETREL_BLACK, true);
}

/** Body without the wings, in model units round the body axis. */
export const CAPE_PETREL_BODY_POLY: Tri[] = [...torso(), ...bill(), ...eyes(), ...tail(), ...feet()];

/**
 * Span stations of the right wing from its root (z = 0) out to the wingtip: leading and trailing
 * edge (x). Straight inner wing, then swept back from the wrist (about z = 0.46) to a pointed tip.
 */
const WING: readonly (readonly [z: number, le: number, te: number])[] = [
  [0, 0.12, -0.09],
  [0.12, 0.12, -0.09],
  [0.24, 0.11, -0.085],
  [0.36, 0.09, -0.08],
  [0.46, 0.06, -0.09],
  [0.56, 0.02, -0.1],
  [0.64, -0.03, -0.115],
  [0.72, -0.08, -0.13],
];
const WING_TIP: Vec3 = [-0.13, 0, 0.76];
/** Half span of the wing, for its thinning. */
const WING_LENGTH = WING_TIP[2];

/**
 * Upperwing of a band (k, along the span) and chord strip (0 front, 1 rear): a black leading edge,
 * the inner wing checkered, black at the wrist, the white flash at the base of the primaries and
 * black primaries.
 */
const upperwing = (k: number, strip: 0 | 1): number => {
  if (k <= 2) return (k + strip) % 2 ? PETREL_BLACK : PETREL_WHITE;
  return k === 4 ? PETREL_WHITE : PETREL_BLACK;
};

/** Right wing, measured from its root at WING_ROOT of sightingModels.ts. */
function wing(): Tri[] {
  // Airfoil ring: leading edge, upper front, upper rear, trailing edge, lower rear, lower front.
  const rings: Vec3[][] = WING.map(([z, le, te]) => {
    const thin = 1 - 0.6 * (z / WING_LENGTH);
    const top = 0.02 * thin;
    const bottom = -0.012 * thin;
    const at = (f: number) => le + (te - le) * f;
    return [[le, 0.002, z], [at(0.3), top, z], [at(0.65), top * 0.6, z], [te, 0, z], [at(0.65), bottom * 0.5, z], [at(0.3), bottom, z]];
  });
  const n = rings[0].length;
  const center = (r: readonly Vec3[]): Vec3 => [0, 1, 2].map((c) => r.reduce((s, p) => s + p[c], 0) / r.length) as unknown as Vec3;
  const colorAt = (k: number, seg: number): number => {
    if (seg === 0) return PETREL_BLACK;
    if (seg <= 2) return upperwing(k, seg === 1 ? 0 : 1);
    // Underwing white with a dark leading edge and dark tip.
    return seg === 5 || k >= 5 ? PETREL_BLACK : PETREL_WHITE;
  };
  const out: Tri[] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    const inside = center([...rings[k], ...rings[k + 1]]);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const color = colorAt(k, i);
      out.push(facingOut(rings[k][i], rings[k][j], rings[k + 1][j], color, inside), facingOut(rings[k][i], rings[k + 1][j], rings[k + 1][i], color, inside));
    }
  }
  // Root closed inside the body; the last ring narrows to the pointed tip.
  const root = rings[0];
  const rootInside = center([...root, ...rings[1]]);
  const last = rings[rings.length - 1];
  const tipInside = center([...last, WING_TIP, WING_TIP, WING_TIP, WING_TIP, WING_TIP, WING_TIP]);
  const rootMid = center(root);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    out.push(facingOut(rootMid, root[i], root[j], PETREL_BLACK, rootInside));
    out.push(facingOut(last[i], last[j], WING_TIP, PETREL_BLACK, tipInside));
  }
  return out;
}

/** Right wing (towards +z) from its root; the left one is its mirror in z. */
export const CAPE_PETREL_WING_POLY: Tri[] = wing();
