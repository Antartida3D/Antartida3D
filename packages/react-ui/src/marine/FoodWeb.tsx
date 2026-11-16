import {
  MARINE_LINKS, MARINE_ORGANISMS, MARINE_SOURCES, linkSentence, linksOf, type MarineOrganism,
} from '@antartida/core';

const ORGANISMS = Object.keys(MARINE_ORGANISMS) as MarineOrganism[];

/** The food web in the panel: pick an organism and read each of its arrows with source and scope. */
export function FoodWebPanel({ selected, onSelect }: { selected: MarineOrganism | null; onSelect: (o: MarineOrganism) => void }) {
  const links = selected ? linksOf(selected) : [];
  return <div className="marine-web">
    <div className="marine-web-picks" role="group" aria-label="Organismos de la red">
      {ORGANISMS.map((o) => (
        <button key={o} aria-pressed={selected === o} onClick={() => onSelect(o)}>{MARINE_ORGANISMS[o].label}</button>
      ))}
    </div>
    {selected
      ? <ul className="marine-web-links" aria-label={`Conexiones de ${MARINE_ORGANISMS[selected].label}`}>
        {links.map((l) => (
          <li key={`${l.from}>${l.to}`}>
            <b>{linkSentence(l)}</b>
            <span>{l.scope} · {l.note}</span>
            <small>{l.sources.map((id) => <a key={id} href={MARINE_SOURCES[id].url} target="_blank" rel="noopener noreferrer">{id} ↗</a>)}</small>
          </li>
        ))}
      </ul>
      : <p className="marine-observation">{MARINE_LINKS.length} flechas documentadas. Elegí un organismo para leerlas.</p>}
    <small className="marine-web-legend">Esquema de relaciones registradas en distintos lugares de la Antártida · sin cantidades ni predicciones.</small>
  </div>;
}

/** Positions of the flat diagram (0..100 × 0..60): food below, consumers above. */
const DIAGRAM: Readonly<Record<MarineOrganism, readonly [number, number]>> = {
  producers: [22, 55], krill: [22, 36], fish: [46, 36], squid: [66, 36], 'penguins-seals': [86, 36],
  humpback: [8, 10], minke: [28, 10], emperor: [50, 10], leopard: [70, 10], orca: [90, 10],
};

/** The same web as a drawing, for the tour without WebGL. */
export function WebDiagram({ selected }: { selected: MarineOrganism | null }) {
  const active = selected ? new Set(linksOf(selected)) : null;
  return <svg className="marine-diagram" viewBox="0 0 100 62" role="img" aria-label="Esquema de la red alimentaria: cada flecha va del alimento a quien lo come">
    <defs><marker id="marine-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="currentColor" /></marker></defs>
    {MARINE_LINKS.map((l) => {
      const [x1, y1] = DIAGRAM[l.from], [x2, y2] = DIAGRAM[l.to];
      const state = !active ? '' : active.has(l) ? 'is-on' : 'is-off';
      return <line key={`${l.from}>${l.to}`} className={state} x1={x1} y1={y1 - 3} x2={x2} y2={y2 + 3.5} markerEnd="url(#marine-arrow)" />;
    })}
    {ORGANISMS.map((o) => {
      const [x, y] = DIAGRAM[o];
      return <text key={o} x={x} y={y} className={selected === o ? 'is-on' : ''}>{MARINE_ORGANISMS[o].label}</text>;
    })}
  </svg>;
}
