import { MathTex } from './MathTex'
import { countFracTex, type Tally } from '../lib/probability'

export function ProbStats({
  stats,
  aName,
  bName,
}: {
  stats: Tally
  aName: string
  bName: string
}) {
  const items = [
    { key: 'A', tex: 'P(A)', value: countFracTex(stats.nA, stats.nS), hint: aName },
    { key: 'B', tex: 'P(B)', value: countFracTex(stats.nB, stats.nS), hint: bName },
    {
      key: 'AB',
      tex: 'P(A\\cap B)',
      value: countFracTex(stats.nAB, stats.nS),
      hint: 'intersection 交集',
    },
    {
      key: 'union',
      tex: 'P(A\\cup B)',
      value: countFracTex(stats.nUnion, stats.nS),
      hint: 'union 併集',
    },
  ]
  return (
    <div className="prob-stats">
      {items.map((item) => (
        <div key={item.key} className="prob-stat">
          <div className="prob-stat-label">
            <MathTex tex={item.tex} />
          </div>
          <MathTex tex={item.value} />
          <div className="bilingual">{item.hint}</div>
        </div>
      ))}
    </div>
  )
}
