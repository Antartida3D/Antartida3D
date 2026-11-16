# Pantalla de carga cartográfica

La pantalla de carga cubre el primer render del mapa y comunica qué vista está disponible. Lleva `data-loading-variant="map3d"` cuando se prepara el relieve y `data-loading-variant="map2d"` cuando la vista guardada o el dispositivo empieza en el mapa dibujado. En ambos casos la ilustración SVG aparece de forma progresiva y el único panel `.ld-card` queda debajo de ella, centrado con la carta. El botón «Ver mapa 2D» permite salir de la espera del relieve 3D; la vista 2D solo espera a que estén disponibles su mapa base y su tinta, y no al precargado 3D en segundo plano.

En 3D se muestran cinco hitos reales del arranque: módulo de escena, relieve e hidrología, océano austral, tierras australes y luces/trazos de WebGL. En 2D se muestran dos hitos: inicialización y carta 2D, que agrupa el mapa base y la tinta cartográfica. El estado se anuncia también en la región viva para lectores de pantalla.

Cuando el estado está listo, la pantalla mantiene una espera calculada como `max(espera restante para completar 1.800 ms desde el montaje, 1.382 ms)` y luego inicia un fundido de 550 ms. La regla se aplica también si la carga real fue lenta: el reloj de 1.382 ms empieza después de `ready`, no se descuenta mientras cargan los recursos. Si la carga termina antes, se conserva además la permanencia mínima desde el montaje. No se muestra una ETA. Con `prefers-reduced-motion: reduce` se omiten la espera y el fundido animado, y se mantienen los estados y el botón de salida.

El fondo del loader usa el token global `--paper` y queda fijo al viewport. La paleta local de esta pantalla usa pergamino claro (`#F3E8D2`), tinta marrón (`#403536`), filete gris cálido (`#B9B0A5`) y óxido para la barra de progreso. Esta paleta no cambia los tokens de la aplicación. La silueta SVG reutiliza la geografía disponible como ilustración decorativa del estado de carga; no representa relieve ni una reconstrucción científica.

## Verificación

El contrato se verifica en `packages/e2e/tests/loading.spec.ts` para las variantes 2D y 3D, escritorio y móvil, y movimiento reducido. La validación automatizada registrada para esta entrega reúne 1.356 pruebas (`19` documentales, `650` de `core` y `687` de `react-ui`), además de `pnpm typecheck` y `pnpm build` sin errores. La E2E global final registró 366 casos: 322 pasaron, 44 se omitieron y no hubo fallos. Los resultados del cuerpo del PR se distinguen de ejecuciones históricas de otra rama o de casos que no se hayan repetido.
