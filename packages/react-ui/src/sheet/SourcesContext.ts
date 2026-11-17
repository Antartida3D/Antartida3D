import { createContext } from 'react';
import type { CitedSource } from '@antartida/core';

/**
 * The sources a modal cites: the list in the order the sources view shows it (which numbers every `[N]`),
 * and how to open that view at one source. One context for every expedition and sheet (#264).
 */
export interface SourcesContextValue {
  list: readonly CitedSource[];
  open: (id: string) => void;
}

export const SourcesContext = createContext<SourcesContextValue | null>(null);
