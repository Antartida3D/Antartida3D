/**
 * Content of the expedition of Poncho (issue #9): the life of the Argentine polar sled dog told as a short
 * story over the Antarctic map, with the same shape as the trip «Desde Ushuaia» (content/ushuaia.ts): the dog
 * team is one more transport (`kind: 'dogs'`) whose trip has legs (sled on the ice, ship on the sea) and whose
 * stops are milestones.
 *
 * Each card tells a moment in two or three short sentences, close to the dog (`essential`), and closes with a line
 * that opens curiosity for the next stop (`hook`); the data behind it, each with its source, are in «Saber más» (`more`).
 * The story is faithful in facts and free in form: same facts and same order as the book, no invented dialogue or
 * thoughts. The hooks and the joins tell no fact (nothing to cite): a test keeps figures and names out of them. The book (source P1, a secondary source) is cited with the page
 * of its PDF where the fact is (`pages`): its citation links to that page.
 * Source codes point to VOYAGE_SOURCES.
 */
import type { Milestone, Transport, VoyageFact, VoyageSourceCode } from './ushuaia.ts';
import { BELGRANO_AREA, BELGRANO_RETURN, DUSE_BAY, ESPERANZA, FOCA_NUNATAKS, SAN_MARTIN, USHUAIA } from './poncho-route.ts';

/** The only warning of the trip: shown once, on the start panel and on the sources page. */
export const PONCHO_NOTICE = 'El recorrido y los modelos son una ilustración, no una ruta real.';

/** The team: Poncho in front, the sled and the pack behind. */
export const PONCHO_TRANSPORT: Transport = {
  id: 'poncho',
  kind: 'dogs',
  name: 'Poncho y su jauría',
  type: 'Trineo de perros',
  pitch: 'Un perro polar argentino guía el trineo por el hielo.',
  // Own estimate: the book says a team covered 40 to 50 km in more than six hours on level ground.
  cruiseKmh: 7,
  models: { ship: 'poncho-ship' },
  notice: PONCHO_NOTICE,
  facts: [
    { text: 'Poncho nació el 10 de abril de 1961 en la Base Esperanza.', kind: 'real', sources: ['P1'], pages: { P1: 4 } },
    { text: 'Desde 1963 fue siempre perro-guía: el perro que va al frente del trineo y marca el camino.', kind: 'real', sources: ['P1'], pages: { P1: 4 } },
  ],
};

/** A fact of the book: its page is the one of the PDF where it is. `others` are other sources that back it up. */
const book = (page: number, text: string, ...others: VoyageSourceCode[]): VoyageFact => ({
  text,
  kind: 'real',
  sources: ['P1', ...others],
  pages: { P1: page },
});
/** A fact that only another source tells. */
const real = (text: string, ...sources: VoyageSourceCode[]): VoyageFact => ({ text, kind: 'real', sources });

/**
 * Only for the place of the stop where the icebreaker takes Poncho away (the trip does not say where along the
 * sea it is): a point of the Drake Passage, between Duse Bay and Ushuaia. The stop opens at the point of its leg nearest to it.
 */
const DRAKE_PASSAGE = [-62.5, -59.5] as const;

/**
 * In trip order, which is also the order of the story (the `year` never goes down). The first one opens at departure
 * and the last one on arrival. `segment` is the leg of the route where it opens (see poncho-route.ts): 0 sled on the
 * Peninsula, 1 ship to Belgrano, 2 sled at Belgrano and the Pole, 3 ship back, 4 sled at Esperanza, 5 ship to Ushuaia.
 * No two stops share a place within a leg.
 */
