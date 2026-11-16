import { block, column, loftBody, mirrorZ, outward, prism, shift, spike, strut, type Tri, type Vec3 } from '../voyage/lowPoly.ts';
import { MARINE_PALETTE as C } from './models.ts';

/**
 * Low-poly models of Océano (#196, rule 30). Front towards +x, y up, about one unit long, with the
 * pivots of the block models they replace (HUMPBACK_HINGE, MINKE_HINGE, LEOPARD_HINGE,
 * EMPEROR_SHOULDER), so the poses of marinePoses.ts move them the same way. Illustrations: they keep
 * the marks that tell each animal apart, not its exact anatomy.
 */

/** Upper faces in one color and lower ones in another, split a little below the middle. */
const backBelly = (back: number, belly: number, n: number, split = -0.25) => (_: number, seg: number) =>
  Math.sin(((seg + 0.5) / n) * Math.PI * 2) > split ? back : belly;

/** Both eyes, on either side of a head. */
const eyes = (x: number, y: number, z: number, s: number, color: number = C.black): Tri[] => [
  ...block(x, y, z, s * 0.6, s, s, color),
  ...block(x, y, -z, s * 0.6, s, s, color),
];

/** A thin solid whose faces all turn away from its own middle, whatever way its outline was given. */
const solid = (tris: readonly Tri[]): Tri[] => {
  const pts = tris.flatMap((t) => [t[0], t[1], t[2]]);
  const mid = [0, 1, 2].map((k) => pts.reduce((sum, p) => sum + p[k], 0) / pts.length) as unknown as Vec3;
  return outward(tris, () => mid);
};

/** A flat paddle out to +z from its root, `outline` given as [x, z]. */
const paddle = (outline: readonly [number, number][], y: number, thick: number, color: number): Tri[] =>
  solid(prism(outline, y - thick / 2, y + thick / 2, color, color, true));

// --- Humpback whale, feeding ---------------------------------------------------------------

/** Where the lower jaw turns: below the eye. */
export const HUMPBACK_HINGE: Vec3 = [0.28, -0.06, 0];

const humpbackFlipper = paddle([[0.22, 0.1], [0.12, 0.3], [0.02, 0.46], [0.0, 0.52], [0.06, 0.42], [0.14, 0.24], [0.16, 0.1]], -0.085, 0.022, C.white);

/** Head, back and tail with the flukes and the long white flippers; the jaw and throat are separate. */
export const HUMPBACK_BODY_TRIS: readonly Tri[] = [
  ...loftBody([
    [-0.56, 0.035, 0.025, 0.03], [-0.46, 0.03, 0.05, 0.05], [-0.36, 0.02, 0.075, 0.075], [-0.2, 0.01, 0.105, 0.105],
    [0.0, 0.0, 0.12, 0.125], [0.18, 0.0, 0.115, 0.12], [0.3, 0.02, 0.075, 0.11], [0.44, 0.01, 0.045, 0.085], [0.57, 0.0, 0.02, 0.04],
  ], (band, seg) => (band < 5 && Math.sin(((seg + 0.5) / 10) * Math.PI * 2) < -0.6 ? C.white : C.whale), [C.whale, C.whale], 10),
  // Flukes with white undersides, a small hump of a dorsal fin.
  ...paddle([[-0.54, 0.0], [-0.6, 0.14], [-0.66, 0.2], [-0.64, 0.08], [-0.6, 0.0]], 0.035, 0.018, C.whale),
  ...mirrorZ(paddle([[-0.54, 0.0], [-0.6, 0.14], [-0.66, 0.2], [-0.64, 0.08], [-0.6, 0.0]], 0.035, 0.018, C.whale)),
  ...spike([-0.16, 0.11, 0], [-0.03, 0.05, 0], 0.025, C.whale),
  // The knobs on the head that mark a humpback, and the eyes.
  ...[[0.36, 0.085, 0], [0.44, 0.05, 0.035], [0.44, 0.05, -0.035], [0.52, 0.025, 0]].flatMap(([x, y, z]) => spike([x, y, z], [0, 0.022, 0], 0.014, C.whaleKnob)),
  ...eyes(0.31, -0.01, 0.108, 0.026),
  // Baleen plates hanging from the upper jaw: only seen when the mouth opens.
  ...[0, 1, 2, 3, 4].flatMap((i) => [...block(0.34 + i * 0.05, -0.065, 0.065, 0.035, 0.07, 0.012, C.baleen), ...block(0.34 + i * 0.05, -0.065, -0.065, 0.035, 0.07, 0.012, C.baleen)]),
  ...block(0.44, -0.1, 0.055, 0.2, 0.012, 0.012, C.fringe), ...block(0.44, -0.1, -0.055, 0.2, 0.012, 0.012, C.fringe),
  ...humpbackFlipper, ...mirrorZ(humpbackFlipper),
];

