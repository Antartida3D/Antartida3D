/**
 * Content of the expedition of Poncho (issue #9): the life of the Argentine polar sled dog told as a
 * trip over the Antarctic map, with the same shape as the trip «Desde Ushuaia» (content/ushuaia.ts):
 * the dog team is one more transport (`kind: 'dogs'`) whose trip has legs (sled on the ice, ship on the sea) and whose stops are milestones.
 * Texts come from docs/expediciones/poncho.md; source codes point to VOYAGE_SOURCES.
 */
import type { ExpeditionStop, Milestone, Transport, TripSegment, VoyageFact, VoyageSourceCode } from './ushuaia.ts';

/**
 * Route of the team as [lon, lat] waypoints, in the order of the story: Base Esperanza (where Poncho was
 * born in 1961), the Foca nunataks and Base San Martín (the winter expedition of 1962), the Belgrano
 * area on the Filchner ice shelf (1964-66), the Santa Fe peak (the «Paralelo 82» patrol of 1965), back to
 * the Belgrano area and, in 1967, Duse Bay near Esperanza.
 *
 * ILLUSTRATIVE: it is not a logged track. The curve joins places whose coordinates are verified
 * (docs/expediciones/poncho-fuentes.md, section 3) and two approximate ones: Belgrano I has no verified
 * coordinate, so it is drawn on the Filchner ice shelf, and the way back to it is a second, nearby point.
 */
// Waypoints of the route below ([lon, lat]).
const ESPERANZA = [-57.0, -63.4] as const;
const FOCA_NUNATAKS = [-60.25, -65.07] as const;
const SAN_MARTIN = [-67.1, -68.13] as const;
/** APPROXIMATE: central point of the Filchner ice shelf (SCAR gazetteer), standing for Base Belgrano I. */
const BELGRANO_AREA = [-40, -79] as const;
const SANTA_FE_PEAK = [-41.33, -82.05] as const;
/** APPROXIMATE and ILLUSTRATIVE: a point near Belgrano for the way back of the patrol, only to draw the curve. */
const BELGRANO_RETURN = [-41, -79.6] as const;
const DUSE_BAY = [-57.33, -63.5] as const;
/** Ushuaia as the trip «Desde Ushuaia» marks it (`[Fuente a definir]` there too). */
const USHUAIA = [-68.3, -54.81] as const;
const SOUTH_POLE = [0, -90] as const;

/** The legs of the trip of the team, in the order of the story. For now a single leg on the sled: see the waypoints above. */
export const PONCHO_SEGMENTS: readonly TripSegment[] = [
  {
    vehicle: 'sled',
    seconds: 60,
    waypoints: [ESPERANZA, FOCA_NUNATAKS, SAN_MARTIN, BELGRANO_AREA, SANTA_FE_PEAK, BELGRANO_RETURN, DUSE_BAY],
  },
];

/** The team: Poncho in front, the sled and the pack behind. */
export const PONCHO_TRANSPORT: Transport = {
  id: 'poncho',
  kind: 'dogs',
  name: 'Poncho y su jauría',
  type: 'Trineo de perros',
  pitch: 'Un perro polar argentino guía el trineo por el hielo.',
  // Own estimate: the book says a team covered 40 to 50 km in more than six hours on level ground.
  cruiseKmh: 7,
  // TODO(#79): the icebreaker with dogs on board, a model of its own; until then the leg by sea draws a generic ship.
  models: { ship: 'irizar' },
  facts: [
    { text: 'Poncho nació el 10 de abril de 1961 en la Base Esperanza y fue perro-guía de trineo durante años de expediciones.', kind: 'real', sources: ['P1'] },
  ],
};

const real = (text: string, ...sources: VoyageSourceCode[]): VoyageFact => ({ text, kind: 'real', sources });
const illustrative = (text: string): VoyageFact => ({ text, kind: 'illustrative', sources: [] });

