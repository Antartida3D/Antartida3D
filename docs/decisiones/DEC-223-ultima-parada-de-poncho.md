# DEC-223: la brújula, el retiro y Ushuaia son la última parada de Poncho, y el viaje termina en Esperanza

```json
{
  "id": "DEC-223",
  "date": "2026-11-18",
  "status": "accepted",
  "issue": 223,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

1. El viaje de Poncho pasa de 9 a 7 paradas. Las paradas `adios-a-la-antartida` y `ushuaia` (hitos 8 y 9) se quitan del mapa y su historia se cuenta en la parada `brujula-perdida`, que se llama ahora «La última proeza y el retiro».
2. Se quita el tramo en barco a Ushuaia: el viaje termina en el puerto de Esperanza, al final de la patrulla de la brújula. El traslado a Ushuaia y los últimos años de Poncho se cuentan en la ficha, no se recorren.
3. La parada tiene tres frases, una por historia: la brújula (resumida), el retiro y la salida en el rompehielos con su final en Ushuaia. «Saber más» junta los datos de las tres, con su fuente y su página.
4. Escenas: las dos primeras frases ocurren en la Base Esperanza, con el escenario y la base de «Nace Poncho»: la patrulla vuelve entre la ventisca, y después los perros jóvenes salen con el trineo mientras Poncho se aleja solo. En la tercera frase la escena cambia al rompehielos de «En rompehielos hacia Belgrano», donde suben solo un hombre y Poncho. Para eso una parada puede seguir en otra escena desde una de sus frases (`SceneDef.then`, `sceneStage`).
5. Quedan tres actos: «Un retiro merecido» deja de ser un acto propio. La última parada cierra el acto «Salvar vidas en el hielo».
6. Los issues #224 y #225 se cierran como duplicados de #223.

## Motivo

Acortar la historia para la entrega: tres paradas seguidas, con escenas que no estaban terminadas, se cuentan en una sola sin perder los datos. La escena del barco ya da a entender que Poncho se va a Ushuaia, y su vida allá se cuenta en el texto.

## Referencias

- [Issue #223](https://github.com/Antartida3D/Antartida3D/issues/223), [#224](https://github.com/Antartida3D/Antartida3D/issues/224) y [#225](https://github.com/Antartida3D/Antartida3D/issues/225).
- Pedido de la persona que lleva el trabajo, en la conversación del 18 de noviembre de 2026: unir los issues 223, 224 y 225; eliminar los puntos del mapa de los hitos 8 y 9; reutilizar la escena de la Base Esperanza del primer hito y la del barco del hito 4; contar la brújula, el retiro y Ushuaia en las tres escenas; título «La última proeza y el retiro»; opción de cambio de escena en la tercera frase; quedan tres actos. Esta cita no representa una revisión posterior del resultado.
- El libro no dice desde qué base subió Poncho al rompehielos (p. 21): mostrarlo en el barco es una ilustración.
- [Contenido del recorrido](../expediciones/poncho.md), [diseño](../expediciones/poncho-diseno.md) y [fuentes](../expediciones/poncho-fuentes.md).
- [DEC-221](DEC-221-patrulla-y-paracaidas-en-una-parada.md) y [DEC-146](DEC-146-poncho-en-orden.md), que siguen vigentes.
