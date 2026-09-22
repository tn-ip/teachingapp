import { simplifyFraction } from './math'

/** Sub-views under `#/probability`. `null` in the router is the hub. */
export type ProbabilityView = 'sample' | 'exclusive' | 'independent'

export const PROBABILITY_LABS: {
  id: ProbabilityView
  label: string
  bilingual: string
  blurb: string
  tip: string
}[] = [
  {
    id: 'sample',
    label: 'Sample space',
    bilingual: '樣本空間',
    blurb: 'Equally likely outcomes. Shade A, then watch the relative frequency approach P(A).',
    tip: 'Count first. P(A) = n(A) / n(S) only when every outcome is equally likely.',
  },
  {
    id: 'exclusive',
    label: 'Mutually exclusive',
    bilingual: '互斥',
    blurb: 'Spinner sectors for A and B. If they cannot happen together, add the probabilities.',
    tip: 'When A ∩ B is empty, P(A ∪ B) = P(A) + P(B). Overlap must be subtracted once.',
  },
  {
    id: 'independent',
    label: 'Independent',
    bilingual: '獨立',
    blurb: 'Two-stage draws. The product rule holds with replacement, and fails without it.',
    tip: 'Independent 獨立 means P(A ∩ B) = P(A) × P(B). Removing a ball changes the next draw.',
  },
]

export type Tally = {
  nS: number
  nA: number
  nB: number
  nAB: number
  nUnion: number
  exclusive: boolean
  /** Integer check: n(A∩B) / n(S) = n(A) n(B) / n(S)². */
  independent: boolean
}

export function tally(flags: { inA: boolean; inB: boolean }[]): Tally {
  const nS = flags.length
  let nA = 0
  let nB = 0
  let nAB = 0
  for (const row of flags) {
    if (row.inA) nA += 1
    if (row.inB) nB += 1
    if (row.inA && row.inB) nAB += 1
  }
  return {
    nS,
    nA,
    nB,
    nAB,
    nUnion: nA + nB - nAB,
    exclusive: nAB === 0,
    independent: nAB * nS === nA * nB,
  }
}

export function tallySets(
  universe: readonly number[],
  inA: readonly number[],
  inB: readonly number[],
): Tally {
  const a = new Set(inA)
  const b = new Set(inB)
  return tally(universe.map((id) => ({ inA: a.has(id), inB: b.has(id) })))
}

/** Counting fraction, then the simplified value when it differs. Zero stays over n(S). */
export function countFracTex(num: number, den: number): string {
  if (den <= 0) return '\\text{—}'
  if (num === 0) return `\\dfrac{0}{${den}} = 0`
  const s = simplifyFraction(num, den)
  const left = `\\dfrac{${num}}{${den}}`
  if (s.num === num && s.den === den) return left
  if (s.den === 1) return `${left} = ${s.num}`
  return `${left} = \\dfrac{${s.num}}{${s.den}}`
}

export function simplifiedFracTex(num: number, den: number): string {
  if (den <= 0) return '\\text{—}'
  if (num === 0) return '0'
  const s = simplifyFraction(num, den)
  if (s.den === 1) return `${s.num}`
  return `\\dfrac{${s.num}}{${s.den}}`
}

export function rawFracTex(num: number, den: number): string {
  if (den <= 0) return '\\text{—}'
  return `\\dfrac{${num}}{${den}}`
}

/** Plain-text fraction for the live banner. */
export function formatFrac(num: number, den: number): string {
  if (den <= 0) return '—'
  if (num === 0) return `0/${den} = 0`
  const s = simplifyFraction(num, den)
  if (s.num === num && s.den === den) return `${num}/${den}`
  if (s.den === 1) return `${num}/${den} = ${s.num}`
  return `${num}/${den} = ${s.num}/${s.den}`
}

