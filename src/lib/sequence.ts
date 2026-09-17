/** Sequence 數列 labs: Q1–Q4 pattern growth, recurrences, and closed forms. */

export type QuestionId = 1 | 2 | 3 | 4

export type DotRole = 'solid' | 'corner' | 'extra' | 'ghost'

export type SeqDot = {
  x: number
  y: number
  role: DotRole
  isNew: boolean
}

export type DotOptions = {
  showInterior?: boolean
  showMissing?: boolean
}

export type McqOption = {
  letter: 'A' | 'B' | 'C' | 'D'
  value: number
}

export type ReasonStep = {
  title: string
  body: string
}

export type SequenceQuestion = {
  id: QuestionId
  index: string
  title: string
  bilingual: string
  prompt: string
  tip: string
  geometry: string
  t1: number
  askedN: number
  maxN: number
  incrementKind: 'constant' | 'linear'
  incrementTex: string
  closedForm: string
  closedFormNote: string
  options: McqOption[]
  correctValue: number
  traps: string
  reasoning: ReasonStep[]
  afterAnswer: string
}

function keyOf(x: number, y: number): string {
  return `${x},${y}`
}

function markNew(dots: SeqDot[], prevKeys: Set<string>, n: number): SeqDot[] {
  if (n <= 1) return dots.map((d) => ({ ...d, isNew: false }))
  return dots.map((d) => {
    if (d.role === 'ghost') return { ...d, isNew: false }
    return { ...d, isNew: !prevKeys.has(keyOf(d.x, d.y)) }
  })
}

function solidKeys(dots: SeqDot[]): Set<string> {
  return new Set(dots.filter((d) => d.role !== 'ghost').map((d) => keyOf(d.x, d.y)))
}

export function countDrawn(dots: SeqDot[]): number {
  return dots.filter((d) => d.role !== 'ghost').length
}

/** T_n closed forms, verified against the recurrences. */
export function termValue(id: QuestionId, n: number): number {
  switch (id) {
    case 1:
      return 4 * n
    case 2:
      return 3 * n + 1
    case 3:
      return n * n + 2 * n
    case 4:
      return (n + 2) * (n + 2) + 1
    default: {
      const _never: never = id
      return _never
    }
  }
}

/** Dots added when forming pattern n+1 from pattern n. */
export function incrementFrom(id: QuestionId, n: number): number {
  switch (id) {
    case 1:
      return 4
    case 2:
      return 3
    case 3:
      return 2 * n + 3
    case 4:
      return 2 * n + 5
    default: {
      const _never: never = id
      return _never
    }
  }
}

function iterateTerm(id: QuestionId, n: number): number {
  let t = QUESTIONS.find((q) => q.id === id)!.t1
  for (let k = 1; k < n; k += 1) t += incrementFrom(id, k)
  return t
}

/**
 * Q1 — hollow (n+1)×(n+1) frame. Count = 4n.
 * Top-left aligned so the square grows down and right, matching the exam frames.
 */
export function dotsQ1(n: number, opts: DotOptions = {}): SeqDot[] {
  const k = n + 1
  const dots: SeqDot[] = []
  for (let r = 0; r < k; r += 1) {
    for (let c = 0; c < k; c += 1) {
      const border = r === 0 || r === k - 1 || c === 0 || c === k - 1
      if (border) {
        const corner =
          (r === 0 || r === k - 1) && (c === 0 || c === k - 1)
        dots.push({ x: c, y: r, role: corner ? 'corner' : 'solid', isNew: false })
      } else if (opts.showInterior) {
        dots.push({ x: c, y: r, role: 'ghost', isNew: false })
      }
    }
  }
  // Frames are concentric in count only — do not paint a false “new U”.
  return dots.map((d) => ({ ...d, isNew: false }))
}

/**
 * Q2 — 2×2 corner, then each step wraps an L of 3 dots around the outer corner.
 * Count = 3n + 1.
 */
