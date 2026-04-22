import {
  formatHex,
  interpolate,
  interpolatorSplineNatural,
  converter,
  type Oklch,
} from "culori";

const toOklch = converter("oklch");
export interface Colormap {
  name: string;
  colors: readonly string[];
}
export const DIVERGING_BLUE_RED: Colormap = {
  name: "Blue-Red Diverging",
  colors: [
    "#D9353C", // Most negative (red)
    "#F3634C",
    "#FF936D",
    "#F9C2A6",
    "#DEDFE0", // Zero (neutral gray)
    "#A9DBED",
    "#72C3E1",
    "#57A2D0",
    "#5B79C0", // Most positive (blue)
  ] as const,
};
export const POS_INF = 2147483647;
export const NEG_INF = -2147483648;
const MINUS_SIGN = "\u2212";
export function buildDivergingScale(
  colormap: Colormap,
  maxAbsValue: number,
): (value: number) => string {
  const colorInterpolator = interpolate(colormap.colors as string[], "oklab", {
    l: { use: interpolatorSplineNatural },
    a: { use: interpolatorSplineNatural },
    b: { use: interpolatorSplineNatural },
  } as never);
  const domain = Math.max(maxAbsValue, 1);

  return (value: number): string => {
    const t = (value + domain) / (2 * domain);
    const clampedT = Math.max(0, Math.min(1, t));
    const color = colorInterpolator(clampedT);
    return formatHex(color) ?? "#DEDFE0";
  };
}
export function getContrastingTextColor(bgColor: string): string {
  const bgOklch = toOklch(bgColor) as Oklch | undefined;

  if (!bgOklch) {
    return "#1a1a1a";
  }

  const luminance = bgOklch.l;
  const textL = luminance > 0.7 ? 0.325 : 0.975;
  const textC = (bgOklch.c ?? 0) * 0.8;
  const textH = bgOklch.h ?? 0;
  const textColor: Oklch = {
    mode: "oklch",
    l: textL,
    c: textC,
    h: textH,
  };

  return formatHex(textColor) ?? (luminance > 0.4 ? "#1a1a1a" : "#f5f5f5");
}
export function formatScore(value: number): string {
  if (value === POS_INF) {
    return `+\u221E`; // +∞
  }
  if (value === NEG_INF) {
    return `${MINUS_SIGN}\u221E`; // −∞
  }
  if (value < 0) {
    return `${MINUS_SIGN}${Math.abs(value)}`;
  }
  return value.toString();
}

function medianOfSorted(arr: ArrayLike<number>): number {
  const n = arr.length;
  const mid = n >> 1;
  return n & 1 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}
export function computeScaleLimit(scores: number[], k = 6.5): number {
  const finite = scores.filter((s) => s !== POS_INF && s !== NEG_INF);
  if (finite.length === 0) return 1;

  finite.sort((a, b) => a - b);
  const median = medianOfSorted(finite);
  const last = finite.length - 1;
  const maxAbs = Math.max(Math.abs(finite[0]), Math.abs(finite[last]));

  const deviations = finite.map((s) => Math.abs(s - median));
  deviations.sort((a, b) => a - b);
  const mad = medianOfSorted(deviations);

  if (mad === 0) return Math.max(1, maxAbs);
  return Math.max(1, Math.min(Math.round(mad * k), maxAbs));
}
