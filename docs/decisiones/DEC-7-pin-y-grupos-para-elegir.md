# DEC-7: Pin de Fósiles en la isla James Ross y grupos de puntos para elegir

```json
{
  "id": "DEC-7",
  "date": "2026-11-16",
  "status": "superseded",
  "issue": 7,
  "supersedes": [],
  "supersededBy": "DEC-238"
}
```

> Reemplazada por [DEC-238](DEC-238-marcadores-en-abanico.md) en lo de los grupos: ya no hay grupos ni ventana para elegir. Sigue vigente que el pin de Fósiles no se aleja de su lugar.

## Decisión

El punto de Fósiles va en el oeste de la isla James Ross (≈ 64,0° S, 58,05° O), donde ocurre casi todo el recorrido, y no se aleja de su lugar para que no se superponga con otros puntos.

Un grupo de puntos del mapa que no se separa ni con el zoom al máximo (Base Marambio y Fósiles; en el celular, también Poncho) ofrece elegir: al tocarlo se abre «Puntos en este lugar», una ventana chica sobre el mapa con esos puntos. Los demás grupos siguen acercando la cámara al tocarlos. La regla vive en `buildMarkers` (`pick` en `packages/core/src/markers.ts`) y vale para el mapa 2D y el 3D.

## Motivo

Toda la isla James Ross queda a menos de 11 unidades del mapa de Base Marambio, y para separarse con el zoom al máximo dos puntos necesitan unas 12 unidades en escritorio y unas 25 en el celular. Alejar el pin lo pondría a 150 o 200 km del lugar real. Se prefirió no inventar una ubicación y resolverlo en la interfaz. Antes de esto, en el celular, Base Marambio y Poncho tampoco se podían separar con el zoom.

## Referencias

- [Issue #7](https://github.com/Antartida3D/Antartida3D/issues/7) y [PR #195](https://github.com/Antartida3D/Antartida3D/pull/195): quien lleva el issue eligió esta opción entre alejar el pin o abrir Fósiles desde Marambio.
- Pruebas: `packages/core/test/map.test.ts` (qué puntos quedan juntos en cada pantalla y cuándo un grupo ofrece elegir) y `packages/e2e/tests/fossils.spec.ts` (elegir Fósiles desde el grupo y cerrarlo con «atrás»).
- [DEC-185](DEC-185-boton-atras-del-navegador.md): la ventana se registra como capa del mapa.
