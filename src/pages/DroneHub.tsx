import { useEffect } from 'react'
import { DRONE_LABS } from '../lib/drone'
import { navigate } from '../lib/routes'

export function DroneHub() {
  useEffect(() => {
    const previous = document.title
    document.title = 'Drone / HuLA · Classroom'
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
          <span className="brand-kicker">HuLA EDU · Simulator</span>
          <h1>Drone / HuLA</h1>
        </div>
      </header>
      <section className="home-hero">
        <h2>Fly the path by hand, then with blocks.</h2>
        <p className="lede">
          High Great HuLA EDU is an indoor teaching drone. In class, students use the HuLA APP for
          manual sticks and for Scratch on the aircraft Wi‑Fi. This lab is a{' '}
          <strong>browser simulator</strong> for those ideas. It does not connect to a drone and it
          does not replace the HuLA APP.
        </p>
      </section>
      <div className="contrast drone-safety">
        <strong>Safety 安全</strong>
        <p>
          A real drone needs a clear indoor space and an adult watching. Spinning propellers can cut
          fingers. In this lab the aircraft stays on the screen.
        </p>
      </div>
      <div className="module-cards">
        {DRONE_LABS.map((lab) => (
          <button
            key={lab.id}
            type="button"
            className="card module-card"
            onClick={() => navigate('drone', lab.id)}
          >
            <span className="module-index">{lab.index}</span>
            <h3>{lab.title}</h3>
            <div className="bilingual">{lab.bilingual}</div>
            <div className="prob-hub-preview" aria-hidden="true">
              {lab.id === 'manual' ? <ManualPreview /> : null}
              {lab.id === 'program' ? <ProgramPreview /> : null}
              {lab.id === 'compare' ? <ComparePreview /> : null}
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
        Manual 手動飛行 is continuous decisions. Program 程式飛行 is a plan you run. Compare uses the
        same marked path for both.
      </p>
    </>
  )
}

function ManualPreview() {
  return (
    <div className="drone-preview-sticks" aria-hidden="true">
      <span>L</span>
      <span>R</span>
    </div>
  )
}

function ProgramPreview() {
  return (
    <div className="drone-preview-blocks" aria-hidden="true">
      <span>Take off</span>
      <span>Forward</span>
      <span>Land</span>
    </div>
  )
}

function ComparePreview() {
  return (
    <div className="drone-preview-compare" aria-hidden="true">
      <span>手動</span>
      <strong>→</strong>
      <span>程式</span>
    </div>
  )
}
