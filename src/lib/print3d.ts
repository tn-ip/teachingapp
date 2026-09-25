/** Classroom data for the Tinkercad / H2D labs. Sizes are millimetres. */

export type PrintView = 'dual-text' | 'gadget' | 'ai'

export type CheckState = 'ok' | 'warn' | 'fail'

export type PrintCheck = {
  id: string
  state: CheckState
  title: string
  detail: string
}

export const H2D_SINGLE = { w: 325, d: 320, h: 325 }
/** Dual-nozzle overlap on the H2D. A comfortable first print stays inside this width. */
export const H2D_FIRST_MM = 300
/** Tinkercad's default grid is about 200 mm until Edit Grid. */
export const TINKERCAD_COMFORT_MM = 200
export const TINKERCAD_GRID_MAX_MM = 1000

export const PRINT_LABS: {
  id: PrintView
  index: string
  title: string
  short: string
  zh: string
  bilingual: string
  blurb: string
  tip: string
}[] = [
  {
    id: 'dual-text',
    index: 'Cycle 7 · Text',
    title: 'Dual text illusion',
    short: 'Dual text',
    zh: '雙面文字',
    bilingual: '文字 · 鏡像 · 對齊',
    blurb:
      'One block, two words. The front reads word A. The side reads word B. Then you know what to extrude in Tinkercad.',
    tip: 'Text → Extrude → Mirror → Align. Short words, thick strokes, flat on the bed.',
  },
  {
    id: 'gadget',
    index: 'Cycle 8 · Gadget',
    title: 'Functional design',
    short: 'Gadget',
    zh: '實用設計',
    bilingual: '量度 · 配合 · 結構',
    blurb:
      'Pick a school gadget, measure it in millimetres, and watch a box-and-cylinder preview update.',
    tip: 'Hole ≥ 3 mm, wall ≥ 3 mm, a flat base, and a short cantilever. Then rebuild the numbers in Tinkercad.',
  },
  {
    id: 'ai',
    index: 'AI · Mesh',
    title: 'AI → Tinkercad',
    short: 'AI import',
    zh: 'AI 匯入',
    bilingual: '提示 · 評估 · Delightex',
    blurb:
      'Write a 3D prompt, judge a good mesh against a bad one, then plan the Tinkercad edits before Delightex.',
    tip: 'Symmetry, a flat base, a solid body, no thin spikes, a simple silhouette. Scale before you import.',
  },
]

export const DUAL_PRESETS: { id: string; a: string; b: string; label: string }[] = [
  { id: 'hi', a: 'HI', b: 'BYE', label: 'HI / BYE' },
  { id: 'yes', a: 'YES', b: 'NO', label: 'YES / NO' },
  { id: 'love', a: '愛', b: '心', label: '愛 / 心' },
  { id: 'school', a: 'TN', b: 'IP', label: 'TN / IP' },
]

export type DualCamera = 'orbit' | 'front' | 'side' | 'top'

export const DUAL_CAMERAS: { id: DualCamera; label: string; zh: string }[] = [
  { id: 'orbit', label: 'Orbit', zh: '環繞' },
  { id: 'front', label: 'Front', zh: '正面' },
  { id: 'side', label: 'Side', zh: '側面' },
  { id: 'top', label: 'Top', zh: '頂視' },
]

const LETTER_PITCH = 32
const BLOCK_HEIGHT = 28

export function displayWord(raw: string): string {
  return [...raw].filter((ch) => /[\p{L}\p{N}]/u.test(ch)).slice(0, 8).join('')
}

export function dualMetrics(
  wordA: string,
  wordB: string,
  scalePercent: number,
  strokeMm: number,
) {
  const a = Math.max(1, [...displayWord(wordA)].length)
  const b = Math.max(1, [...displayWord(wordB)].length)
  const scale = scalePercent / 100
  const width = Math.round(a * LETTER_PITCH * scale)
  const depth = Math.round(b * LETTER_PITCH * scale)
  const height = Math.round(Math.max(BLOCK_HEIGHT, strokeMm * 5) * scale)
  const fits = width <= H2D_SINGLE.w && depth <= H2D_SINGLE.d && height <= H2D_SINGLE.h
  return {
    width,
    depth,
    height,
    fits,
    strokeOk: strokeMm >= 3,
    fileName: `dual-${fileSlug(wordA)}-${fileSlug(wordB)}.stl`,
  }
}

