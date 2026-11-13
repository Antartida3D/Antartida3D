/**
 * Content of the expedition of Poncho (issue #9): the life of the Argentine polar sled dog told as a
 * trip over the Antarctic map, with the same shape as the trip «Desde Ushuaia» (content/ushuaia.ts):
 * the dog's team is one more transport (`kind: 'sled'`) and its stops are milestones.
 * Texts come from docs/expediciones/poncho.md; source codes point to VOYAGE_SOURCES.
 */
import type { ExpeditionStop, Milestone, Transport } from './ushuaia.ts';

/**
 * Route of the team as [lon, lat] waypoints, from Base Esperanza (where Poncho was born in 1961) to
 * Base San Martín (the end of the 1962 winter expedition).
 *
 * ILLUSTRATIVE: it is not a logged track. The curve joins places whose coordinates are verified
 * (docs/expediciones/poncho-fuentes.md, section 3): the line between them is only the way the map draws it.
 */
export const PONCHO_ROUTE_WAYPOINTS: readonly (readonly [number, number])[] = [
  [-57.0, -63.4], // Base Esperanza
  [-60.25, -65.07], // Foca nunataks (Base Teniente Matienzo)
  [-67.1, -68.13], // Base San Martín
];

/** The team: Poncho in front, the sled and the pack behind. */
export const PONCHO_TRANSPORT: Transport = {
  id: 'poncho',
  kind: 'sled',
  name: 'Poncho y su jauría',
  type: 'Trineo de perros',
  pitch: 'Un perro polar argentino guía el trineo por el hielo.',
  // Own estimate: the book says a team covered 40 to 50 km in more than six hours on level ground.
  cruiseKmh: 7,
  facts: [
    { text: 'Poncho nació el 10 de abril de 1961 en la Base Esperanza y fue perro-guía de trineo durante años de expediciones.', kind: 'real', sources: ['P1'] },
  ],
};

/** In trip order. The first one opens at departure and the last one on arrival. */
export const PONCHO_MILESTONES: readonly Milestone[] = [
  {
    id: 'poncho-nacimiento',
    title: 'Nace Poncho',
    anchor: [-57.0, -63.4],
    kinds: ['sled'],
    essential: { text: 'Poncho nació el 10 de abril de 1961 en la Base Esperanza, hijo de «Coca» y «Flecha».', kind: 'real', sources: ['P1'] },
    more: [],
  },
  {
    id: 'poncho-san-martin',
    title: 'La Expedición Invernal de 1962',
    anchor: [-67.1, -68.13],
    kinds: ['sled'],
    essential: { text: 'En 1962 una expedición terrestre llegó en pleno invierno de la Base Esperanza a la Base San Martín. En ese viaje Poncho pasó a ser perro-guía.', kind: 'real', sources: ['P1'] },
    more: [],
  },
];

/** What the team tells at each milestone, by milestone id. */
export const PONCHO_EXPEDITION: Readonly<Record<string, ExpeditionStop>> = {};
