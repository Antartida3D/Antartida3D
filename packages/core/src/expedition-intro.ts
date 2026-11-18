import { CERRO_NEVADO_SOURCES, cerroNevadoFacts } from './content/cerro-nevado.ts';
import { FOSSIL_SOURCES, FOSSIL_STOPS } from './content/fossils.ts';
import { MARAMBIO_SPOTS, marambioFacts } from './content/marambio.ts';
import { MARINE_SOURCES, MARINE_STOPS } from './content/marine.ts';
import { sceneFacts } from './content/scene-point.ts';
import type { ScenePoint } from './content/scene-point.ts';
import { THWAITES_SCENE } from './content/thwaites-scene.ts';
import { BELGRANO_SCENE } from './content/belgrano-scene.ts';
import { POLO_SCENE } from './content/polo-scene.ts';
import { TESTIGOS_SCENE } from './content/testigos-scene.ts';
import { VOSTOK_SCENE } from './content/vostok-scene.ts';
import { cerroNevadoCited, fossilCited, marambioCited, marineCited, type CitedSource } from './sources.ts';

/** One paragraph of the modal that opens before an expedition, with the sources it cites. */
export interface IntroParagraph {
  readonly text: string;
  readonly sourceIds: readonly string[];
}

/** What the modal before an expedition shows besides its question: a short text with its citations, and the list that numbers them. */
export interface ExpeditionIntro {
  readonly paragraphs: readonly IntroParagraph[];
  readonly sources: readonly CitedSource[];
}

/** The sources of each expedition, in the order its sources view lists them: the same numbers inside and before it. */
export const MARINE_CITED: readonly CitedSource[] = (Object.keys(MARINE_SOURCES) as Parameters<typeof marineCited>[0][]).map(marineCited);
export const FOSSIL_CITED: readonly CitedSource[] = (Object.keys(FOSSIL_SOURCES) as Parameters<typeof fossilCited>[0][]).map(fossilCited);
export const CERRO_NEVADO_CITED: readonly CitedSource[] = (Object.keys(CERRO_NEVADO_SOURCES) as Parameters<typeof cerroNevadoCited>[0][]).map(cerroNevadoCited);
export const MARAMBIO_CITED: readonly CitedSource[] = marambioCited();

/** A point with a scene of its own opens with the facts of its first spot. */
const sceneIntro = <S extends string>(point: ScenePoint<S>): ExpeditionIntro => ({
  paragraphs: sceneFacts(point, point.spots[0].id).map((f) => ({ text: f.text, sourceIds: f.sources })),
  sources: point.cited,
});

/**
 * The text before an expedition, taken from what the expedition already tells at its first stop (nothing new is
 * written, so nothing new needs a source). `null` for the ones with a picker of their own (Ushuaia, Orcadas, Poncho).
 */
export function expeditionIntro(id: string): ExpeditionIntro | null {
  switch (id) {
    case 'marambio':
      return {
        paragraphs: marambioFacts(MARAMBIO_SPOTS[0].id).slice(0, 2).map((f) => ({ text: f.text, sourceIds: f.sourceIds })),
        sources: MARAMBIO_CITED,
      };
    case 'cerronevado':
      return {
        paragraphs: cerroNevadoFacts('colony').slice(0, 2).map((f) => ({ text: f.text, sourceIds: f.sources })),
        sources: CERRO_NEVADO_CITED,
      };
    case THWAITES_SCENE.id:
      return sceneIntro(THWAITES_SCENE);
    case VOSTOK_SCENE.id:
      return sceneIntro(VOSTOK_SCENE);
    case POLO_SCENE.id:
      return sceneIntro(POLO_SCENE);
    case BELGRANO_SCENE.id:
      return sceneIntro(BELGRANO_SCENE);
    case TESTIGOS_SCENE.id:
      return sceneIntro(TESTIGOS_SCENE);
    case 'oceano':
      return { paragraphs: [{ text: MARINE_STOPS[0].line, sourceIds: MARINE_STOPS[0].sources }], sources: MARINE_CITED };
    case 'fosiles':
      return { paragraphs: [{ text: FOSSIL_STOPS[0].line, sourceIds: FOSSIL_STOPS[0].sources }], sources: FOSSIL_CITED };
    default:
      return null;
  }
}
