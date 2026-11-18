# DEC-283: Océano avanza con un solo botón y sin acciones opcionales

```json
{
  "id": "DEC-283",
  "date": "2026-11-18",
  "status": "accepted",
  "issue": 283,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

1. En la expedición Océano, el botón principal hace la segunda vista de una parada antes de avanzar. Pasa en tres paradas:
   - parada 1, «Mirar bajo el hielo»;
   - parada 6, «Mirar bajo el agua»;
   - parada 10, «Ver un ejemplo documentado».

   En la segunda vista vuelve a decir «Siguiente», y la flecha de atrás vuelve a la primera vista.
2. Se quitaron los botones de acción opcional. Lo que mostraban ahora se ve solo:
   - la jorobada come sola: da una vuelta y entra al enjambre con la boca abierta;
   - la cámara sigue a la minke;
   - la cámara sigue la inmersión del emperador, que atrapa un pez.

   Lo que no aportaba se quitó:
   - «Resaltar sus conexiones», que no hacía nada visible;
   - la comparación de barbas y dientes, con sus dos piezas sueltas.
3. «Ampliar lo diminuto» pasó a ser una lupa chica («Aumentar tamaño» / «Volver diminuto») colgada de una diatomea de la escena.
4. Se quitaron también:
   - los botones de Fuentes, porque las fuentes se abren desde las citas [N];
   - el botón de enfocar, porque la cámara no se puede alejar;
   - la barra superior de capítulos;
   - la etiqueta «Ilustración»;
   - el estilo de paradas ya vistas.
5. Cada parada muestra todo su texto de una vez, sin «Saber más». La parada 1 dice una parte sobre el hielo y la otra debajo. Esto no cambia DEC-264: donde hay «Saber más», sigue siendo `MoreFold`.
6. El panel de escritorio tiene siempre el mismo alto, para que «Siguiente» quede en el mismo lugar en todas las paradas. Pasa lo siguiente:
   - en el celular, la hoja no sube más que su contenido (`BottomSheet` con `ceiling`), y plegada muestra el título;
   - la cámara no cambia al plegar o desplegar la hoja;
   - el cartel de ubicación lleva el pin del mapa, abajo a la izquierda en escritorio y arriba a la derecha en el celular.
7. El registro final ya no lista las acciones que se quitaron. Solo queda «Aumentar el fitoplancton: opcional».

## Motivo

Lo pidió quien lleva el issue al revisar la expedición paso a paso:
- los botones dentro del texto se perdían;
- algunos no hacían nada visible;
- otros obligaban a apretar para ver lo que la parada ya contaba.

Con un solo botón, siempre en el mismo lugar, se puede recorrer rápido sin perder ninguna escena.

## Referencias

- [Issue #283](https://github.com/Antartida3D/Antartida3D/issues/283). El pedido consta en la sesión de trabajo del 17 y 18 de noviembre de 2026.
- [DEC-264](DEC-264-modales-normalizados.md), puntos 3 y 5.
- [Diseño de Océano](../expediciones/oceano-diseno.md).
