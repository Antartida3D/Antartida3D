# Fósiles: primer boceto navegable (#7)

Fecha: 13/11/2026. Rama: `7-expedicion-fosiles-boceto`.

## Alcance acordado

Dos protagonistas: amonites gigantes y el dinosaurio descubierto por Eduardo Olivero y su equipo en 1986. El relato de campo enlaza las evidencias con la investigación y una reconstrucción de ambientes. La visita a la Base Marambio queda separada.

Es una primera versión para revisar con Eduardo: no se da por cerrada la especie de los amonites elegidos, sus medidas ni la historia de su hallazgo. No se afirma que los gigantes seleccionados sean los amonites de las campañas previas a 1986 mencionados en la entrevista.

## Recorrido

Segunda iteración (14/11/2026): cuatro protagonistas, ordenados por la edad de los fósiles. Seis capítulos, catorce paradas:

1. Llegar: campamento y presentación de Eduardo.
2. Amonites: limpiar la espiral en la roca y verlos vivos en el mar del Cretácico.
3. Plesiosaurio: seguir la columna del esqueleto de la isla Vega (1989) y verlo nadar.
4. Dinosaurio: el desvío de 1986, el diente con forma de hoja (no cónico como el de un reptil marino), la extracción en el suelo congelado y la comparación entre restos y animal.
5. Estrellas: medir una estrella de mar del Eoceno de Bill Hill (isla Marambio) y ver su fondo marino.
6. El pasado: alternar tres ambientes (mar cretácico, bosque cretácico, fondo eoceno) y cerrar con el cuaderno de lo recorrido.

Un botón principal avanza; el botón anterior vuelve una parada. Los capítulos se pueden elegir libremente. Las interacciones son opcionales y no impiden seguir. La finalización se registra al pulsar «Terminar expedición»; salir por «Mapa» no completa el recorrido.

## Estilo y reutilización

Modelos hechos de cajas, colores planos y sombreado por cara con `buildBoxGeometry` y `vehicleMaterial`. Todos los modelos nuevos se registran en `SCENE_MODELS` (vía `FOSSIL_MODELS`) y pasan la prueba de mínimo de detalle.

La escena sigue a Orcadas: cielo con el shader `stationSky`, trazo de tinta (`InkEffect`) cuando el rendimiento lo permite, `PerformanceMonitor`, reloj de escena con `frameloop="demand"` y figuras articuladas cuyas poses son funciones puras del tiempo (`fossilPoses.ts`, con pruebas). Cuatro mundos:

- **Campo actual** (paradas en el terreno): planicie de grava oscura, mesetas con estratos y techo nevado, mar con témpanos e islas de techo plano al fondo, carpas piramidales naranjas, mástil, cajones, trineo y un tronco fósil. Colores tomados de las fotos de campaña del archivo familiar. Geólogos que caminan, golpean con el martillo, trabajan sentados o señalan. Nieve con viento. El cierre muestra el campamento al atardecer con los cuatro hallazgos sobre cajones.
- **Mar del Cretácico**: cúpula y niebla de agua, rayos de luz, burbujas, bivalvos inocerámidos, erizos, lirios de mar que se mecen, amonites que mueven los brazos y un plesiosaurio que nada con aletas en contrafase y cuello ondulante.
- **Fondo del Eoceno**: pared de roca de un valle inundado, briozoos, braquiópodos, erizos, lirios de mar, el quitón y estrellas que se desplazan muy despacio.
- **Bosque del Cretácico**: coníferas, cycadas, helechos y árboles de hoja ancha, hojas y polen que caen, y Antarctopelta que camina o ramonea.

Las interacciones se animan: el sedimento sale volando en cada pasada, una luz recorre la columna del plesiosaurio de la cabeza a la cola, el diente late con un brillo, los huesos se juntan y aparece el animal, y una barra mide el brazo de la estrella contra una escala en centímetros. Con movimiento reducido no hay animación continua ni vuelos de cámara: cada figura queda en una pose fija y cada interacción muestra su resultado directamente.

El terreno (`fossilTerrain.ts`) es una columna de bloques por celda; donde un vecino es más bajo, el costado se parte en estratos para que los acantilados muestren sus capas. Es un paisaje ilustrativo, no un relevamiento de ningún sitio.

