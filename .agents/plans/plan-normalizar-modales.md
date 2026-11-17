# Plan: Normalizar modales (#264)

Issue: https://github.com/Antartida3D/Antartida3D/issues/264 (asignado a LucasA21). Rama: `264-...` creada con `gh issue develop 264 --base main --checkout`.

## Objetivo y criterio de éxito

1. Todos los «Saber más» usan un solo componente plegable (`MoreFold`) con la flechita de Orcadas, que gira al abrir. El botón «Saber más / Ver menos» del viaje desaparece.
2. Todas las citas se ven como texto seguido de `[N]` (`Cite`). Todas abren una sola vista de fuentes (`SourcesView`) con la fuente resaltada. No quedan «Fuente:», ni las líneas «Fuente» de Océano y Fósiles, ni «Fuentes verificadas (n)».
3. Hay una sola vista de fuentes, con una sola ficha por fuente: título con enlace, organismo o autor, detalle y fecha de consulta.
4. Todos los modales usan `BottomSheet`. Cierran al tocar afuera, con Escape y al arrastrar hacia abajo, con el mismo fondo. El foco queda atrapado y vuelve a quien abrió el modal.
5. Todos los modales tienen el mismo encabezado (`SheetHeader`): etiqueta, título y lugar o pregunta, con `iconbtn` «Cerrar» a la derecha.
6. Todos los modales tienen una sola fila de acciones (`SheetActions`). Los botones tienen el mismo alto y ancho y ocupan el ancho del modal. Hay un solo `.btn.primary`: último a la derecha en escritorio y abajo en celular. No quedan estilos en línea.
7. La misma acción usa el mismo texto en todos los modales: «Volver al mapa», «Comenzar expedición», «Atrás», «Siguiente».
8. `KindChip` marca qué es real y qué es ilustración en todas las fichas, en el mismo lugar, también en `PointSheet` y `VoyagePanel`.
9. El cuerpo de los modales usa un solo componente de texto (`SheetText`): primer párrafo como bajada, `**negrita**`, citas textuales en cursiva (`Quoted`) y separadores de una sola línea entre bloques.
10. A 390 px los bloques largos de datos arrancan plegados y la acción principal se ve sin hacer scroll.
11. Ningún texto cambia de palabras. Ningún dato pierde su fuente.
12. `pnpm test`, `pnpm typecheck`, `pnpm build` y `pnpm e2e` pasan sin errores.

## Entorno detectado

- Tests: `pnpm test` (incluye `docs:test` y Vitest de `core` y `react-ui`). Por paquete: `pnpm --filter @antartida/core test`, `pnpm --filter @antartida/react-ui test`.
- Tipos: `pnpm typecheck`. Build: `pnpm build`.
- E2E: `pnpm e2e` desde la raíz. Más rápido: `E2E_GPU=1 E2E_WORKERS=4 E2E_PORT=5113 pnpm e2e`. Specs sueltos desde `apps/dibujado`: `pnpm exec playwright test -c ../../packages/e2e/playwright.config.ts <spec>`.
- Docs: `pnpm docs:test` y `pnpm docs:check --body-file <cuerpo-PR.md> --base origin/main`.
- Reglas aplicables:
  - `20-web.md`: foco atrapado y devuelto, 390 y 1440 px, sin desborde.
  - `40-componentes-ui.md`: `.btn` y sus variantes, un solo primario, sin color en las hojas de pantalla. `core/test/styles.test.ts` lo controla.
  - `04`: fuente única.
  - `05`: el lienzo 3D sigue dentro de `CanvasGuard`.
  - `01`: la lógica pura va en `@antartida/core`.

## Supuestos y decisiones

