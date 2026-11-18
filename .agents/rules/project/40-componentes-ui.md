# 40. Componentes de interfaz

> **Por qué:** Un botón definido en varias hojas de estilo cambia en una pantalla y no en las demás. Con una sola definición, cambiar el botón primario es cambiar una línea y la paleta se respeta en toda la aplicación.

1. Cada componente de interfaz tiene **una sola definición**, en `packages/core/src/styles/components.css`: botón (`.btn` y sus variantes `.primary`, `.ghost`, `.resume`, `.right`, `.wrong`), botón redondo (`.iconbtn`), píldora de barra superior (`.pill`), chip (`.vchip`) y nota de cuaderno (`.vnote`).
2. Los colores de un componente salen de los tokens de componente de `tokens.css` (`--btn-bg`, `--btn-primary-bg`, `--btn-hover-bg`, `--btn-border`, `--chip-bg`…), que a su vez usan la paleta. Sin colores hex en `components.css`.
3. La hoja de una pantalla solo **acomoda** el componente: ancho, alto mínimo, margen, relleno, tamaño de letra, `flex`. No cambia color, fondo, borde ni hover.
   - No: `.mi-panel .btn{background:var(--deep)}` en la hoja de la pantalla.
   - Sí: `.mi-panel .btn{width:100%;min-height:44px}`; si hace falta otro aspecto, una variante nueva en `components.css`.
4. El **botón primario** (`.btn.primary`) es azul (`--deep`) con texto claro. Hay uno solo por pantalla: la acción principal, último a la derecha (#177).
5. El **hover** de cualquier botón oscurece un poco su color de reposo y pinta el botón entero. Nunca cambia a otro color ni a azul.
6. **Sin líneas dobles** (`border: … double`) ni marcos interiores: botones, paneles y separadores llevan una sola línea.
7. Un botón nuevo usa `.btn` y sus variantes. No se crea una clase propia que repita el aspecto de un botón.
8. Un color nuevo se agrega como token en `tokens.css`, no suelto en una regla.
9. Los modales de contenido usan los componentes de `packages/react-ui/src/sheet/` y `BottomSheet`, no una solución propia: `SheetHeader` (encabezado), `SheetText` (texto), `MoreFold` («Saber más»), `SheetActions` (fila de botones, un solo `.btn.primary`), `BackButton` (volver al paso anterior: flecha cuadrada a la izquierda, el principal ocupa el resto de la fila, DEC-301), `Cite` (cita `[N]`) y `SourcesView` (vista de fuentes única). No se agrega un `<dialog>`, un fondo ni una fila de botones propios, ni estilos en línea en un modal.
10. El encabezado de una expedición es `ExpeditionTop` (`packages/react-ui/src/ExpeditionTop.tsx`), no un `<header className="orc-top">` propio. Sin barra ni título; el selector de mes va en `tools`.
11. Un botón que queda solo en una barra, un panel o un modal ocupa todo el ancho de su contenedor, en celular y en escritorio.
12. El cartel de ubicación de una escena es `SceneLocation` y la nota manuscrita de una parada es `.scene-found`. Ninguna expedición define el suyo.
13. La etiqueta de la escena («Reconstrucción ilustrada» con su «?») es `SceneBadge`, abajo a la izquierda en todas las expediciones. Ninguna dibuja la suya.

## Guardián
Prueba de las reglas 1, 2, 3, 5 y 6.

- Prueba: `pnpm --filter @antartida/core test` (`packages/core/test/styles.test.ts`). Falla si una hoja de pantalla da color, fondo o borde a un componente, si un hover pinta de azul, si aparece una línea doble o si suben los colores hex fuera de `tokens.css`.
- Decisiones: `docs/decisiones/DEC-234-componentes-de-interfaz.md` y `docs/decisiones/DEC-264-modales-normalizados.md`. Sistema visual: `DESIGN.md`.
