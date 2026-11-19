import { useMediaQuery } from '../hooks.ts';
import { MoreFold } from '../sheet/MoreFold.tsx';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  MONTH_NAMES,
  ORCADAS_LAT,
  dayLengthHours,
  factsFor,
  midMonthDayOfYear,
  seaIceAt,
  type FactKind,
} from '@antartida/core';
import { FactList } from './FactList.tsx';
import { KindChip } from './KindChip.tsx';
import { SunArc } from './time/SunArc.tsx';
import {
  MONTH_SHORT,
  formatHoursMinutes,
  seaIceDescription,
} from './time/timeMath.ts';

const POPOVER_ID = 'orc-month-popover';

/**
 * What the strip shows of a place, month by month: its daylight (from its latitude), a second
 * stripe under each month with its legend and a line in «Saber más», and what else «Saber más»
 * holds. The default is Estación Orcadas, with the sea ice of Bahía Scotia.
 */
export interface MonthStripSeason {
  latitude: number;
  /** How much of the stripe each month shows, 0..1. */
  stripe: (month: number) => number;
  /** Extra class of the stripe, for its colour. */
  stripeClass?: string;
  stripeLegend: string;
  /** The line about the stripe in «Saber más», with what kind of datum it is. */
  stripeLine: (month: number) => { kind: FactKind; text: string };
  /** The rest of «Saber más», after the line. */
  details: (month: number, monthName: string) => ReactNode;
  /** Accessible names of the strip and of its whole control. */
  groupLabel: string;
  asideLabel: string;
}

function MonthBars({
  daylightPct,
  stripe,
  stripeClass,
}: {
  daylightPct: number;
  stripe: number;
  stripeClass?: string;
}) {
  return (
    <>
      <span className="orc-month-daylight-track" aria-hidden="true">
        <span
          className="orc-month-daylight-bar"
          style={{ height: `${daylightPct.toFixed(0)}%` }}
        />
      </span>
      <span
        className={`orc-month-ice-stripe${stripeClass ? ` ${stripeClass}` : ''}`}
        style={{ opacity: 0.15 + stripe * 0.85 }}
        data-ice={stripe > 0 ? 'yes' : 'no'}
        aria-hidden="true"
      />
    </>
  );
}

function OrcadasMonthDetails({ month, monthName, hour, onHour }: { month: number; monthName: string; hour: number; onHour: (h: number) => void }) {
  const monthFacts = useMemo(() => factsFor('months'), []);
  return (
    <>
      <SunArc month={month} hour={hour} monthName={monthName} onHour={onHour} />
      <FactList facts={monthFacts} />
    </>
  );
}