- **D1 (Lk):** todo en un solo PR.
- **D2 (Lk):** las citas `[N]` de #150 ya están acordadas con NeichS. No se comenta en #150. El PR solo dice que cubre los puntos 2 y 10 de #150.
- **D3 (Lk):** el contenedor único es `BottomSheet`, extendido con fondo, foco atrapado y devolución del foco. Océano y Fósiles dejan su `<dialog>` propio.
- **D4 (Lk):** del punto 11 se hace solo el componente de texto con soporte de `**negrita**`. Solo se marcan negritas en Ushuaia y Orcadas, sin cambiar palabras. Cada responsable marca su expedición después.
- **S1:** se crea un tipo común `CitedSource` en `core` con `id`, `title`, `org`, `url?`, `detail?`, `consulted?`, `license?` y `page?`. Cada contenido (voyage, orcadas, marine, fossils, marambio, cerro-nevado, sea `Source` de puntos) lo produce con un adaptador puro. Los datos no se tocan. Motivo: hay 7 formas de fuente distintas y la vista única necesita una sola.
- **S2:** la numeración `[N]` sale del orden de la lista que muestra `SourcesView` en cada contexto: viaje (`tripSources` o `VOYAGE_SOURCE_CODES`), Orcadas (orden de `ORCADAS_SOURCES` usadas más OSM), cada expedición (orden de su registro) y ficha de punto (orden de `point.sources`). Se reutiliza `voyageSourceNumber` y `tripSourceNumber` para el viaje. El número sale de un `SourcesContext` con `{ list, open(id) }` que reemplaza `TripContext`, `SourceContext` y los `onOpenSource` sueltos.
- **S3:** «Saber más» con hechos ocultos queda plegado. La regla del viaje de #190 se mantiene: una tarjeta que el usuario abrió para conocer el lugar muestra todo sin «Saber más».
- **S4:** la vista de fuentes de Orcadas pierde «Ver fuentes de este capítulo / todas»: la vista única lista todas las fuentes de la expedición. La definición de tipos de `KindChip` (`orc-sources-defs`) pasa a `SourcesView` para todas las expediciones.
- **S5:** el enlace a página de documento del viaje (`fact.pages`, `[N, p. X]`) se conserva dentro de `Cite`.
- **S6:** `Legend.tsx` cambia solo su `<details>` por `MoreFold`. Sus fuentes de relieve en texto libre no tienen registro en `core`. Pasarlas a `[N]` exigiría crear datos de fuente, y eso está fuera de alcance («no se agregan fuentes»). Queda anotado para #150.
- **S7:** `react-ui` no tiene pruebas de DOM. Toda lógica nueva va en `core` y se prueba ahí. Los componentes se cubren con e2e.

## Fuera de alcance

