import type {
  FigureFamily,
  FigureLayout as SpecLayout,
  FigureRule,
  FigureSpec,
  UFrame,
} from "./bank";

export type Point = { x: number; y: number };

/** Number of dots in the kth pattern (1-based). */
export function T(a: number, rule: FigureRule, k: number): number {
  if (rule.kind === "const") return a + (k - 1) * rule.c;
  if (rule.kind === "n") return a + (k * (k - 1)) / 2;
  return a + (k - 1) * (k + rule.c);
}

/** The constant-add `c` of a `const` / `lin` rule (both carry `c`). */
function ruleC(rule: FigureRule): number {
  if (rule.kind === "n") throw new Error("expected a rule with c, got kind=n");
  return rule.c;
}

// ── helpers ────────────────────────────────────────────────────────────────

/** A centered unit row of `width` dots at height `y` (y-up). */
function centeredRow(width: number, y: number, center = 0): Point[] {
  const x0 = center - (width - 1) / 2;
  const pts: Point[] = [];
  for (let i = 0; i < width; i += 1) pts.push({ x: x0 + i, y });
  return pts;
}

// ── plus (2015) ─────────────────────────────────────────────────────────────
function plusL0(a: number): number {
  if ((a - 1) % 4 !== 0 || a < 1) {
    throw new Error(`plus requires a=1+4*L0, got a=${a}`);
  }
  return (a - 1) / 4;
}

function plusDots(a: number, k: number, layout?: SpecLayout): Point[] {
  const L0 = layout && layout.L0 != null ? layout.L0 : plusL0(a);
  const L = L0 + (k - 1);
  const pts: Point[] = [{ x: 0, y: 0 }];
  for (let i = 1; i <= L; i += 1) {
    pts.push({ x: i, y: 0 }, { x: -i, y: 0 }, { x: 0, y: i }, { x: 0, y: -i });
  }
  return pts;
}

// ── hook (2019 Z-hook) ──────────────────────────────────────────────────────
function hookParams(layout?: SpecLayout): { bar: number; arm: number } {
  if (!layout || layout.bar == null || layout.arm == null) {
    throw new Error("hook requires layout {bar, arm}");
  }
  const B0 = layout.bar;
  const U0 = layout.arm;
  if (B0 < 3 || U0 < 1) throw new Error(`hook needs B0>=3, U0>=1, got ${B0},${U0}`);
  return { bar: B0, arm: U0 };
}

function hookDots(a: number, k: number, layout?: SpecLayout): Point[] {
  const { bar: B0, arm: U0 } = hookParams(layout);
  if (a !== B0 + 2 * U0) {
    throw new Error(`hook a=${a} != B0+2*U0=${B0 + 2 * U0}`);
  }
  const B = B0 + 2 * (k - 1);
  const U = U0 + (k - 1);
  const pts: Point[] = [];
  for (let x = 0; x < B; x += 1) pts.push({ x, y: 0 });
  for (let y = 1; y <= U; y += 1) pts.push({ x: 1, y });
  for (let y = 1; y <= U; y += 1) pts.push({ x: B - 2, y: -y });
  return pts;
}

// ── grid (2016 stepped rectangle) ───────────────────────────────────────────
function gridW0(a: number, c: number): number {
  if (c < 3 || (a + 1) % c !== 0) {
    throw new Error(`grid requires a=c*W0-1, got a=${a}, c=${c}`);
  }
  const W0 = (a + 1) / c;
  if (W0 < 2) throw new Error(`grid W0 must be >=2, got ${W0}`);
  return W0;
}

function gridDots(a: number, k: number, rule: FigureRule, layout?: SpecLayout): Point[] {
  const c = ruleC(rule);
  const W0 = layout && layout.W0 != null ? layout.W0 : gridW0(a, c);
  const H = c - 1;
  const W = W0 + (k - 1);
  const pts: Point[] = [];
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) pts.push({ x, y });
  }
  for (let x = 1; x < W; x += 1) pts.push({ x, y: H });
  return pts;
}