export function additionLines(stats: Tally): string[] {
  if (stats.nAB === 0) {
    const sum = stats.nA + stats.nB
    return [
      'P(A\\cup B) = P(A)+P(B)',
      `= ${rawFracTex(stats.nA, stats.nS)}+${rawFracTex(stats.nB, stats.nS)}`,
      `= ${countFracTex(sum, stats.nS)}`,
    ]
  }
  return [
    'P(A\\cup B) = P(A)+P(B)-P(A\\cap B)',
    `= ${rawFracTex(stats.nA, stats.nS)}+${rawFracTex(stats.nB, stats.nS)}-${rawFracTex(stats.nAB, stats.nS)}`,
    `= ${countFracTex(stats.nUnion, stats.nS)}`,
  ]
}

export function naiveSumTex(stats: Tally): string {
  const sum = stats.nA + stats.nB
  return `P(A)+P(B) = ${rawFracTex(stats.nA, stats.nS)}+${rawFracTex(stats.nB, stats.nS)} = ${countFracTex(sum, stats.nS)}`
}

export function doubleCountTex(stats: Tally): string {
  return `P(A)+P(B)-P(A\\cup B) = P(A\\cap B) = ${countFracTex(stats.nAB, stats.nS)}`
}

export const SPINNER_FACES = [1, 2, 3, 4, 5, 6, 7, 8] as const

export type ExclusivePreset = {
  id: string
  title: string
  bilingual: string
  allowOverlap: boolean
  a: number[]
  b: number[]
  aName: string
  bName: string
  hint: string
}

export const EXCLUSIVE_PRESETS: ExclusivePreset[] = [
  {
    id: 'parity',
    title: 'Even / odd',
    bilingual: '偶 / 奇',
    allowOverlap: false,
    a: [2, 4, 6, 8],
    b: [1, 3, 5, 7],
    aName: 'even 偶數',
    bName: 'odd 奇數',
    hint: 'A face cannot be both even and odd.',
  },
  {
    id: 'ends',
    title: 'Low / high',
    bilingual: '小 / 大',
    allowOverlap: false,
    a: [1, 2, 3],
    b: [6, 7, 8],
    aName: 'at most 3',
    bName: 'at least 6',
    hint: 'At most 3 and at least 6 never meet.',
  },
  {
    id: 'even-high',
    title: 'Even / high',
    bilingual: '偶 / 大',
    allowOverlap: true,
    a: [2, 4, 6, 8],
    b: [5, 6, 7, 8],
    aName: 'even 偶數',
    bName: 'greater than 4',
    hint: '6 and 8 are even and greater than 4.',
  },
  {
    id: 'multiples',
    title: '×2 / ×3',
    bilingual: '倍數',
    allowOverlap: true,
    a: [2, 4, 6, 8],
    b: [3, 6],
    aName: 'multiple of 2',
    bName: 'multiple of 3',
    hint: '6 is a multiple of both 2 and 3.',
  },
  {
    id: 'same',
    title: 'Same set',
    bilingual: '同一集合',
    allowOverlap: true,
    a: [1, 2, 3, 4],
    b: [1, 2, 3, 4],
    aName: 'faces 1 to 4',
    bName: 'faces 1 to 4',
    hint: 'A and B are the same faces, so the whole of A sits inside B.',
  },
]

export function sameNumbers(xs: readonly number[], ys: readonly number[]): boolean {
  if (xs.length !== ys.length) return false
  const a = [...xs].sort((p, q) => p - q)
  const b = [...ys].sort((p, q) => p - q)
  return a.every((value, index) => value === b[index])
}

export function presetForSets(inA: readonly number[], inB: readonly number[]): ExclusivePreset | null {
  return (
    EXCLUSIVE_PRESETS.find((preset) => sameNumbers(preset.a, inA) && sameNumbers(preset.b, inB)) ??
    null
  )
}

export function intersectIds(inA: readonly number[], inB: readonly number[]): number[] {
  const b = new Set(inB)
  return inA.filter((id) => b.has(id)).sort((p, q) => p - q)
}

export function unionIds(inA: readonly number[], inB: readonly number[]): number[] {
  return [...new Set([...inA, ...inB])].sort((p, q) => p - q)
}

