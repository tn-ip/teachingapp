import { DotFigure } from '../components/DotFigure'
import { navigate } from '../lib/routes'
import { QUESTIONS, dotsFor } from '../lib/sequence'

export function SequenceHub() {
  return (
    <>
      <header className="topbar">
        <button type="button" className="back-btn" onClick={() => navigate('home')}>
          ← Home
        </button>
        <div className="brand">
          <span className="brand-kicker">S4–S5 · DSE</span>
          <h1>Sequence</h1>
        </div>
      </header>
      <section className="home-hero">
        <h2>Grow the figure. Then write Tₙ.</h2>
        <p className="lede">
          Four pattern-growth labs 數列. Step from the 1st figure toward the asked term,
          watch the live count, and only then choose the MCQ. Notation:{' '}
          <span className="nowrap">
            T<sub>1</sub>, T<sub>n</sub>, T<sub>n+1</sub> = T<sub>n</sub> + …
          </span>
        </p>
      </section>
      <div className="module-cards">
        {QUESTIONS.map((q) => (
          <button
            key={q.id}
            type="button"
            className="card module-card seq-hub-card"
            onClick={() => navigate('sequence', q.id)}
          >
            <span className="module-index">{q.index}</span>
            <h3>
              Q{q.id} · {q.title}
            </h3>
            <div className="bilingual">{q.bilingual}</div>
            <div className="seq-hub-preview" aria-hidden="true">
              <DotFigure
                compact
                dots={dotsFor(q.id, Math.min(3, q.askedN))}
                label=""
              />
            </div>
            <p className="note" style={{ margin: 0 }}>
              Find T<sub>{q.askedN}</sub>. {q.geometry}
            </p>
            <div className="tip">
              <strong>Teaching tip</strong>
              {q.tip}
            </div>
          </button>
        ))}
      </div>
      <p className="home-foot">
        Slider grows the pattern past the asked term so students can explore, then
        lock in A–D. Reasoning stays hidden until you toggle it.
      </p>
    </>
  )
}
