import { describe, expect, it } from 'vitest';
import {
  PTS, buildMarkers, markerPress, fanOffsets, guideLine, markerLift, MARKER_STICK_PX, MARKER_GAP_PX, markerGap, geometry, keyView, labelSide, project, unproject,
  zoomAround, wheelFactor, focusWorld, freeArea, needsFraming, clampView, HOME, MAX_K, MIN_K, toScreen,
} from '../src/index.ts';

describe('projection', () => {
  it('maps the south pole to the center', () => {
    expect(project(0, -90)).toEqual({ x: 500, y: 500 });
  });

  it('puts Greenwich up and the 60° S parallel at r = 426', () => {
    const p = project(0, -60);
    expect(p.x).toBeCloseTo(500, 6);
    expect(p.y).toBeCloseTo(500 - 426.04, 1);
  });

  it('places 90° E to the right of the pole', () => {
    const p = project(90, -70);
    expect(p.x).toBeGreaterThan(500);
    expect(p.y).toBeCloseTo(500, 6);
  });

  it.each([
    ['Isla Marambio', -56.62, -64.24, 196, 300],
    ['Ushuaia', -68.3, -54.8, 31, 314],
    ['Orcadas', -44.74, -60.74, 208, 205],
  ])('matches the prototype position of %s', (_, lon, lat, x, y) => {
    const p = project(lon, lat);
    expect(Math.abs(p.x - x)).toBeLessThan(2);
    expect(Math.abs(p.y - y)).toBeLessThan(2);
  });

  it.each([
    ['Isla Marambio', -56.62, -64.24],
    ['Orcadas', -44.74, -60.74],
    ['Polo Sur', 0, -90],
    ['Ushuaia', -68.3, -54.8],
    // North of the equator too: the 3D map draws the rest of the world up to 60° N.
    ['Madrid', -3.7, 40.4],
  ])('round-trips through unproject for %s', (_, lon, lat) => {
    const p = project(lon, lat);
    const back = unproject(p.x, p.y);
    if (lat === -90) {
      expect(Math.abs(back.lat - lat)).toBeLessThan(1e-9);
    } else {
      expect(Math.abs(back.lon - lon)).toBeLessThan(1e-9);
      expect(Math.abs(back.lat - lat)).toBeLessThan(1e-9);
    }
  });
});