function fileSlug(word: string): string {
  const shown = displayWord(word)
  const ascii = shown.replace(/[^\w]+/g, '').toLowerCase()
  return ascii || shown || 'word'
}

export type GadgetId = 'cable' | 'bookmark' | 'earphone' | 'stand'
export type DimKind = 'outer' | 'hole' | 'wall' | 'overhang'

export type GadgetDim = {
  id: string
  label: string
  zh: string
  min: number
  max: number
  step: number
  value: number
  kind: DimKind
  hint: string
}

export type GadgetSpec = {
  id: GadgetId
  title: string
  bilingual: string
  blurb: string
  job: string
  dims: GadgetDim[]
}

export const GADGETS: GadgetSpec[] = [
  {
    id: 'cable',
    title: 'Cable organizer',
    bilingual: '理線夾',
    blurb: 'A desk clip for one charging cable.',
    job: 'The cable drops in, stays put, and is not pinched.',
    dims: [
      { id: 'width', label: 'Outer width', zh: '外寬', min: 16, max: 90, step: 1, value: 36, kind: 'outer', hint: 'End view, left to right' },
      { id: 'height', label: 'Outer height', zh: '外高', min: 14, max: 70, step: 1, value: 28, kind: 'outer', hint: 'End view, bed to top' },
      { id: 'length', label: 'Length', zh: '長度', min: 20, max: 360, step: 1, value: 70, kind: 'outer', hint: 'Along the cable' },
      { id: 'channel', label: 'Cable hole', zh: '線孔', min: 2, max: 28, step: 1, value: 8, kind: 'hole', hint: 'Diameter' },
      { id: 'wall', label: 'Wall', zh: '壁厚', min: 1, max: 8, step: 0.5, value: 3, kind: 'wall', hint: 'Plastic around the hole' },
    ],
  },
  {
    id: 'bookmark',
    title: 'Bookmark',
    bilingual: '書籤',
    blurb: 'A flat marker with a hole for a ribbon.',
    job: 'It slides in a book and the ribbon hole does not tear out.',
    dims: [
      { id: 'length', label: 'Length', zh: '長度', min: 60, max: 260, step: 1, value: 140, kind: 'outer', hint: 'Tall side' },
      { id: 'width', label: 'Width', zh: '闊度', min: 12, max: 80, step: 1, value: 32, kind: 'outer', hint: 'Across the page' },
      { id: 'thickness', label: 'Thickness', zh: '厚度', min: 1, max: 8, step: 0.5, value: 3, kind: 'wall', hint: 'Print this face on the bed' },
      { id: 'hole', label: 'Ribbon hole', zh: '圓孔', min: 2, max: 14, step: 1, value: 4, kind: 'hole', hint: 'Diameter' },
    ],
  },
  {
    id: 'earphone',
    title: 'Earphone holder',
    bilingual: '耳機座',
    blurb: 'A base, a post, and a short arm with a cup.',
    job: 'The earbuds sit in the cup. The arm must not sag or snap.',
    dims: [
      { id: 'baseW', label: 'Base width', zh: '座寬', min: 40, max: 220, step: 1, value: 90, kind: 'outer', hint: 'Left to right on the bed' },
      { id: 'baseD', label: 'Base depth', zh: '座深', min: 30, max: 180, step: 1, value: 56, kind: 'outer', hint: 'Front to back' },
      { id: 'baseT', label: 'Base thickness', zh: '座厚', min: 1, max: 12, step: 0.5, value: 4, kind: 'wall', hint: 'Flat plastic on the bed' },
      { id: 'post', label: 'Post height', zh: '柱高', min: 12, max: 140, step: 1, value: 42, kind: 'outer', hint: 'Up from the base' },
      { id: 'arm', label: 'Arm length', zh: '懸臂', min: 8, max: 120, step: 1, value: 32, kind: 'overhang', hint: 'Stick-out from the post' },
      { id: 'armT', label: 'Arm thickness', zh: '臂厚', min: 1, max: 12, step: 0.5, value: 5, kind: 'wall', hint: 'Up-and-down thickness of the arm' },
      { id: 'cup', label: 'Cup hole', zh: '杯孔', min: 2, max: 28, step: 1, value: 8, kind: 'hole', hint: 'Where the earbud sits' },
    ],
  },
  {
    id: 'stand',
    title: 'Desk name stand',
    bilingual: '姓名座',
    blurb: 'A slab base, a name plate, and a slot for a card.',
    job: 'The plate stands up, the card fits, and the base does not tip.',
    dims: [
      { id: 'baseW', label: 'Base width', zh: '座寬', min: 50, max: 280, step: 1, value: 120, kind: 'outer', hint: 'Left to right' },
      { id: 'baseD', label: 'Base depth', zh: '座深', min: 24, max: 180, step: 1, value: 60, kind: 'outer', hint: 'Front to back' },
      { id: 'baseT', label: 'Base thickness', zh: '座厚', min: 1, max: 14, step: 0.5, value: 5, kind: 'wall', hint: 'Flat on the bed' },
      { id: 'plateH', label: 'Plate height', zh: '牌高', min: 20, max: 180, step: 1, value: 64, kind: 'outer', hint: 'Above the base' },
      { id: 'plateT', label: 'Plate thickness', zh: '牌厚', min: 1, max: 12, step: 0.5, value: 3, kind: 'wall', hint: 'The upright sheet' },
      { id: 'lean', label: 'Lean', zh: '前傾', min: 0, max: 80, step: 1, value: 10, kind: 'overhang', hint: 'How far the top sticks past the plate' },
      { id: 'slot', label: 'Card slot', zh: '插槽', min: 1, max: 12, step: 0.5, value: 3, kind: 'hole', hint: 'Groove width' },
    ],
  },
]

