---
trigger: always_on
description: Pruebas automatizadas.
---

# 07. Testing

> **Por qué:** Una verificación concreta es lo que permite al agente iterar solo.

1. Escribe pruebas para todo código nuevo con lógica (proyecciones, cálculos de cámara, clustering, persistencia).
2. Para un bug, escribe primero la prueba que falla y luego el arreglo.
3. Corre solo las pruebas del módulo tocado durante el desarrollo; antes de abrir el PR corre `pnpm test` y `pnpm e2e:smoke`; la suite e2e completa (`pnpm e2e`) la corre quien revisa, antes de mergear.
4. Mantén pruebas deterministas: sin red real, sin reloj real, independientes del orden de ejecución.
5. No debilites ni borres una prueba para hacerla pasar.
   - No: Cambiar el valor esperado hasta que coincida.
   - Sí: Entender por qué falla y corregir el código o el requisito.

## Guardián
Suite de pruebas del proyecto.

<!-- adapt -->
- Pruebas unitarias: `pnpm test` (Vitest para `@antartida/core`).
- Pruebas E2E: `pnpm e2e` (`@antartida/e2e` con Playwright a 390 y 1440 px).
- Humo E2E: `pnpm e2e:smoke` (`packages/e2e/tests/smoke.spec.ts`): las vistas cargan y cada expedición arranca.
<!-- /adapt -->
