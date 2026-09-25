import type { CheckState, PrintCheck } from '../lib/print3d'

function pill(state: CheckState): string {
  if (state === 'ok') return 'OK'
  if (state === 'warn') return 'Warn'
  return 'Fix'
}

export function PrintRuleList({ checks }: { checks: PrintCheck[] }) {
  return (
    <ul className="print-rules">
      {checks.map((check) => (
        <li key={check.id} className={`print-rule is-${check.state}`}>
          <span className={`print-pill is-${check.state}`}>{pill(check.state)}</span>
          <div>
            <strong>{check.title}</strong>
            <p>{check.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