export const GROUP_ROLES: { id: 'measurer' | 'designer' | 'checker'; title: string; duty: string }[] = [
  {
    id: 'measurer',
    title: 'Measurer 量度',
    duty: 'Read the real object in millimetres. Type one labelled size at a time. Do not guess inches.',
  },
  {
    id: 'designer',
    title: 'Designer 設計',
    duty: 'Watch the preview. Change a single size until the shape matches the job.',
  },
  {
    id: 'checker',
    title: 'Checker 檢查',
    duty: 'Read every fit line. Do not send the group to Tinkercad while a line is red.',
  },
]

export function gadgetById(id: GadgetId): GadgetSpec {
  const found = GADGETS.find((gadget) => gadget.id === id)
  return found ?? GADGETS[0]
}

export function defaultValues(id: GadgetId): Record<string, number> {
  return Object.fromEntries(gadgetById(id).dims.map((dim) => [dim.id, dim.value]))
}

export function snapDim(dim: GadgetDim, raw: number): number {
  if (!Number.isFinite(raw)) return dim.value
  const clamped = Math.min(dim.max, Math.max(dim.min, raw))
  const steps = Math.round((clamped - dim.min) / dim.step)
  return Math.round((dim.min + steps * dim.step) * 100) / 100
}

export function formatMm(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const rounded = Math.abs(n) >= 10 ? Math.round(n) : Math.round(n * 100) / 100
  return String(rounded)
}

