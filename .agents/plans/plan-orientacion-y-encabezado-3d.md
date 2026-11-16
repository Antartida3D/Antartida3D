# Plan: orientación en las pantallas (#186) y encabezado que tapa Orcadas en 844×390 (#191)

Rama: `186-orientación-continuar-donde-quedé-dónde-estoy-y-volver-al-mapa-en-todas-las-pantallas` (creada desde `origin/main` en `e130b5a`). Un solo PR con `Closes #186` y `Closes #191`. Los dos issues están asignados a LucasA21.

## Objetivo y criterio de éxito

1. En 844×390 el clic sobre el marcador de Orcadas en «Relieve 3D» llega al marcador. Criterio: `orcadas-arrival.spec.ts:70` pasa en `mobile-landscape` (hoy falla, reproducido: `<h1>` de `header.top` intercepta el clic).
2. Cada pantalla de expedición y el viaje del mapa muestran un título fijo con la posición dentro de la expedición. Criterio: test e2e por pantalla.
3. El viaje del mapa (Ushuaia y Poncho) tiene un «Volver al mapa» con texto visible, no solo la ✕. Criterio: test e2e.
4. Al abrir el mapa, si la última expedición abierta no se terminó, se ofrece «Continuar: <título>». Criterio: pruebas unitarias del storage y un e2e.
5. `pnpm test`, `pnpm typecheck`, `pnpm build` y los e2e tocados en verde.

## Entorno detectado

- Verificación canónica (`AGENTS.md`, regla 00): `pnpm test && pnpm typecheck`; antes del PR también `pnpm build` y `pnpm e2e`.
- E2E: se corren desde `apps/dibujado`: `E2E_PORT=5113 E2E_GPU=1 pnpm exec playwright test -c ../../packages/e2e/playwright.config.ts <spec> [--project mobile-landscape]`.
- Reglas aplicables: 04 (fuente única; storage en `@antartida/core`), 05 (`try/catch` en `localStorage`), 07 (test primero en bugs), 13, `20-web.md` (accesibilidad, teclado).
- Commits en español con `#N`. Sin `Co-Authored-By` (regla del usuario).

## Supuestos y decisiones

- D1 (usuario): entran «Dónde estoy», «Volver al mapa visible» y «Continuar donde quedé». La pista de uso permanente (4.ª idea) queda fuera.
- D2 (usuario, revisado el 16 nov): «Continuar» retoma el paso exacto (punto, parada, capítulo y parada guiada, o hito del viaje) en las seis expediciones. Reemplaza la versión inicial, que solo abría la expedición desde el comienzo.
- S1: #191 es un bug de la aplicación, no de la prueba. `.top > *{pointer-events:auto}` deja a `.brand` (solo texto) capturando clics, y en pantallas bajas queda encima de marcadores. Causa raíz única en `painted.css`; no se toca el test.
- S2: la auditoría previa muestra que ya existen: botón «Mapa» en Orcadas, Marambio y Fósiles; «Punto N de M» en Marambio; «NN / total» en Fósiles; barra de capítulos en Orcadas; «Hito N de M» en la tarjeta del viaje. Los huecos reales son: el viaje del mapa (solo ✕ y «Próximo hito», sin título fijo) y, a confirmar al ejecutar, el encabezado de Orcadas en pantallas bajas. El paso 4 los mide antes de editar para no duplicar lo existente.
- S3: «Continuar» guarda el id de la expedición al abrirla y lo borra al completarla o al volver con `leave(true)`. Si el id ya está en `explored`, no se ofrece.
- S4: sin storage disponible, «Continuar» simplemente no aparece (misma convención que `loadWelcomeSeen`).

## Fuera de alcance

