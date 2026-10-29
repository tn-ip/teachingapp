/**
 * Pointy-top honeycomb, odd rows shifted right by half a hex.
 * Centres are spaced so parallel sides stay `gap` apart. Bridges are the
 * visible segment in that gap: every geometric neighbour, nothing else.
 */

export const HEX_GAP = 12;
const MIN_HEX_WIDTH = 128;
const SQRT3 = Math.sqrt(3);

export type HexSlot = {
  index: number;
  col: number;
  row: number;
  /** Centre x, px. */
  x: number;
  /** Centre y, px. */
  y: number;
};

export type HexBridge = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type HoneycombLayout = {
  slots: HexSlot[];
  bridges: HexBridge[];
  width: number;
  height: number;
  hexW: number;
  hexH: number;
};

export function hexWidthFor(containerWidth: number, columns: number, gap = HEX_GAP): number {
  const safeColumns = Math.max(1, columns);
  // Widest cluster is a staggered pair of rows: (columns + 0.5) hexes plus gaps.
  return (containerWidth - (safeColumns - 0.5) * gap) / (safeColumns + 0.5);
}

/**
 * Large bands fill the width so rank order stays easy to scan.
 * Smaller bands pick a squarer cluster: no single-hex tail when a fuller shape exists.
 */
export function columnsForCount(count: number, maxColumns: number): number {
  if (count <= 1) return 1;
  const cap = Math.max(1, Math.min(maxColumns, count));
  if (count >= 12) return cap;
  let best = cap;
  let bestScore = Infinity;
  for (let columns = 1; columns <= cap; columns += 1) {
    const rows = Math.ceil(count / columns);
    const last = count % columns || columns;
    const orphan = last === 1 ? 4 : 0;
    const skinny = Math.max(0, rows - columns) * 0.5;
    const wide = Math.max(0, columns - rows - 1);
    const score = orphan + skinny + wide;
    if (score < bestScore) {
      bestScore = score;
      best = columns;
    }
  }
  return best;
}

/** Pick a column count that keeps each hex wide enough to read on an iPad and a phone. */
export function fitHoneycomb(containerWidth: number, gap = HEX_GAP): {
  columns: number;
  hexW: number;
  gap: number;
} {
  const width = Math.max(0, containerWidth);
  for (let columns = 5; columns >= 2; columns -= 1) {
    const hexW = Math.floor(hexWidthFor(width, columns, gap));
    if (hexW >= MIN_HEX_WIDTH) return { columns, hexW, gap };
  }
  const single = Math.floor(hexWidthFor(width, 1, gap));
  return { columns: 1, hexW: Math.max(48, Math.min(width || 48, single)), gap };
}

export function layoutHoneycomb(
  count: number,
  columns: number,
  hexW: number,
  gap: number,
): HoneycombLayout {
  const safeColumns = Math.max(1, columns);
  const stepX = hexW + gap;
  const stepY = (SQRT3 / 2) * stepX;
  const hexH = (2 / SQRT3) * hexW;
  const slots: HexSlot[] = [];
  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / safeColumns);
    const col = index % safeColumns;
    slots.push({
      index,
      col,
      row,
      x: (col + (row % 2) * 0.5) * stepX + hexW / 2,
      y: row * stepY + hexH / 2,
    });
  }

  const byCoord = new Map<string, HexSlot>();
  for (const slot of slots) byCoord.set(`${slot.col},${slot.row}`, slot);

  const bridges: HexBridge[] = [];
  for (const slot of slots) {
    for (const [col, row] of neighbourCoords(slot.col, slot.row)) {
      const other = byCoord.get(`${col},${row}`);
      if (!other || other.index <= slot.index) continue;
      const segment = bridgeSegment(slot.x, slot.y, other.x, other.y, hexW);
      if (segment) bridges.push(segment);
    }
  }

  let width = hexW;
  let height = hexH;
  if (slots.length === 0) {
    width = 0;
    height = 0;
  }
  for (const slot of slots) {
    width = Math.max(width, slot.x + hexW / 2);
    height = Math.max(height, slot.y + hexH / 2);
  }

  return { slots, bridges, width, height, hexW, hexH };
}

function neighbourCoords(col: number, row: number): [number, number][] {
  if (row % 2 === 0) {
    return [
      [col - 1, row],
      [col + 1, row],
      [col - 1, row - 1],
      [col, row - 1],
      [col - 1, row + 1],
      [col, row + 1],
    ];
  }
  return [
    [col - 1, row],
    [col + 1, row],
    [col, row - 1],
    [col + 1, row - 1],
    [col, row + 1],
    [col + 1, row + 1],
  ];
}

/** The piece of the centre-line that sits in the gap, clear of both hexes. */
function bridgeSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  hexW: number,
): HexBridge | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const inset = hexW / 2 + 2;
  if (dist <= inset * 2 + 0.5) return null;
  const start = inset / dist;
  const end = 1 - start;
  return {
    x1: x1 + dx * start,
    y1: y1 + dy * start,
    x2: x1 + dx * end,
    y2: y1 + dy * end,
  };
}