export function dotsQ2(n: number): SeqDot[] {
  const seen = new Set<string>()
  const raw: SeqDot[] = []
  const add = (x: number, y: number) => {
    const k = keyOf(x, y)
    if (seen.has(k)) return
    seen.add(k)
    raw.push({ x, y, role: 'solid', isNew: false })
  }
  add(0, 0)
  add(1, 0)
  add(0, 1)
  add(1, 1)
  for (let k = 1; k < n; k += 1) {
    add(k + 1, k)
    add(k + 1, k + 1)
    add(k, k + 1)
  }
  const prev = n <= 1 ? new Set<string>() : solidKeys(dotsQ2(n - 1))
  return markNew(raw, prev, n)
}

/**
 * Q3 — (n+1)×(n+1) square missing the bottom-right cell. Count = (n+1)² − 1 = n(n+2).
 */
export function dotsQ3(n: number, opts: DotOptions = {}): SeqDot[] {
  const k = n + 1
  const dots: SeqDot[] = []
  for (let r = 0; r < k; r += 1) {
    for (let c = 0; c < k; c += 1) {
      const missing = r === k - 1 && c === k - 1
      if (missing) {
        if (opts.showMissing) dots.push({ x: c, y: r, role: 'ghost', isNew: false })
      } else {
        dots.push({ x: c, y: r, role: 'solid', isNew: false })
      }
    }
  }
  const prev = n <= 1 ? new Set<string>() : solidKeys(dotsQ3(n - 1))
  return markNew(dots, prev, n)
}

/**
 * Q4 — (n+2)×(n+2) square plus one extra dot under the bottom-left.
 * Count = (n+2)² + 1.
 */
export function dotsQ4(n: number): SeqDot[] {
  const k = n + 2
  const dots: SeqDot[] = []
  for (let r = 0; r < k; r += 1) {
    for (let c = 0; c < k; c += 1) {
      dots.push({ x: c, y: r, role: 'solid', isNew: false })
    }
  }
  dots.push({ x: 0, y: k, role: 'extra', isNew: false })
  const prev = n <= 1 ? new Set<string>() : solidKeys(dotsQ4(n - 1))
  return markNew(dots, prev, n)
}

export function dotsFor(id: QuestionId, n: number, opts: DotOptions = {}): SeqDot[] {
  switch (id) {
    case 1:
      return dotsQ1(n, opts)
    case 2:
      return dotsQ2(n)
    case 3:
      return dotsQ3(n, opts)
    case 4:
      return dotsQ4(n)
    default: {
      const _never: never = id
      return _never
    }
  }
}

