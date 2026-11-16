import { useEffect, useState } from 'react';
import {
  PTS,
  buildCurrentTemperatureUrl,
  parseCurrentTemperature,
  type CurrentTemperature,
} from '@antartida/core';

export type TemperatureStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface CurrentTemperatureState {
  status: TemperatureStatus;
  temperature: CurrentTemperature | null;
}

const CACHE_TTL_MS = 15 * 60 * 1000;

interface CacheEntry {
  fetchedAt: number;
  controller: AbortController;
  settled: boolean;
  data: (CurrentTemperature | null)[] | null;
  promise: Promise<(CurrentTemperature | null)[] | null>;
}

let cache: CacheEntry | null = null;

function isCacheFresh(entry: CacheEntry | null, nowMs = Date.now()): entry is CacheEntry {
  return entry !== null && nowMs - entry.fetchedAt < CACHE_TTL_MS;
}

function getOrStartFetch(): CacheEntry {
  if (isCacheFresh(cache)) return cache;

  const controller = new AbortController();
  const entry: CacheEntry = {
    fetchedAt: Date.now(),
    controller,
    settled: false,
    data: null,
    promise: Promise.resolve(null),
  };

  entry.promise = (async () => {
    try {
      const response = await fetch(buildCurrentTemperatureUrl(PTS), {
        signal: controller.signal,
      });
      if (!response.ok) {
        if (cache === entry) cache = null;
        return null;
      }
      const json: unknown = await response.json();
      const parsed = parseCurrentTemperature(json, PTS.length);
      entry.settled = true;
      entry.data = parsed;
      return parsed;
    } catch {
      if (cache === entry) cache = null;
      return null;
    }
  })();

  cache = entry;
  return entry;
}

/**
 * Fetch and cache (15 min in memory) current Open-Meteo temperatures for all `PTS` points.
 * Only fetches when `pointId` matches a `MapPoint`; passing `null` stays `idle`.
 */
export function useCurrentTemperatures(pointId: string | null): CurrentTemperatureState {
  const pointIndex = pointId === null ? -1 : PTS.findIndex((p) => p.id === pointId);
  const enabled = pointIndex !== -1;

  const [result, setResult] = useState<{
    status: 'loading' | 'ready' | 'error';
    temperatures: (CurrentTemperature | null)[] | null;
  }>(() => {
    if (enabled && isCacheFresh(cache) && cache.settled && cache.data) {
      return { status: 'ready', temperatures: cache.data };
    }
    return { status: 'loading', temperatures: null };
  });

  useEffect(() => {
    if (!enabled) return;

    const entry = getOrStartFetch();
    if (entry.settled && entry.data) {
      setResult({ status: 'ready', temperatures: entry.data });
      return;
    }

    setResult({ status: 'loading', temperatures: null });
    let active = true;
    void entry.promise.then((temperatures) => {
      if (!active) return;
      if (temperatures === null) {
        setResult({ status: 'error', temperatures: null });
        return;
      }
      setResult({ status: 'ready', temperatures });
    });

    return () => {
      active = false;
      if (!entry.settled && cache === entry) {
        entry.controller.abort();
        cache = null;
      }
    };
  }, [enabled]);

  if (!enabled) {
    return { status: 'idle', temperature: null };
  }

  if (result.status === 'ready') {
    const temperature = result.temperatures?.[pointIndex] ?? null;
    if (temperature === null) {
      return { status: 'error', temperature: null };
    }
    return { status: 'ready', temperature };
  }

  return { status: result.status, temperature: null };
}
