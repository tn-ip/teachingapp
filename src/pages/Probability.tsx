import { useEffect, useMemo, useRef, useState } from 'react'
import { ModuleFrame, SideCard, VizCard } from '../components/ModuleFrame'
import { formatInt, simplifyFraction } from '../lib/math'

type Outcome = { id: string; label: string }

type Preset = {
  id: string
  title: string
  bilingual: string
  hint: string
  columns: number
  outcomes: Outcome[]
  defaultFav: string[]
}

const PRESETS: Preset[] = [
  {
    id: 'coins',
    title: 'Two coins',
    bilingual: '兩枚硬幣',
    hint: 'HH, HT, TH, TT are equally likely if the coins are fair.',
    columns: 4,
    outcomes: [
      { id: 'HH', label: 'HH' },
      { id: 'HT', label: 'HT' },
      { id: 'TH', label: 'TH' },
      { id: 'TT', label: 'TT' },
    ],
    defaultFav: ['HH'],
  },
  {
    id: 'die',
    title: 'Fair die',
    bilingual: '公正骰子',
    hint: 'Six faces, each with probability 1/6.',
    columns: 6,
    outcomes: [1, 2, 3, 4, 5, 6].map((n) => ({ id: String(n), label: String(n) })),
    defaultFav: ['2', '4', '6'],
  },
  {
    id: 'bag',
    title: 'Coloured balls',
    bilingual: '彩球',
    hint: '3 red, 2 blue, 1 green — label balls so each draw is equally likely.',
    columns: 6,
    outcomes: [
      { id: 'R1', label: 'R1' },
      { id: 'R2', label: 'R2' },
      { id: 'R3', label: 'R3' },
      { id: 'B1', label: 'B1' },
      { id: 'B2', label: 'B2' },
      { id: 'G1', label: 'G1' },
    ],
    defaultFav: ['R1', 'R2', 'R3'],
  },
  {
    id: 'dice',
    title: 'Two dice',
    bilingual: '兩粒骰子',
    hint: '36 ordered pairs (1,1) … (6,6). Sum-to-7 is the diagonal of 6 outcomes.',
    columns: 6,
    outcomes: Array.from({ length: 36 }, (_, i) => {
      const a = Math.floor(i / 6) + 1
      const b = (i % 6) + 1
      return { id: `${a}${b}`, label: `${a},${b}` }
    }),
    defaultFav: ['16', '25', '34', '43', '52', '61'],
  },
]

