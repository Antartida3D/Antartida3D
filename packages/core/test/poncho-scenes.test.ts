import { describe, expect, it } from 'vitest';
import {
  MAX_SCENE_ELEMENTS,
  MAX_SCENE_PEOPLE,
  MAX_SCENE_RADIUS,
  MAX_SCENE_TOTAL,
  SCENE_SETTINGS,
  SCENE_TURN_LENGTH,
  STAGE_ENTER_S,
  MAX_POLAR_DEG,
  SHOT_DISTANCE,
  SHOT_ELEVATION_DEG,
  SHOT_TARGET_HEIGHT,
  essentialSentences,
  shotPose,
  PONCHO_MILESTONES,
  PONCHO_SCENES,
  SCENE_ACTIONS,
  SCENE_STRIDE,
  SCENE_UNIT_MAX,
  SCENE_UNIT_MIN,
  minCameraDistance,
  printCount,
  printPlace,
  printsShown,
  sceneBodyRadius,
  sceneCoastZ,
  sceneElementShown,
  sceneElementsOverlap,
  sceneStepCount,
  sceneTrack,
  sceneWalk,
  stageProgress,
  stageScale,
  sceneCameraOffset,
  sceneCenter,
  sceneHop,
  scenePathProgress,
  scenePathLength,
  scenePersonPhase,
  sceneUnit,
  voyageHeading,
  voyageStops,
  walkPhase,
  walkPosition,
  yawToward,
} from '../src/index.ts';

const scenes = Object.entries(PONCHO_SCENES);

