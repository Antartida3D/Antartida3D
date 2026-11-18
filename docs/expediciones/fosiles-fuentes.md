# Fósiles: fuentes y materiales (#7)

Fecha de consulta: **13/11/2026**. Contenido del boceto en `packages/core/src/content/fossils.ts`.

## Testimonio

Florencia Illbele, Infobae, 22/04/2021: «El otro gol a los ingleses»: memorias del geólogo argentino que descubrió el primer dinosaurio en la Antártida en 1986.

https://www.infobae.com/sociedad/2021/04/22/el-otro-gol-a-los-ingleses-memorias-del-geologo-argentino-que-descubrio-el-primer-dinosaurio-en-la-antartida-en-1986/

Se consultó la entrevista para la motivación estratigráfica de la campaña, los amonites de campañas previas, la caminata, la mandíbula con un diente, el regreso por el equipo y la extracción en varias campañas por el suelo congelado. Se usa una paráfrasis breve; no se copia el artículo ni se descargan sus fotos. No se inventa un audio ni se atribuyen frases nuevas a Eduardo.

Los once metros que menciona la nota no se trasladan al modelo ni al texto del dinosaurio. La fuente institucional habla de unos cuatro metros; el boceto no da una longitud del animal. Tampoco se incorporan inferencias a partir de las fotos de un plesiosaurio como si fueran de Antarctopelta.

### Nota «El desvío de 1986» (consulta del 15/11/2026)

La parada «Algo asomaba de la roca» abre una nota con la anécdota del hallazgo (`FOSSIL_STORY` en `packages/core/src/content/fossils.ts`). Es un resumen propio de la entrevista; las frases entre comillas son textuales de Eduardo y se cotejaron una por una con la nota el 15/11/2026: el campamento británico en el sitio elegido y la instalación a 15 km; los «100 pasos» entre las huellas de los cuatriciclos británicos; el recuerdo del Parque Provincial Ischigualasto; la mandíbula con un diente aplanado «como para masticar vegetales»; el regreso por los compañeros; el secreto hasta la publicación; la extracción en varios años por el suelo congelado; y la carpa armada en 1989 al llegar el buque británico John Biscoe. La nota lo aclara en la interfaz. No se usan los once metros ni las fotos del artículo.

## Fuente institucional y fotografía de Eduardo

CONICET, Mariela López Cordero, 29/03/2021: «Homenaje al científico del CADIC que encontró el primer dinosaurio de Antártida».

https://www.conicet.gov.ar/homenaje-al-cientifico-del-cadic-que-encontro-el-primer-dinosaurio-de-antartida/

Se verificaron el hallazgo de 1986, el carácter colectivo, la identificación como Antarctopelta oliveroi, la primera campaña de 1974 y la vinculación con el CADIC y el IAA.

Foto original: https://www.conicet.gov.ar/wp-content/uploads/Figura-2-720x400.jpg

Epígrafe: E. Olivero en el sitio del hallazgo sosteniendo fragmentos de huesos en la roca, 1988, isla James Ross. Gentileza investigador. La página declara CC BY 2.5 Argentina para sus contenidos: https://creativecommons.org/licenses/by/2.5/ar/ . Se acredita investigador y CONICET y se enlaza la página. Transformación: conversión a WebP, sin alteración del contenido. Asset: `packages/core/src/assets/fossils/olivero-campana.webp`.

## Publicación científica de 1991

E. B. Olivero, Z. Gasparini, C. A. Rinaldi y R. Scasso (1991). First record of dinosaurs in Antarctica (Upper Cretaceous, James Ross Island): palaeogeographical implications. En M. R. A. Thomson, J. A. Crame y J. W. Thomson (eds.), Geological Evolution of Antarctica. Cambridge University Press, pp. 617–622.

Copia proporcionada por la familia en `Documentation/1991 First record of dinosaur in Antarctica (Upper Cretaceous, James Ross Island) palaeogeographical implicationsRED.pdf`, fuera del repositorio. Se leyeron visualmente las páginas relevantes: resumen, localización y descripción / figura 2 de las piezas. No se redistribuye el PDF ni sus figuras. No se inventa DOI o URL para la copia local.

