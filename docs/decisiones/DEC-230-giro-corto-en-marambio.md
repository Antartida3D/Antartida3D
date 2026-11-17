# DEC-230: la cámara de Marambio gira por el lado corto al pasar de un punto a otro

```json
{
  "id": "DEC-230",
  "date": "2026-11-16",
  "status": "accepted",
  "issue": 230,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

Al cambiar de punto en la visita a la Base Marambio, la cámara gira por el camino más corto alrededor del lugar. Después de cada `setLookAt` con transición, `MarambioScene.tsx` llama a `normalizeRotations()` de camera-controls. Las poses de cada punto (`spots.ts`) no cambian.

## Motivo

`setLookAt` de camera-controls 3.1.2 guarda el ángulo final entre −180° y 180°, sin compararlo con el ángulo actual. Si el vuelo cruza la costura de 180°, la cámara da la vuelta larga. «Edificios» mira desde 150° y los otros puntos desde 200° a 262°, así que todo vuelo de o hacia «Edificios» cruzaba esa costura.

Medido en el navegador antes y después, desde la vista general y entre puntos:

| Vuelo | Antes | Después |
|---|---|---|
| Hércules → Edificios | +243° a 568 °/s como máximo | −110° a 257 °/s como máximo |
| Meseta → Edificios | +292° a 681 °/s como máximo | −61° a 141 °/s como máximo |
| Edificios → Meseta | −292° a 677 °/s como máximo | +61° a 143 °/s como máximo |

La primera versión del issue suponía un giro de 62° a 112° en 0,32 s. La medición mostró que el giro era el doble o más, y por el lado equivocado.

No se probó otro tiempo de suavizado: con el giro corto, el vuelo más rápido (Hércules → Edificios) todavía llega a 257 °/s. Si se siente rápido, el siguiente paso es subir `smoothTime` en esos vuelos, como ya hacen Fósiles y Océano (0,6 s).

Otras escenas (Orcadas, Fósiles, Océano, el viaje) llaman a `setLookAt` del mismo modo y pueden tener el mismo giro largo si algún punto cruza la costura. No se revisaron en este issue.

## Referencias

- [Issue #230](https://github.com/Antartida3D/Antartida3D/issues/230).
- Pedido del usuario en la tarea del issue #230, el 16 de noviembre de 2026: «te pega un giro re brusco la cámara […] Marea».
- [`MarambioScene.tsx`](../../packages/react-ui/src/marambio/MarambioScene.tsx) y [`spots.ts`](../../packages/react-ui/src/marambio/spots.ts).
- Código de `setLookAt` y `normalizeRotations` en camera-controls 3.1.2 (`dist/camera-controls.module.js`).