describe('fanning out crowded markers (#238)', () => {
  const at = (left: number, top: number) => ({ left, top });
  const gapOf = (ps: { left: number; top: number }[], o: { dx: number; dy: number }[], i: number, j: number) =>
    Math.hypot(ps[i].left + o[i].dx - ps[j].left - o[j].dx, ps[i].top + o[i].dy - ps[j].top - o[j].dy);

  it('leaves markers that are far enough apart where they are', () => {
    expect(fanOffsets([at(0, 0), at(MARKER_GAP_PX, 0), at(500, 500)])).toEqual([{ dx: 0, dy: 0 }, { dx: 0, dy: 0 }, { dx: 0, dy: 0 }]);
  });

  it('separates two crowded markers to the minimum gap along the line between them, and nothing else moves', () => {
    const ps = [at(100, 100), at(120, 100), at(600, 600)];
    const o = fanOffsets(ps);
    expect(gapOf(ps, o, 0, 1)).toBeCloseTo(MARKER_GAP_PX);
    expect(o[0].dy).toBeCloseTo(0);
    expect(o[0].dx).toBeLessThan(0);
    expect(o[1].dx).toBeGreaterThan(0);
    expect(o[2]).toEqual({ dx: 0, dy: 0 });
  });

  it('moves a pair by half of what is missing, so it separates smoothly while zooming out', () => {
    const o = fanOffsets([at(0, 0), at(MARKER_GAP_PX - 6, 0)]);
    expect(o[0].dx).toBeCloseTo(-3);
    expect(o[1].dx).toBeCloseTo(3);
  });

  it('keeps every marker of a bigger crowd, even on one spot, at least the gap from the others', () => {
    for (const ps of [[at(50, 50), at(50, 50), at(50, 50)], [at(50, 50), at(55, 52), at(48, 58), at(60, 60)]]) {
      const o = fanOffsets(ps);
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) expect(gapOf(ps, o, i, j)).toBeGreaterThan(MARKER_GAP_PX - 0.01);
    }
  });

  // Measured on a phone while dragging the 3D map (#253): the Peninsula against the left edge, with
  // Belgrano, the South Pole and Mount Erebus each just under the gap from the next one.
  const CHAIN = [at(-15, 345), at(-19, 347), at(43, 351), at(-3, 320), at(81, 361.5), at(123.5, 400), at(141, 457)];
  const moved = (o: { dx: number; dy: number }) => Math.hypot(o.dx, o.dy);

  it('does not drag a marker far away because a chain of neighbours reaches it (#253)', () => {
    const o = fanOffsets(CHAIN);
    for (let i = 0; i < CHAIN.length; i++) {
      expect(moved(o[i]), `marker ${i}`).toBeLessThan(MARKER_GAP_PX);
      for (let j = i + 1; j < CHAIN.length; j++) expect(gapOf(CHAIN, o, i, j), `${i} ${j}`).toBeGreaterThan(MARKER_GAP_PX - 0.01);
    }
    // The South Pole and Mount Erebus only touch the end of the chain: they move a little, pushed by
    // their neighbour, less than a quarter of the gap. The polygon took Mount Erebus 219 px away.
    expect(moved(o[5])).toBeLessThan(MARKER_GAP_PX / 4);
    expect(moved(o[6])).toBeLessThan(MARKER_GAP_PX / 4);
  });

  it('moves the markers a little when the map moves a little: no jump when a pair crosses the gap (#253)', () => {
    // Three in a row. The outer ones go from just over the gap to just under it.
    const row = (d: number) => [at(0, 0), at(d, 0), at(2 * d, 0)];
    const far = fanOffsets(row(MARKER_GAP_PX + 0.25));
    const near = fanOffsets(row(MARKER_GAP_PX - 0.25));
    for (let i = 0; i < 3; i++) expect(Math.hypot(far[i].dx - near[i].dx, far[i].dy - near[i].dy), `marker ${i}`).toBeLessThan(1);

    // The chain of the phone, with Mount Erebus half a pixel farther from the South Pole or nearer to it.
    const nudged = (d: number) => CHAIN.map((p, i) => (i === 6 ? at(p.left, p.top + d) : p));
    const a = fanOffsets(nudged(1.2));
    const b = fanOffsets(nudged(0.7));
    for (let i = 0; i < CHAIN.length; i++) expect(Math.hypot(a[i].dx - b[i].dx, a[i].dy - b[i].dy), `marker ${i}`).toBeLessThan(1);
  });

  it('keeps every head a full stick above its place, even when the marker was pushed down', () => {
    expect(markerLift(0, 0)).toBe(MARKER_STICK_PX);
    for (let a = 0; a < 2 * Math.PI; a += 0.1) {
      for (const r of [5, 20, 40, 80]) {
        const dx = r * Math.cos(a);
        const dy = r * Math.sin(a);
        // Where the head ends up over its place: lift - dy px up.
        expect(markerLift(dx, dy) - dy, `${dx} ${dy}`).toBeGreaterThanOrEqual(MARKER_STICK_PX - 1e-9);
        expect(guideLine(dx, dy, markerLift(dx, dy)).length).toBeGreaterThanOrEqual(MARKER_STICK_PX - 1e-9);
      }
    }
  });

  it('draws the line from a marker head down to its real place', () => {
    // Not moved: straight down, as long as the stick.
    expect(guideLine(0, 0, 34)).toEqual({ length: 34, angle: 0 });
    // Moved 30 px right and 40 px up, 34 px up on its stick: place is 30 px left of the head, 74 px down.
    const g = guideLine(30, -40, 34);
    expect(g.length).toBeCloseTo(Math.hypot(30, 74));
    expect(g.angle).toBeCloseTo(Math.atan2(30, 74));
    // On the 2D map there is no stick: the line goes from the marker to its place.
    expect(guideLine(30, 40, 0).angle).toBeCloseTo(Math.atan2(30, -40));
  });

  // Base Marambio, Fósiles (#7) and Poncho (#9, Base Esperanza) are close together at the tip of the
  // Peninsula: 10 to 12 map units apart, about 75 to 90 km. They never separate by zooming alone.
  // The emperors of Cerro Nevado (#206) are 65 km south of Marambio, with them.
  const PHONE = { vw: 390, vh: 844 };
  const DESKTOP = { vw: 1440, vh: 900 };
  const PENINSULA = ['marambio', 'fosiles', 'poncho', 'cerronevado'];

  it('shows a marker for every point at any zoom and size, with no group', () => {
    for (const size of [PHONE, DESKTOP]) {
      for (let k = 1; k <= MAX_K; k += 0.25) {
        const markers = buildMarkers(size, { k, px: 0, py: 0 }, []);
        expect(markers.map((m) => m.key).sort()).toEqual(PTS.map((p) => p.id).sort());
        expect(markers.every((m) => m.kind === 'point')).toBe(true);
      }
    }
  });

  it('keeps Marambio, Fósiles, Poncho and Cerro Nevado apart on screen at any zoom, each with its line back to its real place', () => {
    for (const size of [PHONE, DESKTOP]) {
      const geo = geometry(size);
      for (let k = 1; k <= MAX_K; k += 0.25) {
        const view = { k, px: 0, py: 0 };
        const pts = buildMarkers(size, view, []).flatMap((m) => (m.kind === 'point' && PENINSULA.includes(m.key) ? [m] : []));
        expect(pts).toHaveLength(PENINSULA.length);
        for (const m of pts) {
          const real = toScreen(geo, view, m.x, m.y);
          expect(m.left - m.dx, `${size.vw} ${k} ${m.key}`).toBeCloseTo(real.left);
          expect(m.top - m.dy, `${size.vw} ${k} ${m.key}`).toBeCloseTo(real.top);
        }
        for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
          expect(Math.hypot(pts[i].left - pts[j].left, pts[i].top - pts[j].top), `${size.vw} ${k}`).toBeGreaterThan(markerGap(size.vw) - 0.01);
        }
      }
    }
  });

  it('leaves a marker at its real place once nothing crowds it', () => {
    const size = DESKTOP;
    const view = { k: 1, px: 0, py: 0 };
    const geo = geometry(size);
    const orcadas = buildMarkers(size, view, []).find((m) => m.key === 'campana');
    const real = toScreen(geo, view, 31.4, 313.5);
    expect(orcadas?.kind === 'point' && orcadas.dx === 0 && orcadas.dy === 0).toBe(true);
    expect(orcadas?.left).toBeCloseTo(real.left);
  });

  it('buildMarkers with identity projector matches standard 2D markers', () => {
    const size = { vw: 1440, vh: 900 };
    const geo = geometry(size);
    const mStandard = buildMarkers(size, HOME, []);
    const mProjector = buildMarkers(size, HOME, [], PTS, (x, y) => toScreen(geo, HOME, x, y));
    expect(mProjector).toEqual(mStandard);
  });

  it('persists and loads view mode, handling storage errors gracefully', async () => {
    const store = new Map<string, string>();
    const fakeStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
    Object.defineProperty(globalThis, 'localStorage', { value: fakeStorage, configurable: true, writable: true });

    const { loadViewMode, saveViewMode } = await import('../src/storage.ts');
    expect(loadViewMode()).toBeNull();
    saveViewMode('3d');
    expect(loadViewMode()).toBe('3d');
    saveViewMode('2d');
    expect(loadViewMode()).toBe('2d');
  });
});

