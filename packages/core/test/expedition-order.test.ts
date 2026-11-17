import { describe, expect, it } from 'vitest';
import {
  EXPEDITION_ORDER,
  MARAMBIO_POINT,
  ORCADAS_POINT,
  PONCHO_POINT,
  PTS,
  VOYAGE_POINT,
  afterExpedition,
  nextExpedition,
  EXPEDITIONS_IN_ORDER,
} from '../src/index.ts';

describe('expedition order', () => {
  it('covers exactly the tier A points in PTS without duplicates', () => {
    const tierAIds = PTS.filter((p) => p.tier === 'A').map((p) => p.id).sort();
    expect(new Set(EXPEDITION_ORDER).size).toBe(EXPEDITION_ORDER.length);
    expect([...EXPEDITION_ORDER].sort()).toEqual(tierAIds);
  });

  it('starts at VOYAGE_POINT', () => {
    expect(EXPEDITION_ORDER[0]).toBe(VOYAGE_POINT.id);
    expect(nextExpedition([])).toBe(VOYAGE_POINT);
  });

  it('skips explored expeditions and returns the first remaining one', () => {
    expect(nextExpedition([VOYAGE_POINT.id])).toBe(MARAMBIO_POINT);
    expect(nextExpedition([VOYAGE_POINT.id, 'fosiles'])).toBe(MARAMBIO_POINT);
    expect(nextExpedition([VOYAGE_POINT.id, MARAMBIO_POINT.id])?.id).toBe('fosiles');
    expect(nextExpedition([VOYAGE_POINT.id, MARAMBIO_POINT.id, 'fosiles'])).toBe(PONCHO_POINT);
  });

  it('ignores unknown ids in explored', () => {
    expect(nextExpedition(['unknown-id', 'legacy-point'])).toBe(VOYAGE_POINT);
    expect(nextExpedition([...EXPEDITION_ORDER, 'unknown-id'])).toBeNull();
  });

  it('returns null when all expeditions are explored', () => {
    expect(nextExpedition(EXPEDITION_ORDER)).toBeNull();
  });

  it('lists the expeditions in the suggested order (#235)', () => {
    expect(EXPEDITIONS_IN_ORDER.map((p) => p.id)).toEqual([...EXPEDITION_ORDER]);
    expect(EXPEDITIONS_IN_ORDER.every((p) => p.tier === 'A')).toBe(true);
  });

  describe('afterExpedition (Irizar cases)', () => {
    it('offers the Irizar after Marambio when next is not Orcadas', () => {
      const res = afterExpedition(MARAMBIO_POINT.id, [VOYAGE_POINT.id, MARAMBIO_POINT.id]);
      expect(res.next?.id).toBe('fosiles');
      expect(res.offerIrizar).toBe(true);
    });

    it('does not offer the Irizar separately when Orcadas is already next', () => {
      const res = afterExpedition(MARAMBIO_POINT.id, [
        VOYAGE_POINT.id,
        MARAMBIO_POINT.id,
        'fosiles',
        PONCHO_POINT.id,
      ]);
      expect(res.next).toBe(ORCADAS_POINT);
      expect(res.offerIrizar).toBe(false);
    });

    it('returns null and offerIrizar false when all expeditions are done', () => {
      expect(afterExpedition(MARAMBIO_POINT.id, EXPEDITION_ORDER)).toEqual({
        next: null,
        offerIrizar: false,
      });
    });

    it('does not offer the Irizar after other expeditions', () => {
      const res = afterExpedition('fosiles', [VOYAGE_POINT.id, MARAMBIO_POINT.id, 'fosiles']);
      expect(res.next).toBe(PONCHO_POINT);
      expect(res.offerIrizar).toBe(false);
    });
  });
});
