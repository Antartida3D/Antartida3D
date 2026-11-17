import { LIST_BUTTON_LABEL, VOYAGE_POINT, type MapPoint } from './points.ts';

/**
 * Texts of the first-visit intro letter and of the «Empezá acá» card (#256). `**word**` marks bold
 * words; the letter renders them.
 */

const SOURCES_NOTE = 'Cada dato tiene su fuente. Lo que es simulación o reconstrucción está marcado como tal en pantalla.';

export const INTRO_DESKTOP = {
  kicker: 'Cuaderno de campo · antes de zarpar',
  title: 'Antártida por descubrir',
  lead: 'Un mapa en 3D para recorrer la Antártida desde adentro: cómo se llega, quién vive ahí y qué estudia la ciencia.',
  steps: [
    { title: 'Mové el mapa', text: 'Arrastrá para moverte. Con la rueda o los botones **+** y **−** te acercás. Con clic derecho girás la vista.' },
    { title: 'Tocá un punto', text: '**Ocre:** una expedición, un recorrido guiado con escenas y preguntas. **Punteado:** un punto de interés con una ficha corta.' },
    { title: 'Completá el registro', text: 'Hay **seis expediciones** y las hacés en el orden que quieras. Tu avance queda guardado en este navegador.' },
  ],
  footer: 'Volvés a esta guía con el botón ? de arriba.',
} as const;

export const INTRO_PHONE = {
  kicker: 'Cuaderno de campo',
  title: 'Antártida por descubrir',
  pages: [
    {
      title: 'Antártida por descubrir',
      lead: 'Un mapa en 3D para recorrer la Antártida desde adentro.',
      text: 'Elegís un punto y viajás: en barco o en avión desde Ushuaia, con un perro de trineo, bajo el hielo del mar. En el camino hay escenas, preguntas y datos con su fuente.',
    },
    {
      title: 'Cómo se usa',
      gesture: '**Arrastrá** con un dedo para moverte y **pellizcá** para acercarte.',
      expedition: '**Pin ocre:** una expedición, un recorrido guiado con escenas y preguntas.',
      place: '**Pin punteado:** un punto de interés con una ficha corta.',
      list: `¿Preferís leer? **«${LIST_BUTTON_LABEL}»** muestra todo sin el mapa.`,
    },
    {
      title: 'Por dónde empezar',
      text: 'Hay **seis expediciones** y las hacés en el orden que quieras.',
      progress: 'Tu avance queda en el registro de arriba, guardado en este celular.',
      sources: SOURCES_NOTE,
    },
  ],
} as const;

const isFirst = (target: Pick<MapPoint, 'id'>) => target.id === VOYAGE_POINT.id;

/** Third phone page: suggests the first trip, or the next one once Ushuaia is done. */
export function introSuggestion(target: Pick<MapPoint, 'id' | 'title'> | null): string {
  if (!target) return '';
  return isFirst(target)
    ? 'Te sugerimos arrancar por **Desde Ushuaia**: el viaje que hace cualquiera que va a la Antártida.'
    : `Te sugerimos seguir por ${target.title}.`;
}

export function introStartLabel(target: Pick<MapPoint, 'id' | 'title'>): string {
  return isFirst(target) ? 'Empezar en Ushuaia' : `Empezar en ${target.title}`;
}

export const INTRO_EXPLORE_LABEL = 'Explorar por mi cuenta';

/** The «Empezá acá» card: the first trip has its own text, any other point a short one. */
export function startHereText(target: Pick<MapPoint, 'id'>, narrow: boolean): string {
  if (!isFirst(target)) return 'Tocá el punto para empezar la expedición.';
  return narrow
    ? 'Tocá el punto y elegí cómo cruzar a la Antártida.'
    : 'El viaje que hace cualquiera que va a la Antártida. Tocá el punto y elegí cómo cruzar.';
}
