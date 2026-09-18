type StepperProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (value: number) => string
  onChange: (next: number) => void
}

export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: StepperProps) {
  const display = format ? format(value) : String(value)
  return (
    <div className="stepper">
      <span className="label">{label}</span>
      <div className="stepper-row">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
        >
          −
        </button>
        <strong aria-live="polite" className={format ? 'fit' : undefined}>
          {display}
        </strong>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
        >
          +
        </button>
      </div>
    </div>
  )
}
