import { useState } from 'react'
import {
  BLOCK_META,
  PALETTE,
  blockContains,
  findBlock,
  insertBlock,
  makeBlock,
  moveBlock,
  removeBlock,
  roundTo,
  updateBlock,
  type Block,
  type BlockKind,
} from '../lib/drone'

type DroneBlocksProps = {
  blocks: Block[]
  onChange: (blocks: Block[]) => void
  activeBlockId: string | null
  disabled: boolean
}

export function DroneBlocks({ blocks, onChange, activeBlockId, disabled }: DroneBlocksProps) {
  const [insertParent, setInsertParent] = useState<string | null>(null)
  const parent = findBlock(blocks, insertParent)
  const addingInside = parent?.kind === 'repeat'

  const add = (kind: BlockKind) => {
    if (disabled) return
    if (kind === 'repeat') {
      const block = makeBlock('repeat')
      onChange(insertBlock(blocks, block, null))
      setInsertParent(block.id)
      return
    }
    const target = addingInside ? parent.id : null
    onChange(insertBlock(blocks, makeBlock(kind), target))
  }

  const change = (next: Block[]) => {
    onChange(next)
    if (insertParent && !findBlock(next, insertParent)) setInsertParent(null)
  }

  return (
    <div className="drone-script">
      <p className="panel-title">Block palette 積木</p>
      <div className="drone-palette">
        {PALETTE.map((kind) => {
          const meta = BLOCK_META[kind]
          return (
            <button
              key={kind}
              type="button"
              className={`drone-palette-btn ${meta.tone}`}
              disabled={disabled}
              onClick={() => add(kind)}
            >
              {meta.label}
              <small>{meta.zh}</small>
            </button>
          )
        })}
      </div>
      <p className="note drone-insert-note">
        {addingInside
          ? `Next block goes inside Repeat × ${parent.times}.`
          : 'Next block goes on the main script.'}
        {addingInside ? (
          <button type="button" className="drone-text-btn" onClick={() => setInsertParent(null)}>
            Add to main script
          </button>
        ) : null}
      </p>
      <p className="panel-title">Workspace 程式</p>
      {blocks.length === 0 ? (
        <p className="empty-cap">Tap a block to add it, or load an example script.</p>
      ) : (
        <BlockList
          blocks={blocks}
          activeBlockId={activeBlockId}
          insertParent={addingInside ? parent.id : null}
          disabled={disabled}
          onChange={change}
          onInsert={setInsertParent}
        />
      )}
    </div>
  )
}

function BlockList({
  blocks,
  activeBlockId,
  insertParent,
  disabled,
  onChange,
  onInsert,
}: {
  blocks: Block[]
  activeBlockId: string | null
  insertParent: string | null
  disabled: boolean
  onChange: (blocks: Block[]) => void
  onInsert: (id: string | null) => void
}) {
  return (
    <ol className="drone-block-list">
      {blocks.map((block, index) => (
        <li key={block.id}>
          <BlockCard
            block={block}
            index={index}
            count={blocks.length}
            active={block.id === activeBlockId || blockContains(block, activeBlockId)}
            targeted={block.id === insertParent}
            disabled={disabled}
            onPatch={(patch) => onChange(updateBlock(blocks, block.id, patch))}
            onRemove={() => onChange(removeBlock(blocks, block.id))}
            onMove={(dir) => onChange(moveBlock(blocks, block.id, dir))}
            onInsert={() => onInsert(block.id === insertParent ? null : block.id)}
          />
          {block.kind === 'repeat' ? (
            <div className="drone-nest">
              {block.body.length === 0 ? (
                <p className="note">This repeat is empty. Choose “Add inside”, then tap a block.</p>
              ) : (
                <BlockList
                  blocks={block.body}
                  activeBlockId={activeBlockId}
                  insertParent={insertParent}
                  disabled={disabled}
                  onChange={(body) =>
                    onChange(blocks.map((b) => (b.id === block.id ? { ...b, body } : b)))
                  }
                  onInsert={onInsert}
                />
              )}
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

function BlockCard({
  block,
  index,
  count,
  active,
  targeted,
  disabled,
  onPatch,
  onRemove,
  onMove,
  onInsert,
}: {
  block: Block
  index: number
  count: number
  active: boolean
  targeted: boolean
  disabled: boolean
  onPatch: (patch: Partial<Pick<Block, 'cm' | 'deg' | 'seconds' | 'times'>>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onInsert: () => void
}) {
  const meta = BLOCK_META[block.kind]
  return (
    <div
      className={`drone-block ${meta.tone}${active ? ' is-active' : ''}${targeted ? ' is-target' : ''}`}
    >
      <span className="drone-block-name">
        {meta.label} <span className="drone-block-zh">{meta.zh}</span>
      </span>
      {block.kind === 'forward' ? (
        <NumStep
          label="Distance"
          value={block.cm}
          min={10}
          max={300}
          step={10}
          suffix=" cm"
          disabled={disabled}
          onChange={(cm) => onPatch({ cm })}
        />
      ) : null}
      {block.kind === 'turnLeft' || block.kind === 'turnRight' ? (
        <NumStep
          label="Angle"
          value={block.deg}
          min={15}
          max={180}
          step={15}
          suffix="°"
          disabled={disabled}
          onChange={(deg) => onPatch({ deg })}
        />
      ) : null}
      {block.kind === 'wait' ? (
        <NumStep
          label="Time"
          value={block.seconds}
          min={0.5}
          max={5}
          step={0.5}
          suffix=" s"
          disabled={disabled}
          onChange={(seconds) => onPatch({ seconds })}
        />
      ) : null}
      {block.kind === 'repeat' ? (
        <NumStep
          label="Times"
          value={block.times}
          min={1}
          max={8}
          step={1}
          suffix="×"
          disabled={disabled}
          onChange={(times) => onPatch({ times })}
        />
      ) : null}
      <span className="drone-block-actions">
        {block.kind === 'repeat' ? (
          <button
            type="button"
            className="drone-mini"
            aria-pressed={targeted}
            disabled={disabled}
            onClick={onInsert}
          >
            {targeted ? 'Adding inside' : 'Add inside'}
          </button>
        ) : null}
        <button
          type="button"
          className="drone-mini"
          aria-label="Move block up"
          disabled={disabled || index === 0}
          onClick={() => onMove(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          className="drone-mini"
          aria-label="Move block down"
          disabled={disabled || index === count - 1}
          onClick={() => onMove(1)}
        >
          ↓
        </button>
        <button
          type="button"
          className="drone-mini"
          aria-label={`Remove ${meta.label}`}
          disabled={disabled}
          onClick={onRemove}
        >
          Remove
        </button>
      </span>
    </div>
  )
}

function NumStep({
  label,
  value,
  min,
  max,
  step,
  suffix,
  disabled,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix: string
  disabled: boolean
  onChange: (next: number) => void
}) {
  const shown = Number.isInteger(value) ? String(value) : value.toFixed(1)
  return (
    <span className="drone-step">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(roundTo(Math.max(min, value - step), step))}
      >
        −
      </button>
      <strong>
        {shown}
        {suffix}
      </strong>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(roundTo(Math.min(max, value + step), step))}
      >
        +
      </button>
    </span>
  )
}
