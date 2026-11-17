# DEC-235: el registro de exploración despliega las expediciones

```json
{
  "id": "DEC-235",
  "date": "2026-11-16",
  "status": "accepted",
  "issue": 235,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

El registro de exploración («1/6 expediciones», arriba en el mapa) es un botón. Al tocarlo se despliega debajo una caja con las seis expediciones, en el orden sugerido. Cada fila muestra su número y su título. La siguiente sugerida suma la etiqueta «Siguiente sugerida»; las demás no llevan texto de estado. Una expedición explorada muestra un tilde en lugar de su número: círculo dorado (`--ocre`) con el tilde casi blanco (`--ice`), que contrasta 3:1 sobre el dorado; el color papel daba menos. Su título aparece tachado. Como el tilde y el tachado no se leen en voz alta, el nombre accesible de la fila los dice («Desde Ushuaia, explorada»; «Base Marambio, siguiente sugerida»). Tocar una fila abre esa expedición.

La caja muestra solo las expediciones. Los puntos de interés y las ampliaciones previstas siguen en «Actividades» (DEC-236).

La caja se cierra con el mismo botón, con Escape (el foco vuelve al registro), con un toque fuera de ella o con «atrás» del navegador. Abierta, queda por encima de los botones de abajo del mapa.

En el celular (menos de 820 px de ancho) el registro sigue siendo la píldora chica «1/6» de #249. Su flecha ya no agranda la píldora para mostrar «expediciones»: indica que la caja se despliega y gira al abrirla. Este cambio reemplaza ese comportamiento de #249, que no tenía registro en el formato nuevo.

El orden sale de `EXPEDITIONS_IN_ORDER` (`@antartida/core`). La lista «Actividades» no cambia: sigue mostrando «Explorado · volver a entrar» y «Empezar expedición».

## Motivo

El registro parecía un botón y no hacía nada. En el celular la flecha agrandaba la píldora sin un propósito claro. Quien lo pidió quiere ver las expediciones, si las completó o no, y entrar a cada una desde ahí, sin otros puntos del mapa.

## Referencias

- [Issue #235](https://github.com/Antartida3D/Antartida3D/issues/235) e [issue #249](https://github.com/Antartida3D/Antartida3D/issues/249).
- Pedido del usuario en la tarea del issue #235, el 16 de noviembre de 2026: «quiero que al apretarlo se abra la lista de las expedicion y si las completaste o no y que las puedas clickear para poder entrar a las mismas». Sobre el alcance: «no quiero que esté» el volcán ni los otros puntos chicos. Sobre las exploradas: «que se marque con un tilde en lugar del numero», «pinta el circulo del color dorado y el tilde blanco/papel», «que tambien se tache el titulo de la expedicion» y «no hace falta el texto en azul de explorado - volver a entrar ni el de empezar expedicion. El de siguiente sugerida si me gusta que esté».
- [`ExplorationLog.tsx`](../../packages/react-ui/src/map/ExplorationLog.tsx), [`expedition-order.ts`](../../packages/core/src/expedition-order.ts) y la prueba e2e en [`expedition-order.spec.ts`](../../packages/e2e/tests/expedition-order.spec.ts).
