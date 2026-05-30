const toRgb = (hsl: string): [number, number, number] => {
  const [h, s, l] = hsl.match(/[\d.]+/g)!.map(Number);
  const ld = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const c = (s / 100) * Math.min(ld, 1 - ld);
  const f = (n: number) => ld - c * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
};

export const withAlpha = (rgb: readonly [number, number, number], alpha: number): [number, number, number, number] =>
    [rgb[0], rgb[1], rgb[2], Math.round(alpha * 255)];

export const TRANSPARENT: [number, number, number, number] = [0, 0, 0, 0];

export const MAP_COLORS = {
  DEFAULT_PRIMARY:   toRgb("hsl(20, 65%, 25%)"),
  DEFAULT_SECONDARY: toRgb("hsl(20, 30%, 30%)"),
  SELECTED_PRIMARY:  toRgb("hsl(355,70%,42%)"),
  SELECTED_SECONDARY: toRgb("hsl(355,60%,52%)"),
} as const;

const hexRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const PRICE_GRADIENT: [number, number, number][] = [
  hexRgb('#499960'),
  hexRgb('#81943b'),
  hexRgb('#cf9f27'),
  hexRgb('#c55b27'),
  hexRgb('#af2b2b'),
]

const FREQUENCY_GRADIENT: [number, number, number][] = [
  hexRgb('#233487'),
  hexRgb('#4a528c'),
  hexRgb('#874e7c'),
  hexRgb('#ae574a'),
  hexRgb('#c19422'),
]

function lensColor(t: number, alpha: number, gradient: [number, number, number][]): [number, number, number, number] {
  const n = gradient.length - 1
  const c = Math.max(0, Math.min(1, t))
  const seg = Math.min(Math.floor(c * n), n - 1)
  const lt = c * n - seg
  const [r0, g0, b0] = gradient[seg]
  const [r1, g1, b1] = gradient[seg + 1]
  return [
    Math.round(r0 + (r1 - r0) * lt),
    Math.round(g0 + (g1 - g0) * lt),
    Math.round(b0 + (b1 - b0) * lt),
    Math.round(alpha * 255),
  ]
}

/** Maps a route price (1–99) across the price gradient. */
export function priceColor(price: number, alpha = 1): [number, number, number, number] {
  return lensColor((Math.max(1, Math.min(99, price)) - 1) / 98, alpha, PRICE_GRADIENT)
}

/** Maps a route frequency (flights/day) across the frequency gradient. */
export function frequencyColor(freq: number, maxFreq: number, alpha = 1): [number, number, number, number] {
  return lensColor(maxFreq > 0 ? Math.max(0, Math.min(1, freq / maxFreq)) : 0, alpha, FREQUENCY_GRADIENT)
}
