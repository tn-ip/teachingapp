export function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) return NaN
  if (n > 12) return Number.POSITIVE_INFINITY
  let product = 1
  for (let i = 2; i <= n; i += 1) product *= i
  return product
}

/** nPr = n! / (n − r)!  — ordered arrangements */
export function nPr(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r)) return NaN
  if (n < 0 || r < 0 || r > n) return 0
  let product = 1
  for (let i = 0; i < r; i += 1) product *= n - i
  return product
}

/** nCr = n! / (r!(n − r)!)  — unordered selections */
export function nCr(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r)) return NaN
  if (n < 0 || r < 0 || r > n) return 0
  const k = Math.min(r, n - r)
  let result = 1
  for (let i = 1; i <= k; i += 1) {
    result = (result * (n - k + i)) / i
  }
  return Math.round(result)
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const t = y
    y = x % y
    x = t
  }
  return x || 1
}

export function simplifyFraction(num: number, den: number): { num: number; den: number } {
  if (den === 0) return { num, den }
  if (num === 0) return { num: 0, den: 1 }
  const g = gcd(num, den)
  return { num: num / g, den: den / g }
}

export function formatInt(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-HK')
}

export function permutationsOf<T>(items: T[], r: number): T[][] {
  if (r === 0) return [[]]
  if (r > items.length) return []
  const out: T[][] = []
  const visit = (used: boolean[], path: T[]) => {
    if (path.length === r) {
      out.push([...path])
      return
    }
    for (let i = 0; i < items.length; i += 1) {
      if (used[i]) continue
      used[i] = true
      path.push(items[i])
      visit(used, path)
      path.pop()
      used[i] = false
    }
  }
  visit(Array(items.length).fill(false), [])
  return out
}

export function combinationsOf<T>(items: T[], r: number): T[][] {
  if (r === 0) return [[]]
  if (r > items.length) return []
  const out: T[][] = []
  const visit = (start: number, path: T[]) => {
    if (path.length === r) {
      out.push([...path])
      return
    }
    for (let i = start; i < items.length; i += 1) {
      path.push(items[i])
      visit(i + 1, path)
      path.pop()
    }
  }
  visit(0, [])
  return out
}

export function product(values: number[]): number {
  return values.reduce((acc, v) => acc * v, 1)
}

export const TOKEN_PALETTE = [
  { id: 'A', color: '#0f6e67', soft: '#d5efe8' },
  { id: 'B', color: '#c4451a', soft: '#fde6dc' },
  { id: 'C', color: '#1e4b8a', soft: '#dce8f8' },
  { id: 'D', color: '#a16207', soft: '#fdecc8' },
  { id: 'E', color: '#6d28d9', soft: '#ede4ff' },
  { id: 'F', color: '#9f1239', soft: '#fde4ea' },
] as const

export type Token = {
  id: string
  color: string
  soft: string
}

export function tokens(n: number): Token[] {
  return TOKEN_PALETTE.slice(0, n).map((t) => ({ ...t }))
}

export function optionLabels(count: number, kind: 'letter' | 'digit' = 'letter'): string[] {
  return Array.from({ length: count }, (_, i) =>
    kind === 'digit' ? String(i + 1) : String.fromCharCode(65 + i),
  )
}
