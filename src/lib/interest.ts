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

/** KaTeX dollars: \$10{,}000.00 */
export function texMoney(n: number, digits = 2): string {
  const sign = n < 0 ? '-' : ''
  const body = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  return `${sign}\\$${body.replace(/,/g, '{,}')}`
}

export function texPercent(R: number): string {
  if (Number.isInteger(R)) return `${R}\\%`
  const rounded = Math.round(R * 10000) / 10000
  return `${rounded}\\%`
}

export function texPeriodRate(R: number, m: number): string {
  if (m !== 0 && R % m === 0) return `${R / m}\\%`
  return `\\dfrac{${R}\\%}{${m}}`
}

export function simpleRevisionTex(): string {
  return 'I = P \\times R\\% \\times n,\\quad A = P(1 + R\\% \\times n)'
}

export function compoundRevisionTex(): string {
  return 'A = P(1 + R\\%)^{n},\\quad I = P(1 + R\\%)^{n} - P'
}

export function compoundFrequencyRevisionTex(): string {
  return 'A = P\\left(1 + \\dfrac{R\\%}{m}\\right)^{n \\times m}'
}

export function simpleLiveTex(
  P: number,
  R: number,
  n: number,
  I: number,
  A: number,
): { tex: string; aria: string } {
  const p = texMoney(P, 0)
  const r = texPercent(R)
  const i = texMoney(I)
  const a = texMoney(A)
  return {
    tex: `\\begin{aligned}
I &= P \\times R\\% \\times n = ${p} \\times ${r} \\times ${n} = ${i} \\\\
A &= P(1 + R\\% \\times n) = ${p}(1 + ${r} \\times ${n}) = ${a}
\\end{aligned}`,
    aria: `I equals P times R percent times n, which is ${formatMoney(P, 0)} times ${formatPct(R)} times ${n} equals ${formatMoney(I)}. A equals P times 1 plus R percent times n, which is ${formatMoney(A)}.`,
  }
}

export function compoundLiveTex(
  P: number,
  R: number,
  n: number,
  m: number,
  A: number,
  I: number,
): { tex: string; aria: string } {
  const p = texMoney(P, 0)
  const a = texMoney(A)
  const i = texMoney(I)
  if (m === 1) {
    return {
      tex: `\\begin{aligned}
A &= P(1 + R\\%)^{n} = ${p}(1 + ${texPercent(R)})^{${n}} = ${a} \\\\
I &= A - P = ${a} - ${p} = ${i}
\\end{aligned}`,
      aria: `A equals P times 1 plus R percent to the n, which is ${formatMoney(P, 0)} times 1 plus ${formatPct(R)} to the power ${n} equals ${formatMoney(A)}. I equals A minus P equals ${formatMoney(I)}.`,
    }
  }
  const periods = n * m
  const per = texPeriodRate(R, m)
  return {
    tex: `\\begin{aligned}
\\text{rate per period} &= \\dfrac{R\\%}{m} = \\dfrac{${texPercent(R)}}{${m}} = ${per} \\\\
\\text{periods} &= n \\times m = ${n} \\times ${m} = ${periods} \\\\
A &= P\\left(1 + \\dfrac{R\\%}{m}\\right)^{n \\times m} = ${p}\\left(1 + ${per}\\right)^{${periods}} = ${a} \\\\
I &= A - P = ${a} - ${p} = ${i}
\\end{aligned}`,
    aria: `Rate per period is R percent over m, ${formatPct(R)} over ${m} equals ${R % m === 0 ? formatPct(R / m) : `${formatPct(R)} over ${m}`}. Periods are n times m equals ${periods}. A equals P times 1 plus R percent over m, to the power n times m, equals ${formatMoney(A)}. I equals A minus P equals ${formatMoney(I)}.`,
  }
}

export function compareLiveTex(
  P: number,
  R: number,
  n: number,
  m: number,
  simpleA: number,
  compoundA: number,
): { tex: string; aria: string } {
  const p = texMoney(P, 0)
  const siA = texMoney(simpleA)
  const ciA = texMoney(compoundA)
  const gap = texMoney(compoundA - simpleA)
  const ciLine =
    m === 1
      ? `A_{\\mathrm{CI}} &= P(1 + R\\%)^{n} = ${p}(1 + ${texPercent(R)})^{${n}} = ${ciA}`
      : `A_{\\mathrm{CI}} &= P\\left(1 + \\dfrac{R\\%}{m}\\right)^{n \\times m} = ${p}\\left(1 + ${texPeriodRate(R, m)}\\right)^{${n * m}} = ${ciA}`
  return {
    tex: `\\begin{aligned}
A_{\\mathrm{SI}} &= P(1 + R\\% \\times n) = ${p}(1 + ${texPercent(R)} \\times ${n}) = ${siA} \\\\
${ciLine} \\\\
A_{\\mathrm{CI}} - A_{\\mathrm{SI}} &= ${gap}
\\end{aligned}`,
    aria: `Simple amount is ${formatMoney(simpleA)}. Compound amount is ${formatMoney(compoundA)}. The difference is ${formatMoney(compoundA - simpleA)}.`,
  }
}

