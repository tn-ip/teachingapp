import { useEffect, useMemo, useState } from 'react'
import { ModuleFrame, SideCard, VizCard } from '../components/ModuleFrame'
import { Stepper } from '../components/Stepper'
import { combinationsOf, formatInt, nCr, nPr, tokens, type Token } from '../lib/math'

function hullPath(points: { x: number; y: number }[], pad: number): string {
  if (points.length === 0) return ''
  if (points.length === 1) {
    const p = points[0]
    return `M ${p.x - pad} ${p.y} A ${pad} ${pad} 0 1 0 ${p.x + pad} ${p.y} A ${pad} ${pad} 0 1 0 ${p.x - pad} ${p.y}`
  }
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (
    o: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lower: typeof points = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }
  const upper: typeof points = []
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const p = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1))
  if (hull.length === 2) {
    const [a, b] = hull
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
  }
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length
  const expanded = hull.map((p) => {
    const dx = p.x - cx
    const dy = p.y - cy
    const len = Math.hypot(dx, dy) || 1
    return { x: p.x + (dx / len) * pad, y: p.y + (dy / len) * pad }
  })
  return expanded
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ') + ' Z'
}

function sameSet(a: Token[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a.map((t) => t.id)].sort().join('')
  const sb = [...b].sort().join('')
  return sa === sb
}

export function Combinations() {
  const [n, setN] = useState(5)
  const [r, setR] = useState(3)
  const [picked, setPicked] = useState<string[]>(['A', 'B', 'C'])
  const [index, setIndex] = useState(0)
  const [shuffleTick, setShuffleTick] = useState(0)

  const safeR = Math.min(r, n)
  const items = useMemo(() => tokens(n), [n])
  const all = useMemo(() => combinationsOf(items, safeR), [items, safeR])
  const total = nCr(n, safeR)
  const orderedTwin = nPr(n, safeR)

  useEffect(() => {
    const next = items.slice(0, safeR).map((t) => t.id)
    setPicked(next)
    setIndex(0)
  }, [n, safeR, items])

  useEffect(() => {
    const match = all.findIndex((c) => sameSet(c, picked))
    if (match >= 0) setIndex(match)
  }, [picked, all])

  const toggle = (id: string) => {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= safeR) return [...prev.slice(1), id]
      return [...prev, id]
    })
  }

  const W = 420
  const H = 240
  const cx = W / 2
  const cy = H / 2
  const radius = 86
  const positions = items.map((t, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / items.length
    return { id: t.id, x: cx + Math.cos(ang) * radius, y: cy + Math.sin(ang) * radius, token: t }
  })
  const selectedPts = positions.filter((p) => picked.includes(p.id))
  const path = hullPath(
    selectedPts.map((p) => ({ x: p.x, y: p.y })),
    38,
  )

  const displayOrder = useMemo(() => {
    const selected = items.filter((t) => picked.includes(t.id))
    if (shuffleTick === 0) return selected
    const copy = [...selected]
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = (i + shuffleTick) % copy.length
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }, [items, picked, shuffleTick])

  return (
    <ModuleFrame
      title="Combinations"
      bilingual="Selection 選取 · order does not matter 次序不重要"
      liveLabel={`nCr · ${n}C${safeR}`}
      liveValue={formatInt(total)}
      liveSub={
        <span>
          vs {n}P{safeR} = {formatInt(orderedTwin)} · divide by {safeR}! = {nPr(safeR, safeR)}
        </span>
      }
    >
      <VizCard title="One group, not a line-up">
        <p className="caption">Tap tokens to choose a set of {safeR}. The dashed bag is unordered.</p>
        <div className="combo-stage">
          <svg className="hull-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            {path ? (
              <path
                d={path}
                fill="rgba(15,110,103,0.12)"
                stroke="#0f6e67"
                strokeWidth="3"
                strokeDasharray="8 7"
                strokeLinejoin="round"
              />
            ) : null}
          </svg>
          <div className="token-circle">
            {positions.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`token${picked.includes(p.id) ? ' selected' : ''}`}
                style={{
                  background: p.token.color,
                  left: `${(p.x / W) * 100}%`,
                  top: `${(p.y / H) * 100}%`,
                }}
                onClick={() => toggle(p.id)}
              >
                {p.id}
              </button>
            ))}
          </div>
        </div>
        <p className="caption">
          Selected set 選取集合:{' '}
          {picked.length ? `{ ${[...picked].sort().join(', ')} }` : '∅'} · {picked.length} of {safeR}
        </p>
        <p className="caption">
          Shuffle the same members — still one combination. Current order shown only for contrast:
        </p>
        <div className="token-row">
          {displayOrder.map((t) => (
            <span key={t.id} className="token" style={{ background: t.color, width: 48, height: 48 }}>
              {t.id}
            </span>
          ))}
        </div>
        <p className="panel-title" style={{ textAlign: 'center', marginTop: 12 }}>
          All {formatInt(total)} combinations
        </p>
        <div className="arr-grid">
          {all.map((combo, i) => (
            <button
              key={combo.map((t) => t.id).join('')}
              type="button"
              className={`set-chip${i === index ? ' current' : ''}`}
              onClick={() => setPicked(combo.map((t) => t.id))}
            >
              {combo.map((t) => (
                <i
                  key={t.id}
                  className="arr-chip"
                  style={{
                    background: t.color,
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 12,
                    fontStyle: 'normal',
                    fontWeight: 800,
                  }}
                >
                  {t.id}
                </i>
              ))}
            </button>
          ))}
        </div>
      </VizCard>
      <SideCard>
        <div className="stepper-grid">
          <Stepper
            label="n items 項目"
            value={n}
            min={2}
            max={6}
            onChange={(v) => {
              setN(v)
              setR((rr) => Math.min(rr, v))
            }}
          />
          <Stepper label="r chosen 選取" value={safeR} min={1} max={n} onChange={setR} />
        </div>
        <div className="toolbar">
          <button
            type="button"
            className="play-btn"
            onClick={() => setShuffleTick((t) => t + 1)}
            disabled={picked.length < 2}
          >
            Shuffle order
          </button>
          <button
            type="button"
            className="play-btn ghost"
            onClick={() => {
              const next = all[(index + 1) % all.length]
              setPicked(next.map((t) => t.id))
            }}
          >
            Next set
          </button>
        </div>
        <p className="explain">
          A combination is a selection of r items from n distinct items where order does
          not matter. The set {'{A, B, C}'} is the same as {'{C, A, B}'}.
        </p>
        <div className="formula">
          nCr = n! / (r!(n − r)!) = {formatInt(total)}
          <span className="muted">
            {n}C{safeR} = {n}P{safeR} / {safeR}! = {formatInt(orderedTwin)} / {nPr(safeR, safeR)}
          </span>
        </div>
        <div className="contrast">
          Each combination corresponds to r! = {nPr(safeR, safeR)} different permutations.
          That is why nCr is smaller than nPr when r ≥ 2.
        </div>
      </SideCard>
    </ModuleFrame>
  )
}
