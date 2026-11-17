# Plan: carta de presentación en la primera visita (#256)

Rama: `256-carta-de-presentación-explicar-qué-es-la-aplicación-y-cómo-se-usa-en-la-primera-visita`.
Fuente de verdad del diseño: `carta-presentacion/README.md`. Las capturas (`carta-presentacion/capturas/*.png`) son la referencia visual. Las maquetas HTML no se copian: se usan los tokens y los componentes del proyecto.

## Objetivo y criterio de éxito

1. En la primera visita, cuando se cierra la pantalla de carga y la página se asienta, aparece la carta. En escritorio (≥ 820 px) es una sola hoja modal de 760 px centrada sobre el mapa oscurecido. En celular (< 820 px) es una hoja inferior con tres páginas.
2. La carta es un diálogo accesible: `role="dialog"`, `aria-modal`, foco atrapado, Escape y «atrás» del navegador la cierran, y el foco vuelve al mapa o al botón «?».
3. Todas las salidas guardan que se vio, con la clave nueva `antartida:intro`: «Explorar por mi cuenta», «Empezar en Ushuaia», X, Escape, «Saltar» y el velo. También la ve quien ya vio la bienvenida vieja.
4. «Empezar en Ushuaia» hace el acercamiento existente (`welcomeView`), abre la etiqueta del pin y muestra la tarjeta «Empezá acá» con un aro y una flecha hacia el pin. La tarjeta reemplaza la pista `.hint` «Tocá Desde Ushuaia para empezar».
5. La tarjeta se cierra con «Entendido», al tocar el pin (que abre el viaje como hoy), al mover el mapa o al empezar un viaje.
6. Hay un botón «?» (`.iconbtn`) a la derecha de la cabecera en escritorio y de la píldora del registro en celular. Reabre la carta sin mover la cámara y se oculta durante un viaje o una transición.
7. Con movimiento reducido no hay animación de la hoja y la cámara se coloca directo (el comando `focus` ya respeta `reduced`).
8. Sin `localStorage` la carta sale una vez por visita y no hay errores en la consola.
9. `pnpm test`, `pnpm typecheck`, `pnpm build` y `pnpm e2e` en verde, a 390 y a 1440 px.
10. La carpeta `carta-presentacion/` queda eliminada al final.

## Entorno detectado

- Tests unitarios: `pnpm test` (incluye `pnpm docs:test` y Vitest de `@antartida/core` y `@antartida/react-ui`). Solo un paquete: `pnpm --filter @antartida/core test`.
- Tipos: `pnpm typecheck`. Build: `pnpm build`.
- E2E: `pnpm e2e`, o desde `apps/dibujado` con `pnpm exec playwright test -c ../../packages/e2e/playwright.config.ts <specs>`. En local se puede acelerar con `E2E_GPU=1 E2E_WORKERS=4 E2E_PORT=5113`. Desde `packages/e2e` el webServer no arranca.
- Docs: `pnpm docs:test` y `pnpm docs:check --body-file <cuerpo-del-PR.md> --base origin/main`.
- Reglas aplicables:
  - 20-web: diálogo con foco atrapado, Escape, movimiento reducido, sin desbordamiento, E2E a 390 y 1440.
  - 40-componentes-ui: `.btn`, `.btn.primary`, `.iconbtn`; la hoja de la pantalla solo acomoda.
  - 05-errores: `try/catch` en storage.
  - 04-fuente-única: reutilizar `trapTab`, `useFocusReturn`, `useBackLayer`, `.scrim` y `.sw` de la leyenda.
  - 01-capas: textos y lógica pura en `@antartida/core`.
  - Proyecto existente: código en inglés, docs en español.

## Supuestos y decisiones

Detalles en los que el diseño de Claude Design se equivoca o choca con el proyecto. Se corrigen así:

- **D1. «Ver como lista» ya no existe.** El botón se llama «Actividades» (`LIST_BUTTON_LABEL`, `core/src/content/points.ts:66`). Las capturas muestran el nombre viejo. El texto de la página 2 en celular pasa a: `¿Preferís leer? «Actividades» muestra todo sin el mapa.`. Se arma con `LIST_BUTTON_LABEL` para que no se desfase otra vez.
- **D2. Botón «?» de 48 px, no de 44.** `.iconbtn` mide 48 px en `components.css` y la regla 40 manda una sola definición. Se usa `.iconbtn` tal cual. El glifo «?» va en Fraunces 700, como los íconos.
- **D3. Velo del escritorio.** Se reutiliza `.scrim` (`painted.css:168`, `--chart-ink` al 28 %). No hace falta un token nuevo. Tocar el velo cierra la carta, igual que en `OrcadasIntro`.
- **D4. Pesos de fuente.** Solo hay cargados Fraunces 500, 700 y 500 cursiva, Atkinson 400 y 700, y Caveat 500 y 700 (`fonts.css`).
  - Título en Fraunces 500, a 40 px en escritorio y 30 px en celular.
  - Bajada en Fraunces 500 cursiva, a 21 y 20 px. Las maquetas la muestran más gruesa; no se agrega otro peso.
  - Rótulo en Fraunces 500, 12 px, en mayúsculas espaciadas, color `--chart-muted`.
  - Cuerpo en Atkinson 15 px. Avisos y pie en Atkinson 13 px, color `--chart-muted`.
  - Caveat 700 solo para los números 1, 2, 3 y para «Empezá acá» (`--oxide`).
- **D5. Botones.** Los de la carta son `.btn` y `.btn.primary`, y la hoja solo acomoda: ancho, alto mínimo, `white-space: nowrap`. La flecha de «Empezar en Ushuaia →» y de «Siguiente →» es `Icon.next` (`ui.tsx`), no el carácter «→». La X es `.iconbtn` con `Icon.close` y `aria-label="Cerrar"`. Las maquetas les ponen fondos y bordes propios: no se copian.
- **D6. Íconos de pin.** La leyenda no usa SVG: usa `<span className="sw"><span className="a|c" /></span>`. La carta reutiliza ese marcado y esas clases (expedición: `a`; punto de interés: `c`). Los ilustrativos de gestos (mouse, dedo) y de lista reutilizan `Icon.plus`, `Icon.list` y el resto de `ui.tsx` cuando existan. Si falta uno (mouse, mano), se agrega a `Icon` en `ui.tsx` como trazo, con el mismo `stroke`.
- **D7. Cuándo sale (confirmado por Lk, 17 nov).**
  - Sale una vez a todos los que no la vieron (`antartida:intro`), también a quien ya empezó o completó expediciones, y aunque haya un «Continuar» pendiente. Al cerrarla, «Continuar» sigue en el mapa como hoy.
  - Solo espera al mapa quieto: si hay un viaje o una transición (`voyaging`, `phase !== 'idle'`), no sale ni se marca vista, y sale en la próxima visita.
  - Espera, como hoy, a que cierre la pantalla de carga (`map3dLoaderDismissed`) y a que la página se asiente (`usePageSettled`).
  - Sale aunque la persona ya haya movido el mapa mientras cargaba. Hoy eso cancela la bienvenida, pero la carta es la explicación que falta.
  - La condición es solo `!loadIntroSeen()`. `showsWelcome` queda sin uso y se borra con su prueba (regla 04). No se crea una función para un `!seen`.
- **D15. Destino de la acción primaria (confirmado por Lk, 17 nov).**
  - El destino es la expedición sugerida `nextExpedition(explored)`. Con «Desde Ushuaia» sin hacer, es Ushuaia, y todo queda como en el diseño.
  - Si Ushuaia ya está hecha:
    - el primario dice `Empezar en <título>`;
    - el mapa se acerca a ese punto (`welcomeView` recibe el punto, con `VOYAGE_POINT` por defecto);
    - la tarjeta «Empezá acá» va sobre su pin, con su título y el texto `Tocá el punto para empezar la expedición.`;
    - la página 3 de celular dice `Te sugerimos seguir por <título>.` en lugar de la frase de Ushuaia.

    Estos dos textos son nuevos y mínimos; se marcan en el PR para revisión.
  - Con las seis expediciones completadas no hay acción de acercar: «Explorar por mi cuenta» pasa a ser el único botón y es el primario.
