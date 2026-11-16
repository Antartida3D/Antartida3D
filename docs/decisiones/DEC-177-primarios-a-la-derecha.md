# DEC-177: Botones primarios a la derecha

```json
{
  "id": "DEC-177",
  "date": "2026-11-15",
  "status": "accepted",
  "issue": 177,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

En cada fila de botones, el botón primario (`.btn.primary`, azul) va último, a la derecha. Se ordena así en el código, no solo con CSS, para que el orden del teclado y del lector de pantalla sea el mismo que se ve. Una fila con un solo botón primario lo alinea a la derecha (`.row.end`, y `.vactions` en las fichas del viaje). En la barra del viaje, «Salir» (✕) queda a la izquierda y el botón principal a la derecha.

Vale en celular y en escritorio, para que sea igual en todos lados. Las barras de Orcadas y Marambio ya lo cumplían («Atrás» a la izquierda).

## Motivo

En el celular la mano derecha llega con el pulgar a la parte de abajo a la derecha de la pantalla: el botón que más se toca tiene que estar ahí.

## Referencias

- [Issue #177](https://github.com/Antartida3D/Antartida3D/issues/177): pedido y alcance.
- Pedido de NeichS el 15 de noviembre de 2026: los botones primarios a la derecha, más al alcance del dedo, por lo menos en celular.
