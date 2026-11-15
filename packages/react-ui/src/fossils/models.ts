import { type Box } from '../voyage/vehicles.ts';

// Illustrations, not anatomical measurements. Flat colors taken from the field photographs of the
// family archive (dark gravel, ochre strata, orange tents, red and yellow parkas) and from the
// expedition palette. One unit is the length (or height, for people and trees) of each model.
export const FOSSIL_PALETTE = {
  // Present-day James Ross ground
  gravel: 0x524c46, gravelMid: 0x5c554e, gravelLight: 0x6a635a, scree: 0x8c8172,
  strataTan: 0xa08c70, strataBrown: 0x6e5f50, strataGrey: 0x857b70, basalt: 0x3a3836,
  snow: 0xf4f7f8, iceBlue: 0xd7e6ee, sea: 0x4f7f9b, seaDeep: 0x3b6680,
  // Camp and people
  tent: 0xe0702a, tentDark: 0xb8521c, canvas: 0xf3ebdd, crate: 0xb48a57, crateDark: 0x8a6440,
  parkaRed: 0xc8352e, parkaYellow: 0xe8b631, parkaOrange: 0xd8642a, pants: 0x2e3440, boot: 0x5a3b28,
  skin: 0xd9a982, beard: 0x4a3426, hat: 0x1f2a36, glove: 0x3a3330, metal: 0x9aa3a8, handle: 0x2f6fb3,
  ink: 0x1f2a36,
  // Fossils
  sand: 0xb5a28b, light: 0xd9cbb1, dark: 0x685c50, rock: 0x8b8276,
  bone: 0xeddcb8, boneShade: 0xcdb892, rib: 0x9a7853, shell: 0xc7a16e, shellStripe: 0x9b6f3f, glow: 0xf2c14e,
  // Living animals (colors are an illustrative choice)
  ammoniteSoft: 0xd9b8a0, dinoGreen: 0x6c8063, dinoDark: 0x55684d, armor: 0xb3a16b, armorDark: 0x8d7d50,
  belly: 0xc4bb94, beak: 0x6b5d4e, plesioBack: 0x4f6f7d, plesioBelly: 0xcfd8d4, plesioSpot: 0x3c5764,
  tooth: 0xf7f2e4,
  // Cretaceous forest
  conifer: 0x3f5e45, coniferLight: 0x557a52, fern: 0x7a9a55, cycad: 0x6d8a4a, leaf: 0x83956b, bark: 0x6f5a45,
  forestFloor: 0x5f6d45, forestMoss: 0x68774b, forestSoil: 0x6b5a43,
  // Eocene sea floor
  seaFloor: 0xaea78f, seaFloorDark: 0x8f8a74, starOrange: 0xd47a3c, starPlate: 0xe8a868, starSpot: 0x8f3b22,
  bryozoan: 0xe8d9b0, bryozoanRed: 0xd89a6a, brachiopod: 0xcdb38f, urchin: 0x6d4f6a, urchinSpine: 0x9b7c95,
  crinoid: 0x9c6b5a, crinoidLight: 0xb98f7c, chiton: 0x8a7a6a, chitonLight: 0xb1a493, serpulid: 0xe9e2d0,
  inoceramus: 0xa89a83,
} as const;
const C = FOSSIL_PALETTE;

/** A pivot and the boxes that turn around it, in the pivot's own frame. */
export interface Part { pivot: readonly [number, number, number]; boxes: readonly Box[] }

/** Offsets a part's boxes by its pivot: the model as it looks at rest. */
export function partAtRest(part: Part): Box[] {
  const [px, py, pz] = part.pivot;
  return part.boxes.map(([x, y, z, sx, sy, sz, c]) => [x + px, y + py, z + pz, sx, sy, sz, c]);
}

// --- Ammonite -------------------------------------------------------------------------------

/** A continuous stepped spiral in the xy plane, with ribs and a visible outer aperture. */
export function ammoniteShell(stripes: boolean): Box[] {
  const boxes: Box[] = [];
  const turns = Math.PI * 4.6;
  for (let i = 0; i < 110; i++) {
    const t = i / 109;
    const angle = turns * t;
    const radius = 0.035 + t * 0.39;
    const width = 0.045 + t * 0.065;
    const ribbed = i % 6 === 0;
    boxes.push([Math.cos(angle) * radius, 0.48 + Math.sin(angle) * radius, 0, width, width, 0.17 + t * 0.06,
      ribbed ? (stripes ? C.shellStripe : C.rib) : C.shell]);
  }
  return boxes;
}
const TURNS = Math.PI * 4.6;
export const AMMONITE_APERTURE: readonly [number, number, number] = [Math.cos(TURNS) * 0.425, 0.48 + Math.sin(TURNS) * 0.425, 0.025];

export const AMMONITE_FOSSIL: readonly Box[] = [
  ...ammoniteShell(false),
  [AMMONITE_APERTURE[0], AMMONITE_APERTURE[1], AMMONITE_APERTURE[2], 0.13, 0.12, 0.25, C.dark],
];

