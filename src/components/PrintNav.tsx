import { PRINT_LABS, type PrintView } from '../lib/print3d'
import { navigate } from '../lib/routes'

export function PrintNav({ current }: { current: PrintView }) {
  return (
    <div className="chip-row print-subnav">
      {PRINT_LABS.map((lab) => (
        <button
          key={lab.id}
          type="button"
          className="chip"
          aria-pressed={current === lab.id}
          onClick={() => navigate('print3d', lab.id)}
        >
          {lab.short}
          <span className="bilingual" style={{ marginLeft: 6 }}>
            {lab.zh}
          </span>
        </button>
      ))}
    </div>
  )
}
