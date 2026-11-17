import { FOSSIL_SOURCES, type FossilSourceId } from './content/fossils.ts';
import { CERRO_NEVADO_SOURCES, type CerroNevadoSourceId } from './content/cerro-nevado.ts';
import { MARAMBIO_PHOTO_ARCHIVE, MARAMBIO_SOURCES } from './content/marambio.ts';
import { MARINE_SOURCES, type MarineSourceId } from './content/marine.ts';
import { ORCADAS_FACTS, ORCADAS_SOURCES, isPublishable } from './content/orcadas.ts';
import type { Source } from './content/sea.ts';
import { ANTARCTIC_CLAIMS, ANTARCTIC_CLAIMS_CONTEXT } from './content/claims.ts';
import { PONCHO_PHOTOS, type PonchoPhoto } from './content/poncho-photos.ts';
import { VOYAGE_SOURCES, VOYAGE_SOURCES_CONSULTED, type VoyageSource, type VoyageSourceCode } from './content/ushuaia.ts';

/**
 * One source as the single sources view shows it (#264). Every content (trip, Orcadas, Océano,
 * Fósiles, Marambio, Cerro Nevado, map points) keeps its own shape; an adapter below turns each one
 * into this, so the view and its numbered citations `[N]` are written once.
 */
export interface CitedSource {
  id: string;
  title: string;
  org: string;
  url?: string;
  /** What the source covers and how it was read. */
  detail?: string;
  /** Date it was read, as the content wrote it; show it through `formatConsulted`. */
  consulted?: string;
  license?: string;
  /** Short name the citation shows instead of the number, when the source is a book (`«Libro · p. 9»`). */
  page?: string;
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** The date a source was read, in one format: `2026-11-11` and `11/11/2026` become «11 de noviembre de 2026»; free text stays. */
export function formatConsulted(date: string | undefined): string | undefined {
  if (!date) return undefined;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date);
  const [d, m, y] = iso ? [iso[3], iso[2], iso[1]] : dmy ? [dmy[1], dmy[2], dmy[3]] : [];
  const month = MONTHS[Number(m) - 1];
  return d && month ? `${Number(d)} de ${month} de ${y}` : date;
}

/** Number of a source in the list a view shows; 0 when it is not there. */
export const sourceNumber = (list: readonly CitedSource[], id: string) => list.findIndex((s) => s.id === id) + 1;

export const voyageCited = (code: VoyageSourceCode): CitedSource => {
  const source: VoyageSource = VOYAGE_SOURCES[code];
  return { id: code, title: source.title, org: source.org, url: source.url, consulted: source.consulted ?? VOYAGE_SOURCES_CONSULTED, page: source.short };
};

/** The source of a photograph of the team of Poncho: it is listed after the sources of the trip. */
export const ponchoPhotoCited = (photo: PonchoPhoto): CitedSource => ({
  id: `photo:${photo.file}`,
  title: photo.caption,
  org: photo.source.publisher,
  url: photo.source.url,
  consulted: photo.source.accessed,
  license: photo.credit ? `${photo.credit.license}, foto de ${photo.credit.author}` : undefined,
});

export const PONCHO_PHOTO_SOURCES: readonly CitedSource[] = PONCHO_PHOTOS.map(ponchoPhotoCited);

/** Sources of the territorial claims: one per country, and the treaty last. */
export const CLAIMS_CONTEXT_SOURCE_ID = 'claims-treaty';
export const claimsCited = (): CitedSource[] => [
  ...ANTARCTIC_CLAIMS.map((claim) => ({ id: `claim-${claim.id}`, title: claim.name, org: claim.source.organization, url: claim.source.url, consulted: claim.source.consulted })),
  {
    id: CLAIMS_CONTEXT_SOURCE_ID,
    title: 'Tratado Antártico, artículos IV y VI',
    org: ANTARCTIC_CLAIMS_CONTEXT.source.organization,
    url: ANTARCTIC_CLAIMS_CONTEXT.source.url,
    consulted: ANTARCTIC_CLAIMS_CONTEXT.source.consulted,
  },
];

export const orcadasCited = (): CitedSource[] =>
  ORCADAS_SOURCES.map((s) => ({ id: s.id, title: s.label, org: s.org, url: s.url, consulted: s.consulted, license: s.license, page: s.short }));

/** The map of the station scene of Orcadas: it is not cited by a fact but by the scene itself. */
export const ORCADAS_OSM_SOURCE_ID = 'osm-site';
const ORCADAS_OSM_SOURCE: CitedSource = {
  id: ORCADAS_OSM_SOURCE_ID,
  title: 'OpenStreetMap: edificios y costa de la Base Orcadas',
  org: 'colaboradores de OpenStreetMap',
  url: 'https://www.openstreetmap.org/#map=18/-60.7378/-44.7375',
  license: 'ODbL 1.0',
  consulted: '12 de noviembre de 2026',
  page: 'OpenStreetMap',
};

/** Sources of the Orcadas expedition: the ones its publishable facts cite, in registry order, and then the map of the scene. */
export const orcadasUsedCited = (): CitedSource[] => {
  const used = new Set(ORCADAS_FACTS.filter(isPublishable).flatMap((f) => f.sourceIds));
  return [...orcadasCited().filter((s) => used.has(s.id)), ORCADAS_OSM_SOURCE];
};

export const marineCited = (id: MarineSourceId): CitedSource => {
  const s = MARINE_SOURCES[id];
  return { id, title: s.title, org: s.org, url: s.url, detail: s.read === 'abstract' ? `${s.detail} Leído en su resumen.` : s.detail, consulted: s.date };
};

export const fossilCited = (id: FossilSourceId): CitedSource => {
  const s = FOSSIL_SOURCES[id] as { title: string; org: string; date: string; url: string | null; detail: string };
  return { id, title: s.title, org: s.org, url: s.url ?? undefined, detail: s.detail, consulted: s.date };
};

/** Sources of Marambio, and the family photo archive last: no fact cites it, but the photographs do. */
export const marambioCited = (): CitedSource[] => [
  ...MARAMBIO_SOURCES.map((s) => ({ id: s.id, title: s.label, org: s.org, url: s.url, consulted: s.consulted, license: s.license, page: s.short })),
  {
    id: 'photo-archive',
    title: MARAMBIO_PHOTO_ARCHIVE.label,
    org: MARAMBIO_PHOTO_ARCHIVE.org,
    detail: `${MARAMBIO_PHOTO_ARCHIVE.detail} Archivo familiar, sin enlace público.`,
    consulted: MARAMBIO_PHOTO_ARCHIVE.consulted,
  },
];

export const cerroNevadoCited = (id: CerroNevadoSourceId): CitedSource => {
  const s = CERRO_NEVADO_SOURCES[id];
  return { id, title: s.label, org: s.org, url: s.url, consulted: s.consulted, page: s.short };
};

/** A source of a map point; it has no id of its own, so its place in the point's list is its id. */
export const pointCited = (source: Source, index: number): CitedSource => ({
  id: String(index), title: source.label, org: source.org, url: source.url, consulted: source.consulted,
});
