import { useEffect, useRef, useState } from 'react'
import { DroneArena } from '../components/DroneArena'
import { DroneBlocks } from '../components/DroneBlocks'
import { DroneNav } from '../components/DroneNav'
import { HoldButton, Mode2Diagram, StickPad } from '../components/DroneSticks'
import { ModuleFrame, SideCard, VizCard } from '../components/ModuleFrame'
import { useDroneSim } from '../components/useDroneSim'
import {
  BLOCK_META,
  EXAMPLES,
  MISSIONS,
  exampleBlocks,
  findBlock,
  headingLabel,
  missionById,
  nearCone,
  nextWaypointDistance,
  type AutoMode,
  type Block,
  type DroneView,
  type MissionId,
} from '../lib/drone'

const REFLECTIONS = [
  {
    q: 'Why might a teacher prefer program control for a repeated demo?',
    zh: '重複示範',
    a: 'The same blocks fly the same path every time. The class watches one planned route instead of a new manual flight on each try.',
  },
  {
    q: 'When is manual control better?',
    zh: '手動更好',
    a: 'When the path changes, something unexpected is in the way, or students are still learning how throttle, yaw, pitch, and roll feel.',
  },
]

type DroneLabProps = { view: Exclude<DroneView, never> }

export function DroneLab({ view }: DroneLabProps) {
  const [tab, setTab] = useState<'manual' | 'program'>(view === 'program' ? 'program' : 'manual')
  const mode: 'manual' | 'program' = view === 'compare' ? tab : view
  const [missionId, setMissionId] = useState<MissionId>(view === 'program' ? 'hop' : 'square')
  const [blocks, setBlocks] = useState<Block[]>(() =>
    view === 'compare' ? exampleBlocks('square') : [],
  )
  const loadedMission = useRef<MissionId | null>(view === 'compare' ? 'square' : null)
  const [openPrompt, setOpenPrompt] = useState<number | null>(null)

  useEffect(() => {
    const previous = document.title
    document.title = 'Drone / HuLA · Classroom'
    return () => {
      document.title = previous
    }
  }, [])

  useEffect(() => {
    if (view !== 'compare') return
    if (loadedMission.current === missionId) return
    loadedMission.current = missionId
    setBlocks(exampleBlocks(missionId))
  }, [view, missionId])

  const mission = missionById(missionId)
  const sim = useDroneSim({ mode, mission, blocks, active: true })

  const loadExample = (id: MissionId) => {
    sim.stopProgram()
    loadedMission.current = id
    setMissionId(id)
    setBlocks(exampleBlocks(id))
  }

  const distance = nextWaypointDistance(sim.pose, mission, sim.visited)
  const activeBlock = findBlock(blocks, sim.activeBlockId)
  const warning = pickWarning({
    mode,
    battery: sim.battery,
    height: sim.pose.height,
    cone: nearCone(sim.pose, mission),
    edge: sim.edge,
    groundNudge: sim.groundNudge,
    sliding: sim.sliding,
    emptyRun: sim.emptyRun,
  })

  const liveValue = sim.complete
    ? 'Complete'
    : mode === 'manual'
      ? `${Math.round(sim.pose.height)} cm`
      : sim.running
        ? 'Running'
        : 'Ready'

  const liveLabel = sim.complete ? 'Mission 任務' : mode === 'manual' ? 'Height 高度' : 'Program 程式'

  const liveSub = (
    <span>
      {flightWord(sim.auto, sim.pose.height)} · {headingLabel(sim.pose.heading)} · {sim.visited}/
      {mission.waypoints.length} waypoints
      {distance != null ? ` · next ${distance} cm` : ''}
      {mode === 'manual' ? ` · battery ${Math.round(sim.battery)}%` : ''}
      {mode === 'program' && activeBlock
        ? ` · ${BLOCK_META[activeBlock.kind].label}`
        : ''}
    </span>
  )

  return (
    <ModuleFrame
      title="Drone / HuLA"
      kicker="HuLA EDU · Simulator"
      bilingual={
        view === 'compare'
          ? 'Compare 比較 · same mission, two ways'
          : mode === 'manual'
            ? 'Manual 手動飛行 · sticks and buttons'
            : 'Program 程式飛行 · Scratch-like blocks'
      }
      liveLabel={liveLabel}
      liveValue={liveValue}
      liveSub={liveSub}
      backLabel="← Drone"
      backTo="drone"
      nav={<DroneNav current={view} />}
    >
      <VizCard title="Indoor arena · simulator" className="drone-viz">
        <div className="chip-row drone-missions">
          {MISSIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="chip"
              aria-pressed={item.id === missionId}
              onClick={() => setMissionId(item.id)}
            >
              {item.title}
            </button>
          ))}
        </div>
        <p className="note">{mission.blurb}</p>
        {view === 'compare' ? (
          <>
            <div className="chip-row drone-tabs">
              <button
                type="button"
                className="chip"
                aria-pressed={tab === 'manual'}
                onClick={() => setTab('manual')}
              >
                Try by hand 手動
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={tab === 'program'}
                onClick={() => setTab('program')}
              >
                Run the program 程式
              </button>
            </div>
            <p className="note">
              Same mission for both. Manual is one decision after another. The program is a plan you
              run.
            </p>
          </>
        ) : null}
        <DroneArena mission={mission} pose={sim.pose} visited={sim.visited} trail={sim.trail} />
        <div className="drone-readouts">
          <div>
            <span>Height 高度</span>
            <strong>{Math.round(sim.pose.height)} cm</strong>
          </div>
          <div>
            <span>Heading 航向</span>
            <strong>{headingLabel(sim.pose.heading)}</strong>
          </div>
          <div>
            <span>Next point 下一點</span>
            <strong>{distance == null ? 'Done' : `${distance} cm`}</strong>
          </div>
        </div>
        {warning ? (
          <p className="drone-warn" role="status">
            {warning}
          </p>
        ) : null}
        {sim.complete ? (
          <p className="drone-toast" role="status">
            Path complete. You visited every waypoint in order.
            {view === 'compare'
              ? tab === 'manual'
                ? ' Now run the sample program and watch the same mission.'
                : ' The program repeated a plan. Manual flight made each move as you went.'
              : ''}
          </p>
        ) : null}
      </VizCard>
      <SideCard>
        {mode === 'manual' ? (
          <ManualControls
            battery={sim.battery}
            height={sim.pose.height}
            stickReset={sim.stickReset}
            leftRef={sim.leftRef}
            rightRef={sim.rightRef}
            onTakeoff={sim.takeoff}
            onLand={sim.land}
            onHover={sim.hover}
            onReset={sim.reset}
            onAxisDown={sim.axisDown}
            onAxisUp={sim.axisUp}
          />
        ) : (
          <ProgramControls
            missionId={missionId}
            blocks={blocks}
            running={sim.running}
            activeBlockId={sim.activeBlockId}
            onChange={setBlocks}
            onRun={sim.startProgram}
            onStop={sim.stopProgram}
            onClear={() => {
              sim.stopProgram()
              setBlocks([])
            }}
            onExample={loadExample}
          />
        )}
        <WaypointList count={mission.waypoints.length} visited={sim.visited} />
        <div className="tip">
          <strong>Teaching tip</strong>
          {mode === 'manual'
            ? 'Small stick inputs, look at the drone, and land before battery panic. A tap on a direction button is a short nudge; hold it to keep flying.'
            : 'Plan units carefully and test short sequences. The real HuLA APP Program Lab uses Scratch on the actual aircraft Wi‑Fi. This page only moves the picture.'}
        </div>
        <p className="note">Simulator only. A real HuLA flight needs clear indoor space and an adult.</p>
      </SideCard>
      {view === 'compare' ? (
        <section className="card side-card drone-span">
          <p className="panel-title">Reflect 想一想</p>
          <p className="note">
            Talk about these after you have tried the mission both ways. Sample answers stay hidden
            until you ask for them.
          </p>
          {REFLECTIONS.map((item, index) => (
            <div key={item.zh} className="drone-reflect">
              <p>
                <strong>{item.q}</strong>
                <span className="bilingual"> {item.zh}</span>
              </p>
              <button
                type="button"
                className="play-btn ghost"
                aria-expanded={openPrompt === index}
                onClick={() => setOpenPrompt((cur) => (cur === index ? null : index))}
              >
                {openPrompt === index ? 'Hide sample answer' : 'Show a sample answer'}
              </button>
              {openPrompt === index ? <p className="drone-answer">{item.a}</p> : null}
            </div>
          ))}
        </section>
      ) : null}
    </ModuleFrame>
  )
}

