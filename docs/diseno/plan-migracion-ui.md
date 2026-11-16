# Análisis e implementación de la UI cartográfica

Fecha: 15 de noviembre de 2026. Este documento conserva el análisis inicial y registra la implementación de la migración entregada en la rama `202-ui-pergamino-claro` (issue #202). La evidencia de la ficha de referencia se distingue de la validación posterior del conjunto. El sistema visual y sus tokens están en [DESIGN.md](../../DESIGN.md).

## 1. Decisión y alcance

La interfaz debe sentirse como un cuaderno de expedición construido con el lenguaje de la cartografía antigua: pergamino claro, tinta marrón neutra, filetes, títulos editoriales, costas y rosas de los vientos. El material del fondo y la composición tienen que transmitir esa identidad antes de leer el contenido.

La primera referencia ocre resultaba demasiado intensa para extenderla a toda la UI y la segunda era demasiado blanca. La propuesta intermedia «Pergamino claro», probada sobre la ficha real «Océano», fue aprobada como dirección vigente: conserva composición, marcos, carta, rosa y tipografías, con centro marfil, textura tenue y sombra suave.

La revisión de dirección visual posterior acepta el redondeo para toda la UI: paneles flotantes con radio de **13 px** y botones rectangulares con radio de **9 px**. Se conservan como excepciones semánticas los círculos y chips que comunican su función, la geometría de gráficos, los separadores y las esquinas de superficies pegadas al borde de la pantalla. La implementación CSS de estos tokens está aplicada en esta entrega; la verificación visual acotada y los 14 casos E2E focalizados de la revisión previa están registrados en la sección 9. La E2E global finalizó con 366 casos: 322 pasaron, 44 se omitieron y no hubo fallos.

| Estado | Qué comprende |
| --- | --- |
| **Elegido** | Pergamino claro: composición de la primera ficha, paleta marfil de la propuesta intermedia, textura tenue, marcos, viñeta, botón delineado y redondeo común 13/9 para paneles flotantes y botones rectangulares. |
| **Implementado localmente** | El sistema de tokens explícitos, incluido el redondeo 13/9, el material cartográfico y la composición Pergamino claro está aplicado al mapa, índice, fichas, Desde Ushuaia y Orcadas. La ficha real «Océano» conserva además su evidencia recortada de referencia. |
| **Verificación** | La sección 9 separa la evidencia visual, la validación automatizada y los 14 casos E2E focalizados de la revisión previa; los 32 casos anteriores quedan como contexto histórico y la corrida global final de 366 casos registra 322 aprobados, 44 omitidos y ningún fallo. |
| **Límites** | Los colores de medición, el mapa rasterizado y las escenas 3D conservan sus funciones y recursos. La revisión visual no constituye una certificación WCAG. |

La extensión del diseño a toda la UI fue autorizada para trabajo local. Las tablas de inventario describen el estado encontrado al iniciar y el cambio previsto; el estado de implementación se registra a continuación. La referencia ocre anterior permanece como histórico rechazado para esta dirección, no como token vigente.

## 2. Preparación del sistema compartido

### Implementación compartida

- [tokens.css](../../packages/core/src/styles/tokens.css) define los tokens explícitos `--chart-*`, textura suave, radios y sombra ya aplicados localmente. La dirección documental añade `rounded.panel: 13px` y `rounded.button: 9px`; la paleta geográfica original conserva sus tokens.
- [cartography.css](../../packages/core/src/styles/cartography.css) aplica el material a las superficies y compone cabecera, índice y selector 2D/3D. Las hojas `painted.css`, `voyage.css` y `orcadas*.css` conservan los layouts y estados específicos, migrados al mismo vocabulario de color.
- [Cartography.tsx](../../packages/react-ui/src/Cartography.tsx) comparte la rosa decorativa entre ficha, cabecera e índice. Los iconos comunes usan `currentColor`.
- [hooks.ts](../../packages/react-ui/src/hooks.ts) y los componentes existentes conservan el comportamiento de foco y cierre que tenía la aplicación antes de esta migración visual. Esta tarea no añade un contrato modal, contención de foco ni aislamiento del fondo con `inert`; las regiones persistentes de Orcadas mantienen su acceso a la escena según el baseline restaurado.
- Los instrumentos conservan colores de medición, escalas y unidades; sus placas y trazos neutros usan papel y tinta del sistema.

### Responsabilidades compartidas

| Pieza | Responsabilidad | Dónde se necesita |
| --- | --- | --- |
| Superficie de papel | Fondo, textura, marco, sombra y variantes de densidad. | Fichas, leyenda, lista, paneles y fuentes. |
| Cabecera editorial | Rótulo, título, subtítulo y cierre opcional. | Fichas, portadas y paneles de expedición. |
| Acciones | Botón principal, secundario, botón de icono y enlace. | Todas las pantallas. |
| Separadores | Filete simple, doble y ornamento opcional. | Jerarquía dentro de paneles. |
| Etiquetas | Disponibilidad, progreso y naturaleza de la información. | Mapa, bitácora, fuentes y expediciones. |
| Ornamentos cartográficos | Viñeta y rosa reutilizables, ocultas a tecnologías de asistencia cuando son decorativas. | Portadas y fichas principales. |

La extracción puede resolverse con clases y componentes pequeños. El material no debe decidir si un panel es modal, qué texto contiene o cómo avanza una expedición. La lógica y los datos permanecen en sus capas actuales. Antes de agregar una pieza, revisar [ui.tsx](../../packages/react-ui/src/ui.tsx), [BottomSheet.tsx](../../packages/react-ui/src/BottomSheet.tsx) y los componentes existentes.

### Estados de interacción

Cada control migrado debe tener una revisión de reposo, hover, foco por teclado, pulsación, selección y deshabilitado cuando corresponda. No todos los elementos necesitan todos esos estados.

- **Botón principal:** la ficha usa papel, borde doble y altura mínima de 48 px; al pasar el puntero cambia a azul profundo con texto claro. Extenderlo conservando una acción principal reconocible.
- **Botón secundario:** menor énfasis, misma familia de tinta y papel. Debe seguir distinguiéndose del texto corriente.
- **Botón de icono:** área táctil generosa; la referencia de cierre mide 44 × 44 px. Mantener nombre accesible aunque el dibujo sea pequeño.
- **Selección y progreso:** combinar color con marca, contorno, texto o posición. Mantener `aria-pressed`, `aria-current` y anuncios de estado existentes.
- **Enlaces a fuentes:** reconocibles como enlaces y legibles sobre el papel. El ornamento no reemplaza su nombre ni su atribución.
- **Carga, error y ausencia de contenido:** reservar espacio, explicar el estado y ofrecer una salida cuando corresponda. No dejar un recuadro vacío como estado final.

## 3. Inventario al iniciar la migración

El inventario inicial de esta migración se tomó de [AntarcticaApp.tsx](../../packages/react-ui/src/AntarcticaApp.tsx): mapa general, viaje Desde Ushuaia sobre el mapa y expedición Orcadas. El `main` actual también contiene Marambio, Poncho, Fósiles y Océano; esas rutas se conservan por integración y no se atribuyen a esta revisión visual. El prototipo histórico no representa por sí solo el inventario completo.

Las prioridades indican dependencias de trabajo: **P0** establece la base; **P1** aplica la base a las superficies principales; **P2** resuelve piezas especializadas. No son estimaciones de duración ni issues creados.

### Base común y mapa

| Área y archivos | Estado observado | Cambio necesario | Prioridad |
| --- | --- | --- | --- |
| [Estilos](../../packages/core/src/styles/index.css): `tokens.css`, `painted.css`, `point-sheet.css` | La ficha nueva convive con colores, radios y botones anteriores. | Extraer material, tinta, tipografía, bordes y estados. Migrar por componente y retirar reglas reemplazadas. | P0 |
| [UI común](../../packages/react-ui/src/ui.tsx) y [hooks](../../packages/react-ui/src/hooks.ts) | Iconos y etiquetas compartidos; algunos colores están fijados en SVG. Se conserva el comportamiento de foco del baseline. | Revisar `currentColor`, semántica de etiquetas y comportamiento modal existente sin introducir una nueva implementación funcional en esta migración visual. | P0 |
| [BottomSheet](../../packages/react-ui/src/BottomSheet.tsx) | Panel arrastrable, tamaños pequeño/ampliado y variante persistente reducida. | Aplicar papel y tirador coherente conservando gesto, alternativa por teclado, scroll y distinción entre región y diálogo. | P0 |
| [MapView](../../packages/react-ui/src/map/MapView.tsx) | Cabecera, ayudas, controles, capas y paneles sobre el mapa. | Componer una cabecera de atlas y agrupar controles con el nuevo material. Ajustar superposiciones y contraste sobre mar y hielo. | P1 |
| [ExplorationLog](../../packages/react-ui/src/map/ExplorationLog.tsx) | Contador y barra de expediciones exploradas. | Dar forma de registro de campo; conservar cantidad, denominador y anuncio de estado. | P1 |
| [Legend](../../packages/react-ui/src/map/Legend.tsx) | Leyenda desplegable con estados, fuentes del relieve y advertencias de ilustración. | Convertirla en clave cartográfica compacta; mantener explicaciones y lectura en celular. | P1 |
| [ViewToggle](../../packages/react-ui/src/map/ViewToggle.tsx), zoom y acciones de `MapView` | Botones y chips de la UI anterior. | Unificar tinta, bordes, foco y selección; conservar nombres explícitos de 2D/3D y alternativas al gesto. | P1 |
| [Markers](../../packages/react-ui/src/map/Markers.tsx) | Marcadores, agrupación y etiquetas al explorar. | Diseñar signos cartográficos distinguibles por forma y texto. Mantener áreas interactivas, estados, agrupación y apertura por teclado/táctil. | P1 |
| [ListView](../../packages/react-ui/src/map/ListView.tsx) | Lista modal agrupada por disponibilidad. | Tratarla como índice de expediciones: títulos, filas, divisores y acciones. Conservar los tres grupos y acceso a puntos sin depender del mapa. | P1 |
| [PointSheet](../../packages/react-ui/src/map/PointSheet.tsx) | Ficha cartográfica con viñeta, rosa y panel arrastrable. | Consolidar sobre primitivas comunes; revisar también fichas de mar, modelos, fuentes largas y todos los títulos. Conservar Escape, gesto y «Volver al mapa» del componente existente, sin introducir un contrato modal nuevo. | P1 |
| Ayudas, avisos y transiciones en `MapView` y `AntarcticaApp` | Mensajes breves y carga diferida de escenas. | Alinear superficies y tipografía; revisar mensajes de carga y fallos, anuncios accesibles y visibilidad mientras cambian las escenas. | P1 |

### Desde Ushuaia

| Área y archivos | Cambio necesario | Comportamiento que debe conservarse | Prioridad |
| --- | --- | --- | --- |
| Selector de transporte en [VoyagePanel](../../packages/react-ui/src/voyage/VoyagePanel.tsx) | Convertir la apertura en una hoja de preparación del viaje; opciones, ficha técnica y acción con jerarquía común. | Selección visible, datos, acceso a fuentes y salida al mapa. | P1 |
| Hitos y preguntas en `VoyagePanel` y [Fact](../../packages/react-ui/src/voyage/Fact.tsx) | Hojas de ruta con numeración, separadores y estados de respuesta consistentes. | Secuencia, respuestas, explicaciones opcionales y referencias numeradas. | P1 |
| Avistajes y bitácora en `VoyagePanel` | Fichas de observación y registro de lo visto; resolver vistos, pendientes y «Sin ver». | Abrir de nuevo un avistaje y distinguir progreso de contenido faltante. | P1 |
| Controles de navegación y avance | Adaptar marco, iconos, selección, pausa e indicaciones a la estética cartográfica. | Pulsación sostenida, avance/retroceso, controles por teclado y recorrido alternativo 2D. | P1 |
| Fuentes del viaje | Hoja de referencias con enlaces, atribución y resaltado de la referencia invocada. | Volver al contexto desde el que se abrió. | P1 |
| [ModelPreview](../../packages/react-ui/src/voyage/ModelPreview.tsx), `VehiclePreview`, `SeaPreview`, `SightingIcon` | Integrar el marco y fondo de la vista previa; revisar armonía de iconos y estados de carga. | Reutilización del renderizador, carga diferida y movimiento reducido. | P2 |

El viaje mantiene su ruta y sus reglas. El rediseño de la UI no exige rehacer vehículos, animales ni animaciones de escena.

### Estación Orcadas

| Área y archivos | Cambio necesario | Comportamiento que debe conservarse | Prioridad |
| --- | --- | --- | --- |
| [OrcadasExpedition](../../packages/react-ui/src/orcadas/OrcadasExpedition.tsx): cabecera y capítulos | Cabecera de cuaderno y navegación numerada coherente con el mapa. | Mapa, Fuentes, capítulo actual, visitados y secuencia Llegar/Observar/Viajar/Responder. | P1 |
| Panel lateral y panel móvil de `OrcadasExpedition` | Material compartido, jerarquía editorial y pie de acciones. Ajustar densidad para dejar visible la escena. | Ocultar/mostrar en escritorio; reducir, ampliar y arrastrar en móvil. | P1 |
| [TourCard](../../packages/react-ui/src/orcadas/TourCard.tsx), [FactList](../../packages/react-ui/src/orcadas/FactList.tsx) | Tarjetas de parada y lectura con títulos, filetes, fuentes y detalles coherentes. | Una frase principal por parada, «Saber más» y navegación guiada. | P1 |
| [Hotspots](../../packages/react-ui/src/orcadas/Hotspots.tsx) y tarjetas de puntos | Signos de exploración y llamadas de papel con contraste sobre la escena. | Objetivo de cámara, nombres, áreas táctiles y regreso al recorrido. | P1 |
| [KindChip](../../packages/react-ui/src/orcadas/KindChip.tsx) y aviso de reconstrucción | Unificar etiquetas con el resto de la UI preservando texto y símbolos. | Dato real, simulación, cálculo y reconstrucción deben seguir siendo distinguibles. | P0/P1 |
| [SourcesPanel](../../packages/react-ui/src/orcadas/SourcesPanel.tsx) | Índice de fuentes con la misma composición y vínculos legibles. | Capítulo, fuente resaltada, atribuciones y retorno al contenido. | P1 |
| [MonthStrip](../../packages/react-ui/src/orcadas/MonthStrip.tsx), [SunArc](../../packages/react-ui/src/orcadas/time/SunArc.tsx), [FaunaIcons](../../packages/react-ui/src/orcadas/time/FaunaIcons.tsx) | Calendario y diagramas integrados al cuaderno; revisar color, trazos y etiquetas. | Mes seleccionado, despliegue móvil, unidades y distinción entre cálculo y simulación. | P2 |
| [Observation](../../packages/react-ui/src/orcadas/observation/Observation.tsx), `Thermometer`, `Barometer`, `WindMast`, `CloudPicker`, `Notebook` | Instrumentos y registro con marcos y escalas legibles. El papel puede rodear la medición sin ensuciarla. | Lecturas, unidades, controles, selección y rótulos de simulación. | P2 |
| [Journey](../../packages/react-ui/src/orcadas/Journey.tsx), [CenturySvg](../../packages/react-ui/src/orcadas/century/CenturySvg.tsx) | Cronología, ejes, leyenda y marco del gráfico consistentes con la UI. | Fechas, datos, tendencias, distinción de series y acceso al significado del gráfico. | P2 |
| [Answer](../../packages/react-ui/src/orcadas/Answer.tsx) | Cierre como hoja de conclusiones: comparación, progreso y sello con jerarquía clara. | Diferenciar lo completado de lo faltante; fuentes, unidades y referencia de comparación. | P2 |
| [StationFallback](../../packages/react-ui/src/orcadas/StationFallback.tsx) | Aplicar el mismo sistema a la alternativa sin WebGL. | Continuidad del recorrido y acceso a información e interacción esenciales. | P1/P2 |

## 4. Relación con el mapa y las escenas

El papel pertenece a los soportes de lectura y navegación. La aplicación también contiene geografía, relieve, agua, hielo, instrumentos y gráficos. Su coherencia se debe revisar en conjunto, conservando la información que distingue cada representación.

| Capa | Archivos de referencia | Trabajo previsto |
| --- | --- | --- |
| Mapa 2D | [Map2DLayer](../../packages/react-ui/src/map/Map2DLayer.tsx), [map.ts](../../packages/core/src/svg/map.ts), [land.ts](../../packages/core/src/svg/land.ts), [paint.ts](../../packages/core/src/svg/paint.ts) | Revisar tinta de costas, retícula, nombres, rutas y relación con las superficies nuevas. Si cambia el mapa pintado, regenerar sus recursos en las resoluciones usadas; cambiar CSS no modifica una imagen ya generada. |
| Relieve y océano 3D | [Map3DLayer](../../packages/react-ui/src/map3d/Map3DLayer.tsx), `Ocean`, `Terrain`, `Fuegia`, `SouthernLands`, `InkEffect` y sus shaders | Comparar legibilidad y armonía con la UI sobre mar, costa y hielo. Cualquier ajuste de materiales requiere capturas y revisión de rendimiento propias. |
| Diorama y vistas previas | [StationScene](../../packages/react-ui/src/orcadas/StationScene.tsx), modelos de `orcadas/` y `voyage/` | Revisar encuadre, contraste de los controles y espacio ocupado por paneles. El diseño del papel no redefine los modelos. |
| Gráficos e instrumentos | `CenturySvg`, `Answer`, `SunArc` e instrumentos de observación | Conservar colores funcionales donde ayudan a distinguir datos, además de formas, etiquetas y trazos. Ajustar fondos y tinta sin alterar escalas ni valores. |

La decisión anterior de que el mar 3D llegue al borde de la vista sigue registrada en [decisiones.md](../../docs/decisiones.md). No se ha aprobado reemplazarlo por un fondo de pergamino ni aplicar un filtro sepia a toda la escena.

El estilo de los modelos sigue definido en [estilo-voxel.md](../../docs/diseno/estilo-voxel.md). Una posible migración a low-poly sería otra decisión, con alcance y pruebas propios. La aprobación de esta UI no resuelve esa cuestión.

## 5. Adaptación a pantallas

La ficha de referencia mide 456 px de ancho en escritorio, con margen de 24 px. En móvil ocupa el ancho disponible menos 12 px a cada lado. Su altura se limita al viewport y el contenido puede desplazarse dentro. La viñeta se reduce en pantallas de hasta 380 px.

Estos valores son una base para fichas, no para toda superficie. Una leyenda puede ser compacta; una lista o un gráfico necesitan más espacio. El panel de Orcadas debe conservar los tamaños que permiten explorar la escena.

Criterios de adaptación:

1. Revisar ancho **y altura** disponibles. Se retiró el mínimo de 600 px del contenedor del mapa: ahora sigue la altura disponible del viewport. La ficha mantiene sus límites y el panel de Orcadas sus variantes compactas.
2. Revisar los puntos de cambio de layout: la ficha usa 820 px y el hook general usa 900 px o una pantalla horizontal baja. Definirlos según el contenido, evitando comportamientos accidentales entre ambos.
3. Integrar zonas seguras del dispositivo y barras del navegador. Verificar cierre y acciones con poco alto disponible.
4. Mantener texto ampliado, títulos largos, enlaces extensos y fuentes múltiples sin desbordamiento horizontal de la interfaz.
5. Evitar que cabecera, controles, leyenda y panel compitan por el mismo espacio. La acción principal y el punto explorado deben poder localizarse.
6. En pantallas pequeñas, reducir primero el ornamento y los espacios secundarios; conservar información, controles y tamaño de lectura.

## 6. Accesibilidad y contenido

El aspecto aprobado todavía necesita una auditoría de accesibilidad completa. La textura y los degradados obligan a comprobar el contraste sobre el fondo efectivo, especialmente en textos pequeños.

- **Texto:** objetivo de al menos 4,5:1 para texto normal y 3:1 para texto grande según la definición del criterio; no asumir que todo título o texto en cursiva califica como grande. Referencia: [W3C, contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), consultada el 14 de noviembre de 2026.
- **Controles y gráficos:** la información visual necesaria para identificar controles, estados o partes relevantes de un gráfico debe alcanzar 3:1 frente a colores adyacentes, según las condiciones del criterio. Los filetes puramente decorativos tienen otra función. Referencia: [W3C, contraste no textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), consultada el 14 de noviembre de 2026.
- **Teclado y foco:** conservar apertura, cierre, orden lógico y foco visible del baseline. No añadir contención de foco ni fondo inerte como parte del rediseño; conservarlos únicamente donde ya estén implementados. Los paneles persistentes son regiones y no deben encerrar al usuario. Referencia: [W3C, patrón de diálogo modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), consultada el 14 de noviembre de 2026.
- **Área de interacción:** adoptar 44 × 44 px como objetivo interno para controles táctiles pequeños y conservar los 48 px del botón principal de referencia. Es un criterio de este diseño, no una afirmación de que WCAG exige ese tamaño en todos los casos.
- **Movimiento:** respetar movimiento reducido en UI, cámaras y vistas previas. El papel, el grano y los ornamentos no necesitan animación continua.
- **Semántica:** mantener nombres accesibles, encabezados, estados y avisos. Ocultar a tecnologías de asistencia solo los adornos; una visualización informativa necesita nombre y explicación.
- **Contenido:** conservar fuentes, autor u organismo, fecha de consulta, unidades y avisos provisionales. La disponibilidad de una expedición se distingue de la naturaleza de sus datos. Ninguna estética de documento antiguo convierte una simulación en un registro histórico.

Estas condiciones guían la implementación. El documento no certifica conformidad WCAG de la versión actual.

## 7. Implementación y rendimiento

Los estilos compartidos pertenecen a `packages/core/src/styles`; el comportamiento y la composición de React, a `packages/react-ui/src`. La app de entrada carga el sistema común. Mantener datos, cálculos y reglas de navegación separados de la apariencia.

La migración debe reemplazar reglas a medida que adopta el sistema. Evitar una segunda capa permanente de excepciones para cada botón de `painted.css`, `voyage.css` y las hojas `orcadas*.css`. Tampoco extraer toda la estructura interna de una expedición a un componente genérico solo porque comparte el fondo.

Reutilizar la textura de papel existente. Evitar nuevas dependencias para reproducir marcos o separadores que se resuelven con CSS/SVG. Mantener la generación previa de imágenes del mapa y las cargas diferidas de escenas y modelos. No agregar filtros costosos a toda la pantalla ni nuevos lienzos por ficha.

La viñeta usa trazados geográficos reales y hoy se monta en cada `PointSheet`. Si se extiende a listas o múltiples tarjetas simultáneas, revisar peso de SVG, cantidad de nodos y necesidad de una versión compartida o prerenderizada. Las capturas documentales de `docs/diseno/referencias/` no deben entrar al bundle de la aplicación.

## 8. Etapas de implementación

| Etapa | Entrega concreta | Condición para avanzar |
| --- | --- | --- |
| 1. Sistema común | Tokens semánticos, papel, tipografía, acciones, etiquetas y separadores; ficha de referencia usando esa base. | La ficha conserva el aspecto elegido y sus variantes de contenido funcionan. Contraste y estados revisados. |
| 2. Mapa completo | Cabecera, registro, controles, leyenda, marcadores, índice, fichas y mensajes. | Capturas de mapa 2D/3D en escritorio y móvil; navegación por teclado y diálogos revisados. |
| 3. Desde Ushuaia | Selector, hitos, avistajes, bitácora, fuentes y controles. | Recorrido completo, retorno al mapa y alternativa sin WebGL. |
| 4. Orcadas | Navegación, paneles, recorrido, fuentes, calendario, instrumentos y gráficos. | Cuatro capítulos revisados, panel móvil usable y datos legibles sin depender solo del color. |
| 5. Integración visual y cierre | Ajustes justificados del mapa, limpieza de estilos sustituidos y documentación actualizada. | Comparación conjunta de pantallas, validación funcional y de rendimiento, pendientes identificados. |

Los problemas de foco, contraste o acceso que se detecten se resuelven dentro de la entrega afectada. Las etapas ordenan el trabajo; no justifican acumular una deuda de accesibilidad hasta el final.

Cada entrega debe ser acotada y revisable, con captura anterior y posterior de la misma pantalla, tamaño y estado. Antes de tocar archivos compartidos, coordinar según las reglas del proyecto. Este documento no asigna tareas a otros integrantes ni crea issues.

## 9. Verificación y definición de terminado

### Evidencia del prototipo aprobado

La ficha real «Océano» se capturó en escritorio con 456 × 645 px antes y después de inyectar temporalmente la propuesta Pergamino claro. La composición, textos, atlas, rosa, radios históricos y botón se conservaron; el JSON de verificación registra dimensiones iguales y `errors: []`. La referencia durable es [`ficha-oceano-pergamino-claro.png`](referencias/ficha-oceano-pergamino-claro.png), con el CSS temporal exacto en [`ficha-oceano-pergamino-claro.css`](referencias/ficha-oceano-pergamino-claro.css). La aprobación posterior 13/9 no se presenta como evidencia de esa captura.

La comparación de tres versiones queda en el artefacto local de revisión; distingue ocre intenso, Pergamino claro y blanco cálido. Esta comparación orienta la dirección cromática, no certifica la migración de otras superficies.

### Revisión visual acotada del redondeo 13/9

Root aprobó una revisión visual acotada de 14 capturas, siete pantallas en escritorio y móvil: mapa, lista, ficha «Océano», ficha de punto, viaje, Fósiles y Orcadas. Las capturas aprobadas están en `/tmp/antartida-rounding-final/captures/`: `welcome-mobile.png` y `welcome-desktop.png` son estados del mapa aunque conserven el nombre `welcome`; también se revisaron `list-mobile.png`, `list-desktop.png`, `ocean-mobile.png`, `ocean-desktop.png`, `point-detail-mobile.png`, `point-detail-desktop.png`, `voyage-two-controls-mobile.png`, `voyage-two-controls-desktop.png`, `fossils-mobile.png`, `fossils-desktop.png`, `orcadas-mobile.png` y `orcadas-desktop.png`. La ficha de punto usa el valor mock de OpenMeteo `-24.1` solo para comprobar el layout. No se observaron errores del navegador ni overflow documental en esos escenarios. La ficha real conserva 13 px y no mostró overflow interno; en los manejadores de `marine` y `fossils` se midieron 20 px de `scrollWidth` interno sin clipping visible, una medición localizada que no se generaliza a toda la UI.

Esta revisión confirma el aspecto de la implementación 13/9 en esos estados; no es una certificación visual global ni una cobertura completa de landscape. Tampoco afirma que no exista scroll interno: las superficies pueden conservar desplazamiento propio y la revisión se limita a los estados capturados.

En la revisión visual final, root confirmó la legibilidad y la paleta en ficha, lista, Orcadas, instrumentos y gráfico de escritorio; también revisó lista y Orcadas en móvil, e instrumentos en pantalla horizontal. La ficha recortada conserva 456 × 645 px y los radios históricos de esa captura. La captura principal `viaje-3d` corresponde a la segunda apertura desde el modo 3D y se etiqueta simplemente «3D»; la captura separada `viaje-2d` conserva la evidencia de entrada desde Mapa 2D, cuyo `startVoyage()` fuerza después el modo 3D cuando WebGL está disponible. El ajuste de capas del panel de viaje queda incorporado a la tanda final.

La tanda final conserva nueve estados por viewport en cuatro JSON (`desktop`, `mobile`, `compact`, `landscape`); sus comprobaciones registran `overflow: 0` y `errors: []`. Esto describe los estados instrumentados, no una certificación de todos los recorridos. En landscape se observó scroll interior en viaje y conclusión por la altura disponible; no se afirma que el vehículo quede completamente visible en todos los tamaños.

Fuentes de Orcadas conserva deliberadamente el contrato B7 no modal: el panel tiene `role="dialog"` sin `aria-modal="true"`, la escena permanece accesible y las capas de meses y marcadores siguen visibles por diseño. Esta excepción no se trata como un fallo de scrim ni se convierte en un diálogo modal; la evidencia focalizada registra la semántica y la ausencia de `inert` sobre la escena.

### Evidencia histórica de la ficha anterior

La segunda ficha se revisó visualmente en escritorio y móvil. El [registro de verificación](../../docs/diseno/referencias/ficha-cartografica-v2-verificacion.json) conserva comprobaciones a 390 × 844, 360 × 740 y 844 × 390: límites de la ficha, título largo, cierre, Escape, retorno del foco y ausencia de errores de página en ese recorrido.

En la iteración de la ficha pasaron TypeScript de `react-ui` y de la app, el build de Vite y cuatro casos E2E focalizados en fichas/cierre en escritorio y móvil. El build mantuvo la advertencia de tamaño de chunks. Estos resultados no son una validación de toda la migración.

En la ejecución más amplia previa se registraron 236 pruebas de core aprobadas y un timeout en la prueba de pingüinos de `react-ui` (110 de 111 aprobadas). La tanda E2E ampliada tuvo 11 aprobadas, una omitida y dos fallos móviles: acceso a marcadores desde la lista en 3D y entrada a Orcadas sin WebGL. Esos fallos no quedaron resueltos ni se atribuyeron al cambio visual. El pase focalizado posterior no demuestra que estén corregidos.

### Resultados actuales de esta migración

La evidencia automatizada de esta entrega registra `pnpm test` con 1.356 pruebas (19 documentales, 650 de `core` y 687 de `react-ui`), `pnpm typecheck` y `pnpm build` sin errores. La E2E global final registró 366 casos: 322 aprobados, 44 omitidos y ningún fallo. Las omisiones se distribuyeron por perfil según el reporte de Playwright: `desktop` 23, `mobile` 7, `mobile-compact` 5 y `mobile-landscape` 9; son casos omitidos, no fallos. Los 1.349 tests y los 14 casos E2E GPU de la revisión preintegración quedan como contexto histórico y no se atribuyen a esta tanda.

El commit `2484804` ajusta la leyenda compacta para que la variante con «Continuar» pueda desplazarse bajo la cabecera en pantallas cortas y actualiza el flujo E2E de Poncho para esperar el loader compartido y comprobar sus fuentes de procedencia. Root revisó las capturas de escritorio, móvil y landscape en 844 × 390 y 844 × 360 px.

La revisión runtime de hover cubrió cinco controles en escritorio a 1440 × 900: botón de lista, cierre y acción del pie de la ficha «Océano», vuelta del selector de viaje y ghost real «Ocultar panel» de Orcadas. Los estilos permanecieron estables, sin cambios de caja ni radio; la ayuda manuscrita quedó restaurada con Caveat, fondo al 92 %, radio 12 px y posición desktop `top:120px`. No se reprodujo un bug del cierre: ya tenía hover en el BEFORE; tampoco hubo un estado ghost real comparable en el BEFORE. No se observó un control deshabilitado, así que esa variante queda sin cobertura.

El flujo focalizado de teclado «Escape y retorno del foco» pasó en mobile y desktop; la tanda actual de 14 casos cubre además overflow, lista 2D/3D, viaje de dos controles, fichas/expansión de Fósiles y overflow de Océano. Esta tanda no sustituye la cobertura E2E global.

En esta revisión se corrigieron cuatro microbugs visuales y se verificaron con evidencia separada:

- **Barra de viaje:** el contrato actual de `main` conserva dos controles principales en la barra y «Salir» en la esquina superior; el CSS cartográfico mantiene ese layout sin reinstalar la fila histórica de cuatro controles. La evidencia de cada viewport se registra solo cuando se repite en el branch final.
- **Foco de controles circulares:** `painted.css` dejó de imponer `border-radius:2px` desde la regla global de foco. Las capturas AFTER y su JSON muestran los tres controles de zoom con radio `50%` y outline azul de 3 px; el BEFORE conservado muestra el cuadrado de 2 px. La comprobación cubre esos controles en desktop.
- **Altura inicial de la ficha:** `point-sheet.css` limita a `50%` la ficha `half` en móvil cuando está en su estado pequeño. Los estados `.full` y `.dragging` conservan el límite compartido de `92%` y el límite inline del arrastre; no se modificaron radios, ornamentos ni padding.
- **Stacking de etiquetas 3D:** los wrappers mostrados, enfocados o bajo el puntero en `painted.css` usan `z-index:9`, por encima de otros marcadores y por debajo del encabezado (`z-index:10`) y los paneles. La captura focalizada de 360 × 740 px y su reporte pertenecen a la revisión previa y se conservan fuera de este checkout; no se presentan como evidencia durable de este árbol.

Después de este cuarto arreglo, el build de Vite pasó con exit code 0, 758 módulos transformados y 694 ms. Ese resultado pertenece a la revisión previa a la actualización de `main` y se conserva solo como contexto histórico; no se atribuye a este árbol.

La captura y los informes de esa revisión previa están fuera de este checkout y no forman parte de una evidencia durable de este PR. Los resultados de esta entrega se informan únicamente después de repetirlos sobre este árbol.

### Integración contra `main`

La integración se realizó en la rama `202-ui-pergamino-claro`, comparando con `origin/main` en `dbd80932873e38ede0c81451d828030c662e5388`. El commit de código integrado es `3a27b73`; el árbol conserva la lógica y las reglas nuevas de `main` y aplica la decoración Pergamino claro compatible. El comportamiento de «Continuar» de #186 ya forma parte de la base integrada y se preserva en esta revisión; no se atribuye como funcionalidad nueva de este PR.

En el árbol integrado, `pnpm test` registra 19 pruebas documentales, 650 de `core` y 687 de `react-ui` (1.356 en total); `pnpm typecheck` y `pnpm build` también pasan. La corrida E2E global final registró 366 casos: 322 aprobados, 44 omitidos y ningún fallo.

La E2E focalizada histórica pasó 32 casos: 22 de carga y bienvenida en mobile/desktop con GPU real y 10 de lista, ficha, overflow y barra de viaje en mobile/desktop. Esa tanda cubre contratos de la revisión previa; la corrida global final se documenta por separado con 322 aprobados, 44 omitidos y ningún fallo.

La cobertura visual histórica descrita en los párrafos anteriores a esta sección pertenece a la revisión preintegración. La revisión actual del redondeo se documenta con 14 capturas (siete pantallas en escritorio y móvil) en `/tmp/antartida-rounding-final/captures/` y con 14 casos E2E GPU; quedan fuera del repositorio en el artefacto de handoff y sirven para esta revisión visual, no como evidencia versionada. Los 32 casos focalizados de la tanda anterior se conservan como contexto histórico.

### Validación del formato documental

El 15 de noviembre de 2026, `DESIGN.md` se reorganizó según la especificación alpha de Google Labs. Este plan conserva el análisis de implementación que antes compartía el mismo archivo. Las capturas y el código de la UI no cambiaron durante esa reorganización.

Se ejecutó el validador oficial `@google/design.md` **0.4.0**, instalado temporalmente fuera del proyecto, con la operación `lint DESIGN.md`. Resultado: **0 errores y 0 advertencias**; 7 colores, 9 escalas tipográficas, 2 radios, 10 tokens de espaciado y 22 entradas de componentes. El [resultado JSON](referencias/design-md-lint.json) conserva la salida. Las referencias y propiedades del documento pasan la validación de formato; eso no audita el contraste de la textura renderizada ni el comportamiento accesible de la app.

### Matriz de validación del conjunto

| Dimensión | Casos que hay que cubrir |
| --- | --- |
| Pantallas | 1440 × 900, 390 × 844, 360 × 740 y 844 × 390; texto ampliado y zonas seguras. |
| Mapa | 2D y 3D; leyenda abierta/cerrada; lista; punto previsto; ficha de mar con fuentes y vista previa; zoom y selección. |
| Viaje | Elección de transporte; controles; hito; respuesta; avistaje; bitácora; fuentes; final y abandono. |
| Orcadas | Los cuatro capítulos; fuentes; punto de exploración; panel reducido/ampliado/oculto; mes; instrumento; gráfico y conclusión. |
| Entrada y alternativas | Ratón, teclado y táctil; movimiento reducido; WebGL ausente; carga y error. |
| Contenido | Título largo, párrafos extensos, múltiples fuentes, URL larga, valores con unidades y estados provisionales. |

Una entrega queda terminada cuando:

1. Sus capturas conservan el pergamino claro, la tinta y la jerarquía de la referencia elegida, con legibilidad en el tamaño real de uso.
2. Todos sus estados relevantes están cubiertos; ningún control necesario queda oculto, cortado o inaccesible.
3. Se comprueban contraste, foco, teclado y semántica en las superficies modificadas.
4. Se preservan datos, fuentes, unidades, avisos y comportamiento de los recorridos.
5. Pasan tipos, build y pruebas apropiadas al alcance. Los fallos existentes se registran por separado de los nuevos, con evidencia suficiente para distinguirlos.
6. Se revisa rendimiento si cambian SVG repetidos, texturas, materiales, filtros o renderizado. Las mejoras visuales no deben degradar el zoom ni el uso móvil.
7. Se actualizan las referencias del diseño y se eliminan estilos reemplazados que hayan quedado sin uso.

## 10. Documentación y decisiones pendientes

`DESIGN.md` pasa a ser la referencia de esta dirección visual de UI. [HANDOFF.md](../../docs/diseno/HANDOFF.md) y el [prototipo original](../../docs/diseno/design/Main.dc.html) conservan valor histórico, pero describen un alcance y una arquitectura anteriores. [decisiones.md](../../docs/decisiones.md) mantiene el registro de decisiones técnicas, geográficas y de escena. Los documentos de expedición siguen definiendo sus contenidos y recorridos.

README se sincronizó con el enrutado actual: Orcadas y Desde Ushuaia son los recorridos disponibles. La declaración de IA incluye la migración. Los hitos del equipo en [ROADMAP.md](../../ROADMAP.md) conservan su seguimiento propio.

El contraste nominal de los tokens sobre `#F3E8D2` es aproximadamente **9,71:1** para `#403536`, **5,31:1** para `#655D56` y **9,10:1** para `#1E3E5C`, calculado offline con sRGB. Estos valores orientan la paleta plana; no representan el contraste efectivo sobre textura, SVG, degradados, transparencia, gráficos o estados compuestos. No se presenta ninguna de estas cifras como certificación WCAG.

La tanda E2E de desarrollo se interrumpió en el caso 112: registró 86 aprobadas, 11 fallidas, 1 interrumpida, 14 omitidas y 56 no ejecutadas. Ese resultado no se presenta como verde ni como validación global. La ejecución completa de producción sobre el preview 5118 terminó con 168 casos: 122 aprobados, 26 omitidos, 20 timeouts y 0 flaky, en 45,9 minutos. La repetición trace-off parcial registró 2 aprobados, 6 timeouts, 1 interrupción y 1 caso no ejecutado; quedaron 10 candidatos de la tanda original sin repetir. El baseline móvil también terminó en timeout, por lo que no demuestra equivalencia causal ni ausencia de regresión. No se presenta el conjunto como todo verde.

La comparación de baseline móvil del BottomSheet también terminó en timeout (30,6 s). El recorrido alternativo con CDP tuvo una interacción distinta, por lo que estos dos resultados no demuestran equivalencia causal ni ausencia de regresión; se conservan como límites de la evidencia.

Queda por resolver durante la implementación:

- La intensidad de textura y tamaño de ornamentos en paneles densos, especialmente fuentes e instrumentos.
- Los ajustes de tinta del mapa 2D y de integración con el 3D que realmente mejoren la coherencia, evaluados con capturas comparables.
- Los valores definitivos de colores funcionales y foco después de medir contraste sobre las superficies reales.
- Los casos que la sección de verificación identifique como omitidos, fallidos o no evaluados.
- La ayuda manuscrita/translúcida «Arrastrá…» se restaura junto con el baseline; la revisión desktop confirmó su posición, fondo, radio y tipografía. La ayuda no tiene estado hover. No constituye una funcionalidad nueva de esta migración.

La elección de pergamino claro y lenguaje cartográfico ya está tomada. Los puntos anteriores precisan cómo aplicarla a toda la experiencia. La implementación local y las capturas externas de revisión están disponibles; los resultados E2E amplios históricos, los casos no repetidos y la validación funcional y de rendimiento restante se mantienen separados de la evidencia visual. Ningún resultado de la ficha se presenta como validación de toda la aplicación.
