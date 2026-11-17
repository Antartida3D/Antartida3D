/**
 * The icebreaker of «En rompehielos hacia Belgrano» (issue #219): where it lies against the ice edge, and the
 * gangway, the foredeck and the door the dogs and the men walk through to go aboard. Pure data and rules, no
 * drawing: the ship itself is built in react-ui (voyage/ponchoShip.ts) from these numbers, so the walk and the
 * faces agree.
 *
 * It is an ILLUSTRATION: the silhouette follows the low-poly icebreaker of the trip (irizarModel.ts), painted
 * like a polar ship (dark blue hull, white superstructure), and is NOT the ship of 1964; the book (p. 14) only
 * says "un rompehielos". Nothing on it names a real ship.
 *
 * Frame of the scene (poncho-scenes.ts): x ahead, z to the left, y up, units of a person's height. The sea
 * is on +z, so the ship lies along x with its near side towards the ice.
 */

/** Length of the ship in scene units (a person is ~1: smaller than a real ship, like every model of the diorama). */
export const SHIP_LENGTH = 22;
/** The model is drawn this much taller than long (decks of a person and a half high, as aboard a real ship). */
export const SHIP_HEIGHT_SCALE = 1.25;
/** Which way the bow points along x: -1 is towards -x. */
export const SHIP_BOW: -1 | 1 = -1;
/** Where along the ship the gangway meets the foredeck, as a fraction of its length from the middle towards the bow. */
export const SHIP_LANDING_U = 0.405;
/** The gangway lands at x = SHIP_LANDING_X (the ship lies along x from there). */
export const SHIP_LANDING_X = 0;
/** z of the near edge of the foredeck at the landing: where the top of the gangway ends. */
export const SHIP_LANDING_Z = 6.0;
/** Height of the deck over the water at the landing (the ship is placed so its deck is exactly this high). */
export const SHIP_DECK_ABOVE_WATER = 1.4;
/**
 * The door the walkers go in by: on the slanted front wall of the superstructure, on the side of the ice, as fractions
 * of the length (along the ship from its middle, and across it). The deck falls a little from the landing to it.
 */
export const SHIP_DOOR_U = 0.265;
export const SHIP_DOOR_V = 0.074;
export const SHIP_DOOR_DECK_ABOVE_WATER = 1.23;
/** The gangway: half its width, and how far it runs on the ice from its foot to the deck edge. */
export const SHIP_GANGWAY_HALF_WIDTH = 0.45;
export const SHIP_GANGWAY_RUN = 3.4;

/** The middle of the ship, so that the landing falls where it should: the landing is SHIP_LANDING_U of the length from it towards the bow. */
export const SHIP_CENTER_X = SHIP_LANDING_X - SHIP_BOW * SHIP_LANDING_U * SHIP_LENGTH;
/** Half width of the deck at the landing (irizarModel.ts: the deck narrows towards the bow, to 0.0727 of the length there). */
export const SHIP_LANDING_HALF_BEAM = 0.0727 * SHIP_LENGTH;
export const SHIP_CENTER_Z = SHIP_LANDING_Z + SHIP_LANDING_HALF_BEAM;

/** The foot of the gangway on the ice. */
export const SHIP_GANGWAY_FOOT: readonly [number, number] = [SHIP_LANDING_X, SHIP_LANDING_Z - SHIP_GANGWAY_RUN];
/** The top of the gangway, at the edge of the deck. */
export const SHIP_GANGWAY_TOP: readonly [number, number] = [SHIP_LANDING_X, SHIP_LANDING_Z];
/** The door into the superstructure, where whoever goes aboard is lost from view. */
export const SHIP_DOOR: readonly [number, number] = [SHIP_CENTER_X + SHIP_BOW * SHIP_DOOR_U * SHIP_LENGTH, SHIP_CENTER_Z + SHIP_BOW * SHIP_DOOR_V * SHIP_LENGTH];

/** The part of the foredeck one walks on, from the landing to the door: along x, and from the deck edge into the ship (z). */
const DECK_X: readonly [number, number] = [SHIP_LANDING_X - SHIP_GANGWAY_HALF_WIDTH, SHIP_DOOR[0] + 0.15];
const DECK_Z: readonly [number, number] = [SHIP_LANDING_Z - 0.12, SHIP_LANDING_Z + 0.6];

/** What a point of the ground is for someone who walks: the gangway (how far up it, 0..1) or the deck. */
export type ShipWalkway = { readonly kind: 'gangway'; readonly t: number } | { readonly kind: 'deck' };

/** The gangway or the foredeck at (x, z), or null: there the ground is the walkway, not the ice or the water below. */
export function shipWalkwayAt(x: number, z: number): ShipWalkway | null {
  const [fx, fz] = SHIP_GANGWAY_FOOT;
  const [, tz] = SHIP_GANGWAY_TOP;
  if (Math.abs(x - fx) <= SHIP_GANGWAY_HALF_WIDTH && z >= fz && z <= tz) return { kind: 'gangway', t: (z - fz) / (tz - fz) };
  if (x >= DECK_X[0] && x <= DECK_X[1] && z >= DECK_Z[0] && z <= DECK_Z[1]) return { kind: 'deck' };
  return null;
}

/**
 * Height of the walkway over the water, given the height of the ice at the foot (in the same frame, with the water at `waterY`):
 * the ice at the foot, a straight slope up the gangway, and the deck, which falls a little from the landing to the door. Null
 * where there is no walkway.
 */
export function shipWalkHeight(x: number, z: number, footY: number, waterY: number): number | null {
  const at = shipWalkwayAt(x, z);
  if (!at) return null;
  const deckY = waterY + SHIP_DECK_ABOVE_WATER;
  if (at.kind === 'gangway') return footY + (deckY - footY) * at.t;
  const k = Math.min(1, Math.max(0, (x - SHIP_LANDING_X) / (SHIP_DOOR[0] - SHIP_LANDING_X)));
  return deckY + (SHIP_DOOR_DECK_ABOVE_WATER - SHIP_DECK_ABOVE_WATER) * k;
}
