# Plan: temperatura actual en la ficha de cada punto (#22)

Rama: `22-temperatura-actual-en-la-ficha-de-cada-punto-del-mapa`. Especificación completa en el issue #22 (fuente de verdad). Este plan solo fija el orden de trabajo y los chequeos.

## Decisiones tomadas (revisar antes de aprobar)

1. **Alcance:** solo `MapPoint` (los 12 de `PTS`). Los `SeaPoint` (fauna del mar) no tienen coordenadas en el mapa propio: quedan fuera.
2. **Unidad:** hoy la app no tiene sistema de idioma (`es-AR`), así que siempre °C. `formatTemperature(c, locale)` queda con °F probada en core, sin conectarla a la UI.
3. **Poncho** ("ubicación a definir"): se muestra con su posición provisoria, con la etiqueta de estimación de modelo. Si preferís ocultarlo, es una línea en el hook.
4. **Sin caché en `localStorage`:** caché solo en memoria por 15 min (YAGNI; el issue lo marca opcional).
5. **Fetch perezoso:** una sola consulta al abrir la primera ficha de un `MapPoint`, nunca al cargar el mapa.

## Pasos

### 1. Core: lógica pura (`packages/core/src/weather-now.ts` + `test/weather-now.test.ts`)
Reusar `unproject` de `projection.ts` y `PTS`. Exportar desde `index.ts`.
- `buildCurrentTemperatureUrl(points)`: URL de Open-Meteo en lote (`current=temperature_2m`, siempre en °C).
- `parseCurrentTemperature(json, count)`: valida la respuesta en la frontera; devuelve por punto `{ celsius, time } | null`. Un campo faltante o un valor no numérico da `null` para ese punto y no rompe los demás. Una respuesta de un solo punto (objeto, no arreglo) también se maneja.
- `celsiusToFahrenheit(c)` y `formatTemperature(c, 'es' | 'en')`: coma decimal en `es`, signo menos `−` (U+2212), una cifra decimal.
- Pruebas con respuestas grabadas (las del issue: −5,4 / −0,1 / −38,8 / −44,0), sin red. Verifica: URL con 12 pares lat/lon en el orden de `PTS`; parseo válido; parseo con un punto roto; °C a °F; formato por idioma.
- Verificar: `pnpm --filter @antartida/core test`.

### 2. UI: hook (`packages/react-ui/src/map/useCurrentTemperatures.ts`)
- Caché a nivel de módulo (una promesa y su hora, 15 min). Estados: `idle | loading | ready | error`.
- `fetch` con `AbortController` y try/catch: ante cualquier fallo devuelve `error` sin lanzar y **sin `console.error`**. Regla 05: Playwright falla ante errores de consola.
- Se llama solo desde `PointSheet` cuando el punto es un `MapPoint`.

### 3. UI: línea en `PointSheet` (`packages/react-ui/src/map/PointSheet.tsx`)
- Debajo de `place`, para los `MapPoint` (los tres bloques: con `desc`, sin `desc`). Los `SeaPoint` no la llevan.
- Textos: cargando «Consultando temperatura…»; listo «Temperatura actual estimada en esta zona: −5,4 °C · Estimación de modelo (Open-Meteo) · hace 12 min»; error «Temperatura no disponible ahora».
- `aria-live="polite"`; unidad leída completa (`aria-label` con «grados Celsius»). Altura reservada para que la ficha no salte al llegar el dato.
- Si el dato tiene más de 1 h, la hora se muestra tal cual.
- Estilo: clase nueva mínima en el CSS existente de la ficha, reutilizando `anno` si alcanza.

### 4. Atribución y fuentes
- Línea «Datos meteorológicos: Open-Meteo.com (CC BY 4.0)» dentro de la propia línea de temperatura o como `anno` junto a ella.
- `README.md`, sección «Fuentes y licencias»: Open-Meteo, URL de documentación y de términos, licencia CC BY 4.0, fecha de consulta 11 nov 2026, y la nota **[Pendiente de revisión: confirmar límite de uso gratuito no comercial]**.
- La declaración de uso de IA del README: no se toca salvo que falte mencionar este trabajo.

### 5. E2E (`packages/e2e/tests/`)
- Importante: cualquier E2E que abra una ficha ahora dispara un `fetch`. Sin red real fallaría o ensuciaría la consola. Hay que simular `api.open-meteo.com` con `page.route` donde se abren fichas (`map3d.spec.ts`, `ocean3d.spec.ts`, `flow.spec.ts` y las demás que lo hagan) o en un helper común.
- Pruebas nuevas, a 390 y 1440 px: (a) con red simulada, la ficha muestra temperatura, unidad y etiqueta de estimación, y hubo una sola consulta para varias fichas abiertas; (b) con la ruta abortada, muestra «Temperatura no disponible ahora» y no hay errores de consola; (c) antes de abrir una ficha, cero pedidos a Open-Meteo.
- Correr desde `apps/dibujado` (gotcha de projectmem). Usar `E2E_GPU=1 E2E_WORKERS=4 E2E_PORT=5113` para ir más rápido.

### 6. Cierre
- `pnpm test && pnpm typecheck && pnpm build` y `pnpm e2e` en verde.
- Registrar en projectmem: la decisión (Open-Meteo, fetch perezoso, solo °C hoy).
- Revisión del diff por mí (orquestador) y `code-reviewer` antes de abrir el PR. PR con `Closes #22`, tras `git rebase origin/main`.

## Reparto de trabajo
- **Claude (orquestador/revisor):** este plan, el brief para el agente, la revisión de cada paso, la verificación final, projectmem, el PR.
- **agy, modelo `gemini-4-hydrogen-medium` (implementador):** pasos 1 a 5 en orden, con parada al final de cada paso para revisión.

## Fuera de alcance
SMN (`ws.smn.gob.ar`, sin fuente confiable), sistema de idioma, `localStorage`, temperatura en la vista de lista salvo que use `PointSheet`.