/** In trip order, which is also the order of the story (the `year` never goes down). The first one opens at departure. */
export const PONCHO_MILESTONES: readonly Milestone[] = [
  {
    id: 'raza',
    year: 1951,
    title: 'Un perro hecho para la Antártida',
    anchor: ESPERANZA,
    kinds: ['dogs'],
    essential: real('Desde 1951 los perros polares argentinos tiraron de los trineos en las patrullas del Ejército. Eran una raza en formación, con cruzas de Malamute, Groenlandés y Husky.', 'P1', 'P2'),
    more: [
      real('Según el libro, la raza estaba «en formación»; un artículo de la Fundación Marambio dice que inicia sus actividades en 1951, el año en que se fundó la Base San Martín (21 de marzo de 1951).', 'P1', 'P2', 'O2'),
      illustrative('El punto del mapa es ilustrativo: la raza no nació en un solo lugar, y se parte desde la Base Esperanza porque allí nació Poncho.'),
    ],
  },
  {
    id: 'nacimiento',
    year: 1961,
    title: 'Nace Poncho',
    anchor: ESPERANZA,
    kinds: ['dogs'],
    essential: real('Poncho nació el 10 de abril de 1961 en la Base Esperanza, en la Antártida. Sus padres también eran perros de trineo del Ejército.', 'P1'),
    more: [
      real('Tenía pelaje blanco cremoso con manchas grises y una «máscara» en la cara.', 'P1'),
      real('Esperanza es una base permanente argentina, fundada el 17 de diciembre de 1952.', 'O2'),
    ],
  },
  {
    id: 'instruccion',
    year: 1961,
    title: 'Aprende a tirar del trineo',
    anchor: ESPERANZA,
    kinds: ['dogs'],
    essential: real('En 1961, su primer año, Poncho aprendió a trabajar en equipo. Aprendió las voces de mando: «Auk» para ir a la derecha y «Quierr» para ir a la izquierda.', 'P1'),
    more: [
      real('A los seis meses lo ataron por primera vez a un trineo, en la tercera yunta (la tercera pareja de perros).', 'P1'),
      real('Su primera instrucción incluyó recorrer una línea de postes «en zigzag».', 'P1'),
    ],
  },
  {
    id: 'grietas',
    year: 1962,
    title: 'El olfato que encuentra grietas',
    anchor: FOCA_NUNATAKS,
    kinds: ['dogs'],
    essential: illustrative('Escena ilustrativa, tomada del relato de un libro: en 1962 Poncho iba olfateando el suelo y avisaba al conductor cuando había una grieta oculta bajo la nieve.'),
    more: [
      real('Las grietas ocultas bajo la nieve son uno de los mayores peligros del hielo. Según el libro, los perros-guía las detectaban «según se dice» por el olfato, y así los trineos las evitaban. Es la descripción del autor de una conducta típica del perro-guía, no una medición, y no hay otra fuente.', 'P1'),
      illustrative('El punto del mapa es ilustrativo: el relato no dice dónde ocurrió. Se dibuja en los nunataks Foca, un lugar del camino de 1962.'),
    ],
  },
  {
    id: 'expedicion-invernal-1962',
    year: 1962,
    title: 'La Expedición Terrestre Invernal',
    anchor: SAN_MARTIN,
    kinds: ['dogs'],
    essential: real('En pleno invierno de 1962 una expedición del Ejército fue de la Base Esperanza a la Base San Martín con trineos de perros y tractores. Poncho empezó como un perro más de la yunta y, al volver, a fines de octubre, ya era perro-guía: el que va adelante y marca el camino.', 'P1'),
    more: [
      real('Salió el 14 de junio de 1962 y llegó a San Martín el 25 de agosto.', 'P1'),
      real('El libro dice que las dos bases están a unos 800 km en línea recta y que el viaje de ida y vuelta pasó los 2.000 km.', 'P1'),
      real('San Martín se fundó el 21 de marzo de 1951 y estuvo desactivada entre febrero de 1960 y marzo de 1976: en 1962 estaba desocupada.', 'O2', 'P1'),
    ],
  },
  {
    id: 'refugio-san-nicolas',
    year: 1963,
    title: 'Materiales para un refugio',
    anchor: SAN_MARTIN,
    place: ESPERANZA,
    kinds: ['dogs'],
    essential: real('Desde 1963 Poncho fue siempre perro-guía. Ese año encabezó el transporte de materiales para construir el refugio San Nicolás.', 'P1'),
    more: [
      real('La cronología del libro enumera otras patrullas de 1963 y estima más de 1.500 km recorridos ese año: es una cifra del libro, sin otra fuente.', 'P1'),
      illustrative('La posición en el mapa es ilustrativa y aproximada: el refugio estaba en la zona de la Base Esperanza, pero no hay una coordenada verificada.'),
    ],
  },
  {
    id: 'traslado-belgrano',
    year: 1964,
    title: 'Rumbo a Belgrano',
    anchor: BELGRANO_AREA,
    kinds: ['dogs'],
    essential: real('En diciembre de 1964 Poncho fue trasladado a la Base General Belgrano, mucho más al sur, sobre la barrera de hielo. Se preparaba la primera marcha terrestre argentina al Polo Sur.', 'P1'),
    more: [
      real('Estos traslados se hacían con ayuda del rompehielos.', 'P1'),
      real('La barrera de hielos Filchner está cerca de los 79° S y los 40° O (es un punto aproximado de una entidad muy grande, no un punto exacto).', 'P3'),
      illustrative('La posición ilustrativa de la Base Belgrano en el mapa es aproximada: no hay una coordenada verificada y se dibuja sobre la barrera de hielos Filchner.'),
    ],
  },
  {
    id: 'ae-205',
    year: 1965,
    title: 'El rescate del avión AE-205',
    anchor: BELGRANO_AREA,
    kinds: ['dogs'],
    essential: real('A fines de septiembre de 1965 un pequeño avión, el «AE-205», tuvo que aterrizar de emergencia por una nevada tan blanca que no dejaba ver el horizonte. Los cuatro tripulantes sobrevivieron: una patrulla de dos hombres y siete perros, con Poncho al frente, los encontró al cuarto día.', 'P1'),
    more: [
      real('En 1968 Poncho volvió al lugar para ayudar a recuperar partes del avión.', 'P1'),
      real('El libro ubica el accidente al sudeste de la Base General Belgrano. No lo confirma ninguna fuente oficial que hayamos encontrado.', 'P1'),
      illustrative('La posición en el mapa es ilustrativa y aproximada: no hay una coordenada verificada del lugar del accidente.'),
    ],
  },
  {
    id: 'operacion-90-patrulla-82',
    year: 1965,
    title: 'La patrulla «Paralelo 82»',
    anchor: SANTA_FE_PEAK,
    kinds: ['dogs'],
    essential: real('En 1965 el Ejército Argentino organizó la «Operación 90», una expedición terrestre al Polo Sur. Poncho no fue hasta el Polo: guió una patrulla de trineos de perros, la «Paralelo 82», que exploró por delante del grupo motorizado y llegó más allá de los 83° de latitud sur.', 'P1', 'O12'),
    more: [
      real('La expedición salió de la Base Belgrano el 26 de octubre de 1965.', 'O12'),
      real('Según el libro, el grupo motorizado se separó de la patrulla de perros el 18 de noviembre de 1965. La patrulla hizo tareas de cartografía y geología.', 'P1'),
      real('El libro afirma que fueron «los primeros perros y los primeros hombres en recorrer esa región del planeta en trineo». Es una frase del libro: no está verificada en otra fuente.', 'P1'),
      real('El pico Santa Fe está a unos 82°03′ S y 41°20′ O.', 'P3'),
      illustrative('El camino es ilustrativo: el pin marca el pico Santa Fe, cerca de donde exploró la patrulla. El libro no da la posición exacta de los 83° S.'),
    ],
  },
  {
    id: 'polo-sur',
    year: 1965,
    title: 'El Polo Sur, alcanzado por el grupo motorizado',
    anchor: SANTA_FE_PEAK,
    place: SOUTH_POLE,
    kinds: ['dogs'],
    essential: real('El 10 de diciembre de 1965 el grupo de tractores de la Operación 90 llegó al Polo Sur, después de 66 días de marcha. Poncho no estuvo allí: su patrulla se había separado antes y siguió explorando.', 'O12', 'P1'),
    more: [
      real('El grupo regresó a la Base Belgrano el 31 de diciembre de 1965.', 'O12'),
      real('El libro dice que el grupo motorizado recorrió casi 3.000 km.', 'P1'),
      illustrative('El pin ilustrativo está en el Polo Sur geográfico (90° S), que es contexto: el trineo de Poncho no llegó hasta allí.'),
    ],
  },
  {
    id: 'barranco',
    year: 1965,
    title: 'El barranco frente al pico Santa Fe',
    anchor: SANTA_FE_PEAK,
    kinds: ['dogs'],
    essential: illustrative('Escena ilustrativa, tomada del relato de un libro: el trineo de Poncho desapareció tras un filo de nieve, donde había un barranco de unos 200 metros. Con una orden tranquila, Poncho tiró hacia arriba y los hombres sacaron el trineo.'),
    more: [
      real('Según el libro, los hombres quedaron aferrados a unas rocas mientras Poncho, sentado, comía nieve. Es una anécdota del autor, sin otra fuente ni fecha exacta.', 'P1'),
    ],
  },
  {
    id: 'paracaidas',
    year: 1966,
    title: 'Poncho paracaidista',
    anchor: BELGRANO_RETURN,
    kinds: ['dogs'],
    essential: real('En el verano de 1966, en un ejercicio de rescate, Poncho saltó en paracaídas desde un helicóptero del rompehielos San Martín, junto con otros dos perros y dos oficiales.', 'P1'),
    more: [
      real('El salto fue parte del entrenamiento para rescates en el hielo. Según el libro, ocurrió a unos 30 km al sur de la Base Belgrano.', 'P1'),
      illustrative('La posición en el mapa es ilustrativa y aproximada: no hay una coordenada verificada de la Base Belgrano.'),
    ],
  },
  {
    id: 'filchner',
    year: 1966,
    title: 'Hacia la barrera de hielos Filchner',
    anchor: BELGRANO_RETURN,
    kinds: ['dogs'],
    essential: real('En 1966 Poncho participó en una patrulla de reconocimiento y, en noviembre, en la expedición a la barrera de hielos Filchner. Los perros viajaron como pasajeros en trineos arrastrados por tractores y, cuando el terreno se volvía peligroso por las grietas, los bajaban para que trabajaran adelante, como guías.', 'P1'),
    more: [
      real('El libro dice que en esa campaña los hombres de Belgrano recorrieron casi 7.000 km. La cifra no está verificada en otra fuente.', 'P1'),
      real('La barrera de hielos Filchner está cerca de los 79° S y los 40° O (punto aproximado de la entidad).', 'P3'),
      illustrative('La posición en el mapa es ilustrativa y aproximada: caleta Jardinero, lugar que nombra el libro, no tiene una coordenada verificada.'),
    ],
  },
  {
    id: 'duse',
    year: 1967,
    title: 'La brújula perdida en la bahía Duse',
    anchor: DUSE_BAY,
    kinds: ['dogs'],
    essential: illustrative('Escena ilustrativa, tomada del relato de un libro: en agosto de 1967 una ventisca sorprendió a una patrulla que volvía a Esperanza y la brújula se perdió en la nieve. Sin instrumentos y sin ver nada, la patrulla siguió a Poncho, que la llevó hasta las luces de la base.'),
    more: [
      real('No hay otra fuente de este episodio: es el relato del libro.', 'P1'),
      real('La bahía Duse está en el extremo de la Península Antártica, cerca de la Base Esperanza, a unos 63°30′ S y 57°20′ O (otros catálogos la ubican algo más al sur).', 'P3'),
    ],
  },
  {
    id: 'ushuaia',
    year: 1973,
    title: 'Un retiro en Ushuaia',
    anchor: DUSE_BAY,
    place: USHUAIA,
    kinds: ['dogs'],
    essential: real('En 1973, ya veterano, Poncho dejó la Antártida a bordo del rompehielos San Martín y llegó a Ushuaia. Lo recibió una familia de la ciudad que tenía un hotel llamado «Antártida».', 'P1'),
    more: [
      real('En 1976 sufrió un accidente y, aunque un veterinario aconsejó sacrificarlo, la familia se negó.', 'P1'),
      real('En 1977 y 1978 volvió a tirar de un trineo, esta vez con niños fueguinos, y participó en desfiles.', 'P1'),
      illustrative('La posición ilustrativa de Ushuaia en el mapa es aproximada y está a definir: no hay un punto verificado para el hotel, que según el libro ya no existe.'),
    ],
  },
  {
    id: 'muerte',
    year: 1978,
    title: 'El final de Poncho',
    anchor: DUSE_BAY,
    place: USHUAIA,
    kinds: ['dogs'],
    essential: real('En la primavera de 1978 Poncho murió en Ushuaia, con casi 18 años.', 'P1'),
    more: [
      real('Se intentó conservar su cuerpo, pero la taxidermia no prosperó.', 'P1'),
      illustrative('La posición ilustrativa de Ushuaia en el mapa es aproximada y está a definir.'),
    ],
  },
  {
    id: 'protocolo-madrid',
    year: 1991,
    title: 'Los perros dejan la Antártida',
    anchor: DUSE_BAY,
    kinds: ['dogs'],
    essential: real('En 1991 los países del Tratado Antártico aprobaron el Protocolo de Madrid, que protege el ambiente de la Antártida. Una de sus normas pide no tener animales que no son de allí, como los perros: la Argentina los retiró de sus bases y esa raza ya no existe en la Antártida.', 'I2', 'P1'),
    more: [
      real('Según el libro, los perros polares fueron a destacamentos de Gendarmería en Mendoza, Neuquén y Ushuaia.', 'P1'),
      illustrative('El punto del mapa es ilustrativo: el retiro se hizo base por base y se muestra cerca de Esperanza, donde empezó la historia.'),
    ],
  },
];