/** Lower jaw, measured from HUMPBACK_HINGE. */
export const HUMPBACK_JAW_TRIS: readonly Tri[] = loftBody(
  [[-0.01, -0.02, 0.03, 0.1], [0.16, -0.025, 0.028, 0.1], [0.3, -0.02, 0.02, 0.075], [0.34, -0.015, 0.01, 0.04]],
  () => C.whale, [C.whale, C.whale], 8);

/** Throat pouch hanging from the jaw, its pleats in stripes: scaled down (y) to inflate when the whale gulps. */
export const HUMPBACK_THROAT_TRIS: readonly Tri[] = loftBody(
  [[-0.06, -0.04, 0.015, 0.08], [0.06, -0.05, 0.03, 0.1], [0.2, -0.05, 0.028, 0.095], [0.27, -0.04, 0.012, 0.06]],
  (_, seg) => (seg % 2 ? C.pleatLine : C.pleat), [C.pleat, C.pleat], 12);

// --- Antarctic minke whale, feeding --------------------------------------------------------

/** Where the minke's lower jaw turns. */
export const MINKE_HINGE: Vec3 = [0.24, -0.05, 0];

/** Grey flipper with only a white leading edge: the white band belongs to the other minkes. */
const minkeFlipper: Tri[] = [
  ...paddle([[0.22, 0.07], [0.16, 0.16], [0.12, 0.2], [0.13, 0.12], [0.15, 0.07]], -0.06, 0.02, C.minke),
  ...paddle([[0.23, 0.07], [0.225, 0.075], [0.165, 0.165], [0.16, 0.16]], -0.06, 0.022, C.white),
];

/** Slim and dark, pointed head, a small fin far back, white belly; jaw and throat are separate. */
export const MINKE_FEED_BODY_TRIS: readonly Tri[] = [
  ...loftBody([
    [-0.58, 0.035, 0.015, 0.02], [-0.48, 0.03, 0.035, 0.035], [-0.36, 0.02, 0.055, 0.055], [-0.2, 0.01, 0.075, 0.075],
    [0.02, 0.0, 0.088, 0.088], [0.22, 0.0, 0.075, 0.08], [0.36, -0.01, 0.045, 0.06], [0.48, -0.02, 0.025, 0.04], [0.54, -0.03, 0.01, 0.015],
  ], backBelly(C.minke, C.white, 10, -0.55), [C.minke, C.minke], 10),
  ...paddle([[-0.56, 0.0], [-0.6, 0.1], [-0.64, 0.14], [-0.63, 0.05], [-0.6, 0.0]], 0.035, 0.016, C.minke),
  ...mirrorZ(paddle([[-0.56, 0.0], [-0.6, 0.1], [-0.64, 0.14], [-0.63, 0.05], [-0.6, 0.0]], 0.035, 0.016, C.minke)),
  ...spike([-0.22, 0.075, 0], [-0.04, 0.06, 0], 0.02, C.minke),
  ...eyes(0.43, 0.005, 0.058, 0.02),
  ...[0, 1, 2].flatMap((i) => [...block(0.33 + i * 0.06, -0.045, 0.045, 0.04, 0.03, 0.01, C.pleat), ...block(0.33 + i * 0.06, -0.045, -0.045, 0.04, 0.03, 0.01, C.pleat)]),
  ...minkeFlipper, ...mirrorZ(minkeFlipper),
];

