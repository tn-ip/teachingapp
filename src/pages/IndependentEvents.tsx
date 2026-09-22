import { Fragment, useState } from 'react'
import { MathTex } from '../components/MathTex'
import { ModuleFrame, SideCard, VizCard } from '../components/ModuleFrame'
import { ProbabilityNav } from '../components/ProbabilityNav'
import { ProbStats } from '../components/ProbStats'
import {
  cellKind,
  conditionalTex,
  experimentModel,
  formatFrac,
  marginalBTex,
  productLines,
  rawFracTex,
  simplifiedFracTex,
  type ExperimentId,
  type ExperimentModel,
  type GridCell,
  type Replacement,
} from '../lib/probability'

const EXPERIMENTS: { id: ExperimentId; label: string; bilingual: string }[] = [
  { id: 'bag', label: 'Two draws', bilingual: '抽兩次' },
  { id: 'coin-die', label: 'Coin then die', bilingual: '硬幣後骰子' },
]

export function IndependentEvents() {
  const [experiment, setExperiment] = useState<ExperimentId>('bag')
  const [replacement, setReplacement] = useState<Replacement>('without')
  const [selected, setSelected] = useState<string | null>(null)

  const model = experimentModel(experiment, experiment === 'bag' ? replacement : 'with')
  const stats = model.stats
  const selectedCell = model.rows.flatMap((row) => row.cells).find((cell) => cell.id === selected) ?? null
  const given = conditionalTex(stats)

  const chooseExperiment = (id: ExperimentId) => {
    setExperiment(id)
    setSelected(null)
  }

  const chooseReplacement = (next: Replacement) => {
    setReplacement(next)
    setSelected(null)
  }

  const tip =
    model.id === 'coin-die'
      ? 'The die does not care about the coin, so the events are independent 獨立. The second-stage fractions are copies of each other, and P(A ∩ B) = P(A) × P(B).'
      : stats.independent
        ? 'With replacement 有放回 the bag is put back, so the second colour does not depend on the first. P(B | A) equals P(B), and the product rule holds.'
        : `Without replacement 不放回, the first ball changes the bag. P(A) = ${formatFrac(stats.nA, stats.nS)} and P(B) = ${formatFrac(stats.nB, stats.nS)} can look alike, but independence asks whether P(A ∩ B) equals the product. Here P(B | A) = ${formatFrac(stats.nAB, stats.nA)}, which is not P(B).`

  const spaceNote =
    model.id === 'coin-die'
      ? '12 equally likely outcomes: 2 coin faces × 6 die faces.'
      : model.replacement === 'without'
        ? 'Crossed cells are not in S. The same ball cannot be drawn twice. n(S) = 12 ordered pairs, not 16.'
        : 'Every ordered pair is in S, including the same ball twice. n(S) = 16.'

  return (
    <ModuleFrame
      title="Independent events"
      bilingual="獨立 · two-stage experiment · product rule 乘法公式"
      backLabel="← Probability"
      backTo="probability"
      nav={<ProbabilityNav current="independent" />}
      liveLabel={stats.independent ? 'Independent 獨立' : 'Dependent 不獨立'}
      liveValue={<span>{stats.independent ? 'Equal' : 'Not equal'}</span>}
      liveSub={
        <span>
          P(A ∩ B) = {formatFrac(stats.nAB, stats.nS)} · P(A)×P(B) ={' '}
          {formatFrac(stats.nA * stats.nB, stats.nS * stats.nS)}
        </span>
      }
    >
      <VizCard title={`${model.title} · ${model.firstLabel} then ${model.secondLabel}`}>
        <div className="chip-row">
          {EXPERIMENTS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="chip"
              aria-pressed={experiment === item.id}
              onClick={() => chooseExperiment(item.id)}
            >
              {item.label}
              <span className="bilingual" style={{ marginLeft: 6 }}>
                {item.bilingual}
              </span>
            </button>
          ))}
        </div>
        {model.supportsReplacement ? (
          <div className="chip-row" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="chip"
              aria-pressed={replacement === 'with'}
              onClick={() => chooseReplacement('with')}
            >
              With replacement
              <span className="bilingual" style={{ marginLeft: 6 }}>
                有放回
              </span>
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={replacement === 'without'}
              onClick={() => chooseReplacement('without')}
            >
              Without replacement
              <span className="bilingual" style={{ marginLeft: 6 }}>
                不放回
              </span>
            </button>
          </div>
        ) : (
          <p className="caption">Separate objects — the coin does not change the die. Always independent 獨立.</p>
        )}

        <div
          className={`prob-compare${stats.independent ? ' ok' : ' bad'}`}
          role="group"
          aria-label={
            stats.independent
              ? 'P of A intersect B equals P of A times P of B. Independent.'
              : 'P of A intersect B does not equal P of A times P of B. Dependent.'
          }
        >
          <div>
            <MathTex tex="P(A\cap B)" />
            <div className="bilingual">交集</div>
            <MathTex tex={simplifiedFracTex(stats.nAB, stats.nS)} />
            <div className="caption">{formatFrac(stats.nAB, stats.nS)}</div>
          </div>
          <div className="prob-compare-sign">{stats.independent ? '=' : '≠'}</div>
          <div>
            <MathTex tex="P(A)\times P(B)" />
            <div className="bilingual">乘積</div>
            <MathTex tex={simplifiedFracTex(stats.nA * stats.nB, stats.nS * stats.nS)} />
            <div className="caption">{formatFrac(stats.nA * stats.nB, stats.nS * stats.nS)}</div>
          </div>
        </div>
        <p className="compare-caption">
          {stats.independent ? 'Equal · independent 獨立' : 'Not equal · dependent 不獨立'}
        </p>

        <p className="panel-title">Probability tree 樹形圖</p>
        <div className="prob-tree">
          <div className="prob-tree-head">
            <span>{model.firstLabel}</span>
            <span>{model.secondLabel}</span>
          </div>
          {model.tree.map((arm) => (
            <div className="prob-arm" key={arm.id}>
              <div className="prob-node">
                <span>{arm.label}</span>
                <MathTex tex={rawFracTex(arm.num, arm.den)} />
              </div>
              <div className="prob-leaves">
                {arm.leaves.map((leaf) => (
                  <div key={leaf.id} className={`prob-node ${leaf.kind}`}>
                    <span>{leaf.label}</span>
                    <MathTex tex={rawFracTex(leaf.num, leaf.den)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="caption">
          {model.stageSame
            ? 'Second-stage fractions match on every branch — the first stage did not change the second.'
            : 'Second-stage fractions changed after the first draw — knowing A changes the chance of B.'}
        </p>
        <p className="caption">
          A ∩ B along the highlighted path <MathTex tex={model.pathTex} />
        </p>

        <p className="panel-title">Equally likely outcomes 等可能結果</p>
        <p className="caption">{spaceNote}</p>
        <OutcomeGrid model={model} selected={selected} onSelect={setSelected} />
        <ul className="legend">
          <li>
            <i className="swatch a" /> A only
          </li>
          <li>
            <i className="swatch b" /> B only
          </li>
          <li>
            <i className="swatch both" /> A ∩ B
          </li>
          <li>
            <i className="swatch neither" /> neither
          </li>
          {model.replacement === 'without' && model.id === 'bag' ? (
            <li>
              <i className="swatch impossible" /> not in S
            </li>
          ) : null}
        </ul>
        <p className="status-line" aria-live="polite">
          {selectedCell ? describeCell(selectedCell, model) : 'Tap an outcome to see whether it is in A, B, both, or neither.'}
        </p>
        <ProbStats stats={stats} aName={model.aName} bName={model.bName} />
      </VizCard>
      <SideCard>
        <p className="panel-title">Events 事件</p>
        <p className="explain">
          A = {model.aName}.
          <br />
          B = {model.bName}.
        </p>
        <p className="note">
          n(S) = {stats.nS} · n(A) = {stats.nA} · n(B) = {stats.nB} · n(A ∩ B) = {stats.nAB}
        </p>
        <div className="formula">
          {productLines(stats).map((tex) => (
            <MathTex key={tex} display tex={tex} />
          ))}
          {given ? <MathTex display tex={given} /> : null}
          <MathTex display tex={marginalBTex(stats)} />
          <span className="muted">
            {stats.independent
              ? 'The two values match, so the product rule holds.'
              : 'The two values do not match, so the product rule fails.'}
          </span>
        </div>
        <div className="contrast">
          <strong>Teaching tip</strong>
          <p style={{ margin: '6px 0 0' }}>{tip}</p>
        </div>
      </SideCard>
    </ModuleFrame>
  )
}

function OutcomeGrid({
  model,
  selected,
  onSelect,
}: {
  model: ExperimentModel
  selected: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="pair-scroll">
      <div
        className="pair-grid"
        style={{ gridTemplateColumns: `auto repeat(${model.columns.length}, minmax(48px, 1fr))` }}
      >
        <div className="pair-corner" aria-hidden="true">
          1st \ 2nd
        </div>
        {model.columns.map((column) => (
          <div key={column.id} className={`pair-colhead tone-${column.group}`}>
            {column.label}
          </div>
        ))}
        {model.rows.map((row) => (
          <Fragment key={row.item.id}>
            <div className={`pair-rowhead tone-${row.item.group}`}>{row.item.label}</div>
            {row.cells.map((cell) => {
              const kind = cellKind(cell)
              return (
                <button
                  key={cell.id}
                  type="button"
                  className={`pair-cell ${kind}${selected === cell.id ? ' picked' : ''}`}
                  aria-pressed={selected === cell.id}
                  aria-label={describeCell(cell, model)}
                  onClick={() => onSelect(cell.id)}
                >
                  {kind === 'impossible' ? '×' : kind === 'both' ? '∩' : kind === 'a' ? 'A' : kind === 'b' ? 'B' : '·'}
                </button>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

function describeCell(cell: GridCell, model: ExperimentModel): string {
  const pair = `${cell.first.label} then ${cell.second.label}`
  if (!cell.possible) {
    return `${pair} is not in S. The same ball cannot be drawn twice without replacement 不放回.`
  }
  if (cell.inA && cell.inB) return `${pair} is in A and in B, so it belongs to A ∩ B.`
  if (cell.inA) return `${pair} is in A only (${model.aName}).`
  if (cell.inB) return `${pair} is in B only (${model.bName}).`
  return `${pair} is in neither A nor B.`
}