export const QUESTIONS: SequenceQuestion[] = [
  {
    id: 1,
    index: 'Q1 · +4 each step',
    title: 'Hollow square frames',
    bilingual: '數列 · 正方形邊框',
    prompt:
      'The 1st pattern has 4 dots. For any positive integer n, the (n+1)th pattern is formed by adding 4 dots to the nth pattern. Find the number of dots in the 9th pattern.',
    tip: 'Constant +4 is arithmetic 等差. Count the border only — a filled 9×9 or 10×10 is a trap.',
    geometry: 'Pattern n is the border of an (n+1)×(n+1) square: 4 corners and n−1 extra dots on each side.',
    t1: 4,
    askedN: 9,
    maxN: 12,
    incrementKind: 'constant',
    incrementTex: '4',
    closedForm: 'Tₙ = 4n',
    closedFormNote: 'Tₙ = T₁ + (n−1)×4 = 4 + 4(n−1) = 4n. Also 4(n+1 − 1) for an (n+1) frame.',
    options: [
      { letter: 'A', value: 36 },
      { letter: 'B', value: 40 },
      { letter: 'C', value: 81 },
      { letter: 'D', value: 100 },
    ],
    correctValue: 36,
    traps: '81 = 9×9 filled; 100 = 10×10 filled; 40 = 4×10 (using n+1 by mistake).',
    reasoning: [
      {
        title: 'Recurrence 遞推',
        body: 'T₁ = 4 and Tₙ₊₁ = Tₙ + 4 for every positive integer n. The extra each step is constant.',
      },
      {
        title: 'Arithmetic sequence 等差數列',
        body: 'Common difference d = 4, so Tₙ = T₁ + (n−1)d = 4 + 4(n−1) = 4n.',
      },
      {
        title: 'Geometry',
        body: 'The figure is a hollow (n+1)×(n+1) frame, not a filled square. Border = 4n. Interior dots are not drawn.',
      },
    ],
    afterAnswer:
      'T₉ = 4×9 = 36. A 9×9 filled square is 81; a 10×10 filled square is 100 — those count interior dots the figure never has.',
  },
  {
    id: 2,
    index: 'Q2 · +3 each step',
    title: 'Growing L / corner',
    bilingual: '數列 · L 形增長',
    prompt:
      'The 1st pattern has 4 dots. For any positive integer n, the (n+1)th pattern is formed by adding 3 dots to the nth pattern. Find the number of dots in the 8th pattern.',
    tip: 'Still arithmetic, but d = 3. From T₁ to T₈ there are 7 additions, not 8.',
    geometry:
      'Start with a 2×2 block. Each step wraps an L of 3 dots around the outer corner, so earlier dots stay in place.',
    t1: 4,
    askedN: 8,
    maxN: 12,
    incrementKind: 'constant',
    incrementTex: '3',
    closedForm: 'Tₙ = 3n + 1',
    closedFormNote: 'Tₙ = 4 + 3(n−1) = 3n + 1.',
    options: [
      { letter: 'A', value: 22 },
      { letter: 'B', value: 25 },
      { letter: 'C', value: 28 },
      { letter: 'D', value: 31 },
    ],
    correctValue: 25,
    traps: '28 = 4 + 3×8 (eight steps instead of seven); 22 and 31 are one step off 3n+1.',
    reasoning: [
      {
        title: 'Recurrence 遞推',
        body: 'T₁ = 4 and Tₙ₊₁ = Tₙ + 3. Constant difference ⇒ arithmetic with d = 3.',
      },
      {
        title: 'General term',
        body: 'Tₙ = 4 + 3(n−1) = 3n + 1. The 8th term uses n = 8, so seven additions of 3 after T₁.',
      },
      {
        title: 'Geometry',
        body: 'The 2×2 corner remains. Each new L-tromino of 3 dots wraps the south-east corner of the previous figure.',
      },
    ],
    afterAnswer:
      'T₈ = 3×8 + 1 = 25. A common slip is 4 + 3×8 = 28, which would be the 9th pattern (eight additions).',
  },
  {
    id: 3,
    index: 'Q3 · add (2n+3)',
    title: 'Square minus a corner',
    bilingual: '數列 · 缺一角正方形',
    prompt:
      'The 1st pattern has 3 dots. For any positive integer n, the (n+1)th pattern is formed by adding (2n+3) dots to the nth pattern. Find the number of dots in the 6th pattern.',
    tip: 'The extra is not constant — plug the current n into 2n+3 each time. Sum the extras, or see (n+1)² − 1.',
    geometry:
      'Pattern n is an (n+1)×(n+1) square with one corner cell missing: 3, 8, 15, 24, …',
    t1: 3,
    askedN: 6,
    maxN: 10,
    incrementKind: 'linear',
    incrementTex: '(2n + 3)',
    closedForm: 'Tₙ = n(n + 2)',
    closedFormNote: 'Tₙ = 3 + Σₖ₌₁ⁿ⁻¹ (2k+3) = n² + 2n = n(n+2). Also (n+1)² − 1.',
    options: [
      { letter: 'A', value: 35 },
      { letter: 'B', value: 37 },
      { letter: 'C', value: 48 },
      { letter: 'D', value: 50 },
    ],
    correctValue: 48,
    traps: '35 is T₅; 50 is close to 7²+1; 37 is an off-by-one sum.',
    reasoning: [
      {
        title: 'Recurrence 遞推',
        body: 'T₁ = 3, Tₙ₊₁ = Tₙ + (2n+3). The amount added depends on n, so this is not arithmetic with a fixed d.',
      },
      {
        title: 'Unroll the sum',
        body: 'Tₙ = 3 + (2·1+3) + (2·2+3) + … + (2(n−1)+3) = 3 + Σ(2k+3) for k = 1 to n−1 = 3 + n(n−1) + 3(n−1) = n² + 2n = n(n+2).',
      },
      {
        title: 'Geometry',
        body: 'An (n+1)×(n+1) grid missing one corner has (n+1)² − 1 = n² + 2n dots. Going to the next size adds a new row and column, net 2n+3 after the missing corner moves out.',
      },
    ],
    afterAnswer:
      'T₆ = 6×8 = 48, or 7² − 1 = 48. T₅ = 35 is the previous term; do not stop one step early.',
  },
  {
    id: 4,
    index: 'Q4 · add (2n+5)',
    title: 'Square plus a tail',
    bilingual: '數列 · 正方形加一點',
    prompt:
      'The 1st pattern has 10 dots. For any positive integer n, the (n+1)th pattern is formed by adding (2n+5) dots to the nth pattern. Find the number of dots in the 7th pattern.',
    tip: 'Same idea as Q3: the extra grows. Picture an (n+2)×(n+2) square plus the one hanging dot — do not forget that extra 1.',
    geometry:
      'Pattern n is an (n+2)×(n+2) square with one extra dot under the bottom-left: 10, 17, 26, …',
    t1: 10,
    askedN: 7,
    maxN: 10,
    incrementKind: 'linear',
    incrementTex: '(2n + 5)',
    closedForm: 'Tₙ = (n + 2)² + 1',
    closedFormNote: 'Tₙ = 10 + Σₖ₌₁ⁿ⁻¹ (2k+5) = n² + 4n + 5 = (n+2)² + 1.',
    options: [
      { letter: 'A', value: 50 },
      { letter: 'B', value: 65 },
      { letter: 'C', value: 82 },
      { letter: 'D', value: 101 },
    ],
    correctValue: 82,
    traps: '50 = T₅; 65 = T₆; 101 = 10²+1 (off by one in the side length); 81 would be the square without the tail.',
    reasoning: [
      {
        title: 'Recurrence 遞推',
        body: 'T₁ = 10, Tₙ₊₁ = Tₙ + (2n+5). Again the increment depends on n.',
      },
      {
        title: 'Unroll the sum',
        body: 'Tₙ = 10 + Σₖ₌₁ⁿ⁻¹ (2k+5) = 10 + n(n−1) + 5(n−1) = n² + 4n + 5.',
      },
      {
        title: 'Geometry',
        body: 'An (n+2)×(n+2) square plus one extra dot under the bottom-left is (n+2)² + 1, which matches n² + 4n + 5. The old hanging dot becomes part of the new bottom row; a fresh extra is placed below.',
      },
    ],
    afterAnswer:
      'T₇ = (7+2)² + 1 = 81 + 1 = 82. Forgetting the hanging dot leaves 81, which is not even an option; 101 is a 10×10 square plus the tail.',
  },
]