/** Lower jaw of the minke from MINKE_HINGE. */
export const MINKE_JAW_TRIS: readonly Tri[] = loftBody(
  [[-0.01, -0.005, 0.02, 0.065], [0.18, -0.01, 0.02, 0.06], [0.3, -0.01, 0.012, 0.035], [0.32, -0.008, 0.006, 0.02]],
  () => C.minke, [C.minke, C.minke], 8);

/** Throat of the minke: white, pleated, it stretches when the whale gulps. */
export const MINKE_THROAT_TRIS: readonly Tri[] = loftBody(
  [[-0.05, -0.03, 0.01, 0.05], [0.06, -0.035, 0.022, 0.065], [0.2, -0.035, 0.02, 0.06], [0.25, -0.03, 0.008, 0.035]],
  (_, seg) => (seg % 2 ? C.pleatLine : C.white), [C.white, C.white], 12);

// --- Leopard seal --------------------------------------------------------------------------

/** Where the lower jaw of the leopard seal turns. */
export const LEOPARD_HINGE: Vec3 = [0.3, -0.02, 0];

const leopardFore = paddle([[0.18, 0.07], [0.1, 0.17], [0.04, 0.2], [0.03, 0.17], [0.1, 0.08]], -0.05, 0.02, C.leopard);
const leopardHind = paddle([[-0.44, 0.0], [-0.5, 0.06], [-0.58, 0.09], [-0.57, 0.03], [-0.5, 0.0]], 0, 0.018, C.leopard);

/** Long slender body, big reptilian head, long fore flippers, dark back and pale spotted throat. */
export const LEOPARD_BODY_TRIS: readonly Tri[] = [
  ...loftBody([
    [-0.46, 0.0, 0.02, 0.025], [-0.36, 0.0, 0.045, 0.05], [-0.2, 0.0, 0.065, 0.07], [0.0, 0.0, 0.078, 0.082],
    [0.2, 0.0, 0.068, 0.072], [0.28, 0.01, 0.058, 0.07],
  ], (band, seg) => {
    const pale = Math.sin(((seg + 0.5) / 10) * Math.PI * 2) < -0.3;
    // A few dark spots on the pale throat and belly, fewer on the back.
    return pale ? ((band * 3 + seg) % 7 === 0 ? C.leopardSpot : C.leopardPale) : (band * 5 + seg) % 13 === 0 ? C.leopardSpot : C.leopard;
  }, [C.leopard, C.leopard], 10),
  // The head: wide and long, nearly reptilian; eyes, nostrils and a canine of the upper jaw.
  ...loftBody([[0.27, 0.015, 0.05, 0.068], [0.36, 0.02, 0.048, 0.075], [0.46, 0.015, 0.03, 0.05], [0.52, 0.01, 0.014, 0.025]],
    () => C.leopard, [C.leopard, C.leopard], 10),
  ...eyes(0.38, 0.05, 0.068, 0.022),
  ...eyes(0.51, 0.03, 0.015, 0.01),
  ...spike([0.49, -0.01, 0.03], [0, -0.03, 0], 0.007, C.tooth), ...spike([0.49, -0.01, -0.03], [0, -0.03, 0], 0.007, C.tooth),
  ...leopardFore, ...mirrorZ(leopardFore), ...leopardHind, ...mirrorZ(leopardHind),
];

/** Lower jaw of the leopard seal from LEOPARD_HINGE, with a canine and the three-pointed back teeth. */
export const LEOPARD_JAW_TRIS: readonly Tri[] = [
  ...loftBody([[-0.02, -0.02, 0.02, 0.06], [0.12, -0.02, 0.02, 0.055], [0.22, -0.018, 0.012, 0.03]], () => C.leopardPale, [C.leopardPale, C.leopardPale], 8),
  ...[0.035, -0.035].flatMap((z) => [
    ...spike([0.2, 0.0, z], [0, 0.028, 0], 0.007, C.tooth),
    // Back teeth: three points each, with gaps where water passes.
    ...[0.05, 0.09, 0.13].flatMap((x) => [
      ...spike([x, 0.0, z], [0, 0.02, 0], 0.005, C.tooth),
      ...spike([x - 0.012, 0.0, z], [-0.004, 0.012, 0], 0.004, C.tooth),
      ...spike([x + 0.012, 0.0, z], [0.004, 0.012, 0], 0.004, C.tooth),
    ]),
  ]),
];

