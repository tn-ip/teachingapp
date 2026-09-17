import { useEffect, useMemo, useState } from 'react'
import { ModuleFrame, SideCard, VizCard } from '../components/ModuleFrame'
import { Stepper } from '../components/Stepper'
import { combinationsOf, formatInt, nCr, nPr, tokens, type Token } from '../lib/math'

function sameSet(a: Token[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a.map((t) => t.id)].sort().join('')
  const sb = [...b].sort().join('')
  return sa === sb
}

function layoutTokens(
  items: Token[],
  picked: string[],
  W: number,
  H: number,
): Record<string, { x: number; y: number }> {
  const cx = W / 2
  const cy = H / 2
  const selected = items.filter((t) => picked.includes(t.id))
  const rest = items.filter((t) => !picked.includes(t.id))
  const pos: Record<string, { x: number; y: number }> = {}
  rest.forEach((t, i) => {
    const n = Math.max(rest.length, 1)
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n
    pos[t.id] = { x: cx + Math.cos(ang) * 118, y: cy + Math.sin(ang) * 96 }
  })
  selected.forEach((t, i) => {
    const n = selected.length
    if (n <= 1) {
      pos[t.id] = { x: cx, y: cy + 4 }
      return
    }
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const r = n === 2 ? 28 : n === 3 ? 34 : 40
    pos[t.id] = { x: cx + Math.cos(ang) * r, y: cy + 4 + Math.sin(ang) * r }
  })
  return pos
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
  const positions = layoutTokens(items, picked, W, H)

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
        <p className="caption">Tap tokens into the dashed bag. Inside the bag, order does not matter.</p>
        <div className="combo-stage">
          <svg className="hull-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            {picked.length > 0 ? (
              <ellipse
                cx={W / 2}
                cy={H / 2 + 4}
                rx="74"
                ry="66"
                fill="rgba(15,110,103,0.12)"
                stroke="#0f6e67"
                strokeWidth="3"
                strokeDasharray="8 7"
              />
            ) : null}
          </svg>
          <div className="token-circle">
            {items.map((t) => {
              const p = positions[t.id]
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`token${picked.includes(t.id) ? ' selected' : ''}`}
                  style={{
                    background: t.color,
                    left: `${(p.x / W) * 100}%`,
                    top: `${(p.y / H) * 100}%`,
                    transition: 'left 240ms ease, top 240ms ease',
                  }}
                  onClick={() => toggle(t.id)}
                >
                  {t.id}
                </button>
              )
            })}
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