export type PracticeOption = {
  letter: string
  label: string
  /** Algebraic options render with KaTeX. */
  tex?: string
  ariaLabel?: string
}

export type PracticeQuestion = {
  id: string
  prompt: string
  bilingual: string
  options: PracticeOption[]
  correct: string
  explain: string
  workingTex?: string
  workingAria?: string
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
      {
        letter: 'A',
        label: 'P(1 + 1%)',
        tex: 'P(1 + 1\\%)',
        ariaLabel: 'P times open parenthesis 1 plus 1 percent close parenthesis',
      },
      {
        letter: 'B',
        label: 'P(1 + 1%)^36',
        tex: 'P(1 + 1\\%)^{36}',
        ariaLabel: 'P times 1 plus 1 percent, to the power 36',
      },
      {
        letter: 'C',
        label: 'P(1 + 12%)^36',
        tex: 'P(1 + 12\\%)^{36}',
        ariaLabel: 'P times 1 plus 12 percent, to the power 36',
      },
      {
        letter: 'D',
        label: 'P(1 + 12%)^3',
        tex: 'P(1 + 12\\%)^{3}',
        ariaLabel: 'P times 1 plus 12 percent, to the power 3',
      },
      {
        letter: 'E',
        label: 'P(1 + 1%)^3',
        tex: 'P(1 + 1\\%)^{3}',
        ariaLabel: 'P times 1 plus 1 percent, to the power 3',
      },
    ],
    correct: 'B',
    workingTex:
      'A = P\\left(1 + \\dfrac{12\\%}{12}\\right)^{3 \\times 12} = P(1 + 1\\%)^{36}',
    workingAria:
      'A equals P times 1 plus 12 percent over 12, to the power 3 times 12, which is P times 1 plus 1 percent to the 36.',
    explain:
      'Trap D uses the annual rate with years; trap E uses the period rate but only 3 periods.',
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
    workingTex: `A = 10{,}000\\left(1 + \\dfrac{12\\%}{12}\\right)^{24} = 10{,}000(1.01)^{24} = ${texMoney(12697.35)}`,
    workingAria:
      'A equals 10,000 times 1 plus 12 percent over 12 to the 24, which is 10,000 times 1.01 to the 24 equals $12,697.35, nearest dollar $12,697.',
    explain: 'Nearest dollar: $12 697. B is simple interest ($12 400). C is yearly compounding ($12 544).',
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
    workingTex:
      'I_{2} = 10{,}000(1 + 4\\%) \\times 4\\% = 10{,}400 \\times 4\\% = \\$416',
    workingAria:
      'Interest in year 2 equals 10,000 times 1 plus 4 percent, times 4 percent, which is 10,400 times 4 percent equals $416.',
    explain:
      'Year 1 interest is $400, so A1 = $10 400. B is the first year only; D is two years of simple interest; E is two years of compound interest in total.',
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
    workingTex: `\\begin{aligned}
I_{\\mathrm{SI}} &= 1000 \\times 6\\% \\times 4 = \\$240 \\\\
I_{\\mathrm{CI}} &= 1000(1.06)^{4} - 1000 = ${texMoney(262.48)} \\\\
I_{\\mathrm{CI}} - I_{\\mathrm{SI}} &= ${texMoney(22.48)} \\rightarrow \\$22
\\end{aligned}`,
    workingAria:
      'Simple interest is $240. Compound interest is $262.48. The difference is $22.48, nearest dollar $22.',
    explain: 'The gap is interest-on-interest, not the whole compound interest.',
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
    workingTex: `A = 40{,}000\\left(1 + \\dfrac{4\\%}{4}\\right)^{12} = 40{,}000(1.01)^{12} = ${texMoney(45073.0, 2)}`,
    workingAria:
      'A equals 40,000 times 1 plus 4 percent over 4 to the 12, which is 40,000 times 1.01 to the 12 equals $45,073.',
    explain: 'Nearest dollar: $45 073. A is simple interest.',
    lab: { P: 40000, R: 4, n: 3, m: 4, mode: 'compound' },
  },
]