export function evaluateGadget(
  gadget: GadgetSpec,
  values: Record<string, number>,
  flatBase: boolean,
): PrintCheck[] {
  const v = (id: string) => values[id] ?? 0
  const checks: PrintCheck[] = []

  for (const dim of gadget.dims) {
    const value = v(dim.id)
    if (dim.kind === 'hole') {
      checks.push({
        id: `hole-${dim.id}`,
        state: value >= 3 ? 'ok' : 'fail',
        title: `${dim.label} ≥ 3 mm · ${dim.zh}`,
        detail:
          value >= 3
            ? `${formatMm(value)} mm can stay open on a 0.4 mm nozzle.`
            : `${formatMm(value)} mm will close up. Use at least 3 mm.`,
      })
    }
    if (dim.kind === 'wall') {
      const state: CheckState = value >= 3 ? 'ok' : value >= 2 ? 'warn' : 'fail'
      checks.push({
        id: `wall-${dim.id}`,
        state,
        title: `${dim.label} · ${dim.zh}`,
        detail:
          state === 'ok'
            ? `${formatMm(value)} mm is a solid first-print wall.`
            : state === 'warn'
              ? `${formatMm(value)} mm can print. Prefer 3 mm so it survives a drop.`
              : `${formatMm(value)} mm is under 2 mm. Thicken it.`,
      })
    }
  }

  checks.push(holeFit(gadget.id, v))
  checks.push({
    id: 'base',
    state: flatBase ? 'ok' : 'fail',
    title: 'Flat base 平底貼熱床',
    detail: flatBase
      ? 'A flat face sits on the bed. No raft needed for the first try.'
      : 'Turn the flat face on. A point or a curve will not stick.',
  })
  const overhang = overhangCheck(gadget.id, v)
  if (overhang) checks.push(overhang)
  checks.push(plateCheck(gadget.id, v))
  return checks
}

function holeFit(id: GadgetId, v: (id: string) => number): PrintCheck {
  if (id === 'cable') {
    const need = v('channel') + 2 * v('wall')
    const ok = need <= v('width') + 0.01 && need <= v('height') + 0.01
    return {
      id: 'hole-fit',
      state: ok ? 'ok' : 'fail',
      title: 'Hole fits in the body 孔放得下',
      detail: ok
        ? `Hole plus two walls is ${formatMm(need)} mm, inside ${formatMm(v('width'))} × ${formatMm(v('height'))} mm.`
        : `Hole plus two walls needs ${formatMm(need)} mm. Widen the body or shrink the hole.`,
    }
  }
  if (id === 'bookmark') {
    const need = v('hole') + 8
    const ok = need <= v('width')
    return {
      id: 'hole-fit',
      state: ok ? 'ok' : 'fail',
      title: 'Hole stays off the edge 孔離邊',
      detail: ok
        ? `The ribbon hole keeps plastic around it on a ${formatMm(v('width'))} mm width.`
        : `Leave about 4 mm of plastic on each side of the hole. Widen the bookmark or shrink the hole.`,
    }
  }
  if (id === 'earphone') {
    const need = v('cup') + 2 * v('armT')
    const ok = need <= v('baseW')
    return {
      id: 'hole-fit',
      state: ok ? 'ok' : 'fail',
      title: 'Cup fits the holder 杯孔放得下',
      detail: ok
        ? `Cup plus walls is ${formatMm(need)} mm, inside the ${formatMm(v('baseW'))} mm base.`
        : `Cup plus walls needs ${formatMm(need)} mm. Widen the base or shrink the cup.`,
    }
  }
  const side = (v('baseD') - v('slot')) / 2
  const ok = side >= 2
  return {
    id: 'hole-fit',
    state: ok ? 'ok' : 'fail',
    title: 'Slot leaves side walls 槽邊有肉',
    detail: ok
      ? `About ${formatMm(side)} mm of base remains on each side of the ${formatMm(v('slot'))} mm slot.`
      : 'The slot eats the base. Deepen the base or narrow the slot so each side keeps ≥ 2 mm.',
  }
}

function overhangCheck(id: GadgetId, v: (id: string) => number): PrintCheck | null {
  if (id === 'earphone') {
    const tooLong = v('arm') > 50 || v('arm') > v('armT') * 10
    return {
      id: 'overhang',
      state: tooLong ? 'warn' : 'ok',
      title: 'Arm cantilever 懸臂',
      detail: tooLong
        ? `The arm is ${formatMm(v('arm'))} mm with ${formatMm(v('armT'))} mm thickness. Shorten it or thicken it so it does not sag. A long stick-out may need support.`
        : `Arm ${formatMm(v('arm'))} mm is short enough for a first print without support.`,
    }
  }
  if (id === 'stand') {
    const tooLong = v('lean') > 30
    return {
      id: 'overhang',
      state: tooLong ? 'warn' : 'ok',
      title: 'Plate lean 前傾',
      detail: tooLong
        ? `The top leans ${formatMm(v('lean'))} mm. It can tip or need support. Pull the lean back or deepen the base.`
        : `Lean ${formatMm(v('lean'))} mm stays over the base for a first print.`,
    }
  }
  return null
}