/** What the team tells at each milestone, by milestone id: a question for kids and adults, answered in the card. */
export const PONCHO_EXPEDITION: Readonly<Record<string, ExpeditionStop>> = {
  instruccion: {
    notes: [],
    question: {
      prompt: '¿Qué voz de mando le indica a la yunta ir a la derecha?',
      options: ['«Quierr»', '«Auk»', '«Alto»'],
      answer: 1,
    },
  },
  grietas: {
    notes: [
      { fact: real('Según el libro, el perro-guía olfateaba el suelo y avisaba al conductor cuando había una grieta: así los trineos de perros la evitaban.', 'P1') },
    ],
    question: {
      prompt: 'Según el relato, ¿qué hacía Poncho al detectar una grieta?',
      options: ['Saltaba por encima y seguía', 'Avisaba al conductor', 'Se echaba a dormir'],
      answer: 1,
    },
  },
  'operacion-90-patrulla-82': {
    notes: [],
    question: {
      prompt: '¿Poncho llegó al Polo Sur?',
      options: ['Sí, fue el primer perro en llegar', 'No: su patrulla exploró por delante del grupo motorizado', 'No: nunca salió de Esperanza'],
      answer: 1,
    },
  },
  paracaidas: {
    notes: [],
    question: {
      prompt: '¿Desde dónde saltó Poncho en paracaídas?',
      options: ['Un avión Hércules', 'Un globo', 'Un helicóptero'],
      answer: 2,
    },
  },
  duse: {
    notes: [],
    question: {
      prompt: 'Según el relato, cuando se perdió la brújula, ¿cómo volvió la patrulla a la base?',
      options: ['Siguiendo a Poncho', 'Siguiendo las estrellas', 'Esperando a que pasara la ventisca'],
      answer: 0,
    },
  },
};
