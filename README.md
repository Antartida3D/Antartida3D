# Antártida por descubrir

Equipo **DOT ENV**, hackatón SoberaníaTech (Ushuaia, 2026), Eje 2: Antártida, Ciencia y Conocimiento Abierto.

*Antártida por descubrir* es una plataforma interactiva orientada a la divulgación y educación sobre el continente antártico, combinando cartografía interactiva y expediciones guiadas.

## Integrantes

- `[completar]`

## Aplicación

**`apps/dibujado`** (puerto 5103): mapa dibujado estilo acuarela con relieve 3D (el mapa 2D está deshabilitado y solo aparece sin WebGL o si falla el 3D, [DEC-227](docs/decisiones/DEC-227-mapa-2d-deshabilitado.md)), viaje Desde Ushuaia y expedición Estación Orcadas («¿Cuánto cambió el clima de la isla Laurie en 120 años?»). Las demás expediciones se presentan como ampliaciones previstas o próximas. La interfaz ofrece navegación por teclado y alternativas al mapa 3D.

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

## Requisitos y uso

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

## Declaración de uso de IA

En cumplimiento con las bases de la hackatón, se declara el uso de herramientas de inteligencia artificial en el desarrollo de los prototipos:

- **Botones de zoom en sus límites (#237):**
  > Implementación y pruebas con asistencia de Codex, a partir del pedido del usuario de ocultar «+» al máximo acercamiento y «−» al máximo alejamiento. Los botones conservan su espacio, reaparecen al salir del límite y trasladan el foco si corresponde. El comportamiento cubre el relieve 3D y el respaldo 2D; se documenta en [DEC-237](docs/decisiones/DEC-237-botones-zoom.md). No se agregaron datos ni fuentes.
- **Sistema visual cartográfico y migración local de la UI:**
  > Orquestación y revisión de root; Codex Luna High implementó el lenguaje visual, Codex Luna XHigh realizó la interacción y las pruebas, y Codex Luna Medium mantiene la documentación y la evidencia. La dirección parte de las referencias aportadas por el usuario: composición cartográfica ocre de la primera y soporte claro de la segunda, refinada hasta el Pergamino claro aprobado en la ficha «Océano». El sistema se documentó en [DESIGN.md](DESIGN.md), con el formato de Google Labs solicitado. Se reutilizan las costas de Natural Earth, las fuentes tipográficas y la textura de papel del proyecto; la rosa y la retícula son decorativas. La migración se entrega en la rama `202-ui-pergamino-claro` (issue #202), con la ficha aprobada versionada. La E2E global terminó con 366 casos: 322 pasaron, 44 se omitieron y no hubo fallos. La evidencia visual revisada sigue siendo acotada a los estados documentados.
- **Pulido general: bienvenida, «Desde Ushuaia» y toques en el celular (#190):**
  > Diagnóstico, arreglo y pruebas (unitarias y e2e) con Codex, con revisión del equipo. No se agregaron datos ni fuentes.
- **Expedición Poncho (#9, #146):**
  > Planificación, implementación de los dioramas por etapas, integración de las fotos, pruebas y revisión con capturas, con Codex, bajo revisión del equipo. Las escenas y los modelos son ilustraciones, no registros; las fuentes y derechos de las fotos se documentan en `docs/expediciones/poncho-fuentes.md`.
- **Botón «atrás» del navegador (#185):**
  > Análisis, implementación, pruebas E2E y registro de la decisión con asistencia de Codex, bajo revisión del equipo. No se agregaron datos ni fuentes.
- **Control de documentación por PR (#109):**
  > Diseño del control, implementación, pruebas y documentación con asistencia de Codex, a partir de la aprobación del usuario. La revisión del PR y la activación del requisito obligatorio en GitHub quedan pendientes de su entrega.
- **Reclamos territoriales antárticos (#108):**
  > Investigación, implementación y pruebas con Codex. Seis banderas nacionales modeladas e inspeccionadas en Blender mediante MCP; se reutiliza la bandera argentina existente. Los modelos son ilustraciones de bloques, no reproducciones normativas de símbolos oficiales. Banderas editables en [`claim-flags.blend`](docs/diseno/modelos/claim-flags.blend) y generador [`build-claim-flags.py`](packages/react-ui/scripts/build-claim-flags.py). Las superficies siguen el relieve Bedmap3 existente (CC BY 4.0) y se extienden sobre el mar según meridianos documentados, conservando las superposiciones. Los bordes punteados distinguen los reclamos sin añadir altura ni paredes. No se incorporaron imágenes ni modelos de terceros.
  > Acceso desde la ficha del Polo Sur (#128): implementación y pruebas con Claude Code (modelo Claude Opus 5.5).
- **Bandera argentina en Malvinas (#97):**
  > Modelado e inspección en Blender mediante MCP, integración y verificaciones con Codex. Asta con soporte horizontal y bandera desplegada, sin animación. Por pedido del usuario, mantiene un tamaño fijo en el mundo tanto en 2D como en 3D, sin compensar el zoom. Es un símbolo ilustrativo: su ubicación y tamaño no representan un mástil real. Usa la cartografía existente; no agrega datos históricos ni recursos de terceros. Modelo editable en [`malvinas-flag.blend`](docs/diseno/modelos/malvinas-flag.blend); script de construcción y exportación en [`build-malvinas-flag.py`](packages/react-ui/scripts/build-malvinas-flag.py).
- **App dibujada:**
  > Como exigen las bases de la hackatón: se dibujo un boceto con todas las posibles ideas y luego **el diseño se generó con Claude Design** (prototipo en `docs/diseno/design/Main.dc.html`) y **el código de este repositorio se escribió con Claude Code**, con multiples revisiones del equipo.
- **Pantalla de carga cartográfica (#202):**
  > Rediseño del contrato de carga, pruebas E2E y documentación con asistencia de Codex, con issue #202 asignado a GiulianoPoeta99. La entrega conserva el loader compartido para 2D/3D, la salida a 2D y la dirección Pergamino claro con paneles de 13 px y botones rectangulares de 9 px. La evidencia automatizada registrada reúne 1.356 pruebas (`19` documentales, `650` de `core` y `687` de `react-ui`), además de `pnpm typecheck` y `pnpm build` sin errores. La E2E global terminó con 366 casos: 322 pasaron, 44 se omitieron y no hubo fallos.
- **Prototipo atlas (descartado, ya no está en el repositorio; se recupera en el commit `2ab6f80`):**
  > Interfaz y código de este prototipo desarrollados con Codex a partir de la revisión de los dos proyectos y del borrador provisto por el equipo.
- **Expedición Estación Orcadas:**
  > Planificación, arquitectura, revisión y verificación de fuentes con Claude Code (modelo Claude Fable 5.2); implementación delegada a agentes de Antigravity (Gemini 4 Argon y Gemini 3.8 Flash) bajo revisión; búsqueda inicial de fuentes con Gemini 3.8 Flash, con cada fuente publicada abierta y confirmada después por el orquestador (Claude Code); la confirmación humana de cada fuente se hace en la revisión del PR; ninguna imagen ni texto generado se presenta como dato.
- **Pulido de la expedición Estación Orcadas (#53):**
  > Auditoría, plan, revisión, verificación de fuentes y pulido visual con Claude Code (modelo Claude Opus 5.5); parte de la implementación delegada a Antigravity (Gemini 3.8 Flash) bajo revisión. Cada decisión de producto (cuatro capítulos, escenario de frente, selección de edificios) la aprobó quien lleva el issue. Las plantas de los edificios salen de OpenStreetMap (ODbL); ninguna imagen generada se presenta como dato.
- **Recorrido guiado de la expedición Estación Orcadas (#61):**
  > Plan, decisiones de diseño, revisión, verificación con capturas y parte de la implementación con Claude Code (modelo Claude Opus 5.5); implementación de los pasos delegada a Antigravity (Gemini 4 Hydrogen) bajo revisión. Cada frase de parada sale de una ficha con fuente verificada; no se agregaron datos nuevos.
- **Helipuerto y helicóptero en la expedición Estación Orcadas (#68):**
  > Plan, búsqueda y verificación de fuentes, revisión de cada paso, capturas y ajustes con Claude Code (modelo Claude Opus 5.5); implementación de los pasos delegada a Antigravity (Gemini 4 Hydrogen) bajo revisión. El helipuerto sale de OpenStreetMap (ODbL); la ficha del relevo en helicóptero cita a la Armada Argentina (15 dic 2025) y a COMNAP (2017). El tipo de helicóptero, sus colores, su escala y su vuelo de llegada son ilustrativos.
- **Llegada inmersiva a Orcadas, camino y detalles vivos del diorama (#135):**
  > Orquestación, revisión de cada diff, pruebas e2e y capturas con Claude Code (modelo Claude Opus 5.5); implementación de los pasos (camino, lógica de llegada, selector, viaje en el mapa, llegada y detalles del diorama) delegada a Antigravity (Gemini 4 Hydrogen) bajo revisión. No se agregaron datos ni fuentes: el texto del selector usa la ficha con fuente de la llegada en buque o helicóptero, y el viaje, la llegada, el viento, la nieve, las aves, el observador y los témpanos son reconstrucciones ilustradas.
- **Pruebas e2e de Orcadas y tobogán de los pingüinos (#84):**
  > Diagnóstico de las pruebas, ajuste del tiempo límite y cambio de la ruta de los pingüinos con Claude Code (modelo Claude Sonnet 5.5). No se agregaron datos ni fuentes; el movimiento de los pingüinos es una reconstrucción ilustrada.
- **Prueba e2e del reloj del mar 3D (#41):**
  > Diagnóstico y arreglo de la prueba con asistencia de IA, con revisión del equipo. Solo cambia la prueba; no se agregaron datos ni fuentes.
- **Resto del hemisferio sur en el mapa 3D (#42):**
  > Planificación, revisión y ajustes visuales con Claude Code (modelo Claude Opus 5.5); implementación de partes delegada a Antigravity (Gemini 3.8 Flash) bajo revisión. Las siluetas salen de Natural Earth y su color de Natural Earth II (ambos de dominio público); son contexto geográfico, no datos.
- **La lista de puntos tapa los cartelitos del mapa (#48):**
  > Diagnóstico, arreglo y prueba e2e con asistencia de IA, con revisión del equipo. No se agregaron datos ni fuentes.
- **Fichas verificadas y modelos de los puntos «Próximamente» y «Ampliación prevista» (#58):**
  > Plan, verificación de cada cita contra su fuente, redacción final de las fichas, diseño de los modelos low-poly apoyados sobre el relieve, la toma cercana de cada punto, animaciones y revisión con Claude Code (modelo Claude Opus 5.5). La búsqueda de fuentes y un primer borrador de la interfaz y de los modelos se delegaron a Antigravity (Gemini 4 Hydrogen); los modelos se rehicieron después en low-poly. La cumbre del Erebus se arma sobre el relieve real de Bedmap3 y toma sus colores; el cráter está exagerado unas 3 veces para que se vea. Cada oración de las fichas tiene su cita textual en `docs/puntos-proximamente-fuentes.md`. Los modelos y sus movimientos (humo y bombas del Erebus, desprendimiento en Thwaites, banderas) son ilustraciones: no están a escala y su ritmo está acelerado.
- **Thwaites sigue la costa del mapa y aurora de Belgrano II (#117):**
  > Plan, diagnóstico con raycast desde la página, revisión, correcciones del acantilado y capturas con Claude Code (modelo Claude Opus 5.5); implementación delegada a Antigravity (Gemini 4 Hydrogen) bajo revisión. El frente de Thwaites se traza sobre la máscara de costa de Bedmap3 que ya usa el mapa; su altura, sus grietas y sus témpanos son ilustrativos. La aurora se sacó del mapa y queda en la ficha con su cita del Ejército Argentino.
- **Base Orcadas en low-poly (#116):**
  > Plan, revisión de cada grupo, correcciones (muros de piedra seca de Omond, sol de la bandera, apoyo de piedras y nieve sobre el terreno, fuente única de los helpers del agua de los témpanos) y capturas con Claude Code (modelo Claude Opus 5.5); modelado de los edificios, vehículos, hielo, animales y sitio del mapa delegado a Antigravity (Gemini 4 Hydrogen) en cuatro agentes en paralelo, bajo revisión. Mismas ubicaciones, escalas y animaciones que los modelos de bloques. Casa Omond se dibuja como ruina sin techo según Cool Antarctica («Now a roofless ruin», consultada el 14 nov 2026). Los modelos son ilustraciones, no a escala.
- **Panel de inicio de Orcadas, puerta del abrigo y gestos del diorama (#125):**
  > Plan, revisión de cada diff, correcciones y capturas con Claude Code (modelo Claude Opus 5.5); implementación del panel, de la puerta con los termómetros y de los gestos delegada a Antigravity (Gemini 4 Hydrogen) en tres agentes en paralelo, bajo revisión. El panel muestra el modelo ilustrado de la base, la pregunta guía y tres datos reales ya publicados en la expedición, con sus fuentes; no suma datos nuevos. En el mismo issue, Claude Code pasó las fichas de los puntos al panel arrastrable para que se cierren deslizando hacia abajo. Los cuatro termómetros de 1903 (seco, húmedo, de máxima y de mínima) se apoyan en Mossman (1907); su forma y ubicación dentro del abrigo son ilustrativas.
- **Base Marambio en low-poly (#74):**
  > Plan, búsqueda de fuentes, modelado del C-130, modelos de la base, escena y pruebas con Claude Code (modelo Claude Fable 5.2). El agente abrió y comprobó cada fuente el 14 de noviembre de 2026; la revisión humana de las fuentes queda pendiente para el PR. Las plantas, los nombres y los colores de los edificios salen de OpenStreetMap (ODbL). El diorama es una reconstrucción ilustrada, no a escala: posiciones acercadas, un tramo de la pista, y torre de control, alturas, techos y pintura del avión tomados de fotos de referencia que no se incrustan.
- **Base Marambio: Irízar para viajar a Orcadas, meses y blizzard (#160):**
  > Plan, búsqueda y verificación de las fuentes del clima, escena, tira de meses, blizzard y pruebas con Claude Code (modelo Claude Opus 5.5). Los datos de ventisca y temperatura salen de las normales 1991-2020 del Servicio Meteorológico Nacional: el agente leyó el PDF y cotejó las filas; la revisión humana queda pendiente para el PR. La nieve que vuela, su dirección y el lugar del Irízar son ilustrativos y la interfaz lo dice.
- **Documento de tecnologías (#82):**
  > Redactado con asistencia de IA a partir del código y la documentación del repositorio, con revisión del equipo. No agrega datos nuevos.
- **Bordes del mapa 3D, resto del mundo hasta 60° N y gestos de la cámara (#46):**
  > Planificación, implementación y pruebas con asistencia de IA, con revisión del equipo. Las siluetas salen de Natural Earth y su color de Natural Earth II (ambos de dominio público); son contexto geográfico, no datos.
- **Expedición «Desde Ushuaia»: turbulencia del Hércules, llegada a la Base Marambio y traslado en helicóptero (#46):**
  > Planificación, implementación, pruebas y verificación con capturas con asistencia de IA, con revisión del equipo. El traslado en helicóptero cita a la Armada Argentina (30 dic 2025). El lugar donde espera el buque, el recorrido del helicóptero y su tamaño son ilustrativos, y la interfaz lo dice. La turbulencia del avión es un efecto visual, no un dato. El modelo del helicóptero es el de #68.
- **Bienvenida en la primera visita (#115):**
  > Diagnóstico, planificación, implementación, pruebas y verificación con capturas con asistencia de IA, con revisión del equipo. No se agregaron datos ni fuentes.
- **Cámara del viaje con movimiento reducido (#76):**
  > Diagnóstico, arreglo y prueba e2e con asistencia de IA, con revisión del equipo. No se agregaron datos ni fuentes.
- **E2E más rápido en local con GPU, workers y puerto (#87):**
  > Medición, diagnóstico (en Windows `--use-angle=gl-egl` caía a SwiftShader) e implementación con Claude Code (modelo Claude Opus 5.5), con revisión del equipo. Solo cambia cómo se corren las pruebas; no se agregaron datos ni fuentes.
- **Leyenda cerrada en el celular y swipe para cerrarla (#114):**
  > Planificación, implementación, pruebas y verificación con capturas con asistencia de IA, con revisión del equipo. No se agregaron datos ni fuentes.
- **Tope del zoom en el relieve 3D (#127):**
  > Diagnóstico, mediciones en el navegador, implementación, pruebas y capturas con Claude Code (modelo Claude Opus 5.5), con revisión del equipo. Cada valor del tope lo eligió quien lleva el issue. No se agregaron datos ni fuentes.
- **Atajos de zoom del navegador y vistas compactas:**
  > Diagnóstico, implementación y pruebas e2e automatizadas con entrada real en Chrome usando Codex (Luna), revisión de producción con Codex (Astra) sin bloqueos y revisión humana pendiente. En los mapas 2D, 3D y el diorama de Orcadas, Ctrl + y Ctrl - siguen la misma ruta que la rueda normal, centrada en la vista; Ctrl + rueda también sigue la rueda normal y no cambia el zoom óptico de la cámara. Meta, Alt, Ctrl + Meta, Ctrl + Alt y Ctrl 0 pasan al navegador. Los atajos de cámara sin modificadores se conservan. El ajuste de altura compacta no agrega datos ni fuentes.
- **Zoom con un dedo en el celular: doble toque y arrastre del segundo toque (#165):**
  > Implementación, pruebas unitarias y e2e con toques simulados con Claude Code (modelo Claude Opus 5.5), con revisión del equipo. Los umbrales del gesto los propuso el agente y quedan para que los confirme quien lleva el issue ([DEC-165](docs/decisiones/DEC-165-zoom-con-un-dedo.md)). No se agregaron datos ni fuentes.
- **Botones primarios a la derecha (#177):**
  > Relevamiento, implementación, pruebas y capturas en celular y escritorio con Claude Code (modelo Claude Opus 5.5), con revisión del equipo. No se agregaron datos ni fuentes.
- **Expedición Fósiles: pulido, línea de tiempo, nota del hallazgo y migración a low-poly (#7):**
  > Planificación, implementación, pruebas y verificación con capturas con Claude Code (modelo Claude Opus 5.5), a partir de los pedidos de quien lleva el issue. La línea de tiempo usa las edades de la Tabla Cronoestratigráfica Internacional v2026/06 (ICS) y ubica cada hallazgo solo en el período que dan sus fuentes. La nota «El desvío de 1986» resume la entrevista de Infobae y cita textualmente a Eduardo Olivero; cada cita se cotejó con la nota. Los modelos low-poly son ilustraciones: formas y colores interpretados.
- **Fósiles: acceso al paper de Ameghiniana (#300):**
  > Lectura de la página del artículo y de la nota de derechos de la revista, y aclaración en la fuente, con Claude Code (modelo Claude Opus 5.5), a pedido de quien lleva el issue. No se agregaron datos; la copia aportada por la familia no se publica.
- **Marambio: botón «Ver una ventisca» (#263):**
  > Búsqueda y verificación de las definiciones (Atlas Internacional de Nubes de la OMM en español y programa antártico australiano), redacción, implementación, pruebas y capturas con Claude Code (modelo Claude Opus 5.5), a pedido de quien lleva el issue. Los números salen de las normales del SMN ya cotejadas en #160; la ventisca de la escena es una simulación y lo dice.
- **Escena de Testigos de hielo (#288):**
  > Escena, pruebas y revisión con capturas con Claude Code (modelo Claude Opus 5.5), a pedido de quien lleva el issue. El campamento de perforación del modelo del mapa junto a un corte del hielo con sus capas, burbujas de aire y el pozo hasta la roca; sus tres puntos usan las oraciones ya verificadas de la ficha, sin datos ni fuentes nuevos. Es una reconstrucción ilustrada que no está a escala y muestra en un solo corte dos perforaciones de lugares distintos; la interfaz lo dice.
- **Flecha de atrás común en las expediciones (#301):**
  > Relevamiento, implementación, pruebas (unitarias y e2e) y registro de la decisión con Claude Code (modelo Claude Opus 5.5), a pedido de quien lleva el issue, que eligió el diseño con capturas. No se agregaron datos ni fuentes.
- **Orca low-poly: mancha del ojo y aleta dorsal (#312):**
  > Relevamiento de dónde se dibuja la orca, cambios en el modelo, pruebas y revisión con capturas con Claude Code (modelo Claude Opus 5.5), a pedido de quien lleva el issue. Es una ilustración: la forma de la aleta y de la mancha están interpretadas, sin medidas reales. No se agregaron datos ni fuentes.
- **Escena de Belgrano II (#287):**
  > Escena, pruebas y revisión con capturas con Claude Code (modelo Claude Opus 5.5), a pedido de quien lleva el issue. El nunatak y la base del modelo del mapa, con la roca más alta para que se lea sobre el hielo y su bandera; sus cuatro puntos usan las oraciones ya verificadas de la ficha, sin datos ni fuentes nuevos. Es una reconstrucción ilustrada, de día (la noche polar y las auroras no se dibujan), y la interfaz lo dice.
- **Escena del Polo Sur (#286):**
  > Escena, pruebas y revisión con capturas con Claude Code (modelo Claude Opus 5.5), a pedido de quien lleva el issue. La estación del modelo del mapa sobre la meseta, con sus banderas; sus tres puntos usan las oraciones ya verificadas de la ficha, sin datos ni fuentes nuevos. Es una reconstrucción ilustrada y la interfaz lo dice. El botón de los reclamos territoriales pasó de la ficha al modal de entrada ([DEC-286](docs/decisiones/DEC-286-escena-del-polo-sur.md)).
- **Escena de Vostok (#281):**
  > Escena, pruebas y revisión con capturas con Claude Code (modelo Claude Opus 5.5), a pedido de quien lleva el issue. Un corte de la capa de hielo con las capas del modelo del mapa y la estación en el borde; sus tres puntos usan las oraciones ya verificadas de la ficha, sin datos ni fuentes nuevos. Es una reconstrucción ilustrada que no está a escala, y la interfaz lo dice.
- **Escena común de los puntos de interés y escena de Thwaites (#280):**
  > Plan, generalización de la escena de Cerro Nevado, escena de Thwaites, pruebas y revisión con capturas con Claude Code (modelo Claude Opus 5.5), a pedido de quien lleva el issue. La escena reutiliza el frente del glaciar del mapa y reparte en cuatro puntos las oraciones ya verificadas de la ficha: no se agregaron datos ni fuentes. Es una reconstrucción ilustrada (alturas exageradas, ancho acortado y desprendimientos acelerados) y la interfaz lo dice.
- **Pingüinos de Cerro Nevado (#206):**
  > Búsqueda y lectura completa de las fuentes, verificación de cada cita, redacción de la ficha, modelo low-poly, saludo de la vista previa y pruebas con Claude Code (modelo Claude Opus 5.5), a pedido de quien lleva el issue. Las fuentes son primarias (Coria y Montalti 2000, el Instituto Antártico Argentino y Schiel et al. 2019) y la definición de hielo fijo de NSIDC; lo que solo aparece en notas de prensa o en un resumen de IA quedó como pendiente. El punto abre una escena propia con cuatro puntos para visitar; la escena, el modelo y el saludo son ilustraciones, y cada oración tiene su cita en `docs/puntos-proximamente-fuentes.md`.
- **Fósiles y Océano con la interfaz de las demás expediciones (#209):**
  > Comparación con Orcadas y Marambio, implementación, pruebas y capturas con Claude Code (modelo Claude Opus 5.5), a pedido de quien lleva el issue. Solo cambia la interfaz; no se agregaron datos ni fuentes.
- **Base Marambio: archivo fotográfico (#207):**
  > Selección de fotos, transcripción de carteles, textos alternativos, implementación y pruebas con Claude Code (modelo Claude Opus 5.5), a partir del archivo y las confirmaciones de la familia. Los epígrafes describen solo lo que se ve; el lugar de las fotos sin dato queda pendiente.
- **Expedición Océano (#8):**
  > Lectura y verificación de fuentes, plan, implementación, pruebas y revisión con capturas con Claude Code (modelo Claude Opus 5.5), a partir de la investigación y el encargo preparados por quien lleva el issue. Cada frase y cada flecha de la red cita su fuente con el lugar del estudio; la escena, los tamaños, las profundidades y los tiempos son ilustrativos y la interfaz lo dice. No se agregaron porcentajes de dieta ni simulaciones de población.
- **Mapa 2D deshabilitado (#227):**
  > Relevamiento de los archivos afectados, redacción del issue, implementación, pruebas y documentación con Claude Code (modelo Claude Opus 5.5), a pedido de quien lleva el issue. No se agregaron datos ni fuentes.
- **Componentes de interfaz: una sola definición, primario azul y sin líneas dobles (#234, #231, #232, #233):**
  > Relevamiento de las hojas de estilo, redacción de los issues, implementación, pruebas, capturas y documentación con asistencia de IA, con revisión en pantalla de quien lleva los issues. No se agregaron datos ni fuentes.
- **Pines que se estiraban al mover el mapa en el celular (#253):**
  > Reproducción a partir de un video, diagnóstico, redacción del issue, arreglo, pruebas, capturas y documentación con asistencia de IA, a pedido de quien lleva el issue. No se agregaron datos ni fuentes.
- **Aviso cuando el 3D falla, en vez de página en blanco (#242):**
  > Reproducción del fallo, redacción del issue, implementación, prueba e2e, capturas y documentación con asistencia de IA, a pedido de quien lleva el issue. No se agregaron datos ni fuentes.
- **Guía de primera visita de tres pasos (#256):**
  > Diseño de la guía con Claude Design; plan, implementación, pruebas e2e, capturas y documentación con Claude Code (modelo Claude Sonnet 5.5), con revisión de quien lleva el issue. Los textos salen del diseño y se verificaron contra el comportamiento de la aplicación; el del tercer paso (el botón naranja) lo pidió quien lleva el issue y afirma solo lo que hacen `nextExpedition` y «Continuar». No se agregaron datos ni fuentes.
- **Pantalla de carga con el mapa dibujándose (#258):**
  > Diseño de la pantalla con Claude Design; plan, script del póster, implementación, pruebas, capturas y documentación con Claude Code (modelo Claude Sonnet 5.5), con revisión de quien lleva el issue. El póster es una imagen de la propia aplicación, no un dato. El «Dato real» cita sin reescribir la primera oración de una ficha que ya tiene fuentes verificadas y nombra todas sus fuentes; no se agregaron datos ni fuentes nuevas.
- **Pantalla de carga cartográfica en azul con dato real y acciones de primera visita (#276):**
  > Previsualizaciones, plan, restauración de la ilustración SVG en paleta azul, integración con «Dato real» y «Mapa listo», limpieza del póster 3D, pruebas y documentación con asistencia de IA, con aprobación visual de quien lleva el issue. No se agregaron datos ni fuentes nuevas.
- **Océano: pasos, botones y modelos del mar (#283):**
  > Revisión paso a paso con quien lleva el issue; implementación, modelos low-poly de la jorobada, la minke y la foca leopardo, pruebas, capturas y documentación con asistencia de IA. La aleta de la minke antártica se verificó en la ficha de NOAA Fisheries. Los modelos y las escenas son ilustraciones; no se agregaron datos nuevos.