Sostiene: hallazgo en James Ross en 1986, esqueleto parcial y placas, restos en sedimentos marinos, fragmento de mandíbula izquierda y diente de corona baja en forma de hoja. La clasificación, edad y reconstrucción detallada deben revisarse con la bibliografía posterior antes de fijar una versión final.

## Amonites gigantes y ambientes

María Eugenia Raffi y Florencia Milanese (2023). «Un paseo por el pasado de la Península Antártica. Historia de las rocas». La Lupa, edición bilingüe, año 2023, n.º 1, pp. 9–12. CADIC-CONICET / UNTDF, CONICET-IAA.

https://revistalalupa.org/wp-content/uploads/2025/06/LLB_RGB.pdf

Se descargó y leyó el artículo, incluyendo su crédito de autoras y fotografía. Describe la vida marina, los bosques del Cretácico y conchillas de amonites gigantes de alrededor de 70 cm de diámetro. Ese valor es una referencia regional, no una medida del espécimen que elegirá la familia ni una escala del modelo.

Foto de apertura, p. 9 impresa (página 11 del PDF): «Fósil de amonite (pachidiscido) gigante. Foto: Eduardo Olivero». Asset: `packages/core/src/assets/fossils/amonite-archivo.webp`. Transformación: extracción de la imagen, reducción a 720 px y conversión a WebP, sin alterar el fósil.

**Uso de la foto del amonite:** el usuario pidió usar el material y las fotografías para este boceto local de los hallazgos de su abuelo. No se encontró una licencia explícita para esta fotografía en el documento consultado. El crédito está identificado. El 14/11/2026 la familia autorizó usar y publicar las fotografías de Eduardo en este proyecto (ver «Archivo fotográfico de E. B. Olivero»).

## Referencia visual aportada

«Parque Cretácico: la Antártida antes del hielo», E. B. Olivero, presentación `PPT CHARLA ANTARTICA GOBIERNO.pptx`, en Documentation, fuera del repo. Se consultaron textos e imágenes de las diapositivas 14–21 para contexto y aspecto de los restos y del campo; no se redistribuye la presentación.

El PDF «2011 Lopez C. Olivero Eocene Polyplacophora J Pal.pdf» corresponde a poliplacóforos y no se usa como evidencia de amonites o dinosaurios.

## Segunda iteración: plesiosaurio, estrellas y archivo familiar (14/11/2026)

### Testimonio (nueva consulta)

Infobae, misma entrevista, consultada el **14/11/2026**. Sostiene: la campaña de 1989 a la isla Vega con paleontólogos de vertebrados del Museo de La Plata («En el año 1989 viajamos con un grupo de paleontólogos de vertebrados del Museo de La Plata»); el epígrafe de una foto que menciona «el hallazgo de un esqueleto casi completo del Plesiosaurio Vegasaurus Molyi»; y que el diente de 1986 «no era un diente de reptil marino, como todos los que abundan ahí, que son dientes cónicos». No se copian las fotos de la nota.

### La Lupa n.º 13 (2018)

M. E. Raffi y F. Milanese. «Un paseo por el pasado de la Península Antártica. Historia de las rocas». La Lupa, año 8, n.º 13, 2018, pp. 6–8. CADIC-CONICET. Copia aportada por la familia: `Documentation/La-Lupa-13-2018-Balsa-Skua.pdf`, fuera del repo; no se encontró URL pública verificada.

Sostiene: mar de unos 18 °C hace aproximadamente 80 Ma, con plesiosaurios, mosasaurios, tiburones y peces; fondo con bivalvos, caracoles, serpúlidos, cangrejos, langostas, corales solitarios, erizos y lirios de mar, e inocerámidos de hasta un metro; bosques de coníferas con cycadas, angiospermas y helechos, reconocidos por troncos, hojas, polen, semillas y frutos fósiles; extinción de fines del Cretácico de la mayoría de los dinosaurios, mosasaurios, plesiosaurios y amonites. Es la base del mar y del bosque cretácicos de la escena.