describe('markers and labels', () => {
  it('gives every single marker its label, on any map size: the interface shows one at a time', () => {
    for (const [size, view] of [[{ vw: 1440, vh: 900 }, { k: 2.5, px: -400, py: -400 }], [{ vw: 390, vh: 844 }, HOME]] as const) {
      const singles = buildMarkers(size, view, []).filter((m) => m.kind === 'point');
      expect(singles.length).toBeGreaterThan(0);
      for (const m of singles) expect(m.kind === 'point' && m.label?.title, m.key).toBe(m.kind === 'point' && m.point.title);
    }
  });

  it('opens on the first touch just like a mouse click or keyboard activation', () => {
    expect(markerPress(null, 'campana', true)).toBe('open');
    expect(markerPress('campana', 'campana', true)).toBe('open');
    expect(markerPress('campana', 'orcadas', true)).toBe('open');
    expect(markerPress(null, 'campana', false)).toBe('open');
  });

  it('marks the explored point with a check and no pulse', () => {
    const size = { vw: 1440, vh: 900 };
    const markers = buildMarkers(size, { k: MAX_K, px: -800, py: -1000 }, ['orcadas']);
    const a = markers.find((m) => m.key === 'orcadas');
    expect(a?.kind === 'point' && a.check && !a.pulse).toBe(true);
  });

  it('gives the unfinished expedition of «Continuar» the same halo and pulse', () => {
    const size = { vw: 1440, vh: 900 };
    const markers = buildMarkers(size, HOME, [], PTS, undefined, undefined, 'orcadas');
    const m = markers.find((k) => k.key === 'orcadas');
    expect(m?.kind === 'point' && m.next && m.pulse && m.cls.split(' ').includes('next')).toBe(true);
    if (m?.kind === 'point') {
      expect(m.aria).toContain('Continuar');
      expect(m.label?.sub.startsWith('Continuar · ')).toBe(true);
    }
    // Other expeditions stay plain.
    expect(markers.filter((k) => k.kind === 'point' && k.next)).toHaveLength(1);
  });

  it('highlights and pulses only the suggested next expedition', () => {
    const size = { vw: 1440, vh: 900 };
    const markers = buildMarkers(size, HOME, [], PTS, undefined, 'campana');
    const next = markers.find((m) => m.key === 'campana');
    const otherA = markers.find((m) => m.kind === 'point' && m.point.tier === 'A' && m.key !== 'campana');
    expect(next?.kind === 'point').toBe(true);
    if (next?.kind === 'point') {
      expect(next.next).toBe(true);
      expect(next.pulse).toBe(true);
      expect(next.cls.split(' ')).toContain('next');
      expect(next.aria).toBe('Desde Ushuaia, Ushuaia. Expedición sugerida para seguir. Empezar.');
      expect(next.label?.sub).toBe('Siguiente · Ushuaia');
    }
    expect(otherA?.kind === 'point').toBe(true);
    if (otherA?.kind === 'point') {
      expect(otherA.next).toBe(false);
      expect(otherA.pulse).toBe(false);
      expect(otherA.cls.split(' ')).not.toContain('next');
    }
  });

  it('keeps the suggested expedition on its own marker even when it is fanned out', () => {
    const size = { vw: 1440, vh: 900 };
    const markers = buildMarkers(size, HOME, ['campana', 'marambio'], PTS, undefined, 'fosiles');
    const next = markers.find((m) => m.kind === 'point' && m.next);
    expect(next?.key).toBe('fosiles');
    expect(next?.kind === 'point' && next.pulse).toBe(true);
    expect(next?.kind === 'point' && next.cls.split(' ')).toEqual(expect.arrayContaining(['next']));
    expect(markers.filter((m) => m.kind === 'point' && m.next)).toHaveLength(1);
  });

  it('opens a label to the right, or to the left when it would run off the screen', () => {
    expect(labelSide(100, 'Estación', 'Ampliación prevista', 1440)).toBe('right');
    expect(labelSide(1400, 'Estación', 'Ampliación prevista', 1440)).toBe('left');
    // A marker at the left edge of a phone: the label would be cut on the left, so it goes right.
    expect(labelSide(20, 'Desde Ushuaia', 'Ushuaia', 390)).toBe('right');
    expect(labelSide(370, 'Desde Ushuaia', 'Ushuaia', 390)).toBe('left');
  });
});