describe('scenes of Poncho: data', () => {
  it('belong to real stops of the trip of the dogs', () => {
    const ids = PONCHO_MILESTONES.map((m) => m.id);
    for (const [id] of scenes) expect(ids).toContain(id);
    // The first five priorities of the issue have one.
    for (const id of ['nacimiento', 'expedicion-invernal-1962', 'poncho-perro-guia', 'rescate-ae-205', 'brujula-perdida']) {
      expect(PONCHO_SCENES[id], id).toBeDefined();
    }
  });

  for (const [id, scene] of scenes) {
    describe(id, () => {
      it('stays within its element, people and radius limits (at once, at every step, and in all)', () => {
        expect(scene.elements.length).toBeLessThanOrEqual(MAX_SCENE_TOTAL);
        for (let step = 0; step < sceneStepCount(scene); step++) {
          const shown = scene.elements.filter((e) => sceneElementShown(e, step));
          expect(shown.length, `step ${step}`).toBeLessThanOrEqual(MAX_SCENE_ELEMENTS);
          expect(shown.filter((e) => e.kind === 'person').length, `people at step ${step}`).toBeLessThanOrEqual(MAX_SCENE_PEOPLE);
        }
        expect(scene.radius).toBeLessThanOrEqual(MAX_SCENE_RADIUS);
        expect(scene.paths.filter((p) => p.prints).length).toBeLessThanOrEqual(1);
      });

      it('keeps every position, and every point of every path, inside its radius', () => {
        for (const e of scene.elements) expect(Math.hypot(e.x, e.z), `${e.kind} ${e.id}`).toBeLessThanOrEqual(scene.radius);
        for (const p of scene.paths) {
          for (const q of [p.from, ...(p.via ?? []), p.to]) expect(Math.hypot(q[0], q[1])).toBeLessThanOrEqual(scene.radius);
        }
      });

      it('uses known actions, finite numbers and paths that exist', () => {
        const pathIds = scene.paths.map((p) => p.id);
        for (const e of scene.elements) {
          if (e.action) expect(SCENE_ACTIONS).toContain(e.action);
          if (e.path) expect(pathIds).toContain(e.path);
          for (const v of [e.x, e.z, e.yaw, e.scale ?? 1, e.phaseOffset ?? 0, e.lead ?? 0, e.side ?? 0]) expect(Number.isFinite(v)).toBe(true);
        }
        for (const e of scene.elements.filter((x) => x.kind === 'person')) expect(e.action, 'a person needs an action').toBeDefined();
      });

      it('has a known setting, and on a coast everything stands on the ice, clear of the sea', () => {
        expect(SCENE_SETTINGS).toContain(scene.setting);
        if (scene.setting !== 'coast') return;
        for (const e of scene.elements) {
          for (const [x, z] of sceneTrack(scene, e)) expect(z + sceneBodyRadius(e), `${e.kind} ${e.id}`).toBeLessThan(sceneCoastZ(x) - 0.5);
        }
      });

      it('has sound stages: each element shows at some step, and its tour starts with something', () => {
        const steps = sceneStepCount(scene);
        for (const e of scene.elements) {
          expect(e.appearAt ?? 0, `${e.id} appearAt`).toBeGreaterThanOrEqual(0);
          expect(e.appearAt ?? 0, `${e.id} appearAt`).toBeLessThan(steps);
          expect(e.until ?? steps, `${e.id} until`).toBeGreaterThan(e.appearAt ?? 0);
          expect(Number.isFinite(e.lag ?? 0)).toBe(true);
        }
        expect(scene.elements.some((e) => sceneElementShown(e, 0))).toBe(true);
      });

      it('has ropes that go from a person with a path to a dog that follows the same path', () => {
        scene.elements.forEach((e) => {
          if (!e.rope) return;
          const dogEl = scene.elements[e.rope.to];
          expect(e.kind).toBe('person');
          expect(dogEl?.kind).toBe('dog');
          expect(dogEl.path).toBe(e.path);
          expect(e.rope.length).toBeGreaterThan(1);
          // They show together, or the line would hang from nothing.
          expect(dogEl.appearAt ?? 0).toBe(e.appearAt ?? 0);
          expect(dogEl.until).toBe(e.until);
        });
      });

      it('has no one walking through anyone or anything: every point of a walk keeps clear of the bodies that show with it', () => {
        const steps = sceneStepCount(scene);
        scene.elements.forEach((a, i) => {
          scene.elements.forEach((b, j) => {
            if (j <= i || !sceneElementsOverlap(a, b, steps)) return;
            // Only walks are checked, not how the still things are laid out; the ones in one file keep their formation.
            if (!a.path && !b.path) return;
            if (a.path && a.path === b.path) return;
            const ta = sceneTrack(scene, a);
            const tb = sceneTrack(scene, b);
            const need = sceneBodyRadius(a) + sceneBodyRadius(b);
            const closest = Math.min(...ta.flatMap(([ax, az]) => tb.map(([bx, bz]) => Math.hypot(ax - bx, az - bz))));
            expect(closest, `${a.kind} ${a.id} (${i}) and ${b.kind} ${b.id} (${j})`).toBeGreaterThanOrEqual(need);
          });
        });
      });

      it('looks from above the polar limit of the map, and never closer than the map allows', () => {
        expect(scene.camera.distanceFactor).toBeGreaterThanOrEqual(1);
        expect(scene.camera.elevationDeg).toBeGreaterThanOrEqual(90 - MAX_POLAR_DEG);
        expect(scene.camera.elevationDeg).toBeLessThan(90);
      });

      it('has one shot per sentence of the stop, in order, looking inside the scene from a valid camera', () => {
        const stop = PONCHO_MILESTONES.find((m) => m.id === id)!;
        const sentences = essentialSentences(stop.essential.text);
        expect(scene.shots.length).toBe(sentences.length);
        scene.shots.forEach((shot, i) => {
          expect(shot.sentence).toBe(i);
          expect(Math.hypot(shot.target[0], shot.target[2]), `shot ${i} target`).toBeLessThanOrEqual(scene.radius);
          expect(shot.target[1]).toBeGreaterThanOrEqual(SHOT_TARGET_HEIGHT[0]);
          expect(shot.target[1]).toBeLessThanOrEqual(SHOT_TARGET_HEIGHT[1]);
          expect(shot.distance).toBeGreaterThanOrEqual(SHOT_DISTANCE[0]);
          expect(shot.distance).toBeLessThanOrEqual(SHOT_DISTANCE[1]);
          expect(shot.elevation).toBeGreaterThanOrEqual(SHOT_ELEVATION_DEG[0]);
          expect(shot.elevation).toBeLessThanOrEqual(SHOT_ELEVATION_DEG[1]);
          expect(Math.abs(shot.azimuth)).toBeLessThanOrEqual(360);
          // The camera stays above the ground.
          expect(shotPose(shot).eye[1]).toBeGreaterThan(0);
        });
      });

      it('has no scene on a stop that does not exist on the dogs trip, and the stop has no place of its own', () => {
        const stop = voyageStops('dogs').find((s) => s.milestone.id === id);
        expect(stop).toBeDefined();
        expect(stop!.milestone.place).toBeUndefined();
      });
    });
  }

  it('tells every stop of the trip in stages: each sentence after the first brings something new into the scene', () => {
    for (const { milestone } of voyageStops('dogs')) {
      const scene = PONCHO_SCENES[milestone.id];
      expect(scene, milestone.id).toBeDefined();
      for (let step = 1; step < sceneStepCount(scene); step++) {
        expect(scene.elements.some((e) => (e.appearAt ?? 0) === step), `${milestone.id}, step ${step}`).toBe(true);
      }
    }
  });

  it('has the paths that walk with prints with several prints', () => {
    const walker = PONCHO_SCENES.nacimiento.paths.find((p) => p.prints)!;
    expect(printCount(walker)).toBeGreaterThan(4);
    expect(scenePathLength(walker)).toBeGreaterThan(SCENE_STRIDE);
  });

  it('tells «Nace Poncho» in three stages: each sentence shows something that was not there', () => {
    const scene = PONCHO_SCENES.nacimiento;
    expect(scene.setting).toBe('coast');
    const shown = (step: number) => scene.elements.filter((e) => sceneElementShown(e, step));
    const dogs = (step: number) => shown(step).filter((e) => e.kind === 'dog');
    // 1: men, a pup and its mother. 2: a litter. 3: training with a belt, a sled and a slalom.
    expect(shown(0).filter((e) => e.kind === 'person').length).toBeGreaterThanOrEqual(2);
    expect(dogs(0).some((e) => (e.scale ?? 1) < 0.6)).toBe(true);
    expect(dogs(1).filter((e) => (e.scale ?? 1) <= 0.55).length).toBeGreaterThanOrEqual(3);
    expect(shown(1).some((e) => e.kind === 'person')).toBe(false);
    expect(shown(2).some((e) => e.rope)).toBe(true);
    expect(shown(2).some((e) => e.id === 'slalomPoles')).toBe(true);
    expect(shown(2).some((e) => e.kind === 'sled')).toBe(true);
    expect(shown(0).some((e) => e.rope || e.kind === 'sled')).toBe(false);
  });
});

