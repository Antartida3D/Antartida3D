# Antártida por descubrir

Equipo **DOT ENV**, hackatón SoberaníaTech (Ushuaia, 2026), Eje 2: Antártida, Ciencia y Conocimiento Abierto.

*Antártida por descubrir* es una plataforma interactiva orientada a la divulgación y educación sobre el continente antártico, combinando cartografía interactiva y expediciones guiadas.

## Integrantes

Las cinco personas del equipo cursan el 5.º año de la Licenciatura en Sistemas de la Universidad Nacional de Tierra del Fuego (UNTDF) y trabajan en programación.

| Integrante | Rol | GitHub |
|---|---|---|
| Rocío Jofre Olivero | Referente del equipo | [Roolivero](https://github.com/Roolivero) |
| Lucas Ezequías Araya | Programación | [LucasA21](https://github.com/LucasA21) |
| María José Farías Flores | Programación | [majo-fflores](https://github.com/majo-fflores) |
| Giuliano Ignacio Poeta | Programación | [GiulianoPoeta99](https://github.com/GiulianoPoeta99) |
| Ignacio Agustín Sánchez Sotelo | Programación | [NeichS](https://github.com/NeichS) |

## Eje

**Eje 2: Antártida, Ciencia y Conocimiento Abierto.** El proyecto sigue las dos reglas del eje:

- Cada dato lleva su fuente: referencia o URL, organismo o autor y fecha de consulta (ver «Fuentes y licencias»). Un dato sin fuente no se publica.
- Una simulación o una reconstrucción nunca se presenta como dato real. La interfaz marca qué es cada cosa.

## Problema

La información verificada sobre la Antártida es difícil de encontrar para el público general. Está repartida en publicaciones científicas, series de datos y archivos oficiales. Además, casi siempre pide conocimiento previo para entenderla.

Lo vivimos en primera persona. Somos fueguinos: nacimos, crecimos o vivimos gran parte de nuestra vida en Tierra del Fuego. Nuestra provincia se llama Tierra del Fuego, Antártida e Islas del Atlántico Sur. Aun así, nunca tuvimos la oportunidad de aprender sobre la Antártida. Nos llamó la atención no saber casi nada de una parte de nuestra propia provincia.

Por eso queremos difundir la ciencia que se hace en el territorio antártico argentino y darle visibilidad. La aplicación reúne información de calidad en un solo lugar y la presenta de forma didáctica, para que cualquier persona pueda aprender. Cada dato se apoya en fuentes verificadas, varias de primera mano. Un ejemplo es el archivo del geólogo Eduardo Olivero, abuelo de Rocío, integrante del equipo.

La aplicación también cuenta historias reales y anécdotas que poca gente conoce. Por ejemplo, la vida de Poncho, un perro polar del Ejército Argentino, o el hallazgo del primer dinosaurio de la Antártida. Darles protagonismo a esas historias es otro de nuestros objetivos.

## Destinatarios y sostenibilidad

- **Educación:** en una primera etapa, la aplicación está pensada para las instituciones educativas.
- **Turismo:** también puede ser una carta de presentación de Ushuaia y de la provincia, para informar a quienes la visitan.

**Modelo de negocio (propuesta, todavía no está en la aplicación):**

- Las empresas de turismo locales pueden pagar para aparecer en los puntos turísticos del mapa. Desde ahí, la persona puede contactarlas para pedir más información o una excursión.

La publicidad va siempre separada y marcada como tal. Nunca se mezcla con el contenido científico ni con sus fuentes.

## Solución

Un mapa 3D de la Antártida con relieve real, del que salen expediciones guiadas. Cada expedición plantea una pregunta, propone una actividad y lleva a un descubrimiento respaldado por fuentes. Al terminar, la persona vuelve al mapa con un registro de lo que exploró.

La información está en tres niveles: **explorar** (el mapa y los lugares), **descubrir** (el recorrido de cada expedición) y **profundizar** («Saber más», los datos y las fuentes). Los niveles extensos se abren sin cortar el recorrido principal. Está pensada para personas sin conocimientos científicos previos.

Las seis expediciones:

- **Desde Ushuaia:** el viaje desde Ushuaia hasta la Antártida en los medios científicos argentinos. Muestra la logística que hace posible la ciencia.
- **Base Marambio:** un recorrido por la base, con su pista, el Hércules C-130 y el clima de la isla.
- **Estación Orcadas:** «¿Cuánto cambió el clima de la isla Laurie en 120 años?», con la serie de temperatura real de la estación.
- **Fósiles:** cuatro hallazgos de Eduardo Olivero y sus equipos, del Cretácico tardío al Eoceno.
- **Océano:** la red alimentaria del mar antártico, del fitoplancton y el krill a los animales que se reconocen.
- **Poncho:** la vida de un perro de trineo del Ejército Argentino en la Antártida, entre 1961 y 1978.

## Aplicación

**`apps/dibujado`** (puerto 5103): mapa dibujado estilo acuarela con relieve 3D (el mapa 2D está deshabilitado y solo aparece sin WebGL o si falla el 3D, [DEC-227](docs/decisiones/DEC-227-mapa-2d-deshabilitado.md)), con las seis expediciones de «Solución» y la capa de reclamos territoriales. Los demás puntos del mapa son puntos de interés, con una ficha corta y, en varios, una escena propia. La interfaz ofrece navegación por teclado y alternativas al mapa 3D.

El sistema visual de la UI está en [DESIGN.md](DESIGN.md), siguiendo el formato abierto de Google Labs (alpha), con tokens YAML y reglas de uso: pergamino claro, tinta marrón neutra y lenguaje cartográfico. La ficha «Océano» aprobó esta dirección; la revisión posterior acepta paneles flotantes con radio de 13 px y botones rectangulares con radio de 9 px, conservando círculos, chips, gráficos, separadores y esquinas pegadas al borde según su semántica. La aplicación global queda en migración y verificación. El [plan de migración](docs/diseno/plan-migracion-ui.md) conserva el inventario, la referencia aprobada, las capturas y los límites de verificación.

## Boceto de Fósiles (#7)

La expedición **Fósiles** recorre cuatro hallazgos de Eduardo Olivero y sus equipos, ordenados por edad: amonites gigantes, el plesiosaurio de la isla Vega, Antarctopelta y las estrellas de mar del Eoceno de la isla Marambio. Se abre desde el mapa, la lista o directamente con `http://localhost:5103/?expedicion=fosiles`. Seis capítulos: Llegar, Amonites, Plesiosaurio, Dinosaurio, Estrellas y El pasado. Incluye escenas low-poly animadas (campo actual, mar y bosque del Cretácico, fondo del Eoceno), una línea de tiempo geológico del Cretácico tardío al Eoceno, la anécdota del hallazgo del dinosaurio, interacciones opcionales, fotos del archivo familiar, fuentes y una alternativa sin WebGL.

Es un boceto para revisar con Eduardo. Especie, medidas e historia particular de los amonites elegidos siguen pendientes. [Diseño](docs/expediciones/fosiles-diseno.md) y [fuentes, créditos y permisos](docs/expediciones/fosiles-fuentes.md). La familia autorizó publicar las fotografías del archivo de Eduardo usadas aquí. No se redistribuyen los PDFs o la presentación aportados por la familia.

La primera versión de este boceto se realizó con asistencia de Codex. La segunda iteración (escenas, animaciones y arte alineados con Orcadas; plesiosaurio y estrellas de mar; archivo fotográfico) se realizó con asistencia de Claude Code (Anthropic). Ambas partieron de las decisiones del usuario, los documentos aportados y las fuentes registradas. Las escenas se identifican como ilustrativas y la limpieza como simulación educativa.

## Estructura del repositorio

```
/                       pnpm workspace (package.json, pnpm-workspace.yaml, pnpm-lock.yaml, tsconfig.base.json)
├─ apps/
│  └─ dibujado/         app del mapa dibujado (2D pintado + 3D con relieve), puerto 5103
├─ packages/
│  ├─ core/             core de la app dibujada (TypeScript puro)
│  ├─ react-ui/         componentes de interfaz
│  └─ e2e/              tests Playwright para apps/dibujado
├─ scripts/bench/       benchmark de rendimiento
├─ docs/
│  ├─ propuesta.pdf     documento original de propuesta
│  ├─ diseno/           especificación de diseño (HANDOFF.md y prototipo)
│  ├─ decisiones.md     registro de decisiones y diferencias
│  ├─ datos-relieve.md  origen y archivos de los datos de relieve 3D (Bedmap3)
│  ├─ tecnologias.md    guía fácil de leer de las tecnologías del proyecto
│  └─ rendimiento.md    + rendimiento/ (results.json, capturas/)
├─ .agents/ .claude/ .githooks/
├─ AGENTS.md  ROADMAP.md  README.md  .gitignore
```

## Tecnologías

Es una página web: todo corre en el navegador. No hay servidor propio ni base de datos. La guía completa, escrita para cualquier lector, está en [`docs/tecnologias.md`](docs/tecnologias.md).

| Tema | Qué usamos |
|---|---|
| Lenguaje | TypeScript. Los efectos visuales del 3D están en GLSL. |
| Interfaz | React 19. |
| Mapa 3D | Three.js sobre WebGL, con React Three Fiber y @react-three/drei. |
| Relieve | Bedmap3 (Antártida) e IBCSO v2 (mar y Tierra del Fuego), procesados a mallas propias. |
| Construcción | Vite y pnpm (monorepo). |
| Pruebas | Vitest (lógica) y Playwright (navegador, a 390 y 1440 px). |
| Publicación | Vercel (plan Hobby), con Web Analytics de Vercel para contar visitas ([DEC-331](docs/decisiones/DEC-331-cache-y-web-analytics.md)). |

## Requisitos y uso

### Para el público

Solo hace falta un navegador actualizado, en computadora o celular. El link público está pendiente ([#5](https://github.com/Antartida3D/Antartida3D/issues/5)); mientras tanto, la aplicación se levanta en local con los comandos de abajo.

1. En la primera visita, una guía corta de tres pasos explica cómo moverse por el mapa 3D. Se puede saltar y se vuelve a abrir con el botón **?**.
2. Tocar o hacer clic en un punto del mapa, o elegirlo en la lista, abre su ficha.
3. En los puntos con expedición, la ficha la empieza. Cada parada tiene «Saber más» y sus fuentes.
4. Al terminar, la expedición queda en el registro de exploración.

Todo se puede usar con teclado. Si el navegador no tiene WebGL o el 3D falla, la aplicación muestra un mapa 2D accesible.

### Para desarrollar

Requiere **Node.js >= 22** y **pnpm 11**. Para los tests E2E y el benchmark se requiere Chromium (`/usr/bin/chromium` o configurado mediante la variable `CHROMIUM_PATH`).

```sh
pnpm install

# Servidores de desarrollo
pnpm dev             # apps/dibujado en http://localhost:5103

# Build y preview
pnpm build           # compila todas las aplicaciones
pnpm preview         # vista previa de apps/dibujado

# Verificación
pnpm test            # control documental y tests unitarios del workspace
pnpm docs:test       # pruebas del control de documentación
pnpm typecheck       # validación de tipos TypeScript
pnpm e2e             # tests de flujo e2e en apps/dibujado (Playwright)
pnpm bench           # benchmark de rendimiento
```

`pnpm e2e` acepta tres variables opcionales para correr más rápido en local (#87). Sin ellas, la suite corre como siempre: un solo worker y WebGL dibujado por CPU (SwiftShader), que funciona en cualquier máquina.

- `E2E_GPU=1`: dibuja WebGL con la placa de video. Al empezar, la suite imprime qué GPU usa y avisa si Chromium volvió a SwiftShader.
- `E2E_WORKERS=<n>`: corre `n` archivos de prueba en paralelo. Solo junto con `E2E_GPU=1`: con SwiftShader cada worker usa varios núcleos y, con 4, la prueba de arrastre del mapa 3D se pasa del tiempo límite.
- `E2E_PORT=<puerto>`: levanta la vista previa en otro puerto. Sirve si hay un `pnpm dev` de otra rama en 5103, que si no la suite reutilizaría.

Por ejemplo, en una máquina con placa de video (Git Bash o sh):

```sh
E2E_GPU=1 E2E_WORKERS=4 pnpm e2e
```

Tiempos medidos en [`docs/rendimiento/e2e.md`](docs/rendimiento/e2e.md).

## Documentación de los cambios

Cada PR declara su impacto documental y registra las decisiones nuevas o reemplazadas. Ver [control de documentación](docs/control-documentacion.md) para el formato, la comprobación local y la activación del requisito en GitHub.

## Licencia

Copyright (C) 2026 Equipo DOT ENV, formado por las personas que figuran en «Integrantes».

El código y el material propio de este repositorio se publican con la [Licencia Pública General de GNU, versión 3](LICENSE) (`GPL-3.0-only`). Cualquier persona puede usar, estudiar, modificar y redistribuir el proyecto. Quien distribuya una versión modificada debe publicarla con la misma licencia y conservar el aviso de autoría. El proyecto se entrega sin garantía. La decisión y sus motivos están en [DEC-321](docs/decisiones/DEC-321-licencia-gpl-3.md).

El material propio es el código fuente, los textos de la aplicación, los modelos de bloques y low-poly, las ilustraciones y la documentación.

La licencia **no** cubre lo siguiente:

- **Datos y recursos de terceros:** conservan su propia licencia y su atribución, detalladas en «Fuentes y licencias». Esto incluye los archivos de `packages/core/src/assets/` generados a partir de esos datos (relieve, batimetría, costas).
- **Fotografías de `packages/core/src/assets/fossils/` y `packages/core/src/assets/marambio/`:** el origen y el permiso de cada una están en [`docs/expediciones/fosiles-fuentes.md`](docs/expediciones/fosiles-fuentes.md) y [`docs/expediciones/base-marambio.md`](docs/expediciones/base-marambio.md). Las del archivo de E. B. Olivero se publican con autorización de la familia solo para este proyecto. No se pueden reutilizar sin un permiso nuevo.
- **Fotografías de `packages/core/src/assets/poncho/`:** su autorización está pendiente, como registra [`docs/expediciones/poncho-fuentes.md`](docs/expediciones/poncho-fuentes.md). No se pueden reutilizar.
- **Librerías y tipografías:** cada una mantiene su licencia (MIT y SIL Open Font License 1.1).

## Fuentes y licencias

- **Reclamos territoriales antárticos (#108):** capa opcional del mapa 3D, desactivada al cargar. Se abre desde el modal de entrada de **El Polo Sur** con **Ver reclamos territoriales** (#128, #286); con la capa encendida, el interruptor **Reclamos territoriales** la apaga. Muestra superficies transparentes de colores intensos, con bordes punteados y banderas; los botones por país permiten distinguir superposiciones. Incluye los siete países reclamantes y Pedro I como reclamo insular separado de Tierra de la Reina Maud. Ofrece **Sectores con mar** (referencia geográfica hasta 60° S) y **Solo tierra y hielo** sobre Bedmap3. El color de un sector sobre el mar no significa soberanía ni ZEE. Las fichas de los siete países describen sus reclamos y enlazan las fuentes. Banderas con ubicación y escala ilustrativas. Fuentes nacionales, Tratado Antártico, metodología y licencias en [`docs/reclamos-antarticos-fuentes.md`](docs/reclamos-antarticos-fuentes.md).
- **Relieve Bedmap3 (apps/dibujado):** British Antarctic Survey (UK Polar Data Centre). Dataset de superficie y máscaras a 500 m en EPSG:3031, licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Detalle de archivos, transformación y cita en [`docs/datos-relieve.md`](docs/datos-relieve.md).
  - Organismo: UK Polar Data Centre, British Antarctic Survey.
  - Dataset DOI: [https://doi.org/10.5285/2d0e4791-8e20-46a3-80e4-f5f6716025d2](https://doi.org/10.5285/2d0e4791-8e20-46a3-80e4-f5f6716025d2).
  - Publicación científica: Pritchard et al. 2025, *Sci Data* 12:414, [https://doi.org/10.1038/s41597-025-04672-y](https://doi.org/10.1038/s41597-025-04672-y).
  - Repositorio RAMADDA: [http://ramadda.data.bas.ac.uk/repository/entry/show?entryid=2d0e4791-8e20-46a3-80e4-f5f6716025d2](http://ramadda.data.bas.ac.uk/repository/entry/show?entryid=2d0e4791-8e20-46a3-80e4-f5f6716025d2).
  - Fecha de consulta: 11 de noviembre de 2026.
- **Relieve de Tierra del Fuego, Patagonia sur y Malvinas, IBCSO v2 (apps/dibujado):** Dorschel, B. et al. (2022), *The International Bathymetric Chart of the Southern Ocean Version 2 (IBCSO v2)*, SCAR / Alfred Wegener Institute, publicado en PANGAEA. Grilla de 500 m al sur de 50° S, licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Detalle en [`docs/datos-relieve.md`](docs/datos-relieve.md).
  - Dataset DOI: [https://doi.org/10.1594/PANGAEA.937574](https://doi.org/10.1594/PANGAEA.937574).
  - Fecha de consulta: 11 de noviembre de 2026.
- **Batimetría IBCSO v2 (apps/dibujado):** Scientific Committee on Antarctic Research (SCAR) / Alfred-Wegener-Institut. Grilla batimétrica de 500 m al sur de 50° S en EPSG:9354, licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  - Organismo: SCAR / Alfred Wegener Institute (PANGAEA).
  - Dataset DOI: [https://doi.org/10.1594/PANGAEA.937574](https://doi.org/10.1594/PANGAEA.937574).
  - Publicación científica: Dorschel, B. et al. (2022), *The International Bathymetric Chart of the Southern Ocean Version 2*, Scientific Data 9:275, [https://doi.org/10.1038/s41597-022-01366-7](https://doi.org/10.1038/s41597-022-01366-7).
  - Fecha de consulta: 11 de noviembre de 2026.
- **Distribución de fauna marina y aves antárticas (apps/dibujado):**
  - Publicación científica: Clarke, A. et al. (2026), *A Twenty-Six Year Record of Marine Mammals and Birds in Marguerite Bay, Antarctic Peninsula*, Ecology and Evolution 16(3): e73317, [https://doi.org/10.1002/ece3.73317](https://doi.org/10.1002/ece3.73317). Licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  - Población y distribución de pingüino emperador: Fretwell, P.T. et al. (2012), *An Emperor Penguin Population Estimate: The First Global, Synoptic Survey of a Species from Space*, PLOS ONE 7(4): e33751, [https://doi.org/10.1371/journal.pone.0033751](https://doi.org/10.1371/journal.pone.0033751). Licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  - Especies marinas: NOAA Fisheries (National Oceanic and Atmospheric Administration), [https://www.fisheries.noaa.gov/species/](https://www.fisheries.noaa.gov/species/). Dominio público / agencia gubernamental de EE. UU.
  - Fichas de la orca, la ballena minke y la foca leopardo: Australian Antarctic Division, fichas de especie, [https://www.antarctica.gov.au/about-antarctica/animals/](https://www.antarctica.gov.au/about-antarctica/animals/) y [https://www.antarctica.gov.au/about-antarctica/animals/whales/minke-whale/](https://www.antarctica.gov.au/about-antarctica/animals/whales/minke-whale/) (ballena minke, consultada el 13 de noviembre de 2026).
  - Fecha de consulta: 11 de noviembre de 2026.
- **Rompehielos ARA Almirante Irízar y logística antártica (apps/dibujado):**
  - Organismo: Armada Argentina — Campaña Antártica de Verano (CAV).
  - Fuentes oficiales: [https://www.argentina.gob.ar/armada/antartida/campana-antartica](https://www.argentina.gob.ar/armada/antartida/campana-antartica) y [https://www.argentina.gob.ar/armada/antartida/fauna-y-flora](https://www.argentina.gob.ar/armada/antartida/fauna-y-flora).
  - Fecha de consulta: 11 de noviembre de 2026.
- **Témpanos tabulares y barreras de hielo (apps/dibujado):**
  - Publicación científica: Marsh, O.J. et al. (2025), *Ocean tides trigger ice shelf rift growth and calving*, Nature Communications 16: 6697, [https://doi.org/10.1038/s41467-025-61796-w](https://doi.org/10.1038/s41467-025-61796-w). Licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  - National Snow and Ice Data Center (NSIDC), [https://nsidc.org/learn/parts-cryosphere/ice-shelves](https://nsidc.org/learn/parts-cryosphere/ice-shelves).
  - Fecha de consulta: 11 de noviembre de 2026.
- **Expedición Estación Orcadas (apps/dibujado):**
  - **Base Orcadas:** Cancillería Argentina · Dirección Nacional del Antártico. URL: [https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/orcadas](https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/orcadas). Fecha de consulta: 11 de noviembre de 2026.
  - **Bases permanentes:** Armada Argentina. URL: [https://www.argentina.gob.ar/armada/antartida/bases-permanentes](https://www.argentina.gob.ar/armada/antartida/bases-permanentes). Fecha de consulta: 11 de noviembre de 2026.
  - **READER: datos de superficie de Orcadas:** SCAR · British Antarctic Survey. URL: [https://legacy.bas.ac.uk/met/READER/surface/Orcadas.All.temperature.html](https://legacy.bas.ac.uk/met/READER/surface/Orcadas.All.temperature.html). Fecha de consulta: 11 de noviembre de 2026. Licencia: Open Government Licence v3.0. Atribución de los datos de temperatura: SCAR READER, British Antarctic Survey, Open Government Licence v3.0.
  - **Zazulie, Rusticucci y Solomon (2010):** Journal of Climate 23(1). URL: [https://doi.org/10.1175/2009JCLI3074.1](https://doi.org/10.1175/2009JCLI3074.1). Fecha de consulta: 11 de noviembre de 2026.
  - **OMM · OSCAR/Surface, estación 88968:** OMM. URL: [https://oscar.wmo.int/surface/#/search/station/stationReportDetails/12480](https://oscar.wmo.int/surface/#/search/station/stationReportDetails/12480). Fecha de consulta: 11 de noviembre de 2026.
  - **R. C. Mossman (1907):** Report on the Scientific Results of the Voyage of S.Y. Scotia, vol. II, Meteorology. URL: [https://archive.org/details/reportonscientif02scot](https://archive.org/details/reportonscientif02scot). Fecha de consulta: 12 de noviembre de 2026. Licencia: dominio público.
  - **Antarctic Station Catalogue (Argentina):** COMNAP. URL: [https://www.comnap.aq/s/Argentina_Catalogue_Aug2017.pdf](https://www.comnap.aq/s/Argentina_Catalogue_Aug2017.pdf). Fecha de consulta: 12 de noviembre de 2026.
  - **Sitio y Monumento Histórico N.º 42:** Secretaría del Tratado Antártico. URL: [https://www.ats.aq/devph/en/apa-database/119](https://www.ats.aq/devph/en/apa-database/119). Fecha de consulta: 12 de noviembre de 2026.
  - **OpenStreetMap: edificios y costa de la Base Orcadas:** colaboradores de OpenStreetMap, trazado sobre imágenes Maxar 2019. URL: [https://www.openstreetmap.org/#map=18/-60.7378/-44.7375](https://www.openstreetmap.org/#map=18/-60.7378/-44.7375). Fecha de consulta: 12 de noviembre de 2026. Licencia: [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) (© colaboradores de OpenStreetMap).
  - Las fuentes pendientes de verificación están en [`docs/orcadas-fuentes.md`](docs/orcadas-fuentes.md) y sus datos no se muestran en la interfaz.
  - **Recorrido guiado:** cuatro capítulos alrededor de una pregunta guía, «¿Cuánto cambió el clima de la isla Laurie en 120 años?». Cada capítulo tiene unas pocas paradas: la cámara viaja a un punto de la base y una tarjeta muestra una frase corta con su fuente; «Siguiente» pasa a la parada siguiente y, en la última, al capítulo siguiente.
    1. Llegar: el istmo, la bandera, Casa Omond y la pingüinera.
    2. Observar: una lectura de temperatura tocando la lupa del termómetro. Presión, viento y nubes son opcionales.
    3. Viajar: 1903, 1927, 1951 y hoy, con la serie del siglo.
    4. Responder: la lectura comparada con el mismo mes de todos los años.

    Se recorre entero sin escribir ningún número. Lo que cada frase deja afuera queda en el «Saber más» de esa parada. Al final, Responder muestra qué se completó y qué faltó. La tira de meses cambia la luz y el hielo de la escena en cualquier capítulo; en el celular es un chip con el mes que se despliega, y el panel del capítulo se arrastra para agrandarlo o achicarlo hasta dejar solo su nombre y el botón principal.
  - **Dato real:** la serie de temperatura (SCAR READER), las fechas de la historia y la elevación.
  - **Simulación (rotulada):** la observación del día, el hielo de la bahía por mes y la fauna por mes.
  - **Cálculo:** las horas de luz, la media móvil y la tendencia en dos tramos (1904–1950 y 1951–2025).
  - **Reconstrucción:** el diorama. Es un escenario de frente con una selección de edificios. La forma y el color de cada uno salen de OpenStreetMap, pero dónde está cada uno es ilustrativo. Los animales, instrumentos y la bandera están agrandados.
  - La explicación de la disposición está en [`docs/orcadas-emplazamiento.md`](docs/orcadas-emplazamiento.md).
- **Base Marambio (#74):** diorama para recorrer con seis puntos de interés (meseta, pista, Hércules C-130, hangar, torre de control y edificios). La misma base, en maqueta, se ve sobre el mapa 3D en la Isla Marambio. Cada ficha, con su cita, está en [`docs/expediciones/base-marambio.md`](docs/expediciones/base-marambio.md); el diseño, en [`docs/expediciones/base-marambio-diseno.md`](docs/expediciones/base-marambio-diseno.md). Fecha de consulta de todas las fuentes: 14 de noviembre de 2026.
  - **Base Marambio:** Cancillería Argentina · Dirección Nacional del Antártico. URL: [https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/marambio](https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/marambio).
  - **Fuentes compartidas con «Desde Ushuaia»** (URL en [`docs/expediciones/desde-ushuaia-fuentes.md`](docs/expediciones/desde-ushuaia-fuentes.md)): Armada Argentina `[O2]` y `[O24]`; Cancillería · Dirección Nacional del Antártico `[O10]` y `[O12]`; Cancillería (Embajada en Uruguay) `[O13]`; Fuerza Aérea Argentina `[O14]` y `[O45]`.
  - **Clima de la Base Marambio (#160):** Servicio Meteorológico Nacional, «Estadísticas Climatológicas Normales: República Argentina – Período 1991-2020» (2023), pp. 792-799. URL: [repositorio.smn.gob.ar](https://repositorio.smn.gob.ar/bitstream/handle/20.500.12160/2506/estad%C3%ADsticas_climatol%C3%B3gicas_normales_1991-2020.pdf?sequence=4&isAllowed=y). Y su página «Clima en Argentina: Base Marambio», en la copia del Internet Archive del 4 de septiembre de 2017. Consulta: 15 de noviembre de 2026. Los días de ventisca y las temperaturas de la tira de meses son datos reales; la nieve que vuela en la escena es una simulación.
  - **OpenStreetMap: pista, plataforma, hangar y edificios de la Base Marambio:** colaboradores de OpenStreetMap (changeset 134877913, 13 de abril de 2023). URL: [https://www.openstreetmap.org/#map=16/-64.2400/-56.6300](https://www.openstreetmap.org/#map=16/-64.2400/-56.6300). Licencia: [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) (© colaboradores de OpenStreetMap). Es un mapa colaborativo: de ahí salen las plantas, los nombres y los colores de los edificios.
  - **Archivo fotográfico de E. B. Olivero (#207):** siete fotos de Eduardo Olivero en los puntos de interés, con la fecha que registró la cámara. La familia autorizó publicarlas en este proyecto; no se redistribuyen los originales. Detalle de cada una en `docs/expediciones/base-marambio.md`.
  - **Fotos de referencia (Wikimedia Commons):** se usaron solo para colores y formas y no se incrustan. Archivo, autor y licencia de cada una (CC BY 2.5 AR, CC BY-SA 2.0 y CC BY-SA 4.0) en `docs/expediciones/base-marambio-diseno.md`.
  - **Dato real:** las fichas con fuente oficial (fundación, pista, vuelos, población, laboratorio). Ninguna se apoya solo en OpenStreetMap. La medida de la pista (1.200 × 35 m) lleva la fecha de la nota de la Fuerza Aérea que la da, 2020.
  - **Reconstrucción:** el diorama y las fichas que se apoyan solo en OpenStreetMap (el hangar junto a la plataforma y los nombres de los edificios). Las plantas, los nombres y los colores salen de OpenStreetMap; las posiciones están acercadas en el orden real, se dibuja solo un tramo de la pista y el borde de la meseta está más cerca y más bajo. La torre de control, las alturas, los techos y la pintura del avión salen de fotos. La pasarela, los detalles del hangar y de la pista y la utilería son ilustrativos.
  - Lo que no tiene fuente (largo actual de la pista, cantidad de edificios, entre otros) está en «Pendientes» de `docs/expediciones/base-marambio.md` y no se muestra.
- **Temperatura actual estimada por zona (apps/dibujado):** estimación de modelo meteorológico, no medición de estación. Se muestra en la ficha de cada punto y, en los puntos con escena propia, en el primer punto de su recorrido (#285). **[Pendiente de revisión: confirmar límite de uso gratuito no comercial y texto de atribución]**.
  - Organismo / servicio: Open-Meteo.com.
  - Documentación: [https://open-meteo.com/en/docs](https://open-meteo.com/en/docs).
  - Términos de uso: [https://open-meteo.com/en/terms](https://open-meteo.com/en/terms).
  - Licencia: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  - Fecha de consulta: 11 de noviembre de 2026.
- **Librerías 3D (apps/dibujado y react-ui):** Three.js (licencia MIT), React Three Fiber (licencia MIT), @react-three/drei (licencia MIT), @react-three/postprocessing (licencia MIT).
- **Costa y barreras de hielo:** [Natural Earth](https://www.naturalearthdata.com/) (`ne_50m_land`, `ne_50m_antarctic_ice_shelves_polys`), dominio público. [Términos de uso](https://www.naturalearthdata.com/about/terms-of-use/).
- **Base Orcadas:** coordenadas de [Armada Argentina · bases permanentes](https://www.argentina.gob.ar/armada/antartida/bases-permanentes) e historia y ubicación de [Cancillería Argentina](https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/orcadas).
- **Tipografías:** Fraunces, Atkinson Hyperlegible, Caveat, DM Sans y Libre Caslon Display (todas bajo licencia SIL Open Font License 1.1 vía `@fontsource`).
- **Contenido científico:** provisional y en proceso de validación por el equipo (`[Contenido provisional]`, `[Fuente a definir]`).

- **Expedición Océano (#8):** textos propios y breves, con la fuente de cada parada y de cada flecha de la red alimentaria. Catálogo completo, alcance de cada estudio y qué se leyó completo o solo en su resumen en [`docs/expediciones/oceano-fuentes.md`](docs/expediciones/oceano-fuentes.md). No se copian figuras ni imágenes de las publicaciones; todos los animales son modelos voxel propios.
  - Fecha de consulta: 14 de noviembre de 2026.
- **Expedición Desde Ushuaia (#4):** cada afirmación lleva su código de fuente. Prioridad pedida por el equipo: UNTDF, otras universidades argentinas, organismos oficiales e internacionales. Catálogo completo en [`docs/expediciones/desde-ushuaia-fuentes.md`](docs/expediciones/desde-ushuaia-fuentes.md).
  - Fecha de consulta: 11 de noviembre de 2026, salvo las fuentes que indican otra fecha.
- **Expedición Fósiles (#7):** testimonio, publicaciones científicas y archivo fotográfico de E. B. Olivero. Catálogo, créditos y permisos en [`docs/expediciones/fosiles-fuentes.md`](docs/expediciones/fosiles-fuentes.md).
  - Fecha de consulta: 13 de noviembre de 2026.
- **Expedición Poncho (#9):** el libro sobre Poncho, una nota de la Fundación Marambio y fuentes oficiales para fechas y lugares. Cada dato del libro lleva la página del PDF. La licencia de las fotos sigue pendiente. Catálogo en [`docs/expediciones/poncho-fuentes.md`](docs/expediciones/poncho-fuentes.md).
  - Fechas de consulta: 11 y 12 de noviembre de 2026.

## Declaración de uso de IA

Usamos herramientas de inteligencia artificial durante el desarrollo, lo declaramos como piden las bases de la hackatón. Nos ayudaron a planificar, programar, probar, redactar la documentación y buscar fuentes. Las principales fueron Claude Code, Claude Design, Codex y los agentes de Antigravity (Gemini).

El equipo definió el problema, las ideas y cada decisión del producto, y revisó todo lo que se sumó al proyecto. Cada fuente nueva la confirma una persona del equipo en la revisión de su PR. Ningún texto ni imagen generados por IA se presentan como dato real.
