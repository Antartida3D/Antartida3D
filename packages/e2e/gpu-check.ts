import { chromium, type FullConfig } from '@playwright/test';
import { chromiumPath } from './browser.ts';
import { GPU_ARGS, webglRenderer } from './gpu.ts';

/** Global setup with `E2E_GPU=1`: prints which renderer the suite draws with and warns on a fallback to SwiftShader. */
export default async function gpuCheck(_config: FullConfig): Promise<void> {
  const browser = await chromium.launch({ executablePath: chromiumPath, args: GPU_ARGS });
  try {
    const page = await browser.newPage();
    const renderer = await page.evaluate(webglRenderer);
    console.log(`E2E_GPU=1 · WebGL: ${renderer}`);
    if (/swiftshader/i.test(renderer)) {
      console.warn('Aviso: Chromium no pudo usar la GPU y dibuja con SwiftShader (CPU). La suite corre igual, pero sin la aceleración.');
    }
  } finally {
    await browser.close();
  }
}