export function MonthStrip({
  month,
  hour = 12,
  onMonth,
  onHour,
  season,
}: {
  month: number;
  hour?: number;
  onMonth: (m: number) => void;
  onHour?: (h: number) => void;
  /** Another place than Orcadas (Base Marambio). */
  season?: MonthStripSeason;
}) {
  const place = useMemo<MonthStripSeason>(
    () =>
      season ?? {
        latitude: ORCADAS_LAT,
        stripe: seaIceAt,
        stripeLegend: 'Hielo en la bahía (simulación)',
        stripeLine: (m) => ({ kind: 'sim', text: `Bahía Scotia: ${seaIceDescription(seaIceAt(m))}` }),
        details: (m, name) => <OrcadasMonthDetails month={m} monthName={name} hour={hour} onHour={(h) => onHour?.(h)} />,
        groupLabel: 'Mes en la estación',
        asideLabel: 'Control estacional de la estación',
      },
    [season, hour, onHour]
  );
  const [open, setOpen] = useState(false);

  const normMonth = (((month - 1) % 12) + 12) % 12 + 1;
  const monthName = MONTH_NAMES[normMonth - 1] ?? 'enero';
  // An upright phone shares the header row with «Mapa» and «Vista general» (#333): the chip shows «Nov.».
  const compact = useMediaQuery('(max-width: 899px) and (min-height: 501px)');
  const short = MONTH_SHORT[normMonth - 1] ?? 'ENE';
  const chipMonthLabel = compact
    ? `${short.charAt(0)}${short.slice(1).toLowerCase()}.`
    : monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const wrapRef = useRef<HTMLElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const wasOpenRef = useRef(false);
  const returnFocusRef = useRef(false);
  const outsideFocusTimerRef = useRef<number | null>(null);
  const normMonthRef = useRef(normMonth);
  normMonthRef.current = normMonth;

  useEffect(() => {
    return () => {
      if (outsideFocusTimerRef.current !== null) {
        window.clearTimeout(outsideFocusTimerRef.current);
      }
    };
  }, []);

  const daylight = dayLengthHours(place.latitude, midMonthDayOfYear(normMonth));
  const stripeLine = place.stripeLine(normMonth);

  const monthsData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const d = dayLengthHours(place.latitude, midMonthDayOfYear(m));
      const daylightPct = Math.min(100, Math.max(0, (d / 24) * 100));
      return {
        m,
        shortName: MONTH_SHORT[i] ?? '',
        fullName: MONTH_NAMES[i] ?? '',
        daylightPct,
        stripe: place.stripe(m),
      };
    });
  }, [place]);

  const currentMonthData = monthsData[normMonth - 1] ?? monthsData[0]!;

  // Move focus into the active month when opening, and return to the chip on close.
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      btnRefs.current[normMonthRef.current - 1]?.focus();
    } else if (!open && wasOpenRef.current && returnFocusRef.current) {
      chipRef.current?.focus();
    }
    wasOpenRef.current = open;
    returnFocusRef.current = false;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (wrapRef.current?.contains(target)) return;
      const interactive = target?.closest(
        'button, a, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'
      );
      returnFocusRef.current = false;
      setOpen(false);
      if (!interactive) {
        if (outsideFocusTimerRef.current !== null) {
          window.clearTimeout(outsideFocusTimerRef.current);
        }
        // Defer past the browser's mousedown blur on non-focusable targets like the 3D canvas.
        outsideFocusTimerRef.current = window.setTimeout(() => {
          outsideFocusTimerRef.current = null;
          if (!document.activeElement || document.activeElement === document.body) {
            chipRef.current?.focus();
          }
        }, 0);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const stepMonth = (key: string): number | null => {
    if (key === 'ArrowLeft' || key === 'ArrowDown') {
      return normMonth === 1 ? 12 : normMonth - 1;
    }
    if (key === 'ArrowRight' || key === 'ArrowUp') {
      return normMonth === 12 ? 1 : normMonth + 1;
    }
    if (key === 'Home') return 1;
    if (key === 'End') return 12;
    return null;
  };

  const handleStripKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const next = stepMonth(e.key);
    if (next !== null) {
      e.preventDefault();
      e.stopPropagation();
      onMonth(next);
      btnRefs.current[next - 1]?.focus();
    }
  };

  const handleChipKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      e.stopPropagation();
      returnFocusRef.current = true;
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
      const next = stepMonth(e.key);
      if (next !== null) {
        e.preventDefault();
        e.stopPropagation();
        onMonth(next);
      }
    }
  };

  const handleSelectMonth = (m: number) => {
    onMonth(m);
    returnFocusRef.current = true;
    setOpen(false);
  };

  const stripBody = (
    <>
      <div
        className="orc-month-strip"
        role="group"
        aria-label={place.groupLabel}
        onKeyDown={handleStripKeyDown}
      >
        {monthsData.map(({ m, shortName, fullName, daylightPct, stripe }, idx) => {
          const isCurrent = m === normMonth;
          return (
            <button
              key={m}
              ref={(el) => {
                btnRefs.current[idx] = el;
              }}
              type="button"
              className={`orc-month-btn${isCurrent ? ' is-active' : ''}`}
              aria-pressed={isCurrent}
              aria-label={fullName}
              tabIndex={isCurrent ? 0 : -1}
              onClick={() => handleSelectMonth(m)}
            >
              <span className="orc-month-short">{shortName}</span>
              <MonthBars daylightPct={daylightPct} stripe={stripe} stripeClass={place.stripeClass} />
            </button>
          );
        })}
      </div>

      <p className="orc-month-legend" aria-hidden="true">
        <span className="orc-month-legend-sun" /> Horas de luz
        <span className={`orc-month-legend-ice${place.stripeClass ? ` ${place.stripeClass}` : ''}`} /> {place.stripeLegend}
      </p>

      <MoreFold className="orc-month-details">
        <div className="orc-month-details-body">
          <div className="orc-month-info-row">
            <span className="orc-month-daylight-text">
              Luz solar en {monthName}: {formatHoursMinutes(daylight)}
            </span>
            <span className="orc-month-ice-text">
              <KindChip kind={stripeLine.kind} />
              <span>{stripeLine.text}</span>
            </span>
          </div>

          {place.details(normMonth, monthName)}
        </div>
      </MoreFold>
    </>
  );

  return (
    <aside
      ref={wrapRef}
      className="orc-month-strip-wrap"
      aria-label={place.asideLabel}
    >
      <button
        ref={chipRef}
        type="button"
        className="orc-month-chip"
        aria-expanded={open}
        aria-controls={POPOVER_ID}
        aria-label={`Mes: ${monthName}. Cambiar mes`}
        onClick={() => {
          if (open) {
            returnFocusRef.current = true;
            setOpen(false);
          } else {
            setOpen(true);
          }
        }}
        onKeyDown={handleChipKeyDown}
      >
        <span className="orc-month-chip-name">{chipMonthLabel}</span>
        <span className="orc-month-chip-bars" aria-hidden="true">
          <MonthBars
            daylightPct={currentMonthData.daylightPct}
            stripe={currentMonthData.stripe}
            stripeClass={place.stripeClass}
          />
        </span>
        <span className="orc-month-chip-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div
          id={POPOVER_ID}
          className="orc-month-popover"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              returnFocusRef.current = true;
              setOpen(false);
            }
          }}
        >
          {stripBody}
        </div>
      )}
    </aside>
  );
}
