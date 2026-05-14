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
