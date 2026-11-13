import { describe, expect, it } from 'vitest';
import { PONCHO_EXPEDITION, PONCHO_MILESTONES, voyageStops } from '../src/index.ts';

const allFacts = PONCHO_MILESTONES.flatMap((m) => [m.essential, ...m.more]);
const allTexts = [
  ...PONCHO_MILESTONES.flatMap((m) => [m.title, ...allFacts.filter((f) => f === m.essential || m.more.includes(f)).map((f) => f.text)]),
  ...Object.values(PONCHO_EXPEDITION).flatMap((stop) => [
    ...stop.notes.map((n) => n.fact.text),
    ...(stop.question ? [stop.question.prompt, ...stop.question.options] : []),
  ]),
];

describe('content of the expedition of Poncho', () => {
  it('has unique milestone ids', () => {
    const ids = PONCHO_MILESTONES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every milestone a title and a non-empty essential', () => {
    for (const m of PONCHO_MILESTONES) {
      expect(m.title, m.id).not.toBe('');
      expect(m.essential.text.trim(), m.id).not.toBe('');
    }
  });

  it('gives every milestone a year and tells them in the order of the story', () => {
    const years = PONCHO_MILESTONES.map((m) => m.year);
    for (const year of years) expect(year).toBeGreaterThanOrEqual(1951);
    for (let i = 1; i < years.length; i++) expect(years[i]!).toBeGreaterThanOrEqual(years[i - 1]!);
  });

  it('opens the stops in the order of the story along the route', () => {
    const stops = voyageStops('dogs');
    expect(stops.map((s) => s.milestone.year)).toEqual(PONCHO_MILESTONES.map((m) => m.year));
    for (let i = 1; i < stops.length; i++) expect(stops[i].t).toBeGreaterThanOrEqual(stops[i - 1].t);
  });

  it('keeps its questions inside the milestones it has', () => {
    const ids = new Set(PONCHO_MILESTONES.map((m) => m.id));
    for (const [id, stop] of Object.entries(PONCHO_EXPEDITION)) {
      expect(ids.has(id), id).toBe(true);
      if (stop.question) {
        expect(stop.question.answer).toBeGreaterThanOrEqual(0);
        expect(stop.question.answer).toBeLessThan(stop.question.options.length);
      }
    }
  });

  it('names no person: the book leaves them out on purpose', () => {
    for (const text of allTexts) expect(text).not.toMatch(/Giró|Sosa|Villar|Urruty/);
  });

  it('leaves out the doubtful data of the book', () => {
    for (const text of allTexts) {
      expect(text, text).not.toMatch(/Círculo Polar|1956|Dusse|paracaidistas de la Segunda/);
    }
  });
});
