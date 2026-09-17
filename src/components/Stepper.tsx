type StepperProps = {
  label: string
  value: number
  min: number
  max: number
  onChange: (next: number) => void
}

export function Stepper({ label, value, min, max, onChange }: StepperProps) {
  return (
    <div className="stepper">
      <span className="label">{label}</span>
      <div className="stepper-row">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <strong aria-live="polite">{value}</strong>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  )
}
