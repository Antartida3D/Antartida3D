import {
  GUIDE_GESTURES, GUIDE_LABELS, GUIDE_PIN, GUIDE_REGISTRY, guideNextText, guidePinText, guideRegistryText, guideTotal,
  introStartLabel, type MapPoint,
} from '@antartida/core';
import { useMediaQuery } from '../hooks.ts';
import { Icon } from '../ui.tsx';
import { NARROW_PX } from '../voyage/useVoyage.ts';
import { GuideStep, type GuideAnchor } from './GuideStep.tsx';

/** Renders the `**bold**` marks of the texts in core/content/guide.ts. */
export function rich(text: string) {
  return text.split('**').map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part));
}

function PinIcon({ kind }: { kind: 'a' | 'c' }) {
  return <span className={`guide-pin ${kind}`} aria-hidden="true"><i /></span>;
}

interface GuideProps {
  step: 1 | 2 | 3;
  /** Suggested expedition: step 1 points at its pin and step 3 explains the orange button. */
  next: Pick<MapPoint, 'id' | 'title'> | null;
  onNext: () => void;
  /** «Saltar guía», Escape or the browser's back button. */
  onClose: () => void;
  /** «Explorar por mi cuenta». */
  onFinish: () => void;
  /** The primary action of the last step: opens `next`, as tapping its pin does. */
  onStart: () => void;
  fallbackFocus?: () => HTMLElement | null | undefined;
}

/** The three steps of the first-visit guide (#256): the pin, the registry and the orange button. */
export function Guide({ step, next, onNext, onClose, onFinish, onStart, fallbackFocus }: GuideProps) {
  const wide = useMediaQuery(`(min-width: ${NARROW_PX}px)`);
  const total = guideTotal(next !== null);
  const last = step === total;
  const anchor: GuideAnchor | null =
    step === 1 ? (next ? { selector: `.vp [data-key="${next.id}"]`, ring: 'round' } : null)
    : step === 2 ? { selector: '.reg-wrap', ring: 'box' }
    : { selector: '.leftcol .btn.resume', ring: 'box' };

  const skip = <button type="button" className="btn" onClick={onClose}>{GUIDE_LABELS.skip}</button>;
  const more = <button type="button" className="btn primary" onClick={onNext}>{GUIDE_LABELS.next}{Icon.next}</button>;
  const explore = (
    <button type="button" className={next ? 'btn' : 'btn primary'} onClick={onFinish}>{GUIDE_LABELS.explore}</button>
  );
  const start = next && <button type="button" className="btn primary" onClick={onStart}>{introStartLabel(next)}{Icon.next}</button>;

  return (
    <GuideStep anchor={anchor} side={step === 3 ? 'above' : 'below'} step={step} titleId="guide-title" onClose={onClose} fallbackFocus={fallbackFocus}>
      <span className="guide-kicker">Guía · {step} de {total}</span>
      {step === 1 && (
        <>
          <h2 className="guide-title" id="guide-title" tabIndex={-1}>{GUIDE_PIN.title}</h2>
          <ul className="guide-rows">
            <li><PinIcon kind="a" /><span>{rich(guidePinText(next))}</span></li>
            <li><PinIcon kind="c" /><span>{rich(GUIDE_PIN.place)}</span></li>
          </ul>
          <p className="guide-note">{wide ? GUIDE_GESTURES.desktop : GUIDE_GESTURES.phone}</p>
          <div className="guide-actions">{skip}{more}</div>
        </>
      )}
      {step === 2 && (
        <>
          <h2 className="guide-title" id="guide-title" tabIndex={-1}>{GUIDE_REGISTRY.title}</h2>
          <p>{guideRegistryText(!wide)}</p>
          <p className="guide-note">{rich(GUIDE_REGISTRY.note)}</p>
          {/* Without a suggested expedition (the six are done) there is no third step: this one ends the guide. */}
          <div className={`guide-actions${!wide && !last ? ' stacked' : ''}`}>{last ? explore : <>{skip}{more}</>}</div>
        </>
      )}
      {step === 3 && next && (
        <>
          <h2 className="guide-title" id="guide-title" tabIndex={-1}>Tu próxima expedición</h2>
          <p>{rich(guideNextText(next))}</p>
          <div className="guide-actions stacked">{explore}{start}</div>
        </>
      )}
    </GuideStep>
  );
}
