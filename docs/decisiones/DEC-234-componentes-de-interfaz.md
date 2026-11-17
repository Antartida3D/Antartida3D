# DEC-234: componentes de interfaz con una sola definición, primario azul y sin líneas dobles

```json
{
  "id": "DEC-234",
  "date": "2026-11-16",
  "status": "accepted",
  "issue": 234,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

1. Cada componente de interfaz (botón, botón redondo, píldora, chip y nota de cuaderno) tiene una sola definición, en `packages/core/src/styles/components.css`. Sus colores salen de tokens de componente en `tokens.css`. La hoja de una pantalla solo lo acomoda (tamaño, espacio, tipografía); no cambia color, fondo, borde ni hover.
2. El botón primario es azul (`--deep`) con texto claro. Es la acción principal de la pantalla, último a la derecha.
3. El hover de un botón oscurece un poco su color de reposo y pinta el botón entero. No cambia a azul.
4. No hay líneas dobles ni marcos interiores: botones, paneles y separadores llevan una sola línea.
5. El chip «Leer» de la barra del viaje usa el fondo de los botones, no blanco.
6. Cada hito de la lista «Hitos del viaje» lleva el pin del mapa: dorado si se abrió y gris apagado si no, como los iconos del cuaderno de avistajes de la misma tarjeta.

La regla para el equipo y los agentes es `.agents/rules/project/40-componentes-ui.md`. La prueba `packages/core/test/styles.test.ts` la controla.

## Motivo

Después de la migración a «Pergamino claro», el botón primario tenía el mismo fondo que el secundario y no se distinguía la acción principal. El aspecto del botón estaba definido o pisado en cuatro hojas de estilo, así que un cambio no llegaba a todas las pantallas. El hover azul, el borde doble y el marco interior se revisaron en pantalla el 16 de noviembre de 2026: el marco interior quedaba sin pintar en el hover y las líneas dobles se descartaron en toda la aplicación.

Esta decisión cambia tres puntos de la dirección «Pergamino claro» descrita en `DESIGN.md` (DEC-202): el hover azul del botón, el borde doble con marco interior de botones y paneles, y los filetes dobles. El resto de esa dirección (pergamino, tinta, radios, tipografías, carga cartográfica) sigue vigente; por eso DEC-202 no se marca como reemplazada.

## Referencias

- [Issue #234](https://github.com/Antartida3D/Antartida3D/issues/234): normalización de componentes, regla y prueba.
- [Issue #231](https://github.com/Antartida3D/Antartida3D/issues/231): primario azul, hover suave y líneas simples. El acuerdo consta en la revisión en pantalla de quien lleva el issue, el 16 de noviembre de 2026.
- [Issue #232](https://github.com/Antartida3D/Antartida3D/issues/232): chip «Leer».
- [Issue #233](https://github.com/Antartida3D/Antartida3D/issues/233): pin en los hitos del viaje.
- [DESIGN.md](../../DESIGN.md): tokens y sistema visual actualizados.
- [DEC-202](DEC-202-pergamino-claro.md): dirección visual que esta decisión ajusta en parte.
- [DEC-177](DEC-177-primarios-a-la-derecha.md): el primario va último, a la derecha.
