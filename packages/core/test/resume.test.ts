import { describe, expect, it } from 'vitest';
import {
  CHAPTERS,
  FOSSIL_STOPS,
  MARAMBIO_SPOTS,
  MARINE_STOPS,
  TRANSPORTS,
  isValidResume,
  resumeDetail,
  voyageStops,
} from '../src/index.ts';

const shipStops = voyageStops('ship').length;
const planeStops = voyageStops('plane').length;
const dogsStops = voyageStops('dogs').length;

describe('resume', () => {
  it('returns null at step 0 without sub-step', () => {
    expect(resumeDetail('marambio', 0)).toBeNull();
    expect(resumeDetail('marambio', 0, 0)).toBeNull();
    expect(resumeDetail('fosiles', 0)).toBeNull();
    expect(resumeDetail('oceano', 0)).toBeNull();
    expect(resumeDetail('orcadas', 0)).toBeNull();
    expect(resumeDetail('orcadas', 0, 0)).toBeNull();
    expect(resumeDetail('campana', 0)).toBeNull();
    expect(resumeDetail('campana', 1, 0)).toBeNull();
    expect(resumeDetail('campana', 1, 1)).toBeNull();
    expect(resumeDetail('poncho', 0)).toBeNull();
    expect(resumeDetail('poncho', 1, 0)).toBeNull();
  });

  it('formats detail for each expedition when progressed', () => {
    expect(resumeDetail('marambio', 2)).toBe(`punto 3 de ${MARAMBIO_SPOTS.length}`);
    expect(resumeDetail('fosiles', 2)).toBe(`parada 3 de ${FOSSIL_STOPS.length}`);
    expect(resumeDetail('oceano', 2)).toBe(`parada 3 de ${MARINE_STOPS.length}`);
    expect(resumeDetail('orcadas', 1)).toBe(`capítulo 2 de ${CHAPTERS.length}`);
    expect(resumeDetail('orcadas', 0, 1)).toBe(`capítulo 1 de ${CHAPTERS.length}`);
    expect(resumeDetail('campana', 2, 0)).toBe(`hito 2 de ${shipStops}`);
    expect(resumeDetail('campana', 2, 1)).toBe(`hito 2 de ${planeStops}`);
    expect(resumeDetail('campana', 2, 2)).toBe(`hito 2 de ${shipStops}`);
    expect(resumeDetail('campana', planeStops - 2, 1)).toBe(`hito ${planeStops - 2} de ${planeStops}`);
    expect(resumeDetail('poncho', 2, 0)).toBe(`hito 2 de ${dogsStops}`);
    expect(resumeDetail('poncho', 2)).toBe(`hito 2 de ${dogsStops}`);
    expect(resumeDetail('poncho', dogsStops - 2, 0)).toBe(`hito ${dogsStops - 2} de ${dogsStops}`);
  });

  it('returns null when out of range or unknown expedition', () => {
    expect(resumeDetail('marambio', -1)).toBeNull();
    expect(resumeDetail('marambio', MARAMBIO_SPOTS.length)).toBeNull();
    expect(resumeDetail('fosiles', FOSSIL_STOPS.length)).toBeNull();
    expect(resumeDetail('oceano', -1)).toBeNull();
    expect(resumeDetail('oceano', MARINE_STOPS.length)).toBeNull();
    expect(resumeDetail('orcadas', CHAPTERS.length)).toBeNull();
    expect(resumeDetail('orcadas', 1, -1)).toBeNull();
    expect(resumeDetail('campana', 2)).toBeNull();
    expect(resumeDetail('campana', 2, -1)).toBeNull();
    expect(resumeDetail('campana', 2, TRANSPORTS.length)).toBeNull();
    expect(resumeDetail('campana', planeStops - 1, 1)).toBeNull();
    expect(resumeDetail('campana', planeStops, 1)).toBeNull();
    expect(resumeDetail('poncho', 2, 1)).toBeNull();
    expect(resumeDetail('poncho', dogsStops - 1, 0)).toBeNull();
    expect(resumeDetail('poncho', dogsStops, 0)).toBeNull();
    expect(resumeDetail('unknown', 1)).toBeNull();
  });

  it('validates step ranges with isValidResume', () => {
    expect(isValidResume({ id: 'marambio', step: 0 })).toBe(true);
    expect(isValidResume({ id: 'marambio', step: MARAMBIO_SPOTS.length - 1 })).toBe(true);
    expect(isValidResume({ id: 'marambio', step: MARAMBIO_SPOTS.length })).toBe(false);
    expect(isValidResume({ id: 'fosiles', step: FOSSIL_STOPS.length - 1 })).toBe(true);
    expect(isValidResume({ id: 'oceano', step: 0 })).toBe(true);
    expect(isValidResume({ id: 'oceano', step: MARINE_STOPS.length - 1 })).toBe(true);
    expect(isValidResume({ id: 'oceano', step: MARINE_STOPS.length })).toBe(false);
    expect(isValidResume({ id: 'orcadas', step: CHAPTERS.length - 1, sub: 2 })).toBe(true);
    expect(isValidResume({ id: 'orcadas', step: 0, sub: -1 })).toBe(false);
    expect(isValidResume({ id: 'campana', step: 0 })).toBe(true);
    expect(isValidResume({ id: 'campana', step: 1 })).toBe(false);
    expect(isValidResume({ id: 'campana', step: 1, sub: 1 })).toBe(true);
    expect(isValidResume({ id: 'campana', step: planeStops - 2, sub: 1 })).toBe(true);
    expect(isValidResume({ id: 'campana', step: planeStops - 1, sub: 1 })).toBe(false);
    expect(isValidResume({ id: 'campana', step: 2, sub: TRANSPORTS.length })).toBe(false);
    expect(isValidResume({ id: 'poncho', step: 0 })).toBe(true);
    expect(isValidResume({ id: 'poncho', step: 1, sub: 0 })).toBe(true);
    expect(isValidResume({ id: 'poncho', step: dogsStops - 2, sub: 0 })).toBe(true);
    expect(isValidResume({ id: 'poncho', step: dogsStops - 1, sub: 0 })).toBe(false);
    expect(isValidResume({ id: 'poncho', step: 2, sub: 1 })).toBe(false);
  });
});