function flightWord(auto: AutoMode, height: number) {
  if (auto === 'takeoff') return 'Taking off'
  if (auto === 'land') return 'Landing'
  if (height < 8) return 'Landed'
  return 'In the air'
}

function pickWarning({
  mode,
  battery,
  height,
  cone,
  edge,
  groundNudge,
  sliding,
  emptyRun,
}: {
  mode: 'manual' | 'program'
  battery: number
  height: number
  cone: boolean
  edge: boolean
  groundNudge: boolean
  sliding: boolean
  emptyRun: boolean
}) {
  if (mode === 'manual' && battery <= 0) {
    return 'Battery empty. On a real HuLA, land before the aircraft drops.'
  }
  if (mode === 'manual' && battery <= 25 && height > 5) {
    return 'Land soon — battery is low. Do this before a real flight gets urgent.'
  }
  if (cone) return 'Close to a cone. Real propellers need clear space around them.'
  if (edge) return 'Arena edge. An indoor room has walls — stay inside the open space.'
  if (mode === 'manual' && groundNudge) {
    return 'Take off before you fly. Sticks do not move a drone that is still on the pad.'
  }
  if (sliding) return 'Still on the pad. Add Take off before Move forward, then run the script again.'
  if (emptyRun) return 'Add at least one block, or load an example.'
  return null
}

