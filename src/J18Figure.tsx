import { useMemo } from "react";
import type { FigureSpec } from "./bank";
import { layoutFigure } from "./j18FigureLayout";

const LABEL_Y = 20;

/**
 * Dot-pattern figure for a generated J18FIG practice item, drawn from its
 * `figureSpec` rather than a stored PNG. White background, black filled
 * circles, 1st/2nd/3rd labels, a grey arrow between frames, and a trailing
 * ellipsis.
 */
export function J18Figure({ spec }: { spec: FigureSpec }) {
  const layout = useMemo(() => layoutFigure(spec), [spec]);

  return (
    <svg
      className="j18figure"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label="Figure pattern"
      style={{ width: "100%", maxWidth: layout.width }}
    >
      <rect width="100%" height="100%" fill="white" />
      {layout.frames.map((frame) => (
        <g key={frame.label}>
          <text
            x={frame.centerX}
            y={LABEL_Y}
            textAnchor="middle"
            fontFamily="system-ui,sans-serif"
            fontSize="13"
            fill="#222"
          >
            {frame.label}
          </text>
          {frame.dots.map((dot, index) => (
            <circle key={index} cx={dot.x} cy={dot.y} r={layout.radius} fill="#111" />
          ))}
        </g>
      ))}
      {layout.arrows.map((arrow, index) => (
        <path
          key={index}
          d={`M ${arrow.x} ${arrow.y} L ${arrow.x + 30} ${arrow.y} L ${arrow.x + 30} ${arrow.y - 5} L ${
            arrow.x + 40
          } ${arrow.y + 7} L ${arrow.x + 30} ${arrow.y + 19} L ${arrow.x + 30} ${arrow.y + 14} L ${
            arrow.x
          } ${arrow.y + 14} Z`}
          fill="#ccc"
          stroke="#999"
          strokeWidth="1"
        />
      ))}
      {layout.ellipsis.map((dot, index) => (
        <circle key={index} cx={dot.x} cy={dot.y} r="2.2" fill="#666" />
      ))}
    </svg>
  );
}
