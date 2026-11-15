# Base Marambio: contenido y fuentes verificadas

Contenido de la primera entrega de la expedición «Base Marambio» (issue #74): un diorama para recorrer con seis puntos de interés, sin capítulos guiados. El texto que muestra la app está en [`packages/core/src/content/marambio.ts`](../../packages/core/src/content/marambio.ts); este documento guarda, para cada oración, la cita que la sostiene. El diseño del diorama está en [`base-marambio-diseno.md`](base-marambio-diseno.md).

- **Pregunta guía:** «¿Cómo funciona una base donde aterrizan aviones sobre una meseta congelada?»
- **Fecha de consulta:** 14 de noviembre de 2026, para todas las fuentes. Las que ya citaba «Desde Ushuaia» (códigos `[O…]` de [`desde-ushuaia-fuentes.md`](desde-ushuaia-fuentes.md)) se volvieron a abrir ese día; en el código salen de `VOYAGE_SOURCES`, sin copiar la URL.
- **Cómo se verificó:** un agente de IA (Claude Code) abrió cada página y buscó la frase. La herramienta de lectura devuelve citas de hasta unos 125 caracteres, así que las citas de abajo son fragmentos textuales, no oraciones enteras. Una oración sin cita encontrada no se publicó y está en «Pendientes».
- **Revisión humana:** pendiente. Quien revise el PR abre las fuentes y confirma que dicen lo que afirma cada ficha (regla del eje 2 en `AGENTS.md`).

## Tabla de fuentes

| Referencia | Organismo | URL | Fecha de consulta | Licencia | Estado |
|---|---|---|---|---|---|
| Base Marambio (`dna-base`) | Cancillería Argentina · Dirección Nacional del Antártico | https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/marambio | 14 de noviembre de 2026 | - | Verificada por el agente; falta revisión humana |
| Bases antárticas permanentes (`armada-bases`, `[O2]`) | Armada Argentina | https://www.argentina.gob.ar/armada/antartida/bases-permanentes | 14 de noviembre de 2026 | - | Verificada por el agente; falta revisión humana |
| «El rompehielos ARA Almirante Irízar completó las operaciones en la Base Antártica Conjunta [Marambio]», 30-12-2025 (`armada-irizar`, `[O24]`) | Armada Argentina | https://www.argentina.gob.ar/noticias/el-rompehielos-ara-almirante-irizar-completo-las-operaciones-en-la-base-antartica-conjunta | 14 de noviembre de 2026 | - | Verificada por el agente; falta revisión humana |
| «51° Aniversario de la Base Marambio: más de medio siglo de soberanía en el Continente Antártico», 31-10-2020 (`faa-aniversario`, `[O45]`) | Fuerza Aérea Argentina | https://www.argentina.gob.ar/noticias/51deg-aniversario-de-la-base-marambio-mas-de-medio-siglo-de-soberania-en-el-continente | 14 de noviembre de 2026 | - | Verificada por el agente; falta revisión humana |
| Línea histórica 1957-1990 (`dna-historia`, `[O12]`) | Cancillería · Dirección Nacional del Antártico | https://cancilleria.gob.ar/es/iniciativas/dna/historia-y-patrimonio/linea-historica/1957-1990 | 14 de noviembre de 2026 | - | Verificada por el agente; falta revisión humana |
| «45 años del primer aterrizaje de un Hércules C-130 en Marambio» (`cancilleria-c130`, `[O13]`) | Cancillería (Embajada en Uruguay) | https://eurug.cancilleria.gob.ar/es/content/45-a%C3%B1os-del-primer-aterrizaje-de-un-h%C3%A9rcules-c-130-en-marambio | 14 de noviembre de 2026 | - | Verificada por el agente; falta revisión humana |
| Logística y medios de transporte (`dna-logistica`, `[O10]`) | Cancillería · Dirección Nacional del Antártico | https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/logistica-y-medios-de-transporte | 14 de noviembre de 2026 | - | Verificada por el agente; falta revisión humana |
| Escuadrón I C-130 Hércules, 2023 (`faa-escuadron`, `[O14]`) | Fuerza Aérea Argentina | https://www.argentina.gob.ar/noticias/escuadron-i-c-130-hercules-un-pilar-fundamental-para-la-aviacion-militar-argentina | 14 de noviembre de 2026 | - | Verificada por el agente; falta revisión humana |
| OpenStreetMap: pista, plataforma, hangar y edificios de la Base Marambio (`osm`) | colaboradores de OpenStreetMap | https://www.openstreetmap.org/#map=16/-64.2400/-56.6300 | 14 de noviembre de 2026 | ODbL 1.0 (© colaboradores de OpenStreetMap) | Verificada por el agente (API 0.6, changeset 134877913). Es un mapa colaborativo: se usa para plantas, nombres y colores, las fichas lo dicen y ninguna ficha que se apoye solo en él lleva la etiqueta «Dato real». Detalle en `base-marambio-diseno.md`. |

## Oraciones, fuentes y citas

Tipos: **Dato real** (con una fuente oficial) y **Reconstrucción** (lo que el diorama ilustra; no es un dato). Lo que se apoya solo en OpenStreetMap, un mapa colaborativo, va como Reconstrucción.

### La meseta (`plateau`)

| Oración | Fuente | Cita |
|---|---|---|
| La base está sobre una meseta de la Isla Marambio, en el Mar de Weddell, a unos 200 m sobre el nivel del mar. | `[O24]`, `[O2]` | `[O24]`: "emplazada sobre una meseta a unos 200 metros sobre el nivel del mar en la isla Seymour" · `[O2]`: "Ubicada en la Isla Marambio (ex Seymur) sobre el Mar de Weddell," |
| Se fundó el 29 de octubre de 1969. Es la única base argentina con pista de aterrizaje para aviones de carga y pasajeros. | `[O2]` | "Fundada el 29 de octubre de 1969." / "Es la única base argentina con pista de aterrizaje para aviones de transporte de carga y pasajeros." |
| Es la principal puerta de entrada de la logística argentina en la Antártida. Desde acá sale el mayor número de campamentos científicos en la campaña de verano. | `dna-base` | "es la principal puerta de entrada de la logística argentina en la Antártida" / "y desde ella se despliega el mayor número de campamentos científicos durante la Campaña Antártica de Verano." |

### La pista (`runway`)

| Oración | Fuente | Cita |
|---|---|---|
| Fue «la primera pista de aterrizaje de tierra, precisamente permafrost, en el Continente Antártico». | `[O12]` | "la primera pista de aterrizaje de tierra, precisamente permafrost, en el Continente Antártico" |
| Los aviones aterrizan sobre una mezcla congelada de tierra, hielo y piedra. | `[O14]` | "la aeronave aterriza en la pista conformada por una mezcla congelada de tierra, hielo y piedra" |
| El 30 de agosto de 1969 un grupo de la Fuerza Aérea Argentina, la Patrulla Soberanía, acampó en la meseta y empezó la pista. | `dna-base` | "El 30 de agosto de 1969, un grupo de trabajo de la Fuerza Aérea Argentina denominado" / "“Patrulla Soberanía” instaló un campamento sobre la meseta y comenzó la construcción de la pista." |
| La abrieron 21 hombres con barretas, picos y palas. | `[O45]` | "un grupo de 21 hombres aislados en la más completa soledad y armado de barretas, picos y palas" |
| A las pocas semanas de trabajo ya aterrizó un avión en una pista de 300 m. A fines de octubre de 1969 llegó a 800 m. | `dna-base` | "Luego de algunas semanas de trabajo un avión DHC-2 Beaver aterrizaba en la pista de 300 metros de largo." / "Para fines de octubre de ese año se alcanzaron los 800 metros". La fuente no dice que ese Beaver fuera el primer avión en aterrizar, y la ficha tampoco (ver «Pendientes»). |
| En 2020 la Fuerza Aérea le daba 1.200 m de largo por 35 m de ancho. | `[O45]` | "La pista construida por la “Patrulla Soberanía” tiene una longitud de 1200 metros de largo por 35 metros de ancho," (epígrafe de una foto, nota del 31-10-2020). La fuente lo dice en presente, así que la ficha le pone la fecha de la nota: no es la medida de la pista como se abrió en 1969 ni un largo actual verificado (ver «Pendientes»). |

### Hércules C-130 (`hercules`)

| Oración | Fuente | Cita |
|---|---|---|
| El primer Hércules C-130 aterrizó con ruedas en Marambio el 11 de abril de 1970. Era el TC-61 y había despegado de Río Gallegos. | `[O13]`, `dna-base` | `[O13]`: "Fue el sábado 11 de ese mes, cuando el avión Lockheed Hércules C-130H matrícula TC-61 aterrizó con sus ruedas" / "El vuelo inaugural despegó a las 10 hs. de la Base Aérea Militar Río Gallegos, provincia de Santa Cruz" · `dna-base`: "El 11 de abril de 1970 se logró un nuevo hito cuando el primer C-130 Hércules aterrizó con ruedas en la nueva base." |
| Los Hércules cruzan desde Río Gallegos o Ushuaia. | `[O10]` | "Los Hércules C-130 son fundamentales para el cruce entre el territorio argentino sudamericano" / "(Río Gallegos o Ushuaia) y la Antártida (Base Marambio y, en forma complementaria, Base chilena Frei)." |
| Desde Río Gallegos el vuelo dura tres horas y media. | `[O14]` | "con un vuelo de tres horas y media desde Río Gallegos." |
| Con la pista, el avión se sumó a la logística antártica: traslado de pasajeros, víveres, equipos y maquinaria, y evacuaciones sanitarias en una emergencia. | `[O45]` | "permitiendo incorporar el medio aéreo a la cadena logística de las Campañas Antárticas:" / "traslado de pasajeros, víveres, equipos, maquinaria y elementos esenciales" / "capaz de efectuar evacuaciones sanitarias en casos de emergencia y participar en tareas de búsqueda y rescate." El sujeto del párrafo es «Este hecho» (la pista para aviones con ruedas), no el Hércules; por eso la ficha habla del avión en general. |
| Los Hércules C-130 son el único medio aéreo que mantiene el puente aéreo, durante todo el año. | `[O45]` | "Los pilotos y tripulaciones del Sistema de Armas C-130 Hercules cumplen durante todo el año una función vital," / "al ser éste el único medio aéreo empleado para el mantenimiento del puente aéreo entre los dos continentes." (epígrafe de una foto). La nota es de 2020. |
| El avión del diorama es una ilustración: su pintura se tomó de fotos de referencia y está estacionado en la plataforma para que se vea junto a la base. | Reconstrucción | Sin fuente de texto. Fotos en `base-marambio-diseno.md`. |

### El hangar (`hangar`)

| Oración | Fuente | Cita |
|---|---|---|
| OpenStreetMap, un mapa colaborativo, ubica un hangar junto a la plataforma donde estacionan los aviones. De ahí lo toma esta reconstrucción. | Reconstrucción (`osm`): se apoya solo en un mapa colaborativo, así que no lleva la etiqueta «Dato real» | way 155947845: `aeroway=hangar; building=hangar` · way 1162265350: `aeroway=apron`. Los centros de las dos plantas están a unos 59 m (medidas en `marambio-site.ts`). |
| En Marambio hay un avión Twin Otter DHC-6 apostado en forma permanente. En verano también operan desde la base helicópteros Bell 412. | `[O10]` | "un avión Twin Otter DHC 6 apostado en forma permanente en Base Marambio." / "Helicópteros Bell 412, operativos en verano desde Base Marambio." La fuente no dice que el Twin Otter se guarde en el hangar, y la ficha tampoco. |
| La planta del hangar sale de OpenStreetMap. Su techo curvo y su altura son una reconstrucción a partir de fotos de referencia. | Reconstrucción (`osm` para la planta) | OSM no etiqueta la forma del techo ni la altura del hangar. |

### La torre de control (`tower`)

| Oración | Fuente | Cita |
|---|---|---|
| La torre de control es una reconstrucción a partir de una foto. No figura en los datos de OpenStreetMap que usamos: la dibujamos en la punta del edificio que ese mapa llama «Terminal Pasajeros». | Reconstrucción (`osm` para el edificio) | way 203320555: `aeroway=terminal; name=Terminal Pasajeros`. La foto es `File:Base Marambio y el Hercules.jpg` (ver diseño). Que ese edificio sea el de la foto es una lectura nuestra. |
| La torre de comunicaciones sí está en OpenStreetMap, que solo marca dónde se encuentra. Su altura en el diorama es ilustrativa. | Reconstrucción (`osm` para la posición) | nodo 10809166786: `man_made=tower; tower:type=communication`, sin altura. |

### Los edificios (`buildings`)

| Oración | Fuente | Cita |
|---|---|---|
| En la base viven en promedio 70 personas en invierno y 170 en verano. | `[O45]` | "con un promedio de 70 personas en invierno, y 170 personas en verano". Dato reservado para esta expedición (comentario del 13-11-2026 en el issue #74). La nota es de 2020. |
| Desde 1994 funciona en la base el Laboratorio Antártico Multidisciplinario Marambio (LAMBI), que registra el ozono. | `dna-base` | "El Laboratorio Antártico Multidisciplinario Marambio (LAMBI), que forma parte de la base," / "inició sus actividades en 1994" / "en él se obtienen registros de ozono" |
| El Servicio Meteorológico Nacional estudia el tiempo de la zona y hace radiosondeos. | `dna-base` | "En sus instalaciones el Servicio Meteorológico Nacional brinda un completo estudio" / "de las condiciones meteorológicas de la zona como parte de la red mundial de meteorología," / "contribuyendo también a través de radiosondeos meteorológicos y de la capa de ozono, de radiación solar y análisis nuboso de la atmósfera." |
| En esta reconstrucción, los nombres de los edificios salen de OpenStreetMap, un mapa colaborativo: Sanidad, Jefatura, Alojamiento Palermo, Comedor y Sala de Juegos, Usina, Obrador, Abastecimiento, Depósito y Batería JP1. | Reconstrucción (`osm`): se apoya solo en un mapa colaborativo, así que no lleva la etiqueta «Dato real» | Etiqueta `name` de los ways 313639733, 313639732, 313639730, 313639731, 203320535, 203320543, 203320532, 203320540 y 203320552. |
| El diorama muestra una selección de edificios. El color naranja es el que les da OpenStreetMap; las alturas y los techos son ilustrativos, tomados de fotos de referencia. | Reconstrucción (`osm` para el color) | `building:colour=#FF4500` en todos los edificios leídos. `roof:shape=gabled` solo en Abastecimiento y Depósito. |

### Etiqueta de la escena (`scene`)

| Oración | Fuente | Cita |
|---|---|---|
| El diorama de la base es una reconstrucción ilustrada, no un modelo a escala. Las plantas, los nombres y los colores de los edificios salen de OpenStreetMap, un mapa colaborativo; los lugares donde están se acercaron, en el mismo orden, para que la base entre en una sola vista. | Reconstrucción (`osm`) | Ver `base-marambio-diseno.md`. |
| La pista tiene unos 1,2 km de largo en OpenStreetMap y acá se dibuja solo un tramo; el borde de la meseta está dibujado más cerca y más bajo. La torre de control, las alturas, los techos y la pintura del avión son ilustrativos: se tomaron de fotos de referencia. | Reconstrucción (`osm`) | way 155947844: `aeroway=runway; ref=05/23; surface=gravel; length=1260`. El trazo del way mide 1.218 m. Por eso la ficha dice «unos 1,2 km» y lo atribuye al mapa. |

## Pendientes

No se publica nada de esto hasta tener fuente.

- **Largo, ancho y tipo actual de la pista:** [Fuente a definir]. `[O45]` da 1.200 × 35 m en presente, en una nota de 2020; la ficha lo publica con esa fecha. Eso difiere de OpenStreetMap, que etiqueta `length=1260` y cuyo trazo mide 1.218 m. Una entrevista de DEF Online (06-01-2024, fuente secundaria) y la ficha de SkyVector dan 1.208 × 40 m; no se abrieron en esta verificación y no se usan en las fichas. El ancho de 40 m de la pista dibujada sale de esa ficha, no está en OpenStreetMap y es solo una medida del modelo (en `marambio-site.ts` la pista figura como `estimado`).
- **Detalles de la pista en el modelo:** [Fuente a definir]. La pista se dibuja sin línea central pintada, con pallets naranjas en las cabeceras y balizas de borde movibles. Esos detalles siguen la entrevista de DEF Online del 06-01-2024, que no se abrió en esta verificación: son ilustrativos y ninguna ficha los afirma.
- **Designación de la pista y segunda pista:** [Fuente a definir]. OpenStreetMap dice `ref=05/23`; `[O45]` dice "con orientación 06/24, debido al predominio de los vientos del sudeste."; una nota de Aviacionline de 2015 (no abierta en esta verificación) habla de 06/24 y de una pista nueva de 1.600 m. Se dibuja una sola pista y no se nombra su designación.
- **Qué avión aterrizó primero en Marambio:** [Fuente a definir]. Las fuentes oficiales no coinciden (ver `desde-ushuaia.md`). `dna-base` cuenta que un DHC-2 Beaver aterrizó en la pista de 300 m, sin decir que fuera el primero; la ficha de la pista dice «un avión» y no lo nombra. Solo se afirma el primer C-130, del 11 de abril de 1970.
- **Cantidad de edificios y superficie cubierta:** [Fuente a definir]. Las cifras que circulan (27 edificios y más de 20.000 m²; 5.208 m²) se contradicen y sus fuentes primarias no se pudieron abrir. No se publica ningún número.
- **Altura de la torre de control, del hangar y de los edificios:** [Fuente a definir]. Son estimadas a partir de fotos.
- **Capacidad y material del hangar:** [Fuente a definir]. La frase «permite alojar dos helicópteros Chinook o dos Twin Otter» (Revista Defensa, 1986) solo se vio en un resultado de búsqueda, y «la mayor estructura de plástico» no tiene fuente.
- **Qué guarda el hangar hoy:** [Fuente a definir]. `[O10]` dice que el Twin Otter está apostado en la base, no dónde.
- **Dónde están el LAMBI y la estación meteorológica dentro de la base:** [Fuente a definir]. El diorama no los señala.
- **Función de cada edificio:** solo se conoce el nombre que le da OpenStreetMap. [Fuente a definir] para una fuente oficial.
- **Pintura actual de los C-130 de la Fuerza Aérea:** [Fuente a definir]. No hay fuente de texto; el camuflado del modelo sale de fotos.
- **Que la base no tenga puerto ni muelle:** [Fuente a definir]. `[O24]` no lo dice.
- **Altura exacta de la meseta:** `[O24]` dice «unos 200 metros» y `[O45]`, 198 m. Se publica «unos 200 m».
- **Catálogo de estaciones de COMNAP para Marambio:** no se pudo leer (el PDF supera el límite de la herramienta).
