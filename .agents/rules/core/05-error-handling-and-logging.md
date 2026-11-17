---
trigger: always_on
description: Manejo de errores y logging en la interfaz y almacenamiento.
---

# 05. Errores y Logging

> **Por qué:** Un error tragado o un fallo de contexto rompe la experiencia de usuario sin diagnóstico claro.

1. No captures una excepción sin manejarla o recuperar el estado.
2. Manejo explícito con try/catch en accesos a storage local (`localStorage` bloqueado o en modo incógnito).
3. Fallback controlado ante pérdida de contexto WebGL o ausencia de soporte 3D: volver a la vista 2D accesible sin bloquear la interfaz.
   - Todo lienzo 3D (`<Canvas>`) va dentro de `CanvasGuard` (`packages/react-ui/src/CanvasGuard.tsx`). Si el lienzo falla, la pantalla pasa a su respaldo en `onFail` y la aplicación muestra el aviso `Failed3DNotice`. Sin esa guarda, el error desmonta toda la aplicación y deja la página en blanco (#242).
4. No registres secretos, tokens ni datos personales en logs.
5. Los tests de Playwright fallan ante cualquier error no capturado en la consola del navegador.

## Guardián
Manejo de errores y red de seguridad en tests.

<!-- adapt -->
- Playwright captura errores de consola y excepciones no controladas en `packages/e2e/`.
- Lienzo 3D que falla: `packages/e2e/tests/webgl-failure.spec.ts`.
<!-- /adapt -->
