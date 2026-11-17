# DEC-253: los pines que se pisan se separan de a pares, no en un polígono

```json
{
  "id": "DEC-253",
  "date": "2026-11-16",
  "status": "accepted",
  "issue": 253,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

Cuando dos o más pines se pisan en pantalla, cada par que está a menos de la distancia mínima se aleja sobre la línea que los une, la mitad de lo que falta cada uno. Se repite hasta que todos los pares quedan a esa distancia. La regla sigue en `fanOffsets` (`packages/core/src/fan.ts`) y vale para el mapa 2D y el 3D.

- Cada pin se mueve solo lo que necesitan sus vecinos. Un pin lejano no se muda porque una cadena de vecinos llegue hasta él.
- Un movimiento chico del mapa da un movimiento chico de los pines. Ninguno salta cuando un par cruza la distancia mínima.
- En el mapa 3D, un pin que sale de la pantalla se oculta pero sigue ocupando su lugar en el cálculo, hasta una distancia mínima más allá del borde. Así sus vecinos no saltan de vuelta en el momento en que sale.

Se mantiene todo lo demás de [DEC-238](DEC-238-marcadores-en-abanico.md): sin grupos con número, cada pin con su línea a su lugar real, distancia mínima de 60 px (80 px en pantallas anchas) y el palito más alto cuanto más se corre el pin. Cambia solo la forma del corrimiento: ya no es un polígono regular alrededor del centro del grupo. Por eso DEC-238 no se marca como reemplazada.

## Motivo

El 16 de noviembre de 2026 se vio en el celular que, al arrastrar el mapa 3D, los pines saltaban y sus líneas cruzaban el continente. La regla anterior unía en un solo grupo a todos los pines encadenados (A cerca de B, B cerca de C) y los ponía a todos en un polígono alrededor del centro del grupo. En una pantalla de 390 px casi todos los puntos quedan encadenados. En la medición, siete puntos, de la Península al mar de Ross, formaron un grupo, y el pin del Monte Erebus quedó a 219 px de su lugar. Cada vez que un par cruzaba los 60 px, el grupo cambiaba y todos saltaban.

Con la regla nueva, en esa misma situación ningún pin se aleja más de 49 px, y el Polo Sur y el Monte Erebus se mueven menos de 10 px.

## Referencias

- [Issue #253](https://github.com/Antartida3D/Antartida3D/issues/253): reproducción, mediciones y causa.
- [DEC-238](DEC-238-marcadores-en-abanico.md): marcadores en abanico. Sigue vigente salvo la forma del corrimiento.
- Pruebas: `packages/core/test/map.test.ts` (cadena medida en el celular y ausencia de saltos) y `packages/e2e/tests/fossils.spec.ts`.
