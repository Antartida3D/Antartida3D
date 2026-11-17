# DEC-237: ocultar la dirección de zoom que alcanzó su límite

```json
{
  "id": "DEC-237",
  "date": "2026-11-16",
  "status": "accepted",
  "issue": 237,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

El botón «Acercar» desaparece al llegar al máximo acercamiento y «Alejar» desaparece al llegar al máximo alejamiento. Cada uno reaparece al salir de su límite, también por rueda, pellizco o teclado. Se conserva el espacio de ambos para mantener estables las posiciones de los controles. Un botón oculto está deshabilitado y queda fuera de la navegación por teclado y del árbol de accesibilidad. Si tenía el foco, este pasa al otro botón de zoom disponible o al mapa.

La cámara 3D informa su disponibilidad a partir de la distancia de destino de la última orden de zoom y sus límites efectivos, que cambian con la ubicación, la proporción de la ventana y el viaje. Los botones se actualizan cuando ese destino alcanza o abandona un límite, sin esperar a que termine la animación de la cámara. Se usa una tolerancia numérica de 0,01 unidades. El respaldo 2D usa sus límites de escala existentes, de 1 a 5. El comportamiento también funciona con movimiento reducido.

## Motivo

El issue proponía mostrar los botones apagados. Durante la conversación de esta tarea, el usuario pidió que desaparezcan en cada extremo. La disponibilidad depende del estado real de la cámara: la escala 2D que recibe el mapa se recorta y no representa todo el rango del relieve 3D.

## Referencias

- [Issue #237](https://github.com/Antartida3D/Antartida3D/issues/237).
- Pedido del usuario en la tarea del issue #237, el 16 de noviembre de 2026: «podes hacer que el de menos desaparezca cuando esta al maximo de lejos y el de mas desaparezaca cuando esta al maximo de cerca?».
- [Regla de disponibilidad](../../packages/core/src/zoom.ts), [controles de zoom](../../packages/react-ui/src/map/ZoomControls.tsx) y [puente de la cámara](../../packages/react-ui/src/map3d/Map3DLayer.tsx).
