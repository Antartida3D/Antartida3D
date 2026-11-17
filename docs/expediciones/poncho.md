# Expedición #9 — Poncho, el perro polar argentino

Contenido del recorrido de **«Poncho»** (issues #9, #27 y #145). Cuenta la vida de un perro de trineo del Ejército Argentino en la Antártida, entre 1961 y 1978, como un viaje sobre el mapa (el mismo motor que «Desde Ushuaia»). El texto vive en `packages/core/src/content/poncho.ts`; las posiciones, en `poncho-route.ts`.

- **Fuentes:** cada dato lleva su código (`P1` es el libro) y, si es del libro, la página del PDF donde está (`pages`): la cita abre esa página. Catálogo en [poncho-fuentes.md](./poncho-fuentes.md).
- **Fiel en hechos, libre en forma:** los mismos hechos y el mismo orden que el libro; la forma (ritmo, ganchos, composición) es de este proyecto. **No hay diálogos ni pensamientos de Poncho inventados** y no se afirma nada que el libro no diga. El narrador va cerca del perro, en tercera persona, con frases cortas.
- **Sin preguntas ni notas «así funciona»:** el recorrido no tiene cuestionario ni puntaje.
- **Un solo aviso de ilustración:** «El recorrido y los modelos son una ilustración, no una ruta real.» Se muestra una vez, en el panel de inicio y en la página de fuentes; no se repite en cada ficha.
- **Personas:** el libro omite los nombres a propósito. Acá se usan roles («el instructor», «el oficial», «el suboficial», «una familia de Ushuaia»). Los nombres de perros (Poncho, Coca, Flecha, Pato, Bucky) sí se usan. Una prueba (`packages/core/test/poncho-content.test.ts`) vigila los apellidos.
- **Revisión:** redactado con asistencia de IA a partir del PDF del libro. **Quien revise el PR debe abrir las fuentes** y confirmar que dicen lo que se afirma.
- **Licencia:** pendiente. Ver «Licencias y créditos» en [poncho-fuentes.md](./poncho-fuentes.md).

## Cómo está contado

El recorrido tiene **10 paradas** en **cuatro actos**. Cada parada es una ficha con:

1. **Rótulo de acto** (solo en la primera parada de cada acto), arriba del título.
2. **`essential`:** una mini-escena de dos o tres frases cortas, con algo que se ve y se hace (los abrigos naranjas, la cincha atada a la cintura, los hombres que sondean con bastones y piquetas, la brújula que se hunde en la nieve). Empieza con un eco del gancho de la parada anterior.
3. **`hook`:** una frase de cierre, en cursiva, que abre la curiosidad por lo que viene. **No afirma hechos nuevos** y no lleva fuente: solo anticipa lo que la parada siguiente ya cuenta con la suya. No tiene cifras, años ni nombres propios (salvo «Poncho»), y no hace preguntas. Una prueba lo vigila.
4. **«Saber más» (`more`):** los datos, cada uno con su fuente y su página.

Entre paradas, mientras el equipo viaja, aparece el **diario de ruta**: una línea de una frase con un dato del libro y su página.

### Actos

| Acto | Título | Primera parada | Paradas |
| :--- | :--- | :--- | :--- |
| 1 | Un cachorro que aprende | `nacimiento` | `nacimiento` |
| 2 | El guía en quien confían | `expedicion-invernal-1962` | `expedicion-invernal-1962`, `poncho-perro-guia` |
| 3 | Salvar vidas en el hielo | `rumbo-a-belgrano` | `rumbo-a-belgrano`, `rescate-ae-205`, `patrulla-paralelo-82`, `paracaidas`, `brujula-perdida` |
| 4 | Un retiro merecido | `adios-a-la-antartida` | `adios-a-la-antartida`, `ushuaia` |

## Paradas (en orden de recorrido)

La página es la del PDF del libro `[P1]` donde está el hecho principal de la ficha (`essential`).

### 1. `nacimiento` — Nace Poncho (1961, tramo 0, trineo)

- **Escena** (p. 5): los hombres de gruesos abrigos naranjas van y vienen por la Base Esperanza; nace Poncho el 10 de abril de 1961, el cachorro más juguetón de la camada; los hombres instruyen a los perros con arneses, trineos y voces de mando.
- **Gancho:** «Faltaba poco para su primera gran travesía.»
- **Saber más:** su aspecto (p. 5); sus padres, Coca y Flecha (p. 4); la raza (p. 6, p. 7 y `P2`); a los seis meses ocupó un lugar entre las yuntas (p. 8); la cincha atada a la cintura del instructor, «Auk» y «Quierr» y el slalom entre postes durante una semana (p. 9); Esperanza (`O2`).

### 2. `expedicion-invernal-1962` — El olfato de Poncho (1962, tramo 0)

- **Escena** (p. 12): la expedición invernal en marcha; Poncho olfatea la nieve, se detiene, mira al conductor, camina en zigzag y los hombres hunden bastones y piquetas hasta dar con una grieta.
- **Diorama** (una etapa por frase): 0 llega la columna (un trineo con cuatro perros, un conductor y un hombre al lado); 1 Poncho avanza olfateando muy despacio, con la cabeza que baja a la nieve y sube; 2 se detiene y mira al conductor, camina en zigzag y los hombres sondean hasta la grieta ancha. La cantidad de perros y de hombres es una ilustración: el libro no da números (fuente a definir).
- **Gancho:** «La expedición todavía le tenía reservado un puesto nuevo.»
- **Saber más:** salida el 14 de junio, nunataks Foca, distancia, el peligro de las grietas y que ciertos perros las detectaban con el olfato (p. 6, 9, 12).

### 3. `poncho-perro-guia` — Poncho va al frente (1962, tramo 0)

- **Escena** (p. 12): en el regreso desde la Base San Martín, el instructor le da el puesto Número 1 del tiro; tiene un año y medio; cuando el trineo se detiene se echa y mira al conductor.
- **Diorama** (una etapa por frase), delante de la Base San Martín vacía, entre el glaciar y el mar: 0 junto a la base, el tiro espera en fila con los arneses puestos y el instructor lleva a Poncho al frente, al puesto de Número 1; 1 el tiro completo, cinco yuntas y el líder (once perros, p. 12), sale siguiendo la huella del otro trineo, que va adelante por las mismas curvas (la fila sigue la huella como una onda); 2 el trineo se detiene, Poncho camina unos pasos, se da vuelta hacia el conductor y se echa despacio, y a la orden se levanta y sale rápido hacia adelante. Para que entren el otro trineo y el tiro completo, la escena muestra hasta 18 elementos a la vez. La base, en el estilo de la Base Esperanza del hito 1, sigue fotos de hoy: tres casas medianas separadas que miran al mar (la de la izquierda con los cajones naranjas y su escalera, la del medio con la bandera y el emblema, la de la derecha con la planta baja amarilla y el portón doble), mástiles, escaleras de madera y rocas con nieve. Es una ilustración (sección 4.6 de `poncho-fuentes.md`).
- **Gancho:** «Más adelante lo esperaba un viaje hacia el sur.»
- **Saber más:** llegada a San Martín el 25 de agosto y los 1.842 metros (p. 10); estado de la base (`O2`); diez días de instrucción (p. 12); perro-guía el resto de su vida (p. 12).

### 4. `rumbo-a-belgrano` — En rompehielos hacia Belgrano (1964, tramo 1, barco)

- **Escena** (p. 14): diciembre de 1964, viaje a la Base General Belgrano con ayuda de un rompehielos y otros perros, como preparativo de la marcha al Polo.
- **Escena en el diorama** (#219): un rompehielos entero a flote junto al borde del hielo, pintado como un buque polar (casco azul oscuro con franja roja en la línea de flotación, superestructura blanca con ventanas, botes salvavidas naranjas), con una pasarela de tablones desde el hielo hasta la cubierta de proa. Primero se lo ve completo con Poncho y un hombre en el hielo; después un hombre lleva una fila de perros, Poncho primero, que sube por la pasarela, cruza la cubierta y entra por una puerta de la superestructura: cada uno desaparece al entrar (con movimiento reducido la fila queda quieta a mitad de camino); al final, en el hielo, los trineos y la carga de la marcha al Polo. Es una ilustración: la silueta sigue el modelo del rompehielos del viaje (`irizarModel.ts`), más grande y más alto para que las cubiertas tengan altura de persona, y **no es el barco de 1964**; el libro (p. 14) solo dice «un rompehielos» y el barco no lleva nombre. Las medidas, la pasarela y la puerta están en `packages/core/src/poncho-ship.ts`; el modelo, en `packages/react-ui/src/voyage/ponchoShip.ts`.
- **Gancho:** «Allá, en el hielo, pronto haría falta un perro como él.»
- **Saber más:** perros elegidos por su servicio en 1962, la barrera Filchner y el nombre «Operación 90» (p. 14).

### 5. `rescate-ae-205` — Al rescate de un avión (1965, tramo 2, trineo)

- **Escena** (p. 18): un avión ha caído en el hielo y el mal tiempo impide buscarlo por aire; sale una patrulla de dos hombres y siete perros con Poncho al frente; al cuarto día, apenas olfatea el avión, acelera el paso.
- **Diorama** (una etapa por frase): 0 el avión destrozado sobre el hielo, más grande que las personas (como un Cessna 185) y color crema para que se distinga de la nieve (la nariz clavada, la cola partida, un ala desprendida, un esquí y chapas sueltas), con los cuatro tripulantes esperando al lado, en plena ventisca; 1 llega la patrulla de dos hombres y siete perros por un rastro en S, con Poncho al frente olfateando: los perros y el trineo pisan su mismo rastro y siguen sus curvas, como una onda, y Poncho encuentra el avión; 2 el tiempo mejora (el libro: «al cuarto día, el clima había mejorado», p. 18) y los hombres de la patrulla dejan el trineo y van hacia los tripulantes. Cuatro tripulantes, dos hombres y siete perros son las cifras del libro (p. 17 y 18); la forma de los daños, los colores, las posturas, la escala y la ventisca son una ilustración.
- **Foto:** no lleva. No hay una foto del AE-205 caído con fuente y licencia verificables (ver [poncho-fuentes.md](./poncho-fuentes.md), 4.5).
- **Gancho:** «Pero la gran marcha seguía su camino.»
- **Saber más:** el avión Cessna 185B «AE-205» y el «blanqueo» (p. 17); tres jornadas entre grietas y ventiscas, los víveres que se tragó una grieta y el regreso de 1968 (p. 18).

### 6. `patrulla-paralelo-82` — La patrulla «Paralelo 82» (1965, tramo 2)

- **Escena** (p. 15): Poncho guía la patrulla de trineos de perros que va por delante de los tractores para detectar peligros; cuando los tractores se separan, conduce al grupo por portezuelos y valles helados de las montañas Santa Fe.
- **Gancho:** «Y todavía le esperaba una aventura por el aire.»
- **Saber más:** salida del 26 de octubre (`O12`), separación del 18 de noviembre y los 83° de latitud sur (p. 15), el barranco frente al pico Santa Fe (p. 16), la posición del pico (`P3`), y que Poncho no llegó al Polo: lo alcanzaron los tractores el 10 de diciembre, tras 66 días (p. 17, `O12`).

### 7. `paracaidas` — Poncho paracaidista (1966, tramo 2)

- **Escena** (p. 19), ilustración del relato, no un registro: el helicóptero entra volando, grande y alto, con dos oficiales esperando abajo; los tres perros bajan con paracaídas, chicos bajo el helicóptero y moviendo las patas como si nadaran; aterrizan en el hielo y Poncho sale al frente del trineo, con un hombre detrás, hasta llegar a los oficiales. La cantidad de personas y los tamaños son una ilustración (el libro no los da).
- **Gancho:** «Pero otra tormenta ya lo esperaba.»
- **Saber más:** Pato y Bucky, el arnés, el afecto del suboficial a cargo, el trineo desarmable y los oficiales que saltaron antes, el helicóptero S-55 y los 30 km al sur de Belgrano (p. 18 y 19).

### 8. `brujula-perdida` — La brújula perdida (1967, tramo 4, trineo)

- **Escena** (p. 20): una ventisca sorprende a la patrulla a unos doce kilómetros de Esperanza; el trineo vuelca, la brújula se hunde en la nieve; los hombres solo pueden seguir a Poncho y, tras dos horas a ciegas, ven las luces de la base.
- **Gancho:** «Esa noche su legajo sumó una proeza más.»
- **Saber más:** la bahía Duse sobre mar congelado (p. 19), la «Cuesta de los Afligidos», las tres cañas con banderolas y la brújula recuperada tres días después (p. 20).

### 9. `adios-a-la-antartida` — Poncho deja la Antártida (1973, tramo 5, barco)

- **Escena** (p. 21): en su legajo aparece cada vez más «No trabajó»; ya no corre a la par de los jóvenes; llega el rompehielos y lo llevan a bordo rumbo a Ushuaia, una excepción por su prestigio.
- **Gancho:** «Lejos de la nieve lo esperaba un mundo nuevo.»
- **Saber más:** el traslado de 1973 con una familia de Ushuaia y su hotel (p. 5); legajo y excepción (p. 21).

### 10. `ushuaia` — Un final tranquilo en Ushuaia (1978, tramo 5)

- **Escena** (p. 22): en ese mundo nuevo, Poncho vive plácidamente en el hotel de un viejo compañero de patrulla; llega a casi 18 años; una mañana de primavera de 1978, en el jardín, ya no despierta.
- **Gancho:** «Así termina el camino de Poncho.»
- **Saber más:** el mundo nuevo (niños, árboles, caballos, calor) y el trineo improvisado (p. 21); el accidente de 1976 (p. 22); los desfiles de 1977 y 1978 (p. 5); la taxidermia que no prosperó (p. 22).

## Diario de ruta

Once líneas, todas del libro `[P1]` con su página, repartidas por los tramos de trineo (la función `logLineAt` de `packages/core/src/poncho-log.ts` elige la que corresponde al avance). En el tramo de barco hacia Belgrano hay una; en los otros dos tramos de barco ninguna, porque el libro dice poco de los perros a bordo.

| Tramo | Línea | Página |
| :--- | :--- | :--- |
| 0 | Un equipo se armaba con cinco yuntas y un líder: once perros. | 12 |
| 0 | Cada perro tiraba entre 30 y 45 kilos de carga. | 12 |
| 0 | En terreno bastante llano, un equipo hacía de 40 a 50 kilómetros en más de seis horas sin descanso. | 12 |
| 0 | En las travesías, algunos patrulleros cantaban a todo pulmón, y a los perros les gustaba muchísimo. | 12 |
| 1 | La mayoría de los perros que viajaron con Poncho había trabajado bien en la expedición invernal de 1962. | 14 |
| 2 | Antes de salir cada día, los hombres observaban a los perros veteranos: su conducta podía anunciar una tormenta. | 12 |
| 2 | Tras una noche de tormenta, los perros esperaban acurrucados bajo uno o dos metros de nieve. | 10 |
| 2 | Con carne fresca de foca, el pelaje de los perros quedaba brillante y untuoso, y la nieve no se les pegaba. | 25 (pie de foto) |
| 2 | Los trineos de perros tenían una autonomía de 20 días, no más. | 10 |
| 4 | Cada perro comía por día medio kilo de pemmican, una mezcla con carne en polvo, grasa y avena. | 10 |
| 4 | Un trineo de patrulla rara vez superaba los 40 kilómetros por hora. | 12 |

## Qué no se publica

- Los nombres de personas (el libro los omite a propósito).
- «Círculo Polar Antártico a 60° S» (error del libro) y el accidente de 1956 en la bahía «Dusse» (`P2`, sin verificar).
- Las comparaciones con perros paracaidistas de otras épocas y los demás datos de relleno del libro.
- Diálogos y pensamientos de Poncho, aunque el libro los cuente como relato.
- Frases de superlativo («el mejor», «el primero») salvo como cita atribuida al libro.
- Un dato sin fuente: si falta el origen, queda `[Fuente a definir]`.