- Cambiar palabras, datos o fuentes.
- Negritas en Océano, Fósiles, Marambio, Cerro Nevado, Poncho y fichas de puntos (D4).
- Fuentes del relieve de la leyenda como `[N]` (S6).
- Pantallas que no son modales de contenido: `LoadingScreen` (`ld-actions`), `CanvasGuard` (`wn-actions`) y `Guide` (`guide-actions`). Se unifica su texto de botón solo si repite una de las acciones del punto 7.
- Fotos de Poncho (#212, majo-fflores). Solo se reemplaza su «Saber más» por `MoreFold`.

## Blast radius

- Compartidos: `BottomSheet.tsx`, `ui.tsx`, `hooks.ts`, `components.css`, `tokens.css`, `painted.css`, `point-sheet.css`, `voyage.css`, `orcadas.css`, `marine.css`, `fossils.css`, `marambio.css` y el índice de exports de `core`.
- Expediciones de otras personas: Océano, Fósiles, Marambio, Cerro Nevado y Poncho. Se avisa en #264 antes de empezar (paso 0).
- E2E con textos o clases viejas: `flow`, `marambio`, `orcadas`, `orcadas-time`, `voyage3d` y `voyage-arrival`. Además, todo spec que busque «Cerrar fuentes», `.vactions` o `.point-sheet-footer`.
- Riesgo alto: `VoyagePanel.tsx` (673 líneas) y `MarambioExpedition.tsx` (491) tienen mucha lógica de foco y de recorrido. Se migran al final de su grupo, con su e2e corrido aparte.

## Archivos

Crear:
- `packages/core/src/sources.ts`: tipo `CitedSource`, adaptadores (`voyageCited`, `orcadasCited`, `marineCited`, `fossilCited`, `marambioCited`, `cerroNevadoCited`, `pointCited`), `sourceNumber(list, id)` y `formatConsulted` (unifica `dd/mm/aaaa`, ISO y texto libre en un solo formato).
- `packages/core/src/richText.ts`: `strongParts(text)` separa `**...**`. Se combina con `quoteParts`.
- `packages/core/test/sources.test.ts` y `packages/core/test/rich-text.test.ts`.
- `packages/react-ui/src/sheet/`:
  - `MoreFold.tsx`: `<details>` con flechita.
  - `Cite.tsx`: `[N]` como botón o como enlace a página.
  - `SourcesContext.ts`.
  - `SourcesView.tsx`: vista única dentro de `BottomSheet`.
  - `SheetHeader.tsx`.
  - `SheetActions.tsx`.
  - `SheetText.tsx`: bajada, párrafos, `Quoted`, negrita y `Cite`.
- `packages/core/src/styles/sheet.css`: estilos de layout de los componentes `sheet/`. Sin colores sueltos: usa tokens. Se importa en `index.css`.
- `docs/decisiones/DEC-264-modales-normalizados.md`.

Modificar:
- `BottomSheet.tsx`: fondo propio y foco atrapado.
- `ui.tsx`: `Quoted` usa `strongParts`.
- `voyage/Fact.tsx`: pasa a envolver `Cite`, o se elimina si queda sin uso.
- `voyage/VoyagePanel.tsx`, `voyage/PonchoIntro.tsx`.
- `orcadas/FactList.tsx`, `SourcesPanel.tsx` (se elimina), `TourCard.tsx`, `MonthStrip.tsx`, `Journey.tsx`, `Answer.tsx`, `OrcadasIntro.tsx`, `OrcadasExpedition.tsx`, `observation/Observation.tsx`.
- `marine/MarineExpedition.tsx`, `fossils/FossilExpedition.tsx`, `marambio/MarambioExpedition.tsx`, `cerronevado/CerroNevadoExpedition.tsx`.
- `map/PointSheet.tsx`, `map/Legend.tsx`, `map/NextCard.tsx`, `map/ClaimsControl.tsx`.
- CSS: `components.css`, `painted.css`, `point-sheet.css`, `voyage.css`, `orcadas.css`, `marine.css`, `fossils.css`, `marambio.css`. Se borra lo que quede huérfano.
- Datos con negritas (D4): `core/src/content/ushuaia.ts` y `core/src/content/orcadas.ts`.
- E2E listados en el blast radius.
- Docs: `DESIGN.md`, `.agents/rules/project/40-componentes-ui.md` (componentes de modal), `docs/decisiones.md` (índice).

Eliminar:
- `orcadas/SourcesPanel.tsx`.
- `SourcesPage` de `VoyagePanel.tsx`.
- `SourceList` de `PointSheet.tsx`.
- `SourceLink` y los `<dialog>` de Océano y Fósiles.
- Las anclas `mar-source-*` y `cn-source-*`.

## Pasos

- [x] 0. Ejecutar `gh issue develop 264 --base main --checkout`. Comentar en #264 (issue propio) qué archivos compartidos se tocan, según la regla del issue. → verificar: `git branch --show-current` empieza con `264-`, y el comentario se ve en `gh issue view 264 --comments`.
- [x] 1. Tomar la línea base. Correr `pnpm test`, `pnpm typecheck` y `E2E_GPU=1 E2E_WORKERS=4 E2E_PORT=5113 pnpm e2e`, y anotar los conteos y los fallos previos (welcome y flakes conocidos). → verificar: los conteos quedan anotados en este plan.
- [x] 2. Crear `core/src/sources.ts` con `CitedSource`, los adaptadores, `sourceNumber` y `formatConsulted`, y exportarlo. Crear su test: cada adaptador conserva título, organismo, URL y fecha. La numeración del viaje coincide con `voyageSourceNumber` y `tripSourceNumber`. Ninguna fuente usada por un dato queda fuera de su lista. → verificar: `pnpm --filter @antartida/core test sources`.
- [x] 3. Crear `core/src/richText.ts` (`strongParts`) y su test: `**x**` se separa, un `*` suelto no se toca y el texto sin marcas queda igual. Hacer que `Quoted` combine las dos partes. → verificar: `pnpm --filter @antartida/core test rich-text quotes`.
- [x] 4. Extender `BottomSheet`: fondo (`.sheet-scrim`) que cierra al tocar, foco atrapado con Tab y Shift+Tab y devolución del foco con `useFocusReturn`. Agregar la prop `scrim` (por defecto `true` en modo modal y `false` en `peek` y `modal=false`). Quitar los fondos `scrim clear`, `vscrim` y `orc-scrim` de quienes usaban `BottomSheet`. → verificar: `pnpm typecheck`, y el e2e del mapa (`map3d.spec.ts`, ficha de punto) en verde.
- [x] 5. Crear `sheet/MoreFold.tsx`, `Cite.tsx`, `SourcesContext.ts`, `SourcesView.tsx`, `SheetHeader.tsx`, `SheetActions.tsx`, `SheetText.tsx` y `styles/sheet.css`. Mover la flechita desde `details.orc-more`. Usar `.btn` y sus variantes de `components.css`. `SheetActions`: grid con columnas iguales en escritorio y columna en celular con el primario abajo. → verificar: `pnpm typecheck && pnpm --filter @antartida/core test styles`.
- [x] 6. Migrar el viaje: `VoyagePanel.tsx`, `Fact.tsx` y `PonchoIntro.tsx`. `SourcesPage` pasa a `SourcesView`. «Saber más / Ver menos» pasa a `MoreFold`. La ilustración usa `KindChip`. Se aplican `SheetHeader`, `SheetActions` y `SheetText`, y se marcan negritas en `ushuaia.ts`. → verificar: `voyage3d.spec.ts`, `voyage-arrival.spec.ts` y `flow.spec.ts` actualizados y en verde.
- [x] 7. Migrar Orcadas: `FactList` (`FactSources` pasa a `Cite`), `TourCard`, `MonthStrip`, `Journey`, `Answer` (`orc-answer-cta-row` pasa a `SheetActions`), `OrcadasIntro`, `OrcadasExpedition` (`orc-steps-nav`) y `Observation`. Se elimina `SourcesPanel.tsx` y se marcan negritas en `orcadas.ts`. → verificar: `orcadas.spec.ts`, `orcadas-time.spec.ts` y los demás `orcadas-*` en verde.
- [x] 8. Migrar las fichas: `PointSheet` (sin `SourceList`, `Cite` al final de la descripción, `KindChip`, `SheetActions` sin estilo en línea), `NextCard`, `ClaimsControl` (solo encabezado y acciones) y el `<details>` de `Legend`. → verificar: e2e de mapa y welcome (comparados con la línea base).
- [x] 9. Migrar Océano y Fósiles a `BottomSheet` y `SourcesView`. Se van la línea «Fuente», la píldora «Fuentes» (pasa a `[N]` y, si queda, a un botón de la vista) y el `<dialog>`. La foto y la historia de Fósiles pasan a `BottomSheet` con `SheetHeader`. → verificar: el spec de océano y el de fósiles, si existen; si no, smoke a 390 y 1440 px con `pnpm e2e` completo.
- [x] 10. Migrar Marambio y Cerro Nevado: sus `FactCard` usan `Cite`, sus anclas pasan a `SourcesView`, y se aplican `MoreFold`, `SheetHeader` y `SheetActions`. → verificar: `marambio.spec.ts` y el spec de Cerro Nevado en verde.
- [x] 11. Unificar los textos de botón del punto 7 en todos los modales migrados. → verificar: `rg -n "Volver al viaje|Empezar expedición|Anterior|Continuar recorrido" packages/react-ui/src` no devuelve nada fuera de contextos que no son modales (anotar las excepciones).
- [x] 12. Borrar el CSS huérfano (`.vactions`, `.point-sheet-footer`, `.orc-answer-cta-row`, `.orc-steps-nav`, `.marine-dialog*`, `.fossil-dialog*`, `.orc-sources*`, `.sheet-sources*`, `.fossil-more`, `.marine-more`, `.orc-src-*`), solo si no queda ningún uso. → verificar: un `rg` de cada clase da 0 usos en `src`, y `pnpm --filter @antartida/core test styles` pasa.
- [x] 13. Pasada visual a 390 y 1440 px de cada modal: la acción principal se ve sin scroll, no hay desborde horizontal y los botones tienen el mismo alto. Sumar un e2e chico: en cada modal, el primario es visible sin scroll y todos los `.btn` de `SheetActions` tienen el mismo alto. → verificar: el nuevo `packages/e2e/tests/sheets.spec.ts` en verde en los dos tamaños.
- [x] 14. Escribir la documentación: `DEC-264` con el formato de `docs/control-documentacion.md`, el índice en `docs/decisiones.md`, `DESIGN.md` y la regla 40 (componentes de modal). → verificar: `pnpm docs:test`.

## Tests nuevos

- `packages/core/test/sources.test.ts`: los adaptadores conservan los campos, la numeración coincide con la del viaje y ningún dato pierde su fuente (todo id citado existe en la lista de su contexto).
- `packages/core/test/rich-text.test.ts`: `strongParts` y la combinación con `quoteParts`. Quitar las marcas devuelve el texto original sin cambio de palabras.
- `packages/e2e/tests/sheets.spec.ts`: Escape, tocar afuera y foco devuelto en un modal de cada tipo (ficha, viaje, Orcadas y Océano). En cada uno, `[N]` abre la vista de fuentes con esa fuente resaltada (`aria-current`). El primario se ve sin scroll a 390 px y los botones tienen el mismo alto.

## Verificación final

```sh
pnpm test && pnpm typecheck && pnpm build
E2E_GPU=1 E2E_WORKERS=4 E2E_PORT=5113 pnpm e2e   # fallos: repetir solos con workers=1 antes de culpar al cambio
pnpm docs:check --body-file <cuerpo-PR.md> --base origin/main
```

PR con `Closes #264`, la mención de que cubre los puntos 2 y 10 de #150 y la declaración de impacto documental.

## Preguntas abiertas: 0