export function toggleSector(
  inA: readonly number[],
  inB: readonly number[],
  id: number,
  brush: 'A' | 'B',
  allowOverlap: boolean,
): { inA: number[]; inB: number[]; moved: boolean } {
  const a = new Set(inA)
  const b = new Set(inB)
  let moved = false
  if (brush === 'A') {
    if (a.has(id)) a.delete(id)
    else {
      a.add(id)
      if (!allowOverlap && b.delete(id)) moved = true
    }
  } else if (b.has(id)) b.delete(id)
  else {
    b.add(id)
    if (!allowOverlap && a.delete(id)) moved = true
  }
  const sort = (values: Set<number>) => [...values].sort((p, q) => p - q)
  return { inA: sort(a), inB: sort(b), moved }
}

export function dropOverlapFromB(inA: readonly number[], inB: readonly number[]): number[] {
  const a = new Set(inA)
  return inB.filter((id) => !a.has(id))
}

export type ProbItem = {
  id: string
  label: string
  group: string
}

export type GridCell = {
  id: string
  first: ProbItem
  second: ProbItem
  possible: boolean
  inA: boolean
  inB: boolean
}

export type TreeKind = 'both' | 'a' | 'b' | 'neither'

export type TreeLeaf = {
  id: string
  label: string
  num: number
  den: number
  kind: TreeKind
}

export type TreeArm = {
  id: string
  label: string
  num: number
  den: number
  leaves: TreeLeaf[]
}

export type ExperimentId = 'bag' | 'coin-die'
export type Replacement = 'with' | 'without'

export type ExperimentModel = {
  id: ExperimentId
  replacement: Replacement
  supportsReplacement: boolean
  title: string
  firstLabel: string
  secondLabel: string
  aName: string
  bName: string
  columns: ProbItem[]
  rows: { item: ProbItem; cells: GridCell[] }[]
  stats: Tally
  tree: TreeArm[]
  stageSame: boolean
  pathTex: string
}

const BALLS: ProbItem[] = [
  { id: 'R1', label: 'R1', group: 'red' },
  { id: 'R2', label: 'R2', group: 'red' },
  { id: 'B1', label: 'B1', group: 'blue' },
  { id: 'B2', label: 'B2', group: 'blue' },
]

const COINS: ProbItem[] = [
  { id: 'H', label: 'H', group: 'heads' },
  { id: 'T', label: 'T', group: 'tails' },
]

const FACES: ProbItem[] = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: String(n),
  label: String(n),
  group: n % 2 === 0 ? 'even' : 'odd',
}))

function stageSame(tree: TreeArm[]): boolean {
  if (tree.length < 2) return true
  const signature = (arm: TreeArm) => arm.leaves.map((leaf) => `${leaf.num}/${leaf.den}`).join(',')
  return tree.every((arm) => signature(arm) === signature(tree[0]))
}

function productPathTex(n1: number, d1: number, n2: number, d2: number): string {
  return `\\dfrac{${n1}}{${d1}}\\times\\dfrac{${n2}}{${d2}} = ${countFracTex(n1 * n2, d1 * d2)}`
}

