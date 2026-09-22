import { useState } from 'react'
import { MathTex } from '../components/MathTex'
import { ModuleFrame, SideCard, VizCard } from '../components/ModuleFrame'
import { ProbabilityNav } from '../components/ProbabilityNav'
import { ProbStats } from '../components/ProbStats'
import {
  EXCLUSIVE_PRESETS,
  SPINNER_FACES,
  additionLines,
  doubleCountTex,
  dropOverlapFromB,
  formatFrac,
  intersectIds,
  naiveSumTex,
  presetForSets,
  tallySets,
  toggleSector,
  unionIds,
  type ExclusivePreset,
} from '../lib/probability'

type Brush = 'A' | 'B'

function point(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)]
}

function ringSector(cx: number, cy: number, outer: number, inner: number, a0: number, a1: number) {
  const [x0, y0] = point(cx, cy, outer, a0)
  const [x1, y1] = point(cx, cy, outer, a1)
  const [x2, y2] = point(cx, cy, inner, a1)
  const [x3, y3] = point(cx, cy, inner, a0)
  const large = a1 - a0 > 180 ? 1 : 0
  return `M ${x0} ${y0} A ${outer} ${outer} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${inner} ${inner} 0 ${large} 0 ${x3} ${y3} Z`
}

function membership(id: number, inA: number[], inB: number[]): 'both' | 'a' | 'b' | 'neither' {
  const a = inA.includes(id)
  const b = inB.includes(id)
  if (a && b) return 'both'
  if (a) return 'a'
  if (b) return 'b'
  return 'neither'
}

