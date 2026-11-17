import { VOYAGE_POINT, type MapPoint } from './points.ts';

/**
 * Texts of the «Mapa listo» card and of the three-step guide of the first visit (#256, #258).
 * `**word**` marks bold words; the guide renders them.
 */

export const READY_CARD = {
  status: 'Mapa listo',
  title: 'Un mapa para recorrer la Antártida desde adentro',
  text: 'Cómo se llega, quién vive ahí y qué estudia la ciencia. Seis expediciones, cada dato con su fuente.',
  skip: 'Sin guía',
  explore: 'Exploración guiada',
} as const;

/** Steps of the guide: without a suggested expedition there is no orange button to explain. */
export const guideTotal = (hasNext: boolean): number => (hasNext ? 3 : 2);

export const GUIDE_LABELS = {
  skip: 'Saltar guía',
  next: 'Siguiente',
  explore: 'Explorar por mi cuenta',
} as const;

/** Gestures, by screen width. */
export const GUIDE_GESTURES = {
  desktop: 'Arrastrá para moverte, con la rueda te acercás y con clic derecho girás la vista.',
  phone: 'Arrastrá con un dedo para moverte y pellizcá para acercarte.',
} as const;

export const GUIDE_PIN = {
  title: 'Tocá un punto para viajar',
  place: '**Punteado:** un punto de interés con una ficha corta.',
} as const;

export const GUIDE_REGISTRY = {
  title: 'Tu registro de exploración',
  note: 'Cada dato tiene su fuente; lo que es simulación o reconstrucción está marcado como tal. Volvés a esta guía con el botón **?**.',
} as const;

const isFirst = (target: Pick<MapPoint, 'id'>) => target.id === VOYAGE_POINT.id;

/** Step 1, expedition row: names the suggested point, or none when the six are done. */
export function guidePinText(target: Pick<MapPoint, 'id' | 'title'> | null): string {
  if (!target) return '**Ocre:** una expedición, un recorrido guiado con escenas y preguntas.';
  return isFirst(target)
    ? '**Ocre:** una expedición. Esta es **Desde Ushuaia**, la primera.'
    : `**Ocre:** una expedición. Esta es la sugerida: **${target.title}**.`;
}

/** Step 2: the registry; the storage is the browser's, so the device word changes. */
export function guideRegistryText(phone: boolean): string {
  return `Cada expedición que terminás suma acá. Las hacés en el orden que quieras y tu avance queda guardado en este ${phone ? 'celular' : 'navegador'}.`;
}

/** Step 3: the orange button. Both claims come from `nextExpedition` and the resume key (#186). */
export function guideNextText(target: Pick<MapPoint, 'title'>): string {
  return `**Siguiente: ${target.title}** te guía por las expediciones en un orden sugerido. Si dejaste una a medias, **Continuar** te lleva de vuelta donde quedaste.`;
}

export function introStartLabel(target: Pick<MapPoint, 'id' | 'title'>): string {
  return isFirst(target) ? 'Empezar en Ushuaia' : `Empezar en ${target.title}`;
}