// --- Emperor penguin, swimming -------------------------------------------------------------

/** Where each flipper meets the body. */
export const EMPEROR_SHOULDER: Vec3 = [0.1, 0.02, 0.1];
/** Tip of the bill of the swimming emperor, along +x: where it holds a caught fish. */
export const EMPEROR_BILL_TIP = 0.47;

/** An emperor lying flat to swim: black back, white belly, pale chest, yellow ear patches and bill. */
export const EMPEROR_SWIM_TRIS: readonly Tri[] = [
  ...loftBody([[-0.3, 0.0, 0.025, 0.03], [-0.2, 0.0, 0.07, 0.075], [0.0, 0.0, 0.095, 0.1], [0.18, -0.005, 0.09, 0.095], [0.26, 0.01, 0.065, 0.07]],
    (band, seg) => {
      const s = Math.sin(((seg + 0.5) / 10) * Math.PI * 2);
      return s > -0.1 ? C.black : band === 3 ? C.emperorChest : C.white;
    }, [C.black, C.black], 10),
  // Head with the yellow ear patches; the long bill with its orange line.
  ...loftBody([[0.24, 0.015, 0.06, 0.065], [0.32, 0.025, 0.065, 0.07], [0.39, 0.02, 0.04, 0.045]],
    (_, seg) => (seg === 2 || seg === 7 ? C.emperorYellow : C.black), [C.black, C.black], 10),
  ...loftBody([[0.38, 0.012, 0.018, 0.02], [0.47, 0.005, 0.006, 0.008]], (_, seg) => (seg >= 4 && seg <= 6 ? C.emperorBill : C.black), [C.black, C.black], 8),
  ...eyes(0.35, 0.05, 0.066, 0.016, C.eyeWhite),
  ...spike([-0.3, 0.0, 0.0], [-0.05, -0.005, 0], 0.02, C.black),
];

/** Right flipper from EMPEROR_SHOULDER (towards +z), black above, white below; the left one is its mirror. */
export const EMPEROR_FLIPPER_TRIS: readonly Tri[] = [
  ...paddle([[0.05, 0.0], [0.03, 0.12], [-0.02, 0.2], [-0.05, 0.18], [-0.05, 0.0]], 0.004, 0.012, C.black),
  ...paddle([[0.045, 0.01], [0.025, 0.12], [-0.02, 0.19], [-0.045, 0.17], [-0.045, 0.01]], -0.007, 0.006, C.white),
];

// --- Krill, diatoms, fish and squid ----------------------------------------------------------

/** Antarctic krill: a segmented, nearly transparent shell with red spots, big black eyes and a green gut. */
export const KRILL_TRIS: readonly Tri[] = [
  ...loftBody([[-0.4, -0.03, 0.01, 0.04], [-0.3, -0.02, 0.04, 0.035], [-0.18, -0.01, 0.055, 0.045], [-0.04, 0.0, 0.065, 0.055],
    [0.15, 0.0, 0.08, 0.07], [0.3, 0.02, 0.06, 0.055], [0.36, 0.03, 0.03, 0.03]],
  (band, seg) => (seg === 2 && band >= 3 && band <= 4 ? C.krillGut : (band + seg) % 5 === 0 ? C.krillRed : C.krillShell), [C.krillRed, C.krillShell], 8),
  ...eyes(0.34, 0.03, 0.045, 0.045),
  ...strut([0.36, 0.04, 0.02], [0.58, 0.05, 0.05], 0.006, C.krillRed),
  ...strut([0.36, 0.04, -0.02], [0.58, 0.05, -0.05], 0.006, C.krillRed),
  // The swimming legs under the body.
  ...[-0.2, -0.1, 0.0, 0.1, 0.2].flatMap((x) => [...strut([x, -0.05, 0.03], [x - 0.02, -0.13, 0.04], 0.008, C.krillLeg), ...strut([x, -0.05, -0.03], [x - 0.02, -0.13, -0.04], 0.008, C.krillLeg)]),
];

