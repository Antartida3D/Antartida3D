import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  INTRO_DESKTOP, INTRO_EXPLORE_LABEL, INTRO_PHONE, introStartLabel, introSuggestion, type MapPoint,
} from '@antartida/core';
import { trapTab, useBackLayer, useFocusReturn, useMediaQuery } from '../hooks.ts';
import { Icon } from '../ui.tsx';
import { NARROW_PX } from '../voyage/useVoyage.ts';

interface Props {
  /** Suggested expedition (#256): the primary action goes there. Null once all are done. */
  target: Pick<MapPoint, 'id' | 'title'> | null;
  /** Closes the letter, whatever the way out. */
  onClose: () => void;
  /** Closes the letter and brings the map close to `target`. */
  onStart: () => void;
  fallbackFocus?: () => HTMLElement | null | undefined;
}

const PAGES = INTRO_PHONE.pages.length;

/** Renders `**bold**` marks of the texts in core/content/intro.ts. */
function rich(text: string) {
  return text.split('**').map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part));
}

function Dots({ page }: { page: number }) {
  return (
    <span className="intro-dots" aria-hidden="true">
      {INTRO_PHONE.pages.map((p, i) => <i key={p.title} className={i === page ? 'on' : ''} />)}
    </span>
  );
}

/** First-visit letter (#256): one sheet on a desktop, three pages in a bottom sheet on a phone. */
export function IntroLetter({ target, onClose, onStart, fallbackFocus }: Props) {
  const wide = useMediaQuery(`(min-width: ${NARROW_PX}px)`);
  const [page, setPage] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  useFocusReturn(true, ref, '.btn.primary', fallbackFocus);
  useBackLayer(true, onClose);
  // A new page puts the focus on its title, so a screen reader reads it (the buttons stay in place).
  useEffect(() => {
    if (!moved.current) return void (moved.current = true);
    titleRef.current?.focus();
  }, [page]);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    } else trapTab(e, ref.current);
  };

  const explore = (
    <button type="button" className={target ? 'btn' : 'btn primary'} onClick={onClose}>{INTRO_EXPLORE_LABEL}</button>
  );
  const start = target && (
    <button type="button" className="btn primary" onClick={onStart}>{introStartLabel(target)}{Icon.next}</button>
  );
  const last = page === PAGES - 1;

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <section
        ref={ref}
        className={`intro ${wide ? 'intro-wide' : 'intro-sheet'}`}
        role="dialog"
        aria-modal="true"
        aria-label={INTRO_DESKTOP.title}
        onKeyDown={onKeyDown}
      >
        <button type="button" className="iconbtn bare intro-close" aria-label="Cerrar" onClick={onClose}>{Icon.close}</button>
        {wide ? <Desktop /> : <Phone page={page} titleRef={titleRef} target={target} />}
        {wide ? (
          <footer className="intro-foot">
            <p className="intro-note">{INTRO_DESKTOP.footer}</p>
            <div className="intro-actions">{explore}{start}</div>
          </footer>
        ) : (
          <footer className="intro-foot">
            {last ? (
              <>
                <div className="intro-actions stacked">{explore}{start}</div>
                <Dots page={page} />
              </>
            ) : (
              <>
                <Dots page={page} />
                <div className="intro-actions">
                  {page === 0 ? (
                    <button type="button" className="btn" onClick={onClose}>Saltar</button>
                  ) : (
                    <button type="button" className="btn" onClick={() => setPage(page - 1)}>Atrás</button>
                  )}
                  <button type="button" className="btn primary" onClick={() => setPage(page + 1)}>Siguiente{Icon.next}</button>
                </div>
              </>
            )}
          </footer>
        )}
      </section>
    </>
  );
}

function PinIcon({ kind }: { kind: 'a' | 'c' }) {
  return <span className={`intro-pin ${kind}`} aria-hidden="true"><i /></span>;
}

function Desktop() {
  const d = INTRO_DESKTOP;
  const art = [
    <><span className="intro-mouse">{Icon.mouse}</span><span className="intro-plus">{Icon.plusRing}</span></>,
    <><PinIcon kind="a" /><PinIcon kind="c" /></>,
    <span className="intro-log"><small>Registro de exploración</small><b>0/6 expediciones</b></span>,
  ];
  return (
    <div className="intro-body">
      <p className="intro-kicker">{d.kicker}</p>
      <h2 className="intro-title">{d.title}</h2>
      <p className="intro-lead">{d.lead}</p>
      <ol className="intro-steps">
        {d.steps.map((s, i) => (
          <li key={s.title}>
            <div className="intro-step-head"><span className="intro-num" aria-hidden="true">{i + 1}</span><h3>{s.title}</h3></div>
            <div className="intro-art" aria-hidden="true">{art[i]}</div>
            <p>{rich(s.text)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <li><span className="intro-tile" aria-hidden="true">{icon}</span><span>{children}</span></li>;
}

function Phone({ page, titleRef, target }: { page: number; titleRef: React.RefObject<HTMLHeadingElement | null>; target: Props['target'] }) {
  const p = INTRO_PHONE.pages;
  const head = (title: string) => (
    <>
      <p className="intro-kicker">{`${INTRO_PHONE.kicker} · ${page + 1} de ${PAGES}`}</p>
      <h2 className="intro-title" tabIndex={-1} ref={titleRef}>{title}</h2>
    </>
  );
  if (page === 0) {
    const a = p[0];
    return (
      <div className="intro-body">
        {head(a.title)}
        <p className="intro-lead">{a.lead}</p>
        <p>{a.text}</p>
      </div>
    );
  }
  if (page === 1) {
    const b = p[1];
    return (
      <div className="intro-body">
        {head(b.title)}
        <ul className="intro-rows">
          <Row icon={Icon.hand}>{rich(b.gesture)}</Row>
          <Row icon={<PinIcon kind="a" />}>{rich(b.expedition)}</Row>
          <Row icon={<PinIcon kind="c" />}>{rich(b.place)}</Row>
          <Row icon={Icon.list}>{rich(b.list)}</Row>
        </ul>
      </div>
    );
  }
  const c = p[2];
  return (
    <div className="intro-body">
      {head(c.title)}
      <p>{rich(c.text)} {rich(introSuggestion(target))}</p>
      <p className="intro-stat"><span className="intro-chip">0/6</span><span>{c.progress}</span></p>
      <p className="intro-sources"><span className="intro-sico">{Icon.doc}</span><span>{c.sources}</span></p>
    </div>
  );
}
