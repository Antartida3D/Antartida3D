# Plan: encabezado común de expediciones, selector de mes en la fila de «Mapa» y botones solos a todo el ancho (#297)

Rama: `297-encabezado-común-de-expediciones-como-océano-selector-de-mes-en-la-fila-de-mapa-y-botones-solos-a-todo-el-ancho`.

## Objetivo y criterio de éxito

1. Un solo componente `ExpeditionTop` dibuja el encabezado de Océano, Orcadas, Fósiles, Marambio y Cerro Nevado. Ningún `.tsx` repite el marcado `<header className="orc-top">`.
   - Verificar: `grep -rn 'className="orc-top"' packages/react-ui/src` devuelve solo `ExpeditionTop.tsx`.
2. El encabezado se ve como el de Océano tras #283: sin barra, sin borde ni fondo, sin título. «Mapa» y sus acciones a la izquierda; capítulos a la derecha en escritorio.
3. En celular vertical (`max-width: 899px` y `min-height: 501px`) no se ven los capítulos en ninguna expedición. En celular horizontal (`max-height: 500px`) se siguen viendo, como en Océano.
4. El selector de mes de Orcadas y Marambio es un chip en la fila de «Mapa», en escritorio y en celular. Al tocarlo se despliega la tira de 12 meses, la leyenda y «Saber más», sin salirse de la pantalla a 360, 390 y 1440 px.
5. «Saltar viaje» y todo botón que quede solo en una barra, un panel o un modal ocupan todo el ancho de su contenedor, en celular y en escritorio.
6. «Continuar: Estación Orcadas» entra completo en el botón a 360 y 390 px, en dos líneas si hace falta.
7. `pnpm test && pnpm typecheck`, `pnpm build` y los e2e de las expediciones en verde, salvo los fallos que ya están en `main` (paso 0).

## Entorno detectado

- Tests: `pnpm test` (incluye `docs:test` y Vitest de `core` y `react-ui`).
- Tipos: `pnpm typecheck`. Build: `pnpm build`.
- E2E: desde `apps/dibujado`, `pnpm exec playwright test -c ../../packages/e2e/playwright.config.ts <specs>`. Para ir más rápido: `E2E_GPU=1 E2E_WORKERS=4 E2E_PORT=5113`. Proyectos: `mobile` (390×844), `desktop` (1440×900), 360×740 y 844×390.
- Docs: `pnpm docs:test` y `pnpm docs:check --body-file <cuerpo-del-PR.md> --base origin/main`.
- Reglas: `40-componentes-ui.md` (una sola definición de botón; la hoja de una pantalla solo acomoda: ancho, alto, margen); `AGENTS.md` (sin borde izquierdo pintado); `20-web.md` (teclado, foco, sin desborde horizontal); `05` (`CanvasGuard`); idioma: código en inglés, documentos en español.
- Guardián de estilos: `packages/core/test/styles.test.ts` falla si una hoja de pantalla da color, fondo o borde a `.btn`.

## Supuestos y decisiones

- **D1 (Lk):** «Fuentes» queda como acción opcional del componente. Orcadas, Fósiles, Marambio y Cerro Nevado lo conservan; Océano sigue sin él.
- **D2 (Lk):** el selector de mes va en la fila de «Mapa». En escritorio, dentro del encabezado, entre las acciones y los capítulos. En celular, a la derecha de «Mapa».
- **D3 (Lk):** en escritorio el selector de mes también es el chip con desplegable. La tarjeta de 380 px no entra en la fila. Cambiar el mes cuesta un clic más.
- **D4 (Lk):** «Continuar» en celular pasa a dos líneas si el título no entra.
- **D5 (Lk):** todo botón solo en una barra, un panel o un modal ocupa todo el ancho, en celular y en escritorio.
- **S1 (agente):** el componente no dibuja el título ni la pregunta guía, igual que Océano (`marine.css` los ocultaba). La pregunta ya aparece en la primera parada del panel (Marambio, Cerro Nevado), en la introducción y en «Responder» (Orcadas). La región de la expedición ya tiene su nombre (`aria-label`).
- **S2 (agente):** el componente vive en `packages/react-ui/src/ExpeditionTop.tsx`, junto a `sceneFrame.tsx`, que ya describe «la barra superior compartida». No se exporta en `index.ts` porque solo lo usan las expediciones del mismo paquete.
- **S3 (agente):** en celular vertical se ocultan los capítulos, y «Siguiente» y «Atrás» del panel recorren las paradas, como en Océano. Saltar directo a un capítulo queda solo en escritorio y en celular horizontal.
- **S4 (agente):** la sección de Fósiles que se toca (`.fossil-interaction`) tiene `border-left` de acento, que `AGENTS.md` prohíbe. Se quita en el mismo paso, como hizo Océano (DEC-283-3).
- **S5 (agente):** el cartel de ubicación de Fósiles (`.fossil-location`) y su botón de restablecer siguen en su lugar. Bajan solos, porque usan `--scene-top`. Solo se verifica que no se encimen con la fila de «Mapa».