export function MutuallyExclusive() {
  const initial = EXCLUSIVE_PRESETS[0]
  const [inA, setInA] = useState<number[]>(initial.a)
  const [inB, setInB] = useState<number[]>(initial.b)
  const [allowOverlap, setAllowOverlap] = useState(initial.allowOverlap)
  const [brush, setBrush] = useState<Brush>('A')
  const [status, setStatus] = useState(initial.hint)

  const stats = tallySets(SPINNER_FACES, inA, inB)
  const shared = intersectIds(inA, inB)
  const union = unionIds(inA, inB)
  const matched = presetForSets(inA, inB)
  const aName = matched?.aName ?? 'your set A 自訂'
  const bName = matched?.bName ?? 'your set B 自訂'

  const applyPreset = (preset: ExclusivePreset) => {
    setInA(preset.a)
    setInB(preset.b)
    setAllowOverlap(preset.allowOverlap)
    setBrush('A')
    setStatus(preset.hint)
  }

  const paint = (id: number) => {
    const next = toggleSector(inA, inB, id, brush, allowOverlap)
    setInA(next.inA)
    setInB(next.inB)
    if (next.moved) {
      const other = brush === 'A' ? 'B' : 'A'
      setStatus(`Face ${id} left event ${other}. Mutually exclusive events 互斥 cannot share an outcome.`)
    } else {
      setStatus(
        next.inA.includes(id) || next.inB.includes(id)
          ? `Face ${id} updated in event ${brush}.`
          : `Face ${id} is in neither event.`,
      )
    }
  }

  const setMode = (overlap: boolean) => {
    if (overlap) {
      setAllowOverlap(true)
      setStatus('Overlap is allowed 可重疊. One face may belong to A and B together.')
      return
    }
    const nextB = dropOverlapFromB(inA, inB)
    const removed = inB.filter((id) => !nextB.includes(id))
    setAllowOverlap(false)
    setInB(nextB)
    setStatus(
      removed.length > 0
        ? `Shared faces ${removed.join(', ')} stayed in A only. The events are now mutually exclusive 互斥.`
        : 'These events already share nothing, so the intersection stays empty.',
    )
  }

  const tip = !allowOverlap
    ? 'Mutually exclusive 互斥: no face is in both A and B, so A ∩ B is empty and P(A ∩ B) = 0. Add the probabilities. Nothing was counted twice.'
    : stats.nAB === 0
      ? 'Overlap is allowed 可重疊, but these events still share no face. P(A ∩ B) = 0, so you still just add. Try Even / high to force a shared face.'
      : 'These events overlap. Faces in A ∩ B were counted in P(A) and again in P(B). Subtract that intersection once. The extra is the double count 重複計算.'

  return (
    <ModuleFrame
      title="Mutually exclusive"
      bilingual="互斥 · spinner sample space · addition rule 加法公式"
      backLabel="← Probability"
      backTo="probability"
      nav={<ProbabilityNav current="exclusive" />}
      liveLabel={stats.exclusive ? 'P(A ∪ B) = P(A) + P(B)' : 'P(A ∪ B) after subtracting'}
      liveValue={<span>{formatFrac(stats.nUnion, stats.nS)}</span>}
      liveSub={
        <span>
          A = {aName} · B = {bName} · P(A ∩ B) = {formatFrac(stats.nAB, stats.nS)}
          {stats.exclusive ? ' · 互斥' : ' · overlap 重疊'}
        </span>
      }
    >
      <VizCard title="Spinner S — 8 equally likely faces 八個等可能結果">
        <div className="chip-row">
          <button
            type="button"
            className="chip"
            aria-pressed={!allowOverlap}
            onClick={() => setMode(false)}
          >
            Mutually exclusive
            <span className="bilingual" style={{ marginLeft: 6 }}>
              互斥
            </span>
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={allowOverlap}
            onClick={() => setMode(true)}
          >
            Allow overlap
            <span className="bilingual" style={{ marginLeft: 6 }}>
              可重疊
            </span>
          </button>
        </div>
        <div className="chip-row" style={{ marginTop: 8 }}>
          <button type="button" className="chip" aria-pressed={brush === 'A'} onClick={() => setBrush('A')}>
            Paint A
          </button>
          <button type="button" className="chip" aria-pressed={brush === 'B'} onClick={() => setBrush('B')}>
            Paint B
          </button>
        </div>
        <p className="caption">Tap a face to add or remove it from {brush === 'A' ? 'A' : 'B'}.</p>
        <SpinnerWheel inA={inA} inB={inB} brush={brush} sharedCount={shared.length} onPaint={paint} />
        <ul className="legend">
          <li>
            <i className="swatch a" /> only A
          </li>
          <li>
            <i className="swatch b" /> only B
          </li>
          <li>
            <i className="swatch both" /> A ∩ B
          </li>
          <li>
            <i className="swatch neither" /> neither
          </li>
        </ul>
        <div
          className="outcome-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))', marginTop: 12 }}
        >
          {SPINNER_FACES.map((face) => {
            const kind = membership(face, inA, inB)
            const on = brush === 'A' ? inA.includes(face) : inB.includes(face)
            return (
              <button
                key={face}
                type="button"
                className={`outcome ${kind}`}
                aria-pressed={on}
                aria-label={`Face ${face}, ${kind === 'both' ? 'in A and B' : kind === 'a' ? 'in A only' : kind === 'b' ? 'in B only' : 'in neither'}`}
                onClick={() => paint(face)}
              >
                {face}
              </button>
            )
          })}
        </div>
        <p className="status-line" aria-live="polite">
          {status}
        </p>
        <p className="panel-title">Listed in A, listed in B</p>
        <CountRows inA={inA} inB={inB} shared={shared} union={union} />
        {shared.length === 0 ? (
          <div className="empty-cap">A ∩ B = ∅ · empty set 空集 · no shared face</div>
        ) : (
          <p className="caption">
            Gold ring = counted in both lists. The union below keeps each face once.
          </p>
        )}
        <ProbStats stats={stats} aName={aName} bName={bName} />
      </VizCard>
      <SideCard>
        <p className="panel-title">Event pair 事件</p>
        <div className="chip-row">
          {EXCLUSIVE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="chip"
              aria-pressed={matched?.id === preset.id}
              onClick={() => applyPreset(preset)}
            >
              {preset.title}
              <span className="bilingual" style={{ marginLeft: 6 }}>
                {preset.bilingual}
              </span>
            </button>
          ))}
        </div>
        <p className="explain">
          A is {aName}. B is {bName}. n(S) = {stats.nS}. Each sector is one equally likely
          outcome.
        </p>
        <div className="formula">
          {additionLines(stats).map((tex) => (
            <MathTex key={tex} display tex={tex} />
          ))}
          {stats.nAB > 0 ? (
            <>
              <MathTex display tex={naiveSumTex(stats)} />
              <MathTex display tex={doubleCountTex(stats)} />
            </>
          ) : (
            <span className="muted">No shared outcome, so nothing is subtracted.</span>
          )}
        </div>
        <div className="contrast">
          <strong>Teaching tip</strong>
          <p style={{ margin: '6px 0 0' }}>{tip}</p>
        </div>
      </SideCard>
    </ModuleFrame>
  )
}

