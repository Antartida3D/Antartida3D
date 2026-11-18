# DEC-309-2: las fotos de todas las expediciones se abren en un modal centrado común

```json
{
  "id": "DEC-309-2",
  "date": "2026-11-18",
  "status": "accepted",
  "issue": 309,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

1. La foto de una expedición, cuando se toca su miniatura, se abre en un solo componente, `PhotoModal` (`packages/react-ui/src/sheet/PhotoModal.tsx`). Lo usan Poncho, Marambio y Fósiles.
2. Es el modal que hizo Rocío para el archivo de Fósiles (#7) y de Marambio (#207): un recuadro en el medio de la pantalla, sobre un fondo oscuro, con el título, la cruz «Cerrar», la foto grande y debajo su texto, fecha, crédito y cita. Se cierra con «Cerrar», con Escape o tocando afuera, y el foco vuelve a la miniatura que lo abrió. Una cita `[N]` del texto de la foto abre la vista de fuentes y cierra la foto, para que las fuentes no se vean encima de ella. No es un `<dialog>` modal nativo, que dejaría la vista de fuentes tapada e inerte detrás.
3. Cada expedición conserva su título («Archivo fotográfico»; «Archivo de campo» en Fósiles) y su texto: solo cambia el modal de la foto.
4. Es una excepción al punto 1 de [DEC-264](DEC-264-modales-normalizados.md), solo para las fotos. El resto de los modales sigue en `BottomSheet`. La regla `40-componentes-ui.md` lo dice en su punto 10. El aspecto vive en `components.css` (`.photo-modal`) con los tokens `--modal-*`, y la prueba de guarda (`styles.test.ts`) impide que una pantalla lo cambie.

## Motivo

Con `BottomSheet`, la foto se abría al costado o desde abajo, más chica y con el panel encima. En el medio de la pantalla se ve entera y se lee como un archivo fotográfico, como estaba antes de normalizar los modales.

## Referencias

- [Issue #309](https://github.com/Antartida3D/Antartida3D/issues/309). Aviso en [#264](https://github.com/Antartida3D/Antartida3D/issues/264#issuecomment-6981557928), [#7](https://github.com/Antartida3D/Antartida3D/issues/7#issuecomment-6981558859) y [#207](https://github.com/Antartida3D/Antartida3D/issues/207#issuecomment-6981559797).
- Pedido de la persona que lleva el trabajo, en la conversación del 18 de noviembre de 2026: «cuando apretabas la foto te salía un modal en el medio [...] la primera que lo hizo y utilizó fue Rocío [...] ese mismo componente para todos». Esta cita no representa una revisión posterior del resultado.
- Reemplaza en parte a [DEC-264](DEC-264-modales-normalizados.md): solo el punto 1 para las fotos (ver su actualización de vigencia).
