import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { DotFigure } from '../components/DotFigure'
import { ModuleFrame, SideCard, VizCard } from '../components/ModuleFrame'
import { Stepper } from '../components/Stepper'
import { formatInt } from '../lib/math'
import { navigate } from '../lib/routes'
import {
  countDrawn,
  dotsFor,
  getQuestion,
  incrementFrom,
  incrementPhrase,
  incrementToReach,
  termValue,
  type QuestionId,
} from '../lib/sequence'

function T({ sub }: { sub: ReactNode }) {
  return (
    <>
      T<sub>{sub}</sub>
    </>
  )
}

type SequenceQuestionPageProps = {
  id: QuestionId
}

export function SequenceQuestionPage({ id }: SequenceQuestionPageProps) {
  const q = getQuestion(id)
  const [n, setN] = useState(1)
  const [showReason, setShowReason] = useState(false)
  const [showInterior, setShowInterior] = useState(false)
  const [showMissing, setShowMissing] = useState(true)
  const [choice, setChoice] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const playRef = useRef<number | null>(null)

  useEffect(() => {
    setN(1)
    setShowReason(false)
    setChoice(null)
    setRevealed(false)
    setPlaying(false)
    setShowInterior(false)
    setShowMissing(true)
  }, [id])

  useEffect(() => {
    if (!playing) return
    playRef.current = window.setInterval(() => {
      setN((cur) => {
        if (cur >= q.askedN) {
          setPlaying(false)
          return cur
        }
        return cur + 1
      })
    }, 700)
    return () => {
      if (playRef.current) window.clearInterval(playRef.current)
    }
  }, [playing, q.askedN])

  const dots = useMemo(
    () => dotsFor(id, n, { showInterior, showMissing }),
    [id, n, showInterior, showMissing],
  )
  const count = countDrawn(dots)
  const added = incrementToReach(id, n)
  const answered = choice !== null || revealed
  const selected = choice
  const isCorrect = selected === q.correctValue
  const newCount = dots.filter((d) => d.isNew).length
  const nextQ = id < 4 ? ((id + 1) as QuestionId) : null
  const prevQ = id > 1 ? ((id - 1) as QuestionId) : null

  const incrementNow =
    n < q.maxN ? incrementFrom(id, n) : null

  return (
    <ModuleFrame
      title={`Sequence · Q${id}`}
      bilingual={q.bilingual}
      backLabel="← Sequence"
      backTo="sequence"
      liveLabel={`Pattern ${n} · Tₙ dots`}
      liveValue={formatInt(count)}
      liveSub={
        <span>
          <T sub={1} /> = {q.t1},{' '}
          <T sub="n+1" /> = <T sub="n" /> + {q.incrementTex}
          {added !== null ? (
            <>
              {' '}
              · this step added {added}
            </>
          ) : (
            ' · 1st pattern'
          )}
        </span>
      }
    >
      <VizCard title={`Live figure · pattern ${n}`}>
        <p className="caption">{q.geometry}</p>
        <div className="dot-stage">
          <DotFigure dots={dots} label={`Pattern ${n} with ${count} dots`} />
        </div>
        {n === q.askedN ? (
          <p className="seq-asked">
            This is the {q.askedN}th pattern — the term the MCQ asks for.
          </p>
        ) : null}
        <div className="legend">
          {id === 1 ? (
            <>
              <span>
                <b style={{ color: '#a16207' }}>●</b> 4 corners
              </span>
              <span>
                <b style={{ color: '#0f6e67' }}>●</b> side dots
              </span>
            </>
          ) : (
            <>
              <span>
                <b style={{ color: '#0f6e67' }}>●</b> earlier dots
              </span>
              <span>
                <b style={{ color: '#c4451a' }}>●</b> added this step
                {n > 1 ? ` (${newCount})` : ''}
              </span>
            </>
          )}
          {id === 3 && showMissing ? (
            <span>
              <b style={{ color: '#b7aa98' }}>○</b> missing corner
            </span>
          ) : null}
          {id === 4 ? (
            <span>
              <b style={{ color: '#1e4b8a' }}>●</b> extra tail
            </span>
          ) : null}
          {id === 1 && showInterior ? (
            <span>
              <b style={{ color: '#b7aa98' }}>○</b> empty interior
            </span>
          ) : null}
        </div>

        <div className="seq-controls">
          <Stepper label="Pattern n" value={n} min={1} max={q.maxN} onChange={setN} />
          <div className="seq-range-wrap">
            <label htmlFor={`seq-range-${id}`}>
              Grow 1 → {q.maxN} (asked: {q.askedN})
            </label>
            <input
              id={`seq-range-${id}`}
              className="seq-range"
              type="range"
              min={1}
              max={q.maxN}
              value={n}
              onChange={(e) => {
                setPlaying(false)
                setN(Number(e.target.value))
              }}
            />
            <div className="seq-range-ends">
              <span>1st</span>
              <span>
                T<sub>{q.askedN}</sub>
              </span>
              <span>{q.maxN}</span>
            </div>
          </div>
        </div>

        <div className="toolbar" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="play-btn"
            onClick={() => {
              setPlaying(false)
              setN(1)
              window.setTimeout(() => setPlaying(true), 40)
            }}
          >
            Grow to {q.askedN}th
          </button>
          <button
            type="button"
            className="play-btn ghost"
            disabled={n <= 1}
            onClick={() => {
              setPlaying(false)
              setN((v) => Math.max(1, v - 1))
            }}
          >
            Prev
          </button>
          <button
            type="button"
            className="play-btn ghost"
            disabled={n >= q.maxN}
            onClick={() => {
              setPlaying(false)
              setN((v) => Math.min(q.maxN, v + 1))
            }}
          >
            Next
          </button>
          {id === 1 ? (
            <button
              type="button"
              className="chip"
              aria-pressed={showInterior}
              onClick={() => setShowInterior((v) => !v)}
            >
              Empty interior
            </button>
          ) : null}
          {id === 3 ? (
            <button
              type="button"
              className="chip"
              aria-pressed={showMissing}
              onClick={() => setShowMissing((v) => !v)}
            >
              Missing cell
            </button>
          ) : null}
        </div>
      </VizCard>

      <SideCard>
        <p className="panel-title">The question</p>
        <p className="explain">{q.prompt}</p>

        <div className="formula">
          <T sub={1} /> = {q.t1}
          <br />
          <T sub="n+1" /> = <T sub="n" /> + {q.incrementTex}
          <span className="muted">
            {incrementNow !== null ? (
              <>Next: pattern {n + 1} adds {incrementPhrase(id, n)} dots.</>
            ) : (
              <>End of the slider — step back to keep growing in reverse.</>
            )}
          </span>
        </div>

        <div className="seq-build">
          <p className="panel-title">How this count was built</p>
          <ol>
            <li>
              <T sub={1} /> = {q.t1}
            </li>
            {n > 5 ? <li>… earlier steps omitted …</li> : null}
            {n > 1
              ? Array.from({ length: Math.min(n - 1, 4) }, (_, i) => {
                  const from = n > 5 ? n - 4 + i : i + 1
                  const to = from + 1
                  const inc = incrementFrom(id, from)
                  const before = termValue(id, from)
                  const after = termValue(id, to)
                  return (
                    <li key={to}>
                      <T sub={to} /> = <T sub={from} /> + {inc} = {before} + {inc} = {after}
                    </li>
                  )
                })
              : null}
          </ol>
        </div>

        <button
          type="button"
          className="chip"
          aria-pressed={showReason}
          onClick={() => setShowReason((v) => !v)}
        >
          {showReason ? 'Hide reasoning' : 'Show reasoning'}
        </button>
        {showReason ? (
          <div className="seq-reason">
            {q.reasoning.map((step) => (
              <div key={step.title}>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </div>
            ))}
            <p className="note">
              General term: <strong>{q.closedForm}</strong>. {q.closedFormNote}
            </p>
            {answered ? (
              <p>
                Plug in n = {q.askedN}: {q.afterAnswer}
              </p>
            ) : (
              <p className="note">
                Plug n = {q.askedN} into the general term after you choose A–D (or
                reveal).
              </p>
            )}
          </div>
        ) : (
          <p className="note">Teacher toggle: closed form stays off the board until you want it.</p>
        )}

        <p className="panel-title">Choose T<sub>{q.askedN}</sub></p>
        <div className="mcq-grid">
          {q.options.map((opt) => {
            const picked = selected === opt.value
            const showKey = answered && opt.value === q.correctValue
            const showWrong = answered && picked && opt.value !== q.correctValue
            return (
              <button
                key={opt.letter}
                type="button"
                className={`mcq-btn${picked ? ' picked' : ''}${showKey ? ' correct' : ''}${
                  showWrong ? ' wrong' : ''
                }`}
                aria-pressed={picked}
                onClick={() => {
                  setChoice(opt.value)
                }}
              >
                <span className="mcq-letter">{opt.letter}</span>
                {opt.value}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          className="play-btn ghost"
          onClick={() => setRevealed(true)}
          disabled={revealed}
        >
          Reveal answer
        </button>
        {answered ? (
          <div className={isCorrect && !revealed ? 'seq-feedback ok' : 'seq-feedback'}>
            {revealed && selected === null ? (
              <p>
                <strong>
                  {q.options.find((o) => o.value === q.correctValue)?.letter}. {q.correctValue}
                </strong>
                {' — '}
                {q.afterAnswer}
              </p>
            ) : isCorrect ? (
              <p>
                <strong>Correct.</strong> {q.afterAnswer}
              </p>
            ) : (
              <p>
                <strong>Not yet.</strong> Step the figure to n = {q.askedN} and count,
                or open reasoning. {q.traps}
              </p>
            )}
          </div>
        ) : (
          <p className="note">Options stay unmarked until you tap one or reveal.</p>
        )}

        <div className="toolbar">
          <button
            type="button"
            className="play-btn ghost"
            disabled={!prevQ}
            onClick={() => prevQ && navigate('sequence', prevQ)}
          >
            ← Q{prevQ ?? id}
          </button>
          <button type="button" className="play-btn ghost" onClick={() => navigate('sequence')}>
            All four
          </button>
          <button
            type="button"
            className="play-btn ghost"
            disabled={!nextQ}
            onClick={() => nextQ && navigate('sequence', nextQ)}
          >
            Q{nextQ ?? id} →
          </button>
        </div>
      </SideCard>
    </ModuleFrame>
  )
}