### Estrellas de mar del Eoceno

M. I. López Cabrera y E. B. Olivero (2024). New late middle Eocene Antarctic goniasterids (Asteroidea, Echinodermata) from La Meseta Formation. Ameghiniana 61(5): 213–229. https://doi.org/10.5710/AMGH.16.09.2024.3616 . Copia aportada por la familia en Documentation. Consultado el 14/11/2026.

Acceso (#300): en la página de la revista el resumen es público y el PDF completo requiere suscripción ([página del artículo](https://ameghiniana.org.ar/index.php/ameghiniana/article/view/3616), consultada el 18/11/2026). La ficha lo dice junto al enlace. Según la [nota de derechos de Ameghiniana](https://www.ameghiniana.org.ar/index.php/ameghiniana/libraryFiles/downloadPublic/113) (consultada el 18/11/2026), las autoras pueden subir la versión publicada a un repositorio institucional, y la versión aceptada también a su página o a redes académicas, con la cita completa y el DOI. Por decisión de quien lleva el issue (18/11/2026), por ahora solo se enlaza la página oficial del artículo y el paper completo no se muestra. La copia aportada por la familia no se publica en este sitio.

Sostiene: dos ejemplares de preservación excepcional de la localidad Bill Hill, Formación La Meseta, isla Marambio (Seymour), Eoceno medio tardío: *Billaster blakei* (género y especie nuevos; radio mayor R = 17 mm) y *Buterminaster elegans* (R = 15 mm); el esqueleto de piezas sueltas exige enterramiento rápido para conservarse entero; vivían en fondos duros o firmes asociados a briozoos, braquiópodos, erizos, serpúlidos, crinoideos y un poliplacóforo, y probablemente se alimentaban de briozoos y braquiópodos; son muy distintos de los goniastéridos antárticos actuales y afines a géneros que hoy viven en Nueva Caledonia-Kermadec y en el Atlántico tropical hasta Uruguay. El mismo número de la revista destaca un trabajo de histología de un elasmosáurido antártico que no se consultó.

### Quitón de Bill Hill

M. I. López Cabrera y E. Olivero (2011). «Leptochiton sp. Primer quitón fósil articulado hallado en la Isla Marambio, Antártida». La Lupa, n.º 1, pp. 9–13. Copia aportada por la familia: `Documentation/La-Lupa-01-2011.pdf`. Sostiene: 9,4 mm de largo, ocho valvas articuladas, adherido a un braquiópodo, en el Eoceno de la Formación La Meseta. Complementa el artículo científico de 2011 que ya estaba en Documentation.

### Archivo fotográfico de E. B. Olivero

Fotografías aportadas por la familia en `Documentation/Fotos/FOTOS PARA ROCHI NACHO/…/05 Trabajo de campo fosiles/`, fuera del repo. **La familia autorizó usarlas y publicarlas en este proyecto** (comunicado por quien desarrolla la expedición, familiar de Eduardo, el 14/11/2026). Transformación: orientación según EXIF, sin metadatos, reducción a 720 px como máximo y conversión a WebP; sin alterar el contenido.

| Asset | Original | Uso |
| --- | --- | --- |
| `amonite-afloramiento.webp` | `Amonite/Imagen034.jpg` | Amonite gigante en el afloramiento con martillo |
| `amonite-corte.webp` | `Amonite/Vertical Anaguadryceras.jpg` | Corte pulido con las cámaras. El género del nombre de archivo no se muestra hasta confirmarlo |
| `amonite-traslado.webp` | `Amonite/DSCN7283.JPG` | Amonite atado en una lona junto al mar |
| `plesiosaurio-esqueleto.webp` | `Plesiosaurus/Plesiosaurus skeleton Vega I.jpg` | Esqueleto en el sedimento; «isla Vega» según el nombre de archivo |
| `plesiosaurio-sitio.webp` | `Plesiosaurus/Figura 3.jpg` | Tres personas en el sitio de un esqueleto |
| `plesiosaurio-preparacion.webp` | `Plesiosaurus/07 1769.jpg` | Vértebras ordenadas en una mesa dentro de la carpa |
| `antarctopelta-restos.webp` | `Dinosaurio/08a Antarctopelta oliveroi maxilar dientes vertebras recuperadas.png` | Lámina de restos numerados; publicación de origen a confirmar |
| `antarctopelta-sitio.webp` | `Dinosaurio/08 1365.jpg` | Dos personas trabajando en una planicie junto al mar |
| `tronco-fosil.webp` | `Dinosaurio/Tree.jpg` | Tronco fosilizado: evidencia de bosques |
| `bosque-tdf.webp` | `Dinosaurio/10b Piramide6.JPG` | **Bosque actual de Tierra del Fuego**: según la familia, una comparación de cómo pudo ser, no la Antártida. Se rotula «Comparación actual» en la interfaz |
| `estrellas-bill-hill.webp` | `Estrellas/Eocene reef.jpg` | Estrellas y fauna asociada con escala |
| `quiton.webp` | `Estrellas/Foto Chiton.jpg` | Leptochiton sp. |

Las fotos de campamento (`03 Campamento`) y la diapositiva de carpas de la presentación se usaron solo como referencia de colores y formas para la escena.

**No se usan**, por ser obras de terceros sin licencia identificada o generadas: la estampilla de Correo Argentino, las ilustraciones de paleoarte de Antarctopelta, la imagen web de plesiosaurios (`07 los-plesiosaurios…`), el PDF del New York Times y las imágenes generadas con ChatGPT de la carpeta Fotos.

## Pendientes para la revisión con Eduardo

- Qué especies y ejemplares de amonites gigantes quiere representar; sitio, campaña, dimensiones y publicación primaria correspondiente.
- Historia del hallazgo de los gigantes y relación, si la hay, con los amonites previos a 1986.
- Fecha, lugar, autoría y personas de cada fotografía del archivo cuando no constan en el epígrafe.
- Género del amonite del corte pulido, publicación de origen de la lámina de restos de Antarctopelta y relación entre el esqueleto de la foto «Vega I» y Vegasaurus molyi.
- Forma del plesiosaurio y publicación primaria de Vegasaurus molyi.
- Forma del dinosaurio, distribución de su armadura y reconstrucción del cuerpo a la luz de estudios posteriores.
- Nuevos testimonios, grabaciones y equipo que debe acreditarse.

Los colores, movimientos, posiciones, distribución del campamento y de los animales son decisiones ilustrativas, no observaciones científicas.

## Línea de tiempo geológico (15/11/2026)

Comisión Internacional de Estratigrafía (ICS). *International Chronostratigraphic Chart*, v2026/06. https://stratigraphy.org/ICSchart/ChronostratChart2026-06.pdf . Consultada el **15/11/2026** (se descargó el PDF y se leyó la columna del Cretácico superior y el Paleógeno).

Sostiene las edades de los límites que usa la línea (`FOSSIL_TIMELINE` en `packages/core/src/content/fossils.ts`): base del Cretácico superior 100,5 ± 0,1 Ma; límite Cretácico–Paleógeno 66,00 Ma; base del Eoceno 56,00 Ma; fin del Eoceno 33,9 Ma; Eoceno medio entre 48,07 (base del Luteciano) y 37,71 Ma (base del Priaboniano).

Cada hallazgo se ubica solo en el período que dan sus fuentes, nunca en un año: el dinosaurio en el Cretácico superior (título de la publicación de 1991; la copia es un escaneo sin texto buscable); los amonites y el plesiosaurio en el mar del Cretácico tardío de unos 80 Ma que termina con su extinción (La Lupa n.º 13, 2018); las estrellas de mar en el Eoceno medio tardío (Ameghiniana 2024, sin edad numérica). Dentro de su período, los hallazgos se dibujan en el orden de los capítulos, que no es un orden en el tiempo; la interfaz lo aclara («cada hallazgo, en su período»). Pendiente con Eduardo: la edad precisa de cada ejemplar, si se quiere ubicarlos con más detalle.