describe('scenes of Poncho: rules', () => {
  it('scenePersonPhase: deterministic, in [0, 2 pi) and moves with the clock', () => {
    for (const t of [-3, 0, 0.4, 7.9, 1234.5]) {
      const p = scenePersonPhase(t, 1.2);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(Math.PI * 2);
      expect(scenePersonPhase(t, 1.2)).toBe(p);
    }
    expect(scenePersonPhase(0.2, 0)).not.toBe(scenePersonPhase(0.3, 0));
    expect(scenePersonPhase(0, 2)).toBeCloseTo(2, 9);
    expect(scenePersonPhase(5, 0, 0)).toBe(0);
  });

  it('walkPosition: starts and ends on the path, clamps, and faces where it goes', () => {
    const path = { id: 'a', from: [0, 0], to: [3, 0], delay: 1, duration: 2 } as const;
    expect(walkPosition(path, 0)).toMatchObject({ x: 0, z: 0 });
    expect(walkPosition(path, 1)).toMatchObject({ x: 3, z: 0 });
    expect(walkPosition(path, 0.5).x).toBeCloseTo(1.5, 9);
    expect(walkPosition(path, 7)).toEqual(walkPosition(path, 1));
    expect(walkPosition(path, -2)).toEqual(walkPosition(path, 0));
    expect(Math.abs(walkPosition(path, 0.3).yaw)).toBeLessThan(1e-9);
    // +z is the one three.js turns to with a yaw of -pi/2.
    expect(yawToward(0, 0, 0, 1)).toBeCloseTo(-Math.PI / 2, 9);
  });

  it('walkPosition: follows a path with corners, and turns into them instead of snapping', () => {
    const path = { id: 'c', from: [0, 0], via: [[2, 0]], to: [2, 2], delay: 0, duration: 4 } as const;
    expect(scenePathLength(path)).toBeCloseTo(4, 9);
    expect(walkPosition(path, 0.25)).toMatchObject({ x: 1, z: 0 });
    expect(walkPosition(path, 0.5)).toMatchObject({ x: 2, z: 0 });
    expect(walkPosition(path, 0.75).z).toBeCloseTo(1, 9);
    expect(walkPosition(path, 0.75).x).toBeCloseTo(2, 9);
    // Far from the corner it faces along the segment; at the corner, half way between the two directions.
    expect(walkPosition(path, 0.1).yaw).toBeCloseTo(0, 9);
    expect(walkPosition(path, 0.9).yaw).toBeCloseTo(yawToward(2, 0, 2, 2), 9);
    expect(walkPosition(path, 0.5).yaw).toBeCloseTo(yawToward(0, 0, 1, 0) / 2 + yawToward(2, 0, 2, 2) / 2, 9);
    // No jump anywhere along the walk.
    let prev = walkPosition(path, 0).yaw;
    for (let i = 1; i <= 200; i++) {
      const yaw = walkPosition(path, i / 200).yaw;
      expect(Math.abs(yaw - prev)).toBeLessThan(SCENE_TURN_LENGTH > 0 ? 0.2 : 1);
      prev = yaw;
    }
  });

  it('sceneWalk: waits for the delay and its lag, ends at the end of a walk, and goes round and round on a loop', () => {
    const walk = { id: 'w', from: [0, 0], to: [4, 0], delay: 1, duration: 2 } as const;
    expect(sceneWalk(walk, 0.5)).toMatchObject({ x: 0, moving: false, travel: 0 });
    expect(sceneWalk(walk, 2)).toMatchObject({ x: 2, moving: true });
    expect(sceneWalk(walk, 9)).toMatchObject({ x: 4, moving: false, travel: 4 });
    // Someone 1 s behind is half way along when the head of the file is at the end... (1 s of 2 s)
    expect(sceneWalk(walk, 3, 1).x).toBeCloseTo(2, 9);
    // One ahead (negative lag) is farther along.
    expect(sceneWalk(walk, 1.5, -0.5).x).toBeCloseTo(2, 9);
    const loop = { id: 'l', from: [0, 0], via: [[2, 0], [2, 2]], to: [0, 0], loop: true, delay: 0, duration: 4 } as const;
    const lap = scenePathLength(loop);
    expect(sceneWalk(loop, 4.0)).toMatchObject({ x: 0, z: 0, moving: true });
    expect(sceneWalk(loop, 5).x).toBeCloseTo(sceneWalk(loop, 1).x, 9);
    // The distance walked does not wrap: the stride of the legs goes on.
    expect(sceneWalk(loop, 9).travel).toBeCloseTo((9 / 4) * lap, 9);
  });

  it('printPlace follows the corners of a path, in order', () => {
    const path = { id: 'p', from: [0, 0], via: [[2.2, 0]], to: [2.2, 2.2], delay: 0, duration: 4 } as const;
    const first = printPlace(path, 0);
    const second = printPlace(path, 1);
    expect([first.x, first.z]).toEqual([0, 0]);
    expect(second.x).toBeCloseTo(SCENE_STRIDE, 9);
    const last = printPlace(path, printCount(path) - 1);
    expect(last.x).toBeCloseTo(2.2, 1);
    expect(last.z).toBeGreaterThan(1.5);
  });

  it('stages: an element shows from `appearAt` and goes before `until`', () => {
    expect(sceneElementShown({}, 0)).toBe(true);
    expect(sceneElementShown({}, 7)).toBe(true);
    expect(sceneElementShown({ appearAt: 1 }, 0)).toBe(false);
    expect(sceneElementShown({ appearAt: 1 }, 1)).toBe(true);
    expect(sceneElementShown({ until: 1 }, 0)).toBe(true);
    expect(sceneElementShown({ until: 1 }, 1)).toBe(false);
    expect(sceneElementsOverlap({ until: 1 }, { appearAt: 1 }, 3)).toBe(false);
    expect(sceneElementsOverlap({ until: 2 }, { appearAt: 1 }, 3)).toBe(true);
  });

  it('stageProgress grows while shown, sinks while not, stays in 0..1, and is immediate with reduced motion', () => {
    expect(stageProgress(0, true, STAGE_ENTER_S / 2, false)).toBeCloseTo(0.5, 9);
    expect(stageProgress(0.5, true, 10, false)).toBe(1);
    expect(stageProgress(1, false, STAGE_ENTER_S / 4, false)).toBeCloseTo(0.75, 9);
    expect(stageProgress(0.1, false, 10, false)).toBe(0);
    expect(stageProgress(0, true, 0, false)).toBe(0);
    expect(stageProgress(0.3, true, 0, true)).toBe(1);
    expect(stageProgress(0.7, false, 0, true)).toBe(0);
  });

  it('stageScale goes from nothing to its size, with a little overshoot on the way, and never below 0', () => {
    expect(stageScale(0)).toBe(0);
    expect(stageScale(1)).toBeCloseTo(1, 9);
    expect(stageScale(-1)).toBe(0);
    expect(stageScale(2)).toBeCloseTo(1, 9);
    const sizes = Array.from({ length: 21 }, (_, i) => stageScale(i / 20));
    expect(Math.max(...sizes)).toBeGreaterThan(1);
    expect(Math.max(...sizes)).toBeLessThan(1.2);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(0);
  });

  it('scenePathProgress waits for the delay and ends at 1', () => {
    const path = { id: 'a', from: [0, 0], to: [3, 0], delay: 1, duration: 2 } as const;
    expect(scenePathProgress(path, 0.5)).toBe(0);
    expect(scenePathProgress(path, 2)).toBeCloseTo(0.5, 9);
    expect(scenePathProgress(path, 99)).toBe(1);
  });

  it('prints: one cycle of the walk per two prints, and they show as the walker goes', () => {
    const path = { id: 'a', from: [0, 0], to: [4.4, 0], delay: 0, duration: 4 } as const;
    expect(printCount(path)).toBe(Math.floor(4.4 / SCENE_STRIDE) + 1);
    expect(walkPhase(path, 1)).toBeCloseTo((4.4 / (2 * SCENE_STRIDE)) * Math.PI * 2, 9);
    expect(printsShown(path, 0)).toBe(1);
    expect(printsShown(path, 1)).toBe(printCount(path));
    expect(printsShown(path, 0.5)).toBeLessThan(printCount(path));
  });

  it('sceneHop is never negative and stays under the hop height', () => {
    for (let i = 0; i < 40; i++) {
      const h = sceneHop((i / 40) * Math.PI * 2);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0.16 + 1e-9);
    }
  });

  it('sceneUnit follows the distance between its least and most', () => {
    expect(sceneUnit(1)).toBe(SCENE_UNIT_MIN);
    expect(sceneUnit(25)).toBeCloseTo(1.5, 9);
    expect(sceneUnit(10000)).toBe(SCENE_UNIT_MAX);
  });

  it('sceneCameraOffset: the asked distance and elevation, and it turns with the heading', () => {
    const cam = { distanceFactor: 1, elevationDeg: 40, azimuthDeg: -90 };
    const o = sceneCameraOffset(cam, 0, 30);
    expect(Math.hypot(o.x, o.y, o.z)).toBeCloseTo(30, 9);
    expect(o.y).toBeCloseTo(30 * Math.sin((40 * Math.PI) / 180), 9);
    // Heading 0 (+x of the map) with azimuth -90: the camera is at -y of the map (-z of the world).
    expect(o.x).toBeCloseTo(0, 9);
    expect(o.z).toBeLessThan(0);
    const turned = sceneCameraOffset(cam, Math.PI / 2, 30);
    expect(turned.x).toBeGreaterThan(0);
    expect(turned.z).toBeCloseTo(0, 9);
  });

  it('sceneCenter is to the left of the team (local +z)', () => {
    for (const heading of [0, 1, -2.75]) {
      const c = sceneCenter(100, 200, heading);
      // Left of a heading is the next turn of 90 degrees.
      expect((c.x - 100) * -Math.sin(heading) + (c.y - 200) * Math.cos(heading)).toBeGreaterThan(0);
    }
  });

  it('camera distance of every scene is reachable: the stops are on ice, where the closest is 25 or less', () => {
    for (const [id] of scenes) {
      const stop = voyageStops('dogs').find((s) => s.milestone.id === id)!;
      const min = minCameraDistance(stop.pin.x, stop.pin.y);
      expect(min).toBeGreaterThan(0);
      expect(min).toBeLessThanOrEqual(25);
      expect(Number.isFinite(voyageHeading('dogs', stop.t))).toBe(true);
    }
  });
});