function plateSpan(id: GadgetId, v: (id: string) => number): number {
  if (id === 'cable') return Math.max(v('width'), v('height'), v('length'))
  if (id === 'bookmark') return Math.max(v('length'), v('width'), v('thickness'))
  if (id === 'earphone') return Math.max(v('baseW'), v('baseD'), v('baseT') + v('post'), v('arm') + v('cup'))
  return Math.max(v('baseW'), v('baseD'), v('plateH') + v('baseT'))
}

function plateCheck(id: GadgetId, v: (id: string) => number): PrintCheck {
  const span = plateSpan(id, v)
  const state: CheckState = span > H2D_SINGLE.w ? 'fail' : span > H2D_FIRST_MM ? 'warn' : 'ok'
  return {
    id: 'plate',
    state,
    title: 'Fits the H2D plate 放得下熱床',
    detail:
      state === 'fail'
        ? `Longest side ${formatMm(span)} mm is past the single-nozzle bed (${H2D_SINGLE.w} × ${H2D_SINGLE.d} × ${H2D_SINGLE.h} mm).`
        : state === 'warn'
          ? `Longest side ${formatMm(span)} mm fits a single nozzle but is tight. Keep the first print under ${H2D_FIRST_MM} mm.`
          : `Longest side ${formatMm(span)} mm fits the first-print area (under ${H2D_FIRST_MM} mm).`,
  }
}

export function readinessScore(checks: PrintCheck[]): number {
  if (checks.length === 0) return 0
  const earned = checks.reduce((sum, check) => {
    if (check.state === 'ok') return sum + 1
    if (check.state === 'warn') return sum + 0.5
    return sum
  }, 0)
  return Math.round((earned / checks.length) * 100)
}

export const BAMBU_TIPS = [
  'First print: one object on the plate.',
  'Bambu Studio: choose the PLA preset (Bambu PLA or Generic PLA).',
  '0.4 mm nozzle and 0.20 mm layers are enough for these gadgets.',
]

export type PromptRuleId = 'symmetry' | 'base' | 'solid' | 'spikes' | 'silhouette'

export type PromptRuleResult = {
  id: PromptRuleId
  label: string
  zh: string
  ok: boolean
  hint: string
  fix: string
}

function softenPrompt(raw: string): string {
  const text = raw
    .trim()
    .replace(/with thin wings?/gi, 'with thick legs')
    .replace(/sharp spikes?/gi, '')
    .replace(/thin spikes?/gi, '')
    .replace(/\bspikes?\b/gi, '')
    .replace(/\blace\b/gi, '')
    .replace(/\bfiligree\b/gi, '')
    .replace(/\bhairline\b/gi, '')
    .replace(/\bdelicate\b/gi, '')
    .replace(/蕾絲|尖刺/g, '')
    .replace(/\s+,/g, ',')
    .replace(/(,\s*)+/g, ', ')
    .replace(/,\s*(and|or)\s*$/gi, '')
    .replace(/\b(and|or)\s*$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,\s]+|[,\s.]+$/g, '')
    .trim()
  return text || 'a school mascot'
}

function strippedRisks(text: string): string {
  return text
    .replace(
      /no (thin |sharp )?(spikes?|lace|hairlines?|filigree)( or (spikes?|lace|hairlines?|filigree))?/gi,
      ' ',
    )
    .replace(/without (thin |sharp )?(spikes?|lace|hairlines?)/gi, ' ')
    .replace(/無尖刺|不要尖刺|沒有尖刺|不要蕾絲|無蕾絲/g, ' ')
}