function bagModel(replacement: Replacement): ExperimentModel {
  const red = BALLS.filter((ball) => ball.group === 'red').length
  const blue = BALLS.filter((ball) => ball.group === 'blue').length
  const total = BALLS.length
  const withReplacement = replacement === 'with'
  const rows = BALLS.map((first) => ({
    item: first,
    cells: BALLS.map((second) => {
      const possible = withReplacement || first.id !== second.id
      return {
        id: `${first.id}>${second.id}`,
        first,
        second,
        possible,
        inA: possible && first.group === 'red',
        inB: possible && second.group === 'red',
      }
    }),
  }))
  const cells = rows.flatMap((row) => row.cells.filter((cell) => cell.possible))
  const secondDen = withReplacement ? total : total - 1
  const leaf = (
    firstGroup: 'red' | 'blue',
    secondGroup: 'red' | 'blue',
    label: string,
  ): TreeLeaf => {
    const removed = firstGroup === secondGroup ? 1 : 0
    const available = secondGroup === 'red' ? red : blue
    const num = withReplacement ? available : available - removed
    const firstIsA = firstGroup === 'red'
    const secondIsB = secondGroup === 'red'
    const kind: TreeKind =
      firstIsA && secondIsB ? 'both' : firstIsA ? 'a' : secondIsB ? 'b' : 'neither'
    return {
      id: `${firstGroup}-${secondGroup}`,
      label,
      num,
      den: secondDen,
      kind,
    }
  }
  const tree: TreeArm[] = [
    {
      id: 'red',
      label: 'Red 紅',
      num: red,
      den: total,
      leaves: [leaf('red', 'red', 'Red 紅'), leaf('red', 'blue', 'Blue 藍')],
    },
    {
      id: 'blue',
      label: 'Blue 藍',
      num: blue,
      den: total,
      leaves: [leaf('blue', 'red', 'Red 紅'), leaf('blue', 'blue', 'Blue 藍')],
    },
  ]
  const redThenRed = withReplacement ? red : red - 1
  return {
    id: 'bag',
    replacement,
    supportsReplacement: true,
    title: 'Two balls from a bag',
    firstLabel: '1st draw 第一次',
    secondLabel: '2nd draw 第二次',
    aName: '1st ball red 第一次紅色',
    bName: '2nd ball red 第二次紅色',
    columns: BALLS,
    rows,
    stats: tally(cells),
    tree,
    stageSame: stageSame(tree),
    pathTex: productPathTex(red, total, redThenRed, secondDen),
  }
}

function coinModel(): ExperimentModel {
  const rows = COINS.map((first) => ({
    item: first,
    cells: FACES.map((second) => {
      const inA = first.id === 'H'
      const inB = second.group === 'even'
      return {
        id: `${first.id}>${second.id}`,
        first,
        second,
        possible: true,
        inA,
        inB,
      }
    }),
  }))
  const even = FACES.filter((face) => face.group === 'even').length
  const odd = FACES.length - even
  const leaves = (coin: 'H' | 'T'): TreeLeaf[] => [
    {
      id: `${coin}-even`,
      label: 'Even 偶',
      num: even,
      den: FACES.length,
      kind: coin === 'H' ? 'both' : 'b',
    },
    {
      id: `${coin}-odd`,
      label: 'Odd 奇',
      num: odd,
      den: FACES.length,
      kind: coin === 'H' ? 'a' : 'neither',
    },
  ]
  const tree: TreeArm[] = [
    { id: 'H', label: 'Heads 正', num: 1, den: 2, leaves: leaves('H') },
    { id: 'T', label: 'Tails 反', num: 1, den: 2, leaves: leaves('T') },
  ]
  return {
    id: 'coin-die',
    replacement: 'with',
    supportsReplacement: false,
    title: 'Coin, then a die',
    firstLabel: 'Coin 硬幣',
    secondLabel: 'Die 骰子',
    aName: 'heads 正面',
    bName: 'even face 偶數點',
    columns: FACES,
    rows,
    stats: tally(rows.flatMap((row) => row.cells)),
    tree,
    stageSame: stageSame(tree),
    pathTex: productPathTex(1, 2, even, FACES.length),
  }
}

export function experimentModel(id: ExperimentId, replacement: Replacement): ExperimentModel {
  if (id === 'coin-die') return coinModel()
  return bagModel(replacement)
}

export function cellKind(cell: GridCell): 'impossible' | TreeKind {
  if (!cell.possible) return 'impossible'
  if (cell.inA && cell.inB) return 'both'
  if (cell.inA) return 'a'
  if (cell.inB) return 'b'
  return 'neither'
}

export function conditionalTex(stats: Tally): string | null {
  if (stats.nA === 0) return null
  return `P(B\\mid A) = \\dfrac{n(A\\cap B)}{n(A)} = ${countFracTex(stats.nAB, stats.nA)}`
}

export function marginalBTex(stats: Tally): string {
  return `P(B) = ${countFracTex(stats.nB, stats.nS)}`
}

