# Plan: pantalla de carga cartográfica en azul con dato real y acciones de primera visita (#276)

Rama: `276-pantalla-de-carga-cartográfica-en-azul-con-dato-real-y-acciones-de-primera-visita`.
El PR incluye `Closes #276` y la declaración de impacto documental.

## Objetivo y criterio de éxito

1. Restaurar la pantalla de carga cartográfica sobre fondo papel (`--paper`, `#F3EBDD`) con la ilustración SVG centrada de la Antártida (`AntarcticaIllustration`), sin el póster 3D (`Poster.tsx`, `build-loader-poster.ts`, `pnpm poster` y los `.webp` / `.json` del póster).
2. Reemplazar los acentos naranjas (`#A4471F`) por la paleta azul del mapa usando tokens de `tokens.css`: `--deep` (`#1E3E5C`) en barra de progreso, pasos completados, pulso, halo y estado `Mapa listo`; `--glacier` (`#7FA8C4`) en barreras de hielo del SVG y paso activo; `--ink` (`#1F2A36`) en costas; `--oxide` solo para mensajes de error. Borde único con `--chart-radius` (regla 40 / DEC-234).
3. Mantener los textos llanos actuales en los cinco pasos (`LOADER_STEP_TEXT`) y el ritmo de avance (`LOADER_STEP_MS = 450`, `LOADER_FADE_MS = 400`, `pacedSteps`), sin espera artificial extra.
4. Mostrar «Mientras tanto · dato real» (`loaderFact`) debajo de los pasos mientras carga.
5. En primera visita (`firstVisit`), al finalizar la carga mantener visible la cabecera, la barra al 100 % y los cinco pasos completados, y reemplazar el bloque inferior por «Mapa listo», el título/texto de `READY_CARD` y los botones `Sin guía` (`.btn`) y `Exploración guiada` (`.btn.primary`).
6. Conservar el respaldo automático al mapa 2D (`unavailable3D` / error 3D: «Seguimos con el mapa en 2D» sin dato real y con barra de dos pasos) y el comportamiento con `prefers-reduced-motion: reduce`.
7. Actualizar documentación (`DEC-258` reemplazada por `DEC-276`, `docs/diseno/pantalla-carga.md`, `README.md`) y pruebas (`core`, `e2e` en `loading.spec.ts` e `intro.spec.ts`).
8. `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm docs:test`, `pnpm docs:check` y pruebas E2E de carga e intro en verde sin errores de consola.

## Pasos de implementación

1. **Core (`packages/core`):**
   - Quitar `POSTER_SOLID` y `posterReveal` de `src/loading.ts` y restaurar `splitAntarcticaCoastline`.
   - Actualizar `test/loading.test.ts` (pruebas de `splitAntarcticaCoastline`, sin pruebas del póster).
   - Quitar script `poster` de `package.json` y `packages/core/package.json`, y borrar `packages/core/scripts/build-loader-poster.ts` y `packages/core/src/assets/loader-poster*`.
2. **HTML y estilos (`apps/dibujado/index.html`, `packages/core/src/styles/loading.css`):**
   - Quitar los `<link rel="preload">` del póster en `index.html` y devolver `theme-color` y `body` a `#F3EBDD`.
   - Reescribir `loading.css` con tokens de `tokens.css`, fondo `--paper`, tarjeta con borde único y radio `--chart-radius`, pasos azules (`--deep` / `--glacier`), estilos de `.ld-extra` (`.ld-fact` y bloque `Mapa listo` + `.ld-actions`) sin violar la regla 40 (`styles.test.ts`).
3. **Componente React (`packages/react-ui/src/loading/LoadingScreen.tsx`):**
   - Borrar `packages/react-ui/src/loading/Poster.tsx`.
   - Restaurar `AntarcticaIllustration` con `ANTARCTICA_PATH`, `ICE_SHELVES_PATH` y `splitAntarcticaCoastline`.
   - Mantener `pacedSteps`, `firstVisit`, `unavailable3D`, manejo de foco/Escape/Tab y `loaderFact`.
   - Renderizar siempre cabecera, barra y lista de pasos (usando `LOADER_STEP_TEXT` / `LOADER_STEP_TEXT_2D`) y alternar el bloque inferior entre `.ld-fact` durante la carga y `READY_CARD` con `Sin guía` / `Exploración guiada` al completar la primera visita.
4. **Pruebas E2E (`packages/e2e/tests/loading.spec.ts`, `packages/e2e/tests/intro.spec.ts`):**
   - Adaptar aserciones de `loading.spec.ts` a la ilustración SVG, pasos llanos, fondo `--paper`, dato real, fallback 2D sin dato real y tiempos actuales.
   - Ajustar en `intro.spec.ts` la búsqueda del título de `READY_CARD` (`<h2>` en lugar de `<h1>`).
5. **Documentación (`docs/decisiones/DEC-258-pantalla-de-carga.md`, `docs/decisiones/DEC-276-carga-cartografica-azul.md`, `docs/diseno/pantalla-carga.md`, `README.md`):**
   - Marcar `DEC-258` como `superseded` por `DEC-276`, crear `DEC-276`, actualizar `pantalla-carga.md` y registrar el uso de IA en `README.md`.
6. **Verificación final:**
   - Correr `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm docs:test`, `pnpm docs:check` y E2E (`loading.spec.ts` e `intro.spec.ts`).
