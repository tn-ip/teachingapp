import { useMemo, useState } from 'react'
import { ModuleFrame, SideCard, VizCard } from '../components/ModuleFrame'
import { Stepper } from '../components/Stepper'
import { formatInt, optionLabels, product } from '../lib/math'

type ScenarioId = 'outfits' | 'ice' | 'pin' | 'custom'

type Stage = { name: string; count: number; kind: 'letter' | 'digit' }

const PRESETS: Record<Exclude<ScenarioId, 'custom'>, { title: string; stages: Stage[] }> = {
  outfits: {
    title: 'Outfits',
    stages: [
      { name: 'Top 上衣', count: 3, kind: 'letter' },
      { name: 'Bottom 下裝', count: 2, kind: 'letter' },
    ],
  },
  ice: {
    title: 'Ice cream',
    stages: [
      { name: 'Flavour 口味', count: 3, kind: 'letter' },
      { name: 'Topping 配料', count: 2, kind: 'letter' },
    ],
  },
  pin: {
    title: 'PIN digits',
    stages: [
      { name: '1st digit', count: 4, kind: 'digit' },
      { name: '2nd digit', count: 4, kind: 'digit' },
    ],
  },
}

const STAGE_COLORS = ['#0f6e67', '#c4451a', '#1e4b8a']

type TreeNode = {
  id: string
  label: string
  depth: number
  children: TreeNode[]
  x: number
  y: number
}

function buildTree(stages: Stage[]): TreeNode {
  const grow = (depth: number, prefix: string): TreeNode => {
    const last = prefix.split('/').filter(Boolean).pop() || prefix
    if (depth >= stages.length) {
      return { id: prefix || 'leaf', label: last, depth, children: [], x: 0, y: 0 }
    }
    const labels = optionLabels(stages[depth].count, stages[depth].kind)
    const id = prefix || 'root'
    return {
      id,
      label: depth === 0 ? 'Start' : last,
      depth,
      children: labels.map((lab) => grow(depth + 1, prefix ? `${prefix}/${lab}` : lab)),
      x: 0,
      y: 0,
    }
  }
  const root = grow(0, '')
  root.label = 'Start'
  return root
}

function layout(root: TreeNode) {
  let leaf = 0
  const place = (node: TreeNode) => {
    if (node.children.length === 0) {
      node.x = leaf
      leaf += 1
      return
    }
    node.children.forEach(place)
    node.x = (node.children[0].x + node.children[node.children.length - 1].x) / 2
  }
  place(root)
  const maxDepth = Math.max(1, maxDepthOf(root))
  const stampY = (node: TreeNode) => {
    node.y = node.depth
    node.children.forEach(stampY)
  }
  stampY(root)
  return { leaves: leaf, maxDepth }
}

function maxDepthOf(node: TreeNode): number {
  if (node.children.length === 0) return node.depth
  return Math.max(...node.children.map(maxDepthOf))
}

function flatten(node: TreeNode, acc: TreeNode[] = []): TreeNode[] {
  acc.push(node)
  node.children.forEach((c) => flatten(c, acc))
  return acc
}

function ancestorPath(root: TreeNode, targetId: string): string[] {
  const path: string[] = []
  const dfs = (node: TreeNode): boolean => {
    path.push(node.id)
    if (node.id === targetId) return true
    for (const child of node.children) {
      if (dfs(child)) return true
    }
    path.pop()
    return false
  }
  dfs(root)
  return path
}

