# DEC-256: guía de primera visita sobre el mapa

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

1. En la primera visita (sin la clave `antartida:intro`), la pantalla de carga no se cierra sola: al terminar, su misma tarjeta pasa a «Mapa listo» con «Sin guía» y «Exploración guiada» ([DEC-258](DEC-258-pantalla-de-carga.md)). Las visitas siguientes no ven la tarjeta ni la guía.
2. «Exploración guiada» lleva la cámara a la expedición sugerida (`nextExpedition`) y empieza una guía de tres pasos sobre el mapa, anclada a cosas reales: (1) el pin sugerido, con qué significa cada tipo de pin y los gestos; (2) el registro de exploración, con dónde queda guardado el avance; (3) el botón naranja («Siguiente: <título>» o «Continuar»), que guía el orden sugerido y retoma una expedición a medias. Con las seis hechas no hay botón naranja y la guía termina en el paso 2.
3. La guía es un diálogo accesible: foco atrapado con Tab, Escape y «atrás» del navegador la cierran, y el foco vuelve al «?» o al mapa. En el paso 1 el mapa sigue respondiendo al puntero. Si el ancla está fuera de pantalla o escondida, la tarjeta se acomoda abajo al centro, sin flecha ni aro.
4. Cualquier salida (Sin guía, Saltar guía, Escape, «atrás», «Explorar por mi cuenta» o la expedición del paso 3) guarda `antartida:intro`. También la ve quien ya había visto la bienvenida anterior (`antartida:welcome`, que queda sin uso) y quien ya tiene expediciones hechas o un «Continuar» pendiente. Si hay un viaje, una ficha o una transición abiertos, la guía se cierra.
5. La acción primaria del paso 3 abre la expedición sugerida, igual que tocar su pin: «Empezar en Ushuaia» si «Desde Ushuaia» no está hecha, o `Empezar en <título>` si ya lo está.
6. El botón naranja no se ve durante los pasos 1 y 2: se enciende recién cuando el paso 3 lo explica.
7. El halo de la expedición sugerida (`.mk.next`) rodea también a la de «Continuar»: sirven para lo mismo, mostrar a dónde ir.
8. El botón «?» (`.iconbtn`) reabre la guía en el paso 1, lleva primero la cámara al pin sugerido, no reabre «Mapa listo» y se oculta durante un viaje.
9. La lógica vive en `@antartida/core` (`firstVisitStep`, `guidePlacement`, los textos de `content/guide.ts`) con pruebas. La tarjeta anclada es `GuideStep` y los tres pasos son `Guide`, con los botones y tokens de `components.css`.
10. El botón de lista se nombra con `LIST_BUTTON_LABEL` («Actividades», #236) y no con el nombre viejo que muestran las capturas del diseño.

## Motivo

La bienvenida de #115 decía dónde tocar pero no qué era la aplicación ni qué pasaba al tocar; en celular ni se veía el título. Hubo personas que no entendieron nada. Una primera versión de #256 resolvió eso con una carta modal con tres columnas (hoja en escritorio, tres páginas en celular). Se descartó por dos problemas que aparecieron al usarla: el modal tapaba lo más lindo de la carga, el mapa dibujándose, y pedía elegir «Empezar en Ushuaia» antes de que la persona hubiera visto el mapa o un pin, sin saber qué elegía. Con la guía la explicación aparece con el mapa a la vista y señala lo que explica.

Se descartó también un tour de globos paso a paso: sobre el lienzo 3D los blancos se mueven y esos tours se saltean sin leer. Los tres pasos fijos, con el aro sobre el ancla, evitan ese problema y la persona puede cerrarlos en cualquier momento.

El texto del paso 3 («Siguiente: <título>» sugiere un orden y «Continuar» retoma una expedición a medias) lo pidió quien lleva el issue. Solo afirma lo que hace el código: `nextExpedition` sobre `EXPEDITION_ORDER` ([DEC-75](DEC-75-orden-sugerido.md)) y la clave `antartida:last` ([DEC-186](DEC-186-orientacion-continuar-expedicion.md)). Los textos «Esta es la sugerida: <título>» (destino distinto de Ushuaia) y los del paso 3 son nuevos y quedan para revisión en el PR.

## Referencias

- [Issue #256](https://github.com/Antartida3D/Antartida3D/issues/256): carta de presentación y guía de primera visita.
- [Issue #258](https://github.com/Antartida3D/Antartida3D/issues/258): pantalla de carga nueva, de la que la tarjeta «Mapa listo» es parte.
- [Issue #115](https://github.com/Antartida3D/Antartida3D/issues/115): bienvenida anterior, reemplazada en parte (pista, clave y espera).
- [Issue #236](https://github.com/Antartida3D/Antartida3D/issues/236): botón «Actividades».
- [DEC-75](DEC-75-orden-sugerido.md): orden sugerido de las expediciones.
- [DEC-186](DEC-186-orientacion-continuar-expedicion.md): «Continuar» retoma la expedición.
- [DEC-234](DEC-234-componentes-de-interfaz.md): botones y componentes, sin líneas dobles.