/** Living ammonite: striped shell, soft body with eyes; the arms are a separate part each. */
export const AMMONITE_BODY: readonly Box[] = [
  ...ammoniteShell(true),
  [AMMONITE_APERTURE[0] + 0.07, AMMONITE_APERTURE[1], 0.025, 0.14, 0.11, 0.17, C.ammoniteSoft],
  [AMMONITE_APERTURE[0] + 0.05, AMMONITE_APERTURE[1] + 0.06, 0.025, 0.12, 0.03, 0.15, C.shellStripe],
  [AMMONITE_APERTURE[0] + 0.1, AMMONITE_APERTURE[1] + 0.02, 0.105, 0.035, 0.035, 0.012, C.ink],
  [AMMONITE_APERTURE[0] + 0.1, AMMONITE_APERTURE[1] + 0.02, -0.055, 0.035, 0.035, 0.012, C.ink],
];
export const AMMONITE_ARM_COUNT = 8;
/** One arm in three segments: [pivot of the first, boxes] per segment, each in the frame of the previous. */
export function ammoniteArm(i: number): Part[] {
  const z = 0.025 + ((i % 4) - 1.5) * 0.035;
  const y = AMMONITE_APERTURE[1] - 0.04 + Math.floor(i / 4) * 0.06;
  const len = 0.09 - (i % 2) * 0.015;
  return [0, 1, 2].map((s) => ({
    pivot: s === 0 ? [AMMONITE_APERTURE[0] + 0.14, y, z] as const : [len, 0, 0] as const,
    boxes: [[len / 2, 0, 0, len, 0.022 - s * 0.004, 0.022 - s * 0.004, s === 2 ? C.shellStripe : C.ammoniteSoft]],
  }));
}
export const AMMONITE_ALIVE: readonly Box[] = [
  ...AMMONITE_BODY,
  ...Array.from({ length: AMMONITE_ARM_COUNT }, (_, i) => chainAtRest(ammoniteArm(i))).flat(),
];

/** Boxes of a chain of parts, each pivot relative to the previous one, at rest. */
export function chainAtRest(chain: readonly Part[]): Box[] {
  let ox = 0, oy = 0, oz = 0;
  return chain.flatMap((part) => {
    ox += part.pivot[0]; oy += part.pivot[1]; oz += part.pivot[2];
    return part.boxes.map(([x, y, z, sx, sy, sz, c]): Box => [x + ox, y + oy, z + oz, sx, sy, sz, c]);
  });
}

// --- Dinosaur jaw ---------------------------------------------------------------------------

export const JAW_BOXES: readonly Box[] = [
  [-0.1, 0.12, 0, 0.62, 0.13, 0.18, C.bone],
  [0.25, 0.16, 0, 0.15, 0.2, 0.16, C.bone],
  [-0.38, 0.1, 0, 0.12, 0.1, 0.16, C.rib],
  ...Array.from({ length: 7 }, (_, i): Box => [-0.32 + i * 0.075, 0.19, 0.04, 0.035, 0.035, 0.07, C.dark]),
  // The leaf-shaped tooth, crown wider than its root
  [0.06, 0.24, 0, 0.055, 0.12, 0.035, C.bone],
  [0.06, 0.31, 0, 0.1, 0.055, 0.035, C.bone],
  [0.06, 0.35, 0, 0.065, 0.035, 0.035, C.bone],
  [0.06, 0.375, 0, 0.03, 0.025, 0.03, C.bone],
];
export const JAW_TOOTH_CENTER: readonly [number, number, number] = [0.06, 0.31, 0];

// --- Geologist ------------------------------------------------------------------------------

export type Parka = 'red' | 'yellow' | 'orange';
const PARKA = { red: C.parkaRed, yellow: C.parkaYellow, orange: C.parkaOrange } as const;
export const GEOLOGIST_HIP: readonly [number, number, number] = [0, 0.45, 0.075];
export const GEOLOGIST_SHOULDER: readonly [number, number, number] = [0, 0.76, 0.19];
export const GEOLOGIST_NECK: readonly [number, number, number] = [0, 0.82, 0];

export interface GeologistParts { torso: Box[]; head: Box[]; leg: Box[]; arm: Box[]; hammerArm: Box[] }