La interfaz es la misma de Orcadas y Marambio (#209): cabecera flotante con «Mapa», la pregunta y «Fuentes»; capítulos numerados; panel flotante en escritorio y BottomSheet con peek en el celular; pie con la flecha de atrás y «Siguiente» a todo el ancho que queda (DEC-301), y el rótulo «Reconstrucción ilustrativa» con `KindChip`. En escritorio la escena ocupa toda la pantalla y la vista se corre a la parte libre a la izquierda del panel (`sceneFrame.tsx`); en el celular queda entre la cabecera y la hoja. El rótulo de lugar lleva fondo de papel para leerse sobre la grava oscura.

Los fósiles se muestran como modelos de bloques y no como reproducciones anatómicas exactas. El dinosaurio no incorpora un arma caudal específica; el plesiosaurio es una interpretación genérica de cuello largo. Su aspecto deberá revisarse con material científico actualizado y con Eduardo.

Sin WebGL, o ante pérdida del contexto, el recorrido usa fotografías y conserva los controles, las fuentes y la descripción textual de las observaciones. Las interacciones siguen siendo operables con teclado.

## Capas y archivos compartidos

- Contenido y fuentes: `packages/core/src/content/fossils.ts`.
- Estado y navegación: `packages/core/src/fossils.ts`.
- Interfaz, escena y modelos: `packages/react-ui/src/fossils/` (`FossilScene.tsx`, `models.ts`, `fossilPoses.ts`, `fossilTerrain.ts`).
- Pruebas de poses, terreno y registro de modelos: `packages/react-ui/test/fossils.test.ts`.
- Estilo: `packages/core/src/styles/fossils.css`.
- Integración compartida: `AntarcticaApp.tsx`, `content/points.ts`, exports, índice de CSS y registro de modelos.
- Entrada directa local: `/?expedicion=fosiles`.

El marcador está en una posición regional aproximada (x=187, y=297), al oeste del antiguo punto de Marambio. No representa la coordenada del yacimiento. Su etiqueta dice «ubicación regional». Los sitios de los amonites elegidos deberán identificarse antes de fijar una ubicación más precisa. La ruta desde Ushuaia conserva su destino Marambio.

## Material y fuentes

Catálogo en `fosiles-fuentes.md`. Las fotografías son documentales; las escenas son reconstrucciones ilustrativas; la limpieza es una simulación educativa. Fuentes científicas y testimonio se identifican por separado.

La foto de Eduardo que aparece en su presentación con las fechas 1986/2009 tiene un epígrafe de 1988 en CONICET. Para este boceto se usa la versión y el epígrafe de CONICET. Confirmar la cronología con Eduardo.

Los restos de 1989 del plesiosaurio Vegasaurus molyi que aparecen en la presentación y en la nota periodística no se usan como restos del dinosaurio. Tampoco se usa el artículo de poliplacóforos de 2011 como fuente de los amonites.

## Validación prevista

Pruebas del reducer (límites, navegación, visitas únicas, conservación de hallazgos, cambios de ambiente), mínimo de detalle de todos los modelos, tipos y build. E2E en 390 y 1440 px: ambas interacciones, comparación, ambientes, fotografías, cierre y foco de fuentes, registro, salida sin completar, teclado sin WebGL y panel móvil.

El cambio de Fósiles a disponible lleva el total del registro de 2 a 3. Se actualizan las expectativas de conteo y apertura en flow y Orcadas. El test de ruta ahora confirma que el destino Marambio es independiente del punto de Fósiles.

La prueba del marcador 3D de Orcadas distingue grupo / marcador antes del clic. Antes miraba si el marcador seguía visible después del clic y podía intentar abrirlo por segunda vez durante la transición, hasta agotar el tiempo aunque Orcadas ya estuviera abierta. Conserva la comprobación de apertura y agrega la comprobación de foco.

### Resultado de la verificación local

Primera iteración (Codex, 13/11/2026): ver historial de este documento.

Segunda iteración (14/11/2026):

- `pnpm test`: 241 pruebas de core y 172 de react-ui aprobadas (incluye el mínimo de detalle de los 27 modelos de Fósiles).
- `pnpm typecheck` y `pnpm build`: aprobados.
- E2E de Fósiles (6) en 390 y 1440 px: aprobadas. E2E de flujo y mapa 3D: 27 aprobadas, 3 omitidas por el perfil.
- Revisión visual con capturas de las 14 paradas y sus interacciones en 1440×900 y 390×844, sin errores de consola.
- No se volvió a correr la suite E2E completa (Orcadas y océano).

Los cambios quedan locales en la rama del issue, sin publicar ni cerrar el issue.