- **D8. «?» y el vuelo.** Abrir la carta con «?» nunca mueve la cámara. Si desde esa carta se elige «Empezar en Ushuaia», sí se acerca: es una acción explícita.
- **D9. Pista de gestos (confirmado por Lk, 17 nov).** La pista «arrastrá para mover · pellizcá para acercar» se mantiene (#249 la prueba). Se oculta mientras la carta o la tarjeta están abiertas.
- **D10. Sin `BottomSheet.tsx`.** Se evaluó: trae manija de arrastre y tamaños chico y alto que el diseño no tiene, y en pantallas anchas se vuelve tarjeta de esquina. La carta es su propio `<section role="dialog">` con las clases de superficie del proyecto.
- **D11. Celular horizontal (844×390).** Usa el diseño de escritorio, por el ancho. Se agrega `max-height: calc(100dvh - 24px)` y desplazamiento interno, sin desbordar la página.
- **D12. Cambio de página en celular.** El foco pasa al título de la página nueva (`tabIndex={-1}`). Los puntos de página son decorativos (`aria-hidden`). No se agrega deslizar con el dedo entre páginas: no está pedido.
- **D13. Posición de la tarjeta.**
  - Un `requestAnimationFrame` lee la caja del pin (`.vp [data-key="campana"]`, `VOYAGE_POINT.id`) y mueve con `transform` el aro y la tarjeta, que siguen al pin durante el vuelo.
  - La cuenta (tarjeta debajo del pin, recortada a 16 px de los bordes, flecha alineada al pin) es pura y vive en `core/src/welcome.ts` como `startHerePlacement`, con prueba.
  - Si el pin no está en pantalla, la tarjeta se oculta.
- **D14. Textos.** Los textos del README son definitivos, con la corrección D1. Viven en `core/src/content/intro.ts`. Antes de escribirlos se verificaron:
  - el botón izquierdo mueve y el derecho gira (`useMapGestures.ts:109-110`);
  - hay seis expediciones (`AVAILABLE_COUNT`);
  - el avance se guarda en `localStorage`.

## Fuera de alcance

- Un tour de globos paso a paso (descartado en el README).
- Deslizar entre páginas, sonido o animaciones nuevas fuera de la entrada de la hoja.
- Cambiar «Siguiente: Desde Ushuaia», «Continuar», la leyenda o los marcadores.
- Borrar `antartida:welcome` del almacenamiento de quien ya la tiene: es inofensivo.

## Blast radius

- `MapView.tsx`: lógica de bienvenida (`welcome`, `welcoming`, `.hint`), cabecera y sugerencia (`suggest`).
- `AntarcticaApp.tsx`: estado `welcome` y las props hacia `MapView`.
- `@antartida/core`: `storage.ts` (renombre de clave y funciones) y `welcome.ts` (`showsWelcome` pasa a `showsIntro`). Lo consumen `AntarcticaApp`, `packages/e2e/storage.ts` y las pruebas de core.
- `OrcadasIntro.tsx`: solo el import de `trapTab`, que se mueve a `hooks.ts`.
- E2E: `welcome.spec.ts` se reescribe. Las demás specs usan `welcomeSeen` y `clearStorage`, que cambian de clave sin cambiar de nombre. `ocean3d.spec.ts` (#249), `listview.spec.ts` y `touch-zoom.spec.ts` miran `.hint`, que se mantiene.
- CSS: un archivo nuevo `intro.css`, que el guardián `styles.test.ts` lee solo porque recorre la carpeta.

## Archivos

Crear:
- `packages/core/src/content/intro.ts`: textos de la carta y de la tarjeta.
- `packages/core/src/styles/intro.css`: acomodo de la carta, la tarjeta, el aro y «?».
- `packages/react-ui/src/map/IntroLetter.tsx`: la carta, en escritorio y en celular.
- `packages/react-ui/src/map/StartHere.tsx`: el aro y la tarjeta «Empezá acá».
- `packages/e2e/tests/intro.spec.ts`: reemplaza a `welcome.spec.ts`.
- `docs/decisiones/DEC-256-carta-de-presentacion.md`.

Modificar:
- `packages/core/src/storage.ts`, `packages/core/src/welcome.ts`, `packages/core/src/index.ts` (exporta `content/intro.ts` si el índice reexporta contenido).
- `packages/core/src/styles/index.css` (importa `intro.css`).
- `packages/core/test/storage.test.ts`, `packages/core/test/welcome.test.ts`.
- `packages/react-ui/src/hooks.ts` (recibe `trapTab`), `packages/react-ui/src/orcadas/OrcadasIntro.tsx` (lo importa), `packages/react-ui/src/ui.tsx` (solo si falta un ícono, D6).
- `packages/react-ui/src/map/MapView.tsx`, `packages/react-ui/src/AntarcticaApp.tsx`.
- `packages/e2e/storage.ts`.
- `docs/decisiones.md`: la sección «Bienvenida… (#115)» se marca reemplazada en parte por DEC-256.
- `README.md`: la declaración de uso de IA, si hace falta sumar este issue.

Eliminar:
- `packages/e2e/tests/welcome.spec.ts`, reemplazado por `intro.spec.ts`.
- `carta-presentacion/`, al final.

## Pasos

- [x] 1. **Línea base.** Correr `pnpm test && pnpm typecheck`, y `pnpm e2e` sobre `welcome.spec.ts` y `ocean3d.spec.ts`. Anotar el conteo y los fallos previos: según projectmem, «the welcome shows once» ya falla en `main`. → verificar: los conteos quedan anotados en el reporte final.
- [x] 2. **Clave nueva.** En `packages/core/src/storage.ts`:
  - `WELCOME_KEY` pasa a `INTRO_KEY = 'antartida:intro'`;
  - `loadWelcomeSeen` y `saveWelcomeSeen` pasan a `loadIntroSeen` y `saveIntroSeen`, con el mismo `try/catch`;
  - se actualizan `packages/core/test/storage.test.ts`, `packages/e2e/storage.ts` (`welcomeSeen` y `clearStorage` con `INTRO_KEY`) y los imports de `AntarcticaApp.tsx`.

  → verificar: `pnpm --filter @antartida/core test` y `rg -n "WELCOME_KEY|WelcomeSeen" packages` sin resultados.
- [x] 3. **Regla de cuándo sale y destino.** En `packages/core/src/welcome.ts`:
  - borrar `showsWelcome` y su prueba en `welcome.test.ts` (D7);
  - `welcomeView(size, point = VOYAGE_POINT)` recibe el punto destino (D15);
  - sumar a `welcome.test.ts` que la vista con otro punto lo deja bien dentro de la pantalla, con los mismos tamaños de la prueba actual.

  → verificar: `pnpm --filter @antartida/core test` y `rg -n showsWelcome packages` sin resultados.
- [x] 4. **Ubicación de la tarjeta.** Agregar `startHerePlacement` en `packages/core/src/welcome.ts` (D13).
  - Entrada: la caja del pin, el tamaño de la tarjeta y el del viewport.
  - Salida: `{ left, top, arrowX, visible }`.
  - Pruebas en `welcome.test.ts`: pin centrado; pin cerca del borde izquierdo y del derecho (la tarjeta queda a 16 px y la flecha sigue al pin); pin fuera de pantalla (`visible: false`).

  → verificar: `pnpm --filter @antartida/core test`.
- [x] 5. **Textos.** Crear `packages/core/src/content/intro.ts` con los textos de escritorio, de las tres páginas de celular y de la tarjeta (D1, D14), y exportarlo desde `index.ts`. → verificar: `pnpm typecheck`.
- [x] 6. **`trapTab` compartido.** Mover `trapTab` y `FOCUSABLE_SELECTOR` de `OrcadasIntro.tsx` a `packages/react-ui/src/hooks.ts`, exportarlos e importarlos en `OrcadasIntro.tsx`. → verificar: `pnpm typecheck` y `pnpm e2e` sobre los specs de Orcadas que abren la intro (`rg -l "orc-intro\|Comenzar expedición" packages/e2e/tests`).
- [x] 7. **`IntroLetter.tsx`.** Crear `packages/react-ui/src/map/IntroLetter.tsx`.
  - Props: `target` (la expedición sugerida, o `null` con las seis completadas), `onExplore`, `onStart`, `onClose`, `fallbackFocus`.
  - Destino (D15): el primario dice «Empezar en Ushuaia» o `Empezar en <título>`. Sin destino, el único botón es «Explorar por mi cuenta», como `.btn.primary`.
  - Elige el diseño con `useMediaQuery('(min-width: 820px)')`, usando `NARROW_PX` de `voyage/useVoyage.ts`.
  - Escritorio: rótulo, título (`h2`), bajada, tres pasos y aviso de fuentes; en el pie, «Volvés a esta guía…» y luego los botones `.btn` y `.btn.primary`, con la primaria a la derecha (#177).
  - Celular: tres páginas; pie con puntos y «Saltar»/«Atrás» + «Siguiente»; en la página 3, las dos acciones apiladas con la primaria abajo.
  - Foco: `trapTab` sobre el contenedor, `useFocusReturn(true, ref, '.btn.primary', fallbackFocus)` y `useBackLayer(true, onClose)`. Escape cierra. Tocar `.scrim` cierra (D3). Al cambiar de página, el foco va al título (D12).
  - Íconos: `.sw` de la leyenda e `Icon` (D5, D6).

  → verificar: `pnpm typecheck`.
- [x] 8. **`StartHere.tsx`.** Crear `packages/react-ui/src/map/StartHere.tsx`.
  - Prop: `point`, el destino de D15.
  - Contiene el aro (`aria-hidden`, sin eventos de puntero) y la tarjeta `role="status"` con «Empezá acá», el título del punto, el texto (el de Ushuaia según el ancho, o el de D15) y el botón `.btn` «Entendido».
  - Un rAF lee `.vp [data-key="<point.id>"]` y aplica `startHerePlacement` con `transform` (regla 20).

  → verificar: `pnpm typecheck`.
- [x] 9. **`intro.css`.** Crear `packages/core/src/styles/intro.css` e importarlo en `index.css`.
  - Superficie: `--chart-surface`, `--chart-shadow`, borde de 1 px `--chart-rule`, `--chart-radius`.
  - Medidas: 760 px en escritorio; celular a ancho completo, con radio solo arriba.
  - Tipografía según D4.
  - Fondos de los ilustrativos con `--chart-wash`. Sin colores hex ni líneas dobles.
  - Botones: solo acomodo (`width`, `min-height`, `white-space`).
  - Entrada de la hoja con la animación `up` existente, anulada en `@media (prefers-reduced-motion: reduce)`.
  - D11: `max-height: calc(100dvh - 24px)` y `overflow: auto`.
  - Ubicación de «?»: en escritorio, después de `.brand`, con `.reg-wrap{margin-left:auto}`; en celular, `order` para quedar a la derecha de la píldora.

  → verificar: `pnpm --filter @antartida/core test` (guardián `styles.test.ts` en verde).
- [x] 10. **`MapView.tsx`.**
  - Props: `welcome` y `onWelcomeShown` pasan a `intro` y `onIntroSeen`.
  - Estado `introOpen`. Con `intro && settled` se abre si `phase === 'idle' && !voyaging`; si no, se omite sin marcar (D7).
  - Cierre: cada salida llama a `onIntroSeen()`.
  - Destino: `target = nextExpedition(explored)`, que ya está calculado como `next`.
  - Acción primaria: `welcomeMove()` hacia `target`, `setShown(target.id)` y `setWelcoming(true)`. El efecto de `is3D` vuelve a acercar al mismo `target`.
  - Reemplazar el `.hint` de `welcoming` por `<StartHere point={target} onDone={() => setWelcoming(false)} />`. La pista de gestos se oculta con `introOpen || welcoming` (D9).
  - Botón «?» en `header.top`: `.iconbtn`, `aria-label="Cómo se usa el mapa"`, oculto si `voyaging || phase !== 'idle'`. Al tocarlo se abre la carta y se cierra la tarjeta.
  - `suggest` deja de depender de `welcome`: queda `!welcoming && !resume && !voyaging`.
  - El efecto de `is3D` (volver a acercar durante la bienvenida) queda igual.

  → verificar: `pnpm typecheck`.
- [x] 11. **`AntarcticaApp.tsx`.** `welcome` pasa a `intro`, calculado con `!loadIntroSeen()` (D7). `welcomeShown` pasa a `introSeen`, que llama a `saveIntroSeen()`. Se pasa `intro={intro && map3dLoaderDismissed}`. → verificar: `pnpm test && pnpm typecheck && pnpm build`.
- [x] 12. **E2E.** Crear `packages/e2e/tests/intro.spec.ts` (ver «Tests nuevos») y borrar `welcome.spec.ts`. Adaptar su prueba de espera a la pantalla de carga (#190): la carta nunca está abierta mientras la pantalla de carga se ve. → verificar: `pnpm exec playwright test -c ../../packages/e2e/playwright.config.ts tests/intro.spec.ts`, desde `apps/dibujado`.
- [x] 13. **Revisión visual.** Capturar a 1440×900, 390×844 y 844×390 con Playwright y Vulkan (gotcha de projectmem). Comparar con `carta-presentacion/capturas/*.png`: medidas, tipografías, botones y espacios, y corregir las diferencias que no sean errores conocidos del diseño (D1–D6). → verificar: las capturas se guardan en el scratchpad y quedan descritas en el reporte.
- [x] 14. **Docs.**
  - Crear `docs/decisiones/DEC-256-carta-de-presentacion.md` en el formato de `control-documentacion.md`, con D1, D7, D8 y D10.
  - En `docs/decisiones.md`, sección «Bienvenida… (#115)»: anotar que la pista «Tocá Desde Ushuaia» y el acercamiento automático se reemplazan por DEC-256, y conservar el texto histórico.
  - Revisar si `README.md` necesita la declaración de IA de este issue.

  → verificar: `pnpm docs:test`.
- [x] 15. **Limpieza.** `git rm -r carta-presentacion` (o `rm -r` si no está trackeada). → verificar: `git status` no la muestra y `rg -n "carta-presentacion" --glob '!.agents/plans/**'` no tiene resultados.
- [x] 16. **Verificación final y revisión.** Correr la verificación final; luego el subagente `code-reviewer` sobre el diff. → verificar: todo en verde y los hallazgos resueltos o justificados.

## Tests nuevos

Unitarios en `packages/core/test/`:
- `storage.test.ts`: `INTRO_KEY` guarda `'1'`; sin storage, `loadIntroSeen` da `false` y `saveIntroSeen` no lanza.
- `welcome.test.ts`: `welcomeView` con otro punto destino y `startHerePlacement` (centro, bordes, fuera de pantalla).

E2E en `packages/e2e/tests/intro.spec.ts`, en los perfiles de 390 y 1440 salvo que se indique:
1. Primera visita: tras la pantalla de carga aparece el diálogo «Antártida por descubrir», con `aria-modal="true"` y el foco dentro.
2. Escritorio: los tres pasos están en una sola hoja. Celular: «Siguiente» pasa de «1 de 3» a «2 de 3» y «Atrás» vuelve; en «3 de 3» están las dos acciones.
3. «Empezar en Ushuaia»:
   - el diálogo se cierra y aparece «Empezá acá» (`role="status"`) debajo del pin `campana` y dentro de la pantalla;
   - «Entendido» la cierra;
   - en otra corrida, tocar el pin abre el viaje y la tarjeta desaparece.
4. Arrastrar el mapa con la tarjeta abierta la cierra.
5. «Explorar por mi cuenta», X, Escape y «Saltar» (en celular) cierran la carta. Tras recargar no vuelve a salir y se ve «Siguiente: Desde Ushuaia».
6. Tab no sale del diálogo. Escape devuelve el foco fuera del diálogo.
7. «?» reabre la carta sin mover la cámara: la caja de un marcador no cambia. Durante un viaje «?» no está.
8. Sale también con `antartida:last` válido; al cerrarla se ve «Continuar». Con «Desde Ushuaia» completada, el primario dice `Empezar en <siguiente>` y la tarjeta queda sobre ese pin. Con las seis completadas solo está «Explorar por mi cuenta».
9. Espera a la pantalla de carga (#190): la carta nunca está abierta mientras se ve la pantalla de carga.
10. Con movimiento reducido (`page.emulateMedia({ reducedMotion: 'reduce' })`), la hoja no tiene animación (`animationName` es `none`).
11. A 844×390 la carta entra en la pantalla, sin desbordamiento horizontal, y la acción primaria es alcanzable con desplazamiento.

## Verificación final

`pnpm test && pnpm typecheck && pnpm build && pnpm e2e`, y `pnpm docs:check --body-file <cuerpo-del-PR.md> --base origin/main`.

## Preguntas abiertas: 0
