import type { SeqDot } from '../lib/sequence'

type DotFigureProps = {
  dots: SeqDot[]
  compact?: boolean
  label: string
}

const FILL: Record<SeqDot['role'], string> = {
  solid: '#0f6e67',
  corner: '#a16207',
  extra: '#1e4b8a',
  ghost: 'transparent',
}

const STROKE: Record<SeqDot['role'], string> = {
  solid: '#0a4f4a',
  corner: '#854d0e',
  extra: '#1e3a8a',
  ghost: '#b7aa98',
}

export function DotFigure({ dots, compact = false, label }: DotFigureProps) {
  if (dots.length === 0) return null

  const xs = dots.map((d) => d.x)
  const ys = dots.map((d) => d.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const span = Math.max(maxX - minX, maxY - minY, 1)
  const gap = compact ? 16 : Math.min(26, Math.max(14, 240 / span))
  const r = compact ? 4.4 : Math.max(4.8, gap * 0.32)
  const pad = compact ? 10 : Math.max(12, gap * 0.7)
  const width = (maxX - minX) * gap + pad * 2
  const height = (maxY - minY) * gap + pad * 2

  return (
    <svg
      className={compact ? 'dot-svg compact' : 'dot-svg'}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      {dots.map((d, i) => {
        const cx = pad + (d.x - minX) * gap
        const cy = pad + (d.y - minY) * gap
        const newDot = d.isNew && d.role !== 'ghost'
        const fill = newDot ? '#c4451a' : FILL[d.role]
        const stroke = newDot ? '#9a3412' : STROKE[d.role]
        return (
          <circle
            key={`${d.x}-${d.y}-${i}`}
            cx={cx}
            cy={cy}
            r={r}
            fill={fill}
            stroke={stroke}
            strokeWidth={d.role === 'ghost' ? 1.6 : compact ? 1 : 1.6}
            strokeDasharray={d.role === 'ghost' ? '3 3' : undefined}
            opacity={d.role === 'ghost' ? 0.7 : 1}
          />
        )
      })}
    </svg>
  )
}
