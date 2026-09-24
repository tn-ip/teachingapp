import { useEffect, useRef, useState } from 'react'
import type { Axes } from '../lib/drone'

type Stick = { x: number; y: number }

type StickPadProps = {
  label: string
  hand: string
  horiz: string
  vert: string
  valueRef: { current: Stick }
  resetToken: number
}

export function StickPad({ label, hand, horiz, vert, valueRef, resetToken }: StickPadProps) {
  const baseRef = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  useEffect(() => {
    valueRef.current = { x: 0, y: 0 }
    setKnob({ x: 0, y: 0 })
  }, [resetToken, valueRef])

  const end = () => {
    valueRef.current = { x: 0, y: 0 }
    setKnob({ x: 0, y: 0 })
  }

  const move = (clientX: number, clientY: number) => {
    const el = baseRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const max = Math.min(rect.width, rect.height) * 0.28
    let dx = clientX - (rect.left + rect.width / 2)
    let dy = clientY - (rect.top + rect.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > max && len > 0) {
      dx = (dx / len) * max
      dy = (dy / len) * max
    }
    const dead = max * 0.18
    const nx = Math.abs(dx) < dead ? 0 : dx / max
    const ny = Math.abs(dy) < dead ? 0 : -dy / max
    valueRef.current = { x: clampUnit(nx), y: clampUnit(ny) }
    setKnob({ x: dx, y: dy })
  }

  return (
    <div className="drone-stick-wrap">
      <div className="drone-stick-label">
        <strong>{label}</strong>
        <span>{hand}</span>
      </div>
      <div
        ref={baseRef}
        className="drone-stick"
        role="group"
        aria-label={`${label}. ${vert}. ${horiz}.`}
        onPointerDown={(e) => {
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
          move(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e.clientX, e.clientY)
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="drone-stick-hint drone-stick-hint-n">↑</span>
        <span className="drone-stick-hint drone-stick-hint-s">↓</span>
        <span className="drone-stick-hint drone-stick-hint-w">←</span>
        <span className="drone-stick-hint drone-stick-hint-e">→</span>
        <span className="drone-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
      <p className="drone-stick-axes">
        <span>{vert}</span>
        <span>{horiz}</span>
      </p>
    </div>
  )
}

function clampUnit(n: number) {
  return Math.min(1, Math.max(-1, n))
}

export function Mode2Diagram() {
  return (
    <div className="drone-mode2">
      <p className="panel-title">Mode 2 · American 美國手</p>
      <div className="drone-mode2-grid">
        <div>
          <div className="drone-mode2-face" aria-hidden="true">
            <span />
            <span>throttle</span>
            <span />
            <span>yaw</span>
            <span className="hub">L</span>
            <span>yaw</span>
            <span />
            <span>down</span>
            <span />
          </div>
          <strong>Left stick 左手</strong>
          <span>Up and down change height. Left and right turn the nose (yaw).</span>
        </div>
        <div>
          <div className="drone-mode2-face" aria-hidden="true">
            <span />
            <span>forward</span>
            <span />
            <span>strafe</span>
            <span className="hub">R</span>
            <span>strafe</span>
            <span />
            <span>back</span>
            <span />
          </div>
          <strong>Right stick 右手</strong>
          <span>Up and down pitch along the nose. Left and right strafe sideways (roll).</span>
        </div>
      </div>
    </div>
  )
}

type HoldProps = {
  label: string
  zh: string
  axis: keyof Axes
  sign: 1 | -1
  onDown: (axis: keyof Axes, sign: 1 | -1) => void
  onUp: (axis: keyof Axes) => void
}

export function HoldButton({ label, zh, axis, sign, onDown, onUp }: HoldProps) {
  return (
    <button
      type="button"
      className="drone-hold"
      aria-label={`${label} ${zh}. Hold to fly, or tap for a short nudge.`}
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        onDown(axis, sign)
      }}
      onPointerUp={() => onUp(axis)}
      onPointerCancel={() => onUp(axis)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span>{label}</span>
      <small>{zh}</small>
    </button>
  )
}