function SpinnerWheel({
  inA,
  inB,
  brush,
  sharedCount,
  onPaint,
}: {
  inA: number[]
  inB: number[]
  brush: Brush
  sharedCount: number
  onPaint: (id: number) => void
}) {
  const cx = 180
  const cy = 180
  const outer = 156
  const inner = 78
  return (
    <svg className="spinner-svg" viewBox="0 0 360 360" role="group" aria-label="Eight-sector spinner">
      <defs>
        <pattern id="both-stripes" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="#0f6e67" />
          <rect width="5" height="10" fill="#c4451a" />
        </pattern>
      </defs>
      <polygon points="180,8 172,24 188,24" fill="#1a2330" />
      {SPINNER_FACES.map((face, index) => {
        const mid = index * 45
        const kind = membership(face, inA, inB)
        const [lx, ly] = point(cx, cy, (outer + inner) / 2, mid)
        const fill =
          kind === 'both' ? 'url(#both-stripes)' : kind === 'a' ? '#0f6e67' : kind === 'b' ? '#c4451a' : '#efe7d9'
        const ink = kind === 'neither' ? '#1a2330' : '#fffaf2'
        return (
          <g key={face} className="sector" onClick={() => onPaint(face)}>
            <path
              d={ringSector(cx, cy, outer, inner, mid - 22.5, mid + 22.5)}
              fill={fill}
              stroke="#fffaf2"
              strokeWidth="3"
              tabIndex={0}
              role="button"
              aria-label={`Face ${face}, ${kind === 'both' ? 'in A and B' : kind === 'a' ? 'in A only' : kind === 'b' ? 'in B only' : 'in neither'}. Toggle event ${brush}.`}
              aria-pressed={brush === 'A' ? inA.includes(face) : inB.includes(face)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onPaint(face)
                }
              }}
            />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fill={ink}
              fontSize="22"
              fontWeight="800"
              fontFamily="Figtree, sans-serif"
              pointerEvents="none"
            >
              {face}
            </text>
          </g>
        )
      })}
      <circle cx={cx} cy={cy} r={inner - 6} fill="#fffaf2" pointerEvents="none" />
      <text x={cx} y={cy - 16} textAnchor="middle" fill="#5b6778" fontSize="14" fontWeight="700" fontFamily="Figtree, sans-serif" pointerEvents="none">
        A ∩ B
      </text>
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        fill={sharedCount === 0 ? '#0f6e67' : '#1a2330'}
        fontSize="32"
        fontWeight="700"
        fontFamily="Fraunces, Palatino, serif"
        pointerEvents="none"
      >
        {sharedCount === 0 ? '∅' : sharedCount}
      </text>
    </svg>
  )
}

function CountRows({
  inA,
  inB,
  shared,
  union,
}: {
  inA: number[]
  inB: number[]
  shared: number[]
  union: number[]
}) {
  const sharedSet = new Set(shared)
  return (
    <div className="prob-rows">
      <TileRow label="In A" ids={inA} tone="a" dup={sharedSet} />
      <TileRow label="In B" ids={inB} tone="b" dup={sharedSet} />
      <TileRow label="A ∪ B once" ids={union} tone="union" dup={new Set()} />
    </div>
  )
}

function TileRow({
  label,
  ids,
  tone,
  dup,
}: {
  label: string
  ids: number[]
  tone: 'a' | 'b' | 'union'
  dup: Set<number>
}) {
  return (
    <div className="prob-rowline">
      <span className="prob-rowlabel">{label}</span>
      {ids.length === 0 ? <span className="bilingual">empty 空</span> : null}
      {ids.map((id) => (
        <span key={`${label}-${id}`} className={`mini-tile ${tone}${dup.has(id) ? ' dup' : ''}`}>
          {id}
        </span>
      ))}
    </div>
  )
}