/** Person in a field parka, about one unit tall, facing +x. Legs and arms hang from their pivots. */
export function geologistParts(parka: Parka, beard: boolean): GeologistParts {
  const coat = PARKA[parka];
  const torso: Box[] = [
    [0, 0.62, 0, 0.2, 0.34, 0.3, coat],
    [0, 0.47, 0, 0.21, 0.06, 0.31, coat],
    [0.101, 0.63, 0, 0.008, 0.3, 0.025, C.ink],
    [0.101, 0.56, 0.08, 0.008, 0.05, 0.06, C.ink],
    [-0.16, 0.66, 0, 0.11, 0.28, 0.24, C.pants],
    [-0.16, 0.81, 0, 0.1, 0.04, 0.2, C.crateDark],
  ];
  const head: Box[] = [
    [0, 0.08, 0, 0.16, 0.16, 0.16, C.skin],
    [0, 0.175, 0, 0.17, 0.06, 0.17, C.hat],
    [0, 0.21, 0, 0.06, 0.03, 0.06, C.hat],
    [0.081, 0.1, 0.04, 0.01, 0.025, 0.025, C.ink],
    [0.081, 0.1, -0.04, 0.01, 0.025, 0.025, C.ink],
    ...(beard ? [[0.06, 0.03, 0, 0.06, 0.07, 0.15, C.beard] as Box] : []),
  ];
  const leg: Box[] = [
    [0, -0.2, 0, 0.11, 0.4, 0.12, C.pants],
    [0.025, -0.42, 0, 0.16, 0.07, 0.13, C.boot],
  ];
  const arm: Box[] = [
    [0, -0.15, 0, 0.09, 0.3, 0.09, coat],
    [0, -0.32, 0, 0.09, 0.06, 0.09, C.glove],
  ];
  const hammerArm: Box[] = [
    ...arm,
    [0.08, -0.33, 0, 0.17, 0.025, 0.025, C.handle],
    [0.17, -0.33, 0, 0.035, 0.07, 0.1, C.metal],
  ];
  return { torso, head, leg, arm, hammerArm };
}

function geologistAtRest(parka: Parka, beard: boolean): Box[] {
  const p = geologistParts(parka, beard);
  const at = (boxes: Box[], [px, py, pz]: readonly [number, number, number]) =>
    boxes.map(([x, y, z, sx, sy, sz, c]): Box => [x + px, y + py, z + pz, sx, sy, sz, c]);
  return [
    ...p.torso,
    ...at(p.head, GEOLOGIST_NECK),
    ...at(p.leg, GEOLOGIST_HIP), ...at(p.leg, [GEOLOGIST_HIP[0], GEOLOGIST_HIP[1], -GEOLOGIST_HIP[2]]),
    ...at(p.arm, GEOLOGIST_SHOULDER), ...at(p.hammerArm, [GEOLOGIST_SHOULDER[0], GEOLOGIST_SHOULDER[1], -GEOLOGIST_SHOULDER[2]]),
  ];
}

// --- Antarctopelta (reconstruction) ---------------------------------------------------------

/** Low, broad armored herbivore. No tail club: its rear end is a plain tapering tail. */
export const DINO_NECK: readonly [number, number, number] = [0.27, 0.34, 0];
export const DINO_TAIL: readonly [number, number, number] = [-0.18, 0.31, 0];
export const DINO_TAIL_SEGMENT = 0.15;
export const DINO_HIPS: readonly (readonly [number, number, number])[] = [
  [0.15, 0.22, 0.12], [0.15, 0.22, -0.12], [-0.08, 0.24, 0.12], [-0.08, 0.24, -0.12],
];

function osteoderms(x0: number, x1: number, y: number, halfWidth: number, rows: number, color: number): Box[] {
  const out: Box[] = [];
  const cols = Math.max(2, Math.round((x1 - x0) / 0.075));
  for (let i = 0; i < cols; i++) {
    for (let r = 0; r < rows; r++) {
      const z = rows === 1 ? 0 : -halfWidth + (2 * halfWidth * r) / (rows - 1);
      out.push([x0 + ((i + 0.5) * (x1 - x0)) / cols, y, z, 0.05, 0.035, 0.05, (i + r) % 2 ? color : C.armorDark]);
    }
  }
  return out;
}

export function dinosaurParts() {
  const body: Box[] = [
    [0.05, 0.3, 0, 0.44, 0.2, 0.32, C.dinoGreen],
    [0.04, 0.42, 0, 0.4, 0.05, 0.28, C.dinoDark],
    [0.05, 0.205, 0, 0.36, 0.035, 0.24, C.belly],
    ...osteoderms(-0.15, 0.25, 0.46, 0.1, 4, C.armor),
    // Side spikes along the flanks
    ...[-0.1, 0.0, 0.1, 0.2].flatMap((x): Box[] => [
      [x, 0.33, 0.175, 0.05, 0.05, 0.05, C.armor], [x, 0.33, -0.175, 0.05, 0.05, 0.05, C.armor],
    ]),
  ];
  const head: Box[] = [
    [0.05, 0, 0, 0.1, 0.1, 0.15, C.dinoGreen],
    [0.14, -0.01, 0, 0.12, 0.1, 0.13, C.dinoGreen],
    [0.21, -0.035, 0, 0.03, 0.04, 0.07, C.beak],
    [0.13, 0.045, 0, 0.1, 0.02, 0.12, C.armor],
    [0.17, 0.02, 0.066, 0.025, 0.025, 0.01, C.ink],
    [0.17, 0.02, -0.066, 0.025, 0.025, 0.01, C.ink],
  ];
  const tail: Box[][] = [0, 1, 2].map((i) => [
    [-DINO_TAIL_SEGMENT / 2, -0.01 * i, 0, DINO_TAIL_SEGMENT + 0.01, 0.12 - i * 0.035, 0.18 - i * 0.05, C.dinoGreen],
    ...osteoderms(-DINO_TAIL_SEGMENT, 0, 0.07 - i * 0.025, 0.06 - i * 0.02, i === 2 ? 1 : 2, C.armor),
  ]);
  const leg: Box[] = [
    [0, -0.1, 0, 0.08, 0.2, 0.085, C.dinoGreen],
    [0.02, -0.2, 0, 0.1, 0.03, 0.09, C.dinoDark],
  ];
  return { body, head, tail, leg };
}