## Fuera de alcance

- Encabezados de «Desde Ushuaia» y Poncho: usan `.vbar` y su propio diorama, no `.orc-top`.
- Cambiar textos, capítulos o paradas de las expediciones.
- Mover el cartel de ubicación de Fósiles al estilo de Océano (se puede proponer después).
- Botones redondos de escena (`.iconbtn`, zoom, restablecer), píldoras y chips de capítulo: no son botones de acción de un panel.

## Blast radius

- Código: `MarineExpedition.tsx`, `OrcadasExpedition.tsx`, `FossilExpedition.tsx`, `MarambioExpedition.tsx`, `CerroNevadoExpedition.tsx`, `MonthStrip.tsx` (lo usan Orcadas y Marambio), `MapView.tsx` («Saltar viaje», «Continuar»).
- Estilos: `orcadas.css` (`.orc-top`, `.orc-steps*`, `.orc-month-*`), `marine.css`, `fossils.css`, `marambio.css` (`.orc-month-strip-wrap` en `.mar`), `painted.css` (`.btn.resume`), `voyage.css` (`.vbar .row`), `cartography.css` (`.orc-top` en modo de alto contraste).
- `useSceneFrame` mide el alto de la barra con el `ref` del encabezado (`--scene-top`). Si la barra es más baja, la escena gana alto sola. Orcadas no le pasa `ref`; Marambio tampoco.
- E2E que dependen de lo que cambia:
  - Capítulos en celular: `orcadas.spec.ts` (243, 429–733), `orcadas-century.spec.ts`, `orcadas-observation.spec.ts`, `orientation.spec.ts:155`, `fossils.spec.ts:20`.
  - Selector de mes: `orcadas-time.spec.ts` (54–135: rama de escritorio con la tira siempre visible; cierre del desplegable con clic en `.orc-top-title`), `orcadas-gestures.spec.ts:56` (`.orc-month-strip-wrap` como límite de la escena), `orcadas.spec.ts:567`, `marambio.spec.ts`.
  - «Saltar viaje»: `orcadas-arrival.spec.ts:77,94`.

## Archivos

- Crear: `packages/react-ui/src/ExpeditionTop.tsx`, `packages/e2e/tests/expedition-top.spec.ts`, `docs/decisiones/DEC-297-encabezado-comun-de-expediciones.md`.
- Modificar: las cinco expediciones, `MonthStrip.tsx`, `MapView.tsx`, `orcadas.css`, `marine.css`, `fossils.css`, `marambio.css`, `painted.css`, `voyage.css`, y los demás archivos de estilos que salgan de la revisión del paso 8. También los e2e de la lista anterior y `.agents/rules/project/40-componentes-ui.md`.
- Eliminar: nada. Las reglas `.orc-top-title*` de `orcadas.css` quedan sin uso y se borran.

## Pasos

