import { ModelPreview } from './ModelPreview.tsx';
import { POINT_MODELS } from './pointModels.ts';

/** View of the low-poly model of a map point without an expedition, for its card. */
export function PointPreview({ id, reduced }: { id: string; reduced: boolean }) {
  const entry = POINT_MODELS[id];
  if (!entry) return null;
  const { tris, motion, lift, sea } = entry.preview;
  return <ModelPreview tris={tris} motion={motion} lift={lift} sea={sea} reduced={reduced} />;
}