export function CountingTree() {
  const [scenario, setScenario] = useState<ScenarioId>('outfits')
  const [stages, setStages] = useState<Stage[]>(PRESETS.outfits.stages)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const applyScenario = (id: ScenarioId) => {
    setScenario(id)
    setSelectedId(null)
    if (id === 'custom') {
      setStages([
        { name: 'Stage 1 第一階段', count: 2, kind: 'letter' },
        { name: 'Stage 2 第二階段', count: 3, kind: 'letter' },
      ])
      return
    }
    setStages(PRESETS[id].stages.map((s) => ({ ...s })))
  }

  const counts = stages.map((s) => s.count)
  const total = product(counts)
  const tree = useMemo(() => {
    const rooted = buildTree(stages)
    layout(rooted)
    return rooted
  }, [stages])

  const nodes = flatten(tree)
  const leaves = nodes.filter((n) => n.children.length === 0)
  const highlight = selectedId ? ancestorPath(tree, selectedId) : []
  const highlightSet = new Set(highlight)

  const leafCount = Math.max(leaves.length, 1)
  const width = 920
  const height = leafCount > 8 ? 400 : 360
  const padX = 36
  const padY = 36
  const maxD = Math.max(1, ...nodes.map((n) => n.depth))
  const xScale = (x: number) => padX + (x / Math.max(leafCount - 1, 1)) * (width - padX * 2)
  const yScale = (y: number) => padY + (y / maxD) * (height - padY * 2 - (leafCount > 8 ? 18 : 0))
  const nodeR = leafCount > 24 ? 10 : leafCount > 12 ? 13 : 16

  const selectedLeaf = selectedId ? nodes.find((n) => n.id === selectedId) : undefined
  const pathLabels = selectedLeaf
    ? selectedLeaf.id.split('/').filter(Boolean)
    : []

  const setCount = (index: number, count: number) => {
    setStages((prev) => prev.map((s, i) => (i === index ? { ...s, count } : s)))
    setSelectedId(null)
  }

  const addStage = () => {
    if (stages.length >= 3) return
    setStages((prev) => [
      ...prev,
      { name: `Stage ${prev.length + 1} 第${['一', '二', '三'][prev.length]}階段`, count: 2, kind: 'letter' },
    ])
    setSelectedId(null)
  }

  const removeStage = () => {
    if (stages.length <= 2) return
    setStages((prev) => prev.slice(0, -1))
    setSelectedId(null)
  }

  return (
    <ModuleFrame
      title="Counting tree"
      bilingual="Fundamental counting principle 基本計數原理 · tree diagram 樹形圖"
      liveLabel="Total ways 總數"
      liveValue={formatInt(total)}
      liveSub={
        <span>
          {counts.join(' × ')} = {formatInt(total)}
        </span>
      }
    >
      <VizCard title="Tree grows with each choice">
        <p className="caption">
          Tap a leaf to highlight one complete path. Each path is one outcome.
        </p>
        <div className="tree-wrap">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Counting tree diagram">
            {nodes.flatMap((node) =>
              node.children.map((child) => {
                const on = highlightSet.has(node.id) && highlightSet.has(child.id)
                return (
                  <line
                    key={`${node.id}->${child.id}`}
                    x1={xScale(node.x)}
                    y1={yScale(node.y)}
                    x2={xScale(child.x)}
                    y2={yScale(child.y)}
                    stroke={on ? STAGE_COLORS[node.depth] || '#1a2330' : '#cbbca7'}
                    strokeWidth={on ? 4 : 2}
                    strokeLinecap="round"
                  />
                )
              }),
            )}
            {nodes.map((node) => {
              const on = highlightSet.has(node.id)
              const color =
                node.depth === 0 ? '#1a2330' : STAGE_COLORS[node.depth - 1] || '#1a2330'
              const isLeaf = node.children.length === 0
              const labelOutside = isLeaf && leafCount > 8
              return (
                <g
                  key={node.id}
                  transform={`translate(${xScale(node.x)}, ${yScale(node.y)})`}
                  onClick={() => isLeaf && setSelectedId(node.id)}
                  style={{ cursor: isLeaf ? 'pointer' : 'default' }}
                >
                  <circle
                    r={labelOutside ? Math.max(7, nodeR - 3) : nodeR}
                    fill={on || node.depth === 0 ? color : '#fffaf2'}
                    stroke={color}
                    strokeWidth="2.5"
                  />
                  <text
                    textAnchor="middle"
                    dy={labelOutside ? nodeR + 8 : '0.35em'}
                    fontSize={labelOutside ? 10 : nodeR > 12 ? 12 : 10}
                    fontWeight={700}
                    fill={labelOutside ? '#1a2330' : on || node.depth === 0 ? '#fffaf2' : '#1a2330'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.depth === 0 ? 'S' : node.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
        <div className="legend">
          {stages.map((s, i) => (
            <span key={s.name}>
              <b style={{ color: STAGE_COLORS[i] }}>{s.name}</b> · {s.count} choices
            </span>
          ))}
        </div>
        {pathLabels.length > 0 ? (
          <p className="path-readout">
            Path 路徑: {pathLabels.join(' → ')} · 1 of {formatInt(total)}
          </p>
        ) : (
          <p className="caption">No path selected.</p>
        )}
      </VizCard>
      <SideCard>
        <p className="panel-title">Scenario 情境</p>
        <div className="chip-row">
          {(
            [
              ['outfits', 'Outfits 服裝'],
              ['ice', 'Ice cream 雪糕'],
              ['pin', 'PIN 密碼'],
              ['custom', 'Custom 自訂'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="chip"
              aria-pressed={scenario === id}
              onClick={() => applyScenario(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="panel-title">Choices per stage</p>
        <div className="stage-list">
          {stages.map((stage, i) => (
            <div key={stage.name} className="stage-row">
              <strong>{stage.name}</strong>
              <Stepper
                label="options"
                value={stage.count}
                min={2}
                max={stages.length === 3 ? 3 : 4}
                onChange={(v) => setCount(i, v)}
              />
            </div>
          ))}
        </div>
        <div className="toolbar">
          <button type="button" className="play-btn ghost" onClick={addStage} disabled={stages.length >= 3}>
            Add stage
          </button>
          <button
            type="button"
            className="play-btn ghost"
            onClick={removeStage}
            disabled={stages.length <= 2}
          >
            Remove stage
          </button>
        </div>
        <p className="explain">
          If a process has independent stages, multiply the number of options at each
          stage. The tree shows every possible list of choices.
        </p>
        <div className="formula">
          n₁ × n₂ × n₃ × … = total ways
          <span className="muted">
            {counts.map((c, i) => `n${i + 1}=${c}`).join(', ')} → {formatInt(total)}
            {scenario === 'pin'
              ? ' · A real 4-digit PIN with digits 0–9 has 10⁴ = 10 000 possibilities.'
              : ''}
          </span>
        </div>
      </SideCard>
    </ModuleFrame>
  )
}
