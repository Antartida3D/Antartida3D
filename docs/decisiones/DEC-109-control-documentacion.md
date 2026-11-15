# DEC-109: Control de documentación por PR

```json
{
  "id": "DEC-109",
  "date": "2026-11-14",
  "status": "accepted",
  "issue": 109,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

Cada PR declara qué documentación actualiza o justifica que no hay impacto documental. Las decisiones nuevas se conservan en archivos individuales con fecha, estado, motivo y referencias. Una decisión aceptada que cambia otra deja un reemplazo explícito en ambos registros.

La validación automática controla omisiones y consistencia del registro. Otra persona revisa el contenido y las excepciones. El requisito de documentación se aplica a humanos y agentes.

## Motivo

El documento histórico se actualiza, pero combina explicaciones vigentes con antecedentes que fueron reemplazados. Registrar una nota nueva sin corregir lo que dejó de ser cierto dificulta reconstruir las decisiones. Se incorpora un control por PR y se conserva el historial existente para una revisión separada.

## Referencias

- [Issue #109](https://github.com/Roolivero/Antartida3D/issues/109): alcance y aceptación del trabajo.
- Acuerdo del usuario en la conversación del 14 de noviembre de 2026: «te parece agregar este nuevo control? asi evitamos que se pierdan decisiones», en respuesta a la propuesta de declaración por PR, vigencia de decisiones, comprobación automática y revisión antes de integrar. El issue registra esa autorización; esta cita no representa una revisión posterior de la implementación.
- [Reglas, formato y activación](../control-documentacion.md).

## Estado de implementación y verificación

Implementado localmente en la rama `109-control-documentacion`, sobre `d2834ef`. Verificación del 14 de noviembre de 2026: 18 pruebas del validador, 253 de core y 113 de react-ui aprobadas; `pnpm typecheck` y `pnpm build` completados. La compilación advierte sobre chunks mayores de 500 kB. La declaración preparada para este cambio pasa y la plantilla sin completar falla como se espera.

La ejecución del workflow en GitHub y la activación del requisito obligatorio en `main` siguen pendientes. Activarlo requiere una acción administrativa; la aceptación de esta decisión no equivale a que el control ya esté activo.