function dinosaurAtRest(): Box[] {
  const p = dinosaurParts();
  const at = (boxes: Box[], [px, py, pz]: readonly [number, number, number]) =>
    boxes.map(([x, y, z, sx, sy, sz, c]): Box => [x + px, y + py, z + pz, sx, sy, sz, c]);
  return [
    ...p.body, ...at(p.head, DINO_NECK),
    ...p.tail.flatMap((boxes, i) => at(boxes, [DINO_TAIL[0] - i * DINO_TAIL_SEGMENT, DINO_TAIL[1], 0])),
    ...DINO_HIPS.flatMap((hip) => at(p.leg, hip)),
  ];
}

/** Recovered pieces, laid on the ground: jaw, vertebrae, ribs and armor plates. */
export const DINO_BONES: readonly Box[] = [
  [-0.3, 0.03, -0.05, 0.22, 0.05, 0.06, C.bone],
  [-0.1, 0.03, 0.12, 0.08, 0.06, 0.08, C.bone], [0.0, 0.03, 0.1, 0.08, 0.06, 0.08, C.boneShade],
  [0.1, 0.03, 0.12, 0.08, 0.06, 0.08, C.bone],
  [0.22, 0.02, -0.12, 0.26, 0.03, 0.035, C.rib], [0.18, 0.02, -0.2, 0.22, 0.03, 0.035, C.rib],
  [-0.15, 0.02, -0.22, 0.07, 0.03, 0.07, C.armor], [-0.05, 0.02, -0.25, 0.06, 0.03, 0.06, C.armor],
  [0.32, 0.02, 0.05, 0.06, 0.03, 0.06, C.armor], [0.38, 0.02, 0.16, 0.07, 0.03, 0.05, C.armorDark],
  [-0.38, 0.03, 0.15, 0.16, 0.05, 0.05, C.boneShade], [-0.42, 0.04, 0.15, 0.05, 0.07, 0.07, C.bone],
];

// --- Plesiosaur (elasmosaur reconstruction) -------------------------------------------------

export const PLESIO_NECK_SEGMENTS = 7;
export const PLESIO_NECK_LENGTH = 0.07;
export const PLESIO_NECK: readonly [number, number, number] = [0.06, 0.09, 0];
export const PLESIO_FLIPPERS: readonly (readonly [number, number, number])[] = [
  [0.0, 0.05, 0.09], [0.0, 0.05, -0.09], [-0.24, 0.05, 0.08], [-0.24, 0.05, -0.08],
];

export function plesiosaurParts() {
  const body: Box[] = [
    [-0.12, 0.07, 0, 0.34, 0.11, 0.2, C.plesioBack],
    [-0.12, 0.03, 0, 0.3, 0.03, 0.18, C.plesioBelly],
    [0.04, 0.08, 0, 0.06, 0.08, 0.12, C.plesioBack],
    [-0.34, 0.07, 0, 0.12, 0.07, 0.09, C.plesioBack],
    [-0.44, 0.07, 0, 0.09, 0.045, 0.055, C.plesioBack],
    [-0.51, 0.07, 0, 0.06, 0.03, 0.035, C.plesioSpot],
    ...[-0.22, -0.12, -0.02].flatMap((x): Box[] => [
      [x, 0.128, 0.04, 0.04, 0.008, 0.03, C.plesioSpot], [x + 0.05, 0.128, -0.04, 0.04, 0.008, 0.03, C.plesioSpot],
    ]),
  ];
  const neck: Box[][] = Array.from({ length: PLESIO_NECK_SEGMENTS }, (_, i) => [
    [PLESIO_NECK_LENGTH / 2, 0, 0, PLESIO_NECK_LENGTH + 0.008, 0.06 - i * 0.003, 0.065 - i * 0.004, i % 2 ? C.plesioBack : C.plesioSpot],
  ]);
  // Head with long jaws and the conical teeth of a marine reptile
  const head: Box[] = [
    [0.035, 0.005, 0, 0.07, 0.045, 0.05, C.plesioBack],
    [0.085, -0.008, 0, 0.06, 0.02, 0.04, C.plesioBack],
    [0.08, -0.025, 0, 0.07, 0.015, 0.038, C.plesioBelly],
    [0.045, 0.018, 0.026, 0.016, 0.016, 0.008, C.ink],
    [0.045, 0.018, -0.026, 0.016, 0.016, 0.008, C.ink],
    ...[0.06, 0.08, 0.1].flatMap((x): Box[] => [
      [x, -0.019, 0.017, 0.006, 0.014, 0.006, C.tooth], [x, -0.019, -0.017, 0.006, 0.014, 0.006, C.tooth],
    ]),
  ];
  // A flipper reaches out sideways (+z); the right ones are mirrored when placed.
  const flipper: Box[] = [
    [-0.01, 0, 0.07, 0.08, 0.016, 0.14, C.plesioBack],
    [-0.035, 0, 0.17, 0.055, 0.013, 0.08, C.plesioBack],
    [-0.05, 0, 0.225, 0.03, 0.01, 0.04, C.plesioSpot],
  ];
  return { body, neck, head, flipper };
}

