# Diseño del diorama de la Base Marambio

Diseño de la primera entrega de la expedición «Base Marambio» (issue #74), con el mismo criterio que [`docs/orcadas-emplazamiento.md`](../orcadas-emplazamiento.md): se separa lo que está medido de lo que es ilustrativo, y un elemento sin fuente no se ubica «a ojo» sin decirlo. Las fichas y sus citas están en [`base-marambio.md`](base-marambio.md).

Fecha de consulta de todo lo que sigue: 14 de noviembre de 2026.

## Decisiones del 14 de noviembre de 2026

Las tomó quien lleva el issue:

1. **Alcance:** esta primera entrega es un diorama para recorrer, con unos pocos puntos de interés. No tiene capítulos guiados ni el viaje a Orcadas.
2. **Mapa:** se agrega el punto disponible «Base Marambio», en la Isla Marambio, y el punto «Fósiles» sale del mapa. Esa expedición va a vivir en otro lugar. Sus fuentes verificadas se conservan en [`docs/puntos-proximamente-fuentes.md`](../puntos-proximamente-fuentes.md).
3. **Hércules:** el C-130 de bloques se reemplaza por uno low-poly en todos los lugares donde aparece (el viaje «Desde Ushuaia» y este diorama).

## Lo que está medido: OpenStreetMap

OpenStreetMap tiene dibujadas la pista, la calle de rodaje, la plataforma, el hangar y los edificios de la base, con nombre y color.

- Fuente: https://www.openstreetmap.org/#map=16/-64.2400/-56.6300. Datos leídos el 14 de noviembre de 2026 con la API Overpass sobre el recuadro `-64.252,-56.665,-64.228,-56.600` (sur, oeste, norte, este). Cada elemento de la tabla se volvió a leer ese día con la API 0.6 de OpenStreetMap: todos son del changeset 134877913, del 13 de abril de 2023.
- Licencia: ODbL 1.0. La app atribuye «© colaboradores de OpenStreetMap» en las fuentes de la expedición y en el README.
- OpenStreetMap es un mapa colaborativo, no una fuente oficial. Por eso las fichas que nombran un edificio dicen de dónde sale el nombre.
- Las coordenadas se pasaron a metros en el marco de la pista: «a lo largo» va por el eje de la pista hacia el noreste (rumbo 64,7°, medido sobre el way 155947844) desde su punto medio; «a través» va desde el eje hacia el sudeste, el lado donde está toda la base.

Los números de la tabla están en [`packages/core/src/content/marambio-site.ts`](../../packages/core/src/content/marambio-site.ts).

| OSM | Nombre en OSM | Etiquetas OSM | Planta (m) | Centro (m a lo largo, m a través) | Rumbo del lado largo |
|---|---|---|---|---|---|
| way 155947844 | — (`ref=05/23`) | aeroway=runway, surface=gravel, length=1260, ele=232 | 1.218 de largo (trazo del way) | 0, 0 | 64,7° |
| way 1162265350 | — | aeroway=apron | 62,8 × 38,6 | 102, 319 | 112° |
| way 155947845 | — | aeroway=hangar, building=hangar, building:colour=#FF4500 | 33,9 × 24,9 | 142, 362 | 110° |
| way 203320555 | Terminal Pasajeros | aeroway=terminal, building=transportation, building:colour=#FF4500 | 15,9 × 7,0 | 227, 100 | 60° |
| way 203320552 | Batería JP1 | building=garage, building:colour=#FF4500 | 22,1 × 6,3 | 265, 141 | 49° |
| way 203320532 | Abastecimiento | building=warehouse, building:colour=#FF4500, roof:shape=gabled | 16,9 × 9,2 | 131, 138 | 17° |
| way 203320540 | Depósito | building=warehouse, building:colour=#FF4500, roof:shape=gabled | 16,9 × 9,2 | 119, 151 | 17° |
| nodo 10809166786 | — | man_made=tower, tower:type=communication | solo la posición | 107, 173 | — |
| way 313639733 | Sanidad | building=hospital, amenity=doctors, building:colour=#FF4500 | 34,6 × 18,2 | 246, 376 | 21° |
| way 313639732 | Jefatura | building=office, building:colour=#FF4500 | 34,1 × 12,9 | 258, 404 | 21° |
| way 313639730 | Alojamiento Palermo | building=dormitory, building:colour=#FF4500 | 35,9 × 10,2 | 280, 418 | 21° |
| way 313639731 | Comedor y Sala de Juegos | amenity=community_centre, building:colour=#FF4500 | 35,2 × 17,3 | 317, 453 | 21° |
| way 203320535 | Usina | building=industrial, building:colour=#FF4500 | 29,1 × 11,4 | -12, 379 | 20° |
| way 203320543 | Obrador | building=manufacture, building:colour=#FF4500 | 29,2 × 11,5 | 68, 406 | 20° |

La calle de rodaje de grava que baja de la pista a la plataforma está en OSM como una sola línea (ways 155949672, 1162265303 y 1162265302, `aeroway=taxiway; surface=gravel`). Su ancho no figura.

Notas sobre lo medido:

- **Largo de la pista:** la etiqueta de OSM dice `length=1260` y el trazo del way mide 1.218 m. Ninguno de los dos se publica como «largo actual»; la ficha de la escena dice «unos 1,2 km en OpenStreetMap». La nota de la Fuerza Aérea de 2020 (`[O45]`) da 1.200 × 35 m y la ficha de la pista lo publica con esa fecha.
- **Ancho de la pista:** no está en OSM. Los 40 m con que se dibuja salen de la ficha del aeródromo en SkyVector (SAWB), que no se volvió a abrir en esta verificación: es una medida del modelo, no un dato publicado. Por eso la pista figura como `estimado` en `marambio-site.ts`.
- **Designación de la pista:** OSM dice `ref=05/23` y `[O45]`, «orientación 06/24». El diorama no la nombra (ver «Pendientes» en `base-marambio.md`).
- **Nombres:** la columna «Nombre en OSM» es la etiqueta `name`. La pista, la plataforma, el hangar y la torre de comunicaciones no tienen nombre en OSM, y en `marambio-site.ts` tampoco.
- **Selección:** OSM tiene más construcciones en el recuadro (capilla, museo, otro alojamiento, depósitos de la Dirección Nacional del Antártico, casas del grupo oeste, planta de efluentes, helipuerto, dos lagunas). No se dibujan en esta entrega.
- **Función de cada edificio:** solo se conoce por el nombre de OSM.

## Lo que es ilustrativo

- **Dónde está cada pieza.** La base real se extiende unos 330 por 450 m. En el diorama el suelo vacío entre los edificios se acortó para que todo entre en una vista, a 3,5 m por unidad como el diorama de Orcadas. Se mantiene el orden real: la pista al noroeste; junto a ella la terminal, la Batería JP1 y los depósitos; la calle de rodaje que baja a la plataforma y su hangar; la fila central (Sanidad, Jefatura, Alojamiento Palermo, Comedor y Sala de Juegos) al este; la Usina y el Obrador al sur. Cada edificio conserva su planta y su rumbo respecto de la pista. Las posiciones del escenario están en [`marambio-layout.ts`](../../packages/core/src/content/marambio-layout.ts).
- **El tramo de pista.** Se dibuja solo un tramo de unos 320 m de una pista de alrededor de 1,2 km.
- **El borde y la altura de la meseta.** La meseta real es mucho más grande que el escenario y está a unos 200 m sobre el mar. En el diorama el borde se dibuja cerca de la base y la meseta mide 7 unidades de alto (unos 25 m a la escala de los edificios).
- **Alturas.** Ninguna fuente da la altura de los edificios, del hangar ni de las torres. Se estimaron de las fotos: módulos de un piso sobre pilotes (4,5 m; 5,5 m los más grandes), hangar de 10 m, torre de control de 12 m, torre de comunicaciones de 24 m.
- **Techos.** OSM solo etiqueta el techo a dos aguas de Abastecimiento y Depósito. Los demás techos a dos aguas y el techo curvo del hangar salen de las fotos.
- **Torre de control.** No figura en los datos de OSM leídos. Se dibuja en la punta del edificio «Terminal Pasajeros» según una foto de 2014. Que el edificio de la foto sea ese es una lectura nuestra: es el edificio mapeado más cercano a la pista, a unos 100 m de su eje. La forma de la torre y sus 12 m de alto son ilustrativos.
- **Detalles del hangar.** El portón, las costillas del techo y el cartel MARAMBIO son ilustrativos.
- **Hacia dónde mira cada edificio.** OSM da la planta y el rumbo, no dónde está la puerta. Los cuatro edificios de la fila central y el hangar se dibujan con el extremo de la puerta hacia la pasarela y la plataforma: es ilustrativo.
- **La pasarela.** Su recorrido es ilustrativo: sale del hangar y pasa por los extremos con puerta de los edificios de la fila. No está en los datos de OSM leídos.
- **Detalles de la pista.** Se dibuja sin línea central pintada, con pallets naranjas en las cabeceras y balizas de borde movibles. Siguen una entrevista de DEF Online (06-01-2024) que no se abrió en esta verificación: son ilustrativos (ver «Pendientes» en `base-marambio.md`).
- **Utilería.** Los pallets, las balizas, los tambores y los cajones son ilustrativos, igual que su cantidad y su lugar.
- **El relieve de la meseta.** El contorno del borde, los escarpes y las vetas de nieve son ilustrativos.
- **Ancho de la calle de rodaje.** Sin fuente; se dibuja más angosta que la pista.
- **El Hércules.** Está estacionado sobre la plataforma, atravesado y con la nariz hacia la pista, para que se vea junto a la base. Su pintura camuflada sale de fotos; no hay fuente de texto sobre el esquema actual. El largo del C-130H (29,8 m) se usa solo para el tamaño del modelo y no se muestra como dato.

La etiqueta «Reconstrucción ilustrada» de la escena lo dice con dos fichas (`scene-diorama` y `scene-recortes` en `marambio.ts`).

## Fotos de referencia (Wikimedia Commons; solo para colores y formas, no se incrustan)

La página de cada archivo en Commons se abrió el 14 de noviembre de 2026 para confirmar autor y licencia. Ninguna foto se copia al repositorio ni se muestra en la app.

| Archivo | Licencia | Autor | Fecha | Qué muestra |
|---|---|---|---|---|
| [File:Base Marambio y el Hercules.jpg](https://commons.wikimedia.org/wiki/File:Base_Marambio_y_el_Hercules.jpg) | CC BY 2.5 AR | Casa Rosada (metadatos: Araceli Paz) | 17 mar 2014 | Torre de control junto a un edificio rojo a dos aguas y, al fondo, un C-130 camuflado. |
| [File:Twin Otter en la Base Marambio.jpg](https://commons.wikimedia.org/wiki/File:Twin_Otter_en_la_Base_Marambio.jpg) | CC BY 2.5 AR | Argentina.gob.ar | 11 feb 2019 | Frente del hangar, naranja y de techo curvo, con un Twin Otter delante. |
| [File:Marambio1.jpg](https://commons.wikimedia.org/wiki/File:Marambio1.jpg) | CC BY-SA 4.0 | ERodLeir | 24 oct 2018 (fecha del archivo) | El hangar de techo abovedado durante su montaje. |
| [File:Base Marambio - vista general.jpg](https://commons.wikimedia.org/wiki/File:Base_Marambio_-_vista_general.jpg) | CC BY-SA 2.0 | Ministerio de Cultura de la Nación (fotos: Kaloian) | 5 feb 2023 | Vista aérea: suelo oscuro sin nieve, grupos de edificios rojos y el borde de la meseta sobre el mar. |
| [File:Campaña Antártica Argentina 2017 02.jpg](https://commons.wikimedia.org/wiki/File:Campa%C3%B1a_Ant%C3%A1rtica_Argentina_2017_02.jpg) | CC BY 2.5 AR | Casa Rosada | 23 ene 2017 | Módulos de chapa naranja a dos aguas, sobre pilotes. |

La columna «Qué muestra» resume la lectura de las fotos hecha en la investigación previa. Al abrir las páginas el 14 de noviembre se confirmaron autor, fecha y licencia, no el contenido de cada imagen: queda para la revisión humana del PR.

## Lo que queda para después

- Capítulos guiados, como en Orcadas.
- La pregunta de las 70 personas del invierno como juego de preguntas. Hoy el dato está en una ficha de «Los edificios».
- El viaje de Marambio a Orcadas.
- La entrada a la base desde el final de «Desde Ushuaia».
- El modelo del sitio sobre el mapa 3D abierto, como el de Orcadas.
- Los pendientes de fuente listados en [`base-marambio.md`](base-marambio.md).