/** A round diatom seen from above, magnified: a glassy disc with radial ribs, a clear center and plastids. */
export const DIATOM_DISC_TRIS: readonly Tri[] = [
  ...column(0, 0, [[-0.06, 0.38, 0.38], [0.04, 0.42, 0.42], [0.06, 0.36, 0.36]], 16, (_, seg) => (seg % 2 ? C.diatomRim : C.diatom)),
  ...column(0, 0, [[0.06, 0.09, 0.09], [0.072, 0.07, 0.07]], 8, C.diatomGlass),
  ...[[0.16, -0.05], [-0.12, 0.14], [-0.1, -0.16]].flatMap(([x, z]) => block(x, 0.066, z, 0.08, 0.012, 0.06, C.plastid)),
];

/** A chain of long diatom cells joined end to end, magnified. */
export const DIATOM_CHAIN_TRIS: readonly Tri[] = [0, 1, 2, 3].flatMap((i) => {
  const x = -0.39 + i * 0.26;
  return [
    ...loftBody([[x - 0.11, 0, 0.03, 0.04], [x - 0.08, 0, 0.05, 0.06], [x + 0.08, 0, 0.05, 0.06], [x + 0.11, 0, 0.03, 0.04]], () => C.diatom, [C.diatomGlass, C.diatomGlass], 8),
    ...block(x, 0.05, 0, 0.12, 0.008, 0.06, C.plastid),
  ];
});

/** Antarctic silverfish: slender and silvery, darker above, with big eyes and fins. */
export const SILVERFISH_TRIS: readonly Tri[] = [
  ...loftBody([[-0.42, 0, 0.012, 0.01], [-0.3, 0, 0.04, 0.03], [-0.1, 0, 0.065, 0.048], [0.16, 0, 0.065, 0.048], [0.34, 0.0, 0.05, 0.042], [0.42, -0.01, 0.02, 0.02]],
    backBelly(C.silverDark, C.silver, 8, 0.45), [C.silverDark, C.silver], 8),
  // The tail fin stands upright: a flat outline in x-z turned to x-y.
  ...solid(prism([[-0.42, 0.0], [-0.49, 0.08], [-0.5, 0.0], [-0.49, -0.08]], -0.006, 0.006, C.silverDark, C.silverDark, true)
    .map(([a, b, c, col]): Tri => [[a[0], a[2], a[1]], [b[0], b[2], b[1]], [c[0], c[2], c[1]], col])),
  ...spike([-0.05, 0.06, 0], [-0.08, 0.04, 0], 0.012, C.silverDark),
  ...spike([-0.12, -0.06, 0], [-0.06, -0.03, 0], 0.01, C.silverDark),
  ...eyes(0.34, 0.02, 0.04, 0.03),
];

/** A squid: mantle behind with fins at the tip, eyes, arms and two longer tentacles ahead. */
export const SQUID_TRIS: readonly Tri[] = [
  ...loftBody([[-0.36, 0, 0.01, 0.01], [-0.28, 0, 0.045, 0.045], [-0.1, 0, 0.07, 0.07], [0.12, 0, 0.065, 0.065], [0.2, 0, 0.055, 0.06]],
    (band, seg) => ((band + seg) % 5 === 0 ? C.squidSpot : C.squid), [C.squid, C.squid], 8),
  ...paddle([[-0.36, 0.0], [-0.3, 0.02], [-0.24, 0.1], [-0.33, 0.07]], 0, 0.01, C.squidDark),
  ...mirrorZ(paddle([[-0.36, 0.0], [-0.3, 0.02], [-0.24, 0.1], [-0.33, 0.07]], 0, 0.01, C.squidDark)),
  ...eyes(0.18, 0.02, 0.058, 0.03),
  ...Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return strut([0.2, Math.sin(a) * 0.03, Math.cos(a) * 0.03], [0.4, Math.sin(a) * 0.05, Math.cos(a) * 0.05], 0.008, C.squidDark);
  }).flat(),
  ...strut([0.2, 0, 0.012], [0.54, 0, 0.02], 0.007, C.squid),
  ...strut([0.2, 0, -0.012], [0.54, 0, -0.02], 0.007, C.squid),
];