export const PONCHO_MILESTONES: readonly Milestone[] = [
  {
    id: 'nacimiento',
    year: 1961,
    segment: 0,
    title: 'Nace Poncho',
    anchor: ESPERANZA,
    kinds: ['dogs'],
    essential: book(5, 'Entre los hombres de gruesos abrigos naranjas que van y vienen por la Base Esperanza, nace Poncho el 10 de abril de 1961. Es el cachorro más juguetón de la camada, y sus hermanos lo siguen en cada paseo. Ahí mismo, los hombres instruyen a los perros: les enseñan los arneses, los trineos y las voces de mando.'),
    hook: 'Faltaba poco para su primera gran travesía.',
    more: [
      book(5, 'Tenía el pelaje blanco cremoso con manchas grises y una máscara inconfundible en la cara.'),
      book(4, 'Sus padres se llamaban Coca y Flecha.'),
      book(6, 'Era un perro polar argentino: una raza que el Ejército creó cruzando perros Malamute de Alaska, Groenlandeses y Husky.'),
      book(7, 'La raza empezó a formarse hacia 1951, cuando unos treinta suboficiales veterinarios del Ejército eligieron y cruzaron perros de forma sistemática.', 'P2'),
      book(8, 'A los seis meses de edad Poncho ocupó un lugar entre las yuntas (las parejas de perros) que tiraban de los trineos.'),
      book(9, 'Con “Auk” el perro gira a la derecha y con “Quierr”, a la izquierda. Su instructor lo practicó con Poncho atado a una cincha en su propia cintura, y después hicieron slalom entre postes durante una semana.'),
      book(5, 'Los hombres de la base vestían gruesos abrigos color naranja, botas blancas de lona encerada y mitones, y pasaban el día con los perros: los instruían y los acostumbraban a los arneses, a los trineos y a las voces de mando.'),
      real('Esperanza es una base permanente argentina, fundada el 17 de diciembre de 1952.', 'O2'),
    ],
  },
  {
    id: 'expedicion-invernal-1962',
    year: 1962,
    segment: 0,
    title: 'El olfato de Poncho',
    anchor: FOCA_NUNATAKS,
    kinds: ['dogs'],
    essential: book(12, 'Es 1962 y la gran expedición invernal ya está en marcha. Poncho va olfateando la nieve, con la cabeza que sube y baja, y camina despacio, como en cámara lenta. De pronto se detiene y mira al conductor; después camina en zigzag, y los hombres hunden bastones y piquetas hasta dar con una grieta ancha y honda.'),
    hook: 'La expedición todavía le tenía reservado un puesto nuevo.',
    more: [
      book(9, 'La Expedición Terrestre Invernal Antártica salió de la Base Esperanza el 14 de junio de 1962, con trineos de perros y tractores. Iba hasta la Base San Martín.'),
      book(9, 'La primera escala fue la Base Matienzo, sobre uno de los nunataks Foca. “Nunatak” viene del inuktitut y significa “pico solitario”: una roca rodeada de hielo.'),
      book(9, 'Las dos bases están a unos 800 km en línea recta: ida y vuelta, el viaje pasó los 2.000 km.'),
      book(6, 'Las grietas ocultas bajo la nieve eran el peligro más traicionero: algunas eran tan anchas y hondas que podían tragarse un trineo entero. Según se dice, ciertos perros las detectaban con el olfato.'),
      book(12, 'Poncho caminaba en zigzag para rodear lo que había descubierto. Los hombres clavaban sus bastones y piquetas en la nieve, y casi siempre encontraban una grieta ancha y honda.'),
    ],
  },
  {
    id: 'poncho-perro-guia',
    year: 1962,
    segment: 0,
    title: 'Poncho va al frente',
    anchor: SAN_MARTIN,
    kinds: ['dogs'],
    essential: book(12, 'En el regreso desde la Base San Martín, el instructor le da a Poncho el puesto nuevo: el Número 1 del tiro. Tiene un año y medio y ya sigue con eficiencia la huella del otro trineo. Cuando el trineo se detiene, se echa y se da vuelta hacia el conductor, y cuando llega la orden sale rápido hacia adelante: esa costumbre lo acompañará toda la vida.'),
    hook: 'Más adelante lo esperaba un viaje hacia el sur.',
    more: [
      book(10, 'Los trineos de perros llegaron a San Martín el 25 de agosto de 1962, después de subir hasta los 1.842 metros sobre el nivel del mar. Los expedicionarios descansaron allí un mes.'),
      real('La Base San Martín se fundó el 21 de marzo de 1951 y estuvo desactivada entre febrero de 1960 y marzo de 1976: en 1962 estaba desocupada.', 'O2'),
      book(12, 'Su instructor tardó solo diez días, salteados a lo largo de un mes, en enseñarle lo fundamental.'),
      book(12, 'Al volver a Esperanza, a fines de octubre de 1962, Poncho ya era el perro-guía que sería durante el resto de su vida.'),
    ],
  },
  {
    id: 'rumbo-a-belgrano',
    year: 1964,
    segment: 1,
    title: 'En rompehielos hacia Belgrano',
    anchor: ESPERANZA,
    kinds: ['dogs'],
    essential: book(14, 'Hacia el sur, mucho más al sur, está la Base General Belgrano, y en diciembre de 1964 Poncho viaja hacia allá. Estos traslados solían hacerse con ayuda de un rompehielos, y muchos otros perros viajaron junto con él. Es parte de los preparativos de la primera marcha argentina por tierra hasta el Polo Sur.'),
    hook: 'Allá, en el hielo, pronto haría falta un perro como él.',
    more: [
      book(14, 'Muchos de los perros elegidos habían trabajado bien en la Expedición Invernal de 1962.'),
      book(14, 'La Base Belgrano estaba sobre la barrera de hielos Filchner.'),
      book(14, 'La marcha al Polo se llamó Operación 90 por los 90 grados de latitud sur, que es donde está el Polo.'),
    ],
  },
  {
    id: 'rescate-ae-205',
    year: 1965,
    segment: 2,
    title: 'Al rescate de un avión',
    anchor: BELGRANO_AREA,
    kinds: ['dogs'],
    essential: book(18, 'Un avión ha caído en el hielo y el mal tiempo impide buscarlo desde el aire: hace falta un perro como Poncho. Sale una patrulla de dos hombres y siete perros, con Poncho al frente, y viaja tres jornadas entre ventiscas y grietas. Al cuarto día, apenas olfatea el avión, acelera el paso.'),
    hook: 'Pero la gran marcha seguía su camino.',
    more: [
      book(17, 'El avión era un Cessna 185B llamado AE-205. A fines de septiembre de 1965 aterrizó de emergencia por un blanqueo: un momento en que todo se pone blanco y el horizonte desaparece. Los cuatro tripulantes sobrevivieron.'),
      book(18, 'La patrulla viajó tres jornadas entre grietas y ventiscas, con temperaturas por debajo de los 30 grados bajo cero.'),
      book(18, 'Los sobrevivientes estaban en una zona llena de grietas: una de ellas se había tragado los víveres que un avión DC-3 les había lanzado el día anterior.'),
      book(18, 'En 1968 Poncho volvió al lugar para ayudar a recuperar las partes del avión.'),
    ],
  },
  {
    id: 'paracaidas',
    year: 1966,
    segment: 2,
    title: 'De la patrulla al salto en paracaídas',
    anchor: BELGRANO_RETURN,
    kinds: ['dogs'],
    essential: book(19, 'La gran marcha sigue su camino: Poncho guía a la patrulla Paralelo 82 por las montañas Santa Fe y hasta tira hacia arriba de un trineo que cayó a un barranco; después, la aventura es por el aire: en un helicóptero se abre la puerta y entra de golpe el aire helado. Los perros saltan con paracaídas y, mientras bajan, mueven las patas como si nadaran. Aterrizan en el hielo y en pocos minutos Poncho ya sale al frente del trineo, a rescatar a una patrulla perdida.'),
    hook: 'Pero otra tormenta ya lo esperaba.',
    more: [
      // The patrol of the Paralelo 82 (book p. 15-17), told here since it is no longer a stop of its own (#221, DEC-221).
      real('La expedición al Polo salió de la Base Belgrano el 26 de octubre de 1965.', 'O12'),
      book(15, 'La patrulla Paralelo 82 estaba formada por trineos de perros, y Poncho iba como líder de uno. Iba por delante de los tractores para detectar los peligros que pudieran frenarlos.'),
      book(15, 'El 18 de noviembre el grupo de tractores se separó de la patrulla de perros. Sin el ruido ni el humo de los motores, Poncho condujo a la patrulla por portezuelos y valles helados de las montañas Santa Fe. La patrulla hizo tareas de cartografía y geología, y llegó más allá de los 83 grados de latitud sur.'),
      book(16, 'Frente al pico Santa Fe el trineo de Poncho desapareció tras un filo de nieve, al borde de un barranco de unos 200 metros. Poncho esperaba tranquilo, comiendo nieve, hasta que le dieron la orden y tiró hacia arriba.'),
      real('El pico Santa Fe está a unos 82°03′ S y 41°20′ O.', 'P3'),
      book(17, 'Poncho no llegó al Polo Sur. Lo alcanzó el grupo de tractores el 10 de diciembre de 1965, después de 66 días de marcha.', 'O12'),
      // The jump (book p. 18-19).
      book(18, 'Poncho iba con otros dos perros polares, Pato y Bucky, envuelto en un arnés distinto al del trineo. Gimió bajito, y el suboficial a cargo del lanzamiento, que sentía un afecto especial por él, le apoyó la mano en el lomo.'),
      book(18, 'Junto con los perros se lanzaron un trineo desarmable, víveres y elementos de supervivencia. Dos oficiales saltaron antes desde otro helicóptero.'),
      book(18, 'El helicóptero era uno de los dos S-55 del rompehielos General San Martín. Nunca antes se había hecho algo así en la Antártida argentina.'),
      book(19, 'Los perros aterrizaron sobre el hielo, a unos 30 km al sur de la Base Belgrano. En minutos armaron el trineo y salieron con Poncho al frente a rescatar a una patrulla perdida. Volvieron a la base esa misma noche.'),
    ],
  },
  {
    id: 'brujula-perdida',
    year: 1967,
    segment: 4,
    title: 'La brújula perdida',
    anchor: DUSE_BAY,
    kinds: ['dogs'],
    essential: book(20, 'Otra tormenta: una ventisca fuerte sorprende a la patrulla de Poncho, a unos doce kilómetros de Esperanza. El trineo vuelca, la brújula se hunde en la nieve y nadie ve nada. Sin brújula, los hombres solo pueden seguir a Poncho, y después de dos horas a ciegas, ya de noche, aparecen las luces de la base.'),
    hook: 'Esa noche su legajo sumó una proeza más.',
    more: [
      book(19, 'Ocurrió un día de agosto de 1967, cuando la patrulla volvía a Esperanza cruzando la bahía Duse sobre mar congelado.'),
      book(20, 'Los vehículos a motor se frenaron en una cuesta de nieve blanda llamada Cuesta de los Afligidos. El trineo de Poncho volvió a buscar a los hombres que habían quedado a pie.'),
      book(20, 'El oficial a cargo clavó tres cañas con banderolas donde habían volcado, para volver a buscar la brújula.'),
      book(20, 'Después de dos horas de andar a ciegas, ya de noche, los hombres vieron las luces de la base: Poncho los había llevado hasta Esperanza. Tres días después, cuando pasó el temporal, recuperaron la brújula y los vehículos.'),
    ],
  },
  {
    id: 'adios-a-la-antartida',
    year: 1973,
    segment: 5,
    title: 'Poncho deja la Antártida',
    anchor: DRAKE_PASSAGE,
    kinds: ['dogs'],
    essential: book(21, 'Pasan los años y, en su legajo, aparece cada vez más una frase corta: “No trabajó”. Poncho ya no corre a la par de los perros jóvenes y en las patrullas largas se cansa. Un verano llega el rompehielos y lo llevan a bordo rumbo a Ushuaia: una excepción, en mérito a su prestigio.'),
    hook: 'Lejos de la nieve lo esperaba un mundo nuevo.',
    more: [
      book(21, 'En el legajo de Poncho se anotaba cada vez más seguido “No trabajó”: ya no corría a la par de los perros jóvenes y se cansaba en las patrullas largas.'),
      book(21, 'Que dejara la Antártida fue una excepción, en mérito a su prestigio.'),
      book(5, 'En 1973 lo trasladaron en el rompehielos hasta Ushuaia, donde lo recibió una familia que lo alojó en su hotel Antártida.'),
    ],
  },
  {
    id: 'ushuaia',
    year: 1978,
    segment: 5,
    title: 'Un final tranquilo en Ushuaia',
    anchor: USHUAIA,
    kinds: ['dogs'],
    essential: book(22, 'En ese mundo nuevo, Poncho vive plácidamente en el hotel de un viejo compañero de patrulla, como un perro retirado. Llega a vivir casi 18 años, mucho más que otros perros grandes. Una mañana de primavera de 1978, en el jardín, ya no despierta.'),
    hook: 'Así termina el camino de Poncho.',
    more: [
      book(21, 'En Ushuaia lo recibió un viejo compañero de patrulla, que había dejado el Ejército y tenía un hotel llamado Antártida. Poncho llevaba a los niños a pasear en un trineo improvisado, por las calles.'),
      book(21, 'En Ushuaia descubrió un mundo nuevo: conoció a los niños, los árboles, los caballos y las moscas, y allí hacía calor.'),
      book(22, 'En 1976 sufrió un accidente y un veterinario aconsejó sacrificarlo, pero la familia se negó.'),
      book(5, 'En 1977 y 1978 tiró de un trineo con niños fueguinos en desfiles y exhibiciones.'),
      book(22, 'Se intentó conservar su cuerpo, pero la taxidermia no prosperó.'),
    ],
  },
];

