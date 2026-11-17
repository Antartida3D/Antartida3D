/**
 * Map points that have a low-poly model (POINT_MODELS in pointModels.ts), kept apart so the card can
 * tell without loading three.js. models.test.ts checks that both lists agree.
 */
export const POINT_MODEL_IDS: ReadonlySet<string> = new Set(['polo', 'testigos', 'belgrano', 'erebus', 'thwaites', 'vostok', 'emperador', 'cerronevado']);

