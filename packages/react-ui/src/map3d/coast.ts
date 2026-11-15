export interface CoastBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export type CoastSdf = (x: number, y: number) => number;

/**
 * Signed distance to the Bedmap3 coastline (map units, > 0 on land and ice) from the alpha channel
 * of an RGBA image, encoded as round(32 + sdf * 32) like paintedTerrain.glsl.ts. `texelAt` turns map
 * coordinates into continuous texel coordinates of the image (texel centres at whole numbers); the
 * alpha is interpolated bilinearly. Outside the image it is -1 (sea).
 */
export function sdfFromAlpha(data: Uint8ClampedArray, width: number, height: number, texelAt: (x: number, y: number) => [number, number]): CoastSdf {
  return (x, y) => {
    const [gx, gy] = texelAt(x, y);
    if (!(gx >= 0 && gy >= 0 && gx <= width - 1 && gy <= height - 1)) return -1;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const x1 = Math.min(width - 1, x0 + 1);
    const y1 = Math.min(height - 1, y0 + 1);
    const fx = gx - x0;
    const fy = gy - y0;
    const alpha = (c: number, r: number) => data[(r * width + c) * 4 + 3];
    const a0 = alpha(x0, y0) + (alpha(x1, y0) - alpha(x0, y0)) * fx;
    const a1 = alpha(x0, y1) + (alpha(x1, y1) - alpha(x0, y1)) * fx;
    return (a0 + (a1 - a0) * fy - 32) / 32;
  };
}

let cachedSdf: CoastSdf | null = null;
let cachedKey: string | null = null;
let loading: Promise<CoastSdf | null> | null = null;

/**
 * Reads the coast mask of the relief texture once, only in a square window of `reach` map units
 * round (cx, cy): a small crop instead of the whole texture, so it costs little memory and no
 * noticeable time. Texels are found as the GPU samples the texture in paintedTerrain.glsl.ts
 * (uv over `bounds`, texel = uv * size - 0.5), so the coast matches the inked one on screen.
 * Resolves to null, with a warning, if the image cannot be read.
 */
export function loadCoastSdf(url: string, bounds: CoastBounds, cx: number, cy: number, reach: number): Promise<CoastSdf | null> {
  const key = `${url}|${cx},${cy},${reach}`;
  if (cachedKey === key && (cachedSdf || loading)) return cachedSdf ? Promise.resolve(cachedSdf) : loading!;
  cachedKey = key;
  cachedSdf = null;
  const image = new Image();
  image.src = url;
  loading = image
    .decode()
    .then(() => {
      const W = image.naturalWidth;
      const H = image.naturalHeight;
      const texel = (x: number, y: number): [number, number] => [
        ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * W - 0.5,
        ((y - bounds.minY) / (bounds.maxY - bounds.minY)) * H - 0.5,
      ];
      const [ax, ay] = texel(cx - reach, cy - reach);
      const [bx, by] = texel(cx + reach, cy + reach);
      const c0 = Math.max(0, Math.floor(ax) - 1);
      const r0 = Math.max(0, Math.floor(ay) - 1);
      const w = Math.min(W, Math.ceil(bx) + 2) - c0;
      const h = Math.min(H, Math.ceil(by) + 2) - r0;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      // The texture's alpha is data, not transparency: read it without colour management.
      const ctx = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
      if (!ctx) throw new Error('2D canvas unavailable');
      ctx.drawImage(image, c0, r0, w, h, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      const fn = sdfFromAlpha(data, w, h, (x, y) => {
        const [gx, gy] = texel(x, y);
        return [gx - c0, gy - r0];
      });
      if (cachedKey === key) cachedSdf = fn;
      return fn;
    })
    .catch((err: unknown) => {
      console.warn('Could not read the coast mask of the relief:', err);
      return null;
    });
  return loading;
}

/** Signed distance to the Bedmap3 coastline at map coordinates (x, y), or null while it is not read. */
export function coastSdfAt(x: number, y: number): number | null {
  return cachedSdf ? cachedSdf(x, y) : null;
}
