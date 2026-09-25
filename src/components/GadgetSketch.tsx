import type { GadgetId } from '../lib/print3d'
import { formatMm } from '../lib/print3d'

type GadgetSketchProps = {
  id: GadgetId
  values: Record<string, number>
  flatBase: boolean
  holeFail: boolean
  wallBad: boolean
  overhang: boolean
}

export function GadgetSketch({
  id,
  values,
  flatBase,
  holeFail,
  wallBad,
  overhang,
}: GadgetSketchProps) {
  return (
    <svg className="gadget-svg" viewBox="0 0 460 280" role="img" aria-label="Parametric preview">
      <rect x="0" y="0" width="460" height="280" fill="#f6efe4" rx="16" />
      {id === 'cable' ? (
        <Cable values={values} holeFail={holeFail} wallBad={wallBad} />
      ) : null}
      {id === 'bookmark' ? (
        <Bookmark values={values} holeFail={holeFail} wallBad={wallBad} />
      ) : null}
      {id === 'earphone' ? (
        <Earphone
          values={values}
          holeFail={holeFail}
          wallBad={wallBad}
          overhang={overhang}
          flatBase={flatBase}
        />
      ) : null}
      {id === 'stand' ? (
        <Stand
          values={values}
          holeFail={holeFail}
          wallBad={wallBad}
          overhang={overhang}
          flatBase={flatBase}
        />
      ) : null}
      {!flatBase ? (
        <text x="16" y="28" fill="#c4451a" fontSize="14" fontWeight="700">
          No flat base 未貼熱床
        </text>
      ) : null}
    </svg>
  )
}

function dimText(x: number, y: number, label: string, anchor: 'start' | 'middle' | 'end' = 'start') {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize="13" fontWeight="700" fill="#1a2330">
      {label}
    </text>
  )
}

function Cable({
  values,
  holeFail,
  wallBad,
}: {
  values: Record<string, number>
  holeFail: boolean
  wallBad: boolean
}) {
  const s = 150 / Math.max(values.width, values.height)
  const rw = values.width * s
  const rh = values.height * s
  const x = 36
  const y = 48
  const rad = (values.channel / 2) * s
  const cx = x + rw / 2
  const cy = y + rh / 2
  const lengthScale = 200 / Math.max(values.length, 40)
  const lw = values.length * lengthScale
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={rw}
        height={rh}
        rx="8"
        fill={wallBad ? '#fdecc8' : '#d5efe8'}
        stroke={wallBad ? '#a16207' : '#0f6e67'}
        strokeWidth="3"
      />
      <circle
        cx={cx}
        cy={cy}
        r={Math.max(rad, 4)}
        fill="#fffaf2"
        stroke={holeFail ? '#c4451a' : '#1a2330'}
        strokeWidth="3"
      />
      {dimText(x, y + rh + 22, `width ${formatMm(values.width)} mm`)}
      {dimText(x + rw + 8, y + 16, `h ${formatMm(values.height)}`)}
      {dimText(cx, cy + 4, `Ø ${formatMm(values.channel)}`, 'middle')}
      {dimText(x, y - 10, `wall ${formatMm(values.wall)} mm`)}
      <rect
        x={250}
        y={120}
        width={Math.max(lw, 24)}
        height="36"
        rx="8"
        fill="#d5efe8"
        stroke="#0f6e67"
        strokeWidth="3"
      />
      {dimText(250, 178, `length ${formatMm(values.length)} mm`)}
      {dimText(250, 108, 'side view 側面')}
      {dimText(36, 40, 'end view 端面')}
    </g>
  )
}

function Bookmark({
  values,
  holeFail,
  wallBad,
}: {
  values: Record<string, number>
  holeFail: boolean
  wallBad: boolean
}) {
  const s = 190 / values.length
  const bw = Math.max(36, values.width * s)
  const bh = values.length * s
  const x = 150
  const y = 36
  const holeR = Math.max(5, (values.hole / 2) * s * 1.6)
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={bw}
        height={bh}
        rx="8"
        fill={wallBad ? '#fdecc8' : '#dce8f8'}
        stroke={wallBad ? '#a16207' : '#1e4b8a'}
        strokeWidth="3"
      />
      <circle
        cx={x + bw / 2}
        cy={y + 28}
        r={holeR}
        fill="#fffaf2"
        stroke={holeFail ? '#c4451a' : '#1a2330'}
        strokeWidth="3"
      />
      {dimText(x + bw / 2, y + bh + 20, `length ${formatMm(values.length)} mm`, 'middle')}
      {dimText(x + bw + 10, y + 24, `width ${formatMm(values.width)} mm`)}
      {dimText(x, y - 8, `hole Ø ${formatMm(values.hole)} · thick ${formatMm(values.thickness)} mm`)}
      <rect
        x="48"
        y={y + bh - 16}
        width={Math.max(10, values.thickness * 6)}
        height="16"
        fill="#1e4b8a"
      />
      {dimText(48, y + bh + 20, `${formatMm(values.thickness)} mm on the bed`)}
    </g>
  )
}

