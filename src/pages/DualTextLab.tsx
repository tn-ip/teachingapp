import { useEffect, useState } from 'react'
import { DualViewStage } from '../components/DualViewStage'
import { ModuleFrame, SideCard, VizCard } from '../components/ModuleFrame'
import { PrintNav } from '../components/PrintNav'
import {
  DUAL_CAMERAS,
  DUAL_PRESETS,
  H2D_SINGLE,
  displayWord,
  dualMetrics,
  type DualCamera,
} from '../lib/print3d'

export function DualTextLab() {
  const [wordA, setWordA] = useState('HI')
  const [wordB, setWordB] = useState('BYE')
  const [camera, setCamera] = useState<DualCamera>('orbit')
  const [showConstruction, setShowConstruction] = useState(false)
  const [stroke, setStroke] = useState(4)
  const [scale, setScale] = useState(100)
  const [flatBase, setFlatBase] = useState(true)
  const [acks, setAcks] = useState({ thick: false, base: false, plate: false })
  const [exported, setExported] = useState(false)

  useEffect(() => {
    const previous = document.title
    document.title = 'Dual text · 3D Print'
    return () => {
      document.title = previous
    }
  }, [])

  const shownA = displayWord(wordA)
  const shownB = displayWord(wordB)
  const metrics = dualMetrics(wordA, wordB, scale, stroke)
  const wordsReady = shownA.length > 0 && shownB.length > 0
  const thickOk = metrics.strokeOk
  const plateOk = metrics.fits && wordsReady
  const canExport = wordsReady && thickOk && flatBase && plateOk && acks.thick && acks.base && acks.plate

  const resetExport = () => setExported(false)

  const applyPreset = (id: string) => {
    const preset = DUAL_PRESETS.find((item) => item.id === id)
    if (!preset) return
    setWordA(preset.a)
    setWordB(preset.b)
    setAcks({ thick: false, base: false, plate: false })
    resetExport()
  }

  const activePreset = DUAL_PRESETS.find((item) => item.a === wordA && item.b === wordB)?.id

  return (
    <ModuleFrame
      title="Dual text illusion"
      kicker="Cycle 7 · Tinkercad"
      bilingual="雙面文字 · 正面一詞，側面另一詞"
      liveLabel={exported ? 'Export 匯出' : 'Block 立體'}
      liveValue={exported ? 'Ready' : `${shownA || '—'} / ${shownB || '—'}`}
      liveSub={
        <span>
          {metrics.width} × {metrics.depth} × {metrics.height} mm · stroke {stroke} mm ·{' '}
          {cameraLabel(camera)}
        </span>
      }
      backLabel="← 3D Print"
      backTo="print3d"
      nav={<PrintNav current="dual-text" />}
    >
      <VizCard title="Two views, one solid 兩面一體" className="print-viz">
        <DualViewStage
          wordA={shownA}
          wordB={shownB}
          camera={camera}
          showConstruction={showConstruction}
          strokeMm={stroke}
          flatBase={flatBase}
        />
        <div className="chip-row print-cameras">
          {DUAL_CAMERAS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="chip"
              aria-pressed={camera === item.id}
              onClick={() => setCamera(item.id)}
            >
              {item.label}
              <span className="bilingual" style={{ marginLeft: 6 }}>
                {item.zh}
              </span>
            </button>
          ))}
          <button
            type="button"
            className="chip"
            aria-pressed={showConstruction}
            onClick={() => setShowConstruction((on) => !on)}
          >
            Show construction 結構
          </button>
        </div>
        {showConstruction ? (
          <ul className="print-legend">
            <li>
              <i className="swatch a" /> View A extrudes front to back 向後擠出
            </li>
            <li>
              <i className="swatch b" /> View B extrudes across the side 橫向擠出
            </li>
            <li>
              <i className="swatch m" /> Mirror plane flips a copy 鏡像面
            </li>
          </ul>
        ) : (
          <p className="caption">Green face is view A. Coral face is view B. Lock a view to read one side.</p>
        )}
        <OrthoPanel
          camera={camera}
          wordA={shownA || 'A'}
          wordB={shownB || 'B'}
          showConstruction={showConstruction}
          width={metrics.width}
          depth={metrics.depth}
        />
      </VizCard>
      <SideCard>
        <p className="panel-title">Words 文字</p>
        <div className="chip-row">
          {DUAL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="chip"
              aria-pressed={activePreset === preset.id}
              onClick={() => applyPreset(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className="note">School initials 校名縮寫: swap TN / IP for your own letters.</p>
        <div className="print-words">
          <label>
            View A · front 正面
            <input
              className="print-word"
              value={wordA}
              maxLength={16}
              onChange={(event) => {
                setWordA(event.target.value.slice(0, 16))
                setAcks((cur) => ({ ...cur, plate: false }))
                resetExport()
              }}
            />
          </label>
          <label>
            View B · side 側面
            <input
              className="print-word"
              value={wordB}
              maxLength={16}
              onChange={(event) => {
                setWordB(event.target.value.slice(0, 16))
                setAcks((cur) => ({ ...cur, plate: false }))
                resetExport()
              }}
            />
          </label>
        </div>
        {!wordsReady ? <p className="note">Type a short word on both views. Letters or 中文.</p> : null}

        <div className="seq-range-wrap">
          <label htmlFor="stroke-mm">Stroke thickness 筆畫 {stroke} mm</label>
          <input
            id="stroke-mm"
            className="seq-range"
            type="range"
            min={1}
            max={8}
            step={0.5}
            value={stroke}
            onChange={(event) => {
              setStroke(Number(event.target.value))
              setAcks((cur) => ({ ...cur, thick: false }))
              resetExport()
            }}
          />
          <div className="seq-range-ends">
            <span>1 hairline</span>
            <span>3 mm rule</span>
            <span>8</span>
          </div>
        </div>
        <div className="seq-range-wrap">
          <label htmlFor="scale-pct">Scale in Tinkercad 比例 {scale}%</label>
          <input
            id="scale-pct"
            className="seq-range"
            type="range"
            min={50}
            max={400}
            step={10}
            value={scale}
            onChange={(event) => {
              setScale(Number(event.target.value))
              setAcks((cur) => ({ ...cur, plate: false }))
              resetExport()
            }}
          />
        </div>
        <button
          type="button"
          className="print-check"
          aria-pressed={flatBase}
          onClick={() => {
            setFlatBase((on) => !on)
            setAcks((cur) => ({ ...cur, base: false }))
            resetExport()
          }}
        >
          <span className={`print-pill ${flatBase ? 'is-ok' : 'is-fail'}`}>{flatBase ? 'On' : 'Off'}</span>
          <span>
            <strong>Flat base on the bed 底面貼熱床</strong>
            <small>The bottom face is the one that touches the H2D plate.</small>
          </span>
        </button>

        <div className="print-callouts">
          <p className={thickOk ? 'is-ok' : 'is-fail'}>Stroke ≥ 3 mm. Thin script and hairline fonts disappear.</p>
          <p className={flatBase ? 'is-ok' : 'is-fail'}>Keep a flat face on the bed. Do not balance the block on an edge.</p>
          <p>Avoid hairline fonts. Bold, short words print. Long sentences do not.</p>
        </div>

        <p className="panel-title">Checklist before export</p>
        <button
          type="button"
          className="print-check"
          aria-pressed={acks.thick}
          disabled={!thickOk}
          onClick={() => setAcks((cur) => ({ ...cur, thick: !cur.thick }))}
        >
          <span className={`print-pill ${thickOk ? 'is-ok' : 'is-fail'}`}>{thickOk ? 'OK' : 'Fix'}</span>
          <span>
            <strong>Thickness OK 厚度</strong>
            <small>
              {thickOk
                ? `Stroke is ${stroke} mm. Tick after you have looked.`
                : 'Raise the stroke to at least 3 mm.'}
            </small>
          </span>
        </button>
        <button
          type="button"
          className="print-check"
          aria-pressed={acks.base}
          disabled={!flatBase}
          onClick={() => setAcks((cur) => ({ ...cur, base: !cur.base }))}
        >
          <span className={`print-pill ${flatBase ? 'is-ok' : 'is-fail'}`}>{flatBase ? 'OK' : 'Fix'}</span>
          <span>
            <strong>Flat base 平底</strong>
            <small>{flatBase ? 'The bed face is on. Tick to confirm.' : 'Turn the flat base on first.'}</small>
          </span>
        </button>
        <button
          type="button"
          className="print-check"
          aria-pressed={acks.plate}
          disabled={!plateOk}
          onClick={() => setAcks((cur) => ({ ...cur, plate: !cur.plate }))}
        >
          <span className={`print-pill ${plateOk ? 'is-ok' : 'is-fail'}`}>{plateOk ? 'OK' : 'Fix'}</span>
          <span>
            <strong>Fits the plate 熱床</strong>
            <small>
              {metrics.width} × {metrics.depth} × {metrics.height} mm. H2D single nozzle is {H2D_SINGLE.w} ×{' '}
              {H2D_SINGLE.d} × {H2D_SINGLE.h} mm.
              {plateOk ? ' Tick when it fits.' : ' Lower the scale or shorten a word.'}
            </small>
          </span>
        </button>

        <button
          type="button"
          className="play-btn"
          disabled={!canExport || exported}
          onClick={() => setExported(true)}
        >
          {exported ? 'Exported (simulated)' : 'Export .stl'}
        </button>
        {exported ? (
          <div className="print-celebrate" role="status">
            <strong>Ready for Tinkercad / Bambu Studio</strong>
            <p>
              Simulated file <b>{metrics.fileName}</b>. Nothing was downloaded. In Tinkercad: Text →
              Extrude → Mirror → Align. Front reads {shownA}. Side reads {shownB}. Then one object
              on the plate with the PLA preset.
            </p>
          </div>
        ) : (
          <p className="note">
            In the real app: Text, extrude it, mirror, align. This lab teaches that idea. The button
            does not build an STL.
          </p>
        )}
      </SideCard>
    </ModuleFrame>
  )
}

function cameraLabel(camera: DualCamera): string {
  if (camera === 'orbit') return 'orbit 環繞'
  if (camera === 'front') return 'front 正面'
  if (camera === 'side') return 'side 側面'
  return 'top 頂視'
}

function OrthoPanel({
  camera,
  wordA,
  wordB,
  showConstruction,
  width,
  depth,
}: {
  camera: DualCamera
  wordA: string
  wordB: string
  showConstruction: boolean
  width: number
  depth: number
}) {
  if (camera === 'front') {
    return (
      <div className="ortho-card">
        <div className="ortho-word">{wordA}</div>
        <p>
          Front 正面 · width {width} mm. You should read {wordA} only. Word {wordB} is hidden in the
          depth.
        </p>
      </div>
    )
  }
  if (camera === 'side') {
    return (
      <div className="ortho-card side">
        <div className="ortho-word">{wordB}</div>
        <p>
          Side 側面 · depth {depth} mm. You should read {wordB} only. That is the extrusion crossing
          the first word.
        </p>
      </div>
    )
  }
  if (camera === 'top') {
    return (
      <div className="ortho-card top">
        <svg viewBox="0 0 320 180" className="ortho-plan" role="img" aria-label="Top view plan">
          <rect x="16" y="36" width="200" height="44" rx="8" fill="#d5efe8" stroke="#0f6e67" strokeWidth="2" />
          <rect x="138" y="16" width="44" height="148" rx="8" fill="#fde6dc" stroke="#c4451a" strokeWidth="2" />
          <rect x="138" y="36" width="44" height="44" fill="#fdecc8" stroke="#a16207" />
          <text x="24" y="64" fontSize="16" fontWeight="700">
            {wordA}
          </text>
          <text x="160" y="178" textAnchor="middle" fontSize="14" fontWeight="700">
            {wordB}
          </text>
          <text x="230" y="58" fontSize="12" fontWeight="700" fill="#0a4f4a">
            A · {width} mm
          </text>
          <text x="188" y="100" fontSize="12" fontWeight="700" fill="#c4451a">
            B · {depth} mm
          </text>
          {showConstruction ? (
            <line x1="160" y1="8" x2="160" y2="164" stroke="#a16207" strokeDasharray="4 3" />
          ) : null}
        </svg>
        <p>Top 頂視 · the words cross. The gold square is the shared solid.</p>
      </div>
    )
  }
  return null
}
