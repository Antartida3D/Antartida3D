# Plan: orden sugerido de expediciones (#75)

Rama: `75-orden-sugerido-de-expediciones` (creada desde `origin/main` en `dbd8093`). Un solo PR con `Closes #75`. Issue asignado solo a LucasA21 (verificado el 16 nov 2026).

## Objetivo y criterio de éxito

1. Existe un orden sugerido único en `@antartida/core`: Desde Ushuaia, Base Marambio, Fósiles, Poncho, Estación Orcadas, Océano. Criterio: prueba unitaria que exige que el orden contenga exactamente las expediciones `tier: 'A'` de `PTS`, sin repetir, y que empiece en el punto de la bienvenida (#115).
2. El mapa señala la expedición sugerida en 2D, en 3D y en «Ver como lista». Criterio: e2e a 390 y 1440 px.
3. Al terminar una expedición, una tarjeta reemplaza al toast y ofrece la siguiente con un botón que la empieza. Al terminar Marambio, también ofrece el viaje a Orcadas en el Irízar. Criterio: e2e.
4. La tarjeta nunca tapa el marcador sugerido: en 390×844, 844×390 y 1440×900 el marcador queda visible y se puede tocar con la tarjeta abierta. Criterio: e2e que comprueba que las cajas no se cruzan y que el punto central del marcador recibe el clic.
5. El selector «Puntos en este lugar» pasa a hoja inferior y se cierra arrastrándolo, como las demás hojas del mapa. Criterio: e2e de `fossils.spec.ts` en verde más uno nuevo de arrastre.
6. Nada se bloquea: todas las expediciones se pueden abrir en cualquier orden. Criterio: los e2e actuales siguen en verde sin cambiar su flujo.
7. Teclado y lector de pantalla: la tarjeta se opera con Tab, Enter y Escape, y su texto se anuncia. Criterio: e2e con teclado.
8. `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm e2e`, `pnpm docs:test` y `pnpm docs:check` en verde.

## Entorno detectado

- Verificación canónica: `pnpm test && pnpm typecheck`; antes del PR también `pnpm build`, `pnpm e2e` y los controles de documentación.
- E2E desde `apps/dibujado`: `E2E_PORT=5113 E2E_GPU=1 E2E_WORKERS=4 pnpm exec playwright test -c ../../packages/e2e/playwright.config.ts <spec>`.
- Proyectos de Playwright: `mobile` (390×844), `desktop` (1440×900), `mobile-compact` (360×740) y `mobile-landscape` (844×390). Los dos últimos hoy corren solo `orcadas*.spec.ts`.
- Reglas aplicables: 01 (lógica en `core`), 04 (fuente única), 05, 07, 13, `20-web.md` (foco, teclado, `prefers-reduced-motion`, tokens), #177 (primario a la derecha), #114 (no tapar el mapa en celular), #185 («atrás» cierra la capa).
- Congelamiento: 17 nov es el último día para sumar funcionalidades. El plan entra en un día; el orden de los pasos deja lo esencial primero (ver «Orden de entrega»).

## Decisiones (usuario, 16 nov 2026)

- D1. Orden lineal: Desde Ushuaia, Base Marambio, Fósiles, Poncho, Estación Orcadas, Océano. Motivo geográfico: el viaje desde Ushuaia termina en Marambio; Fósiles está en la isla vecina; Poncho empieza en Base Esperanza, en la misma Península; Orcadas se alcanza con el Irízar; Océano (Mar de Weddell) queda al final. Ubica a Océano (#8) y Poncho (#9), los dos pendientes del issue. Recoge la propuesta de majo-fflores (Poncho después de Marambio).
- D2. Alcance medio: marca en el marcador, botón «Siguiente: X», tarjeta al volver y lista ordenada. El panel lateral persistente queda fuera.
- D3. Al terminar Marambio, la tarjeta del mapa ofrece «Siguiente: Fósiles» como principal y «Viajar a Orcadas en el Irízar» como segunda opción. `MarambioExpedition.tsx` no cambia.
- D4. El botón de la tarjeta empieza la expedición directo, con la transición de siempre. Orcadas pasa por su intro (elegir llegada), salvo la opción del Irízar, que llega en barco como desde el diorama.
- D5. Las piezas nuevas usan los gestos que ya existen; no se inventan gestos.
- D6. El selector «Puntos en este lugar» pasa a `BottomSheet` dentro de este mismo issue (no en uno aparte).

## Supuestos (los elegí yo; decime si es otra cosa)

- S1. «Siguiente» es la primera expedición del orden que todavía no está en `explored`, no «la que sigue a la que terminaste». Así el marcador, el botón y la tarjeta siempre coinciden. Ejemplo: quien hizo Ushuaia, Marambio y viajó a Orcadas ve «Siguiente: Fósiles». Los ids desconocidos en `explored` (formato viejo, datos rotos) se ignoran.
- S2. Solo late (pulse) el marcador de la sugerida. Las demás expediciones sin explorar quedan con su punto ocre, sin animación. Hoy laten todas y ninguna se distingue. Con `prefers-reduced-motion` el pulse ya queda quieto (`painted.css`, regla existente), así que la sugerida muestra un anillo fijo sin trabajo extra.
- S3. La tarjeta no se cierra sola: tiene botones, y un cierre automático no da tiempo a leerla ni a llegar con teclado (WCAG 2.2.1). Se cierra con «Quedarme en el mapa», Escape, arrastrándola hacia abajo en el celular, con «atrás» del navegador o al empezar algo. Tocar o mover el mapa no la cierra, igual que el panel de reclamos (#148).
- S4. El texto «X quedó explorado. Registro de exploración: n/6» (`returnToast`) queda como primera línea de la tarjeta. Conserva el dato y evita reescribir los e2e que lo buscan.
- S5. Con las seis hechas, la tarjeta dice «Exploraste las seis expediciones» y no hay marcador sugerido ni botón «Siguiente».
- S6. Durante la bienvenida (#115) no aparece «Siguiente»: la bienvenida ya señala Desde Ushuaia. Tampoco aparece mientras hay «Continuar: X» (#186), un viaje en curso o una transición.
- S7. «Estás acá» (comentario del issue) queda fuera: la app no guarda una posición del viajero aparte de la expedición en curso, y «Continuar» ya cubre eso.
- S8. Al terminar Marambio, si la siguiente ya es Orcadas (Fósiles y Poncho hechas), el botón principal pasa a ser «Viajar a Orcadas en el Irízar» y no hay segunda opción: no se ofrece dos veces el mismo destino.
- S9. La tarjeta aparece cuando termina la animación de vuelta al mapa (`phase` vuelve a `idle`), no durante: así no compite con la transición ni con el encuadre.

## Diseño de interfaz

### Marcador sugerido (2D y 3D)

`MarkerButton` (`map/Markers.tsx`) dibuja los marcadores en las dos vistas, así que un solo cambio cubre ambas.

- Clase `next` en el marcador: punto ocre con el pulse actual y una etiqueta corta fija «Siguiente» arriba del punto (tinta sobre papel, `--ink` y `--paper`). No usa la etiqueta grande (`.mlabel`), que sigue cerrada hasta el primer toque (#54).
- `aria-label`: «Desde Ushuaia, Ushuaia. Expedición sugerida para seguir. Empezar.»
- La etiqueta grande, al abrirse, dice «Siguiente · Ushuaia» en el subtítulo.
- Grupo (cluster) que contiene la sugerida: clase `has-next` con la misma etiqueta «Siguiente», y el `aria-label` suma «Incluye la siguiente sugerida: Fósiles». Importa porque Marambio, Fósiles y Poncho quedan agrupados en la vista general.
- La etiqueta «Siguiente» respeta la colisión de etiquetas existente: va arriba del punto, donde no compite con `.mlabel`, que sale a un costado.

### Botón «Siguiente: X» (abajo a la izquierda)

Mismo lugar y estilo que «Continuar: X» (#186): `.btn.resume`. Nunca están los dos: «Continuar» gana. Al tocarlo hace lo mismo que tocar el marcador (`openPoint`): viaje con selector de vehículo para Ushuaia, viaje directo para Poncho, intro para Orcadas, expedición para las demás.

### Tarjeta al volver de una expedición

Componente nuevo `map/NextCard.tsx`, sobre `BottomSheet` con `modal={false}`, como `ClaimsDetails`: en el celular es una hoja inferior con manija; en escritorio, una tarjeta en la esquina. No se escriben estilos de contenedor nuevos.

```
┌──────────────────────────────────────────┐
│ ✓ Fósiles quedó explorado.               │
│   Registro de exploración: 3/6           │
│                                          │
│ SIGUIENTE SUGERIDA                       │
│ Poncho                                   │
│ Península Antártica · Base Esperanza     │
│ “¿Qué historia puede contar un perro     │
│  polar argentino de trineo?”             │
│                                          │
│ [Quedarme en el mapa]  [Empezar: Poncho] │
└──────────────────────────────────────────┘
```

- Al terminar Marambio: debajo de «Empezar: Fósiles», un botón secundario «o viajar a Orcadas en el Irízar» (S8 para el caso en que la siguiente ya es Orcadas).
- Con las seis hechas: solo la primera línea, «Exploraste las seis expediciones», y «Cerrar».
- La pregunta guía es el `q` del punto, que ya existe en el contenido. No se escribe texto de contenido nuevo.
- Botones: primario a la derecha (#177). El primario ocupa el espacio que sobra y su texto puede pasar a dos líneas («Empezar: Estación Orcadas» a 360 px); nunca se corta con «…».
- Accesibilidad:
  - región con `aria-labelledby` y Escape, que ya da `BottomSheet` no modal;
  - el anuncio va a una zona `role="status"` que vive siempre montada en `MapView`. Una zona viva que aparece junto con su texto suele no leerse en lectores de pantalla; por eso la zona existe antes y solo cambia su texto;
  - el foco va al botón principal al aparecer y vuelve al mapa (`.vp`) al cerrarla. Mientras hay tarjeta, el foco automático al marcador de la expedición de la que se volvió (`focusExpedition`) no se aplica: dos focos automáticos se pisan.
- Movimiento: la entrada `up` de `.sheet`; con `prefers-reduced-motion`, el `fadein` corto que ya aplica `painted.css` a `.sheet`.

### Que la tarjeta no tape el marcador (celular horizontal y demás)

En 844×390 la pantalla cuenta como ancha (desde 820 px): la tarjeta es la de escritorio, de 400 px de ancho abajo a la derecha, y con 390 px de alto ocupa casi media pantalla. Se resuelve en tres capas:

1. **Encuadre al lado de la tarjeta.** Al abrirse la tarjeta, si el marcador sugerido (o su grupo) queda debajo de ella o fuera de la pantalla, el mapa se desplaza para dejarlo en el centro de la zona libre. Ya hay un precedente: al abrir la ficha de un punto con modelo, el 3D apunta al costado de la tarjeta (`visit`, `Map3DLayer.tsx`).
   - Lógica pura en `core` (nuevo `framing.ts` o junto a `viewport.ts`):
     - `freeArea(size, card)` devuelve la zona libre a partir del rectángulo real de la tarjeta, medido con `getBoundingClientRect`, no con constantes;
     - `needsFraming(marker, free, margin)` dice si el marcador ya se ve con margen;
     - `focusWorld` suma un parámetro opcional `anchorX` (hoy solo tiene `anchorY`), para no duplicar la función.
   - En pantalla ancha la zona libre queda a la izquierda de la tarjeta; en el celular vertical, arriba de la hoja.
   - 2D: `glide(focusWorld(...))`. 3D: el comando `focus` existente con esa vista (`poseFromView`); el mismo cálculo sirve para las dos vistas.
   - Solo desplaza, no cambia el zoom; si el marcador ya se ve, no mueve nada. Con `prefers-reduced-motion`, el cambio es instantáneo.
   - Con el marcador sugerido dentro de un grupo, se usa la posición del grupo (sale de `buildMarkers`).
2. [x] **Tarjeta compacta en pantallas bajas** (`@media (max-height:500px)`, ya existe para la leyenda 3D):
   - se oculta la pregunta guía;
   - la línea del registro y la sugerida pasan a una línea cada una;
   - los botones van en una sola fila.
   
   Objetivo: que mida como mucho la mitad del alto.
3. [x] **Botones de zoom libres.** En pantalla ancha la tarjeta deja libre la columna de zoom, como el panel de reclamos (`.sheet.claims-sheet{right:88px}`).

Además, el botón «Siguiente: X» de abajo no se muestra mientras está la tarjeta.

### Gestos en el celular

Inventario de lo que ya existe y qué usa cada pieza. La regla es no inventar gestos: cada pieza hace lo mismo que su par más parecido.

| Gesto existente | Dónde vive | Uso en #75 |
|---|---|---|
| Hoja inferior: arrastrar la manija o el cuerpo hacia arriba la agranda, hacia abajo la achica y después la cierra; tocar la manija o Enter cambia de tamaño (`sheetAfterDrag`, `SHEET_SNAP_PX` 40 px, `SHEET_TAP_PX` 6 px) | `BottomSheet.tsx`, `core/gestures.ts` | **Sí.** La tarjeta «Siguiente» y el selector «Puntos en este lugar» pasan a ser `BottomSheet`: se cierran arrastrándolos hacia abajo, como la ficha de un punto y los reclamos. |
| «Atrás» del navegador cierra la capa abierta (`useBackLayer`, #185) | `hooks.ts` | **Sí.** La tarjeta registra su capa; el selector ya la tiene. |
| Primer toque en un marcador muestra la etiqueta y el segundo abre (`markerPress`, #54) | `core/markers.ts` | **Sí, sin cambios.** El marcador sugerido se comporta igual. La etiqueta «Siguiente» es parte del botón y agranda la zona que se puede tocar. |
| Leyenda: swipe a la izquierda o hacia abajo la cierra (`legendSwipe`, #114) | `Legend.tsx` | **No.** Es propio de la leyenda, anclada a la esquina izquierda. |
| Mapa: un dedo mueve, pellizco acerca, doble toque y toque-y-arrastre acercan (DEC-165), dos dedos giran e inclinan en 3D | `MapView.tsx`, `core/gestures.ts` | **Sin cambios.** La tarjeta no modal deja el mapa usable; estos gestos siguen andando con ella abierta. |
| «Ver como lista»: pantalla completa con scroll; se cierra con su botón, Escape o «atrás» | `ListView.tsx` | **No agrego swipe.** Arrastrar hacia abajo para cerrar choca con el scroll de una lista larga. |
| Hojas con `floor="peek"` dentro de las expediciones | Expediciones | **No aplica.** #75 no toca el interior de las expediciones. |

### Selector «Puntos en este lugar» como hoja inferior (D6)

Hoy es una ventana centrada con fondo (`.listview.pick` y `.scrim`). Pasa a la misma forma que la ficha de un punto (`PointSheet`):

- `BottomSheet` modal con clase `half`, más el fondo transparente `.scrim.clear`: tocar el mapa alrededor la cierra, como hoy.
- Foco con `useFocusReturn`, como la ficha.
- Celular: hoja inferior que se cierra arrastrándola hacia abajo. Escritorio: tarjeta en la esquina.
- Mismo nombre accesible («Puntos en este lugar», `role="dialog"`), mismo contenido y mismo orden sugerido. Así el e2e existente de `fossils.spec.ts` sigue valiendo: diálogo por nombre, alto menor al 80 % y cierre con «atrás».
- `ListView` separa el cuerpo de la lista (secciones y filas) del contenedor; la vista completa sigue con su contenedor de pantalla completa. Se borran los estilos `.listview.pick` que queden sin uso (regla 04).
- No cambia la regla de DEC-7 (el grupo que no se separa ofrece elegir); solo cambia la forma de la ventana. Se registra como DEC-75-2 con referencia a DEC-7.

### «Ver como lista»

- El grupo «Expediciones» pasa a una lista numerada (`<ol>`) en el orden sugerido. Título: «Expediciones · orden sugerido». Descripción: «Es una sugerencia: podés empezar por cualquiera.»
- Cada fila: número, título, lugar y estado: «Explorado · volver a entrar», «Siguiente sugerida · empezar» (con la etiqueta ocre) o «Empezar expedición».
- El selector de grupo usa el mismo orden.
- Los puntos de interés (C) no cambian.

## Pasos

1. **Avisar en #75**: decisiones, plan y archivos compartidos que se tocan (`AntarcticaApp.tsx`, `map/`, `markers.ts`, `viewport.ts`, `painted.css`, `ListView.tsx`). Los issues vinculados están cerrados; #2 está abierto y sin asignar. Verifica: comentario publicado.
2. [x] **Orden en `core`** (`packages/core/src/expedition-order.ts`, exportado en `index.ts`):
   - `EXPEDITION_ORDER`: ids en el orden de D1;
   - `nextExpedition(explored): MapPoint | null` (S1);
   - `afterExpedition(doneId, explored)`: la siguiente y si se ofrece el Irízar (D3, S8).
   - Prueba `packages/core/test/expedition-order.test.ts`:
     - el orden cubre exactamente las `tier: 'A'`;
     - el primero es `VOYAGE_POINT` (#115);
     - salta las exploradas e ignora ids desconocidos;
     - devuelve `null` con todas;
     - casos del Irízar.

   Verifica: `pnpm --filter @antartida/core test`.
3. [x] **Marcadores** (`core/src/markers.ts`): parámetro `next?: string` en `buildMarkers`; campo `next` en `PointMarker`; clases `next` y `has-next`; textos de `aria-label` y subtítulo; pulse solo en la sugerida (S2). Pruebas en `packages/core/test/map.test.ts`. Verifica: `pnpm test`.
4. [x] **Encuadre** (`core`): `anchorX` opcional en `focusWorld`, `freeArea` y `needsFraming`, con pruebas:
   - un marcador debajo de la tarjeta se mueve a la zona libre;
   - uno ya visible no se mueve;
   - el resultado respeta `clampView`.
5. [x] **Estilos** (`core/src/styles/painted.css`): `.mk.next`, `.mk.has-next`, etiqueta «Siguiente», contenido de `.next-sheet`, variante compacta en `max-height:500px`, `right:88px` en pantalla ancha. Solo tokens existentes.
6. [x] **`MarkerButton`**: dibuja la etiqueta «Siguiente» cuando el marcador es `next` o `has-next`.
7. [x] **`NextCard.tsx`**: tarjeta de la sección de diseño sobre `BottomSheet` (`modal={false}`, `className="half next-sheet"`, `onClose`).
8. [x] **`MapView.tsx`**:
   - props `finished` (expedición recién terminada o `null`), `onDismissFinished` y `onTravelIrizar`;
   - `next` con `nextExpedition(explored)` hacia `buildMarkers`;
   - botón «Siguiente: X» en el lugar de «Continuar» (S6);
   - monta `NextCard` con `useBackLayer` y la zona `role="status"` fija;
   - encuadre al abrir la tarjeta (mide la tarjeta, llama a `needsFraming` y mueve en 2D o 3D);
   - una capa a la vez: abrir una ficha, la lista o la intro de Orcadas cierra la tarjeta.
9. [x] **`ListView.tsx`**: orden, numeración y estado; separa cuerpo y contenedor; el selector de grupo usa `BottomSheet` + `.scrim.clear` + `useFocusReturn` (D6).
10. [x] **`AntarcticaApp.tsx`**: `complete` guarda la expedición terminada en un estado `finished` en lugar del toast con temporizador (S9); opción del Irízar desde el mapa con `begin(ORCADAS_POINT, 'orcadas', 'ship', ...)`, como `travelFromMarambio`. Si `toast` y `TOAST_MS` quedan sin uso, se quitan (regla 04); `returnToast` sigue en uso (S4).
11. [x] **E2E** nuevo `packages/e2e/tests/expedition-order.spec.ts`, con la bienvenida ya vista y `explored` cargado en `localStorage` para no recorrer expediciones enteras. Se suma al `testMatch` de `mobile-landscape` y `mobile-compact`.
    - Sin nada explorado: «Siguiente: Desde Ushuaia» y el marcador con su `aria-label` de sugerida.
    - Con `campana` explorado: «Siguiente: Base Marambio»; en la vista general el grupo la anuncia.
    - En 3D: el marcador sugerido lleva la clase `next`.
    - Al terminar Fósiles: la tarjeta muestra el registro y «Empezar: Poncho»; el botón arranca el viaje de Poncho.
    - Al terminar Marambio: la tarjeta ofrece el Irízar y lleva a Orcadas; con Fósiles y Poncho hechas, el Irízar es el principal (S8).
    - Con las seis: «Exploraste las seis expediciones», sin «Siguiente».
    - **No tapa:**
      - en los cuatro tamaños, la caja del marcador sugerido no se cruza con la de la tarjeta;
      - `elementFromPoint` en su centro devuelve el marcador;
      - en 844×390 la tarjeta mide como mucho la mitad del alto.
    - Teclado: foco en «Empezar», Escape cierra y el foco vuelve al mapa.
    - Celular: arrastrar la tarjeta 200 px hacia abajo la cierra y un arrastre corto la deja (reutiliza el `drag` táctil de `flow.spec.ts`).
    - «Atrás» del navegador cierra la tarjeta y la app sigue en el mapa.
    - Con la tarjeta abierta, arrastrar el mapa lo mueve y la tarjeta sigue abierta.
    - Lista: orden 1 a 6 y la etiqueta «Siguiente sugerida».
    - Selector de grupo: en el celular se cierra arrastrándolo hacia abajo; tocar el mapa alrededor lo cierra.
    - Revisar los e2e que buscan el toast (`flow`, `fossils`, `marine`, `marambio`, `orcadas`, `voyage-arrival`, `history`) y ajustar solo el selector si cambia el contenedor, nunca el texto esperado.
12. [x] **Revisión visual**: capturas en los cuatro tamaños, en 2D y 3D, con la tarjeta abierta y con el selector de grupo. En 3D usar `--use-angle=vulkan` (gotcha de siluetas con OpenGL en headless).
13. [x] **Documentación**:
    - `docs/decisiones/DEC-75-orden-sugerido.md`: orden, sugerencia sin bloqueo, «siguiente» como primera sin explorar, pulse solo en la sugerida, tarjeta en lugar del toast;
    - `docs/decisiones/DEC-75-2-selector-de-grupo-como-hoja.md`, que referencia a DEC-7 sin reemplazarlo;
    - una sección corta en `docs/decisiones.md` que enlaza a los dos;
    - en la sección de #115, marcar que «el orden completo (#75)» ya no queda afuera.
14. [x] **Verificación final**:
    - `pnpm test && pnpm typecheck`;
    - `pnpm build`;
    - `pnpm e2e` completo;
    - `pnpm docs:test`;
    - `pnpm docs:check --body-file <cuerpo-del-PR.md> --base origin/main`;
    - revisión del diff con `code-reviewer`.
15. **PR**:
    - `git rebase origin/main`;
    - cuerpo con `Closes #75`, declaración de impacto documental y capturas a 390, 844×390 y 1440 px;
    - pedir revisión a otra persona del equipo.

## Orden de entrega (por el congelamiento del 17 nov)

Commits chicos en este orden. Si el tiempo no alcanza, lo que queda arriba ya es un avance completo y usable:

1. Pasos 2, 3, 5 y 6: orden y marcador sugerido.
2. Pasos 7, 8 y 10 sin encuadre: tarjeta y botón «Siguiente».
3. Paso 4 y encuadre del paso 8: que no tape.
4. Paso 9: lista ordenada y selector como hoja.
5. Pasos 11 a 15.

## Riesgos

- **El encuadre mueve la cámara sin que el usuario lo pida.** Se limita a desplazar, solo si hace falta, sin cambiar el zoom, e instantáneo con movimiento reducido. Si al equipo no le gusta, la capa 2 (tarjeta compacta) sola ya resuelve la mayoría de los casos.
- **Quitar el pulse a las demás expediciones** cambia lo que el equipo ya vio. Es reversible con una línea de CSS.
- **Los e2e que esperan el toast** pueden depender de su clase `.toast`. Se ajusta el selector, no el texto.
- **El selector como hoja** cambia la forma de una decisión aceptada (DEC-7). La revisión del PR confirma que DEC-75-2 alcanza o que hace falta un reemplazo formal.

## Fuera de alcance

- Panel «Expediciones» persistente (drawer o hoja inferior).
- Cambios dentro de las expediciones (incluido el `TripDialog` de Marambio).
- «Estás acá» (S7).

## Enmiendas durante la ejecución

> Enmienda: con la tarjeta abierta el foco va a su botón principal, así que los e2e que esperaban foco en el marcador de la expedición (`orcadas.spec.ts`) esperan ahora «Empezar: Desde Ushuaia» y cierran con Escape. La tarjeta tapa los botones de abajo en el celular: el e2e que abre la lista después de terminar Orcadas cierra antes la tarjeta («Quedarme en el mapa»). El encuadre descuenta también la columna izquierda (leyenda y botones) en pantalla ancha, porque a 844×390 la leyenda abierta tapaba el marcador sugerido.
> Enmienda: las filas de la lista con la sugerida dicen «Siguiente sugerida · empezar» en lugar de «Empezar expedición»; los e2e que buscaban «Desde Ushuaia.*Empezar expedición» aceptan ambos textos.