function Earphone({
  values,
  holeFail,
  wallBad,
  overhang,
  flatBase,
}: {
  values: Record<string, number>
  holeFail: boolean
  wallBad: boolean
  overhang: boolean
  flatBase: boolean
}) {
  const span = Math.max(values.baseW, values.arm + 40, values.post + values.baseT)
  const s = 200 / span
  const baseW = values.baseW * s
  const baseH = Math.max(10, values.baseT * s * 1.4)
  const postH = values.post * s
  const arm = values.arm * s
  const armH = Math.max(8, values.armT * s)
  const cup = Math.max(8, (values.cup / 2) * s)
  const x = 70
  const bed = 210
  const baseY = bed - baseH
  const postX = x + 28
  const armY = baseY - postH
  return (
    <g>
      <rect
        x={x}
        y={baseY}
        width={baseW}
        height={baseH}
        rx="4"
        fill={flatBase ? '#0f6e67' : '#c4451a'}
      />
      <rect
        x={postX}
        y={armY}
        width={Math.max(12, values.armT * s)}
        height={postH}
        fill={wallBad ? '#fdecc8' : '#d5efe8'}
        stroke="#0f6e67"
        strokeWidth="2"
      />
      <rect
        x={postX}
        y={armY}
        width={arm}
        height={armH}
        fill={overhang ? '#fde6dc' : '#d5efe8'}
        stroke={overhang ? '#c4451a' : '#0f6e67'}
        strokeWidth="3"
      />
      <circle
        cx={postX + arm}
        cy={armY + armH / 2}
        r={cup}
        fill="#fffaf2"
        stroke={holeFail ? '#c4451a' : '#1a2330'}
        strokeWidth="3"
      />
      {dimText(x, bed + 22, `base ${formatMm(values.baseW)} × ${formatMm(values.baseD)} × ${formatMm(values.baseT)} mm`)}
      {dimText(x, 36, `post ${formatMm(values.post)} · arm ${formatMm(values.arm)} · cup Ø ${formatMm(values.cup)} mm`)}
      {dimText(x, 56, `arm thick ${formatMm(values.armT)} mm`)}
    </g>
  )
}

function Stand({
  values,
  holeFail,
  wallBad,
  overhang,
  flatBase,
}: {
  values: Record<string, number>
  holeFail: boolean
  wallBad: boolean
  overhang: boolean
  flatBase: boolean
}) {
  const s = 180 / Math.max(values.baseW, values.plateH + values.baseT)
  const baseW = values.baseW * s
  const baseH = Math.max(12, values.baseT * 4)
  const plateH = values.plateH * s
  const plateW = Math.max(10, values.plateT * 5)
  const lean = Math.min(70, values.lean * 1.1)
  const x = 80
  const bed = 200
  const plateX = x + baseW * 0.35
  const top = bed - baseH - plateH
  const slotW = Math.max(4, values.slot * 3)
  return (
    <g>
      <rect
        x={x}
        y={bed - baseH}
        width={baseW}
        height={baseH}
        rx="4"
        fill={flatBase ? '#1e4b8a' : '#c4451a'}
      />
      <rect
        x={plateX + baseW * 0.2}
        y={bed - baseH + 4}
        width={slotW}
        height={Math.max(4, baseH - 8)}
        fill="#fffaf2"
        stroke={holeFail ? '#c4451a' : '#f7f1e6'}
        strokeWidth="2"
      />
      <polygon
        points={`${plateX},${bed - baseH} ${plateX + plateW},${bed - baseH} ${plateX + plateW + lean},${top} ${plateX + lean},${top}`}
        fill={overhang || wallBad ? '#fdecc8' : '#dce8f8'}
        stroke={overhang ? '#c4451a' : '#1e4b8a'}
        strokeWidth="3"
      />
      {dimText(x, bed + 24, `base ${formatMm(values.baseW)} × ${formatMm(values.baseD)} × ${formatMm(values.baseT)} mm`)}
      {dimText(
        x,
        36,
        `plate h ${formatMm(values.plateH)} · thick ${formatMm(values.plateT)} · lean ${formatMm(values.lean)} · slot ${formatMm(values.slot)} mm`,
      )}
    </g>
  )
}
