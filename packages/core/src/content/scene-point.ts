import type { FactKind } from './orcadas.ts';
import type { CitedSource } from '../sources.ts';

/**
 * A point of interest that opens a scene of its own instead of a card (#206, #280): a few spots to
 * visit, each with short facts that cite the point's sources. It is not an expedition: leaving it
 * never counts in the exploration log.
 */

export interface SceneSpot<S extends string = string> {
  id: S;
  label: string;
  shortLabel: string;
  subtitle: string;
}

export interface SceneFact<S extends string = string> {
  id: string;
  /** The spot it belongs to, or `scene` for what the scene says about itself (the help of the reconstruction badge). */
  spot: S | 'scene';
  kind: FactKind;
  text: string;
  /** Ids in `cited`. */
  sources: readonly string[];
}

export interface ScenePoint<S extends string = string> {
  /** Id of the map point (points.ts). */
  id: string;
  title: string;
  /** In visit order. */
  spots: readonly SceneSpot<S>[];
  facts: readonly SceneFact<S>[];
  /** Every source, in the order the sources view numbers them. */
  cited: readonly CitedSource[];
}

export const sceneFacts = <S extends string>(point: ScenePoint<S>, spot: S | 'scene'): readonly SceneFact<S>[] =>
  point.facts.filter((f) => f.spot === spot);