function ManualControls({
  battery,
  height,
  stickReset,
  leftRef,
  rightRef,
  onTakeoff,
  onLand,
  onHover,
  onReset,
  onAxisDown,
  onAxisUp,
}: {
  battery: number
  height: number
  stickReset: number
  leftRef: { current: { x: number; y: number } }
  rightRef: { current: { x: number; y: number } }
  onTakeoff: () => void
  onLand: () => void
  onHover: () => void
  onReset: () => void
  onAxisDown: (axis: 'pitch' | 'roll' | 'yaw' | 'throttle', sign: 1 | -1) => void
  onAxisUp: (axis: 'pitch' | 'roll' | 'yaw' | 'throttle') => void
}) {
  const low = battery <= 25
  return (
    <>
      <p className="panel-title">Manual controls 手動</p>
      <div className="drone-commands">
        <button type="button" className="play-btn" onClick={onTakeoff} disabled={battery <= 0}>
          Take off 起飛
        </button>
        <button type="button" className="play-btn ghost" onClick={onHover}>
          Hover 懸停
        </button>
        <button type="button" className="play-btn ghost" onClick={onLand}>
          Land 降落
        </button>
        <button type="button" className="play-btn ghost" onClick={onReset}>
          Reset
        </button>
      </div>
      <div className="drone-battery" aria-label={`Battery ${Math.round(battery)} percent`}>
        <span>Battery 電量</span>
        <div className="drone-battery-track">
          <div
            className={`drone-battery-fill${low ? ' low' : ''}`}
            style={{ width: `${Math.max(0, Math.min(100, battery))}%` }}
          />
        </div>
        <strong>{Math.round(battery)}%</strong>
      </div>
      <Mode2Diagram />
      <div className="drone-stick-row">
        <StickPad
          label="Left stick"
          hand="左手 · height and yaw"
          vert="↑ climb · ↓ descend"
          horiz="← yaw left · yaw right →"
          valueRef={leftRef}
          resetToken={stickReset}
        />
        <StickPad
          label="Right stick"
          hand="右手 · pitch and roll"
          vert="↑ forward · ↓ back"
          horiz="← strafe left · strafe right →"
          valueRef={rightRef}
          resetToken={stickReset}
        />
      </div>
      <p className="panel-title">Or use buttons 按鈕</p>
      <div className="drone-pad">
        <HoldButton label="Yaw left" zh="左轉" axis="yaw" sign={-1} onDown={onAxisDown} onUp={onAxisUp} />
        <HoldButton label="Forward" zh="前進" axis="pitch" sign={1} onDown={onAxisDown} onUp={onAxisUp} />
        <HoldButton label="Yaw right" zh="右轉" axis="yaw" sign={1} onDown={onAxisDown} onUp={onAxisUp} />
        <HoldButton label="Strafe left" zh="左移" axis="roll" sign={-1} onDown={onAxisDown} onUp={onAxisUp} />
        <HoldButton label="Back" zh="後退" axis="pitch" sign={-1} onDown={onAxisDown} onUp={onAxisUp} />
        <HoldButton label="Strafe right" zh="右移" axis="roll" sign={1} onDown={onAxisDown} onUp={onAxisUp} />
      </div>
      <p className="note">
        {height < 12
          ? 'Take off, then fly to the glowing point. Waypoints count only in order, and only while you are in the air.'
          : 'The red nose is forward. Visit the glowing waypoint, then the next one.'}
      </p>
    </>
  )
}

