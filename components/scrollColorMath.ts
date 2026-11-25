export type ScrollColorTheme = "dark" | "light";

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

const DARK_START: RgbaColor = { r: 0, g: 130, b: 124, a: 0.65 }; // Soft bioluminescent teal
const DARK_MID: RgbaColor = { r: 203, g: 255, b: 252, a: 1 }; // #cbfffc --color-aurora-gradient
const DARK_END: RgbaColor = { r: 255, g: 255, b: 255, a: 1 }; // #ffffff --color-platinum

const LIGHT_START: RgbaColor = { r: 1, g: 38, b: 36, a: 0.24 }; // Muted pale abyssal teal
const LIGHT_MID: RgbaColor = { r: 0, g: 130, b: 124, a: 1 }; // #00827c --color-bioluminescent-gradient
const LIGHT_END: RgbaColor = { r: 1, g: 38, b: 36, a: 1 }; // #012624 --color-liquid-abyss

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function formatRgba(c: RgbaColor): string {
  const r = Math.round(c.r);
  const g = Math.round(c.g);
  const b = Math.round(c.b);
  const a = Math.round(c.a * 1000) / 1000;
  return a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Computes normalized viewport scroll progress (0..1) for an element.
 * Starts illuminating as the element enters the lower viewport (startRatio * vh)
 * and reaches full illumination by the upper-mid reading zone (endRatio * vh).
 */
export function computeViewportScrollProgress(
  rectTop: number,
  rectHeight: number,
  viewportHeight: number,
  startRatio = 0.88,
  endRatio = 0.30
): number {
  if (viewportHeight <= 0) return 1;
  const startY = viewportHeight * startRatio;
  const endY = viewportHeight * endRatio - Math.min(rectHeight * 0.25, 90);
  const span = startY - endY;
  if (span <= 0) return rectTop <= startY ? 1 : 0;
  return clamp01((startY - rectTop) / span);
}

/**
 * Computes individual word illumination progress (0..1) given overall scroll progress (0..1),
 * word index, total word count, and wave spread width.
 */
export function computeWordLocalProgress(
  scrollProgress: number,
  wordIndex: number,
  totalWords: number,
  waveWidth = 0.22
): number {
  const p = clamp01(scrollProgress);
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  if (totalWords <= 1) return p;
  const effectiveWave = Math.min(Math.max(waveWidth, 0.08), 0.5);
  const wordPos = wordIndex / (totalWords - 1);
  // Map p from [0, 1] across [-effectiveWave, 1 + effectiveWave] so at p=0 all words are 0 and at p=1 all words are 1
  const sweepHead = p * (1 + effectiveWave) - effectiveWave * wordPos;
  return clamp01((sweepHead - wordPos * (1 - effectiveWave)) / effectiveWave);
}

/**
 * Interpolates a 3-stop color gradient for a word at localProgress (0..1):
 * 0.0 -> start color, 0.5 -> luminous shimmer accent, 1.0 -> crisp locked ink.
 */
export function interpolateWordColor(
  localProgress: number,
  theme: ScrollColorTheme
): string {
  const t = clamp01(localProgress);
  const start = theme === "dark" ? DARK_START : LIGHT_START;
  const mid = theme === "dark" ? DARK_MID : LIGHT_MID;
  const end = theme === "dark" ? DARK_END : LIGHT_END;

  if (t <= 0.5) {
    const k = t * 2;
    return formatRgba({
      r: lerp(start.r, mid.r, k),
      g: lerp(start.g, mid.g, k),
      b: lerp(start.b, mid.b, k),
      a: lerp(start.a, mid.a, k),
    });
  }

  const k = (t - 0.5) * 2;
  return formatRgba({
    r: lerp(mid.r, end.r, k),
    g: lerp(mid.g, end.g, k),
    b: lerp(mid.b, end.b, k),
    a: lerp(mid.a, end.a, k),
  });
}

export function getInitialWordColor(theme: ScrollColorTheme): string {
  return formatRgba(theme === "dark" ? DARK_START : LIGHT_START);
}

export function getFinalWordColor(theme: ScrollColorTheme): string {
  return formatRgba(theme === "dark" ? DARK_END : LIGHT_END);
}
