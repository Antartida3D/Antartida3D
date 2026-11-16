import { useEffect, useRef, useState } from 'react';
import {
  TRANSFER_SECONDS, advanceVoyage, retreatVoyage, closeVoyageCard, nextHeld, openVoyageCard, rampSpeed, skipToNextStop, startVoyage, voyageArrived, voyageStops, type TransportId, type VoyageSourceCode, type VoyageState,
} from '@antartida/core';

/**
 * Trip state shared with the 3D scene without re-rendering React on every frame: the scene reads
 * `state` in its own frame loop and subscribes to know when to draw.
 */
export interface VoyageBus {
  state: VoyageState | null;
  /** Ids of the animals already spotted on this trip. */
  seen: readonly string[];
  /** The user touched an animal on the map. `beside` opens its card next to it instead of in the panel. */
  spot: (id: string, beside: boolean) => void;
  /** The animal whose card is open next to it on the map, or null. */
  beside: string | null;
  /** The animal or place whose card is open, wherever it is shown, or null. */
  open: string | null;
  /** The vehicle is going back, or stopped after going back: it is drawn turned round. */
  back: boolean;
  /** Fraction flown of the helicopter hop from the ship to the base (1 once it landed), or null before it. */
  transfer: number | null;
  closeSighting: () => void;
  /** Speed multiplier of "advance" while it is held (1 otherwise): it picks up little by little (#166). */
  speed: number;
  /** Speed multiplier for how far the camera is (voyagePace): set by the 3D scene, 1 on the 2D map. */
  pace: number;
  /** Ids of the milestones whose card was opened on this trip: their pins turn grey. */
  opened: readonly string[];
  /** The user touched the pin of a milestone already passed: opens its card. */
  openStop: (index: number) => void;
  openSource: (code: VoyageSourceCode) => void;
  listeners: Set<() => void>;
}

/**
 * Up to this width the trip panel spans the bottom of the screen (same breakpoint as the styles).
 * Below it the map legend also starts closed (#114).
 */
export const NARROW_PX = 820;

/** Seconds the vehicle takes to pick up speed and to coast to a stop. */
const EASE_SECONDS = 0.3;

export interface VoyageController {
  /** Updated at milestones and when the user lets go, not on every frame. */
  state: VoyageState | null;
  bus: VoyageBus;
  start: (transport: TransportId, atReached?: number) => void;
  /** Move while true, forward or back along the trip: the user sets the pace. */
  hold: (on: boolean, back?: boolean) => void;
  /** Jump to the next milestone: the step-by-step trip of the 2D map and of reduced motion. */
  skip: () => void;
  closeCard: () => void;
  /** Animals spotted on this trip, and the one whose card is open. */
  seen: readonly string[];
  sighting: string | null;
  /** The open card is next to the animal on the map, not in the panel. */
  popover: boolean;
  openSighting: (id: string, beside?: boolean) => void;
  /** Ids of the milestones whose card was opened on this trip: they are optional (#157). */
  opened: readonly string[];
  /**
   * Opens the card of a milestone already passed (index into voyageStops). The trip pauses while
   * it is open. With `ask` the card opens with its question shown.
   */
  openMilestone: (index: number, ask?: boolean) => void;
  /** The open card was asked for through its question: it shows the question at once. */
  asking: boolean;
  /** Option chosen for the question of each milestone, by milestone id. */
  answers: Readonly<Record<string, number>>;
  answer: (milestoneId: string, option: number) => void;
  closeSighting: () => void;
  /** The helicopter hop from the ship to the base: not started, flying (the arrival card steps aside) or landed. */
  transfer: 'none' | 'flying' | 'landed';
  startTransfer: () => void;
  reset: () => void;
}