- Pista «arrastrá para mover» más allá de la primera interacción.
- Restaurar lecturas y respuestas dentro de un capítulo de Orcadas.
- Menú lateral y orden sugerido (#75); botón «atrás» (#185, ya mergeado).

## Blast radius

- `painted.css` `.brand`: solo el bloque de título del mapa (`MapView.tsx:574`); no es interactivo. El `::before` del 3D ya tiene `pointer-events:none`.
- `AntarcticaApp.tsx` y `MapView.tsx` (props nuevas): compartidos; avisar en los issues si otra persona los toca.
- `VoyagePanel.tsx` (barra `vbar`): usada por Ushuaia y Poncho.

## Archivos

Modificar:
- `packages/core/src/styles/painted.css` (`.brand`)
- `packages/core/src/storage.ts` y `packages/core/src/index.ts` (clave y funciones de «última expedición»)
- `packages/react-ui/src/AntarcticaApp.tsx` (guardar/borrar, pasar `resume` a `MapView`)
- `packages/react-ui/src/map/MapView.tsx` (aviso «Continuar»)
- `packages/react-ui/src/voyage/VoyagePanel.tsx` (título fijo y «Mapa» visible en `vbar`)
- encabezados de Orcadas, Marambio y Fósiles solo si el paso 4 confirma un hueco

Crear:
- `packages/core/test/storage.test.ts` ya existe: se amplía. Tests e2e nuevos en `packages/e2e/tests/orientation.spec.ts`.

Eliminar: ninguno.

## Pasos

- [x] 1. Línea base: `pnpm test && pnpm typecheck` en la rama y anotar el conteo de pruebas unitarias. → verificar: salida en verde, conteo anotado en el PR.
- [x] 2. #191, test primero: en `packages/e2e/tests/orientation.spec.ts` agregar un test que, a 844×390 en «Relieve 3D», compruebe con `page.evaluate` (`document.elementFromPoint`) que el centro del marcador de Orcadas no cae dentro de `header.top .brand`. → verificar: el test falla antes del arreglo (`--project mobile-landscape`).
- [x] 3. #191, arreglo: en `packages/core/src/styles/painted.css` agregar `.brand{pointer-events:none}` junto a `.top > *`. → verificar: el test del paso 2 y `orcadas-arrival.spec.ts:70` pasan en `mobile-landscape`; correr también `orcadas-arrival.spec.ts` completo en `desktop` y `mobile`.
- [x] 4. #186, medición previa: abrir cada pantalla (viaje Ushuaia, viaje Poncho, Orcadas, Marambio, Fósiles) a 390×844 y 844×390 y anotar en el PR qué título con posición y qué «Volver al mapa» con texto ya se ven. No editar. → verificar: lista de huecos concreta; si no hay hueco en una pantalla, no se toca.
- [x] 5. #186 «Dónde estoy», viaje: en `VoyagePanel.tsx` (barra `vbar`, junto a `tripLine`) mostrar título fijo `Desde Ushuaia · hito k/N` (o `Poncho · hito k/N`) con `state.reached` y `voyageStops(state.kind).length`, reusando la fuente de datos de `tripLine`. → verificar: test e2e en `orientation.spec.ts` que avanza un hito y lee el texto; `pnpm --filter @antartida/react-ui typecheck`.
- [x] 6. #186 «Volver al mapa», viaje: en la misma barra, el botón `vexit` pasa de solo ✕ a ✕ con texto «Mapa» (conservando `aria-label="Salir del viaje"`). Debe seguir cabiendo a 390 px. → verificar: e2e que localiza el botón por nombre y lo pulsa; revisar captura a 390×844.
  > Enmienda: pasos 5 y 6 sin efecto. Tras rebasar sobre `origin/main` (#190, ya mergeado), el viaje oculta a propósito el título y el registro, tiene «Salir» con texto arriba a la derecha y la tarjeta de cada hito ya dice «Hito N de M». Se descartaron los cambios hechos en `VoyagePanel.tsx` y `voyage.css` y sus tests.
- [x] 7. #186 huecos de los demás encabezados: aplicar solo lo que el paso 4 haya marcado (por ejemplo posición «capítulo i de n» en el encabezado de Orcadas en pantallas bajas), reusando `CHAPTER_NAMES`/`CHAPTERS`. → verificar: e2e por cada pantalla tocada; `orcadas.spec.ts`, `marambio.spec.ts`, `fossils.spec.ts` siguen en verde.
  > Enmienda: sin cambios. La medición del paso 4 (capturas a 844×390 y 390×844) muestra que Orcadas (barra de capítulos y «Capítulo 1 de 4»), Marambio («Punto 1 de 6») y Fósiles («NN / total») ya tienen título con posición y botón «Mapa» con texto. El único hueco era el viaje.
- [x] 8. #186 «Continuar», core: en `storage.ts` agregar `LAST_EXPEDITION_KEY = 'antartida:last'`, `loadLastExpedition()` (devuelve el id solo si es una cadena) y `saveLastExpedition(id | null)`, ambos con `try/catch`; exportar en `index.ts`. → verificar: pruebas en `packages/core/test/storage.test.ts` (valor válido, valor corrupto, storage que lanza) con `pnpm --filter @antartida/core test`.
- [x] 9. #186 «Continuar», app: en `AntarcticaApp.tsx` guardar el id en `begin(...)`; borrarlo en `complete(...)`; calcular `resume` (id guardado, es una expedición abrible y no está en `explored`) y pasarlo a `MapView`. → verificar: `pnpm typecheck`.
- [x] 10. #186 «Continuar», UI: en `MapView.tsx` mostrar, solo con `phase === 'idle'`, sin viaje activo y fuera de la bienvenida de primera visita, un botón «Continuar: <título>» que llama a `onStart(point)` del punto guardado; accesible por teclado y sin tapar la leyenda ni el `hint`. → verificar: e2e en `orientation.spec.ts`: abrir Marambio, volver con «Mapa», recargar, ver el botón, pulsarlo y llegar a la expedición; tras terminarla no aparece; con `localStorage` bloqueado no hay error de consola.
- [x] 11. Revisar duplicados de bugs (regla 15) y rebase: `.agents/scripts/bug-issue-check.sh pointer-events`, `git fetch && git rebase origin/main`. → verificar: sin conflictos.
- [x] 12. Documentación (declaración de impacto del PR): anotar en `docs/decisiones.md` la decisión «Continuar retoma solo la expedición» en el formato de `docs/control-documentacion.md`. → verificar: `pnpm docs:test` y `pnpm docs:check --body-file <cuerpo>.md --base origin/main`.
- [ ] 13. Verificación final y PR con `Closes #186` y `Closes #191`. → verificar: ver abajo.

## Tests nuevos

- `packages/core/test/storage.test.ts`: última expedición (válido, corrupto, storage bloqueado).
- `packages/e2e/tests/orientation.spec.ts`: marcador de Orcadas no tapado a 844×390; título con posición en el viaje; «Mapa» visible en el viaje; flujo de «Continuar» (aparece, abre, desaparece al completar, no rompe sin storage).

## Verificación final

`pnpm test && pnpm typecheck && pnpm build`, luego `pnpm e2e` completo (con `E2E_GPU=1 E2E_WORKERS=4 E2E_PORT=5113` desde `apps/dibujado`) y los dos comandos de `docs:`.

## Preguntas abiertas: 0
