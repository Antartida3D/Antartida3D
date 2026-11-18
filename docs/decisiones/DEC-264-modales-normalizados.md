# DEC-264: modales normalizados con citas [N], una vista de fuentes y un solo contenedor

```json
{
  "id": "DEC-264",
  "date": "2026-11-17",
  "status": "accepted",
  "issue": 264,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

1. Todos los modales de contenido usan `BottomSheet` (`packages/react-ui/src/BottomSheet.tsx`). Un modal trae su propio fondo (`.sheet-scrim`) que cierra al tocar afuera, atrapa el foco con Tab y Shift+Tab, cierra con Escape y arrastrado hacia abajo, y devuelve el foco a quien lo abrió. Océano y Fósiles dejan su `<dialog>` propio.
2. Las citas se ven como texto seguido de `[N]` (`Cite`). El número sale del orden de la lista que muestra la vista de fuentes en ese contexto (el viaje, Orcadas, cada expedición o la ficha de un punto). Un `[N, p. X]` con página sigue enlazando a esa página del documento.
3. Hay una sola vista de fuentes (`SourcesView`), con una sola ficha por fuente: título con enlace, organismo o autor, detalle y fecha de consulta, y la fuente tocada resaltada con `aria-current`. Desaparecen las líneas «Fuente:», las líneas «Fuente» de Océano y Fósiles, «Fuentes verificadas (n)», las anclas `mar-source-*` y `cn-source-*` y el panel propio de Orcadas con su «Ver fuentes de este capítulo / todas».
4. Siete formas de fuente distintas (viaje, Orcadas, Océano, Fósiles, Marambio, Cerro Nevado y puntos del mapa) se adaptan a un tipo común, `CitedSource` (`packages/core/src/sources.ts`), con un adaptador puro por contenido. Los datos de cada contenido no se tocaron.
5. Todos los «Saber más» usan `MoreFold`, con la flechita de Orcadas que gira al abrir. El botón «Saber más / Ver menos» del viaje se reemplazó por él. La tarjeta que la persona abrió para conocer un lugar sigue mostrando todo sin «Saber más» (#190).
6. Todos los modales tienen el mismo encabezado (`SheetHeader`: etiqueta, título y lugar o pregunta, con `iconbtn` «Cerrar» a la derecha cuando el modal se puede cerrar) y una sola fila de acciones (`SheetActions`): botones `.btn` del mismo alto y ancho, uno solo `.btn.primary`, último a la derecha en escritorio y abajo en celular.
7. La misma acción usa el mismo texto en todos los modales: «Volver al mapa», «Comenzar expedición», «Atrás», «Siguiente».
8. `KindChip` marca qué es real y qué es ilustración también en la ficha de punto, en el mismo lugar bajo el encabezado.
9. El texto del cuerpo usa `SheetText` (primer párrafo como bajada) y `Quoted` entiende `**negrita**` además de las citas textuales (`strongParts`, `richParts` en `packages/core/src/richText.ts`). Solo Ushuaia y Orcadas marcan negritas por ahora; cada responsable marca su expedición después.
10. Toda expedición abre un modal previo con el mismo formato (`ExpeditionIntro`): pregunta, texto con citas `[N]`, la marca «Reconstrucción ilustrada», un modelo 3D que gira (el Hércules en Marambio, la ballena jorobada en Océano, el amonite en Fósiles, los pingüinos en Cerro Nevado, y lo que ya tenían Ushuaia y Orcadas) y las acciones «Volver al mapa» / «Comenzar expedición». El texto sale de lo que cada expedición ya cuenta en su primera parada (`expeditionIntro` en `core`): no se escribe texto nuevo.

   > Marambio cambia por [DEC-282](DEC-282-vista-previa-marambio.md): muestra la maqueta de la base del mapa, quieta, en lugar del Hércules que gira.

11. Solo se marca lo que no es real (simulación, reconstrucción, cálculo). El dato real va sin marca y con su cita: `KindChip` no dibuja nada para `real`.
12. Un modal que tiene un botón para cerrarse no lleva además la cruz. Solo la lleva el panel de reclamos, que no tiene otro botón. La viñeta del atlas se quitó de las fichas, y el tipo de punto («Punto de interés», «Vida en el mar») pasó al encabezado, junto a «Cuaderno de campo». Se quitó la línea «Datos meteorológicos: Open-Meteo.com (CC BY 4.0)» a pedido del equipo; el origen sigue dicho en la línea de la temperatura («Estimación de modelo (Open-Meteo)»).
13. Fuera de esta decisión: las fuentes de relieve de la leyenda siguen en texto libre, porque no tienen registro de fuente en `core` y pasarlas a `[N]` exigiría crear datos de fuente.

## Motivo

Cada expedición había resuelto a su manera cómo citar, cómo plegar lo secundario, cómo cerrar un modal y cómo ordenar sus botones. Una persona que cambiaba de expedición encontraba otra interfaz para lo mismo, y dos lugares tenían focos, fondos y botones que se comportaban distinto. Con un componente por cosa, un cambio llega a todas las pantallas y el foco atrapado y devuelto de la regla `20-web.md` queda en un solo lugar. Las citas `[N]` de #150 ya estaban acordadas con quien lleva ese issue; esta decisión cubre los puntos 2 y 10 de #150.

## Referencias

- [Issue #264](https://github.com/Antartida3D/Antartida3D/issues/264): normalizar modales.
- [Issue #150](https://github.com/Antartida3D/Antartida3D/issues/150): citas `[N]` en todas las fuentes (puntos 2 y 10).
- [Issue #190](https://github.com/Antartida3D/Antartida3D/issues/190): una tarjeta abierta para conocer el lugar muestra todo sin «Saber más».
- [DEC-234](DEC-234-componentes-de-interfaz.md): botones con una sola definición y un solo primario.
- [DEC-177](DEC-177-primarios-a-la-derecha.md): el primario va último, a la derecha.
