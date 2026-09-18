import {
  clipSteps,
  formatMoney,
  niceMax,
  yTicks,
  type InterestMode,
  type StepPoint,
  type YearSnapshot,
} from '../lib/interest'

type InterestChartProps = {
  mode: InterestMode
  principal: number
  years: YearSnapshot[]
  simpleSteps: StepPoint[]
  compoundSteps: StepPoint[]
  selectedYear: number
  revealUpTo: number
  onSelectYear: (year: number) => void
}

const W = 700
const H = 340
const PAD = { l: 62, r: 18, t: 22, b: 42 }

function stepLine(points: StepPoint[], x: (t: number) => number, y: (A: number) => number): string {
  if (points.length === 0) return ''
  const d = [`M ${x(points[0].t)} ${y(points[0].A)}`]
  for (let i = 1; i < points.length; i += 1) {
    d.push(`H ${x(points[i].t)}`)
    d.push(`V ${y(points[i].A)}`)
  }
  return d.join(' ')
}

function interestArea(
  points: StepPoint[],
  P: number,
  x: (t: number) => number,
  y: (A: number) => number,
): string {
  if (points.length === 0) return ''
  const last = points[points.length - 1]
  const d = [`M ${x(points[0].t)} ${y(P)}`, `L ${x(points[0].t)} ${y(points[0].A)}`]
  for (let i = 1; i < points.length; i += 1) {
    d.push(`H ${x(points[i].t)}`)
    d.push(`V ${y(points[i].A)}`)
  }
  d.push(`L ${x(last.t)} ${y(P)}`)
  d.push('Z')
  return d.join(' ')
}

function gapArea(
  simple: StepPoint[],
  compound: StepPoint[],
  x: (t: number) => number,
  y: (A: number) => number,
): string {
  if (simple.length === 0 || compound.length === 0) return ''
  const up = stepLine(compound, x, y)
  const lastS = simple[simple.length - 1]
  const down: string[] = []
  for (let i = simple.length - 1; i >= 1; i -= 1) {
    down.push(`V ${y(simple[i].A)}`)
    down.push(`H ${x(simple[i - 1].t)}`)
  }
  down.push(`V ${y(simple[0].A)}`)
  return `${up} L ${x(lastS.t)} ${y(lastS.A)} ${down.join(' ')} Z`
}