/** An act of the story: it opens at its first stop, whose card shows the title as a small label above its own. */
export interface PonchoAct {
  id: string;
  title: string;
  /** Id of the first milestone of the act; the act lasts until the first one of the next. */
  firstStop: string;
}

/** The story in four acts, with an emotional arc: the puppy who learns, the guide they trust, the one who saves lives, the one who retires. */
export const PONCHO_ACTS: readonly PonchoAct[] = [
  { id: 'aprende', title: 'Un cachorro que aprende', firstStop: 'nacimiento' },
  { id: 'confianza', title: 'El guía en quien confían', firstStop: 'expedicion-invernal-1962' },
  { id: 'rescates', title: 'Salvar vidas en el hielo', firstStop: 'rumbo-a-belgrano' },
  { id: 'retiro', title: 'Un retiro merecido', firstStop: 'adios-a-la-antartida' },
];

/** The act that opens at this milestone (with its number, from 1), or `undefined` if no act opens there. */
export function ponchoActOpeningAt(milestoneId: string): { act: PonchoAct; number: number } | undefined {
  const index = PONCHO_ACTS.findIndex((a) => a.firstStop === milestoneId);
  return index < 0 ? undefined : { act: PONCHO_ACTS[index]!, number: index + 1 };
}

/**
 * The route log: one-sentence facts shown while the team travels between stops. `leg` is the leg of the route
 * (see PONCHO_MILESTONES) and `at` the fraction of that leg, from 0 to 1. In order of the trip. The ship legs
 * have none but the first: the book says little about the dogs aboard.
 */
