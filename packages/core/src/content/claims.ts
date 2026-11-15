export type ClaimId = 'ar' | 'cl' | 'gb' | 'au' | 'fr' | 'nz' | 'no';
export type ClaimsCoverage = 'sectors' | 'land';

export interface ClaimSource {
  url: string;
  organization: string;
  consulted: string;
}

export interface ClaimAnchor {
  lon: number;
  lat: number;
}

/** East may exceed 180 degrees to keep an antimeridian-crossing sector continuous. */
export interface ClaimSector {
  west: number;
  east: number;
  /** Illustrative position, not the location of a real flagpole. */
  flag: ClaimAnchor;
}

export interface ClaimIsland extends ClaimAnchor {
  name: string;
  source: ClaimSource;
}

export interface AntarcticClaim {
  id: ClaimId;
  name: string;
  color: string;
  description: string;
  source: ClaimSource;
  sectors: readonly ClaimSector[];
  islands: readonly ClaimIsland[];
}

/** National positions, not internationally agreed borders. See docs/reclamos-antarticos-fuentes.md. */
export const ANTARCTIC_CLAIMS: readonly AntarcticClaim[] = [
  {
    id: 'ar', name: 'Argentina', color: '#168dde',
    description: 'Sector Antártico Argentino: entre 74° O y 25° O, al sur de 60° S. Se superpone con los reclamos de Chile y del Reino Unido.',
    source: { url: 'https://cancilleria.gob.ar/es/politica-exterior/antartida-argentina', organization: 'Ministerio de Relaciones Exteriores, Argentina', consulted: '2026-11-14' },
    sectors: [{ west: -74, east: -25, flag: { lon: -35, lat: -81 } }], islands: [],
  },
  {
    id: 'cl', name: 'Chile', color: '#e03540',
    description: 'Territorio Chileno Antártico: entre 90° O y 53° O. Se superpone con los reclamos de Argentina y del Reino Unido.',
    source: { url: 'https://nuevo.leychile.cl/servicios/Consulta/Exportar?exportar_con_notas_al_pie=True&exportar_con_notas_bcn=True&exportar_con_notas_originales=True&exportar_formato=pdf&hddResultadoExportar=1017683.1955-06-21.0.0%23&nombrearchivo=Decreto-1747_21-JUN-1955&radioExportar=Normas', organization: 'Biblioteca del Congreso Nacional de Chile, Decreto 1747 de 1940', consulted: '2026-11-14' },
    sectors: [{ west: -90, east: -53, flag: { lon: -80, lat: -79 } }], islands: [],
  },
  {
    id: 'gb', name: 'Reino Unido', color: '#8d49cf',
    description: 'Territorio Antártico Británico: entre 80° O y 20° O, al sur de 60° S. Se superpone con los reclamos de Argentina y de Chile.',
    source: { url: 'https://www.gov.uk/world/organisations/british-antarctic-territory', organization: 'Gobierno del Reino Unido', consulted: '2026-11-14' },
    sectors: [{ west: -80, east: -20, flag: { lon: -60, lat: -84 } }], islands: [],
  },
  {
    id: 'au', name: 'Australia', color: '#d5a000',
    description: 'Territorio Antártico Australiano: entre 45° E y 160° E, al sur de 60° S, con exclusión de Tierra Adelia (136° E–142° E).',
    source: { url: 'https://www.ga.gov.au/scientific-topics/national-location-information/geography/australian-antarctic-territory', organization: 'Geoscience Australia', consulted: '2026-11-14' },
    sectors: [{ west: 45, east: 136, flag: { lon: 90, lat: -78 } }, { west: 142, east: 160, flag: { lon: 150, lat: -77 } }], islands: [],
  },
  {
    id: 'fr', name: 'Francia', color: '#275ada',
    description: 'Tierra Adelia: entre 136° E y 142° E. La visualización cubre la superficie antártica de ese sector.',
    source: { url: 'https://taaf.fr/collectivites/presentation-des-territoires/la-terre-adelie/', organization: 'Terres australes et antarctiques françaises', consulted: '2026-11-14' },
    sectors: [{ west: 136, east: 142, flag: { lon: 139, lat: -69 } }], islands: [],
  },
  {
    id: 'nz', name: 'Nueva Zelanda', color: '#159b6a',
    description: 'Dependencia Ross: entre 160° E y 150° O, al sur de 60° S; el sector atraviesa el antimeridiano.',
    source: { url: 'https://nzhistory.govt.nz/page/new-zealand-makes-claim-ross-dependency', organization: 'Manatū Taonga — Ministry for Culture and Heritage', consulted: '2026-11-14' },
    sectors: [{ west: 160, east: 210, flag: { lon: 180, lat: -80 } }], islands: [],
  },
  {
    id: 'no', name: 'Noruega', color: '#ef7926',
    description: 'Tierra de la Reina Maud: entre 20° O y 45° E, desde la costa hacia el interior. El gobierno noruego no se ha opuesto a interpretar el reclamo hasta el polo. El recorte visual en 60° S no es un límite noruego. La isla Pedro I es un reclamo separado.',
    source: { url: 'https://www.regjeringen.no/en/documents/meld.-st.-32-20142015/id2415997/?ch=3', organization: 'Gobierno de Noruega, Antarctic interests and policy (2014–2015)', consulted: '2026-11-14' },
    sectors: [{ west: -20, east: 45, flag: { lon: 15, lat: -77 } }],
    islands: [{ name: 'Isla Pedro I', lon: -90 - 35 / 60, lat: -68 - 50 / 60, source: { url: 'https://npolar.no/tema/peter-i-oy/', organization: 'Norwegian Polar Institute', consulted: '2026-11-14' } }],
  },
];

export const ANTARCTIC_CLAIMS_CONTEXT = {
  description: 'Reclamos territoriales, no fronteras acordadas. El artículo IV del Tratado Antártico preserva las posiciones de las partes y no permite nuevos reclamos ni ampliaciones mientras esté en vigor.',
  cartography: 'Superficies transparentes con bordes punteados. Posición y tamaño de las banderas ilustrativos. Los colores muestran posiciones nacionales, no fronteras acordadas.',
  source: { url: 'https://www.ats.aq/s/antarctictreaty.html', organization: 'Secretaría del Tratado Antártico', consulted: '2026-11-14' } satisfies ClaimSource,
} as const;
