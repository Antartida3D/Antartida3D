# DEC-202-2: estados compartidos de los controles cartográficos

```json
{
  "id": "DEC-202-2",
  "date": "2026-11-16",
  "status": "accepted",
  "issue": 202,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

Normalizar mediante CSS compartido los estados visuales de los controles de «Pergamino claro». En reposo, el botón normal usa papel, el principal aguada marfil y el ghost fondo transparente. En hover, los normales y ghost usan aguada marfil; el principal usa una aguada sepia más intensa. «Continuar» conserva su ocre. El hover se limita a dispositivos con puntero fino y capacidad de hover.

La selección y los estados semánticos de leído, perdido, exacto o cercano conservan sus colores propios y un refuerzo perceptible al pasar el puntero. Los controles deshabilitados no cambian por hover ni pulsación. El foco visible conserva el contorno azul y la geometría del control; no fuerza un radio global de 2 px. Los paneles de 13 px, botones rectangulares de 9 px y excepciones semánticas de DEC-202 permanecen vigentes.

Se conservan textos, significado de los iconos, fuentes, áreas de interacción y comportamientos. La fuente común de estados es CSS; no se establece un nuevo componente React universal, contrato modal, navegación ni contención de foco. La auditoría de otros cambios de alcance se registra por separado; no autoriza restauraciones sin evidencia.

El ajuste de área táctil autorizado de esta continuación es la altura mínima de 44 px del botón de la pantalla de carga. La acción de la ficha usa la variante primaria compartida y los controles de Marambio con `aria-pressed="true"` reciben el estado visual de selección; no cambian sus acciones.

La aclaración posterior del usuario identifica las «medallas» como `MilestoneLog` y el icono señalado como el control de retroceso `◀️`. Se recuperan el marco discontinuo del cuaderno y las cápsulas de 18 px, manteniendo su altura mínima actual de 44 px, la paleta y su aparición al llegar. El control de retroceso conserva la flecha con presentación monocroma. No se añade persistencia a los hitos, no se cambia su progreso ni se reemplazan pines o modelos de barco.

La revisión visual posterior acepta las barras finas de progreso y las categorías de ficha sin delimitación como elecciones de esta dirección. Se conservan sin convertirlas en hallazgos pendientes; esta aceptación no altera sus valores, acciones ni datos.

## Motivo

La revisión posterior a la integración del PR #203 encontró un contrato documental que todavía pedía hover azul y un radio de foco ya retirado. El usuario pidió normalizar los controles, eliminar ese hover azul y continuar el análisis de anomalías. La aguada cálida mantiene la dirección de papel y tinta; el foco sigue siendo distinguible de hover y selección.

Esta decisión complementa DEC-202, que no prescribe el color de hover, y reemplaza las instrucciones anteriores de hover azul y radio propio de foco en `DESIGN.md` y el plan de migración. Esas referencias quedan identificadas como históricas. No cambia el contrato de carga; su revisión en #227 pertenece a otra tarea.

## Referencias

- [Continuación de #202](https://github.com/Antartida3D/Antartida3D/issues/202#issuecomment-6929368272): pedido y alcance de la normalización, con GiulianoPoeta99 como único asignado.
- [Aclaración sobre cápsulas y retroceso](https://github.com/Antartida3D/Antartida3D/issues/202#issuecomment-6929621437): recuperaciones visuales autorizadas sin cambios de progreso o navegación.
- [DEC-202](DEC-202-pergamino-claro.md): dirección visual y radios que se conservan.
- [DESIGN.md](../../DESIGN.md): contrato visual vigente.
- [Registro de normalización y auditoría](../diseno/normalizacion-controles-2026-11-16.md): implementación, evidencia y límites de esta continuación.
