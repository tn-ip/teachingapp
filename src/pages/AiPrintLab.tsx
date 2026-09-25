import { useEffect, useMemo, useState } from 'react'
import { MeshArt } from '../components/MeshArt'
import { ModuleFrame, SideCard, VizCard } from '../components/ModuleFrame'
import { PrintNav } from '../components/PrintNav'
import { PrintRuleList } from '../components/PrintRuleList'
import {
  AI_MESHES,
  AI_STEPS,
  EDIT_ACTIONS,
  EVAL_QUESTIONS,
  PROMPT_EXAMPLES,
  SIZE_PRESETS,
  adviseImport,
  editChecks,
  meshById,
  nameLooksReady,
  promptPoints,
  scorePrompt,
  suggestPrompt,
  type AiStepId,
  type EditKey,
  type EvalKey,
  type MeshId,
} from '../lib/print3d'

const EMPTY_EDITS: Record<EditKey, boolean> = {
  hole: false,
  hollow: false,
  pad: false,
  thicken: false,
}

export function AiPrintLab() {
  const [step, setStep] = useState<AiStepId>('prompt')
  const [prompt, setPrompt] = useState(PROMPT_EXAMPLES[0].text)
  const [meshId, setMeshId] = useState<MeshId>('dragon')
  const [answers, setAnswers] = useState<Record<EvalKey, boolean | null>>({
    base: null,
    solid: null,
    spikes: null,
    simple: null,
  })
  const [revealed, setRevealed] = useState(false)
  const [size, setSize] = useState({ w: 480, d: 260, h: 390 })
  const [edits, setEdits] = useState<Record<EditKey, boolean>>(EMPTY_EDITS)
  const [assetName, setAssetName] = useState('school-cat')
  const [prep, setPrep] = useState({ cleaned: false, named: false, sized: false, flat: false })

  useEffect(() => {
    const previous = document.title
    document.title = 'AI → Tinkercad · 3D Print'
    return () => {
      document.title = previous
    }
  }, [])

  const rules = useMemo(() => scorePrompt(prompt), [prompt])
  const points = promptPoints(rules)
  const suggestion = suggestPrompt(prompt, rules)
  const mesh = meshById(meshId)
  const advice = adviseImport(size.w, size.d, size.h)
  const fixes = editChecks(mesh, edits)
  const evalCorrect = revealed && EVAL_QUESTIONS.every((q) => answers[q.id] === mesh.truth[q.id])
  const nameOk = nameLooksReady(assetName)
  const delightexReady = prep.cleaned && prep.named && prep.sized && prep.flat && nameOk
  const stepIndex = AI_STEPS.findIndex((item) => item.id === step)
  const readyCount = [
    points >= 4,
    true,
    evalCorrect,
    advice.lines.every((line) => line.level !== 'fail') && size.w > 0,
    fixes.every((check) => check.state !== 'fail'),
    fixes.every((check) => check.state !== 'fail'),
    delightexReady,
  ].filter(Boolean).length

  const pickMesh = (id: MeshId) => {
    setMeshId(id)
    setAnswers({ base: null, solid: null, spikes: null, simple: null })
    setRevealed(false)
    setEdits(EMPTY_EDITS)
  }

  const go = (id: AiStepId) => setStep(id)
  const next = () => {
    const following = AI_STEPS[stepIndex + 1]
    if (following) setStep(following.id)
  }

  return (
    <ModuleFrame
      title="AI → Tinkercad"
      kicker="Meshy · Tripo3D · Delightex"
      bilingual="文字生成 · 評估 · 匯入 · 修改"
      liveLabel="Workflow 流程"
      liveValue={`${readyCount}/7`}
      liveSub={
        <span>
          {AI_STEPS[stepIndex].label} {AI_STEPS[stepIndex].zh} · prompt {points}/5 · {mesh.zh}
        </span>
      }
      backLabel="← 3D Print"
      backTo="print3d"
      nav={<PrintNav current="ai" />}
    >
      <VizCard title="From a sentence to a file you can trust" className="print-viz">
        <div className="print-steps" role="tablist" aria-label="AI workflow">
          {AI_STEPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === step}
              className="print-step"
              onClick={() => go(item.id)}
            >
              <span>{index + 1}</span>
              {item.label}
              <small>{item.zh}</small>
            </button>
          ))}
        </div>

        {step === 'prompt' ? (
          <div className="print-step-body">
            <p className="note">
              Meshy and Tripo3D turn a sentence or a photo into a mesh. The sentence decides if
              the mesh can be printed.
            </p>
            <div className="chip-row">
              {PROMPT_EXAMPLES.map((example) => (
                <button
                  key={example.id}
                  type="button"
                  className="chip"
                  onClick={() => setPrompt(example.text)}
                >
                  {example.label}
                </button>
              ))}
            </div>
            <label className="print-prompt-label" htmlFor="ai-prompt">
              Your prompt 你的提示
              <textarea
                id="ai-prompt"
                className="print-prompt"
                value={prompt}
                rows={4}
                onChange={(event) => setPrompt(event.target.value.slice(0, 280))}
              />
            </label>
            <ul className="print-rules">
              {rules.map((rule) => (
                <li key={rule.id} className={`print-rule is-${rule.ok ? 'ok' : 'fail'}`}>
                  <span className={`print-pill ${rule.ok ? 'is-ok' : 'is-fail'}`}>{rule.ok ? 'OK' : 'Fix'}</span>
                  <div>
                    <strong>
                      {rule.label} · {rule.zh}
                    </strong>
                    <p>{rule.ok ? 'This idea is in the sentence.' : rule.hint}</p>
                  </div>
                </li>
              ))}
            </ul>
            {points < 5 ? (
              <div className="formula">
                Try this rewrite
                <span className="muted">{suggestion}</span>
                <button type="button" className="play-btn" onClick={() => setPrompt(suggestion)}>
                  Use this rewrite
                </button>
              </div>
            ) : (
              <p className="note">Five rules are in the sentence. Generate next and still judge the mesh.</p>
            )}
          </div>
        ) : null}

        {step === 'generate' ? (
          <div className="print-step-body">
            <p className="note">
              No live Meshy or Tripo3D call. These four cards are the kind of result those tools
              return: two that fight the printer, two that behave.
            </p>
            <div className="mesh-grid">
              {AI_MESHES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`mesh-card is-${item.kind}`}
                  aria-pressed={meshId === item.id}
                  onClick={() => pickMesh(item.id)}
                >
                  <MeshArt id={item.id} />
                  <span className={`print-pill ${item.kind === 'good' ? 'is-ok' : 'is-fail'}`}>
                    {item.kind === 'good' ? 'Good' : 'Bad'}
                  </span>
                  <strong>
                    {item.title} · {item.zh}
                  </strong>
                  <small>{item.blurb}</small>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 'evaluate' ? (
          <div className="print-step-body">
            <div className="mesh-selected">
              <MeshArt id={mesh.id} />
              <div>
                <strong>
                  {mesh.title} · {mesh.zh}
                </strong>
                <p className="note">
                  {mesh.source}. {mesh.blurb}
                </p>
              </div>
            </div>
            {EVAL_QUESTIONS.map((question) => (
              <div key={question.id} className="print-eval">
                <p>{question.prompt}</p>
                <div className="chip-row">
                  <button
                    type="button"
                    className="chip"
                    aria-pressed={answers[question.id] === true}
                    onClick={() => {
                      setAnswers((cur) => ({ ...cur, [question.id]: true }))
                      setRevealed(false)
                    }}
                  >
                    Yes 是
                  </button>
                  <button
                    type="button"
                    className="chip"
                    aria-pressed={answers[question.id] === false}
                    onClick={() => {
                      setAnswers((cur) => ({ ...cur, [question.id]: false }))
                      setRevealed(false)
                    }}
                  >
                    No 否
                  </button>
                </div>
                {revealed ? (
                  <p className={answers[question.id] === mesh.truth[question.id] ? 'note' : 'print-miss'}>
                    {mesh.truth[question.id] ? 'Yes — a printable mesh has this.' : 'No — this example fails here.'}
                    {answers[question.id] === mesh.truth[question.id] ? ' Your call matches.' : ' Look again at the picture.'}
                  </p>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              className="play-btn"
              disabled={EVAL_QUESTIONS.some((q) => answers[q.id] === null)}
              onClick={() => setRevealed(true)}
            >
              Check answers
            </button>
            {evalCorrect ? <p className="note">You read the mesh the way a checker should.</p> : null}
          </div>
        ) : null}

        {step === 'import' ? (
          <div className="print-step-body">
            <p className="note">
              Tinkercad’s everyday grid is about 200 mm. The workspace can grow to 1000 mm, but a
              huge mesh is hard to grab. Imports also stop around 25 MB or 300,000 triangles.
            </p>
            <div className="chip-row">
              {SIZE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="chip"
                  aria-pressed={size.w === preset.w && size.d === preset.d && size.h === preset.h}
                  onClick={() => setSize({ w: preset.w, d: preset.d, h: preset.h })}
                >
                  {preset.label} · {preset.zh}
                </button>
              ))}
            </div>
            <div className="print-xyz">
              <SizeField
                id="size-w"
                label="Width 闊"
                value={size.w}
                onChange={(w) => setSize((cur) => ({ ...cur, w }))}
              />
              <SizeField
                id="size-d"
                label="Depth 深"
                value={size.d}
                onChange={(d) => setSize((cur) => ({ ...cur, d }))}
              />
              <SizeField
                id="size-h"
                label="Height 高"
                value={size.h}
                onChange={(h) => setSize((cur) => ({ ...cur, h }))}
              />
            </div>
            <p className="path-readout">
              Longest side {advice.longest > 0 ? `${advice.longest >= 10 ? Math.round(advice.longest) : advice.longest} mm` : '—'}
              {advice.scalePercent != null ? ` · suggest scale ${advice.scalePercent}%` : ''}
            </p>
            <ul className="print-rules">
              {advice.lines.map((line) => (
                <li key={line.text} className={`print-rule is-${line.level}`}>
                  <span className={`print-pill is-${line.level}`}>
                    {line.level === 'ok' ? 'OK' : line.level === 'warn' ? 'Warn' : 'Fix'}
                  </span>
                  <div>
                    <p>{line.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {step === 'edit' ? (
          <div className="print-step-body">
            <p className="note">
              After import, stay in Tinkercad. Solids are grouped with holes. Tick the edits this
              mesh still needs.
            </p>
            <div className="mesh-selected">
              <MeshArt id={mesh.id} />
              <p className="note">{mesh.blurb}</p>
            </div>
            {EDIT_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                className="print-check"
                aria-pressed={edits[action.id]}
                onClick={() => setEdits((cur) => ({ ...cur, [action.id]: !cur[action.id] }))}
              >
                <span className={`print-pill ${edits[action.id] ? 'is-ok' : ''}`}>{edits[action.id] ? 'On' : 'Off'}</span>
                <span>
                  <strong>
                    {action.title} · {action.zh}
                  </strong>
                  <small>{action.detail}</small>
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {step === 'print' ? (
          <div className="print-step-body">
            <p className="note">
              Print check uses the mesh you picked and the edits you toggled. PLA preset, one object
              on the H2D plate, for the first file.
            </p>
            <PrintRuleList checks={fixes} />
            {fixes.every((check) => check.state !== 'fail') ? (
              <div className="print-celebrate" role="status">
                <strong>Print plan holds</strong>
                <p>Slice in Bambu Studio only after the Tinkercad solid matches this list.</p>
              </div>
            ) : (
              <p className="note">Go back to Edit and turn on every fix this mesh still needs.</p>
            )}
          </div>
        ) : null}

        {step === 'delightex' ? (
          <div className="print-step-body">
            <p className="note">
              Delightex needs a cleaned file that stands on its flat face. Name it before it lands
              in the scene as “download”.
            </p>
            <label className="print-prompt-label" htmlFor="asset-name">
              File name 檔名
              <input
                id="asset-name"
                className="print-word"
                value={assetName}
                onChange={(event) => setAssetName(event.target.value.slice(0, 40))}
              />
            </label>
            {!nameOk ? <p className="note">Use at least two characters and no slash or star.</p> : null}
            <PrepToggle
              on={prep.cleaned}
              title="Cleaned mesh 已清理"
              detail="No loose spikes, no broken lace, walls you can see."
              onToggle={() => setPrep((cur) => ({ ...cur, cleaned: !cur.cleaned }))}
            />
            <PrepToggle
              on={prep.named && nameOk}
              title="Named 已命名"
              detail={nameOk ? `Save it as ${assetName.trim()}.` : 'Fix the file name, then tick this.'}
              disabled={!nameOk}
              onToggle={() => setPrep((cur) => ({ ...cur, named: !cur.named }))}
            />
            <PrepToggle
              on={prep.sized}
              title="Sized 已縮放"
              detail="The bounding box fits the Tinkercad comfort zone and the H2D bed."
              onToggle={() => setPrep((cur) => ({ ...cur, sized: !cur.sized }))}
            />
            <PrepToggle
              on={prep.flat}
              title="Flat orientation 平放"
              detail="The flat pad is on the ground in Delightex, not on its side."
              onToggle={() => setPrep((cur) => ({ ...cur, flat: !cur.flat }))}
            />
            {delightexReady ? (
              <div className="print-celebrate" role="status">
                <strong>Ready for Delightex</strong>
                <p>
                  {assetName.trim()} is cleaned, named, sized, and sitting on its flat face. Import
                  that file, not the raw AI download.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {stepIndex < AI_STEPS.length - 1 ? (
          <button type="button" className="play-btn" onClick={next}>
            Next · {AI_STEPS[stepIndex + 1].zh}
          </button>
        ) : null}
      </VizCard>
      <SideCard>
        <p className="panel-title">Prompt score 提示分</p>
        <p className="path-readout">
          {points}/5
        </p>
        <p className="note">{prompt.trim() || 'Write a prompt on the first step.'}</p>
        <p className="panel-title">Chosen mesh 已選</p>
        <div className="mesh-selected">
          <MeshArt id={mesh.id} />
          <div>
            <strong>{mesh.title}</strong>
            <p className="note">{mesh.kind === 'good' ? 'Chunky example' : 'Problem example'}</p>
          </div>
        </div>
        <div className="formula">
          Import comfort
          <span className="muted">
            Keep the long side near 200 mm for Tinkercad. H2D single nozzle is 325 × 320 × 325 mm.
            File cap is about 25 MB and 300,000 triangles.
          </span>
        </div>
        <div className="tip">
          <strong>Teaching tip</strong>
          Judge the picture before you fall in love with it. A pretty spike is a failed print.
        </div>
      </SideCard>
    </ModuleFrame>
  )
}

function SizeField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="print-prompt-label" htmlFor={id}>
      {label}
      <input
        id={id}
        className="print-num"
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={Number.isFinite(value) ? value : ''}
        onChange={(event) => {
          const next = event.target.valueAsNumber
          if (!Number.isFinite(next)) return
          onChange(next)
        }}
      />
    </label>
  )
}

function PrepToggle({
  on,
  title,
  detail,
  disabled = false,
  onToggle,
}: {
  on: boolean
  title: string
  detail: string
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <button type="button" className="print-check" aria-pressed={on} disabled={disabled} onClick={onToggle}>
      <span className={`print-pill ${on ? 'is-ok' : ''}`}>{on ? 'On' : 'Off'}</span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </button>
  )
}