export const PONCHO_LOG: readonly { leg: number; at: number; fact: VoyageFact }[] = [
  { leg: 0, at: 0.1, fact: book(12, 'Un equipo se armaba con cinco yuntas y un líder: once perros.') },
  { leg: 0, at: 0.3, fact: book(12, 'Cada perro tiraba entre 30 y 45 kilos de carga.') },
  { leg: 0, at: 0.5, fact: book(12, 'En terreno bastante llano, un equipo hacía de 40 a 50 kilómetros en más de seis horas sin descanso.') },
  { leg: 0, at: 0.75, fact: book(12, 'En las travesías, algunos patrulleros cantaban a todo pulmón, y a los perros les gustaba muchísimo.') },
  { leg: 1, at: 0.5, fact: book(14, 'La mayoría de los perros que viajaron con Poncho había trabajado bien en la expedición invernal de 1962.') },
  { leg: 2, at: 0.12, fact: book(12, 'Antes de salir cada día, los hombres observaban a los perros veteranos: su conducta podía anunciar una tormenta.') },
  { leg: 2, at: 0.3, fact: book(10, 'Tras una noche de tormenta, los perros esperaban acurrucados bajo uno o dos metros de nieve.') },
  { leg: 2, at: 0.5, fact: book(25, 'Con carne fresca de foca, el pelaje de los perros quedaba brillante y untuoso, y la nieve no se les pegaba.') },
  { leg: 2, at: 0.78, fact: book(10, 'Los trineos de perros tenían una autonomía de 20 días, no más.') },
  { leg: 4, at: 0.3, fact: book(10, 'Cada perro comía por día medio kilo de pemmican, una mezcla con carne en polvo, grasa y avena.') },
  { leg: 4, at: 0.65, fact: book(12, 'Un trineo de patrulla rara vez superaba los 40 kilómetros por hora.') },
];
