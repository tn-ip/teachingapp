import { useEffect } from 'react'
import { PRINT_LABS } from '../lib/print3d'
import { navigate } from '../lib/routes'

export function PrintHub() {
  useEffect(() => {
    const previous = document.title
    document.title = '3D Print / Tinkercad · Classroom'
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <>
      <header className="topbar">
        <button type="button" className="back-btn" onClick={() => navigate('home')}>
          ← Home
        </button>
        <div className="brand">
          <span className="brand-kicker">Tinkercad · Bambu Lab H2D</span>
          <h1>3D Print / Tinkercad</h1>
        </div>
      </header>
      <section className="home-hero">
        <h2>Learn the idea on the iPad. Build it in Tinkercad.</h2>
        <p className="lede">
          Three classroom labs for absolute beginners: a dual-text block, a measured school gadget,
          and an AI mesh you judge before import. Nothing here slices a file or talks to the printer.
        </p>
      </section>
      <div className="contrast print-safety">
        <strong>Before the real printer 真機之前</strong>
        <p>
          Hot nozzle, moving bed. An adult runs the Bambu Lab H2D. In these labs the plastic stays
          on the screen. First real print: one object, PLA preset.
        </p>
      </div>
      <div className="module-cards print-cards">
        {PRINT_LABS.map((lab) => (
          <button
            key={lab.id}
            type="button"
            className="card module-card"
            onClick={() => navigate('print3d', lab.id)}
          >
            <span className="module-index">{lab.index}</span>
            <h3>{lab.title}</h3>
            <div className="bilingual">{lab.bilingual}</div>
            <div className="print-hub-preview" aria-hidden="true">
              {lab.id === 'dual-text' ? <DualPreview /> : null}
              {lab.id === 'gadget' ? <GadgetPreview /> : null}
              {lab.id === 'ai' ? <AiPreview /> : null}
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
        Cycle 7 is spatial thinking for text. Cycle 8 is measure, then fit. The AI lab is prompt,
        judge, scale, then edit. Export from Tinkercad when the checklist is quiet.
      </p>
    </>
  )
}

function DualPreview() {
  return (
    <div className="print-preview-dual">
      <span>HI</span>
      <span>BYE</span>
    </div>
  )
}

function GadgetPreview() {
  return (
    <div className="print-preview-gadget" aria-hidden="true">
      <i />
      <b />
    </div>
  )
}

function AiPreview() {
  return (
    <div className="print-preview-ai">
      <span>Bad</span>
      <strong>→</strong>
      <span>Good</span>
    </div>
  )
}