export function Probability() {
  const [presetId, setPresetId] = useState('die')
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[1]
  const [fav, setFav] = useState<Set<string>>(new Set(preset.defaultFav))
  const [trials, setTrials] = useState(0)
  const [hits, setHits] = useState(0)
  const [lastId, setLastId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const remainRef = useRef(0)
  const favRef = useRef(fav)
  const outcomesRef = useRef(preset.outcomes)

  useEffect(() => {
    favRef.current = fav
  }, [fav])
  useEffect(() => {
    outcomesRef.current = preset.outcomes
  }, [preset])

  const applyPreset = (id: string) => {
    const next = PRESETS.find((p) => p.id === id) ?? PRESETS[1]
    setPresetId(id)
    setFav(new Set(next.defaultFav))
    setTrials(0)
    setHits(0)
    setLastId(null)
    setRunning(false)
    remainRef.current = 0
  }

  const toggle = (id: string) => {
    setFav((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const nS = preset.outcomes.length
  const nA = fav.size
  const simplified = simplifyFraction(nA, nS)
  const p = nS === 0 ? 0 : nA / nS
  const rel = trials === 0 ? null : hits / trials
  const relFrac = trials === 0 ? null : simplifyFraction(hits, trials)

  const sampleOnce = () => {
    const pool = outcomesRef.current
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setLastId(pick.id)
    setTrials((t) => t + 1)
    if (favRef.current.has(pick.id)) setHits((h) => h + 1)
  }

  useEffect(() => {
    if (!running) return
    let raf = 0
    const step = () => {
      const burst = Math.min(4, remainRef.current)
      for (let i = 0; i < burst; i += 1) sampleOnce()
      remainRef.current -= burst
      if (remainRef.current <= 0) {
        setRunning(false)
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [running])

  const runBatch = (count: number) => {
    remainRef.current += count
    setRunning(true)
  }

  const pWidth = `${Math.max(0, Math.min(1, p)) * 100}%`
  const relWidth = rel === null ? '0%' : `${Math.max(0, Math.min(1, rel)) * 100}%`

  const eventName = useMemo(() => {
    if (preset.id === 'die' && [...fav].sort().join() === '2,4,6') return 'A = even face 偶數點'
    if (preset.id === 'coins' && [...fav].join() === 'HH') return 'A = two heads 兩正面'
    if (preset.id === 'bag' && nA === 3 && [...fav].every((x) => x.startsWith('R')))
      return 'A = red 紅色'
    if (preset.id === 'dice' && nA === 6) return 'A = sum is 7 點數和為 7'
    return `A = shaded outcomes 有利結果`
  }, [preset.id, fav, nA])

  return (
    <ModuleFrame
      title="Probability"
      bilingual="Equally likely outcomes 等可能結果 · sample space 樣本空間"
      liveLabel="P(A)"
      liveValue={
        <span>
          {nA}/{nS}
          {simplified.den !== nS || simplified.num !== nA ? ` = ${simplified.num}/${simplified.den}` : ''}
        </span>
      }
      liveSub={
        <span>
          {eventName} · n(A) = {nA}, n(S) = {nS}
        </span>
      }
    >
      <VizCard title="Sample space S 樣本空間 — tap to shade favourable A">
        <div
          className="outcome-grid"
          style={{ gridTemplateColumns: `repeat(${preset.columns}, minmax(52px, 1fr))` }}
        >
          {preset.outcomes.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`outcome${fav.has(o.id) ? ' fav' : ''}${lastId === o.id ? ' last' : ''}`}
              onClick={() => toggle(o.id)}
              aria-pressed={fav.has(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="caption">{preset.hint}</p>
        <p className="panel-title">Relative frequency 相對頻率</p>
        <div className="freq-track" aria-hidden="true">
          <div className="freq-fill" style={{ width: relWidth, opacity: 0.85 }} />
          <div className="freq-mark" style={{ left: pWidth }} title="Theoretical P(A)" />
        </div>
        <div className="freq-labels">
          <span>0</span>
          <span>theoretical P(A) is the ink tick</span>
          <span>1</span>
        </div>
        <p className="caption">
          Trials {formatInt(trials)} · favourable {formatInt(hits)} · relative frequency{' '}
          {rel === null ? '—' : `${hits}/${trials} ≈ ${rel.toFixed(3)}`}
          {relFrac && relFrac.den !== trials ? ` = ${relFrac.num}/${relFrac.den}` : ''}
        </p>
        <div className="toolbar" style={{ justifyContent: 'center' }}>
          <button type="button" className="play-btn" onClick={() => sampleOnce()}>
            1 trial
          </button>
          <button type="button" className="play-btn ghost" onClick={() => runBatch(20)}>
            +20
          </button>
          <button type="button" className="play-btn ghost" onClick={() => runBatch(100)}>
            +100
          </button>
          <button
            type="button"
            className="play-btn ghost"
            onClick={() => {
              setTrials(0)
              setHits(0)
              setLastId(null)
              remainRef.current = 0
              setRunning(false)
            }}
          >
            Reset trials
          </button>
        </div>
      </VizCard>
      <SideCard>
        <p className="panel-title">Experiment 試驗</p>
        <div className="chip-row">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="chip"
              aria-pressed={presetId === p.id}
              onClick={() => applyPreset(p.id)}
            >
              {p.title}
              <span className="bilingual" style={{ marginLeft: 6 }}>
                {p.bilingual}
              </span>
            </button>
          ))}
        </div>
        <p className="explain">
          When every outcome in S is equally likely, probability is a counting ratio.
          Shade A, read P(A), then sample to see the relative frequency approach that
          value as trials grow.
        </p>
        <div className="formula">
          P(A) = n(A) / n(S) = {nA}/{nS}
          {simplified.den !== nS ? ` = ${simplified.num}/${simplified.den}` : ''}
          <span className="muted">
            Complement 補事件: P(A′) = 1 − P(A) = {nS - nA}/{nS}
            {simplifyFraction(nS - nA, nS).den !== nS
              ? ` = ${simplifyFraction(nS - nA, nS).num}/${simplifyFraction(nS - nA, nS).den}`
              : ''}
          </span>
        </div>
        <div className="contrast">
          Gold ring = latest trial. Teal tiles = event A. The ink tick on the bar is
          theoretical P(A); the teal fill is hits / trials.
        </div>
        <p className="note">
          Law of large numbers 大數法則: relative frequency tends to P(A) — it will wiggle,
          especially with few trials.
        </p>
      </SideCard>
    </ModuleFrame>
  )
}
