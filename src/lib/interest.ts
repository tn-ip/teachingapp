/** HK MC16 J4 Percentage II (Interest) notation and compounding. */

export type InterestMode = 'simple' | 'compound' | 'compare'

export type FrequencyId = 'yearly' | 'half-yearly' | 'quarterly' | 'monthly'

export type Frequency = {
  id: FrequencyId
  m: number
  label: string
  bilingual: string
  periodName: string
  periodNameZh: string
}

export const FREQUENCIES: Frequency[] = [
  { id: 'yearly', m: 1, label: 'Yearly', bilingual: '每年', periodName: 'year', periodNameZh: '年' },
  {
    id: 'half-yearly',
    m: 2,
    label: 'Half-yearly',
    bilingual: '每半年',
    periodName: 'half-year',
    periodNameZh: '半年',
  },
  { id: 'quarterly', m: 4, label: 'Quarterly', bilingual: '每季', periodName: 'quarter', periodNameZh: '季' },
  { id: 'monthly', m: 12, label: 'Monthly', bilingual: '每月', periodName: 'month', periodNameZh: '月' },
]

export const INTEREST_MODES: { id: InterestMode; label: string; bilingual: string }[] = [
  { id: 'simple', label: 'Simple', bilingual: '單利息' },
  { id: 'compound', label: 'Compound', bilingual: '複利息' },
  { id: 'compare', label: 'Compare', bilingual: '比較' },
]

export function frequencyById(id: FrequencyId): Frequency {
  return FREQUENCIES.find((f) => f.id === id) ?? FREQUENCIES[0]
}

export function frequencyByM(m: number): Frequency {
  return FREQUENCIES.find((f) => f.m === m) ?? FREQUENCIES[0]
}

/** Simple interest: I = P × R% × n , A = P(1 + R% × n) */
export function simpleInterest(P: number, R: number, n: number): { I: number; A: number } {
  const I = P * (R / 100) * n
  return { I, A: P + I }
}

/** Compound: A = P(1 + R%/m)^{n×m} , I = A − P */
export function compoundInterest(
  P: number,
  R: number,
  n: number,
  m: number,
): { A: number; I: number; periodRate: number; periods: number } {
  const periodRate = R / 100 / m
  const periods = n * m
  const A = P * (1 + periodRate) ** periods
  return { A, I: A - P, periodRate, periods }
}

export function nearestDollar(x: number): number {
  return Math.round(x)
}

export type YearSnapshot = {
  year: number
  simpleA: number
  simpleI: number
  simpleYearI: number
  compoundA: number
  compoundI: number
  compoundYearI: number
}

export type StepPoint = { t: number; A: number }

export function yearlySnapshots(P: number, R: number, n: number, m: number): YearSnapshot[] {
  const out: YearSnapshot[] = []
  let prevS = P
  let prevC = P
  for (let y = 0; y <= n; y += 1) {
    const simpleA = P * (1 + (R / 100) * y)
    const compoundA = P * (1 + R / 100 / m) ** (y * m)
    out.push({
      year: y,
      simpleA,
      simpleI: simpleA - P,
      simpleYearI: simpleA - prevS,
      compoundA,
      compoundI: compoundA - P,
      compoundYearI: compoundA - prevC,
    })
    prevS = simpleA
    prevC = compoundA
  }
  return out
}

export function compoundPeriodPoints(P: number, R: number, n: number, m: number): StepPoint[] {
  const periods = n * m
  const r = R / 100 / m
  const pts: StepPoint[] = [{ t: 0, A: P }]
  for (let k = 1; k <= periods; k += 1) {
    pts.push({ t: k / m, A: P * (1 + r) ** k })
  }
  return pts
}

export function simplePeriodPoints(P: number, R: number, n: number): StepPoint[] {
  const pts: StepPoint[] = [{ t: 0, A: P }]
  for (let y = 1; y <= n; y += 1) {
    pts.push({ t: y, A: P * (1 + (R / 100) * y) })
  }
  return pts
}

export function clipSteps(points: StepPoint[], tMax: number): StepPoint[] {
  if (points.length === 0) return []
  const kept = points.filter((p) => p.t <= tMax + 1e-9)
  if (kept.length === 0) return [points[0]]
  const last = kept[kept.length - 1]
  if (last.t < tMax - 1e-9) {
    kept.push({ t: tMax, A: last.A })
  }
  return kept
}

export function niceMax(value: number): number {
  if (value <= 0) return 1
  const exp = 10 ** Math.floor(Math.log10(value))
  const f = value / exp
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nf * exp
}

export function yTicks(max: number, count = 4): number[] {
  const step = max / count
  return Array.from({ length: count + 1 }, (_, i) => step * i)
}

