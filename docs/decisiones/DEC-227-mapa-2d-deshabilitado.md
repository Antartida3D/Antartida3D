# DEC-227: mapa 2D deshabilitado, solo como respaldo automático

```json
{
  "id": "DEC-227",
  "date": "2026-11-16",
  "status": "accepted",
  "issue": 227,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

El mapa 2D queda deshabilitado hasta que esté pulido. Nadie lo elige: se muestra solo cuando el relieve 3D no puede funcionar, y la app pasa a él sola.

- **Cuándo aparece:** sin WebGL, o cuando el 3D informa un error de carga en `map3dLoadingStore` (malla, texturas, módulo o pérdida del contexto WebGL).
- **Qué se quita:** el selector «Mapa 2D / Relieve 3D» y el botón «Ver mapa 2D» de la pantalla de carga.
- **Vista inicial:** con WebGL siempre 3D, también con movimiento reducido, con ahorro de datos o con `'2d'` guardado en `antartida:view`. El primer render ya elige 3D, así que el 2D no se monta detrás de la pantalla de carga.
- **Aviso:** en el respaldo queda solo el botón «Relieve 3D · apagado» de #123. Sin WebGL explica cómo activar la aceleración por hardware; con un error de carga muestra el error y pide recargar.
- **Cómo se vuelve atrás:** una sola constante, `MAP_2D_ENABLED` (`core/src/view-mode.ts`). En `true` vuelven el selector, el botón de la pantalla de carga y el arranque en 2D por movimiento reducido, ahorro de datos o vista guardada. La elección inicial vive en `initialViewMode`, con prueba en `core/test/view-mode.test.ts`.
- **Tarjeta «Siguiente» en 3D (#75):** al pasar todo al 3D apareció que, en el celular horizontal, el marcador sugerido quedaba bajo la leyenda. La cuenta del 2D (`focusWorld`) no vale con la perspectiva del 3D. Ahora `MapView` espera a que el marcador quede quieto y lo desplaza en pantalla (comando `pan`) al medio de la zona libre. Vuelve a comprobar hasta tres veces, porque la inclinación de la cámara deforma el desplazamiento.
- **Pruebas e2e:** `show3D` (`packages/e2e/tests/map-helpers.ts`) reemplaza los clics al selector. Las pruebas propias del 2D se saltan con `test.skip(!MAP_2D_ENABLED, NO_2D)`; no se borran.
- **Fuera de alcance:** los respaldos sin WebGL dentro de las expediciones (fotos en Fósiles y Océano, dibujo en Orcadas y Marambio). No son el mapa 2D.

## Motivo

El relieve 3D es lo más pulido del proyecto y es lo que se quiere mostrar en la entrega. El 2D no está a la misma altura. Se conserva como respaldo porque sin WebGL no hay otra forma de mostrar el mapa (regla `20-web.md`: respaldo automático sin WebGL).

## Referencias

- Pedido de Lk en el [issue #227](https://github.com/Antartida3D/Antartida3D/issues/227), 16-11-2026.
- Cambia, mientras `MAP_2D_ENABLED` sea `false`, estos antecedentes del [historial](../decisiones.md): la vista inicial S7 (2D con movimiento reducido, ahorro de datos o vista guardada), el selector de «Sin WebGL, «Relieve 3D» avisa cómo activarlo» (#123) y el cambio de 2D a 3D de la bienvenida (#115).
- Deja sin efecto, mientras el 2D esté apagado, la salida a la vista 2D de la pantalla de carga descrita en [DEC-202](DEC-202-pergamino-claro.md) y en [pantalla de carga](../diseno/pantalla-carga.md). El resto de DEC-202 sigue vigente.
- Deja sin efecto el [issue #121](https://github.com/Antartida3D/Antartida3D/issues/121) mientras el 2D esté apagado.
