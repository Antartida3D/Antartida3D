/**
 * Map points that have a low-poly model (POINT_MODELS in pointModels.ts), kept apart so the card can
 * tell without loading three.js. models.test.ts checks that both lists agree.
 */
export const POINT_MODEL_IDS: ReadonlySet<string> = new Set(['polo', 'testigos', 'belgrano', 'erebus', 'thwaites', 'vostok', 'emperador', 'cerronevado']);

/**
 * What the card says about a model that does more than illustrate the place, instead of the plain
 * «Ilustración representativa, no a escala.».
 */
export const POINT_MODEL_NOTES: Readonly<Record<string, string>> = {
  cerronevado: 'Ilustración, no a escala: la cantidad de pingüinos no es un conteo, y el saludo con la aleta es un recurso del dibujo, no algo que hagan los emperadores.',
};