- [x] 0. Línea base. Desde la raíz: `pnpm test && pnpm typecheck`. Anotar el conteo de tests. Desde `apps/dibujado`, correr los e2e de `marine fossils orcadas orcadas-time orcadas-gestures orcadas-century orcadas-observation orcadas-arrival marambio cerronevado orientation sheets`. Anotar los fallos que ya están en `main`; según projectmem, fallan `orientation:30`, `zoom-limits:176`, `intro:183` y `fossils:141` (inestable).
  → verificar: la lista de fallos previos queda escrita en el issue #297 o en las notas del PR.
  > Enmienda: línea base de `main` (build nuevo): fallaban `marine:114`, `marine:158`, `marine:167`, `orientation:173` y `orientation:234` (Poncho, inestable). Unitarios: 747 de `core` y 712 de `react-ui`. Lk pidió arreglarlos en esta rama (están desactualizados desde #283).

- [x] 1. `packages/react-ui/src/ExpeditionTop.tsx`: crear el componente.
  ```tsx
  export interface ExpeditionChapter { id: string; label: string; current: boolean; visited?: boolean }
  export function ExpeditionTop({ topRef, onMap, actions, tools, chapters, chaptersLabel, onChapter }: {
    topRef?: Ref<HTMLElement>; onMap: () => void;
    actions?: ReactNode;   // pills after «Mapa», e.g. «Fuentes»
    tools?: ReactNode;     // the month chip; on a phone at the far right of the row
    chapters?: readonly ExpeditionChapter[]; chaptersLabel?: string; onChapter?: (id: string) => void;
  })
  ```
  Marcado: `header.orc-top` > `div.orc-top-r1` («Mapa» como `pill orc-top-btn` con `Icon.back` y `aria-label="Volver al mapa"`, luego `actions`, luego `div.orc-top-tools` con `tools`) y, si hay `chapters`, `nav.orc-steps-nav[aria-label=chaptersLabel]` con la misma lista `ol.orc-steps` de hoy. Cada botón lleva `is-current`/`is-visited`, `aria-current="step"` y `aria-label="N Nombre"`.
  → verificar: `pnpm typecheck`.

- [x] 2. `packages/core/src/styles/orcadas.css`: pasar a `.orc-top` las reglas que Océano tenía en `marine.css:9-12`. Sin fondo, sin `border-bottom`, sin sombra. `pointer-events: none` en la fila y `auto` en sus botones. Borrar las reglas `.orc-top-title*` (tres bloques: base, escritorio y celular horizontal). Agregar `.orc-top-tools { margin-left: auto; position: relative; }` en celular. En escritorio va antes de los capítulos, que ya tienen `margin-left: auto`. En `@media (max-width: 899px) and (min-height: 501px)`: `.orc-steps-nav { display: none; }`. `cartography.css:3,60`: revisar que `.orc-top` en alto contraste no vuelva a pintar una barra; si la pinta, quitar `.orc-top` de esa lista.
  → verificar: `pnpm --filter @antartida/core test` (`styles.test.ts`).

- [x] 3. Océano: `MarineExpedition.tsx:204-221` pasa a `<ExpeditionTop topRef={top} onMap={() => onLeave(false)} chapters={…} chaptersLabel="Capítulos de Océano" onChapter={(id) => dispatch({ type: 'chapter', chapter: id })} />`. En `marine.css` borrar las líneas 9–12 y 30, que ya cubre `orcadas.css`.
  → verificar: e2e `marine sheets` en `mobile` y `desktop` sin cambios de comportamiento. En una captura a 390 y 1440 px, Océano se ve igual que en `main`.

- [x] 4. Fósiles: `FossilExpedition.tsx:198-214` pasa a `ExpeditionTop`, con «Fuentes» en `actions` (con su `ref` y `aria-haspopup="dialog"`) y `visited` desde `visitedChapters`. En `fossils.css:66-67`: quitar `border-left` y el `padding-left` que lo acompaña (S4), y dar `width: 100%` a `.fossil-action` (D5). Adaptar `fossils.spec.ts:20`: en `mobile` ir a cada capítulo con «Siguiente», con el mismo helper que `marine.spec.ts` (`goToChapter`, líneas 40–46 de ese spec).
  → verificar: e2e `fossils` en `mobile` y `desktop`. A 390 px, `.fossil-location` y `.fossil-reset` no se enciman con la fila de «Mapa» (captura).

- [x] 5. `MonthStrip.tsx`: usar siempre el modo chip con desplegable (D3). Borrar la rama `isDesktop ? stripBody : …` y dejar solo la del chip. Mantener el cierre al tocar afuera, el foco de vuelta al chip, `Escape` y las flechas en todos los tamaños. Quitar `useIsDesktop` si deja de usarse. Estilos en `orcadas.css`:
  - `.orc-top .orc-month-strip-wrap { position: relative; top: auto; left: auto; width: auto; }`, en todos los tamaños y también en celular horizontal.
  - `.orc-top .orc-month-popover { left: auto; right: 0; width: min(420px, calc(100vw - 16px)); }` en celular, para que no se salga por la derecha. En escritorio, `left: 0` con 420 px, y `max-height` que no pase el panel.
  - Borrar `.orc-month-strip-wrap` de la base (`top: 114px`) y de escritorio (`top: 86px; width: 380px`), que quedan sin uso. También `.mar .orc-month-strip-wrap` de `marambio.css:85`.
  → verificar: `pnpm --filter @antartida/react-ui test` y `pnpm typecheck`.

- [x] 6. Orcadas: `OrcadasExpedition.tsx:550-608` pasa a `ExpeditionTop`, con «Fuentes» en `actions` (conserva `aria-expanded={s.panel}` y su `onClick`) y `<MonthStrip …/>` (hoy en la línea 504) en `tools`. Los capítulos salen de `CHAPTERS`/`CHAPTER_NAMES`, con `visited`. Adaptar los e2e:
  - `orcadas.spec.ts`, `orcadas-century.spec.ts`, `orcadas-observation.spec.ts` y `orientation.spec.ts:155`: en `orcadas-helpers.ts`, agregar `gotoOrcadasChapter(page, name)`. Toca el capítulo en el encabezado si `nav` está visible; si no, avanza con el botón principal del panel hasta que el título del capítulo sea `name`.
  - `orcadas-time.spec.ts`: quitar la rama de escritorio con la tira siempre visible; en los dos tamaños se abre el chip. Reemplazar el clic en `.orc-top-title` por un clic en la escena, fuera del desplegable.
  - `orcadas-gestures.spec.ts:56`: usar `.orc-top` como límite superior en lugar de `.orc-month-strip-wrap`.
  → verificar: e2e `orcadas orcadas-time orcadas-gestures orcadas-century orcadas-observation orcadas-arrival` en los cuatro proyectos.

- [x] 7. Marambio y Cerro Nevado: `MarambioExpedition.tsx:400-414` y `CerroNevadoExpedition.tsx:165-179` pasan a `ExpeditionTop`, sin capítulos y con «Fuentes» en `actions`. En Marambio, `<MonthStrip …/>` (línea 360) pasa a `tools`. Cerro Nevado conserva `topRef`.
  → verificar: e2e `marambio cerronevado` en `mobile` y `desktop`; `grep -rn 'className="orc-top"' packages/react-ui/src` solo encuentra `ExpeditionTop.tsx`.
  > Enmienda: Cerro Nevado ya es una ficha y `CerroNevadoExpedition.tsx` no la monta nadie. Lk pidió borrarla en vez de migrarla.

- [x] 8. Botones solos a todo el ancho (D5). Revisar cada caso y corregir en la hoja de su pantalla, solo con ancho o `flex` (regla 40.3):
  - «Saltar viaje», `MapView.tsx:148`: el botón ocupa toda la fila, con `.vbar .row.end > .btn:only-child { flex: 1; }` en `voyage.css`.
  - «Próximo hito» (`.vgo`, `VoyagePanel.tsx`): comprobar que llena la fila cuando está solo. Ya tiene `flex: 1`.
  - `.fossil-action` (paso 4), `.orc-obs-confirm-btn` (`orcadas-observation.css:509`), `.orc-panel-hide` (`orcadas.css:1355`), `.ld-actions` con un solo botón (`loading.css:324`, «Ver en 2D») y `.webgl-note .wn-actions` con solo «Entendido» (`painted.css:387`).
  - Los `SheetActions` con un solo botón ya llenan el ancho (`sheet.css:28`, grilla `1fr`): solo se comprueban.
  - Fuera: `.pdio-map` y «Mapa» (navegación de esquina), `.mar-storm-btn` (interruptor sobre la escena), chips y botones de capítulo.
  > Enmienda: `.orc-panel-hide` comparte fila con el título del panel, no es un botón solo: queda fuera.

  Para no depender de la vista, agregar `packages/e2e/tests/expedition-top.spec.ts` con una función que recorra `.btn` visibles. Si un `.btn` es el único `.btn` visible de su contenedor de acciones (`.row`, `.sheet-actions`, `.ld-actions`, `.wn-actions`, `.fossil-interaction`, `.orc-obs-*`), debe medir al menos el 95 % del ancho interior del contenedor. La función se llama en el viaje a Isla Laurie, en cada expedición abierta y en la pantalla de carga.
  → verificar: `expedition-top.spec.ts` en `mobile` y `desktop`; `orcadas-arrival.spec.ts`.

- [x] 9. «Continuar» en celular, `painted.css:479-484`: quitar `white-space: nowrap` de `.btn.resume:not(.next-btn)`. Usar `white-space: normal; text-wrap: balance; line-height: 1.15; text-align: center`. El botón ya ocupa la fila, con `min-width: 100%` en la línea 490. La flecha queda con `flex: none`. En `expedition-top.spec.ts`, agregar un caso a 360 y 390 px: guardar un avance de Orcadas con la misma clave que usa `orientation.spec.ts` para reanudar, cargar el mapa y comprobar que `scrollWidth <= clientWidth` del botón y que su caja queda dentro de la pantalla.
  → verificar: ese caso pasa; `orientation.spec.ts` sigue verde.

- [x] 10. Documentación:
  - `docs/decisiones/DEC-297-encabezado-comun-de-expediciones.md` con el formato de `docs/control-documentacion.md`. Registrar D1–D5, S1 y S3, y que extiende a todas las expediciones la barra sin fondo de Océano (DEC-283).
  - `.agents/rules/project/40-componentes-ui.md`: sumar dos reglas. El encabezado de expedición es `ExpeditionTop`, no un `<header className="orc-top">` propio. Un botón solo en una barra, un panel o un modal ocupa todo el ancho.
  - `DESIGN.md`: actualizarlo si describe la barra superior o el selector de mes. Buscar con `grep -n "barra superior\|MonthStrip\|selector de mes" DESIGN.md docs -r`.
  → verificar: `pnpm docs:test`.
  > Enmienda: Lk pidió también unificar el cartel de ubicación (`SceneLocation`) y la nota `.scene-found`, subir el encabezado sobre los hotspots (el desplegable del mes quedaba bajo los puntos amarillos) y volver a la vista general al salir de un viaje. Todo consta en DEC-297.

- [ ] 11. Verificación final y entrega. `git rebase origin/main`; `pnpm test && pnpm typecheck && pnpm build`; e2e completos (`pnpm e2e`, o con `E2E_GPU=1 E2E_WORKERS=4 E2E_PORT=5113`). Comparar con la línea base del paso 0. Hacer capturas a 390 y 1440 px de las cinco expediciones para el PR. Abrir el PR con `Closes #297` y la declaración documental, y pasar `pnpm docs:check --body-file <cuerpo>.md --base origin/main`.
  → verificar: sin fallos nuevos respecto del paso 0.

## Tests nuevos

- `packages/e2e/tests/expedition-top.spec.ts`:
  - En `mobile`, ninguna de las cinco expediciones muestra `nav.orc-steps-nav`. En `desktop`, la muestran las que tienen capítulos (Océano, Orcadas, Fósiles).
  - El encabezado no tiene fondo ni borde: el color de fondo calculado de `.orc-top` es `rgba(0, 0, 0, 0)`.
  - En Orcadas y Marambio, el chip de mes está dentro de `.orc-top` en `mobile` y en `desktop`. Su desplegable queda dentro de la pantalla.
  - Los botones solos ocupan al menos el 95 % del ancho de su contenedor (paso 8).
  - «Continuar» con un título largo no se desborda a 360 y 390 px (paso 9).
- Adaptados: los e2e de Orcadas, Fósiles y el selector de mes (pasos 4–6).

## Verificación final

`pnpm test && pnpm typecheck && pnpm build`, y `pnpm e2e` sin fallos nuevos respecto de la línea base del paso 0.

## Preguntas abiertas: 0
