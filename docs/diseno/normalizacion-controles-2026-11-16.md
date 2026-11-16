# Normalización de controles y revisión de alcance

Fecha: 16 de noviembre de 2026. Issue [#202](https://github.com/Antartida3D/Antartida3D/issues/202), asignado a GiulianoPoeta99. La auditoría histórica parte de `d612d306f3a90cd47824001f7eb9bf60a847e910`, después de integrar los PRs #203, #210 y #226. La continuación se reaplicó sobre `main` actualizado en `33b67f1e5646590a3fcc1b62b614cf10932fa365`, mediante fast-forward local; los resultados de esta tanda se distinguen de las verificaciones históricas.

Este registro separa el contrato aprobado, la implementación de estados y la auditoría de cambios que podrían exceder el alcance visual. Las pruebas anteriores del PR #203 no se atribuyen a esta continuación.

## Contrato aprobado

| Estado | Regla |
| --- | --- |
| Reposo | Papel en el botón normal; aguada marfil en el principal; fondo transparente en el ghost. |
| Hover | Aguada marfil para normal y ghost; aguada sepia más intensa para el principal. Se elimina el fondo azul de hover. |
| Puntero | Hover solo con `(hover: hover) and (pointer: fine)`. |
| Seleccionado | Conserva su apariencia propia, con refuerzo visible al pasar el puntero; no se confunde con una opción sin seleccionar. |
| Estados semánticos | Leído, perdido, exacto y cercano conservan su fondo y texto propios en hover; el refuerzo interior permanece visible. |
| Foco | Contorno azul visible, conservando la forma y el radio del control. |
| Deshabilitado | Sin cambios de fondo, sombra o posición por hover o pulsación. |
| Continuar | Conserva su ocre. |
| Geometría | Paneles de 13 px y botones rectangulares de 9 px; círculos, chips y otras excepciones semánticas se mantienen. |

La fuente común es CSS. Se conservan iconos, texto, fuentes, áreas de interacción y comportamientos existentes. No se agrega un componente React universal, una navegación nueva ni un contrato modal. La decisión está en [DEC-202-2](../decisiones/DEC-202-2-estados-controles.md).

El ajuste explícito de área táctil es la altura mínima de 44 px del botón del loader. La acción de la ficha usa la variante primaria compartida; los controles de Marambio conservan su selección mediante `aria-pressed="true"`. La aclaración posterior autoriza recuperar las cápsulas de hitos y la flecha monocroma de retroceso, como se detalla abajo.

## Hallazgos documentales confirmados

- `DESIGN.md` y el plan todavía prescribían hover azul para el botón principal. Se actualizó el contrato a papel y sepia, conservando el anterior como referencia histórica.
- `DESIGN.md` declaraba `rounded.focus: 2px`, aunque el plan registraba que esa regla global se había retirado para no deformar controles circulares. El foco conserva ahora la geometría de cada control en el contrato documental.
- El encabezado de `DESIGN.md` presentaba 1.356 pruebas y 366 casos E2E como estado de la entrega, mientras el cierre del PR #203 registraba otra integración con 1.344 pruebas y 50/50 E2E focalizados. Se identificaron ambos registros como históricos y se separaron de esta continuación.

## Relación con issues y cambios de producto

En el inventario inicial se consultaron los 228 issues/PRs abiertos y cerrados del repositorio mediante la API de GitHub; la búsqueda se repitió antes de retomar #202. Se comprobaron los merges relevantes y su presencia en `origin/main`. `gh` no estaba instalado, por lo que no se atribuye la búsqueda al script que depende de esa herramienta. La tabla conserva los estados de esa primera consulta; la actualización remota posterior y el registro único están al final de este informe.

| Registro | Relación con la auditoría |
| --- | --- |
| [#202 / PR #203](https://github.com/Antartida3D/Antartida3D/pull/203) | Migración cartográfica integrada en `6baf7fd`; #202 se reabrió para esta normalización. |
| [#209 / PR #210](https://github.com/Antartida3D/Antartida3D/pull/210) | Fósiles y Océano adoptaron las clases de interfaz de Orcadas/Marambio después del rediseño. Reutilizar clases no demuestra que todos sus componentes y estados sean comunes. |
| [#190 / PR #192](https://github.com/Antartida3D/Antartida3D/pull/192) | Quitar balizas amarillas, ocultar el registro durante el viaje y simplificar su botonera fueron cambios explícitos de producto. No se clasifican como pérdidas accidentales por apariencia. |
| [#177 / PR #178](https://github.com/Antartida3D/Antartida3D/pull/178) | Conserva el orden DOM del botón principal a la derecha. Su mención histórica de botones azules no define el hover vigente. |
| [#75 / PR #226](https://github.com/Antartida3D/Antartida3D/pull/226) | Añade «Siguiente», tarjeta final y lista ordenada; es posterior al PR #203 y forma parte de la base actual. |
| [#150](https://github.com/Antartida3D/Antartida3D/issues/150) | Normalización de citas, abierta y asignada a NeichS; queda fuera de esta implementación. |
| [#227](https://github.com/Antartida3D/Antartida3D/issues/227) | Selector 2D y fallback, abierta y asignada a LucasA21; queda fuera de esta implementación. |
| [#2](https://github.com/Antartida3D/Antartida3D/issues/2) | Estructura común de expedición; no equivale a normalizar estados CSS. |

No apareció un issue abierto específico sobre medallas perdidas o cambio del icono del barco. La ausencia de registro no demuestra una regresión ni autoriza su restauración. La comparación de historia y código se registra por separado antes de decidir cualquier cambio.

## Medallas e iconos: lo confirmado y lo pendiente

Las imágenes aportadas identifican las «medallas» como el resumen `MilestoneLog` de [VoyagePanel.tsx](../../packages/react-ui/src/voyage/VoyagePanel.tsx), con el texto «Hitos del viaje: abriste 0 de 4». No es el contador `ExplorationLog` del mapa ni el sello final de Orcadas. El componente se incorporó en `47a58d5` y su condición de aparición se conserva entre `36c31ca`, el merge de UI `6baf7fd` y la base `d612d30`.

El «0 de 4» identifica la referencia aportada, no un total que deba fijarse en el código. El viaje actual en Irízar presenta siete hitos; el script de auditoría se ajustó a ese estado y no se modificó el producto para reproducir el contador de la imagen.

Ese resumen aparece al llegar, bajo la condición `last && !beforeHop && !story`: en el viaje 3D del Irízar espera al traslado en helicóptero y no corresponde al recorrido de Poncho. La lista de hitos abiertos pertenece al viaje en memoria y se vacía al iniciarlo o reiniciarlo; esa regla es anterior al PR #203. La evidencia no demuestra que se hayan eliminado el componente ni sus datos por la migración visual.

Sí se confirmó un cambio de presentación en `3a27b73`: `.vnotebook` perdió el marco discontinuo y `.vnote` pasó de cápsulas de 18 px de radio y 36 px de altura mínima a 2 px y 44 px. Tras contrastar la referencia y la excepción de chips semánticos de DEC-202, el usuario autorizó recuperar el marco discontinuo y las cápsulas de 18 px, conservando la altura mínima actual de 44 px, la paleta y su ubicación al llegar. La autorización no incluye añadir persistencia ni alterar el progreso.

En los símbolos del viaje se encontraron varios antecedentes diferentes:

- El pin dorado de [pins.ts](../../packages/react-ui/src/voyage/pins.ts) ya existía antes del rediseño; el cambio a gris al abrir el hito también tiene un antecedente anterior (`328e788`).
- El control de retroceso usa el carácter `◀` en `VoyagePanel.tsx` desde `7204afe`, del 11 de noviembre. No se demostró que el PR #203 sustituyera un SVG por ese carácter. Su apariencia puede variar según la plataforma.
- La aclaración del usuario identifica el problema como la apariencia emoji de `◀️` en el control de retroceso. Se autoriza su presentación monocroma conservando la flecha, el nombre accesible y la lógica. Los pines y el modelo del barco quedan fuera de ese ajuste.

Aunque el carácter no cambió, `3a27b73` cambió la cadena tipográfica de `.btn` de Atkinson/system-ui/sans-serif a Fraunces/Georgia/serif. Los archivos de fuente latinos inspeccionados no incluyen `U+25C0`, por lo que interviene una fuente de sustitución. Es una explicación causal compatible con el cambio de apariencia; no sustituye una reproducción comparativa en Safari.

La [aclaración de alcance](https://github.com/Antartida3D/Antartida3D/issues/202#issuecomment-6929621437) registra ambas recuperaciones visuales. Su revisión en navegador se repitió después de aplicarlas; sus resultados figuran abajo, separados de las capturas anteriores del hover.

## Cambios ajenos al diseño detectados en README

La comparación histórica identificó modificaciones de `3a27b73` que exceden el cambio de presentación:

| Hallazgo | Evidencia y límite | Tratamiento en esta continuación |
| --- | --- | --- |
| Atribuciones de IA sustituidas | Las entradas de #190, #146 y #185 pasaron de atribuciones específicas de Claude a Codex. Los antecedentes son `133327d`, `92b0bc6` y `0afc468`. Esto confirma una sustitución de texto, no cuál fue la autoría real. | Se restituye el texto histórico exacto de esos registros; no se presenta como hallazgo nuevo ni se reasigna autoría por interpretación. |
| Aviso sobre dos fotos de Poncho reducido | La advertencia explícita de derechos pendientes de dos fotos de Fundación Marambio se sustituyó por una remisión a su documento de fuentes, sin constancia de permiso en ese cambio. La ficha vigente conserva ambas fotos con estado `pending`; los cambios posteriores de #189/#193/#212 no aportan una autorización para estos recursos. | Se restituye el aviso explícito de derechos pendientes y el enlace al catálogo. |
| Inventario incompleto de expediciones | El README aún menciona solo Desde Ushuaia y Orcadas como disponibles, aunque `content/points.ts` ya contenía seis puntos de nivel A en `36c31ca` y el propio README describe Fósiles. | README ahora enumera los seis destinos de nivel A; no cambia el contenido de las expediciones. |
| Resultados históricos presentados sin separar la base | README y el documento del loader conservan cifras de una integración anterior. El cierre del PR #203 y el plan distinguen 1.344 pruebas y 50 E2E focalizados de la corrida global histórica de 366 casos. | README, DESIGN y el plan separan esas tandas de la continuación actual; no se atribuyen resultados nuevos al resto de los textos históricos. |

Las atribuciones, el aviso de derechos y el inventario de expediciones del README se corrigieron con la evidencia histórica y el estado vigente de los recursos. La historia se conserva para que la corrección pueda revisarse sin atribuir autoría nueva.

## Otros hallazgos de la auditoría de alcance

La comparación causal usa `36c31ca` → `6baf7fd`, con `d612d30` como estado integrado posterior. `19b3a7b` aporta contexto, pero no permite atribuir al PR #203 todos los cambios de los días siguientes. Se inspeccionaron los 44 archivos del diff, incluidos sus 15 TSX productivos; las referencias de esta tabla corresponden al merge, antes de la normalización local.

| Hallazgo | Evidencia | Estado y alcance |
| --- | --- | --- |
| Se retiraron datos educativos del loader | `LoadingScreen.tsx` dejó de mostrar «Mientras tanto · Dato real», texto y enlace de fuente, rotación cada 6,5 s y pausa mientras se leía con hover/foco. | Se restaura el bloque original con los tres PTS (`vostok`, `thwaites`, `erebus`) que tienen descripción y URL de fuente; se conservan rotación de 6,5 s y pausa en hover/foco. No se altera `ready` ni la espera mínima del loader. |
| Un recurso 2D pendiente deja el loader sin salida efectiva mediante su botón | `Map2DLayer` espera `paintReady && inkReady`; se retuvo únicamente la imagen `map-paint`. Antes y dos segundos después de pulsar «Ver mapa 2D», el loader permaneció en 1 de 2 pasos; al liberar la imagen desapareció. | Reproducido bajo demora artificial del recurso propio de 2D. No demuestra espera indefinida en una red normal; los errores terminados están tratados. No se implementa un cambio de fallback, por su relación con #227. |
| Dos hitos del loader 2D usan una retícula de cinco columnas en escritorio | A 1440 px se midieron dos pasos en cinco pistas de aproximadamente 102,8 px cada una, conforme a `repeat(5, minmax(0, 1fr))`. | S06 corregido con una regla scoped a `data-loading-variant="map2d"`, que presenta dos columnas sin cambiar la retícula 3D. El fallback manual permanece oculto por #229. |
| La muestra de leyenda tier B no reproduce el centro del marcador | `.mk.tb .dot::after` usa tinta, mientras `.sw .b` conserva solo la aguada marfil. | Pérdida de correspondencia visual confirmada en CSS; clasificación y puntos intactos. Pendiente de evaluación visual. |
| Se pierden asociaciones de color puntuales en Orcadas | El valor del umbral de `Answer.tsx`, la llamada del menisco de `Thermometer.tsx` y la lectura alejada cambian a tinta neutra mientras conservan otras señales de color. | Se recuperaron las asociaciones semánticas con tokens aprobados en umbral, menisco y lectura alejada; las capturas y pruebas focalizadas conservaron los valores, fórmulas, escalas y gestos. |
| Otros chips contradicen la excepción de geometría semántica | `.chip` y `.orc-chip` pasaron de 10 a 2 px de radio. | Se restauró `.orc-chip` a radio 10 px conforme a la excepción semántica aprobada. No se alteraron otros chips ni se generalizó la estética. |
| Las barras de progreso pierden prominencia | `.reg .bar` pasa de 6 a 3 px; `.vprog`, de 8 a 4 px. | Cambio visual medible, sin eliminación de cómputo o persistencia. Por decisión explícita del usuario, la barra fina se acepta y se conserva; no queda como bug pendiente. |
| Las categorías de ficha quedan como texto uniforme | `.point-sheet .tag` pierde fondo, borde y padding diferenciados. | Cambio confirmado, pero la ficha fue una referencia aprobada. Por decisión explícita del usuario, las categorías sin delimitar se aceptan y se conservan; no quedan como bug pendiente. |

El botón del loader por debajo del objetivo interno de 44 px también apareció en esa auditoría; se incorporó a la normalización autorizada. No se interpreta automáticamente como una infracción normativa.

Se descartaron varios falsos positivos: el diff final no agrega `inert` ni contención de foco; las reglas de reclamos y movimiento reducido señaladas como ausentes se reintroducían en otro tramo; `ExplorationLog` y su almacenamiento no cambiaron. El sello de Orcadas conservado no demuestra por sí solo el estado de los hitos del viaje. Los cambios posteriores de fotos de Marambio, interfaz de Fósiles/Océano y orden sugerido tampoco se atribuyen al PR #203.

## Implementación y validación de esta continuación

La fuente compartida es [controls.css](../../packages/core/src/styles/controls.css), importada al final de [index.css](../../packages/core/src/styles/index.css). Los tokens de [tokens.css](../../packages/core/src/styles/tokens.css) son:

- `--chart-control-hover: var(--chart-wash)` (`#EDDFC0`).
- `--chart-control-hover-strong: color-mix(in srgb, var(--chart-wash) 80%, var(--ocre))`; es una mezcla derivada, no un hexadecimal nuevo.
- `--chart-control-ring: var(--chart-rule)`.

Normal y ghost usan el primer fondo; el principal usa el segundo. «Continuar» mantiene `#E0A93C` en reposo y `#EDBB55` en hover. La recuperación local de hitos usa marco discontinuo con tinta secundaria y cápsulas de 18 px; el retroceso mantiene `U+25C0` y añade `U+FE0E` para solicitar presentación de texto, sin cambiar su acción ni su nombre accesible.

La revisión final detectó que el relleno y texto comunes del hover sobrescribían los estados `.read`, `.missed`, `.is-exact` y `.is-close`. Se excluyeron de esas propiedades comunes para conservar sus colores semánticos, manteniendo el refuerzo interior de interacción. La prueba específica de hito leído se registra por separado de las tandas anteriores.

La continuación restaura en el loader compartido el bloque educativo histórico «Mientras tanto · Dato real». Reutiliza únicamente las descripciones y primeras fuentes URL de `PTS` para Vostok, Thwaites y Erebus; rota cada 6,5 segundos y pausa mientras el puntero o el foco están sobre la lectura. La condición de `ready`, la espera mínima y el fallback automático de #229 permanecen sin cambios. Para S06, la variante `map2d` presenta sus dos pasos en dos columnas mediante un selector scoped; la variante 3D mantiene cinco columnas.

| Comprobación actual | Resultado y límite |
| --- | --- |
| `pnpm docs:test` | 19/19 pruebas del validador documental correctas. |
| `pnpm docs:check --body-file /tmp/ui-audit-issues/normalization-docs-body.md --base origin/main` | Correcto sobre el árbol local, incluidos los documentos nuevos. El primer intento dentro del sandbox falló con `spawnSync git EPERM`; la repetición autorizada completó la comprobación. |
| `pnpm test` | 1.360 pruebas correctas: 19 documentales, 666 de core y 675 de react-ui. La primera ejecución tuvo un timeout de 5 s en pingüinos, sin fallo de aserción; la repetición sin build ni typecheck concurrentes pasó. |
| `pnpm typecheck` y `pnpm build` | Correctos. El build incluye la recuperación de cápsulas y la presentación de texto de la flecha. La tanda final de controles volvió a generar build y preview con la protección de estados semánticos, también correctamente. |
| Mediciones de estados en navegador | Siete controles: lista, zoom, acción de ficha, opción de reclamos, Fuentes de Marambio, acción primaria y Fuentes de Orcadas. El reporte registra papel/aguada/sepia en hover y foco azul conservando radios de 9 px o 50 %. No demuestra cobertura de todos los controles. |
| Capturas del recorrido general | Nueve capturas registraron overflow documental cero. Marambio conservó la selección visual de Fuentes; Orcadas completado conservó `antartida:explored = ["orcadas"]`, contador 1/6 y «Explorado» en la lista. Esto no valida los hitos del viaje. |
| Auditoría controlada del loader 2D | Imagen `map-paint` retenida, sin interceptar JavaScript: el botón no liberó la espera del recurso; liberar la imagen sí cerró el loader. La medición histórica registró dos pasos en cinco columnas; la corrección local posterior los presenta en dos columnas sin reactivar el botón manual oculto por #229. No es una prueba de timeout bajo red normal. |
| Recuperación de hitos | Capturas posteriores revisadas a 1440 × 900, 390 × 844 y 360 × 740: overflow documental cero, cápsulas de 18 px y altura de 44 px, marco discontinuo con radio de 13 px. Abrir otro hito incrementó el registro de 1/7 a 2/7. La ficha de llegada conserva su desplazamiento normal. |
| Retroceso monocromo | Captura móvil posterior revisada: triángulo monocromo, botón habilitado de 48 × 48 px y radio de 9 px, texto con puntos de código 9664 y 65038 (`U+25C0`, `U+FE0E`). No se comprobó Safari/iOS real. |
| Primera tanda E2E contra preview de producción | 18 casos: 15 aprobados y 3 omitidos porque solo corresponden a hover de escritorio. Incluye los 10 casos de carga en ambos perfiles y los 5 casos aplicables de controles. La ejecución terminó con código 0, antes del último ajuste de hover en estados semánticos; no es la suite global completa. |
| Tanda final E2E de controles contra preview regenerado | 10 casos: 6 aprobados y 4 omitidos por hover de escritorio en el perfil móvil. Incluye el nuevo caso de un hito leído real del Irízar, que conserva fondo y texto al pasar el puntero y muestra el refuerzo interior. Terminó con código 0 sobre la protección final de estados semánticos. |
| Corrida E2E exploratoria amplia contra desarrollo | 170 casos: 137 aprobados, 23 omitidos y 10 fallidos. Ocho fallos corresponden a los interceptores de carga, uno a la precondición móvil de foco y uno a una espera inicial del loader en el caso de caché de escritorio. La posterior tanda de preview aprobó esos casos; las dos ejecuciones no se presentan como una única suite global verde. |

La corrida exploratoria E2E contra el servidor de desarrollo produjo cuatro fallos de carga por proyecto: sus interceptores de red capturaban módulos JavaScript `terrain*.bin?import&url` y bloqueaban `DOMContentLoaded`. Se comprobó esa causa en los traces. Otro fallo de carga, el caso de caché de escritorio, agotó la espera inicial de 10 s hasta que desapareciera `.ld`, antes de llegar a F5; no se atribuye al interceptor. Los 10 casos de carga pasaron al repetirse contra preview de producción, sin aumentar ese timeout. El nuevo caso de foco falló en móvil porque necesitaba corregir su precondición de mapa 2D a 3D; pasó después en ambos perfiles. La prueba de escritorio de la corrida amplia ya había recibido esa corrección.

Estos resultados se conservan como diagnóstico de las pruebas, sin atribuirlos automáticamente a una regresión de la aplicación. Los registros son `/tmp/antartida-normalization-e2e.log` para la corrida amplia y `/tmp/antartida-normalization-preview-e2e.log` para su repetición focalizada. La repetición aprobada no convierte retroactivamente la primera corrida en una suite sin fallos ni demuestra cobertura de todos los casos del repositorio.

El registro de la última tanda, con build regenerado y el caso adicional del hito leído, es `/tmp/antartida-normalization-controls-final.log`. Los resultados de las tres tandas se conservan separados; no se suman como si fueran una sola ejecución.

Las mediciones y capturas generales están en `/tmp/antartida-normalization-after/report.json` y su directorio. Son artefactos locales de revisión; no se presentan como evidencia versionada.

La reproducción acotada del loader está en `/tmp/antartida-loader-audit/report.json` y `2d-loading.png`. Se distingue de los interceptores incorrectos de la corrida E2E contra desarrollo: aquí se retuvo la imagen, no un módulo necesario para que el documento cargara.

La comprobación posterior de hitos y retroceso está en `/tmp/antartida-voyage-normalized/report.json`; `mobile-milestones.png` y `mobile-back-control.png` conservan las capturas móviles revisadas. El reporte registra las siete cápsulas y el cambio de 1/7 a 2/7 sin modificar los datos del viaje.

Los archivos temporales del inventario están en `/tmp/ui-audit-issues/`. Son evidencia de trabajo local y no forman parte de un artefacto versionado. Los enlaces remotos y commits anteriores permiten identificar los antecedentes sin depender de esos archivos.

## Límites

La normalización de estados no demuestra que todos los botones de la aplicación estén cubiertos ni que cada contraste cumpla una auditoría de accesibilidad. Las recuperaciones de cápsulas y flecha son visuales y no cambian progreso, persistencia o navegación. La presentación de la flecha requiere comprobación en Safari/iOS real; una captura de Chromium no la garantiza en esa plataforma. El control documental valida estructura y enlaces; las comprobaciones en navegador deben cubrir las familias y estados modificados.

## Registro único y pasadas adicionales

El usuario pidió reunir todas las anomalías de las dos primeras pasadas y de una tercera revisión en un solo issue. Se actualizó el cuerpo de [#202](https://github.com/Antartida3D/Antartida3D/issues/202), que permanece abierto y asignado únicamente a GiulianoPoeta99. El alcance original se conserva íntegro como registro histórico. Los hallazgos se separan en pendientes confirmados, decisiones visuales por contrastar, riesgos no reproducidos, verificaciones y correcciones únicamente locales. No se crearon issues nuevos ni se comentaron o reasignaron registros ajenos.

La actualización de duplicados del 16 de noviembre a las 21:48 UTC recuperó 234 issues/PRs abiertos y cerrados. Se repitieron búsquedas completas por hover, medalla, icono, Ajuste fino, Mirá también, loader, derechos, atribuciones, leyenda y umbral. No se tomó ningún error de búsqueda como ausencia de duplicados.

La API confirmó que `main` remoto avanzó a `33b67f1e5646590a3fcc1b62b614cf10932fa365`, merge del [PR #229](https://github.com/Antartida3D/Antartida3D/pull/229). El issue [#227](https://github.com/Antartida3D/Antartida3D/issues/227), de LucasA21, está cerrado como completado. La base de las reproducciones anteriores sigue siendo `d612d30` con la normalización local; no se atribuyen esas pruebas al nuevo `main`. Esta continuación se integra sobre ese `main` actualizado sin reactivar controles que #229 eliminó.

El PR #229 oculta el selector manual y el botón de salida a 2D, y usa el 2D como respaldo automático. Esto cambia la aplicabilidad de los hallazgos sobre esos controles. No demuestra por sí solo que la espera del recurso pendiente ni la distribución de los dos pasos hayan quedado corregidas: requieren reevaluación sobre el fallback automático. Se preservan las reproducciones originales sin presentarlas como defectos visibles comprobados en `33b67f1`.

| ID del registro único | Hallazgo adicional | Evidencia, alcance y estado |
| --- | --- | --- |
| T01 | «Ajuste fino» no responde visualmente al hover. | `/tmp/antartida-extra-states/report.json` registra fondo, texto, borde, sombra, decoración, contorno y transformación iguales antes y durante hover con puntero fino. Confirmado en la base local; pendiente. No se atribuye origen al PR #203 sin comparación específica. |
| T02 | «Mirá también» no responde visualmente al hover. | El mismo reporte registra las propiedades sin cambio. Confirmado; no implica que falle su acción. |
| T03 | El selector 2D/3D cambia de tamaño y desplaza su vecino al seleccionar. | `/tmp/antartida-selector-audit/report.json`: 2D pasa de 80 a 76 px; 3D, de 88 a 92 px y de x=112 a x=108; el borde alterna 3/1 px. Reproducido antes de #229; el selector ya no se ofrece en el estado remoto por decisión de producto. Se conserva como antecedente. |
| T04 | Solapamiento potencial entre título y cierre de avistaje. | Las cajas de «Pingüinera de Isla Martillo» y el cierre se superponen 6 px, pero `intersectingCharacters: []` y la captura no muestran letras tapadas. Riesgo para otras variantes, **no un bug de texto oculto reproducido**. Evidencia en `/tmp/antartida-extra-states/{report.json,sighting.png}`. |

Se revisaron además diez capturas de mapa, lista, ficha e introducción/tarjeta de Poncho a 360 × 640 y 844 × 390, en `/tmp/antartida-ui-extra-audit/`. Esa cobertura acotada no certifica todas las pantallas ni elimina los riesgos de otras variantes.

### Coordinación detectada en la actualización remota

| Registro ajeno | Relación y límite |
| --- | --- |
| [#231](https://github.com/Antartida3D/Antartida3D/issues/231), NeichS, abierto | Propone primario azul y hover suave. El primario azul difiere de la aguada aprobada para esta continuación local; requiere acordar dirección antes de integrar, no cambiar silenciosamente el contrato. |
| [#232](https://github.com/Antartida3D/Antartida3D/issues/232), NeichS, abierto | Fondo de la píldora «Leer». Se coordina con los estados locales; esta auditoría no acredita su criterio específico de contraste. |
| [#233](https://github.com/Antartida3D/Antartida3D/issues/233), NeichS, abierto | Añadir pin a los hitos finales. Es una mejora distinta de recuperar las cápsulas y del retroceso monocromo; no se implementó ni se da por satisfecha. |
| [#234](https://github.com/Antartida3D/Antartida3D/issues/234), NeichS, abierto | Una definición de componentes, regla escrita y prueba de guardia. Se solapa con CSS/estados; su arquitectura y su guardia no están realizadas por el mero hecho de compartir `controls.css`. |
| [#230](https://github.com/Antartida3D/Antartida3D/issues/230), NeichS, abierto | Giro brusco hacia «Edificios» en Marambio, reportado en ese issue sin reproducción propia de su autor. Se referencia para evitar duplicarlo; esta auditoría no confirma el giro. |
| [#150](https://github.com/Antartida3D/Antartida3D/issues/150), NeichS, abierto | Normalización de citas, sigue fuera de la implementación local. |

El registro único no absorbe esos trabajos ni cambia sus responsables. La tercera pasada añade seis hallazgos U01–U06, con su propia base y reproducción; las hipótesis no verificadas no se cuentan como fallos confirmados.

### Tercera pasada: colores forzados

Se reprodujeron dos hallazgos con emulación de colores forzados oscuros en Chromium. La evidencia está en `/tmp/antartida-third-buttons/focus-selection.json` y sus capturas; no se presenta como una auditoría formal WCAG ni como prueba en un dispositivo real.

| ID | Hallazgo reproducido | Origen y límite |
| --- | --- | --- |
| U01 | La selección de transporte pierde su señal visual al mover el foco fuera de las opciones. Irízar seleccionado y los otros transportes muestran fondo negro, texto blanco, borde blanco doble de 3 px y ninguna sombra. `aria-pressed` conserva true/false. | La dependencia de color/sombra para distinguir selección ya existía en `36c31ca`, antes de #203. Captura `dark-transport-selection-with-focus-elsewhere.png`. No se modificó la selección ni su semántica. |
| U02 | El mapa 2D tiene `focus-visible: true` pero su indicador deja de verse. A 1440 × 900, la sombra interior desaparece; el outline de 3 px con offset de 3 px queda fuera de la caja que ocupa toda la pantalla y se recorta por los ancestros con overflow hidden. | Mecanismo previo a #203. Captura `dark-map-itself-focused.png`. La reproducción corresponde a la base local; el acceso al 2D automático de #229 exige reevaluación. |

Referencias de U01: `voyage.css:18-25` y `VoyagePanel.tsx:114-117`; la prueba mueve foco a «Volver al mapa» y el puntero fuera de los transportes. Referencias de U02: `painted.css:7,11,32-34` y `MapView.tsx:625-628`, con mapa enfocable como aplicación. La comprobación histórica de ambos mecanismos fue de código; no se ejecutó esa emulación sobre el navegador del baseline. El informe adicional es `/tmp/antartida-third-buttons/report.md`.

### Tercera pasada: lectura numérica de Orcadas

**U03, funcional P2, reproducido y anterior al rediseño.** En Orcadas → Observar → Ajuste fino, escribir una temperatura de `100`, salir con Tab y abrir Responder sin pulsar «Anotar lectura» deja dos representaciones incompatibles: el input, el botón «Anotar lectura (10,0 °C)» y el slider muestran el límite 10,0; Responder conserva +100,0 y adapta el gráfico a −18..116. Con `−100`, la observación muestra el límite −25 pero Responder usa −100, con gráfica −113..18. Al regresar a Observar aparece el borrador inicial −1,9, con el feedback de desvío conservado.

`packages/react-ui/src/orcadas/observation/Observation.tsx:248-262` limita el borrador visible, pero llama `onTypeGuess` con el número original. `packages/core/src/orcadas.ts:202-205` almacena ese original y `Answer.tsx:39-41` lo consume. El origen está en `36b4e6b`, del 13 de noviembre, anterior al PR #203; no se presenta como regresión de la migración visual. La auditoría no cambia datos, cálculos ni comportamiento.

La reproducción está en `/tmp/antartida-third-semantics/report.json` y en las capturas `temperature-{100,-100}-{blur,answer,returned}.png`. Estos valores describen entradas de prueba y la respuesta de la aplicación; no son mediciones científicas ni contenido añadido. Se comprobó persistencia entre capítulos, no tras F5 o cierre de expedición. La ruta de tecleo sobre sliders comparte el envío sin limitar en código, pero no se reprodujo por separado y no se cuenta como otro hallazgo.

### Tercera pasada: pantallas estrechas y bajas

| ID | Hallazgo reproducido | Base, origen y límite |
| --- | --- | --- |
| U04, P3 | A 320 × 640, la cabecera del mapa crece hasta unos 143 px y tapa parte de la ayuda, anclada en top 128 px y z-index 9. Con mayor espaciado de texto a 390 × 844 se repite el solapamiento y el registro sobresale 7 px de su caja. | Captura `/tmp/antartida-third-reflow/320-map.png` y evidencia adicional en `/tmp/antartida-third-reflow-extra/`. El anclaje es heredado; el panel opaco y su padding proceden del rediseño. Causalidad mixta: no se demostró visualmente que el baseline estuviera libre de solapamiento. Se agrupan las variantes como adaptación del HUD. |
| U05, P3 | A 360 × 225, el HUD se superpone y, en el estado inicial pequeño del selector de transporte, el pie «Volver al mapa» intercepta el clic sobre Irízar incluso después de desplazar el panel. | Reproducido dos veces; `/tmp/antartida-third-reflow-extra/report.json` y `reflow400-transport-blocked.png`. **Existe alternativa comprobada:** pulsar «Agrandar el panel para ver más» permitió luego elegir Hércules con un clic real. No se afirma inaccesibilidad total. El viewport corresponde a la reducción de área de 1440 × 900 al 400 %, pero **no se probó zoom real** ni se formula una conclusión normativa WCAG. |

Para U04, el anclaje está en `painted.css:90,134` y el panel añadido en `cartography.css:2-10,17-25,54-56`. Para U05, la altura pequeña del 54 % (`voyage.css:122`), el asa sticky de 34 px (`painted.css:150`) y el pie sticky (`voyage.css:13-14`) ya estaban en `36c31ca`; #203 añadió borde de pie y aumentó texto/borde de las opciones. La alternativa ampliada está en `/tmp/antartida-third-reflow-expand/report.json`, `reflow400-transport-expanded.png` y `reflow400-expanded-selection.png`.

El espaciado temporal de la prueba de 390 × 844 fue `line-height: 1.5`, `letter-spacing: .12em`, `word-spacing: .16em` y margen inferior de párrafo `2em`. Lista, ficha y viaje conservaron desplazamiento/flujo en los estados revisados. El overflow documental cero no demuestra por sí solo ausencia de recortes.

### Tercera pasada: graduaciones de la lupa

**U06, visual P3, reproducido y anterior al rediseño.** Al abrir Observar en Orcadas con la lectura de noviembre de prueba (−0,8 °C, escala centrada en −1), la graduación central `−1°` se lee completa; `−2°` pierde el signo y casi toda la cifra y `0°` queda prácticamente invisible. El recorte circular de la lupa en sí no es el defecto: las graduaciones enteras elegidas para orientar la lectura quedan ilegibles. No cambian datos, valores registrados ni cálculos.

`Thermometer.tsx:175,563,588` define un clip circular de radio 67, incluye los textos dentro del grupo recortado y los ancla en x=235. La geometría y tipografía ya estaban en `36c31ca`, con origen en `c659fb3` del 11 de noviembre; #203 sustituyó colores, no esa disposición. La medición SVG sitúa incluso el punto más cercano del signo `−` inferior fuera del círculo, y la captura confirma el resultado. Evidencia: `/tmp/antartida-third-semantics/thermometer-lens.png`, `thermometer-geometry.json` e `initial-observation.png`.

Los archivos de Orcadas inspeccionados para U03 y U06 no cambiaron entre `d612d30` y `33b67f1`; esa comparación de código se separa de la ejecución posterior sobre el árbol actualizado. La continuación añadió la normalización acotada y pruebas E2E específicas para la reproducción sin «Anotar», los límites y el cambio de capítulo, además de las pruebas del loader. No se añadió focus trapping, `inert`, persistencia nueva ni una ruta de fallback manual.

La tanda de cierre verificó localmente los seis objetivos: U01 y U02 conservaron selección y foco bajo colores forzados; U03 limitó `100` a `10` y `−100` a `−25` también en Responder y el gráfico; U04 mantuvo legibles cabecera, ayuda y registro a 320 px y con espaciado aumentado; U05 dejó visibles y operables las opciones del panel de 360 × 225; U06 presentó legibles todas las graduaciones revisadas, conservando escala, menisco, radio y gestos. Esta evidencia es focalizada y no equivale a una certificación global.

La búsqueda final de duplicados amplió los términos a temperatura, Anotar, forced-colors, reflow y cabecera, con resultados completos a las 21:59 UTC. Los registros de instrumentos y recorrido encontrados no describen el desajuste numérico reproducido. La publicación final mantiene los seis hallazgos dentro de #202, sin crear registros nuevos ni modificar los trabajos ajenos relacionados.
