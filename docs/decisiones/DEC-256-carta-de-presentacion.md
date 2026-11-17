# DEC-256: carta de presentación en la primera visita

```json
{
  "id": "DEC-256",
  "date": "2026-11-17",
  "status": "accepted",
  "issue": 256,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

1. En la primera visita, cuando cierra la pantalla de carga y la página se asienta, se abre una carta que explica qué es la aplicación y cómo se usa. En escritorio (≥ 820 px) es una hoja modal; en celular, una hoja inferior con tres páginas. Es un diálogo accesible: foco atrapado, Escape y «atrás» del navegador la cierran.
2. Cualquier salida (las dos acciones, la X, Escape, «Saltar» y el velo) guarda que se vio, con la clave nueva `antartida:intro`. También la ve quien ya había visto la bienvenida anterior (`antartida:welcome`, que queda sin uso). Sale aunque haya expediciones hechas o un «Continuar» pendiente. Si hay un viaje o una transición en curso, no sale y no se marca como vista.
3. La acción primaria lleva a la expedición sugerida (`nextExpedition`): «Empezar en Ushuaia» si «Desde Ushuaia» no está hecha, o `Empezar en <título>` si ya lo está. Acerca el mapa a ese punto y muestra la tarjeta «Empezá acá» con un aro sobre el pin. Con las seis hechas solo queda «Explorar por mi cuenta».
4. La tarjeta reemplaza la pista «Tocá Desde Ushuaia para empezar». Se cierra con «Entendido», al tocar el pin, al mover el mapa o al empezar un viaje. La pista de gestos se oculta mientras la carta o la tarjeta están abiertas.
5. Un botón «?» (`.iconbtn`) reabre la carta sin mover la cámara y se oculta durante un viaje.
6. La carta no usa `BottomSheet`: trae manija y tamaños que el diseño no tiene. Es su propia sección con las clases de superficie del proyecto.
7. El botón de lista se nombra con `LIST_BUTTON_LABEL` («Actividades», #236) y no con el nombre viejo que muestran las capturas del diseño.

## Motivo

La bienvenida de #115 decía dónde tocar pero no qué era la aplicación ni qué pasaba al tocar; en celular ni se veía el título. Hubo personas que no entendieron nada. Se descartó un tour de globos paso a paso: sobre el lienzo 3D los blancos se mueven y esos tours se saltean sin leer.

Los textos «Te sugerimos seguir por <título>.» y «Tocá el punto para empezar la expedición.» (destino distinto de Ushuaia) son nuevos y quedan para revisión en el PR.

## Referencias

- [Issue #256](https://github.com/Antartida3D/Antartida3D/issues/256): carta de presentación.
- [Issue #115](https://github.com/Antartida3D/Antartida3D/issues/115): bienvenida anterior, reemplazada en parte (pista y clave).
- [Issue #236](https://github.com/Antartida3D/Antartida3D/issues/236): botón «Actividades».
- [DEC-75](DEC-75-orden-sugerido.md): orden sugerido de las expediciones.
