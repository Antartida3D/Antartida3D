import { describe, expect, it } from 'vitest';
import { POINT_DETAILS } from '../src/content/point-details.ts';
import { PTS } from '../src/content/points.ts';
import { sceneFacts } from '../src/content/scene-point.ts';
import { THWAITES_SCENE } from '../src/content/thwaites-scene.ts';
import { expeditionIntro } from '../src/expedition-intro.ts';
import { isScenePoint, SCENE_POINTS } from '../src/scene-points.ts';

describe('points of interest with a scene of their own (#206, #280)', () => {
  it('are map points of interest, not expeditions', () => {
    for (const [id, scene] of Object.entries(SCENE_POINTS)) {
      expect(scene.id).toBe(id);
      const point = PTS.find((p) => p.id === id);
      expect(point?.tier).toBe('C');
      expect(scene.title).toBe(point?.title);
    }
    expect(isScenePoint('thwaites')).toBe(true);
    expect(isScenePoint('orcadas')).toBe(false);
  });

  it('give every spot a fact, cite only sources they list, and say they are a reconstruction', () => {
    for (const scene of Object.values(SCENE_POINTS)) {
      const ids = new Set(scene.cited.map((s) => s.id));
      for (const spot of scene.spots) expect(sceneFacts(scene, spot.id).length, spot.id).toBeGreaterThan(0);
      for (const fact of scene.facts) for (const s of fact.sources) expect(ids.has(s), `${fact.id} → ${s}`).toBe(true);
      expect(sceneFacts(scene, 'scene').some((f) => f.kind === 'recon')).toBe(true);
    }
  });

  it('Thwaites says nothing its verified card does not: every real fact is a sentence of the card, and all of the card is told', () => {
    const card = POINT_DETAILS.thwaites;
    const real = THWAITES_SCENE.facts.filter((f) => f.kind === 'real');
    for (const fact of real) expect(card.desc).toContain(fact.text);
    expect(real.map((f) => f.text).join(' ')).toBe(card.desc);
    expect(THWAITES_SCENE.cited.map((s) => s.url)).toEqual(card.sources.map((s) => s.url));
  });

  it('opens with the facts of its first spot', () => {
    const intro = expeditionIntro('thwaites')!;
    expect(intro.paragraphs.map((p) => p.text)).toEqual(sceneFacts(THWAITES_SCENE, 'front').map((f) => f.text));
    expect(intro.sources).toBe(THWAITES_SCENE.cited);
  });
});