describe('essentialSentences', () => {
  it('splits plain sentences and gives back the text', () => {
    const text = 'Uno es así. Dos es otra cosa. Tres cierra.';
    expect(essentialSentences(text)).toEqual(['Uno es así.', 'Dos es otra cosa.', 'Tres cierra.']);
    expect(essentialSentences(text).join(' ')).toBe(text);
  });

  it('does not split inside «quotes», and splits after a closing quote', () => {
    expect(essentialSentences('Aparece una frase: «No trabajó. Nunca más». Poncho se cansa.')).toEqual([
      'Aparece una frase: «No trabajó. Nunca más».',
      'Poncho se cansa.',
    ]);
    expect(essentialSentences('Dice «No trabajó.» Después parte.')).toEqual(['Dice «No trabajó.»', 'Después parte.']);
  });

  it('keeps abbreviations and numbers whole', () => {
    expect(essentialSentences('Llega a la Base Gral. Belgrano en 1964. Pesa 1.500 kg y mide 1,5 m. Sale mañana.')).toEqual([
      'Llega a la Base Gral. Belgrano en 1964.',
      'Pesa 1.500 kg y mide 1,5 m.',
      'Sale mañana.',
    ]);
    expect(essentialSentences('Es el Nº 1 del tiro. Sigue.')).toEqual(['Es el Nº 1 del tiro.', 'Sigue.']);
  });

  it('handles questions, exclamations and openers', () => {
    expect(essentialSentences('¿Quién va? ¡Poncho! ¿Y los demás?')).toEqual(['¿Quién va?', '¡Poncho!', '¿Y los demás?']);
  });

  it('gives one sentence for a text without a stop, and none for an empty one', () => {
    expect(essentialSentences('  Sin punto final  ')).toEqual(['Sin punto final']);
    expect(essentialSentences('   ')).toEqual([]);
  });

  it('gives two or three sentences for every stop of the trip, and joins back to its text', () => {
    for (const m of PONCHO_MILESTONES) {
      const sentences = essentialSentences(m.essential.text);
      expect(sentences.length, m.id).toBeGreaterThanOrEqual(2);
      expect(sentences.length, m.id).toBeLessThanOrEqual(3);
      expect(sentences.join(' '), m.id).toBe(m.essential.text);
    }
  });
});

describe('shotPose', () => {
  it('stands `distance` from the target at the elevation and azimuth of the shot', () => {
    const { eye, target } = shotPose({ sentence: 0, target: [1, 0.5, -2], distance: 4, elevation: 30, azimuth: 90 });
    expect(target).toEqual([1, 0.5, -2]);
    expect(Math.hypot(eye[0] - 1, eye[1] - 0.5, eye[2] + 2)).toBeCloseTo(4, 9);
    expect(eye[1] - 0.5).toBeCloseTo(4 * Math.sin(Math.PI / 6), 9);
    // Azimuth 90: on the +z side of the target.
    expect(eye[0]).toBeCloseTo(1, 9);
    expect(eye[2]).toBeGreaterThan(-2);
  });
});