export const mirrorZ = (boxes: readonly Box[]): Box[] => boxes.map(([x, y, z, sx, sy, sz, c]) => [x, y, -z, sx, sy, sz, c]);

function plesiosaurAtRest(): Box[] {
  const p = plesiosaurParts();
  const at = (boxes: readonly Box[], [px, py, pz]: readonly [number, number, number]) =>
    boxes.map(([x, y, z, sx, sy, sz, c]): Box => [x + px, y + py, z + pz, sx, sy, sz, c]);
  return [
    ...p.body,
    ...p.neck.flatMap((boxes, i) => at(boxes, [PLESIO_NECK[0] + i * PLESIO_NECK_LENGTH, PLESIO_NECK[1], 0])),
    ...at(p.head, [PLESIO_NECK[0] + PLESIO_NECK_SEGMENTS * PLESIO_NECK_LENGTH, PLESIO_NECK[1], 0]),
    ...PLESIO_FLIPPERS.flatMap((pos) => at(pos[2] > 0 ? p.flipper : mirrorZ(p.flipper), pos)),
  ];
}

/** Vertebral column laid in the sediment, head to tail along a gentle curve, in the xz plane. */
export const PLESIO_VERTEBRAE = 52;
export function plesioVertebra(i: number): readonly [number, number, number, number] {
  const t = i / (PLESIO_VERTEBRAE - 1);
  const x = 0.55 - t * 1.1;
  const z = Math.sin(t * Math.PI * 1.4 + 0.4) * 0.09;
  // Neck vertebrae small, trunk ones large, tail tapering.
  const size = t < 0.5 ? 0.022 + t * 0.03 : t < 0.78 ? 0.04 : 0.04 - (t - 0.78) * 0.11;
  return [x, size / 2 + 0.005, z, size];
}
/** Ribs on the trunk, girdles and four paddles of small phalanges; the vertebrae are drawn apart. */
export const PLESIO_BONES: readonly Box[] = [
  ...Array.from({ length: 8 }, (_, i): Box[] => {
    const [x, , z] = plesioVertebra(27 + i * 1.6);
    return [[x, 0.012, z + 0.09, 0.016, 0.012, 0.14, C.boneShade], [x, 0.012, z - 0.09, 0.016, 0.012, 0.14, C.boneShade]];
  }).flat(),
  [0.0, 0.01, 0, 0.09, 0.012, 0.22, C.bone], [-0.2, 0.01, 0, 0.08, 0.012, 0.2, C.bone],
  ...[[0.0, 1], [0.0, -1], [-0.2, 1], [-0.2, -1]].flatMap(([x, s]) =>
    Array.from({ length: 6 }, (_, k): Box => [x - 0.015 * k, 0.008, s * (0.14 + k * 0.035), 0.03 - k * 0.003, 0.01, 0.026, k % 2 ? C.bone : C.boneShade])),
];
export const PLESIO_SKELETON: readonly Box[] = [
  ...PLESIO_BONES,
  ...Array.from({ length: PLESIO_VERTEBRAE }, (_, i): Box => {
    const [x, y, z, s] = plesioVertebra(i);
    return [x, y, z, s * 0.85, s, s * 1.15, i % 2 ? C.bone : C.boneShade];
  }),
];

// --- Camp -----------------------------------------------------------------------------------