// ── cluster (2012 growing staircase) ────────────────────────────────────────
function clusterDots(a: number, k: number): Point[] {
  if (a < 1) throw new Error(`cluster a must be >=1, got ${a}`);
  const pts: Point[] = [];
  for (let x = 0; x < a; x += 1) pts.push({ x, y: 0 });
  for (let h = 1; h < k; h += 1) {
    const x = a + (h - 1);
    for (let y = 0; y < h; y += 1) pts.push({ x, y });
  }
  return pts;
}

// ── trap (2020 / 2021 complete centered rows) ───────────────────────────────
function trapRowLengths(a: number, c: number, k: number): number[] {
  const rows = [a];
  for (let n = 1; n < k; n += 1) rows.push(2 * n + c);
  return rows;
}

function trapDotsRows(a: number, c: number, k: number): Point[] {
  const lengths = [...trapRowLengths(a, c, k)].sort((x, y) => x - y);
  const n = lengths.length;
  const pts: Point[] = [];
  for (let i = 0; i < n; i += 1) {
    const y = n - 1 - i;
    pts.push(...centeredRow(lengths[i], y));
  }
  return pts;
}

function trapDotsVhole(k: number): Point[] {
  const nRows = k + 1;
  const pts: Point[] = [];
  for (let i = 0; i < nRows; i += 1) {
    const w = 2 * i + 1;
    const y = nRows - 1 - i;
    if (i === nRows - 1) {
      const x0 = -(w - 1) / 2;
      const mid = (w - 1) >> 1;
      for (let j = 0; j < w; j += 1) {
        if (j === mid) continue;
        pts.push({ x: x0 + j, y });
      }
    } else {
      pts.push(...centeredRow(w, y));
    }
  }
  return pts;
}

function trapDots2020(k: number): Point[] {
  let lengths: number[];
  if (k === 1) lengths = [3];
  else if (k === 2) lengths = [2, 4];
  else lengths = trapRowLengths(3, 1, k);
  const n = lengths.length;
  const pts: Point[] = [];
  for (let i = 0; i < n; i += 1) {
    const y = n - 1 - i;
    pts.push(...centeredRow(lengths[i], y));
  }
  return pts;
}

function trapDots(a: number, k: number, rule: FigureRule, layout?: SpecLayout): Point[] {
  const c = ruleC(rule);
  const style = layout?.style ?? "rows";
  if (style === "vhole") {
    if (a !== 3 || c !== 3) throw new Error("trap style vhole only for a=3, c=3");
    return trapDotsVhole(k);
  }
  if (style === "trap2020") {
    if (a !== 3 || c !== 1) throw new Error("trap style trap2020 only for a=3, c=1");
    return trapDots2020(k);
  }
  return trapDotsRows(a, c, k);
}

// ── diamond (2017 filled flattened hex / plus rings) ────────────────────────
const DIAMOND_YSCALE = 0.75;
const DIAMOND_YSCALE_C4 = 1.0;

function diamondC2RowWidths(k: number): number[] {
  if (k < 1) throw new Error(`diamond k must be >=1, got ${k}`);
  const n = 2 * k - 1;
  const center = k - 1;
  const maxW = 2 * Math.floor(k / 2) + 1;
  const widths: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const d = Math.abs(i - center);
    if (d === k - 1) widths.push(1);
    else if (k % 2 === 0) widths.push(maxW - 2 * Math.ceil(d / 2));
    else widths.push(maxW - 2 * Math.floor(d / 2));
  }
  return widths;
}

function diamondDotsC2(k: number, ysc: number): Point[] {
  const widths = diamondC2RowWidths(k);
  const n = widths.length;
  const mid = (n - 1) / 2;
  const pts: Point[] = [];
  for (let i = 0; i < n; i += 1) {
    const y = (mid - i) * ysc;
    pts.push(...centeredRow(widths[i], y));
  }
  return pts;
}

