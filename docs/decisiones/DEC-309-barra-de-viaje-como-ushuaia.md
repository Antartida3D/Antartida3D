# DEC-309: la barra del viaje de Poncho es la de los viajes desde Ushuaia

```json
{
  "id": "DEC-309",
  "date": "2026-11-18",
  "status": "accepted",
  "issue": 309,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

1. La barra del viaje de Poncho deja de tener el botón «‹ Hito N». Muestra, como en «Desde Ushuaia», la parada donde está el equipo con el chip «Leído · título» (o «Leer» si no se abrió). El chip abre la **ficha** de la parada al costado del mapa, con todo su texto, sin la escena, como en los demás viajes.
2. El **punto del mapa** de una parada ya hecha vuelve a entrar a ella completa: la escena y el panel. Si esa escena había perdido el contexto WebGL antes, se la vuelve a intentar.
3. La flecha ◀ sigue como en los demás viajes: mantenerla apretada hace retroceder el equipo por la ruta. Al llegar a una parada ya hecha aparece su chip y se puede tocar su punto.
4. En Poncho la primera parada también tiene su punto en el mapa, para volver a entrar a ella. Donde varias paradas comparten lugar (en Esperanza: la primera, el barco a Belgrano y la última) se muestra un solo punto: el de la parada siguiente si es una de ellas (amarillo, se abre al llegar), y si no, el de la última ya recorrida (gris, se puede tocar). Regla pura en `voyagePinShown`; los viajes desde Ushuaia siguen sin punto en la salida.
5. No cambia la lógica del viaje: las paradas de Poncho se siguen abriendo solas y en orden ([DEC-146](DEC-146-poncho-en-orden.md)), y no se puede abrir una que todavía no se recorrió.

## Motivo

Que la barra sea la misma en todas las expediciones: el botón propio de Poncho se veía distinto y hacía lo mismo que el chip de los otros viajes.

## Referencias

- [Issue #309](https://github.com/Antartida3D/Antartida3D/issues/309).
- Pedido de la persona que lleva el trabajo, en la conversación del 18 de noviembre de 2026: «sacar el botón de "hito n" y se parezca a [la barra de Desde Ushuaia] así no se cambia la lógica y tenemos lo mismo que las otras expediciones», con la flecha «como en Ushuaia, apretar y mantener para retroceder por la ruta, y el hito anterior se vuelve a abrir con su chip o su punto»; y después de probarlo: «me debería dejar entrar al hito cuando presiono el punto y que cuando presiono leído me aparezca el modal de la derecha», y «como el hito 1 y 7 son el mismo punto cuando salgo del hito 1 sigue estando amarillo y no gris. Luego del hito 6 recién se debería poner otra vez amarillo», y «si apreto lo gris no me deja entrar». Esta cita no representa una revisión posterior del resultado.
- Reemplaza en parte a [DEC-211](DEC-211-panel-de-poncho-como-fosiles.md): solo la frase sobre el botón «‹ Hito N» de la barra (ver su actualización de vigencia).
- [Diseño de la expedición](../expediciones/poncho-diseno.md).
