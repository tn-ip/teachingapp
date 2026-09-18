import { useEffect, useMemo, useRef, useState } from 'react'
import { InterestChart } from '../components/InterestChart'
import { MathTex } from '../components/MathTex'
import { ModuleFrame, SideCard, VizCard } from '../components/ModuleFrame'
import { Stepper } from '../components/Stepper'
import {
  FREQUENCIES,
  INTEREST_MODES,
  PRACTICE,
  compareLiveTex,
  compoundFrequencyRevisionTex,
  compoundInterest,
  compoundLiveTex,
  compoundPeriodPoints,
  compoundRevisionTex,
  formatMoney,
  formatPct,
  frequencyById,
  simpleInterest,
  simpleLiveTex,
  simplePeriodPoints,
  simpleRevisionTex,
  texMoney,
  yearlySnapshots,
  type FrequencyId,
  type InterestMode,
  type PracticeQuestion,
} from '../lib/interest'
import { navigate } from '../lib/routes'

const P_MIN = 1000
const P_MAX = 50000
const P_STEP = 500
const R_MIN = 1
const R_MAX = 24
const N_MIN = 1
const N_MAX = 10

type InterestPageProps = {
  mode: InterestMode
}

export function Interest({ mode }: InterestPageProps) {
  const [P, setP] = useState(10000)
  const [R, setR] = useState(12)
  const [n, setN] = useState(5)
  const [freqId, setFreqId] = useState<FrequencyId>('yearly')
  const [selectedYear, setSelectedYear] = useState(5)
  const [revealUpTo, setRevealUpTo] = useState(5)
  const [playing, setPlaying] = useState(false)
  const playRef = useRef<number | null>(null)
  const [practiceId, setPracticeId] = useState(PRACTICE[0].id)
  const [choice, setChoice] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const freq = frequencyById(freqId)
  const m = mode === 'simple' ? 1 : freq.m

  useEffect(() => {
    setSelectedYear(n)
    setRevealUpTo(n)
    setPlaying(false)
  }, [n, P, R, m, mode])

  useEffect(() => {
    if (!playing) return
    playRef.current = window.setInterval(() => {
      setRevealUpTo((cur) => {
        if (cur >= n) {
          setPlaying(false)
          setSelectedYear(n)
          return cur
        }
        const next = Math.min(n, cur + 1)
        setSelectedYear(next)
        return next
      })
    }, 650)
    return () => {
      if (playRef.current) window.clearInterval(playRef.current)
    }
  }, [playing, n])

  const si = simpleInterest(P, R, n)
  const ci = compoundInterest(P, R, n, m)
  const years = useMemo(() => yearlySnapshots(P, R, n, m), [P, R, n, m])
  const simpleSteps = useMemo(() => simplePeriodPoints(P, R, n), [P, R, n])
  const compoundSteps = useMemo(() => compoundPeriodPoints(P, R, n, m), [P, R, n, m])
  const snap = years.find((row) => row.year === selectedYear) ?? years[years.length - 1]

  const liveA = mode === 'simple' ? si.A : ci.A
  const liveI = mode === 'simple' ? si.I : ci.I
  const gap = ci.A - si.A

  const practice = PRACTICE.find((q) => q.id === practiceId) ?? PRACTICE[0]
  const answered = choice !== null || revealed
  const picked = practice.options.find((o) => o.letter === choice)
  const pickedCorrect = practice.options.find((o) => o.letter === practice.correct)
  const isCorrect = choice === practice.correct

  const applyLab = (q: PracticeQuestion) => {
    setP(q.lab.P)
    setR(q.lab.R)
    setN(q.lab.n)
    setFreqId((FREQUENCIES.find((f) => f.m === q.lab.m) ?? FREQUENCIES[0]).id)
    navigate('interest', q.lab.mode)
  }

  const setMode = (next: InterestMode) => navigate('interest', next)

  const periods = n * m
  const yearI = mode === 'simple' ? snap.simpleYearI : snap.compoundYearI
  const yearA = mode === 'simple' ? snap.simpleA : snap.compoundA
  const prevA = yearA - yearI

  const liveValue =
    mode === 'compare' ? (
      <span>{formatMoney(gap)}</span>
    ) : (
      <span>{formatMoney(liveA)}</span>
    )

  const liveSub =
    mode === 'compare' ? (
      <span>
        after {n} years ·{' '}
        <MathTex
          tex={`A_{\\mathrm{CI}} = ${texMoney(ci.A)}`}
          ariaLabel={`compound amount equals ${formatMoney(ci.A)}`}
        />
        {' · '}
        <MathTex
          tex={`A_{\\mathrm{SI}} = ${texMoney(si.A)}`}
          ariaLabel={`simple amount equals ${formatMoney(si.A)}`}
        />
      </span>
    ) : (
      <span>
        <MathTex
          tex={`I = ${texMoney(liveI)}`}
          ariaLabel={`interest equals ${formatMoney(liveI)}`}
        />
        {' · '}
        <MathTex
          tex={`P = ${texMoney(P, 0)}`}
          ariaLabel={`principal equals ${formatMoney(P, 0)}`}
        />
        {' · after '}
        {n} year{n === 1 ? '' : 's'}
        {mode === 'compound' && m > 1 ? ` · ${periods} ${freq.periodName}s` : ''}
      </span>
    )

  const liveFormula =
    mode === 'simple'
      ? simpleLiveTex(P, R, n, si.I, si.A)
      : mode === 'compound'
        ? compoundLiveTex(P, R, n, m, ci.A, ci.I)
        : compareLiveTex(P, R, n, m, si.A, ci.A)

  const revision =
    mode === 'simple'
      ? {
          tex: simpleRevisionTex(),
          aria: 'I equals P times R percent times n. A equals P times 1 plus R percent times n.',
        }
      : m === 1
        ? {
            tex: compoundRevisionTex(),
            aria: 'A equals P times 1 plus R percent to the n. I equals that amount minus P.',
          }
        : {
            tex: `${compoundRevisionTex()}\\quad ${compoundFrequencyRevisionTex()}`,
            aria: 'A equals P times 1 plus R percent to the n, with R percent and n per period. With frequency m, A equals P times 1 plus R percent over m, to the power n times m.',
          }

  const tip =
    mode === 'simple' ? (
      <>
        Simple interest is the same every year: each year adds{' '}
        <MathTex tex="P \times R\%" ariaLabel="P times R percent" />. Time n is in years; the
        graph is equal steps.
      </>
    ) : m === 1 ? (
      <>
        Yearly compounding: the formula uses the annual rate{' '}
        <MathTex tex="R\%" ariaLabel="R percent" /> and n years. Next year’s interest is charged
        on A, not only on P.
      </>
    ) : (
      <>
        Compounded {freq.label.toLowerCase()}: rate per period is{' '}
        <MathTex
          tex={
            R % m === 0
              ? `\\dfrac{R\\%}{m} = \\dfrac{${R}\\%}{${m}} = ${R / m}\\%`
              : `\\dfrac{R\\%}{m} = \\dfrac{${R}\\%}{${m}}`
          }
          ariaLabel={`R percent over m equals ${formatPct(R)} over ${m}`}
        />
        , and the number of periods is{' '}
        <MathTex
          tex={`n \\times m = ${n} \\times ${m} = ${periods}`}
          ariaLabel={`n times m equals ${n} times ${m} equals ${periods}`}
        />
        . Do not put the annual rate into the formula with monthly periods.
      </>
    )

  return (
    <ModuleFrame
      title="Interest"
      bilingual="Simple 單利息 · Compound 複利息 · P, I, A, R%, n"
      liveLabel={mode === 'compare' ? 'CI − SI 差額' : 'Amount A 本利和'}
      liveValue={liveValue}
      liveSub={liveSub}
    >
      <VizCard title="Growth over time · tap a year">
        <p className="caption">
          {mode === 'compare'
            ? 'Gold = simple. Coral = compound. Teal is principal. The shaded gap is extra interest from compounding.'
            : 'Teal base is principal P. The upper block is cumulative interest I. The stepped line jumps when interest is credited.'}
        </p>
        <div className="interest-stage">
          <InterestChart
            mode={mode}
            principal={P}
            years={years}
            simpleSteps={simpleSteps}
            compoundSteps={compoundSteps}
            selectedYear={selectedYear}
            revealUpTo={revealUpTo}
            onSelectYear={(year) => {
              setPlaying(false)
              setSelectedYear(year)
              setRevealUpTo((cur) => Math.max(cur, year))
            }}
          />
        </div>
        <div className="legend">
          <span>
            <b style={{ color: '#0f6e67' }}>■</b> principal P
          </span>
          {mode !== 'compound' ? (
            <span>
              <b style={{ color: '#a16207' }}>■</b> simple 單利
            </span>
          ) : null}
          {mode !== 'simple' ? (
            <span>
              <b style={{ color: '#c4451a' }}>■</b> compound 複利
            </span>
          ) : null}
        </div>
        <p className="seq-asked">
          After {snap.year} year{snap.year === 1 ? '' : 's'}
          {snap.year === 0 ? (
            <>
              : still{' '}
              <MathTex
                tex={`P = ${texMoney(P)}`}
                ariaLabel={`P equals ${formatMoney(P)}`}
              />
              .
            </>
          ) : (
            <>
              :{' '}
              <MathTex
                tex={`A = ${texMoney(mode === 'simple' ? snap.simpleA : snap.compoundA)}`}
                ariaLabel={`A equals ${formatMoney(mode === 'simple' ? snap.simpleA : snap.compoundA)}`}
              />
              {', '}
              <MathTex
                tex={`I = ${texMoney(mode === 'simple' ? snap.simpleI : snap.compoundI)}`}
                ariaLabel={`I equals ${formatMoney(mode === 'simple' ? snap.simpleI : snap.compoundI)}`}
              />
              {snap.year >= 1 ? (
                <>
                  {' · this year '}
                  <MathTex
                    tex={`+${texMoney(yearI)}`}
                    ariaLabel={`this year plus ${formatMoney(yearI)}`}
                  />
                  {' (on '}
                  <MathTex tex={texMoney(prevA)} ariaLabel={formatMoney(prevA)} />)
                </>
              ) : null}
              {mode === 'compare' && snap.year > 0 ? (
                <>
                  {' · '}
                  <MathTex
                    tex={`A_{\\mathrm{CI}} - A_{\\mathrm{SI}} = ${texMoney(snap.compoundA - snap.simpleA)}`}
                    ariaLabel={`gap equals ${formatMoney(snap.compoundA - snap.simpleA)}`}
                  />
                </>
              ) : null}
              .
            </>
          )}
        </p>
        <div className="seq-controls">
          <Stepper label="Years n" value={n} min={N_MIN} max={N_MAX} onChange={setN} />
          <div className="seq-range-wrap">
            <label htmlFor="interest-years">Time n (years 年)</label>
            <input
              id="interest-years"
              className="seq-range"
              type="range"
              min={N_MIN}
              max={N_MAX}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
            />
            <div className="seq-range-ends">
              <span>1</span>
              <span>now {n}y</span>
              <span>{N_MAX}</span>
            </div>
          </div>
        </div>
        <div className="toolbar" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="play-btn"
            onClick={() => {
              setPlaying(false)
              setRevealUpTo(0)
              setSelectedYear(0)
              window.setTimeout(() => setPlaying(true), 40)
            }}
          >
            Grow year by year
          </button>
          <button
            type="button"
            className="play-btn ghost"
            onClick={() => {
              setPlaying(false)
              setRevealUpTo(n)
              setSelectedYear(n)
            }}
          >
            Show all
          </button>
        </div>
      </VizCard>

      <SideCard>
        <p className="panel-title">Mode 模式</p>
        <div className="chip-row">
          {INTEREST_MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="chip"
              aria-pressed={mode === item.id}
              onClick={() => setMode(item.id)}
            >
              {item.label}
              <span className="bilingual" style={{ marginLeft: 6 }}>
                {item.bilingual}
              </span>
            </button>
          ))}
        </div>

        {mode !== 'simple' ? (
          <>
            <p className="panel-title">Compounding 複利次數</p>
            <div className="chip-row">
              {FREQUENCIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="chip"
                  aria-pressed={freqId === item.id}
                  onClick={() => setFreqId(item.id)}
                >
                  {item.label}
                  <span className="bilingual" style={{ marginLeft: 6 }}>
                    {item.bilingual}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : null}

        <div className="stepper-grid">
          <Stepper
            label="Principal P"
            value={P}
            min={P_MIN}
            max={P_MAX}
            step={P_STEP}
            format={(v) => formatMoney(v, 0)}
            onChange={setP}
          />
          <Stepper label="Rate R%" value={R} min={R_MIN} max={R_MAX} onChange={setR} />
        </div>
        <div className="seq-range-wrap">
          <label htmlFor="interest-principal">Principal P</label>
          <input
            id="interest-principal"
            className="seq-range"
            type="range"
            min={P_MIN}
            max={P_MAX}
            step={P_STEP}
            value={P}
            onChange={(e) => setP(Number(e.target.value))}
          />
          <div className="seq-range-ends">
            <span>{formatMoney(P_MIN, 0)}</span>
            <span>{formatMoney(P, 0)}</span>
            <span>{formatMoney(P_MAX, 0)}</span>
          </div>
        </div>
        <div className="seq-range-wrap">
          <label htmlFor="interest-rate">Annual rate R%</label>
          <input
            id="interest-rate"
            className="seq-range"
            type="range"
            min={R_MIN}
            max={R_MAX}
            value={R}
            onChange={(e) => setR(Number(e.target.value))}
          />
          <div className="seq-range-ends">
            <span>1%</span>
            <span>{formatPct(R)} p.a.</span>
            <span>24%</span>
          </div>
        </div>

        <div className="formula">
          <MathTex mode="display" tex={liveFormula.tex} ariaLabel={liveFormula.aria} />
          <span className="muted">
            Revision{' '}
            <MathTex mode="inline" tex={revision.tex} ariaLabel={revision.aria} />
            {mode === 'compound' && m === 1
              ? ', with R% and n per compounding period.'
              : mode === 'compare'
                ? `. Same P, R%, and years. Compounding ${freq.label.toLowerCase()}${
                    m > 1 ? ` uses period rate R%/m.` : '.'
                  }`
                : ''}
          </span>
        </div>

        <div className="contrast">
          <strong>Teaching tip</strong>
          <p style={{ margin: '6px 0 0' }}>{tip}</p>
        </div>
      </SideCard>

      <section className="card side-card interest-practice">
        <p className="panel-title">Practice strip · MC16 flavour</p>
        <div className="chip-row">
          {PRACTICE.map((q, i) => (
            <button
              key={q.id}
              type="button"
              className="chip"
              aria-pressed={practiceId === q.id}
              onClick={() => {
                setPracticeId(q.id)
                setChoice(null)
                setRevealed(false)
              }}
            >
              Q{i + 1}
            </button>
          ))}
        </div>
        <p className="bilingual" style={{ margin: 0 }}>
          {practice.bilingual}
        </p>
        <p className="explain">{practice.prompt}</p>
        <div className={`mcq-grid${practice.options.length > 4 ? ' interest-mcq' : ''}`}>
          {practice.options.map((opt) => {
            const isPicked = choice === opt.letter
            const showKey = answered && opt.letter === practice.correct
            const showWrong = answered && isPicked && opt.letter !== practice.correct
            return (
              <button
                key={opt.letter}
                type="button"
                className={`mcq-btn${isPicked ? ' picked' : ''}${showKey ? ' correct' : ''}${
                  showWrong ? ' wrong' : ''
                }`}
                aria-pressed={isPicked}
                onClick={() => setChoice(opt.letter)}
              >
                <span className="mcq-letter">{opt.letter}</span>
                <span className="mcq-label">
                  {opt.tex ? (
                    <MathTex
                      tex={opt.tex}
                      ariaLabel={opt.ariaLabel ?? opt.label}
                    />
                  ) : (
                    opt.label
                  )}
                </span>
              </button>
            )
          })}
        </div>
        <div className="toolbar">
          <button
            type="button"
            className="play-btn ghost"
            onClick={() => setRevealed(true)}
            disabled={revealed}
          >
            Reveal answer
          </button>
          <button type="button" className="play-btn ghost" onClick={() => applyLab(practice)}>
            See in lab
          </button>
        </div>
        {answered ? (
          <div className={isCorrect && !revealed ? 'seq-feedback ok' : 'seq-feedback'}>
            {revealed && picked == null ? (
              <div>
                <p>
                  <strong>
                    {practice.correct}.{' '}
                    {pickedCorrect?.tex ? (
                      <MathTex
                        tex={pickedCorrect.tex}
                        ariaLabel={pickedCorrect.ariaLabel ?? pickedCorrect.label}
                      />
                    ) : (
                      pickedCorrect?.label
                    )}
                  </strong>
                </p>
                {practice.workingTex ? (
                  <MathTex
                    mode="display"
                    tex={practice.workingTex}
                    ariaLabel={practice.workingAria ?? practice.explain}
                  />
                ) : null}
                <p>{practice.explain}</p>
              </div>
            ) : (
              <div>
                <p>
                  <strong>{isCorrect ? 'Correct.' : 'Not yet.'}</strong>
                </p>
                {practice.workingTex ? (
                  <MathTex
                    mode="display"
                    tex={practice.workingTex}
                    ariaLabel={practice.workingAria ?? practice.explain}
                  />
                ) : null}
                <p>{practice.explain}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="note">Tap A–E, then reveal. Nearest dollar where the stem asks.</p>
        )}
      </section>
    </ModuleFrame>
  )
}
