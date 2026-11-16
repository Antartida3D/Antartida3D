import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DRAKE_STORM,
  FLIGHT_CRUISE,
  PLANE_TURBULENCE,
  FUEGIA_MIN_DISTANCE,
  ICE_MIN_DISTANCE,
  MAX_POLAR_DEG,
  FUEGIA_LAND_MASK,
  GEAR_TAP_MS,
  PONCHO_MILESTONES,
  PONCHO_TRANSPORT,
  IRIZAR_ARRIVAL_POSE,
  IRIZAR_HALF_BEAM,
  ORCADAS_DEFAULT_SHIP_SIZE,
  ORCADAS_HELICOPTER_SECONDS,
  ORCADAS_POINT,
  ORCADAS_SHIP_LENGTH,
  ORCADAS_SHIP_PHASE,
  ORCADAS_SHIP_SECONDS,
  ORCADAS_SHORE,
  ORCADAS_TRAVEL_SECONDS,
  ORCADAS_ZODIAC_SECONDS,
  ROUTE_LENGTH,
  SHIP_ANCHORAGE,
  SHIP_HEAD_START,
  ZODIAC_LOWER_PHASE,
  ZODIAC_SHIP_RATIO,
  MILESTONES,
  EXPEDITION,
  SIGHTINGS,
  SIGHTING_WINDOW_BRIEF,
  TRANSPORTS,
  VOYAGE_GEARS,
  VOYAGE_SECONDS,
  VOYAGE_SOURCES,
  VOYAGE_SOURCE_CODES,
  voyageSourceNumber,
  VOYAGE_TOURISM_NOTE,
  VOYAGE_TRANSFER,
  advanceVoyage,
  closeVoyageCard,
  openVoyageCard,
  flightClearance,
  fuegiaWorldHeight,
  heightAt,
  irizarArrivalWorldPose,
  minCameraDistance,
  expeditionAt,
  nextGear,
  orcadasTravelAt,
  orcadasTravelLength,
  orcadasTravelMs,
  quizScore,
  retreatVoyage,
  routeAt,
  shipDeckPose,
  shipWaterY,
  sightingsInView,
  parseTerrainMesh,
  planeTurbulence,
  project,
  skipToNextStop,
  startVoyage,
  voyageStopAt,
  stormAt,
  stormCeiling,
  toWorld,
  transferAt,
  unproject,
  voyageArrived,
  voyageAt,
  voyageHeading,
  voyageLength,
  voyageProgress,
  voyageSightings,
  voyageStops,
  worldHeight,
  type VoyageFact,
} from '../src/index.ts';

const USHUAIA = project(-68.3, -54.81);
const MARAMBIO = project(-56.62, -64.23);
const facts: VoyageFact[] = [
  VOYAGE_TOURISM_NOTE,
  ...TRANSPORTS.flatMap((v) => v.facts),
  ...MILESTONES.flatMap((m) => [m.essential, ...m.more]),
  ...SIGHTINGS.map((s) => s.fact),
  ...Object.values(EXPEDITION).flatMap((stop) => stop.notes.map((n) => n.fact)),
  // The trip of Poncho follows the same rules: a source for every real fact, and no source left uncited.
  ...PONCHO_TRANSPORT.facts,
  ...PONCHO_MILESTONES.flatMap((m) => [m.essential, ...m.more]),
  ...VOYAGE_TRANSFER.facts,
];