export function useVoyage(): VoyageController {
  const [state, setState] = useState<VoyageState | null>(null);
  const bus = useRef<VoyageBus>({ state: null, seen: [], spot: () => {}, beside: null, open: null, back: false, transfer: null, closeSighting: () => {}, speed: 1, pace: 1, opened: [], openStop: () => {}, openSource: () => {}, listeners: new Set() }).current;
  const frame = useRef(0);

  const [seen, setSeen] = useState<readonly string[]>([]);
  const [sighting, setSighting] = useState<{ id: string; beside: boolean } | null>(null);
  const [answers, setAnswers] = useState<Readonly<Record<string, number>>>({});
  const opened = useRef<readonly string[]>([]);
  const [openedIds, setOpened] = useState<readonly string[]>([]);
  const [asking, setAsking] = useState(false);

  const notify = () => bus.listeners.forEach((fn) => fn());
  /** Hands a state to React, and counts the card it opens as read (the arrival opens by itself). */
  const show = (next: VoyageState | null) => {
    setState(next);
    if (!next || next.card < 0) return;
    const { id } = voyageStops(next.kind)[next.card].milestone;
    if (opened.current.includes(id)) return;
    opened.current = [...opened.current, id];
    bus.opened = opened.current;
    setOpened(opened.current);
  };
  const commit = (next: VoyageState | null) => {
    bus.state = next;
    show(next);
    notify();
  };
  // `held`: seconds of holding that count for the speed.
  const drive = useRef({ pressed: false, power: 0, held: 0, back: false });
  const stop = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    drive.current.pressed = false;
    drive.current.power = 0;
    drive.current.held = 0;
    bus.speed = 1;
  };

  const [transfer, setTransfer] = useState<VoyageController['transfer']>('none');
  const hop = useRef(0);
  /** Ends the helicopter hop where `at` says: on the base (1) or back to not flown (null). */
  const endTransfer = (at: 1 | null) => {
    cancelAnimationFrame(hop.current);
    hop.current = 0;
    bus.transfer = at;
    setTransfer(at === null ? 'none' : 'landed');
    notify();
  };
  const startTransfer = () => {
    cancelAnimationFrame(hop.current);
    bus.transfer = 0;
    setTransfer('flying');
    notify();
    let last = performance.now();
    const tick = (now: number) => {
      // Like the trip: a long frame does not make the helicopter leap.
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      const u = (bus.transfer ?? 0) + dt / TRANSFER_SECONDS;
      if (u >= 1) return endTransfer(1);
      bus.transfer = u;
      notify();
      hop.current = requestAnimationFrame(tick);
    };
    hop.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => {
    stop();
    cancelAnimationFrame(hop.current);
  }, []);

  /** Moves the trip frame by frame while a button is held, then coasts to a stop. */
  const run = () => {
    if (frame.current) return; // already moving, or still coasting from the previous press
    const d = drive.current;
    let last = performance.now();
    const tick = (now: number) => {
      const before = bus.state;
      if (!before) return stop();
      // A frame can carry a timestamp older than the press that started the loop.
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      // Ease in and out instead of starting and stopping dead.
      d.power += ((d.pressed ? 1 : 0) - d.power) * (1 - Math.exp(-dt / EASE_SECONDS));
      // Held, it picks up speed little by little.
      d.held = nextHeld(d.held, dt, d.pressed);
      const speed = rampSpeed(d.held);
      bus.speed = d.pressed ? speed : 1;
      // From farther the trip goes faster, so it does not crawl on the screen (#168).
      const seconds = dt * speed * bus.pace * d.power;
      // Held, it goes past the milestones (#157).
      const next = d.back ? retreatVoyage(before, seconds) : advanceVoyage(before, seconds);
      bus.state = next;
      notify();
      const atEnd = d.back ? next.t <= 0 : voyageArrived(next);
      const passed = next.reached !== before.reached;
      if (next.card !== before.card || atEnd || (!d.pressed && d.power < 0.03)) {
        stop();
        show(next);
      } else {
        // The panel offers the milestone just passed: it needs to know, though the trip goes on.
        if (passed) show(next);
        frame.current = requestAnimationFrame(tick);
      }
    };
    frame.current = requestAnimationFrame(tick);
  };

  const showSighting = (next: { id: string; beside: boolean } | null) => {
    bus.beside = next?.beside ? next.id : null;
    bus.open = next?.id ?? null;
    setSighting(next);
    notify();
  };
  const openSighting = (id: string, beside = false) => {
    stop();
    setState(bus.state);
    if (!bus.seen.includes(id)) {
      bus.seen = [...bus.seen, id];
      setSeen(bus.seen);
    }
    showSighting({ id, beside });
  };
  bus.spot = openSighting;
  bus.closeSighting = () => showSighting(null);
  const openMilestone = (index: number, ask = false) => {
    if (!bus.state) return;
    const next = openVoyageCard(bus.state, index);
    if (next === bus.state) return;
    stop();
    setAsking(ask);
    commit(next);
  };
  bus.openStop = (index) => openMilestone(index);
  const clearSightings = () => {
    bus.seen = [];
    setSeen([]);
    bus.beside = null;
    bus.open = null;
    setSighting(null);
    setAnswers({});
    opened.current = [];
    bus.opened = [];
    setOpened([]);
    setAsking(false);
    endTransfer(null);
  };

  return {
    state,
    bus,
    seen,
    sighting: sighting?.id ?? null,
    popover: sighting?.beside ?? false,
    openSighting,
    closeSighting: bus.closeSighting,
    opened: openedIds,
    openMilestone,
    asking,
    answers,
    // The first answer stands: the notes that follow give it away.
    answer: (id, option) => setAnswers((a) => (id in a ? a : { ...a, [id]: option })),
    transfer,
    startTransfer,
    start: (transport, atReached) => {
      bus.back = false;
      clearSightings();
      commit(startVoyage(transport, atReached));
    },
    hold: (on, back = false) => {
      const d = drive.current;
      if (!on) {
        // Only the button being held lets go: pressing one takes the focus from the other.
        if (d.back === back) d.pressed = false; // the loop coasts to a stop
        return;
      }
      if (d.pressed || !bus.state) return;
      d.pressed = true;
      if (d.back !== back) {
        // Turning round: no coasting the other way, and the speed starts again from ×1.
        d.power = 0;
        d.held = 0;
      }
      d.back = back;
      bus.back = back;
      run();
    },
    skip: () => {
      if (!bus.state) return;
      stop();
      commit(skipToNextStop(bus.state));
    },
    closeCard: () => {
      if (!bus.state) return;
      setAsking(false);
      commit(closeVoyageCard(bus.state));
    },
    reset: () => {
      stop();
      clearSightings();
      if (bus.state) commit(null);
    },
  };
}