/** Pyramid field tent, like the ones in the camp photographs. */
export const TENT_BOXES: readonly Box[] = [
  [0, 0.02, 0, 1.04, 0.04, 1.04, C.tentDark],
  ...Array.from({ length: 10 }, (_, i): Box => [0, 0.08 + i * 0.085, 0, 1 - i * 0.098, 0.085, 1 - i * 0.098, i % 4 === 3 ? C.tentDark : C.tent]),
  [0, 0.95, 0, 0.05, 0.08, 0.05, C.ink],
  [0, 0.2, 0.47, 0.22, 0.34, 0.03, C.tentDark],
  [0, 0.36, 0.43, 0.14, 0.08, 0.03, C.ink],
  [0, 0.6, 0.2, 0.1, 0.05, 0.03, C.canvas],
  ...[[0.55, 0.55], [-0.55, 0.55], [0.55, -0.55], [-0.55, -0.55]].map(([x, z]): Box => [x, 0.04, z, 0.04, 0.08, 0.04, C.metal]),
];
export const CRATE_BOXES: readonly Box[] = [
  [0, 0.2, 0, 0.6, 0.4, 0.4, C.crate],
  [0, 0.41, 0, 0.62, 0.03, 0.42, C.crateDark],
  [0, 0.2, 0.201, 0.62, 0.05, 0.005, C.crateDark],
  [0, 0.2, -0.201, 0.62, 0.05, 0.005, C.crateDark],
  [0.301, 0.2, 0, 0.005, 0.05, 0.42, C.crateDark],
  [-0.301, 0.2, 0, 0.005, 0.05, 0.42, C.crateDark],
  [0.12, 0.3, 0.203, 0.18, 0.08, 0.005, C.canvas],
  [0.12, 0.3, 0.205, 0.12, 0.02, 0.003, C.ink],
  [-0.2, 0.06, 0.2, 0.05, 0.12, 0.02, C.crateDark],
  [0.2, 0.06, 0.2, 0.05, 0.12, 0.02, C.crateDark],
  [-0.2, 0.06, -0.2, 0.05, 0.12, 0.02, C.crateDark],
  [0.2, 0.06, -0.2, 0.05, 0.12, 0.02, C.crateDark],
];
/** Sled with a wrapped load, as in the photograph of the ammonite being moved. */
export const SLED_BOXES: readonly Box[] = [
  [0, 0.03, 0, 1, 0.04, 0.42, C.canvas],
  [0.52, 0.06, 0, 0.06, 0.08, 0.42, C.canvas],
  [0, 0.02, 0.2, 1.04, 0.02, 0.03, C.metal], [0, 0.02, -0.2, 1.04, 0.02, 0.03, C.metal],
  [0, 0.14, 0, 0.42, 0.18, 0.3, C.shell],
  [0, 0.24, 0, 0.36, 0.06, 0.26, C.shellStripe],
  [-0.12, 0.15, 0, 0.02, 0.2, 0.32, C.ink], [0.12, 0.15, 0, 0.02, 0.2, 0.32, C.ink],
  [0, 0.15, 0.08, 0.44, 0.02, 0.02, C.ink], [0, 0.15, -0.08, 0.44, 0.02, 0.02, C.ink],
  [0.6, 0.07, 0.12, 0.2, 0.015, 0.015, C.ink], [0.6, 0.07, -0.12, 0.2, 0.015, 0.015, C.ink],
];
/** Radio mast with a pennant, a landmark of every camp photograph. */
export const MAST_BOXES: readonly Box[] = [
  [0, 0.05, 0, 0.16, 0.1, 0.16, C.crateDark],
  ...Array.from({ length: 8 }, (_, i): Box => [0, 0.15 + i * 0.1, 0, 0.03, 0.1, 0.03, i % 2 ? C.metal : C.canvas]),
  [0, 0.97, 0, 0.12, 0.015, 0.015, C.metal],
  [0.08, 0.9, 0, 0.14, 0.06, 0.01, C.tent],
  [0.17, 0.9, 0, 0.05, 0.03, 0.01, C.tentDark],
  [0, 1.0, 0, 0.015, 0.06, 0.015, C.ink],
];
/** Fossil trunk lying on the gravel: the evidence that forests grew here. */
export const LOG_BOXES: readonly Box[] = Array.from({ length: 14 }, (_, i): Box => [
  -0.45 + i * 0.07, 0.06 + Math.sin(i * 1.3) * 0.006, Math.sin(i * 0.45) * 0.03,
  0.072, 0.11 - (i % 3) * 0.01, 0.12 - (i % 2) * 0.012, i % 3 === 0 ? C.strataGrey : i % 3 === 1 ? C.light : C.rock,
]);

// --- Cretaceous forest ----------------------------------------------------------------------