export function scorePrompt(raw: string): PromptRuleResult[] {
  const text = raw.trim()
  const has = (pattern: RegExp) => pattern.test(text)
  const risk = /spikes?|lace|filigree|hairline|delicate|thin wings?|蕾絲|尖刺/i.test(strippedRisks(text))
  const chunky = has(/chunky|thick walls|\bthick\b|\bsolid\b|實心|厚實/)
  return [
    {
      id: 'symmetry',
      label: 'Symmetry',
      zh: '對稱',
      ok: has(/symmetr|對稱|左右對稱|balanced left and right/),
      hint: 'Say the left and right match.',
      fix: 'symmetrical 對稱',
    },
    {
      id: 'base',
      label: 'Flat base',
      zh: '平底',
      ok: has(/flat base|flat bottom|平底|sits flat|flat on the bed/),
      hint: 'Ask for a flat face on the bottom.',
      fix: 'with a flat base 平底',
    },
    {
      id: 'solid',
      label: 'Solid',
      zh: '實心',
      ok: has(/\bsolid\b|chunky|thick walls|實心|not hollow/),
      hint: 'Ask for a solid, chunky body.',
      fix: 'solid and chunky 實心',
    },
    {
      id: 'spikes',
      label: 'No thin spikes',
      zh: '無尖刺',
      ok: text.length > 0 && !risk && (chunky || has(/no thin spikes|無尖刺|without spikes/)),
      hint: 'Ban spikes, lace, and hairline wings. Ask for thick parts.',
      fix: 'with no thin spikes or lace 無尖刺',
    },
    {
      id: 'silhouette',
      label: 'Simple silhouette',
      zh: '簡潔輪廓',
      ok: has(/simple silhouette|simple shape|簡潔|low[- ]?poly|blocky|one piece/) || (has(/\bsimple\b/) && !risk),
      hint: 'Ask for one simple outline, not a pile of tiny parts.',
      fix: 'with a simple silhouette 簡潔輪廓',
    },
  ]
}

export function promptPoints(rules: PromptRuleResult[]): number {
  return rules.filter((rule) => rule.ok).length
}

export function suggestPrompt(raw: string, rules: PromptRuleResult[]): string {
  const core = softenPrompt(raw)
  const fixes = rules.filter((rule) => !rule.ok).map((rule) => rule.fix)
  if (fixes.length === 0) return core
  return `${core}. Make it ${fixes.join(', ')}.`
}

export const PROMPT_EXAMPLES: { id: string; label: string; text: string }[] = [
  {
    id: 'weak',
    label: 'Weak prompt 弱',
    text: 'a cool dragon with thin wings, lace, and sharp spikes',
  },
  {
    id: 'strong',
    label: 'Strong prompt 強',
    text: 'a symmetrical chunky cat, solid body, flat base, simple silhouette, no thin spikes',
  },
]

export type MeshId = 'dragon' | 'vase' | 'cat' | 'block'
export type EvalKey = 'base' | 'solid' | 'spikes' | 'simple'

export type AiMesh = {
  id: MeshId
  title: string
  zh: string
  kind: 'bad' | 'good'
  source: string
  blurb: string
  truth: Record<EvalKey, boolean>
  issues: Array<'spikes' | 'lace' | 'base' | 'thin'>
}

export const AI_MESHES: AiMesh[] = [
  {
    id: 'dragon',
    title: 'Spiky dragon',
    zh: '尖刺龍',
    kind: 'bad',
    source: 'Text-to-3D example',
    blurb: 'Horns, thin wings, and a belly that does not sit flat.',
    truth: { base: false, solid: false, spikes: false, simple: false },
    issues: ['spikes', 'base', 'thin'],
  },
  {
    id: 'vase',
    title: 'Lace vase',
    zh: '蕾絲花瓶',
    kind: 'bad',
    source: 'Image-to-3D example',
    blurb: 'Open lace, paper-thin walls, and a pointed foot.',
    truth: { base: false, solid: false, spikes: false, simple: false },
    issues: ['lace', 'base', 'thin'],
  },
  {
    id: 'cat',
    title: 'Chunky cat',
    zh: '實心貓',
    kind: 'good',
    source: 'Text-to-3D example',
    blurb: 'Thick body, flat feet, one simple outline.',
    truth: { base: true, solid: true, spikes: true, simple: true },
    issues: [],
  },
  {
    id: 'block',
    title: 'Block mascot',
    zh: '方塊吉祥物',
    kind: 'good',
    source: 'Text-to-3D example',
    blurb: 'A block on a pad. Easy to cut, hollow, and name.',
    truth: { base: true, solid: true, spikes: true, simple: true },
    issues: [],
  },
]

