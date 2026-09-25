import { useEffect, useMemo, useState } from 'react'
import { GadgetSketch } from '../components/GadgetSketch'
import { ModuleFrame, SideCard, VizCard } from '../components/ModuleFrame'
import { PrintNav } from '../components/PrintNav'
import { PrintRuleList } from '../components/PrintRuleList'
import {
  BAMBU_TIPS,
  GADGETS,
  GROUP_ROLES,
  defaultValues,
  evaluateGadget,
  gadgetById,
  readinessScore,
  snapDim,
  type GadgetId,
} from '../lib/print3d'

export function GadgetLab() {
  const [gadgetId, setGadgetId] = useState<GadgetId>('cable')
  const [values, setValues] = useState<Record<string, number>>(() => defaultValues('cable'))
  const [flatBase, setFlatBase] = useState(true)
  const [role, setRole] = useState<(typeof GROUP_ROLES)[number]['id']>('measurer')
  const [planned, setPlanned] = useState(false)

  useEffect(() => {
    const previous = document.title
    document.title = 'School gadget · 3D Print'
    return () => {
      document.title = previous
    }
  }, [])

  const gadget = gadgetById(gadgetId)
  const checks = useMemo(() => evaluateGadget(gadget, values, flatBase), [gadget, values, flatBase])
  const score = readinessScore(checks)
  const blocked = checks.some((check) => check.state === 'fail')
  const roleMeta = GROUP_ROLES.find((item) => item.id === role) ?? GROUP_ROLES[0]

  const pickGadget = (id: GadgetId) => {
    setGadgetId(id)
    setValues(defaultValues(id))
    setFlatBase(true)
    setPlanned(false)
  }

  return (
    <ModuleFrame
      title="Functional design"
      kicker="Cycle 8 · School gadget"
      bilingual={`${gadget.bilingual} · ${gadget.title}`}
      liveLabel="Readiness 可印分數"
      liveValue={`${score}`}
      liveSub={<span>{blocked ? 'Fix the red lines' : score === 100 ? 'Ready to plan' : 'Warnings still to talk about'} · {gadget.bilingual}</span>}
      backLabel="← 3D Print"
      backTo="print3d"
      nav={<PrintNav current="gadget" />}
    >
      <VizCard title="Boxes and cylinders 方塊與圓柱" className="print-viz">
        <div className="chip-row">
          {GADGETS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="chip"
              aria-pressed={item.id === gadgetId}
              onClick={() => pickGadget(item.id)}
            >
              {item.bilingual}
            </button>
          ))}
        </div>
        <p className="note">{gadget.blurb} {gadget.job}</p>
        <div className={role === 'designer' ? 'print-focus' : undefined}>
          <GadgetSketch
            id={gadget.id}
            values={values}
            flatBase={flatBase}
            holeFail={checks.some((check) => check.id.startsWith('hole') && check.state === 'fail')}
            wallBad={checks.some((check) => check.id.startsWith('wall-') && check.state !== 'ok')}
            overhang={checks.some((check) => check.id === 'overhang' && check.state !== 'ok')}
          />
        </div>
        <p className="panel-title">Group roles 小組角色</p>
        <div className="chip-row" role="group" aria-label="Group roles">
          {GROUP_ROLES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="chip"
              aria-pressed={role === item.id}
              onClick={() => setRole(item.id)}
            >
              {item.title}
            </button>
          ))}
        </div>
        <p className="note">{roleMeta.duty}</p>
      </VizCard>
      <SideCard>
        <div className={role === 'measurer' ? 'print-focus' : undefined}>
          <p className="panel-title">Measurement worksheet 量度表</p>
          <p className="note">Millimetres only. Change one size and watch the preview.</p>
          {gadget.dims.map((dim) => (
            <div key={dim.id} className="seq-range-wrap print-dim">
              <label htmlFor={`dim-${dim.id}`}>
                {dim.label} · {dim.zh}
                <span>{dim.hint}</span>
              </label>
              <div className="print-mm-row">
                <input
                  id={`dim-${dim.id}`}
                  className="seq-range"
                  type="range"
                  min={dim.min}
                  max={dim.max}
                  step={dim.step}
                  value={values[dim.id] ?? dim.value}
                  onChange={(event) => {
                    const next = snapDim(dim, Number(event.target.value))
                    setValues((cur) => ({ ...cur, [dim.id]: next }))
                    setPlanned(false)
                  }}
                />
                <input
                  className="print-num"
                  type="number"
                  inputMode="decimal"
                  min={dim.min}
                  max={dim.max}
                  step={dim.step}
                  aria-label={`${dim.label} millimetres`}
                  value={values[dim.id] ?? dim.value}
                  onChange={(event) => {
                    const next = event.target.valueAsNumber
                    if (!Number.isFinite(next)) return
                    setValues((cur) => ({ ...cur, [dim.id]: snapDim(dim, next) }))
                    setPlanned(false)
                  }}
                />
                <span>mm</span>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="print-check"
            aria-pressed={flatBase}
            onClick={() => {
              setFlatBase((on) => !on)
              setPlanned(false)
            }}
          >
            <span className={`print-pill ${flatBase ? 'is-ok' : 'is-fail'}`}>{flatBase ? 'On' : 'Off'}</span>
            <span>
              <strong>Flat base on the bed 底面貼熱床</strong>
              <small>Required. The preview paints the bed face teal when this is on.</small>
            </span>
          </button>
        </div>

        <div className={role === 'checker' ? 'print-focus' : undefined}>
          <p className="panel-title">Fit for purpose 是否合格</p>
          <div
            className="print-meter"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={score}
            aria-label="Print readiness"
          >
            <span className={score >= 80 ? 'is-ok' : score >= 50 ? 'is-warn' : 'is-fail'} style={{ width: `${score}%` }} />
          </div>
          <PrintRuleList checks={checks} />
        </div>

        <div className="formula">
          Bambu Studio
          <span className="muted">
            {BAMBU_TIPS.map((tip) => (
              <span key={tip} style={{ display: 'block' }}>
                {tip}
              </span>
            ))}
          </span>
        </div>

        <button
          type="button"
          className="play-btn"
          disabled={blocked || planned}
          onClick={() => setPlanned(true)}
        >
          {planned ? 'Plan saved' : 'Open Tinkercad and rebuild'}
        </button>
        {blocked ? <p className="note">Fix every red line before the group leaves this page.</p> : null}
        {planned ? (
          <div className="print-celebrate" role="status">
            <strong>Rebuild these numbers in Tinkercad</strong>
            <ul className="print-spec">
              {gadget.dims.map((dim) => (
                <li key={dim.id}>
                  <span>
                    {dim.label} · {dim.zh}
                  </span>
                  <strong>{values[dim.id]} mm</strong>
                </li>
              ))}
              <li>
                <span>Flat base 平底</span>
                <strong>{flatBase ? 'yes' : 'no'}</strong>
              </li>
            </ul>
            <p>
              No STL is exported here. Use boxes and cylinders, group them, then slice one object
              with the PLA preset.
              {score < 100 ? ' Talk about the amber warnings before you print.' : ''}
            </p>
          </div>
        ) : null}
      </SideCard>
    </ModuleFrame>
  )
}