describe('viewport', () => {
  const size = { vw: 390, vh: 844 };

  it('keeps zoom between 1 and 5', () => {
    expect(zoomAround(size, HOME, 195, 400, 20).k).toBe(MAX_K);
    expect(zoomAround(size, HOME, 195, 400, 0.1).k).toBe(MIN_K);
  });

  it('keeps the map point under the cursor fixed when zooming', () => {
    const { S, ox, oy } = geometry(size);
    const v = zoomAround(size, HOME, 200, 420, 2);
    const before = { u: (200 - ox) / S, v: (420 - oy) / S };
    expect((200 - ox - v.px) / (S * v.k)).toBeCloseTo(before.u, 6);
    expect((420 - oy - v.py) / (S * v.k)).toBeCloseTo(before.v, 6);
  });

  it('zooms in proportion to the wheel delta, clamped per event', () => {
    expect(wheelFactor(-100)).toBeGreaterThan(1.15);
    expect(wheelFactor(-100)).toBeLessThan(1.25);
    expect(wheelFactor(100)).toBeCloseTo(1 / wheelFactor(-100), 6);
    expect(wheelFactor(-4)).toBeLessThan(1.01);
    expect(wheelFactor(-3, 1)).toBeCloseTo(wheelFactor(-99), 6);
    expect(wheelFactor(-5000)).toBe(wheelFactor(-150));
  });

  it('handles arrow and +/- keys', () => {
    expect(keyView(size, HOME, '+')!.k).toBeCloseTo(1.5);
    expect(keyView(size, { k: 2, px: -200, py: -200 }, 'ArrowLeft')!.px).toBe(-140);
    expect(keyView(size, HOME, 'a')).toBeNull();
  });

  it('frames a marker hidden behind the card into the free area and respects clampView', () => {
    const desktop = { vw: 1440, vh: 900 };
    const card = { left: 952, top: 600, right: 1352, bottom: 880 };
    const free = freeArea(desktop, card);
    expect(free).toEqual({ left: 0, top: 0, right: 952, bottom: 900 });

    const visibleMarker = { left: 400, top: 450 };
    expect(needsFraming(visibleMarker, free, 48)).toBe(false);

    const coveredMarker = { left: 1100, top: 700 };
    expect(needsFraming(coveredMarker, free, 48)).toBe(true);

    const anchorX = (free.left + free.right) / 2 / desktop.vw;
    const anchorY = (free.top + free.bottom) / 2 / desktop.vh;
    const framed = focusWorld(desktop, 500, 500, 2.5, anchorY, anchorX);
    const pos = toScreen(geometry(desktop), framed, 500, 500);
    expect(needsFraming(pos, free, 48)).toBe(false);

    // Extreme point still respects clampView bounds.
    const clamped = focusWorld(desktop, 0, 0, MAX_K, anchorY, anchorX);
    expect(clamped).toEqual(clampView(desktop, clamped.k, clamped.px, clamped.py));
  });

  it('returns top free area for a portrait bottom sheet', () => {
    const portrait = { vw: 390, vh: 844 };
    const sheet = { left: 0, top: 520, right: 390, bottom: 844 };
    const free = freeArea(portrait, sheet);
    expect(free).toEqual({ left: 0, top: 0, right: 390, bottom: 520 });
    expect(needsFraming({ left: 195, top: 650 }, free, 48)).toBe(true);
    expect(needsFraming({ left: 195, top: 260 }, free, 48)).toBe(false);
  });
});