function diamondRingC4(r: number, ysc: number): Point[] {
  const pts = new Set<string>();
  const put = (x: number, y: number) => pts.add(`${x},${y}`);
  put(-(r + 1), 0);
  put(r + 1, 0);
  put(-r, r);
  put(r, r);
  put(-r, -r);
  put(r, -r);
  for (let x = -r + 2; x < r; x += 2) {
    put(x, r);
    put(x, -r);
  }
  if (pts.size !== 2 * r + 4) {
    throw new Error(`c4 ring r=${r} has ${pts.size} != ${2 * r + 4}`);
  }
  return [...pts]
    .map((key) => {
      const [x, y] = key.split(",").map(Number);
      return { x, y: y * ysc };
    })
    .sort((p, q) => p.x - q.x || p.y - q.y);
}

function diamondDots(a: number, k: number, rule: FigureRule, layout?: SpecLayout): Point[] {
  if (a !== 1) throw new Error(`diamond requires a=1, got ${a}`);
  const c = ruleC(rule);
  if (c === 2) {
    const ysc = layout?.yScale ?? DIAMOND_YSCALE;
    return diamondDotsC2(k, ysc);
  }
  if (c === 4) {
    const ysc = layout?.yScale ?? DIAMOND_YSCALE_C4;
    const pts: Point[] = [{ x: 0, y: 0 }];
    for (let r = 1; r < k; r += 1) pts.push(...diamondRingC4(r, ysc));
    return pts;
  }
  throw new Error(`diamond only supports c=2 or c=4, got c=${c}`);
}

// ── U (2022 hollow / thick / V-notched U) ───────────────────────────────────
function uVnotchDots(W: number, H: number, G: number): Point[] {
  const holeAt = new Map<number, number>();
  let g = G;
  let rowFromTop = 0;
  while (g >= 1) {
    holeAt.set(H - 1 - rowFromTop, g);
    rowFromTop += 1;
    g -= 2;
  }
  const pts: Point[] = [];
  for (let y = 0; y < H; y += 1) {
    const hole = holeAt.get(y) ?? 0;
    if (hole === 0) {
      for (let x = 0; x < W; x += 1) pts.push({ x, y });
    } else {
      const left = (W - hole) >> 1;
      const right = left + hole;
      for (let x = 0; x < left; x += 1) pts.push({ x, y });
      for (let x = right; x < W; x += 1) pts.push({ x, y });
    }
  }
  return pts;
}

function uThickDots(t: number, W: number, H: number): Point[] {
  if (W <= 2 * t || H <= t) {
    throw new Error(`thick U must stay hollow (W=${W},H=${H},t=${t})`);
  }
  const pts: Point[] = [];
  for (let y = 0; y < H; y += 1) {
    if (y < t) {
      for (let x = 0; x < W; x += 1) pts.push({ x, y });
    } else {
      for (let x = 0; x < t; x += 1) pts.push({ x, y });
      for (let x = W - t; x < W; x += 1) pts.push({ x, y });
    }
  }
  return pts;
}

function uDotsFromFrame(frame: UFrame): Point[] {
  if (frame.style === "vnotch") return uVnotchDots(frame.w, frame.h, frame.g);
  if (frame.style === "thick") return uThickDots(frame.t, frame.w, frame.h);
  throw new Error(`unknown U style ${(frame as UFrame).style}`);
}

function uDots(k: number, layout?: SpecLayout): Point[] {
  const frames = layout?.frames ?? [];
  if (k < 1 || k > frames.length) {
    throw new Error(`U layout has no frame for k=${k} (frames=${frames.length})`);
  }
  return uDotsFromFrame(frames[k - 1]);
}