export function meshById(id: MeshId): AiMesh {
  return AI_MESHES.find((mesh) => mesh.id === id) ?? AI_MESHES[0]
}

export const EVAL_QUESTIONS: { id: EvalKey; prompt: string }[] = [
  { id: 'base', prompt: 'Does it have a flat base? 有平底嗎？' },
  { id: 'solid', prompt: 'Are the walls chunky and solid? 夠實心嗎？' },
  { id: 'spikes', prompt: 'Is it free of thin spikes or lace? 沒有尖刺或蕾絲？' },
  { id: 'simple', prompt: 'Is the silhouette simple? 輪廓簡潔嗎？' },
]

export const AI_STEPS = [
  { id: 'prompt', label: 'Prompt', zh: '提示' },
  { id: 'generate', label: 'Generate', zh: '生成' },
  { id: 'evaluate', label: 'Evaluate', zh: '評估' },
  { id: 'import', label: 'Import', zh: '匯入' },
  { id: 'edit', label: 'Edit', zh: '修改' },
  { id: 'print', label: 'Print', zh: '列印' },
  { id: 'delightex', label: 'Delightex', zh: '匯出' },
] as const

export type AiStepId = (typeof AI_STEPS)[number]['id']

export type EditKey = 'hole' | 'hollow' | 'pad' | 'thicken'

export const EDIT_ACTIONS: { id: EditKey; title: string; zh: string; detail: string }[] = [
  {
    id: 'hole',
    title: 'Cut a hole',
    zh: '挖孔',
    detail: 'Drop a hole box or cylinder through the solid, then group them.',
  },
  {
    id: 'hollow',
    title: 'Hollow with wall thickness',
    zh: '抽殼留壁',
    detail: 'Tinkercad has no one-click shell. Cut a smaller cavity and leave walls ≥ 3 mm.',
  },
  {
    id: 'pad',
    title: 'Add a flat pad',
    zh: '加平底',
    detail: 'Group a box under the mesh so one face is flat on the bed.',
  },
  {
    id: 'thicken',
    title: 'Thicken thin parts',
    zh: '加厚細位',
    detail: 'Cover spikes and lace with a chunky solid. Hairline details will not print.',
  },
]

export function editChecks(mesh: AiMesh, edits: Record<EditKey, boolean>): PrintCheck[] {
  const needPad = mesh.issues.includes('base')
  const needThicken = mesh.issues.includes('thin') || mesh.issues.includes('spikes')
  const needHollow = mesh.issues.includes('lace')
  return [
    {
      id: 'pad',
      state: !needPad || edits.pad ? 'ok' : 'fail',
      title: 'Flat pad 平底',
      detail: needPad
        ? edits.pad
          ? 'You planned a pad. Group a box onto the bottom in Tinkercad.'
          : 'This mesh does not sit flat. Turn on “add a flat pad”.'
        : 'The example already has a flat face. Add a pad only if the real file rocks.',
    },
    {
      id: 'thicken',
      state: !needThicken || edits.thicken ? 'ok' : 'fail',
      title: 'Thicken thin parts 加厚',
      detail: needThicken
        ? edits.thicken
          ? 'You planned to bury spikes and thin walls in solid plastic.'
          : 'Spikes or thin walls are still in the plan. Turn on thicken.'
        : 'Walls already look chunky. Thicken only if you spot a hairline on the real mesh.',
    },
    {
      id: 'hollow',
      state: !needHollow || edits.hollow ? 'ok' : 'fail',
      title: 'Hollow with walls 抽殼',
      detail: needHollow
        ? edits.hollow
          ? 'Replace the lace with a cavity that keeps ≥ 3 mm walls.'
          : 'Lace is not a shell. Plan a cavity with real wall thickness.'
        : 'No lace on this example. Hollow only if you want to save plastic.',
    },
    {
      id: 'hole',
      state: 'ok',
      title: 'Cut a hole 挖孔',
      detail: edits.hole
        ? 'Optional hole is in the plan. Keep it ≥ 3 mm.'
        : 'Optional. Skip it if the gadget does not need an opening.',
    },
  ]
}

