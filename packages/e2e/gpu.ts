/**
 * Chromium flags that draw with the machine's real GPU through ANGLE. Without them headless Chromium
 * draws WebGL with SwiftShader on the CPU (7 to 9 cores per GPU process during e2e, #87).
 * The ANGLE backend depends on the system: `gl-egl` on Linux, `d3d11` on Windows (`gl-egl` falls back
 * to SwiftShader there), `metal` on macOS. If the GPU is not usable, Chromium falls back to SwiftShader.
 */
export function gpuArgs(platform: NodeJS.Platform = process.platform): string[] {
  const angle = platform === 'win32' ? 'd3d11' : platform === 'darwin' ? 'metal' : 'gl-egl';
  return ['--use-gl=angle', `--use-angle=${angle}`, '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
}

export const GPU_ARGS = gpuArgs();

/** WebGL renderer string of a page, to confirm which GPU (or SwiftShader) is drawing. */
export function webglRenderer(): string {
  const gl = document.createElement('canvas').getContext('webgl');
  const info = gl?.getExtension('WEBGL_debug_renderer_info');
  return info ? String(gl!.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown';
}
