import type { ReactNode } from 'react'
import { navigate } from '../lib/routes'

type ModuleFrameProps = {
  title: string
  bilingual: string
  liveLabel: string
  liveValue: ReactNode
  liveSub?: ReactNode
  children: ReactNode
}

export function ModuleFrame({
  title,
  bilingual,
  liveLabel,
  liveValue,
  liveSub,
  children,
}: ModuleFrameProps) {
  return (
    <>
      <header className="topbar">
        <button type="button" className="back-btn" onClick={() => navigate('home')}>
          ← Home
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
      <div className="module-grid">{children}</div>
    </>
  )
}

export function VizCard({
  children,
  title,
}: {
  children: ReactNode
  title?: string
}) {
  return (
    <section className="card viz-card">
      {title ? <p className="panel-title">{title}</p> : null}
      {children}
    </section>
  )
}

export function SideCard({ children }: { children: ReactNode }) {
  return <aside className="card side-card">{children}</aside>
}
