import { PROBABILITY_LABS, type ProbabilityView } from '../lib/probability'
import { navigate } from '../lib/routes'

export function ProbabilityNav({ current }: { current: ProbabilityView }) {
  return (
    <div className="chip-row prob-subnav">
      {PROBABILITY_LABS.map((lab) => (
        <button
          key={lab.id}
          type="button"
          className="chip"
          aria-pressed={current === lab.id}
          onClick={() => navigate('probability', lab.id)}
        >
          {lab.label}
          <span className="bilingual" style={{ marginLeft: 6 }}>
            {lab.bilingual}
          </span>
        </button>
      ))}
    </div>
  )
}
