import { beforeEach, describe, expect, it } from 'vitest';
import {
  EXPLORED_KEY,
  loadExplored,
  saveExplored,
  loadViewMode,
  saveViewMode,
  loadWelcomeSeen,
  saveWelcomeSeen,
  WELCOME_KEY,
  LAST_EXPEDITION_KEY,
  loadLastExpedition,
  saveLastExpedition,
  ORCADAS_POINT,
} from '../src/index.ts';

describe('storage', () => {
  const mem = new Map<string, string>();
  beforeEach(() => {
    mem.clear();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  });

  it('persists explored', () => {
    expect(loadExplored()).toEqual([]);
    saveExplored(['orcadas', 'campana']);
    expect(loadExplored()).toEqual(['orcadas', 'campana']);
  });

  it('reads the old single-expedition format', () => {
    mem.set(EXPLORED_KEY, '1');
    expect(loadExplored()).toEqual([ORCADAS_POINT.id]);
    mem.set(EXPLORED_KEY, '0');
    expect(loadExplored()).toEqual([]);
  });

  it('survives a throwing localStorage', () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => {
        throw new Error('quota');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadExplored()).toEqual([]);
    expect(() => saveExplored(['orcadas'])).not.toThrow();
  });

  it('persists view mode', () => {
    expect(loadViewMode()).toBeNull();
    saveViewMode('3d');
    expect(loadViewMode()).toBe('3d');
    saveViewMode('2d');
    expect(loadViewMode()).toBe('2d');
  });

  it('remembers that the welcome was shown', () => {
    expect(loadWelcomeSeen()).toBe(false);
    saveWelcomeSeen();
    expect(loadWelcomeSeen()).toBe(true);
    expect(mem.get(WELCOME_KEY)).toBe('1');
  });

  it('reads the welcome as not seen when storage throws', () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadWelcomeSeen()).toBe(false);
    expect(() => saveWelcomeSeen()).not.toThrow();
  });

  it('persists and clears the last opened expedition', () => {
    expect(loadLastExpedition()).toBeNull();
    saveLastExpedition({ id: 'marambio', step: 2 });
    expect(loadLastExpedition()).toEqual({ id: 'marambio', step: 2 });
    expect(mem.get(LAST_EXPEDITION_KEY)).toBe(JSON.stringify({ id: 'marambio', step: 2 }));
    saveLastExpedition({ id: 'orcadas', step: 1, sub: 3 });
    expect(loadLastExpedition()).toEqual({ id: 'orcadas', step: 1, sub: 3 });
    saveLastExpedition(null);
    expect(loadLastExpedition()).toBeNull();
  });

  it('ignores legacy string and corrupt last expedition values', () => {
    for (const raw of [
      '',
      'marambio',
      'null',
      '[]',
      JSON.stringify({ id: '', step: 0 }),
      JSON.stringify({ id: 'marambio', step: -1 }),
      JSON.stringify({ id: 'marambio', step: 1.5 }),
      JSON.stringify({ id: 'marambio', step: 0, sub: -1 }),
      JSON.stringify({ id: 'marambio', step: 0, sub: 'x' }),
    ]) {
      mem.set(LAST_EXPEDITION_KEY, raw);
      expect(loadLastExpedition()).toBeNull();
    }
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => 42 as unknown as string,
      setItem: () => {},
      removeItem: () => {},
    };
    expect(loadLastExpedition()).toBeNull();
  });

  it('survives throwing storage for last expedition', () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadLastExpedition()).toBeNull();
    expect(() => saveLastExpedition({ id: 'marambio', step: 0 })).not.toThrow();
    expect(() => saveLastExpedition(null)).not.toThrow();
  });
});
