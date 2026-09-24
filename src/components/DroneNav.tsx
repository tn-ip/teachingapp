import type { DroneView } from '../lib/drone'
import { navigate } from '../lib/routes'

const ITEMS: { id: DroneView; label: string; zh: string }[] = [
  { id: 'manual', label: 'Manual', zh: '手動' },
  { id: 'program', label: 'Program', zh: '程式' },
  { id: 'compare', label: 'Compare', zh: '比較' },
]

export function DroneNav({ current }: { current: DroneView }) {
  return (
    <div className="chip-row prob-subnav">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="chip"
          aria-pressed={current === item.id}
          onClick={() => navigate('drone', item.id)}
        >
          {item.label}
          <span className="bilingual" style={{ marginLeft: 6 }}>
            {item.zh}
          </span>
        </button>
      ))}
    </div>
  )
}