export const CONIFER_BOXES: readonly Box[] = [
  [0, 0.3, 0, 0.07, 0.6, 0.07, C.bark],
  [0, 0.03, 0, 0.12, 0.06, 0.12, C.bark],
  ...Array.from({ length: 8 }, (_, i): Box => [0, 0.33 + i * 0.085, 0, 0.5 - i * 0.055, 0.06, 0.5 - i * 0.055, i % 2 ? C.conifer : C.coniferLight]),
  [0, 1.04, 0, 0.05, 0.07, 0.05, C.conifer],
  [0.2, 0.36, 0.14, 0.12, 0.04, 0.1, C.conifer],
  [-0.18, 0.47, -0.12, 0.1, 0.04, 0.12, C.conifer],
  [0.14, 0.6, -0.12, 0.08, 0.04, 0.08, C.coniferLight],
];
export const CYCAD_BOXES: readonly Box[] = [
  [0, 0.14, 0, 0.14, 0.28, 0.14, C.bark],
  [0, 0.3, 0, 0.16, 0.05, 0.16, C.bark],
  ...[[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]].flatMap(([dx, dz]): Box[] => [
    [dx * 0.14, 0.36, dz * 0.14, 0.06 + Math.abs(dx) * 0.14, 0.03, 0.06 + Math.abs(dz) * 0.14, C.cycad],
    [dx * 0.26, 0.32, dz * 0.26, 0.05 + Math.abs(dx) * 0.08, 0.025, 0.05 + Math.abs(dz) * 0.08, C.fern],
  ]),
];
export const FERN_BOXES: readonly Box[] = [
  [0, 0.02, 0, 0.12, 0.04, 0.12, C.forestSoil],
  ...Array.from({ length: 6 }, (_, i): Box[] => {
    const a = (i / 6) * Math.PI * 2;
    return [
      [Math.cos(a) * 0.12, 0.12, Math.sin(a) * 0.12, 0.1, 0.03, 0.1, C.fern],
      [Math.cos(a) * 0.24, 0.1, Math.sin(a) * 0.24, 0.08, 0.025, 0.08, i % 2 ? C.leaf : C.cycad],
    ];
  }).flat(),
];
export const BROADLEAF_BOXES: readonly Box[] = [
  [0, 0.25, 0, 0.08, 0.5, 0.08, C.bark],
  [0.08, 0.45, 0, 0.14, 0.04, 0.04, C.bark],
  ...Array.from({ length: 10 }, (_, i): Box => {
    const a = i * 2.39;
    const r = 0.1 + (i % 3) * 0.06;
    return [Math.cos(a) * r, 0.58 + (i % 4) * 0.07, Math.sin(a) * r, 0.2, 0.12, 0.2, i % 2 ? C.leaf : C.fern];
  }),
];

// --- Sea floor: Cretaceous and Eocene -------------------------------------------------------

/** Goniasterid sea star: big pentagonal disc, short arms, pale marginal plates, eye spots at the tips. */
export const STAR_BOXES: readonly Box[] = (() => {
  const boxes: Box[] = [
    [0, 0.04, 0, 0.36, 0.08, 0.36, C.starOrange],
    [0, 0.085, 0, 0.2, 0.02, 0.2, C.starPlate],
    [0, 0.098, 0, 0.06, 0.01, 0.06, C.starSpot],
  ];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + Math.PI / 2;
    for (let s = 0; s < 3; s++) {
      const d = 0.19 + s * 0.09;
      const w = 0.16 - s * 0.04;
      boxes.push([Math.cos(a) * d, 0.035, Math.sin(a) * d, w, 0.07 - s * 0.012, w, s === 1 ? C.starPlate : C.starOrange]);
    }
    boxes.push([Math.cos(a) * 0.45, 0.03, Math.sin(a) * 0.45, 0.04, 0.03, 0.04, C.starSpot]);
  }
  return boxes;
})();
export const BRYOZOAN_BOXES: readonly Box[] = [
  [0, 0.04, 0, 0.12, 0.08, 0.12, C.bryozoanRed],
  ...Array.from({ length: 12 }, (_, i): Box => {
    const a = i * 2.1;
    const h = 0.12 + (i % 4) * 0.08;
    return [Math.cos(a) * (0.04 + h * 0.3), h, Math.sin(a) * (0.04 + h * 0.3), 0.04, 0.12, 0.04, i % 3 ? C.bryozoan : C.bryozoanRed];
  }),
];
export const BRACHIOPOD_BOXES: readonly Box[] = [
  [0, 0.04, 0, 0.26, 0.08, 0.22, C.brachiopod],
  [0.0, 0.09, 0, 0.22, 0.03, 0.18, C.light],
  [-0.12, 0.06, 0, 0.05, 0.06, 0.08, C.shellStripe],
  ...Array.from({ length: 5 }, (_, i): Box => [0.02, 0.107, -0.08 + i * 0.04, 0.2, 0.006, 0.012, C.shellStripe]),
  [0.13, 0.04, 0, 0.012, 0.03, 0.18, C.dark],
  [-0.15, 0.03, 0, 0.04, 0.03, 0.04, C.dark],
  [0.05, 0.02, 0.105, 0.14, 0.02, 0.01, C.dark],
  [0.05, 0.02, -0.105, 0.14, 0.02, 0.01, C.dark],
];
export const URCHIN_BOXES: readonly Box[] = [
  [0, 0.07, 0, 0.26, 0.12, 0.26, C.urchin],
  [0, 0.14, 0, 0.18, 0.04, 0.18, C.urchin],
  ...Array.from({ length: 10 }, (_, i): Box => {
    const a = (i / 10) * Math.PI * 2;
    return [Math.cos(a) * 0.16, 0.08 + (i % 2) * 0.05, Math.sin(a) * 0.16, 0.08, 0.02, 0.02, C.urchinSpine];
  }),
  [0, 0.18, 0, 0.04, 0.04, 0.04, C.urchinSpine],
];
/** Sea lily: a jointed stalk and a crown of arms; the crown sways as one part. */
export const CRINOID_STALK: readonly Box[] = [
  [0, 0.02, 0, 0.12, 0.04, 0.12, C.crinoid],
  ...Array.from({ length: 10 }, (_, i): Box => [0, 0.06 + i * 0.07, 0, 0.035, 0.065, 0.035, i % 2 ? C.crinoid : C.crinoidLight]),
];
export const CRINOID_TOP: readonly [number, number, number] = [0, 0.76, 0];
export const CRINOID_CROWN: readonly Box[] = [
  [0, 0.03, 0, 0.08, 0.06, 0.08, C.crinoid],
  ...Array.from({ length: 10 }, (_, i): Box => {
    const a = (i / 10) * Math.PI * 2;
    return [Math.cos(a) * 0.09, 0.1 + (i % 2) * 0.03, Math.sin(a) * 0.09, 0.03, 0.16, 0.03, i % 2 ? C.crinoidLight : C.crinoid];
  }),
];
/** Chiton: eight articulated valves on an oval girdle. */
export const CHITON_BOXES: readonly Box[] = [
  [0, 0.02, 0, 0.5, 0.04, 0.24, C.chiton],
  ...Array.from({ length: 8 }, (_, i): Box => [-0.21 + i * 0.06, 0.06, 0, 0.055, 0.05 - (i === 0 || i === 7 ? 0.015 : 0), 0.18, i % 2 ? C.chitonLight : C.chiton]),
  [0.24, 0.03, 0.04, 0.02, 0.015, 0.015, C.ink],
  [0.24, 0.03, -0.04, 0.02, 0.015, 0.015, C.ink],
  [0, 0.045, 0, 0.44, 0.006, 0.02, C.dark],
];
/** Giant inoceramid bivalve of the Cretaceous sea floor. */
export const INOCERAMUS_BOXES: readonly Box[] = [
  [0, 0.05, 0, 0.9, 0.1, 0.7, C.inoceramus],
  [0, 0.12, 0, 0.8, 0.04, 0.6, C.light],
  ...Array.from({ length: 6 }, (_, i): Box => [0.05, 0.145, -0.25 + i * 0.1, 0.7 - Math.abs(i - 2.5) * 0.08, 0.012, 0.02, C.shellStripe]),
  [-0.46, 0.08, 0, 0.06, 0.08, 0.3, C.dark],
  [0.45, 0.04, 0, 0.02, 0.06, 0.5, C.dark],
  [0.2, 0.02, 0.36, 0.3, 0.03, 0.02, C.dark],
  [0.2, 0.02, -0.36, 0.3, 0.03, 0.02, C.dark],
];

