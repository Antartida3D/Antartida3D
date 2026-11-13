/**
 * Content of the expedition of Poncho (issue #9): the life of the Argentine polar sled dog told as a short
 * story over the Antarctic map, with the same shape as the trip «Desde Ushuaia» (content/ushuaia.ts): the dog
 * team is one more transport (`kind: 'dogs'`) whose trip has legs (sled on the ice, ship on the sea) and whose
 * stops are milestones.
 *
 * Each card tells a moment in two or three short sentences, close to the dog (`essential`); the data behind it,
 * each with its source, are in «Saber más» (`more`). The book (source P1, a secondary source) is cited with the page
 * of its PDF where the fact is (`pages`): its citation links to that page.
 * Source codes point to VOYAGE_SOURCES.
 */
import type { ExpeditionStop, Milestone, Transport, VoyageFact, VoyageSourceCode } from './ushuaia.ts';
import { BELGRANO_AREA, BELGRANO_RETURN, DUSE_BAY, ESPERANZA, FOCA_NUNATAKS, SAN_MARTIN, SANTA_FE_PEAK, USHUAIA } from './poncho-route.ts';

/** The only warning of the trip: shown once, on the first card and on the sources page. */
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
  // TODO(#79): the icebreaker with dogs on board, a model of its own; until then the leg by sea draws a generic ship.
  models: { ship: 'irizar' },
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
    essential: book(5, 'Poncho nace el 10 de abril de 1961 en la Base Esperanza, en la Antártida. Es el cachorro más juguetón de la camada y quiere ir siempre adelante. Los hombres de la base lo cuidan desde el primer día.'),
    more: [
      book(5, 'Tenía el pelaje blanco cremoso con manchas grises y una «máscara» inconfundible en la cara.'),
      book(4, 'Sus padres se llamaban Coca y Flecha.'),
      book(6, 'Era un perro polar argentino: una raza que el Ejército creó cruzando perros Malamute de Alaska, Groenlandeses y Husky.'),
      book(7, 'La raza empezó a formarse hacia 1951, cuando unos treinta suboficiales veterinarios del Ejército eligieron y cruzaron perros de forma sistemática.', 'P2'),
      book(8, 'A los seis meses de edad Poncho ocupó un lugar entre las yuntas (las parejas de perros) que tiraban de los trineos.'),
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
    essential: book(12, 'Es pleno invierno de 1962 y Poncho marcha con la expedición hacia el sur. Va con la cabeza baja, olfateando la nieve. De pronto se detiene y mira hacia atrás, hacia el conductor.'),
    more: [
      book(9, 'La Expedición Terrestre Invernal Antártica salió de la Base Esperanza el 14 de junio de 1962, con trineos de perros y tractores. Iba hasta la Base San Martín.'),
      book(9, 'La primera escala fue la Base Matienzo, sobre uno de los nunataks Foca. «Nunatak» viene del inuktitut y significa «pico solitario»: una roca rodeada de hielo.'),
      book(9, 'Las dos bases están a unos 800 km en línea recta: ida y vuelta, el viaje pasó los 2.000 km.'),
      book(6, 'Las grietas ocultas bajo la nieve eran el peligro más traicionero: algunas eran tan anchas y hondas que podían tragarse un trineo entero. Según se dice, ciertos perros las detectaban con el olfato.'),
    ],
  },
  {
    id: 'poncho-perro-guia',
    year: 1962,
    segment: 0,
    title: 'Poncho va al frente',
    anchor: SAN_MARTIN,
    kinds: ['dogs'],
    essential: book(12, 'Poncho tiene un año y medio. En el regreso desde la Base San Martín, su instructor lo pone en el puesto Número 1 del tiro. Desde entonces Poncho es perro-guía.'),
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
    essential: book(14, 'En diciembre de 1964 Poncho es trasladado a la Base General Belgrano, mucho más al sur, junto con otros perros. Estos viajes se hacían con ayuda de un rompehielos. Se prepara la primera marcha argentina por tierra hasta el Polo Sur.'),
    more: [
      book(14, 'Muchos de los perros elegidos habían trabajado bien en la Expedición Invernal de 1962.'),
      book(14, 'La Base Belgrano estaba sobre la barrera de hielos Filchner.'),
      book(14, 'La marcha al Polo se llamó «Operación 90» por los 90 grados de latitud sur, que es donde está el Polo.'),
    ],
  },
  {
    id: 'rescate-ae-205',
    year: 1965,
    segment: 2,
    title: 'Al rescate de un avión',
    anchor: BELGRANO_AREA,
    kinds: ['dogs'],
    essential: book(18, 'Un avión pequeño ha aterrizado de emergencia en el hielo, y el mal tiempo impide buscarlo por aire. Poncho sale al rescate al frente de siete perros y dos hombres. Al cuarto día, apenas huele el avión, acelera el paso.'),
    more: [
      book(17, 'El avión era un Cessna 185B llamado «AE-205». A fines de septiembre de 1965 aterrizó de emergencia por un «blanqueo»: un momento en que todo se pone blanco y el horizonte desaparece. Los cuatro tripulantes sobrevivieron.'),
      book(18, 'La patrulla viajó tres jornadas entre grietas y ventiscas, con temperaturas por debajo de los 30 grados bajo cero.'),
      book(18, 'Los sobrevivientes estaban en una zona llena de grietas: una de ellas se había tragado los víveres que un avión DC-3 les había lanzado el día anterior.'),
      book(18, 'En 1968 Poncho volvió al lugar para ayudar a recuperar las partes del avión.'),
    ],
  },
  {
    id: 'patrulla-paralelo-82',
    year: 1965,
    segment: 2,
    title: 'La patrulla «Paralelo 82»',
    anchor: SANTA_FE_PEAK,
    kinds: ['dogs'],
    essential: book(15, 'Poncho guía a la patrulla «Paralelo 82», de trineos de perros. Va por delante de los tractores que buscan el Polo Sur, para avisar de los peligros. Cuando los tractores siguen sin ellos, la patrulla explora las montañas del pico Santa Fe.'),
    more: [
      real('La expedición al Polo salió de la Base Belgrano el 26 de octubre de 1965.', 'O12'),
      book(15, 'El 18 de noviembre el grupo de tractores se separó de la patrulla de perros. La patrulla hizo tareas de cartografía y geología, y llegó más allá de los 83 grados de latitud sur.'),
      book(16, 'Frente al pico Santa Fe el trineo de Poncho desapareció tras un filo de nieve, al borde de un barranco de unos 200 metros. Poncho esperaba tranquilo, comiendo nieve, hasta que le dieron la orden y tiró hacia arriba.'),
      real('El pico Santa Fe está a unos 82°03′ S y 41°20′ O.', 'P3'),
    ],
  },
  {
    id: 'paracaidas',
    year: 1966,
    segment: 2,
    title: 'Poncho paracaidista',
    anchor: BELGRANO_RETURN,
    kinds: ['dogs'],
    essential: book(18, 'En el verano de 1966 Poncho sube a un helicóptero con otros dos perros, Pato y Bucky. Se siente raro y un poco asustado. Es un ejercicio de rescate: los tres perros van a saltar con paracaídas.'),
    more: [
      book(18, 'Junto con los perros se lanzaron un trineo desarmable, víveres y elementos de supervivencia. Dos oficiales saltaron antes desde otro helicóptero.'),
      book(18, 'El helicóptero era uno de los dos S-55 del rompehielos «General San Martín». Nunca antes se había hecho algo así en la Antártida argentina.'),
    ],
  },
  {
    id: 'brujula-perdida',
    year: 1967,
    segment: 4,
    title: 'La brújula perdida',
    anchor: DUSE_BAY,
    kinds: ['dogs'],
    essential: book(20, 'Una ventisca fuerte azota a la patrulla de Poncho, a unos doce kilómetros de Esperanza. El trineo vuelca y la brújula se hunde en la nieve, y nadie ve nada. Sin brújula, los hombres solo pueden seguir a Poncho.'),
    more: [
      book(19, 'Ocurrió un día de agosto de 1967, cuando la patrulla volvía a Esperanza cruzando la bahía Duse sobre mar congelado.'),
      book(20, 'Los vehículos a motor se frenaron en una cuesta de nieve blanda llamada «Cuesta de los Afligidos». El trineo de Poncho volvió a buscar a los hombres que habían quedado a pie.'),
      book(20, 'El oficial a cargo clavó tres cañas con banderolas donde habían volcado, para volver a buscar la brújula.'),
    ],
  },
  {
    id: 'adios-a-la-antartida',
    year: 1973,
    segment: 5,
    title: 'Poncho deja la Antártida',
    anchor: DRAKE_PASSAGE,
    kinds: ['dogs'],
    essential: book(5, 'En 1973 Poncho deja la Antártida, donde nació. Lo llevan en el rompehielos «San Martín» hasta Ushuaia. Ya es un perro veterano, relevado de las tareas pesadas.'),
    more: [
      book(21, 'En el legajo de Poncho se anotaba cada vez más seguido «No trabajó»: ya no corría a la par de los perros jóvenes y se cansaba en las patrullas largas.'),
      book(21, 'Que dejara la Antártida fue una excepción, en mérito a su prestigio.'),
    ],
  },
  {
    id: 'ushuaia',
    year: 1978,
    segment: 5,
    title: 'Un final tranquilo en Ushuaia',
    anchor: USHUAIA,
    kinds: ['dogs'],
    essential: book(22, 'Poncho vive años tranquilos en Ushuaia, como un perro retirado. Llega a vivir casi 18 años, mucho más que otros perros grandes. Una mañana de primavera de 1978 ya no despierta.'),
    more: [
      book(21, 'En Ushuaia lo recibió un viejo compañero de patrulla, que había dejado el Ejército y tenía un hotel llamado «Antártida». Poncho llevaba a los niños a pasear en un trineo improvisado, por las calles.'),
      book(22, 'En 1976 sufrió un accidente y un veterinario aconsejó sacrificarlo, pero la familia se negó.'),
      book(5, 'En 1977 y 1978 tiró de un trineo con niños fueguinos en desfiles y exhibiciones.'),
      book(22, 'Se intentó conservar su cuerpo, pero la taxidermia no prosperó.'),
    ],
  },
];

