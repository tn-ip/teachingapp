import type { CSSProperties } from 'react'
import { displayWord, type DualCamera } from '../lib/print3d'

type DualViewStageProps = {
  wordA: string
  wordB: string
  camera: DualCamera
  showConstruction: boolean
  strokeMm: number
  flatBase: boolean
}

function wordStyle(word: string, strokeMm: number): CSSProperties {
  const len = Math.max([...word].length, 1)
  return {
    fontSize: `${Math.max(18, Math.min(44, 112 / len))}px`,
    fontWeight: strokeMm >= 3 ? 750 : 500,
    letterSpacing: len > 4 ? '-0.04em' : '0.02em',
    opacity: strokeMm < 3 ? 0.72 : 1,
  }
}

export function DualViewStage({
  wordA,
  wordB,
  camera,
  showConstruction,
  strokeMm,
  flatBase,
}: DualViewStageProps) {
  const a = displayWord(wordA) || 'A'
  const b = displayWord(wordB) || 'B'
  const faceW = Math.min(188, Math.max(112, [...a].length * 42))
  const depth = Math.min(168, Math.max(88, [...b].length * 36))
  const faceH = 118
  const style = {
    '--w': `${faceW}px`,
    '--h': `${faceH}px`,
    '--d': `${depth}px`,
  } as CSSProperties

  return (
    <div
      className={`dual-stage${camera === 'orbit' ? ' is-orbit' : ' is-ortho'} view-${camera}${
        showConstruction ? ' is-building' : ''
      }${flatBase ? '' : ' is-floating'}`}
      style={style}
      role="img"
      aria-label={`Dual-view block. Front reads ${a}. Side reads ${b}.`}
    >
      <div className="dual-floor" aria-hidden="true">
        <span>{flatBase ? 'bed 熱床' : 'not on the bed 未貼床'}</span>
      </div>
      <div className="dual-scene">
        <div className="dual-world">
          <Face className="front" caption="A 正面" word={a} strokeMm={strokeMm} />
          <Face className="back" caption="A 背面" word={a} strokeMm={strokeMm} flip />
          <Face className="right" caption="B 側面" word={b} strokeMm={strokeMm} />
          <Face className="left" caption="B" word={b} strokeMm={strokeMm} />
          <div className="dual-face top" aria-hidden="true">
            <span className="dual-caption">top 頂視</span>
            <span className="dual-cross">
              {a}
              <i />
              {b}
            </span>
          </div>
          <div className="dual-face bottom" aria-hidden="true">
            {flatBase ? 'flat base' : 'floating'}
          </div>
          <div className="dual-plane" aria-hidden="true">
            <span>Mirror 鏡像</span>
          </div>
          <div className="dual-arrow arrow-a" aria-hidden="true" />
          <div className="dual-arrow arrow-b" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

function Face({
  className,
  caption,
  word,
  strokeMm,
  flip = false,
}: {
  className: string
  caption: string
  word: string
  strokeMm: number
  flip?: boolean
}) {
  return (
    <div className={`dual-face ${className}${strokeMm < 3 ? ' is-thin' : ''}`} aria-hidden="true">
      <span className="dual-caption">{caption}</span>
      <span className={`dual-word${flip ? ' is-flip' : ''}`} style={wordStyle(word, strokeMm)}>
        {word}
      </span>
      <span className="dual-mm">{strokeMm} mm</span>
    </div>
  )
}