export function productLines(stats: Tally): string[] {
  return [
    `P(A\\cap B) = \\dfrac{n(A\\cap B)}{n(S)} = ${countFracTex(stats.nAB, stats.nS)}`,
    `P(A)\\times P(B) = ${rawFracTex(stats.nA, stats.nS)}\\times ${rawFracTex(stats.nB, stats.nS)} = ${countFracTex(stats.nA * stats.nB, stats.nS * stats.nS)}`,
  ]
}

/** Cross-multiply check that a path product equals a grid probability. */
function sameRatio(n1: number, d1: number, n2: number, d2: number): boolean {
  return n1 * d2 === n2 * d1
}

export function checkProbabilityStories(): string[] {
  const errors: string[] = []
  const expect = (condition: boolean, message: string) => {
    if (!condition) errors.push(message)
  }

  const parity = tallySets(SPINNER_FACES, [2, 4, 6, 8], [1, 3, 5, 7])
  expect(parity.nA === 4 && parity.nB === 4 && parity.nAB === 0 && parity.nUnion === 8, 'even/odd tally')

  const ends = tallySets(SPINNER_FACES, [1, 2, 3], [6, 7, 8])
  expect(ends.nA === 3 && ends.nB === 3 && ends.nAB === 0 && ends.nUnion === 6, 'low/high tally')

  const high = tallySets(SPINNER_FACES, [2, 4, 6, 8], [5, 6, 7, 8])
  expect(high.nA === 4 && high.nB === 4 && high.nAB === 2 && high.nUnion === 6, 'even/high tally')

  const multiples = tallySets(SPINNER_FACES, [2, 4, 6, 8], [3, 6])
  expect(multiples.nAB === 1 && multiples.nUnion === 5, 'multiples tally')

  const same = tallySets(SPINNER_FACES, [1, 2, 3, 4], [1, 2, 3, 4])
  expect(same.nA === 4 && same.nB === 4 && same.nAB === 4 && same.nUnion === 4, 'same-set tally')

  const stolen = toggleSector([2, 4, 6, 8], [5, 6, 7, 8], 5, 'A', false)
  expect(stolen.moved && stolen.inA.includes(5) && !stolen.inB.includes(5), 'exclusive paint removes overlap')

  const shared = toggleSector([2, 4], [5], 6, 'B', true)
  expect(!shared.moved && shared.inA.includes(2) && shared.inB.includes(6), 'overlap paint keeps both')

  const cleared = dropOverlapFromB([2, 4, 6, 8], [5, 6, 7, 8])
  expect(sameNumbers(cleared, [5, 7]), 'dropping overlap keeps only the exclusive part of B')

  const bagWithout = experimentModel('bag', 'without')
  expect(
    bagWithout.stats.nS === 12 &&
      bagWithout.stats.nA === 6 &&
      bagWithout.stats.nB === 6 &&
      bagWithout.stats.nAB === 2 &&
      !bagWithout.stats.independent &&
      !bagWithout.stageSame,
    'bag without replacement',
  )
  expect(bagWithout.rows.flatMap((row) => row.cells).filter((cell) => !cell.possible).length === 4, 'four impossible repeats')

  const bagWith = experimentModel('bag', 'with')
  expect(
    bagWith.stats.nS === 16 &&
      bagWith.stats.nA === 8 &&
      bagWith.stats.nB === 8 &&
      bagWith.stats.nAB === 4 &&
      bagWith.stats.independent &&
      bagWith.stageSame,
    'bag with replacement',
  )
  expect(sameRatio(2 * 1, 4 * 3, bagWithout.stats.nAB, bagWithout.stats.nS), 'without path matches grid')
  expect(sameRatio(2 * 2, 4 * 4, bagWith.stats.nAB, bagWith.stats.nS), 'with path matches grid')

  const coin = experimentModel('coin-die', 'without')
  expect(
    coin.stats.nS === 12 &&
      coin.stats.nA === 6 &&
      coin.stats.nB === 6 &&
      coin.stats.nAB === 3 &&
      coin.stats.independent &&
      coin.stageSame &&
      !coin.supportsReplacement,
    'coin then die',
  )
  expect(sameRatio(1 * 3, 2 * 6, coin.stats.nAB, coin.stats.nS), 'coin path matches grid')

  return errors
}