describe('voyage content', () => {
  it('cites a catalogued source for every real fact', () => {
    for (const fact of facts) {
      if (fact.kind === 'real') expect(fact.sources.length, fact.text).toBeGreaterThan(0);
      for (const code of fact.sources) expect(VOYAGE_SOURCES[code], code).toBeDefined();
    }
  });

  it('words what is not a sourced fact so the reader can tell', () => {
    for (const fact of facts) {
      if (fact.kind === 'estimate') expect(fact.text).toMatch(/^Aproximadamente .*\(cálculo propio\)\.$/);
      if (fact.kind === 'illustrative') expect(fact.text).toMatch(/ilustrativ/);
      if (fact.kind !== 'real') expect(fact.sources).toEqual([]);
    }
  });

  it('gives every source an organisation, a title and an https URL', () => {
    for (const source of Object.values(VOYAGE_SOURCES)) {
      expect(source.org).not.toBe('');
      expect(source.title).not.toBe('');
      expect(source.url).toMatch(/^https:\/\//);
    }
  });

  it('numbers the sources from 1, each with its own number', () => {
    const numbers = VOYAGE_SOURCE_CODES.map(voyageSourceNumber);
    expect(numbers).toEqual(numbers.map((_, i) => i + 1));
    expect(numbers).toHaveLength(Object.keys(VOYAGE_SOURCES).length);
  });

  it('lists no source that the content does not cite', () => {
    const cited = new Set(facts.flatMap((f) => f.sources));
    expect(VOYAGE_SOURCE_CODES.filter((code) => !cited.has(code))).toEqual([]);
  });

  it('offers only the Argentine scientific transports', () => {
    expect(TRANSPORTS.map((v) => v.id)).toEqual(['irizar', 'hercules', 'puerto-argentino']);
  });
});

describe.each(['ship', 'plane'] as const)('voyage path (%s)', (kind) => {
  it('ends at Marambio: a plane on the base, a ship off the island', () => {
    const end = voyageAt(kind, 1);
    const fromBase = Math.hypot(end.x - MARAMBIO.x, end.y - MARAMBIO.y);
    if (kind === 'plane') expect(fromBase).toBeLessThan(0.01);
    else {
      // SHIP_ANCHORAGE is measured along the route, which bends a little: in a straight line it is somewhat less.
      expect(fromBase).toBeGreaterThan(0.8 * SHIP_ANCHORAGE);
      expect(fromBase).toBeLessThanOrEqual(SHIP_ANCHORAGE);
    }
  });

  it('opens its milestones in order, the first at departure and the last on arrival', () => {
    const stops = voyageStops(kind);
    expect(stops[0].t).toBe(0);
    expect(stops[stops.length - 1].t).toBe(1);
    for (let i = 1; i < stops.length; i++) expect(stops[i].t).toBeGreaterThan(stops[i - 1].t);
  });

  it('crosses 60° S where that milestone opens', () => {
    const stop = voyageStops(kind).find((s) => s.milestone.id === 'paralelo-60')!;
    const at = voyageAt(kind, stop.t);
    expect(unproject(at.x, at.y).lat).toBeCloseTo(-60, 0);
  });

  it('heads away from Ushuaia at departure', () => {
    const heading = voyageHeading(kind, 0);
    const ahead = voyageAt(kind, 0.01);
    expect(Math.cos(heading) * (ahead.x - USHUAIA.x) + Math.sin(heading) * (ahead.y - USHUAIA.y)).toBeGreaterThan(0);
  });
});

describe('voyage path', () => {
  it('starts in Ushuaia by plane', () => {
    const start = voyageAt('plane', 0);
    expect(Math.hypot(start.x - USHUAIA.x, start.y - USHUAIA.y)).toBeLessThan(0.01);
  });

  it('starts a ship on the sea route, out in the bay, clear of the town at its first point', () => {
    const start = voyageAt('ship', 0);
    expect(start).toEqual(routeAt(SHIP_HEAD_START / ROUTE_LENGTH));
    const fromTown = Math.hypot(start.x - USHUAIA.x, start.y - USHUAIA.y);
    expect(fromTown).toBeGreaterThan(1);
    expect(fromTown).toBeLessThanOrEqual(SHIP_HEAD_START);
  });

  it('skips the sea-only milestones on the plane', () => {
    const ids = voyageStops('plane').map((s) => s.milestone.id);
    expect(ids).toEqual(['beagle', 'drake', 'convergencia', 'paralelo-60', 'marambio']);
    expect(voyageStops('ship')).toHaveLength(MILESTONES.length);
  });

  it('stands the pins of Cabo de Hornos and Base Marambio on those places, not on the path, and every other pin on the path', () => {
    for (const stop of voyageStops('ship')) {
      const onPath = voyageAt('ship', stop.t);
      const off = Math.hypot(stop.pin.x - onPath.x, stop.pin.y - onPath.y);
      if (stop.milestone.id === 'hornos') {
        const { lon, lat } = unproject(stop.pin.x, stop.pin.y);
        expect(lon).toBeCloseTo(-67.27, 2);
        expect(lat).toBeCloseTo(-55.97, 2);
        // The ship passes south-east of the cape, in open sea.
        expect(off).toBeGreaterThan(2);
      } else if (stop.milestone.id === 'marambio') {
        // The ship stays off the island; the pin stands on the base.
        expect(Math.hypot(stop.pin.x - MARAMBIO.x, stop.pin.y - MARAMBIO.y)).toBeLessThan(0.01);
        expect(off).toBeGreaterThan(0.8 * SHIP_ANCHORAGE);
      } else expect(off).toBe(0);
    }
    // The plane lands on the base: its pin is where the flight ends.
    const stops = voyageStops('plane');
    const landing = voyageAt('plane', 1);
    expect(Math.hypot(stops[stops.length - 1].pin.x - landing.x, stops[stops.length - 1].pin.y - landing.y)).toBeLessThan(0.01);
  });

  it('flies a shorter path than the ship sails', () => {
    const length = (kind: 'ship' | 'plane') => {
      let total = 0;
      for (let i = 1; i <= 200; i++) {
        const a = voyageAt(kind, (i - 1) / 200);
        const b = voyageAt(kind, i / 200);
        total += Math.hypot(b.x - a.x, b.y - a.y);
      }
      return total;
    };
    expect(length('plane')).toBeLessThan(length('ship'));
    expect(voyageLength('ship')).toBeCloseTo(length('ship'), 0);
    expect(voyageLength('plane')).toBeCloseTo(length('plane'), 0);
  });
});

describe('arrival of a ship off Marambio', () => {
  const buf = readFileSync(join(import.meta.dirname, '../src/assets/terrain-mesh-hi.bin'));
  const terrain = parseTerrainMesh(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const onLand = (p: { x: number; y: number }) => heightAt(p.x, p.y, terrain) > 0;

  it('stops on the water, with open sea between the ship and the island', () => {
    // The sea route ends on the base, up on the plateau: a ship that sailed all of it ended inside the island.
    expect(onLand(routeAt(1))).toBe(true);
    // The last stretch of the trip never touches land.
    for (let i = 0; i <= 200; i++) expect(onLand(voyageAt('ship', 1 - (i / 200) * 0.02)), `step ${i}`).toBe(false);
    // Past the ship, the route goes on over the water for at least half of the way to the base.
    const end = 1 - SHIP_ANCHORAGE / ROUTE_LENGTH;
    let water = 0;
    while (water < 400 && !onLand(routeAt(end + ((water + 1) / 400) * (1 - end)))) water++;
    expect((water / 400) * SHIP_ANCHORAGE).toBeGreaterThan(SHIP_ANCHORAGE / 2);
  });

  describe('helicopter hop from the ship to the base', () => {
    // The flight deck of the ship where it waits: a little above the water, nose as the ship's.
    const ship = voyageAt('ship', 1);
    const deck = { ...ship, height: 0.4, heading: voyageHeading('ship', 1) };
    const ground = (p: { x: number; y: number }) => Math.max(0, worldHeight(heightAt(p.x, p.y, terrain)));
    const hop = Array.from({ length: 201 }, (_, i) => transferAt(deck, i / 200, terrain));

    it('lifts off the deck of the ship and lands on the plateau of the base', () => {
      expect(hop[0]).toEqual(deck);
      const end = hop[200];
      expect(Math.hypot(end.x - MARAMBIO.x, end.y - MARAMBIO.y)).toBeLessThan(0.01);
      expect(end.height).toBeGreaterThan(0);
      expect(end.height).toBeCloseTo(ground(MARAMBIO), 6);
    });

    it('never flies under the relief, and passes well over it on the way', () => {
      for (const [i, at] of hop.entries()) expect(at.height, `step ${i}`).toBeGreaterThanOrEqual(ground(at));
      const top = Math.max(...hop.map((at) => at.height));
      expect(top).toBeGreaterThan(Math.max(...hop.map(ground)) + 0.5);
    });

    it('goes straight up first and straight down last, without a leap in between', () => {
      expect(hop[10].x).toBe(deck.x);
      expect(hop[10].height).toBeGreaterThan(deck.height);
      expect(hop[190].x).toBeCloseTo(MARAMBIO.x, 6);
      expect(hop[190].height).toBeGreaterThan(hop[200].height);
      const whole = Math.hypot(MARAMBIO.x - deck.x, MARAMBIO.y - deck.y);
      for (let i = 1; i <= 200; i++) {
        const step = Math.hypot(hop[i].x - hop[i - 1].x, hop[i].y - hop[i - 1].y, hop[i].height - hop[i - 1].height);
        expect(step, `step ${i}`).toBeLessThan(whole / 50);
      }
    });

    it('turns its nose to the base the short way round', () => {
      const bearing = Math.atan2(MARAMBIO.y - deck.y, MARAMBIO.x - deck.x);
      expect(Math.cos(hop[200].heading - bearing)).toBeCloseTo(1, 6);
      // Starting almost opposite, it does not go the long way: the turn is never more than half a circle.
      const back = transferAt({ ...deck, heading: bearing + 3 }, 1, terrain);
      expect(Math.abs(back.heading - (bearing + 3))).toBeLessThan(Math.PI);
      expect(Math.cos(back.heading - bearing)).toBeCloseTo(1, 6);
    });
  });

  it('plays the hop only on the Irízar, and says that it is a drawing', () => {
    expect(VOYAGE_TRANSFER.transport).toBe('irizar');
    expect(VOYAGE_TRANSFER.facts.map((f) => f.kind)).toEqual(['real', 'illustrative']);
    expect(VOYAGE_TRANSFER.facts[0].sources).toEqual(['O24']);
  });
});

describe('flight altitude', () => {
  const buf = readFileSync(join(import.meta.dirname, '../src/assets/terrain-mesh-hi.bin'));
  const terrain = parseTerrainMesh(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const ground = (t: number) => {
    const p = voyageAt('plane', t);
    return worldHeight(heightAt(p.x, p.y, terrain));
  };

  it('takes off from the ground and lands on the Marambio plateau', () => {
    expect(flightClearance(0, terrain)).toBe(0);
    expect(flightClearance(1, terrain)).toBeCloseTo(ground(1));
    expect(ground(1)).toBeGreaterThan(0);
  });

  it('flies over the Antarctic relief under its path, never through it', () => {
    let highest = 0;
    for (let i = 0; i < 2000; i++) {
      const t = i / 2000;
      highest = Math.max(highest, ground(t));
      expect(flightClearance(t, terrain), `t=${t}`).toBeGreaterThanOrEqual(ground(t));
    }
    expect(highest).toBeGreaterThan(worldHeight(160)); // the path does cross relief
  });

  it('climbs and descends without steps', () => {
    // Largest change of height between samples 1/2000 of the trip apart (about 0.6 km), in world units.
    let jump = 0;
    for (let i = 1; i <= 2000; i++) jump = Math.max(jump, Math.abs(flightClearance(i / 2000, terrain) - flightClearance((i - 1) / 2000, terrain)));
    expect(jump).toBeLessThan(1);
  });

  it('also clears the relief beside its path, where the wings of the drawn plane reach', () => {
    for (let i = 0; i < 1000; i++) {
      const t = i / 1000;
      const p = voyageAt('plane', t);
      const heading = voyageHeading('plane', t);
      for (const side of [-2.5, 2.5]) {
        const beside = worldHeight(heightAt(p.x - Math.sin(heading) * side, p.y + Math.cos(heading) * side, terrain));
        if (t < 0.98) expect(flightClearance(t, terrain), `t=${t}`).toBeGreaterThanOrEqual(beside);
      }
    }
  });

  it('flies over the land of Tierra del Fuego under its path', () => {
    // Checked against the regional relief mesh, which is built apart from the baked flight profile.
    const raw = readFileSync(join(import.meta.dirname, '../src/assets/fuegia-mesh-hi.bin'));
    const fuegia = parseTerrainMesh(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
    const path = Array.from({ length: 301 }, (_, i) => ({ t: (i / 300) * 0.13, ...voyageAt('plane', (i / 300) * 0.13) }));
    const cell = fuegia.gridSize - 1;
    let checked = 0;
    for (let v = 0; v < fuegia.numVerts; v++) {
      if (fuegia.masks[v] !== FUEGIA_LAND_MASK) continue;
      const x = fuegia.minX + (fuegia.coordsXY[v * 2] / cell) * (fuegia.maxX - fuegia.minX);
      const y = fuegia.minY + (fuegia.coordsXY[v * 2 + 1] / cell) * (fuegia.maxY - fuegia.minY);
      const near = path.reduce((best, p) => (Math.hypot(p.x - x, p.y - y) < Math.hypot(best.x - x, best.y - y) ? p : best));
      // Half the wingspan of the plane as drawn from the departure camera, past the first kilometers of the climb.
      if (Math.hypot(near.x - x, near.y - y) > 0.6 || near.t < 0.012) continue;
      checked++;
      expect(flightClearance(near.t, terrain), `t=${near.t}`).toBeGreaterThan(fuegiaWorldHeight(fuegia.heights[v]));
    }
    expect(checked).toBeGreaterThan(50);
  });

  it('climbs little by little to its cruise height instead of shooting up', () => {
    // Soon after take-off it is only as high as the hills of Navarino need.
    expect(flightClearance(0.02, terrain)).toBeLessThan(FLIGHT_CRUISE * 0.6);
    // Then it keeps climbing, to pass over the storm of the Drake: no step between two samples.
    // The step is measured against the storm it climbs over, which does not change with the exaggeration.
    for (let i = 20; i < 300; i++) {
      const rise = flightClearance((i + 1) / 1000, terrain) - flightClearance(i / 1000, terrain);
      expect(rise, `t=${i / 1000}`).toBeLessThan(DRAKE_STORM.cloudTop * 0.02);
    }
    // Past the storm it is back at its cruise height.
    expect(flightClearance(0.85, terrain)).toBeCloseTo(FLIGHT_CRUISE);
    // Past the last islands (Cape Horn) it only climbs.
    for (let i = 130; i < 250; i++) {
      expect(flightClearance((i + 1) / 1000, terrain), `t=${i / 1000}`).toBeGreaterThanOrEqual(flightClearance(i / 1000, terrain));
    }
  });
});

describe('how the expedition works', () => {
  it('belongs to milestones of the trip', () => {
    const ids = MILESTONES.map((m) => m.id);
    for (const id of Object.keys(EXPEDITION)) expect(ids).toContain(id);
  });

  it('never tells about one transport on another', () => {
    for (const transport of TRANSPORTS) {
      for (const id of Object.keys(EXPEDITION)) {
        const shown = expeditionAt(id, transport.id).notes;
        for (const note of EXPEDITION[id].notes) {
          const fits = (!note.kind || note.kind === transport.kind) && (!note.only || note.only === transport.id);
          expect(shown.includes(note.fact), `${transport.id} at ${id}: ${note.fact.text}`).toBe(fits);
        }
      }
    }
    const plane = Object.keys(EXPEDITION).flatMap((id) => expeditionAt(id, 'hercules').notes.map((f) => f.text)).join(' ');
    expect(plane).not.toMatch(/Irízar|rompehielos|buque|lancha/i);
  });

  it('has something to tell at every stop that has an entry, and a valid question', () => {
    for (const transport of TRANSPORTS) {
      for (const stop of voyageStops(transport.kind)) {
        const { notes, question } = expeditionAt(stop.milestone.id, transport.id);
        if (question) {
          expect(notes.length, `${transport.id} at ${stop.milestone.id}`).toBeGreaterThan(0);
          expect(question.options.length).toBe(3);
          expect(question.options[question.answer]).toBeDefined();
        }
      }
    }
  });

  it('asks how people and cargo reach the base only on the Irízar, and tells only what source O24 says', () => {
    const { question, notes } = expeditionAt('marambio', 'irizar');
    expect(question!.options[question!.answer]).toBe('En helicóptero');
    // The note that answers it comes first, with its source.
    expect(notes[0].text).toMatch(/helicóptero/);
    expect(notes[0].sources).toEqual(['O24']);
    expect(expeditionAt('marambio', 'puerto-argentino').question).toBeNull();
    expect(expeditionAt('marambio', 'hercules').question).toBeNull();
    expect(expeditionAt('shetland', 'irizar').question).toBeNull();
    // The source does not say that the base has no port or pier: the trip does not say it either.
    expect([question!.prompt, ...notes.map((f) => f.text)].join(' ')).not.toMatch(/puerto|muelle/i);
    // Where a ship waits off the island is a drawing, and a ship says so; the plane lands on the base.
    const drawing = (id: 'irizar' | 'puerto-argentino' | 'hercules') =>
      expeditionAt('marambio', id).notes.some((f) => f.kind === 'illustrative' && /frente a la isla/.test(f.text));
    expect(drawing('irizar')).toBe(true);
    expect(drawing('puerto-argentino')).toBe(true);
    expect(drawing('hercules')).toBe(false);
  });

  it('counts the questions answered, and the ones answered right', () => {
    expect(quizScore('irizar', {})).toEqual({ right: 0, answered: 0, total: 3 });
    expect(quizScore('hercules', {})).toEqual({ right: 0, answered: 0, total: 2 });
    expect(quizScore('puerto-argentino', {})).toEqual({ right: 0, answered: 0, total: 2 });
    expect(quizScore('irizar', { beagle: 0, 'paralelo-60': 1, marambio: 0 })).toEqual({ right: 2, answered: 3, total: 3 });
    expect(quizScore('irizar', { beagle: 0, 'paralelo-60': 1, marambio: 2 })).toEqual({ right: 3, answered: 3, total: 3 });
    // The questions are optional (#157): one left unanswered is neither right nor wrong.
    expect(quizScore('irizar', { beagle: 1 })).toEqual({ right: 0, answered: 1, total: 3 });
    // The question of Marambio is about the Irízar: an answer to it does not count on another transport.
    expect(quizScore('hercules', { beagle: 0, 'paralelo-60': 1, marambio: 2 })).toEqual({ right: 2, answered: 2, total: 2 });
    expect(quizScore('puerto-argentino', { beagle: 0, 'paralelo-60': 1, marambio: 2 })).toEqual({ right: 2, answered: 2, total: 2 });
  });
});

describe('sightings', () => {
  const spots = voyageSightings('ship');

  it('gives every animal and place a sourced fact', () => {
    for (const s of SIGHTINGS) {
      expect(s.fact.kind).toBe('real');
      expect(s.fact.sources.length, s.name).toBeGreaterThan(0);
    }
  });

  it('shows them in trip order, with a window inside the trip', () => {
    for (let i = 0; i < spots.length; i++) {
      expect(spots[i].from).toBeGreaterThanOrEqual(0);
      expect(spots[i].to).toBeLessThan(1);
      expect(spots[i].to - spots[i].from).toBeGreaterThan(SIGHTING_WINDOW_BRIEF * 0.6);
      // The ship starts out in the bay: the first ones can already be in view at departure, together.
      if (i > 0) expect(spots[i].from).toBeGreaterThanOrEqual(spots[i - 1].from);
    }
  });

  it('has the ones near Ushuaia in view from the departure, not a moment later', () => {
    const atStart = sightingsInView('ship', 0).map((s) => s.sighting.id);
    expect(atStart).toEqual(expect.arrayContaining(['cormoran', 'eclaireurs', 'lobos']));
    // The rest still come later, along the trip.
    expect(atStart.length).toBeLessThan(spots.length / 2);
  });

  it('has more of them the farther south', () => {
    const fauna = spots.filter((s) => !s.sighting.place);
    const south = fauna.filter((s) => unproject(s.x, s.y).lat < -60).length;
    expect(south).toBeGreaterThan(fauna.length - south);
  });

  it('draws each animal near its anchor on the route and each place where it is', () => {
    for (const s of spots) {
      if (s.sighting.place) {
        const at = project(s.sighting.place[0], s.sighting.place[1]);
        expect(s.x, s.sighting.name).toBeCloseTo(at.x);
        expect(s.y, s.sighting.name).toBeCloseTo(at.y);
        continue;
      }
      const anchor = project(s.sighting.anchor[0], s.sighting.anchor[1]);
      expect(Math.hypot(s.x - anchor.x, s.y - anchor.y), s.sighting.name).toBeLessThan(Math.abs(s.sighting.offset) + 4);
    }
  });

  it('keeps one in view through its window and not after it', () => {
    const first = spots[0];
    const mid = (first.from + first.to) / 2;
    expect(sightingsInView('ship', mid).map((s) => s.sighting.id)).toContain(first.sighting.id);
    expect(sightingsInView('ship', first.from - 0.001).map((s) => s.sighting.id)).not.toContain(first.sighting.id);
    expect(sightingsInView('ship', first.to + 0.001).map((s) => s.sighting.id)).not.toContain(first.sighting.id);
  });

  it('has none from the plane', () => {
    expect(voyageSightings('plane')).toEqual([]);
    expect(sightingsInView('plane', 0.5)).toEqual([]);
  });
});

describe('storm over the Drake Passage', () => {
  const at = (kind: 'ship' | 'plane', t: number) => {
    const p = voyageAt(kind, t);
    return stormAt(p.x, p.y);
  };

  it('covers most of the passage, in open sea between Cape Horn and the South Shetland Islands', () => {
    const { from, to, radius } = DRAKE_STORM;
    const length = Math.hypot(to.x - from.x, to.y - from.y) + 2 * radius;
    const hornos = project(-67.27, -55.98);
    const livingston = project(-60.5, -62.6);
    expect(length).toBeGreaterThan(0.7 * Math.hypot(livingston.x - hornos.x, livingston.y - hornos.y));
    // Clear of the land at both ends, and of the Diego Ramírez Islands.
    for (const [lon, lat] of [[-67.27, -55.98], [-68.7, -56.5], [-60.5, -62.6], [-62.5, -63.0], [-55.2, -61.1]]) {
      const p = project(lon, lat);
      expect(stormAt(p.x, p.y), `${lon}, ${lat}`).toBe(0);
    }
    expect(stormAt(DRAKE_STORM.x, DRAKE_STORM.y)).toBe(1);
    expect(at('ship', 0)).toBe(0);
    expect(at('ship', 1)).toBe(0);
  });

  it('builds up from its edge, all around the band', () => {
    const { from, to, radius } = DRAKE_STORM;
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const along = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
    // Past the end of the middle line, and to one side of its middle.
    const ways = [{ p: to, d: along }, { p: DRAKE_STORM, d: { x: -along.y, y: along.x } }];
    for (const { p, d } of ways) {
      const out = (r: number) => stormAt(p.x + d.x * r, p.y + d.y * r);
      expect(out(radius)).toBeCloseTo(0, 9);
      expect(out(radius - 1)).toBeGreaterThan(0);
      expect(out(radius - 1)).toBeLessThan(out(radius - 3));
    }
  });

  it('lets the camera get close all over it, so the trip camera stays under the clouds', () => {
    for (const kind of ['ship', 'plane'] as const) {
      for (let i = 0; i <= 400; i++) {
        const p = voyageAt(kind, i / 400);
        if (stormAt(p.x, p.y) > 0) expect(minCameraDistance(p.x, p.y), `${kind} ${i}`).toBe(FUEGIA_MIN_DISTANCE);
      }
    }
    // Even tilted as far as it goes, the closest camera fits under the clouds (Voyage3D's STORM_CAMERA_HEIGHT).
    expect(FUEGIA_MIN_DISTANCE * Math.cos((MAX_POLAR_DEG * Math.PI) / 180)).toBeLessThan(DRAKE_STORM.cloudBase - 2);
    // Not past it: south of the storm the camera keeps off the plateau.
    const end = voyageAt('ship', 1);
    expect(minCameraDistance(end.x, end.y)).toBe(ICE_MIN_DISTANCE);
  });

  it('is over the ship from the Drake to the 60° S parallel', () => {
    for (const id of ['drake', 'convergencia', 'paralelo-60']) {
      expect(at('ship', voyageStops('ship').find((s) => s.milestone.id === id)!.t), id).toBe(1);
    }
  });

  it('is flown over by the plane: above the clouds all the way through, with a gentle climb before it', () => {
    let entered = false;
    for (let i = 0; i <= 400; i++) {
      const t = i / 400;
      const p = voyageAt('plane', t);
      if (stormAt(p.x, p.y) === 0) continue;
      entered = true;
      expect(flightClearance(t), `t = ${t}`).toBeGreaterThan(DRAKE_STORM.cloudTop);
    }
    expect(entered).toBe(true);
    // Far from the storm the ceiling is gone, and it builds up without a step.
    const end = voyageAt('plane', 1);
    expect(stormCeiling(end.x, end.y)).toBe(0);
    for (let i = 1; i <= 400; i++) {
      const [a, b] = [voyageAt('plane', (i - 1) / 400), voyageAt('plane', i / 400)];
      expect(Math.abs(stormCeiling(b.x, b.y) - stormCeiling(a.x, a.y)), `step ${i}`).toBeLessThan(1);
    }
  });

  it('shakes the plane a little over it: not outside it, not with reduced motion, never past its limit', () => {
    const axes = ['roll', 'pitch', 'lift'] as const;
    // The plane is well inside the storm at some point of its trip.
    expect(Math.max(...Array.from({ length: 401 }, (_, i) => at('plane', i / 400)))).toBe(1);
    const moved = { roll: 0, pitch: 0, lift: 0 };
    for (let i = 0; i <= 600; i++) {
      const time = i / 30;
      const shake = planeTurbulence(time, 1);
      for (const axis of axes) {
        // Outside the storm the air is calm, at any time.
        expect(Math.abs(planeTurbulence(time, 0)[axis]), `${axis} outside`).toBe(0);
        expect(Math.abs(shake[axis]), `${axis} at ${time}`).toBeLessThanOrEqual(PLANE_TURBULENCE[axis]);
        // It builds up with the storm: half the storm, half the shake.
        expect(planeTurbulence(time, 0.5)[axis]).toBeCloseTo(shake[axis] / 2, 12);
        moved[axis] = Math.max(moved[axis], Math.abs(shake[axis]));
      }
    }
    // It does move, on its three axes.
    for (const axis of axes) expect(moved[axis], axis).toBeGreaterThan(0.6 * PLANE_TURBULENCE[axis]);
    // Reduced motion draws every frame at time 0: the plane stays still.
    for (const axis of axes) expect(Math.abs(planeTurbulence(0, 1)[axis]), `${axis} reduced`).toBe(0);
  });

  it('is where the ship and the plane are when the card of the Drake opens', () => {
    for (const kind of ['ship', 'plane'] as const) {
      const stop = voyageStops(kind).find((s) => s.milestone.id === 'drake')!;
      expect(at(kind, stop.t), kind).toBeGreaterThan(0);
    }
  });

  it('is explained in the card of the Drake, with its source, and owned up as a drawing', () => {
    const drake = MILESTONES.find((m) => m.id === 'drake')!;
    const facts = [drake.essential, ...drake.more];
    expect(facts.some((f) => f.kind === 'real' && f.sources.includes('O46') && /temporales/.test(f.text))).toBe(true);
    expect(facts.some((f) => f.kind === 'illustrative' && /tormenta/.test(f.text))).toBe(true);
  });
});

describe('distance and time travelled', () => {
  it('starts at zero and ends at the whole trip', () => {
    for (const { id } of TRANSPORTS) {
      const { totalKm } = voyageProgress(id, 0);
      expect(voyageProgress(id, 0)).toMatchObject({ km: 0, hours: 0 });
      expect(voyageProgress(id, 1).km).toBeCloseTo(totalKm, 6);
      expect(voyageProgress(id, 2).km).toBeCloseTo(totalKm, 6);
    }
  });

  it('grows along the trip', () => {
    for (const { id } of TRANSPORTS) {
      for (let i = 1; i <= 50; i++) {
        expect(voyageProgress(id, i / 50).km).toBeGreaterThan(voyageProgress(id, (i - 1) / 50).km);
      }
    }
  });

  it('measures the flight as the real distance between Ushuaia and Marambio, not in map units', () => {
    // The transport card gives about 1,230 km in a straight line.
    const { totalKm } = voyageProgress('hercules', 1);
    expect(totalKm).toBeGreaterThan(1230);
    expect(totalKm).toBeLessThan(1300);
  });

  it('has a longer way by sea than by air', () => {
    expect(voyageProgress('irizar', 1).totalKm).toBeGreaterThan(voyageProgress('hercules', 1).totalKm);
  });

  it('takes the hours of the distance at the cruise speed of each transport', () => {
    for (const { id, cruiseKmh } of TRANSPORTS) {
      const { km, hours } = voyageProgress(id, 0.5);
      expect(hours).toBeCloseTo(km / cruiseKmh, 9);
    }
    // 14 and 15 knots: the faster ship takes less over the same route.
    expect(voyageProgress('puerto-argentino', 1).hours).toBeLessThan(voyageProgress('irizar', 1).hours);
  });
});

describe('advance gears', () => {
  it('shifts up on a quick second press and tops out', () => {
    expect(nextGear(0, GEAR_TAP_MS)).toBe(1);
    expect(nextGear(1, 100)).toBe(2);
    expect(nextGear(VOYAGE_GEARS.length - 1, 100)).toBe(VOYAGE_GEARS.length - 1);
  });

  it('goes back to the first gear after a pause', () => {
    expect(nextGear(2, GEAR_TAP_MS + 1)).toBe(0);
    expect(VOYAGE_GEARS[0]).toBe(1);
  });
});

describe('voyage state', () => {
  const ship = voyageStops('ship');
  const last = ship.length - 1;

  it('sets off at once: the departure is offered, not opened', () => {
    const s = startVoyage('irizar');
    expect(s.card).toBe(-1);
    expect(voyageStopAt(s)).toBe(0);
    expect(advanceVoyage(s, 1).t).toBeCloseTo(1 / VOYAGE_SECONDS.ship);
  });

  it('goes past the milestones without stopping and stops only at the arrival (#157)', () => {
    const s = startVoyage('irizar');
    const half = advanceVoyage(s, VOYAGE_SECONDS.ship * ((ship[3].t + ship[4].t) / 2));
    expect(half.card).toBe(-1);
    expect(half.reached).toBe(4);
    expect(voyageStopAt(half)).toBe(3);
    const end = advanceVoyage(half, 1000);
    expect(end.t).toBe(ship[last].t);
    expect(end.card).toBe(last);
    expect(voyageArrived(end)).toBe(true);
    expect(voyageStopAt(end)).toBe(-1);
    expect(advanceVoyage(end, 10)).toBe(end);
  });

  it('stops at the next milestone, without opening it, when asked to', () => {
    let s = startVoyage('irizar');
    for (let i = 1; i < last; i++) {
      s = advanceVoyage(s, 1000, true);
      expect(s.t).toBe(ship[i].t);
      expect(s.card).toBe(-1);
      expect(voyageStopAt(s)).toBe(i);
    }
    s = advanceVoyage(s, 1000, true);
    expect(s.card).toBe(last);
  });

  it('opens the card of a milestone passed only when asked, and holds the trip while it is open', () => {
    const s = advanceVoyage(startVoyage('irizar'), 1000, true);
    expect(openVoyageCard(s, 2)).toBe(s); // not passed yet
    const open = openVoyageCard(s, 1);
    expect(open.card).toBe(1);
    expect(advanceVoyage(open, 5)).toBe(open);
    expect(retreatVoyage(open, 5)).toBe(open);
    expect(closeVoyageCard(open)).toEqual(s);
  });

  it('after the arrival, closing the card of another milestone goes back to the one of the arrival', () => {
    const end = advanceVoyage(startVoyage('irizar'), 1000);
    const other = openVoyageCard(end, 2);
    expect(other.card).toBe(2);
    expect(closeVoyageCard(other).card).toBe(last);
  });

  it('goes back keeping the milestones passed, and offers the one behind the vehicle', () => {
    let s = advanceVoyage(startVoyage('irizar'), 1000, true);
    s = advanceVoyage(s, 1000, true);
    const at = s.t;
    s = retreatVoyage(s, 1);
    expect(s.t).toBeCloseTo(at - 1 / VOYAGE_SECONDS.ship);
    expect(s.reached).toBe(3);
    expect(voyageStopAt(s)).toBe(1);
  });

  it('does not go back past Ushuaia', () => {
    const start = startVoyage('irizar');
    expect(retreatVoyage(start, 5)).toBe(start);
    expect(retreatVoyage(advanceVoyage(start, 1), 1000).t).toBe(0);
  });

  it('can be travelled step by step, opening only the arrival', () => {
    let s = startVoyage('hercules');
    let steps = 0;
    while (!voyageArrived(s)) {
      s = skipToNextStop(s);
      steps++;
      if (!voyageArrived(s)) expect(s.card).toBe(-1);
    }
    expect(steps).toBe(voyageStops('plane').length - 1);
    expect(s.card).toBe(voyageStops('plane').length - 1);
    expect(s.t).toBe(1);
  });
});

describe('orcadas travel leg', () => {
  const buf = readFileSync(join(import.meta.dirname, '../src/assets/terrain-mesh-hi.bin'));
  const terrain = parseTerrainMesh(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const ground = (p: { x: number; y: number }) => Math.max(0, worldHeight(heightAt(p.x, p.y, terrain)));

  it('keeps consistent duration constants per transport', () => {
    expect(ORCADAS_SHIP_SECONDS).toBe(7);
    expect(ORCADAS_ZODIAC_SECONDS).toBe(4);
    expect(ORCADAS_HELICOPTER_SECONDS).toBe(8);
    expect(ORCADAS_TRAVEL_SECONDS.ship).toBe(ORCADAS_SHIP_SECONDS + ORCADAS_ZODIAC_SECONDS);
    expect(ORCADAS_TRAVEL_SECONDS.helicopter).toBe(ORCADAS_HELICOPTER_SECONDS);
    expect(ORCADAS_SHIP_PHASE).toBeCloseTo(ORCADAS_SHIP_SECONDS / ORCADAS_TRAVEL_SECONDS.ship, 12);
    expect(orcadasTravelMs('ship')).toBe(ORCADAS_TRAVEL_SECONDS.ship * 1000);
    expect(orcadasTravelMs('helicopter')).toBe(ORCADAS_TRAVEL_SECONDS.helicopter * 1000);
  });

  it('matches the final Irízar pose and deck offset from the Ushuaia trip via a single source', () => {
    const end = voyageAt('ship', 1);
    const heading = voyageHeading('ship', 1);
    expect(IRIZAR_ARRIVAL_POSE).toEqual({ x: end.x, y: end.y, heading });

    const size = 3.2;
    const worldPose = irizarArrivalWorldPose(size);
    expect(worldPose.world).toEqual(toWorld(end.x, end.y, shipWaterY(size)));
    expect(worldPose.deck).toEqual(shipDeckPose({ x: end.x, y: end.y, height: shipWaterY(size), heading }, size));
  });

  it('sails the Irízar from the Ushuaia arrival pose to Laurie anchorage, then lowers the Zodiac outside the hull to the shore', () => {
    const shipSize = ORCADAS_DEFAULT_SHIP_SIZE;
    const start = orcadasTravelAt('ship', 0, terrain, { shipSize });
    const anchor = orcadasTravelAt('ship', ORCADAS_SHIP_PHASE, terrain, { shipSize });
    const end = orcadasTravelAt('ship', 1, terrain, { shipSize });

    // Departs from the exact Ushuaia arrival pose (position and heading).
    expect(start.x).toBeCloseTo(IRIZAR_ARRIVAL_POSE.x, 9);
    expect(start.y).toBeCloseTo(IRIZAR_ARRIVAL_POSE.y, 9);
    expect(start.heading).toBeCloseTo(IRIZAR_ARRIVAL_POSE.heading, 9);
    expect(start.height).toBe(0);

    // Reaches the Laurie anchorage and finishes off the Laurie shore.
    expect(Math.hypot(anchor.x - ORCADAS_POINT.x, anchor.y - ORCADAS_POINT.y)).toBeCloseTo(SHIP_ANCHORAGE, 4);
    expect(Math.hypot(end.x - ORCADAS_POINT.x, end.y - ORCADAS_POINT.y)).toBeCloseTo(ORCADAS_SHORE, 4);
    expect(orcadasTravelLength('ship')).toBeCloseTo(ORCADAS_SHIP_LENGTH + (SHIP_ANCHORAGE - ORCADAS_SHORE), 6);

    // Continuity along the Irízar sailing leg (no jump before anchoring).
    const beforeHandoff = orcadasTravelAt('ship', ORCADAS_SHIP_PHASE - 0.001, terrain, { shipSize });
    expect(Math.hypot(anchor.x - beforeHandoff.x, anchor.y - beforeHandoff.y)).toBeLessThan(0.1);

    // Zodiac starts outside the Irízar's hull, above water, and lowers down before motoring to shore.
    const zodiacStart = orcadasTravelAt('ship', ORCADAS_SHIP_PHASE + 1e-6, terrain, { shipSize });
    const cosH = Math.cos(anchor.heading);
    const sinH = Math.sin(anchor.heading);
    const lateralFromHull = Math.abs(-(zodiacStart.x - anchor.x) * sinH + (zodiacStart.y - anchor.y) * cosH);
    const zodiacHalfBeam = 0.25 * ZODIAC_SHIP_RATIO * shipSize;
    expect(ZODIAC_SHIP_RATIO).toBeLessThanOrEqual(1 / 8);
    expect(lateralFromHull).toBeGreaterThan(IRIZAR_HALF_BEAM * shipSize + zodiacHalfBeam);
    expect(zodiacStart.height).toBeGreaterThan(0);

    const splashT = ORCADAS_SHIP_PHASE + ZODIAC_LOWER_PHASE * (1 - ORCADAS_SHIP_PHASE);
    const splash = orcadasTravelAt('ship', splashT, terrain, { shipSize });
    expect(splash.height).toBe(0);

    // Every point of both ship and Zodiac stays on open water (heightAt === 0) and progresses forward.
    let prevShipDist = 0;
    let prevZodiacProg = -Infinity;
    for (let i = 0; i <= 200; i++) {
      const t = i / 200;
      const p = orcadasTravelAt('ship', t, terrain, { shipSize });
      expect(heightAt(p.x, p.y, terrain), `step ${i}`).toBe(0);
      if (t <= ORCADAS_SHIP_PHASE) {
        expect(p.height).toBe(0);
        const dist = Math.hypot(p.x - start.x, p.y - start.y);
        expect(dist).toBeGreaterThanOrEqual(prevShipDist - 1e-12);
        prevShipDist = dist;
      } else {
        const along = (p.x - anchor.x) * cosH + (p.y - anchor.y) * sinH;
        expect(along).toBeGreaterThanOrEqual(prevZodiacProg - 1e-12);
        prevZodiacProg = along;
      }
    }
    expect(orcadasTravelAt('ship', -0.5, terrain, { shipSize })).toEqual(start);
    expect(orcadasTravelAt('ship', 1.5, terrain, { shipSize })).toEqual(end);
  });

  it('launches the helicopter from the Irízar flight deck at cruise altitude and descends onto Orcadas without clipping relief', () => {
    const shipSize = 3.5;
    const deck = irizarArrivalWorldPose(shipSize).deck;
    const start = orcadasTravelAt('helicopter', 0, terrain, { shipSize });
    const end = orcadasTravelAt('helicopter', 1, terrain, { shipSize });

    expect(start.x).toBeCloseTo(deck.x, 9);
    expect(start.y).toBeCloseTo(deck.y, 9);
    expect(start.height).toBeCloseTo(deck.height, 9);
    expect(start.heading).toBeCloseTo(IRIZAR_ARRIVAL_POSE.heading, 9);
    expect(end.x).toBeCloseTo(ORCADAS_POINT.x, 6);
    expect(end.y).toBeCloseTo(ORCADAS_POINT.y, 6);
    expect(end.height).toBeCloseTo(ground(ORCADAS_POINT), 6);
    expect(orcadasTravelLength('helicopter', { shipSize })).toBeCloseTo(Math.hypot(end.x - deck.x, end.y - deck.y), 6);

    for (let i = 0; i <= 200; i++) {
      const p = orcadasTravelAt('helicopter', i / 200, terrain, { shipSize });
      expect(p.height, `step ${i}`).toBeGreaterThanOrEqual(ground(p));
    }
    expect(orcadasTravelAt('helicopter', 0.5, terrain, { shipSize }).height).toBeGreaterThanOrEqual(FLIGHT_CRUISE);
  });
});
