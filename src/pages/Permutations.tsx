import { useEffect, useMemo, useState } from 'react'
import { ModuleFrame, SideCard, VizCard } from '../components/ModuleFrame'
import { Stepper } from '../components/Stepper'
import { formatInt, nCr, nPr, permutationsOf, tokens } from '../lib/math'

const MAX_VISIBLE = 24

export function Permutations() {
  const [n, setN] = useState(4)
  const [r, setR] = useState(2)
  const [index, setIndex] = useState(0)
  const [filled, setFilled] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [manual, setManual] = useState<string[]>([])

  const safeR = Math.min(r, n)
  const items = useMemo(() => tokens(n), [n])
  const all = useMemo(() => permutationsOf(items, safeR), [items, safeR])
  const total = nPr(n, safeR)
  const comboTwin = nCr(n, safeR)
  const current = all[Math.min(index, Math.max(all.length - 1, 0))] ?? []

  useEffect(() => {
    setIndex(0)
    setFilled(0)
    setManual([])
  }, [n, safeR])

  useEffect(() => {
    if (!playing || all.length === 0) return
    const id = window.setInterval(() => {
      setFilled((f) => {
        if (f < safeR) return f + 1
        setIndex((i) => (i + 1) % all.length)
        return 0
      })
    }, 650)
    return () => window.clearInterval(id)
  }, [playing, all.length, safeR])

  const shownFill = playing ? filled : safeR
  const arrangement = playing ? current.slice(0, shownFill) : current
  const usedIds = new Set(arrangement.map((t) => t.id))
  const productStr = Array.from({ length: safeR }, (_, i) => n - i).join(' × ')

  const tapToken = (id: string) => {
    setPlaying(false)
    setManual((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= safeR) return prev
      return [...prev, id]
    })
  }

  const displaySlots = playing
    ? arrangement
    : manual.map((id) => items.find((t) => t.id === id)!).filter(Boolean)

  const visibleAll = all.slice(0, MAX_VISIBLE)

  return (
    <ModuleFrame
      title="Permutations"
      bilingual="Arrangement 排列 · order matters 次序重要"
      liveLabel={`nPr · ${n}P${safeR}`}
      liveValue={formatInt(total)}
      liveSub={
        <span>
          {productStr} = {formatInt(total)} ordered lists
        </span>
      }
    >
      <VizCard title="Fill ordered slots">
        <p className="caption">Pool of n distinct items. Positions 1…r are different seats.</p>
        <div className="token-row" style={{ marginBottom: 16 }}>
          {items.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`token${usedIds.has(t.id) && playing ? ' used' : ''}${
                !playing && manual.includes(t.id) ? ' selected' : ''
              }`}
              style={{ background: t.color }}
              onClick={() => tapToken(t.id)}
            >
              {t.id}
            </button>
          ))}
        </div>
        <p className="caption">Ordered positions 有序位置</p>
        <div className="slot-row">
          {Array.from({ length: safeR }, (_, i) => {
            const tok = displaySlots[i]
            return (
              <div
                key={i}
                className={`slot${tok ? ' filled' : ''}`}
                style={tok ? { background: tok.color } : undefined}
              >
                <span className="pos">{i + 1}</span>
                {tok ? tok.id : '·'}
              </div>
            )
          })}
        </div>
        <p className="caption">
          Arrangement {Math.min(index + 1, all.length)} of {formatInt(all.length)}
          {!playing ? ' · tap letters to build your own (order is kept)' : ''}
        </p>
        <div className="arr-grid" aria-label="Some permutations">
          {visibleAll.map((perm, i) => (
            <div key={perm.map((t) => t.id).join('')} className={`arr-chip${i === index ? ' current' : ''}`}>
              {perm.map((t) => (
                <i key={t.id} style={{ background: t.color }}>
                  {t.id}
                </i>
              ))}
            </div>
          ))}
        </div>
        {all.length > MAX_VISIBLE ? (
          <p className="caption">Showing {MAX_VISIBLE} of {formatInt(all.length)} arrangements.</p>
        ) : null}
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
          <Stepper
            label="r positions 位置"
            value={safeR}
            min={1}
            max={n}
            onChange={setR}
          />
        </div>
        <div className="toolbar">
          <button type="button" className="play-btn" onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pause' : 'Play all'}
          </button>
          <button
            type="button"
            className="play-btn ghost"
            onClick={() => {
              setPlaying(false)
              setIndex((i) => (i - 1 + all.length) % all.length)
              setFilled(safeR)
            }}
          >
            Prev
          </button>
          <button
            type="button"
            className="play-btn ghost"
            onClick={() => {
              setPlaying(false)
              setIndex((i) => (i + 1) % all.length)
              setFilled(safeR)
            }}
          >
            Next
          </button>
          <button
            type="button"
            className="play-btn ghost"
            onClick={() => {
              setPlaying(false)
              setManual([])
            }}
          >
            Clear taps
          </button>
        </div>
        <p className="explain">
          A permutation is an ordered arrangement of r items chosen from n distinct
          items. AB and BA are different because the first position changed.
        </p>
        <div className="formula">
          nPr = n! / (n − r)! = {n}! / {n - safeR}! = {formatInt(total)}
          <span className="muted">
            Also {productStr}. DSE notation: nPr or P<sup>n</sup>
            <sub>r</sub>.
          </span>
        </div>
        <div className="contrast">
          If order did <b>not</b> matter, these {formatInt(total)} lists would collapse
          into {formatInt(comboTwin)} groups, because each group of {safeR} items can be
          lined up in {safeR}! = {formatInt(nPr(safeR, safeR))} ways.
          <br />
          <b>
            nPr = nCr × r! → {formatInt(total)} = {formatInt(comboTwin)} × {safeR}!
          </b>
        </div>
      </SideCard>
    </ModuleFrame>
  )
}
