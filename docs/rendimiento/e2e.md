# Tiempo de la suite e2e

Medido a mano para #87 el 14 nov 2026. Está fuera de `pnpm bench` porque una corrida completa sin GPU tarda unos 20 minutos.

- **Máquina:** Windows 11, AMD Ryzen 9 5900XT (32 hilos), NVIDIA GeForce RTX 3070. La máquina quedó casi libre: solo había un `pnpm dev` de otra rama abierto.
- **Navegador:** Chromium 158.0.8127.18 de Playwright 1.65.0.
- **Código:** `main` en `202e9fe`, más los cambios de #87.
- **Suite:** 192 ejecuciones: 67 pruebas en 13 archivos, en los perfiles `mobile`, `desktop`, `mobile-compact` y `mobile-landscape`.
- **Cómo:** `pnpm e2e` con `E2E_PORT=5113`, porque el 5103 estaba ocupado. Tiempo de reloj de toda la corrida, compilación incluida. La compilación tarda menos de 1 s (`built in 477ms`), así que no pesa.

## Resultados

| Corrida | WebGL | Workers | Tiempo | Resultado |
|---|---|---|---|---|
| Antes (config de `main`) | SwiftShader (CPU) | 1 | 24,8 min | 106 pasan, 70 fallan, 16 salteadas* |
| Después, sin variables | SwiftShader (CPU) | 1 | 20,4 min | 163 pasan, 29 salteadas |
| `E2E_GPU=1` | RTX 3070 (D3D11) | 1 | 7,9 min | 162 pasan, 1 falla** |
| `E2E_GPU=1 E2E_WORKERS=4` | RTX 3070 (D3D11) | 4 | 2,3 min | 163 pasan, 29 salteadas |
| `E2E_GPU=1 E2E_WORKERS=8` | RTX 3070 (D3D11) | 8 | 2,2 min | 162 pasan, 1 falla*** |

\* La corrida «antes» no sirve como línea base limpia. Unos 55 fallos fueron `ERR_CONNECTION_REFUSED`: el servidor de vista previa dejó de responder, primero de a ratos y después del todo. Los demás fueron `claims` (6 ejecuciones) y dos timeouts de Orcadas (`orcadas.spec.ts:327` en `mobile` y `:448` en `desktop`). Esas pruebas pasaron en la corrida «después, sin variables», que no toca su código. Con 70 fallos, algunos inmediatos y otros por timeouts de 60 s, el tiempo de «antes» no se compara directo con los demás. La comparación justa es entre «después, sin variables» (20,4 min) y `E2E_GPU=1 E2E_WORKERS=4` (2,3 min): cerca de 9 veces más rápido.

\** `map3d` (giro con dos dedos, `mobile`). Lo arregló #87; ver la sección siguiente.

\*** `ocean3d` con movimiento reducido. Lo arregló #87; ver la sección siguiente. Con 8 workers no se gana casi nada frente a 4: la prueba más larga (`voyage-arrival.spec.ts:65`, unos 24 s) marca el piso.

Las 29 salteadas son `test.skip` por perfil, por ejemplo los gestos táctiles en `desktop`. En la corrida «antes» eran 16 porque muchas fallaron antes de llegar al `skip`.

## Pruebas más lentas

Suma de todas las pruebas: 1203 s con SwiftShader y 1 worker, y 459 s con GPU y 4 workers. Con 4 workers, el tiempo de reloj queda mucho más bajo que esa suma.

| Prueba | SwiftShader, 1 worker | GPU, 4 workers |
|---|---|---|
| `orcadas-observation.spec.ts:152` (`desktop`) | 78 s | menos de 7 s |
| `voyage-arrival.spec.ts:65` (`desktop`) | 66 s | 24 s |
| `orcadas.spec.ts:414` (`desktop`) | 43 s | menos de 7 s |
| `orcadas.spec.ts:70` (`desktop`) | 41 s | menos de 7 s |

## Lo que apareció al correr con GPU y en paralelo

Con la GPU real, los cuadros salen mucho más rápido, y algunas pruebas dependían del ritmo lento de SwiftShader. Se arreglaron sin aflojar lo que comprueban:

- **`map3d.spec.ts`, giro con dos dedos:** fallaba 6 de 6 con GPU (0,777 rad contra 0,785). `camera-controls` deja de estar `active` cuando a la cámara le falta menos de `restThreshold` (0,01) para llegar, y la prueba leía el ángulo en ese momento. Ahora las tres pruebas de cámara esperan a que la cámara llegue a su destino (`cameraSettled`).
- **`ocean3d.spec.ts`, movimiento reducido:** con 8 workers fallaba 3 de 16. La espera fija de 1 s no alcanzaba para que terminara de cargar el relieve. A veces, además, se cumplía antes de que la escena dibujara su primer cuadro. Ahora espera a que la escena haya dibujado y después pase medio segundo sin dibujar (`framesSettled`). También compara las capturas a escala CSS: con GPU, dos capturas del mismo cuadro a 2,625 píxeles por punto diferían en 1 a 4 píxeles por 1 nivel de color.
- **`ocean3d.spec.ts`, documento oculto:** con 8 workers fallaba 4 de 32. Los cuadros extra venían de la carga de texturas, no del reloj del mar. Usa la misma espera `framesSettled`.

**Sin resolver:** `ocean3d.spec.ts:49` (el mar no avanza más rápido que el reloj de la página) falla 1 de cada 48 veces con 4 u 8 workers, y pasa 48 de 48 con 1. La evidencia está en #41.

## Más de un worker sin GPU

Con SwiftShader y 4 workers, `map3d.spec.ts` («dragging moves over the map…», `desktop`) se pasa del tiempo límite de 30 s en 4 de 4 corridas, también con la prueba sin los cambios de #87. Cada proceso de SwiftShader usa de 7 a 9 núcleos. Por eso `E2E_WORKERS` se usa solo con `E2E_GPU=1`.

## Argumentos de GPU según el sistema

Medido con el renderer de WebGL (`WEBGL_debug_renderer_info`) en esta máquina:

| `--use-angle=` | Renderer |
|---|---|
| (sin argumentos) | SwiftShader |
| `gl-egl` | SwiftShader: en Windows no toma la placa |
| `d3d11` | RTX 3070, Direct3D 11 |
| `gl` | RTX 3070, OpenGL 4.5 |
| `vulkan` | RTX 3070, Vulkan 1.4 |

`packages/e2e/gpu.ts` usa `d3d11` en Windows, `gl-egl` en Linux (medido en `docs/rendimiento.md`) y `metal` en macOS (sin medir). El benchmark usaba `gl-egl` en todos los sistemas, así que en Windows medía con SwiftShader. Ahora comparte los mismos argumentos.