// ── dispatcher ──────────────────────────────────────────────────────────────
export function dotsFor(
  family: FigureFamily,
  a: number,
  k: number,
  rule: FigureRule,
  layout?: SpecLayout,
): Point[] {
  switch (family) {
    case "plus":
      return plusDots(a, k, layout);
    case "hook":
      return hookDots(a, k, layout);
    case "grid":
      return gridDots(a, k, rule, layout);
    case "cluster":
      return clusterDots(a, k);
    case "trap":
      return trapDots(a, k, rule, layout);
    case "diamond":
      return diamondDots(a, k, rule, layout);
    case "U":
      return uDots(k, layout);
    default:
      throw new Error(`unknown family ${family}`);
  }
}

/** Unique dots for pattern `k` of a full figure spec. */
export function dotsForSpec(spec: FigureSpec, k: number): Point[] {
  return dotsFor(spec.family, spec.a, k, spec.rule, spec.layout);
}

export type FamilyAlign = "center" | "bottom";

export function familyAlign(family: FigureFamily): FamilyAlign {
  return family === "plus" || family === "diamond" ? "center" : "bottom";
}

// ── SVG layout ──────────────────────────────────────────────────────────────
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

const PITCH = 17;
const RADIUS = 5.5;
const CONTENT_TOP = 34;
const BOTTOM = 22;
const FRAME_LEFT = 30;
const ARROW_MARGIN = 24;
const ARROW_GAP = 96;

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

function ordinal(index: number): string {
  return index < ORDINALS.length ? ORDINALS[index] : `${index + 1}th`;
}

function bbox(pts: Point[]): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Full SVG layout for a figure spec: `show` frames side by side, a label above
 * each, a grey arrow between frames, and a trailing ellipsis. Coordinates are
 * SVG viewBox units (y grows down). Bottom-aligned families sit on a shared
 * baseline below the labels; plus / diamond are vertically centred in the
 * content area. Each frame's own min/max bounds are used (negative coordinates
 * are expected for plus / hook / trap / diamond).
 */
export function layoutFigure(spec: FigureSpec): FigureLayout {
  const { family, show } = spec;
  const align = familyAlign(family);

  const unitFrames: Point[][] = [];
  const boxes: ReturnType<typeof bbox>[] = [];
  for (let k = 1; k <= show; k += 1) {
    const pts = dotsForSpec(spec, k);
    unitFrames.push(pts);
    boxes.push(bbox(pts));
  }

  const frameHeights = boxes.map((b) => (b.maxY - b.minY) * PITCH + 2 * RADIUS);
  const maxFrameHeight = Math.max(...frameHeights);
  const contentBottom = CONTENT_TOP + maxFrameHeight;
  const height = contentBottom + BOTTOM;
  const centreY = CONTENT_TOP + maxFrameHeight / 2;

  const frames: FigureFrame[] = [];
  const arrows: { x: number; y: number }[] = [];
  let cursor = FRAME_LEFT;

  for (let index = 0; index < show; index += 1) {
    const { minX, maxX, minY, maxY } = boxes[index];
    const width = (maxX - minX) * PITCH + 2 * RADIUS;
    const boxTop = CONTENT_TOP + (maxFrameHeight - frameHeights[index]) / 2;

    const dots = unitFrames[index].map((dot) => {
      const x = cursor + RADIUS + (dot.x - minX) * PITCH;
      const y =
        align === "bottom"
          ? contentBottom - RADIUS - (dot.y - minY) * PITCH
          : boxTop + RADIUS + (maxY - dot.y) * PITCH;
      return { x, y };
    });

    frames.push({ label: ordinal(index), centerX: cursor + width / 2, dots });
    cursor += width;

    if (index < show - 1) {
      arrows.push({ x: cursor + ARROW_MARGIN, y: centreY - 7 });
      cursor += ARROW_GAP;
    }
  }

  const ellipsisX = cursor + ARROW_MARGIN;
  const ellipsis: Point[] = [0, 1, 2].map((i) => ({ x: ellipsisX + i * 10, y: centreY }));

  return {
    width: ellipsisX + 40,
    height,
    frames,
    arrows,
    ellipsis,
    radius: RADIUS,
  };
}
