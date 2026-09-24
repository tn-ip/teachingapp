import { navigate, type RouteId } from '../lib/routes'

const MODULES: {
  id: Exclude<RouteId, 'home'>
  index: string
  title: string
  bilingual: string
  blurb: string
  tip: string
}[] = [
  {
    id: 'counting',
    index: '01 · Multiply stages',
    title: 'Counting tree',
    bilingual: '計數原理 · 樹形圖',
    blurb: 'Independent choices grow a tree. The live total is the product along the stages.',
    tip: 'Multiply along a path. Add only when cases cannot happen together.',
  },
  {
    id: 'permutations',
    index: '02 · Order matters',
    title: 'Permutations',
    bilingual: '排列 nPr',
    blurb: 'Fill ordered slots from n distinct items. ABC and ACB are different arrangements.',
    tip: 'Ask: would swapping two items make a new result? If yes, it is a permutation.',
  },
  {
    id: 'combinations',
    index: '03 · Order does not',
    title: 'Combinations',
    bilingual: '組合 nCr',
    blurb: 'Select a group of r from n. The same members are one combination, no matter the order.',
    tip: 'A committee, a team, or a handful of cards — grouping, not lining up.',
  },
  {
    id: 'probability',
    index: '04 · Events',
    title: 'Probability',
    bilingual: '概率 · 互斥 / 獨立',
    blurb:
      'Shade a sample space, then compare mutually exclusive events 互斥 with independent events 獨立.',
    tip: 'Exclusive: add. If they overlap, subtract the intersection. Independent: multiply.',
  },
  {
    id: 'sequence',
    index: '05 · Growing patterns',
    title: 'Sequence',
    bilingual: '數列 · Tₙ',
    blurb:
      'Step through four DSE-style dot patterns. Live count, recurrence, then the general term.',
    tip: 'Write T₁ and Tₙ₊₁ = Tₙ + … first. Only then hunt for a closed form.',
  },
  {
    id: 'interest',
    index: '06 · Principal grows',
    title: 'Interest',
    bilingual: '利息 · 單利 / 複利',
    blurb:
      'Slide P, R% and n. Watch simple vs compound amount split into principal and interest.',
    tip: 'When compounding more often than yearly, R% in the formula is the period rate R%/m, and n is the number of periods.',
  },
  {
    id: 'drone',
    index: '07 · Manual and program',
    title: 'Drone / HuLA',
    bilingual: '手動飛行 · 程式飛行',
    blurb:
      'HuLA-style indoor drone simulator. Fly a marked path by hand, then with Scratch-like blocks.',
    tip: '手動飛行 · 程式飛行. Manual is continuous decisions. Program is plan, then run.',
  },
]

export function Home() {
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-kicker">Hong Kong S4–S5 · DSE</span>
          <h1>Count · Arrange · Chance · Interest</h1>
        </div>
      </header>
      <section className="home-hero">
        <h2>See counting, arrangements, chance, patterns, and interest.</h2>
        <p className="lede">
          Classroom lab for permutation 排列, combination 組合, probability 概率,
          sequence 數列, and interest 利息, plus a HuLA drone simulator 手動飛行 · 程式飛行.
          iPad Safari: large targets, portrait or landscape, no hover-only controls.
        </p>
      </section>
      <div className="module-cards">
        {MODULES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`card module-card${m.id === 'drone' ? ' drone-home' : ''}`}
            onClick={() => navigate(m.id)}
          >
            <span className="module-index">{m.index}</span>
            <h3>{m.title}</h3>
            <div className="bilingual">{m.bilingual}</div>
            <p className="note" style={{ margin: 0 }}>
              {m.blurb}
            </p>
            <div className="tip">
              <strong>Teaching tip</strong>
              {m.tip}
            </div>
          </button>
        ))}
      </div>
      <p className="home-foot">
        Notation: nPr, nCr, P(A), mutually exclusive, independent, Tₙ, I = P × R% × n.
        Counting labs stay small so every outcome can be drawn. The drone lab is a simulator —
        it does not fly a real aircraft.
      </p>
    </>
  )
}
