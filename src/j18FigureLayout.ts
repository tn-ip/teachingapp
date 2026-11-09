import type { FigureFamily, FigureRule, FigureSpec } from "./bank";

export type Point = { x: number; y: number };

/** Number of dots in the kth pattern (1-based). */
export function T(a: number, rule: FigureRule, k: number): number {
  if (rule.kind === "const") return a + (k - 1) * rule.c;
  if (rule.kind === "n") return a + (k * (k - 1)) / 2;
  return a + (k - 1) * (k + rule.c);
}

/** Grid spacing between dot centres, per family. */
const SPACING: Record<FigureFamily, number> = { L: 18, tri: 16, U: 16 };

/** Dot radius, per family. */
const RADIUS: Record<FigureFamily, number> = { L: 5.5, tri: 5, U: 5 };

/** Row sizes (top to bottom) for a triangle of exactly `n` dots. */
function triRows(n: number): number[] {
  let rows = 0;
  while (((rows + 1) * (rows + 2)) / 2 <= n) rows += 1;
  const counts: number[] = [];
  for (let i = 1; i <= rows; i += 1) counts.push(i);
  const remainder = n - (rows * (rows + 1)) / 2;
  if (remainder > 0) counts.push(remainder);
  return counts;
}

/**
 * Local dot coordinates for one frame. x grows right from 0, y grows up from 0
 * (the bottom row of the shape sits on y = 0). The point count is exactly `n`.
 */
export function dotsForFrame(family: FigureFamily, n: number): Point[] {
  if (family === "L") return dotsL(n);
  if (family === "tri") return dotsTri(n);
  return dotsU(n);
}

/**
 * Growing L: a vertical bar and a bottom bar sharing one corner.
 * v = ceil(n/2) vertical dots, h = n - v + 1 dots along the bottom,
 * so v + h - 1 === n.
 */
function dotsL(n: number): Point[] {
  const s = SPACING.L;
  const v = Math.ceil(n / 2);
  const h = n - v + 1;
  const dots: Point[] = [];
  for (let col = 0; col < h; col += 1) dots.push({ x: col * s, y: 0 });
  for (let row = 1; row < v; row += 1) dots.push({ x: 0, y: row * s });
  return dots;
}

/**
 * Growing triangle: full rows 1..r while triangular, remainder on the next row.
 * Rows are centred on a shared grid so the remainder may look uneven, but the
 * count is exact.
 */
function dotsTri(n: number): Point[] {
  const s = SPACING.tri;
  const rows = triRows(n);
  const dots: Point[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const count = rows[i];
    const y = (rows.length - 1 - i) * s;
    const leftmost = -Math.floor(count / 2) * s;
    for (let j = 0; j < count; j += 1) dots.push({ x: leftmost + j * s, y });
  }
  const minX = Math.min(...dots.map((dot) => dot.x));
  return dots.map((dot) => ({ x: dot.x - minX, y: dot.y }));
}

/**
 * Hollow U only: a bottom row of `w` dots plus two arms of `sides` dots each,
 * so w + 2 * sides === n. A count too small for a hollow U falls back to a
 * single bottom row.
 */
function dotsU(n: number): Point[] {
  const s = SPACING.U;
  const sides = Math.round((n - 1) / 4);
  const w = n - 2 * sides;
  const dots: Point[] = [];
  if (w >= 3) {
    for (let col = 0; col < w; col += 1) dots.push({ x: col * s, y: 0 });
    for (let row = 1; row <= sides; row += 1) {
      dots.push({ x: 0, y: row * s });
      dots.push({ x: (w - 1) * s, y: row * s });
    }
    return dots;
  }
  for (let col = 0; col < n; col += 1) dots.push({ x: col * s, y: 0 });
  return dots;
}

export type FigureFrame = {
  label: string;
  centerX: number;
  dots: Point[];
};

export type FigureLayout = {
  width: number;
  height: number;
  frames: FigureFrame[];
  arrows: { x: number; y: number }[];
  ellipsis: Point[];
  radius: number;
};

const CONTENT_TOP = 34;
const FRAME_LEFT = 30;
const ARROW_MARGIN = 24;
const ARROW_GAP = 88;

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

function ordinal(index: number): string {
  if (index < ORDINALS.length) return ORDINALS[index];
  return `${index + 1}th`;
}

/**
 * Full SVG layout for a figure spec: frames side by side on a shared baseline,
 * a label above each, a grey arrow between frames, and a trailing ellipsis.
 * Coordinates are SVG viewBox units (y grows down). Arrow `y` is the top-left
 * of the chevron box.
 */
export function layoutFigure(spec: FigureSpec): FigureLayout {
  const { family, a, rule, show } = spec;
  const spacing = SPACING[family];
  const perFrame = Array.from({ length: show }, (_, i) => dotsForFrame(family, T(a, rule, i + 1)));
  const extents = perFrame.map((dots) => dots.reduce((max, dot) => Math.max(max, dot.x), 0));
  const tops = perFrame.map((dots) => dots.reduce((max, dot) => Math.max(max, dot.y), 0));
  const maxTop = Math.max(...tops);
  const baseline = CONTENT_TOP + maxTop;
  const centreY = baseline - maxTop / 2;

  const frames: FigureFrame[] = [];
  const arrows: { x: number; y: number }[] = [];
  let left = FRAME_LEFT;
  for (let index = 0; index < show; index += 1) {
    const extent = extents[index];
    const svgDots = perFrame[index].map((dot) => ({ x: left + dot.x, y: baseline - dot.y }));
    frames.push({ label: ordinal(index), centerX: left + extent / 2, dots: svgDots });
    left += extent + spacing;
    if (index < show - 1) {
      arrows.push({ x: left + ARROW_MARGIN, y: centreY - 7 });
      left += ARROW_GAP;
    }
  }

  const ellipsisX = left + ARROW_MARGIN;
  const ellipsis: Point[] = [0, 1, 2].map((i) => ({ x: ellipsisX + i * 10, y: centreY }));

  return {
    width: ellipsisX + 40,
    height: baseline + spacing,
    frames,
    arrows,
    ellipsis,
    radius: RADIUS[family],
  };
}