export type SizePreset = { id: string; label: string; zh: string; w: number; d: number; h: number }

export const SIZE_PRESETS: SizePreset[] = [
  { id: 'cat', label: 'Chunky cat', zh: '剛好', w: 90, d: 70, h: 80 },
  { id: 'dragon', label: 'Huge dragon', zh: '太大', w: 480, d: 260, h: 390 },
  { id: 'metres', label: 'Metres as mm', zh: '單位錯', w: 0.09, d: 0.07, h: 0.08 },
]

export type ImportAdvice = {
  longest: number
  scalePercent: number | null
  lines: { level: CheckState; text: string }[]
}

export function adviseImport(w: number, d: number, h: number): ImportAdvice {
  if (![w, d, h].every((n) => Number.isFinite(n) && n > 0)) {
    return {
      longest: 0,
      scalePercent: null,
      lines: [{ level: 'fail', text: 'Enter width, depth, and height in millimetres. Each side must be greater than 0.' }],
    }
  }
  const longest = Math.max(w, d, h)
  const lines: ImportAdvice['lines'] = []
  let scalePercent: number | null = null

  if (longest < 5) {
    lines.push({
      level: 'warn',
      text: `Longest side ${formatMm(longest)} mm is smaller than a nozzle line. If the file was metres, multiply by 1000 and type ${formatMm(w * 1000)} × ${formatMm(d * 1000)} × ${formatMm(h * 1000)} mm. Do not guess a huge percent.`,
    })
  } else if (longest > TINKERCAD_COMFORT_MM) {
    scalePercent = Math.max(1, Math.floor((TINKERCAD_COMFORT_MM / longest) * 100))
    const factor = scalePercent / 100
    const scaledLong = longest * factor
    lines.push({
      level: longest > TINKERCAD_GRID_MAX_MM ? 'fail' : 'warn',
      text:
        longest > TINKERCAD_GRID_MAX_MM
          ? `Longest side ${formatMm(longest)} mm is past Tinkercad’s ${TINKERCAD_GRID_MAX_MM} mm grid. Import at ${scalePercent}% (about ${formatMm(scaledLong)} mm) or it will not fit the workspace.`
          : `Longest side ${formatMm(longest)} mm is past the usual ${TINKERCAD_COMFORT_MM} mm Tinkercad grid. Import at ${scalePercent}% so the long side is about ${formatMm(scaledLong)} mm and stays easy to edit.`,
    })
    const sw = w * factor
    const sd = d * factor
    const sh = h * factor
    const fitsBed = sw <= H2D_SINGLE.w && sd <= H2D_SINGLE.d && sh <= H2D_SINGLE.h
    const rawBed = w <= H2D_SINGLE.w && d <= H2D_SINGLE.d && h <= H2D_SINGLE.h
    if (!rawBed && fitsBed) {
      lines.push({
        level: 'ok',
        text: `After ${scalePercent}% it also fits the H2D single-nozzle bed (${H2D_SINGLE.w} × ${H2D_SINGLE.d} × ${H2D_SINGLE.h} mm).`,
      })
    }
  } else {
    lines.push({
      level: 'ok',
      text: `Longest side ${formatMm(longest)} mm sits inside the ${TINKERCAD_COMFORT_MM} mm comfort zone. On the import dialog, choose millimetres.`,
    })
  }

  const rawBed = w <= H2D_SINGLE.w && d <= H2D_SINGLE.d && h <= H2D_SINGLE.h
  if (longest >= 5 && !rawBed) {
    lines.push({
      level: 'warn',
      text: `At 100% this box does not fit the H2D single-nozzle bed (${H2D_SINGLE.w} × ${H2D_SINGLE.d} × ${H2D_SINGLE.h} mm). Scale first, then check again.`,
    })
  } else if (longest >= 5 && longest <= TINKERCAD_COMFORT_MM) {
    lines.push({
      level: 'ok',
      text: `It also fits the H2D bed. Still put one object on the plate for the first print.`,
    })
  }

  return { longest, scalePercent, lines }
}

export function nameLooksReady(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length >= 2 && !/[\\/:*?"<>|]/.test(trimmed)
}
