import { PROBABILITY_LABS } from '../lib/probability'
import { navigate } from '../lib/routes'

export function ProbabilityHub() {
  return (
    <>
      <header className="topbar">
        <button type="button" className="back-btn" onClick={() => navigate('home')}>
          ← Home
        </button>
        <div className="brand">
          <span className="brand-kicker">S4–S5 · DSE</span>
          <h1>Probability</h1>
        </div>
      </header>
      <section className="home-hero">
        <h2>Count outcomes, then compare events.</h2>
        <p className="lede">
          Three probability labs 概率. Start from an equally likely sample space, then
          see mutually exclusive events 互斥 and independent events 獨立. Notation:{' '}
          <span className="nowrap">P(A ∪ B)</span>, <span className="nowrap">P(A ∩ B)</span>.
        </p>
      </section>
      <div className="module-cards">
        {PROBABILITY_LABS.map((lab) => (
          <button
            key={lab.id}
            type="button"
            className="card module-card"
            onClick={() => navigate('probability', lab.id)}
          >
            <span className="module-index">
              {lab.id === 'sample' ? '01 · Count' : lab.id === 'exclusive' ? '02 · Add' : '03 · Multiply'}
            </span>
            <h3>{lab.label}</h3>
            <div className="bilingual">{lab.bilingual}</div>
            <div className="prob-hub-preview" aria-hidden="true">
              {lab.id === 'sample' ? <SamplePreview /> : null}
              {lab.id === 'exclusive' ? <ExclusivePreview /> : null}
              {lab.id === 'independent' ? <IndependentPreview /> : null}
            </div>
            <p className="note" style={{ margin: 0 }}>
              {lab.blurb}
            </p>
            <div className="tip">
              <strong>Teaching tip</strong>
              {lab.tip}
            </div>
          </button>
        ))}
      </div>
      <p className="home-foot">
        Mutually exclusive: the intersection is empty, so add. Independent: one stage
        does not change the other, so multiply.
      </p>
    </>
  )
}

function SamplePreview() {
  return (
    <div className="mini-die">
      {['1', '2', '3', '4', '5', '6'].map((face) => (
        <span key={face} className={Number(face) % 2 === 0 ? 'on' : undefined}>
          {face}
        </span>
      ))}
    </div>
  )
}

function ExclusivePreview() {
  return (
    <div className="mini-spin">
      <span>∅</span>
    </div>
  )
}

function IndependentPreview() {
  return (
    <div className="mini-eq">
      <span>1/6</span>
      <strong>≠</strong>
      <span>1/4</span>
    </div>
  )
}