export function InterestChart({
  mode,
  principal,
  years,
  simpleSteps,
  compoundSteps,
  selectedYear,
  revealUpTo,
  onSelectYear,
}: InterestChartProps) {
  const n = Math.max(1, years.length - 1)
  const visibleYears = years.filter((row) => row.year <= revealUpTo + 1e-9)
  const simpleVis = clipSteps(simpleSteps, revealUpTo)
  const compoundVis = clipSteps(compoundSteps, revealUpTo)

  const maxA = Math.max(
    principal,
    ...visibleYears.map((row) => Math.max(row.simpleA, row.compoundA)),
    ...simpleVis.map((p) => p.A),
    ...compoundVis.map((p) => p.A),
  )
  const yMax = niceMax(maxA * 1.08)
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const x = (t: number) => PAD.l + (t / n) * innerW
  const y = (A: number) => PAD.t + innerH - (A / yMax) * innerH
  const ticks = yTicks(yMax, 4)
  const barSlot = innerW / Math.max(n, 1)
  const groupW = Math.min(52, barSlot * (mode === 'compare' ? 0.72 : 0.5))
  const showSimple = mode === 'simple' || mode === 'compare'
  const showCompound = mode === 'compound' || mode === 'compare'

  return (
    <svg
      className="interest-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Amount over time, principal versus interest"
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            className="interest-grid"
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(tick)}
            y2={y(tick)}
          />
          <text className="interest-axis" x={PAD.l - 8} y={y(tick) + 4} textAnchor="end">
            {tick === 0 ? '0' : formatMoney(tick, 0)}
          </text>
        </g>
      ))}

      <line
        className="interest-principal-line"
        x1={PAD.l}
        x2={W - PAD.r}
        y1={y(principal)}
        y2={y(principal)}
      />
      <text className="interest-principal-label" x={W - PAD.r} y={y(principal) - 6} textAnchor="end">
        P
      </text>

      {showCompound && mode !== 'compare' ? (
        <path
          className="interest-area compound"
          d={interestArea(compoundVis, principal, x, y)}
        />
      ) : null}
      {showSimple && mode !== 'compare' ? (
        <path className="interest-area simple" d={interestArea(simpleVis, principal, x, y)} />
      ) : null}
      {mode === 'compare' ? (
        <path className="interest-gap" d={gapArea(simpleVis, compoundVis, x, y)} />
      ) : null}

      {visibleYears.map((row) => {
        const selected = row.year === selectedYear
        const cx = x(row.year)
        if (mode === 'compare') {
          const bw = groupW / 2 - 2
          const principalH = Math.max(0, y(0) - y(principal))
          const siInterestH = Math.max(0, y(principal) - y(row.simpleA))
          const ciInterestH = Math.max(0, y(principal) - y(row.compoundA))
          return (
            <g key={row.year}>
              <rect
                className={`interest-bar principal${selected ? ' selected' : ''}`}
                x={cx - groupW / 2}
                y={y(principal)}
                width={bw}
                height={principalH}
                rx={5}
                onClick={() => onSelectYear(row.year)}
              />
              {row.simpleI > 0.5 ? (
                <rect
                  className={`interest-bar interest simple${selected ? ' selected' : ''}`}
                  x={cx - groupW / 2}
                  y={y(row.simpleA)}
                  width={bw}
                  height={siInterestH}
                  rx={5}
                  onClick={() => onSelectYear(row.year)}
                />
              ) : null}
              <rect
                className={`interest-bar principal${selected ? ' selected' : ''}`}
                x={cx + 2}
                y={y(principal)}
                width={bw}
                height={principalH}
                rx={5}
                onClick={() => onSelectYear(row.year)}
              />
              {row.compoundI > 0.5 ? (
                <rect
                  className={`interest-bar interest compound${selected ? ' selected' : ''}`}
                  x={cx + 2}
                  y={y(row.compoundA)}
                  width={bw}
                  height={ciInterestH}
                  rx={5}
                  onClick={() => onSelectYear(row.year)}
                />
              ) : null}
              {selected ? (
                <line className="interest-guide" x1={cx} x2={cx} y1={PAD.t} y2={y(0)} />
              ) : null}
            </g>
          )
        }
        const A = mode === 'simple' ? row.simpleA : row.compoundA
        const I = mode === 'simple' ? row.simpleI : row.compoundI
        const bw = groupW
        const principalH = Math.max(0, y(0) - y(principal))
        const interestH = Math.max(0, y(principal) - y(A))
        return (
          <g key={row.year} onClick={() => onSelectYear(row.year)} style={{ cursor: 'pointer' }}>
            <rect
              className={`interest-bar principal${selected ? ' selected' : ''}`}
              x={cx - bw / 2}
              y={y(principal)}
              width={bw}
              height={principalH}
              rx={5}
            />
            {I > 0.5 ? (
              <rect
                className={`interest-bar interest ${mode}${selected ? ' selected' : ''}`}
                x={cx - bw / 2}
                y={y(A)}
                width={bw}
                height={interestH}
                rx={5}
              />
            ) : null}
            {selected ? (
              <line className="interest-guide" x1={cx} x2={cx} y1={PAD.t} y2={y(0)} />
            ) : null}
          </g>
        )
      })}

      {showSimple ? (
        <path className="interest-step simple" d={stepLine(simpleVis, x, y)} fill="none" />
      ) : null}
      {showCompound ? (
        <path className="interest-step compound" d={stepLine(compoundVis, x, y)} fill="none" />
      ) : null}

      {years.map((row) => (
        <text
          key={`x-${row.year}`}
          className={`interest-axis${row.year === selectedYear ? ' current' : ''}`}
          x={x(row.year)}
          y={H - 16}
          textAnchor="middle"
        >
          {row.year === 0 ? '0' : `${row.year}y`}
        </text>
      ))}

      {visibleYears.map((row) => (
        <rect
          key={`hit-${row.year}`}
          x={x(row.year) - barSlot / 2}
          y={PAD.t}
          width={barSlot}
          height={innerH}
          fill="transparent"
          onClick={() => onSelectYear(row.year)}
        />
      ))}
    </svg>
  )
}