// --- Baleen and teeth, side by side --------------------------------------------------------

/** Baleen of a whale, close up: plates hanging from the upper jaw with a hairy fringe inside. */
export const BALEEN_DETAIL_TRIS: readonly Tri[] = [
  ...loftBody([[-0.5, 0.3, 0.035, 0.08], [0.5, 0.3, 0.035, 0.08]], () => C.whale, [C.whale, C.whale], 8),
  ...[-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5].flatMap((k) => [
    ...solid(prism([[k * 0.12 - 0.025, -0.07], [k * 0.12 + 0.025, -0.07], [k * 0.12 + 0.02, 0.07], [k * 0.12 - 0.02, 0.07]], -0.1, 0.27, C.baleen, C.baleen, true)),
    ...[-0.04, 0, 0.04].flatMap((dz) => strut([k * 0.12 + 0.03, -0.08, dz], [k * 0.12 + 0.045, -0.15, dz + 0.01], 0.006, C.fringe)),
  ]),
];

/** The back teeth of a leopard seal, close up: three points each, with gaps where water passes. */
export const TEETH_DETAIL_TRIS: readonly Tri[] = [
  ...loftBody([[-0.5, -0.02, 0.05, 0.09], [0.5, -0.02, 0.05, 0.09]], () => C.gum, [C.gum, C.gum], 8),
  ...[-0.33, -0.11, 0.11, 0.33].flatMap((x) => [
    ...spike([x, 0.03, 0], [0, 0.2, 0], 0.035, C.tooth),
    ...spike([x - 0.065, 0.03, 0], [-0.02, 0.1, 0], 0.025, C.tooth),
    ...spike([x + 0.065, 0.03, 0], [0.02, 0.1, 0], 0.025, C.tooth),
  ]),
  ...spike([0.47, 0.03, 0], [0, 0.3, 0], 0.035, C.tooth),
];

/** A whale or seal with its jaw (and throat) hung at the hinge, mouth closed: as the scene draws it at rest. */
const atRest = (body: readonly Tri[], hinge: Vec3, jaw: readonly Tri[], throat: readonly Tri[] = [], throatDrop = 0): Tri[] => [
  ...body, ...shift(jaw, ...hinge), ...shift(throat, hinge[0], hinge[1] + throatDrop, hinge[2]),
];
export const HUMPBACK_TRIS: readonly Tri[] = atRest(HUMPBACK_BODY_TRIS, HUMPBACK_HINGE, HUMPBACK_JAW_TRIS, HUMPBACK_THROAT_TRIS, -0.03);
export const LEOPARD_TRIS: readonly Tri[] = atRest(LEOPARD_BODY_TRIS, LEOPARD_HINGE, LEOPARD_JAW_TRIS);

/** Every model of Océano, whole and at rest, for the test of least detail and the food web. */
export const MARINE_POLY_MODELS: Readonly<Record<string, readonly Tri[]>> = {
  'marine:humpback': HUMPBACK_TRIS,
  'marine:minke-feeding': atRest(MINKE_FEED_BODY_TRIS, MINKE_HINGE, MINKE_JAW_TRIS, MINKE_THROAT_TRIS, -0.02),
  'marine:leopard': LEOPARD_TRIS,
  'marine:emperor-swim': [...EMPEROR_SWIM_TRIS, ...shift(EMPEROR_FLIPPER_TRIS, ...EMPEROR_SHOULDER), ...shift(mirrorZ(EMPEROR_FLIPPER_TRIS), EMPEROR_SHOULDER[0], EMPEROR_SHOULDER[1], -EMPEROR_SHOULDER[2])],
  'marine:krill': KRILL_TRIS,
  'marine:diatom-disc': DIATOM_DISC_TRIS,
  'marine:diatom-chain': DIATOM_CHAIN_TRIS,
  'marine:silverfish': SILVERFISH_TRIS,
  'marine:squid': SQUID_TRIS,
  'marine:baleen': BALEEN_DETAIL_TRIS,
  'marine:teeth': TEETH_DETAIL_TRIS,
};
