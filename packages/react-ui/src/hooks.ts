import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type RefObject } from 'react';
import { prefersReducedMotion, type LoadingSnapshot, type LoadingStore } from '@antartida/core';

/** Tab stays inside `container` while it is open (dialogs). */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapTab(e: KeyboardEvent<HTMLElement>, container: HTMLElement | null) {
  if (e.key !== 'Tab' || !container) return;
  const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getClientRects().length > 0
  );
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement as HTMLElement | null;
  if (!active || !container.contains(active)) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * While `open`, focuses the first element matching `initial` inside the container.
 * When it closes, focus goes back to whatever had it before (or `fallback`).
 */
export function useFocusReturn(
  open: boolean,
  container: RefObject<HTMLElement | null>,
  initial = 'button',
  fallback?: () => HTMLElement | null | undefined,
) {
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    container.current?.querySelector<HTMLElement>(initial)?.focus();
    return () => {
      const target = previous && previous !== document.body && previous.isConnected ? previous : fallbackRef.current?.();
      target?.focus();
    };
  }, [open, container, initial]);
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => setReduced(prefersReducedMotion()), []);
  return reduced;
}

/** Whether a CSS media query matches, kept up to date. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);
  return matches;
}

export function useIsDesktop(breakpoint = 900): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.innerWidth >= breakpoint ||
      window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches
    );
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mqlWide = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const mqlLand = window.matchMedia('(orientation: landscape) and (max-height: 500px)');
    const update = () => setIsDesktop(mqlWide.matches || mqlLand.matches);
    update();
    mqlWide.addEventListener('change', update);
    mqlLand.addEventListener('change', update);
    return () => {
      mqlWide.removeEventListener('change', update);
      mqlLand.removeEventListener('change', update);
    };
  }, [breakpoint]);
  return isDesktop;
}

export function useTimers() {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return (name: string, fn: () => void, ms: number) => {
    clearTimeout(timers.current.get(name));
    timers.current.set(name, setTimeout(fn, ms));
  };
}

export function useLoadingStore<S extends string>(store: LoadingStore<S>): LoadingSnapshot<S> {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

// Browser «back» closes the top open layer instead of leaving the app (#185). The app keeps one
// history entry while any layer is open; «back» consumes it, and if layers remain, it is made again.
const backLayers: { close: () => void }[] = [];
let backEntry = false;
// True from the `history.back()` that drops the entry until its popstate arrives: pushing meanwhile cancels it.
let backPending = false;
let backSyncing = false;
let backListening = false;

function syncBackEntry() {
  backSyncing = false;
  try {
    if (backLayers.length > 0 && !backEntry && !backPending) {
      history.pushState({ antartida: 1 }, '');
      backEntry = true;
    } else if (backLayers.length === 0 && backEntry) {
      // Closed by the interface: drop the entry, and ignore the popstate this causes.
      backEntry = false;
      backPending = true;
      history.back();
    }
  } catch {
    // History blocked (sandboxed frame): «back» keeps leaving the app, nothing else breaks.
  }
}

/** Batches changes of the same tick (a list that closes as a sheet opens) into one history change. */
function scheduleBackSync() {
  if (backSyncing) return;
  backSyncing = true;
  setTimeout(syncBackEntry, 0);
}

function onBackPop() {
  if (backPending) {
    backPending = false;
    syncBackEntry();
    return;
  }
  backEntry = false;
  backLayers[backLayers.length - 1]?.close();
  scheduleBackSync();
}

/** While `open`, browser «back» calls `onClose`. The last layer opened closes first. */
export function useBackLayer(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const layer = { close: () => closeRef.current() };
    // Never removed: the popstate of an entry dropped by the interface arrives after the last layer is gone.
    if (!backListening) {
      window.addEventListener('popstate', onBackPop);
      // Going back restores the scroll of the entry; in a short landscape phone it threw the page off (#185).
      try {
        history.scrollRestoration = 'manual';
      } catch {
        // History blocked: see syncBackEntry.
      }
      backListening = true;
    }
    backLayers.push(layer);
    // At once: «back» right after opening must already close the layer, even if the page is busy drawing.
    syncBackEntry();
    return () => {
      backLayers.splice(backLayers.indexOf(layer), 1);
      scheduleBackSync();
    };
  }, [open]);
}