function ProgramControls({
  missionId,
  blocks,
  running,
  activeBlockId,
  onChange,
  onRun,
  onStop,
  onClear,
  onExample,
}: {
  missionId: MissionId
  blocks: Block[]
  running: boolean
  activeBlockId: string | null
  onChange: (blocks: Block[]) => void
  onRun: () => void
  onStop: () => void
  onClear: () => void
  onExample: (id: MissionId) => void
}) {
  return (
    <>
      <p className="panel-title">Program controls 程式</p>
      <div className="drone-commands">
        <button type="button" className="play-btn" onClick={onRun} disabled={running}>
          Run
        </button>
        <button type="button" className="play-btn ghost" onClick={onStop} disabled={!running}>
          Stop
        </button>
        <button type="button" className="play-btn ghost" onClick={onClear}>
          Clear
        </button>
      </div>
      <p className="note">Run always starts on the pad. Stop leaves the drone where it is.</p>
      <p className="panel-title">Example programs 範例</p>
      <div className="drone-examples">
        {EXAMPLES.map((example) => (
          <button
            key={example.id}
            type="button"
            className="drone-example"
            disabled={running}
            onClick={() => onExample(example.id)}
          >
            <strong>
              {example.title} <span className="bilingual">{example.bilingual}</span>
            </strong>
            <span>{example.detail}</span>
          </button>
        ))}
      </div>
      <DroneBlocks
        key={missionId}
        blocks={blocks}
        onChange={onChange}
        activeBlockId={activeBlockId}
        disabled={running}
      />
    </>
  )
}

function WaypointList({ count, visited }: { count: number; visited: number }) {
  return (
    <div>
      <p className="panel-title">Waypoints in order 航點</p>
      <ol className="drone-wps">
        {Array.from({ length: count }, (_, index) => {
          const state = index < visited ? 'done' : index === visited ? 'current' : 'later'
          const text = state === 'done' ? 'Visited' : state === 'current' ? 'Fly here' : 'Later'
          return (
            <li key={index} className={`drone-wp-item ${state}`}>
              <span>Point {index + 1}</span>
              <strong>{text}</strong>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