/** What the team tells at each milestone, by milestone id: a question for kids and adults, answered in the card. */
export const PONCHO_EXPEDITION: Readonly<Record<string, ExpeditionStop>> = {
  nacimiento: {
    notes: [
      { fact: book(9, 'Con «Auk» el perro gira a la derecha y con «Quierr», a la izquierda. Su instructor lo practicó con Poncho atado a una cincha en su propia cintura, y después hicieron slalom entre postes durante una semana.') },
    ],
    question: {
      prompt: '¿Qué voz de mando le indica a la yunta ir a la derecha?',
      options: ['«Quierr»', '«Auk»', '«Alto»'],
      answer: 1,
    },
  },
  'expedicion-invernal-1962': {
    notes: [
      { fact: book(12, 'Poncho caminaba en zigzag para rodear lo que había descubierto. Los hombres clavaban sus bastones y piquetas en la nieve, y casi siempre encontraban una grieta ancha y honda.') },
    ],
    question: {
      prompt: '¿Qué quería decirles Poncho cuando miró hacia atrás?',
      options: ['Que había una grieta escondida bajo la nieve', 'Que tenía hambre', 'Que venía una tormenta'],
      answer: 0,
    },
  },
  'patrulla-paralelo-82': {
    notes: [
      { fact: book(17, 'Poncho no llegó al Polo Sur. Lo alcanzó el grupo de tractores el 10 de diciembre de 1965, después de 66 días de marcha.', 'O12') },
    ],
    question: {
      prompt: '¿Poncho llegó al Polo Sur?',
      options: ['Sí, fue el primer perro en llegar', 'No: su patrulla exploró por delante de los tractores', 'No: nunca salió de Esperanza'],
      answer: 1,
    },
  },
  paracaidas: {
    notes: [
      { fact: book(19, 'Los perros aterrizaron sobre el hielo, a unos 30 km al sur de la Base Belgrano. En minutos armaron el trineo y salieron con Poncho al frente a rescatar a una patrulla perdida. Volvieron a la base esa misma noche.') },
    ],
    question: {
      prompt: '¿Qué hizo Poncho al llegar al hielo con su paracaídas?',
      options: ['Se echó a dormir', 'Tiró del trineo para rescatar a una patrulla perdida', 'Volvió a la base en helicóptero'],
      answer: 1,
    },
  },
  'brujula-perdida': {
    notes: [
      { fact: book(20, 'Después de dos horas de andar a ciegas, ya de noche, los hombres vieron las luces de la base: Poncho los había llevado hasta Esperanza. Tres días después, cuando pasó el temporal, recuperaron la brújula y los vehículos.') },
    ],
    question: {
      prompt: '¿Qué vio la patrulla después de dos horas de andar a ciegas?',
      options: ['Las luces de la Base Esperanza', 'Un helicóptero', 'La luna'],
      answer: 0,
    },
  },
};