/** Exam-paper thousands: $10 000 */
export function hkDollars(n: number): string {
  const rounded = nearestDollar(n)
  const sign = rounded < 0 ? '−' : ''
  const body = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${sign}$${body}`
}

export function formatMoney(n: number, digits = 2): string {
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('en-HK', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  return `${n < 0 ? '−' : ''}$${formatted}`
}

export function formatPct(R: number): string {
  return `${R}%`
}

export function superscript(n: number): string {
  const map = '⁰¹²³⁴⁵⁶⁷⁸⁹'
  return String(n).replace(/\d/g, (d) => map[Number(d)])
}

export type PracticeOption = { letter: string; label: string }

export type PracticeQuestion = {
  id: string
  prompt: string
  bilingual: string
  options: PracticeOption[]
  correct: string
  explain: string
  lab: {
    P: number
    R: number
    n: number
    m: number
    mode: InterestMode
  }
}

export const PRACTICE: PracticeQuestion[] = [
  {
    id: 'monthly-formula',
    prompt:
      'What will $P amount to in 3 years’ time, if interest is compounded monthly at 12% per annum?',
    bilingual: '每月複利 · 代入公式',
    options: [
      { letter: 'A', label: `P(1 + 1%)` },
      { letter: 'B', label: `P(1 + 1%)${superscript(36)}` },
      { letter: 'C', label: `P(1 + 12%)${superscript(36)}` },
      { letter: 'D', label: `P(1 + 12%)${superscript(3)}` },
      { letter: 'E', label: `P(1 + 1%)${superscript(3)}` },
    ],
    correct: 'B',
    explain:
      'Period rate = 12% / 12 = 1%. Number of periods = 3 × 12 = 36. So A = P(1 + 1%)³⁶. Trap D uses the annual rate with years; trap E uses the period rate but only 3 periods.',
    lab: { P: 10000, R: 12, n: 3, m: 12, mode: 'compound' },
  },
  {
    id: 'monthly-amount',
    prompt:
      'Find the amount (correct to the nearest dollar) of $10 000 at 12% p.a., compounded monthly, for 2 years.',
    bilingual: '每月複利 · 金額',
    options: [
      { letter: 'A', label: hkDollars(10201) },
      { letter: 'B', label: hkDollars(12400) },
      { letter: 'C', label: hkDollars(12544) },
      { letter: 'D', label: hkDollars(12697) },
      { letter: 'E', label: hkDollars(151786) },
    ],
    correct: 'D',
    explain:
      'A = 10 000(1 + 12%/12)²⁴ = 10 000(1.01)²⁴ = $12,697.35… → $12 697. B is simple interest ($12 400). C is yearly compounding ($12 544).',
    lab: { P: 10000, R: 12, n: 2, m: 12, mode: 'compound' },
  },
  {
    id: 'second-year',
    prompt:
      'A sum of $10 000 is deposited at 4% p.a., compounded yearly. Find the interest earned in the second year.',
    bilingual: '第二年利息',
    options: [
      { letter: 'A', label: hkDollars(16) },
      { letter: 'B', label: hkDollars(400) },
      { letter: 'C', label: hkDollars(416) },
      { letter: 'D', label: hkDollars(800) },
      { letter: 'E', label: hkDollars(816) },
    ],
    correct: 'C',
    explain:
      'Year 1 interest = 10 000 × 4% = $400, so A₁ = $10 400. Year 2 interest = 10 400 × 4% = $416. B is the first year only; D is two years of simple interest; E is two years of compound interest in total.',
    lab: { P: 10000, R: 4, n: 2, m: 1, mode: 'compound' },
  },
  {
    id: 'si-vs-ci',
    prompt:
      'Find the difference between simple interest and compound interest (compounded annually) on a loan of $1 000 for 4 years at 6% per annum. (Nearest dollar.)',
    bilingual: '單利與複利之差',
    options: [
      { letter: 'A', label: hkDollars(22) },
      { letter: 'B', label: hkDollars(196) },
      { letter: 'C', label: hkDollars(540) },
      { letter: 'D', label: hkDollars(760) },
      { letter: 'E', label: hkDollars(1022) },
    ],
    correct: 'A',
    explain:
      'SI = 1000 × 6% × 4 = $240. CI = 1000(1.06)⁴ − 1000 = $262.48… Difference = $22.48… → $22. The gap is interest-on-interest, not the whole CI.',
    lab: { P: 1000, R: 6, n: 4, m: 1, mode: 'compare' },
  },
  {
    id: 'quarterly-amount',
    prompt:
      'A sum of $40 000 is deposited at 4% per annum for 3 years, compounded quarterly. Find the amount correct to the nearest dollar.',
    bilingual: '每季複利 · 金額',
    options: [
      { letter: 'A', label: hkDollars(44800) },
      { letter: 'B', label: hkDollars(44995) },
      { letter: 'C', label: hkDollars(45046) },
      { letter: 'D', label: hkDollars(45073) },
    ],
    correct: 'D',
    explain:
      'Period rate = 4%/4 = 1%. Periods = 3 × 4 = 12. A = 40 000(1.01)¹² = $45,073.00… → $45 073. A is simple interest.',
    lab: { P: 40000, R: 4, n: 3, m: 4, mode: 'compound' },
  },
]
