import type { ReactNode } from 'react'
import { navigate, type RouteId } from '../lib/routes'
import type { QuestionId } from '../lib/sequence'

type ModuleFrameProps = {
  title: string
  bilingual: string
  liveLabel: string
  liveValue: ReactNode
  liveSub?: ReactNode
  backLabel?: string
  backTo?: RouteId
  backQuestion?: QuestionId
  nav?: ReactNode
  children: ReactNode
}

export function ModuleFrame({
  title,
  bilingual,
  liveLabel,
  liveValue,
  liveSub,
  backLabel = '← Home',
  backTo = 'home',
  backQuestion,
  nav,
  children,
}: ModuleFrameProps) {
  return (
    <>
      <header className="topbar">
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate(backTo, backQuestion)}
        >
          {backLabel}
        </button>
        <div className="brand">
          <span className="brand-kicker">S4–S5 · DSE</span>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="module-head">
        <p className="bilingual" style={{ margin: 0 }}>
          {bilingual}
        </p>
      </div>
      <section className="live-banner" aria-live="polite">
        <div>
          <div className="label">{liveLabel}</div>
          <div className="value">{liveValue}</div>
        </div>
        {liveSub ? <div className="sub">{liveSub}</div> : null}
      </section>
      {nav ? <div className="module-nav">{nav}</div> : null}
      <div className="module-grid">{children}</div>
    </>
  )
}

export function VizCard({
  children,
  title,
  className,
}: {
  children: ReactNode
  title?: string
  className?: string
}) {
  return (
    <section className={`card viz-card${className ? ` ${className}` : ''}`}>
      {title ? <p className="panel-title">{title}</p> : null}
      {children}
    </section>
  )
}

export function SideCard({ children }: { children: ReactNode }) {
  return <aside className="card side-card">{children}</aside>
}