export function getQuestion(id: QuestionId): SequenceQuestion {
  const found = QUESTIONS.find((q) => q.id === id)
  if (!found) throw new Error(`Unknown sequence question ${id}`)
  return found
}

export function incrementPhrase(id: QuestionId, n: number): string {
  const value = incrementFrom(id, n)
  if (id === 3) return `2(${n})+3 = ${value}`
  if (id === 4) return `2(${n})+5 = ${value}`
  return String(value)
}

export function incrementToReach(id: QuestionId, n: number): number | null {
  if (n <= 1) return null
  return incrementFrom(id, n - 1)
}

if (import.meta.env.DEV) {
  for (const q of QUESTIONS) {
    for (let n = 1; n <= q.maxN; n += 1) {
      const dots = countDrawn(dotsFor(q.id, n))
      const closed = termValue(q.id, n)
      const walked = iterateTerm(q.id, n)
      if (dots !== closed || closed !== walked) {
        console.error(`Sequence Q${q.id} n=${n}: dots=${dots} closed=${closed} walked=${walked}`)
      }
    }
    const asked = termValue(q.id, q.askedN)
    if (asked !== q.correctValue) {
      console.error(`Sequence Q${q.id}: T_${q.askedN}=${asked} but MCQ key is ${q.correctValue}`)
    }
  }
}