/** Rock slab with two small sea stars and a printed scale, as in the Bill Hill photograph. */
export const STAR_SLAB_BOXES: readonly Box[] = [
  [0, 0.06, 0, 1.4, 0.12, 0.9, C.seaFloorDark],
  [0.02, 0.125, 0, 1.3, 0.02, 0.82, C.sand],
  // Printed scale bar: alternating centimeter blocks
  ...Array.from({ length: 6 }, (_, i): Box => [-0.55 + i * 0.1, 0.14, 0.34, 0.1, 0.012, 0.06, i % 2 ? C.ink : C.canvas]),
  // Fragments of the associated fauna
  [0.42, 0.15, -0.25, 0.14, 0.03, 0.1, C.brachiopod], [0.5, 0.15, 0.12, 0.08, 0.03, 0.08, C.bryozoan],
  [-0.4, 0.15, -0.28, 0.12, 0.03, 0.07, C.shellStripe], [-0.52, 0.15, 0.05, 0.1, 0.035, 0.1, C.urchin],
];

export const FOSSIL_MODELS: Readonly<Record<string, readonly Box[]>> = {
  'fossil-ammonite': AMMONITE_FOSSIL, 'living-ammonite': AMMONITE_ALIVE,
  'fossil-jaw': JAW_BOXES, 'antarctopelta-bones': DINO_BONES, 'antarctopelta-illustration': dinosaurAtRest(),
  'plesiosaur-illustration': plesiosaurAtRest(), 'plesiosaur-skeleton': PLESIO_SKELETON,
  'field-tent': TENT_BOXES, 'field-crate': CRATE_BOXES, 'field-sled': SLED_BOXES, 'field-mast': MAST_BOXES,
  'field-geologist-red': geologistAtRest('red', true), 'field-geologist-yellow': geologistAtRest('yellow', false),
  'field-geologist-orange': geologistAtRest('orange', true), 'fossil-log': LOG_BOXES,
  'cretaceous-conifer': CONIFER_BOXES, 'cretaceous-cycad': CYCAD_BOXES, 'cretaceous-fern': FERN_BOXES,
  'cretaceous-broadleaf': BROADLEAF_BOXES, 'inoceramid-bivalve': INOCERAMUS_BOXES,
  'eocene-sea-star': STAR_BOXES, 'eocene-bryozoan': BRYOZOAN_BOXES, 'eocene-brachiopod': BRACHIOPOD_BOXES,
  'eocene-urchin': URCHIN_BOXES, 'eocene-crinoid': [...CRINOID_STALK, ...partAtRest({ pivot: CRINOID_TOP, boxes: CRINOID_CROWN })],
  'eocene-chiton': CHITON_BOXES, 'star-slab': STAR_SLAB_BOXES,
};
