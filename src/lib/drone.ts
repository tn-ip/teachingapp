/** HuLA-style indoor drone simulator. Centimetres and degrees, top-down. */

export type DroneView = 'manual' | 'program' | 'compare'

export type MissionId = 'hop' | 'square' | 'lshape' | 'line'

export type DronePose = {
  x: number
  y: number
  /** Degrees clockwise from north (up on the arena). */
  heading: number
  /** Centimetres above the floor. 0 is landed. */
  height: number
}

export type Waypoint = { id: string; x: number; y: number; label: string }
export type Cone = { x: number; y: number; r: number }

export type Mission = {
  id: MissionId
  title: string
  bilingual: string
  blurb: string
  /** Straight-leg length used by the matching example program. */
  legCm: number
  start: { x: number; y: number; heading: number }
  waypoints: Waypoint[]
  cones: Cone[]
}

export const ARENA = { w: 400, h: 320 }
export const HOVER_CM = 80
export const MAX_HEIGHT = 120
export const WAYPOINT_R = 36
export const BATTERY_S = 240
export const MANUAL_CM_S = 72
export const YAW_DPS = 105
export const CLIMB_CM_S = 70
export const BURST_S = 0.88
export const PROGRAM_CM_S = 100
export const PROGRAM_TURN_DPS = 160
export const TAKEOFF_S = 0.95
export const LAND_S = 0.95
export const GRID_CM = 50

export const MISSIONS: Mission[] = [
  {
    id: 'hop',
    title: 'First hop',
    bilingual: '起飛 · 前進 · 降落',
    blurb: 'Leave the pad, fly straight to one glowing point, and land.',
    legCm: 80,
    start: { x: 200, y: 250, heading: 0 },
    waypoints: [{ id: 'h1', x: 200, y: 170, label: '1' }],
    cones: [{ x: 300, y: 210, r: 16 }],
  },
  {
    id: 'square',
    title: 'Square patrol',
    bilingual: '正方形',
    blurb: 'Visit the four corners in order. The cone stays in the middle — fly the outside path.',
    legCm: 150,
    start: { x: 80, y: 250, heading: 0 },
    waypoints: [
      { id: 's1', x: 80, y: 100, label: '1' },
      { id: 's2', x: 230, y: 100, label: '2' },
      { id: 's3', x: 230, y: 250, label: '3' },
      { id: 's4', x: 80, y: 250, label: '4' },
    ],
    cones: [{ x: 155, y: 175, r: 18 }],
  },
  {
    id: 'lshape',
    title: 'L around a cone',
    bilingual: 'L 形繞錐',
    blurb: 'Fly up the long arm, turn right, then along the top. The cone sits inside the corner.',
    legCm: 160,
    start: { x: 70, y: 260, heading: 0 },
    waypoints: [
      { id: 'l1', x: 70, y: 100, label: '1' },
      { id: 'l2', x: 230, y: 100, label: '2' },
    ],
    cones: [{ x: 145, y: 175, r: 18 }],
  },
  {
    id: 'line',
    title: 'Line patrol',
    bilingual: '直線巡邏',
    blurb: 'The nose already points east. Fly the corridor and visit each point in order.',
    legCm: 100,
    start: { x: 40, y: 160, heading: 90 },
    waypoints: [
      { id: 'p1', x: 140, y: 160, label: '1' },
      { id: 'p2', x: 240, y: 160, label: '2' },
      { id: 'p3', x: 340, y: 160, label: '3' },
    ],
    cones: [
      { x: 140, y: 96, r: 14 },
      { x: 240, y: 224, r: 14 },
      { x: 340, y: 96, r: 14 },
    ],
  },
]

export const DRONE_LABS: {
  id: Exclude<DroneView, never>
  index: string
  title: string
  bilingual: string
  blurb: string
  tip: string
}[] = [
  {
    id: 'manual',
    index: '01 · Hands on',
    title: 'Manual flight',
    bilingual: '手動飛行',
    blurb: 'Take off, then fly the glowing points with sticks or big buttons. You decide every moment.',
    tip: 'Small stick inputs. Look at the drone. Land before the battery runs out.',
  },
  {
    id: 'program',
    index: '02 · Plan then run',
    title: 'Program flight',
    bilingual: '程式飛行',
    blurb: 'Stack Scratch-like blocks: take off, move, turn, wait, repeat, land. Then press Run.',
    tip: 'Plan the centimetres and degrees. Test a short script before a long one. The real HuLA APP Program Lab uses Scratch on the aircraft Wi‑Fi.',
  },
  {
    id: 'compare',
    index: '03 · Same mission',
    title: 'Compare',
    bilingual: '手動 vs 程式',
    blurb: 'Fly one mission by hand, then run the sample program on the same path.',
    tip: 'Manual is a stream of decisions. A program is a plan you can run again.',
  },
]

export function missionById(id: MissionId): Mission {
  return MISSIONS.find((m) => m.id === id) ?? MISSIONS[1]
}

export function poseFor(mission: Mission): DronePose {
  return {
    x: mission.start.x,
    y: mission.start.y,
    heading: mission.start.heading,
    height: 0,
  }
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function normalizeHeading(deg: number) {
  return ((deg % 360) + 360) % 360
}

const HEADING_NAMES = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

export function headingLabel(deg: number) {
  const d = normalizeHeading(deg)
  const name = HEADING_NAMES[Math.round(d / 45) % 8]
  return `${Math.round(d)}° ${name}`
}

/** Screen axes: +x east, +y south. Heading 0 faces north. */
export function forwardVector(heading: number) {
  const h = (heading * Math.PI) / 180
  return { x: Math.sin(h), y: -Math.cos(h) }
}

export function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

export function clampPose(pose: DronePose): DronePose {
  const margin = 18
  return {
    x: clamp(pose.x, margin, ARENA.w - margin),
    y: clamp(pose.y, margin, ARENA.h - margin),
    heading: normalizeHeading(pose.heading),
    height: clamp(pose.height, 0, MAX_HEIGHT),
  }
}

export function captureWaypoints(pose: DronePose, mission: Mission, visited: number) {
  if (visited >= mission.waypoints.length) return visited
  if (pose.height < 12) return visited
  const wp = mission.waypoints[visited]
  if (dist(pose.x, pose.y, wp.x, wp.y) <= WAYPOINT_R) return visited + 1
  return visited
}

export function nextWaypointDistance(pose: DronePose, mission: Mission, visited: number) {
  const wp = mission.waypoints[visited]
  if (!wp) return null
  return Math.round(dist(pose.x, pose.y, wp.x, wp.y))
}

export function nearCone(pose: DronePose, mission: Mission) {
  if (pose.height < 8) return false
  return mission.cones.some((c) => dist(pose.x, pose.y, c.x, c.y) < c.r + 26)
}

export type Axes = { pitch: number; roll: number; yaw: number; throttle: number }
export type AutoMode = 'none' | 'takeoff' | 'land'

export const ZERO_AXES: Axes = { pitch: 0, roll: 0, yaw: 0, throttle: 0 }

export function integrateManual(
  pose: DronePose,
  input: Axes,
  auto: AutoMode,
  dt: number,
): { pose: DronePose; auto: AutoMode; hitEdge: boolean } {
  let nextAuto = auto
  let next = { ...pose }

  if (nextAuto === 'takeoff') {
    next.height = Math.min(HOVER_CM, next.height + CLIMB_CM_S * dt)
    if (next.height >= HOVER_CM - 0.4) {
      next.height = HOVER_CM
      nextAuto = 'none'
    }
    return { pose: clampPose(next), auto: nextAuto, hitEdge: false }
  }

  if (nextAuto === 'land') {
    next.height = Math.max(0, next.height - CLIMB_CM_S * dt)
    if (next.height <= 0.4) {
      next.height = 0
      nextAuto = 'none'
    }
    return { pose: clampPose(next), auto: nextAuto, hitEdge: false }
  }

  if (next.height <= 0.5 && input.throttle > 0.55) {
    return { pose: next, auto: 'takeoff', hitEdge: false }
  }

  if (next.height > 0) {
    next.height = clamp(next.height + input.throttle * 48 * dt, 0, MAX_HEIGHT)
  }

  let hitEdge = false
  if (next.height >= 12) {
    const heading = next.heading + input.yaw * YAW_DPS * dt
    const fwd = forwardVector(heading)
    const right = forwardVector(heading + 90)
    const raw = {
      ...next,
      heading,
      x: next.x + (fwd.x * input.pitch + right.x * input.roll) * MANUAL_CM_S * dt,
      y: next.y + (fwd.y * input.pitch + right.y * input.roll) * MANUAL_CM_S * dt,
    }
    const bounded = clampPose(raw)
    hitEdge =
      Math.abs(bounded.x - raw.x) > 0.4 || Math.abs(bounded.y - raw.y) > 0.4
    next = bounded
  } else {
    next = clampPose(next)
  }

  return { pose: next, auto: nextAuto, hitEdge }
}

export type BlockKind =
  | 'takeoff'
  | 'land'
  | 'forward'
  | 'turnLeft'
  | 'turnRight'
  | 'wait'
  | 'repeat'

export type Block = {
  id: string
  kind: BlockKind
  cm: number
  deg: number
  seconds: number
  times: number
  body: Block[]
}

export const BLOCK_META: Record<
  BlockKind,
  { label: string; zh: string; tone: 'coral' | 'teal' | 'blue' | 'gold' | 'violet' }
> = {
  takeoff: { label: 'Take off', zh: '起飛', tone: 'coral' },
  land: { label: 'Land', zh: '降落', tone: 'coral' },
  forward: { label: 'Move forward', zh: '前進', tone: 'teal' },
  turnLeft: { label: 'Turn left', zh: '左轉', tone: 'blue' },
  turnRight: { label: 'Turn right', zh: '右轉', tone: 'blue' },
  wait: { label: 'Wait', zh: '等待', tone: 'gold' },
  repeat: { label: 'Repeat', zh: '重複', tone: 'violet' },
}

export const PALETTE: BlockKind[] = [
  'takeoff',
  'land',
  'forward',
  'turnLeft',
  'turnRight',
  'wait',
  'repeat',
]

let blockSeq = 0

export function blockId() {
  blockSeq += 1
  return `b${blockSeq}`
}

export function makeBlock(kind: BlockKind, extra?: Partial<Omit<Block, 'id' | 'kind'>>): Block {
  return {
    id: blockId(),
    kind,
    cm: extra?.cm ?? 50,
    deg: extra?.deg ?? 90,
    seconds: extra?.seconds ?? 1,
    times: extra?.times ?? 4,
    body: extra?.body ?? [],
  }
}

export function exampleBlocks(id: MissionId): Block[] {
  const leg = missionById(id).legCm
  const takeoff = () => makeBlock('takeoff')
  const land = () => makeBlock('land')
  const forward = (cm: number) => makeBlock('forward', { cm })
  const turnRight = (deg: number) => makeBlock('turnRight', { deg })
  const repeat = (times: number, body: Block[]) => makeBlock('repeat', { times, body })

  if (id === 'hop') return [takeoff(), forward(leg), land()]
  if (id === 'square') return [takeoff(), repeat(4, [forward(leg), turnRight(90)]), land()]
  if (id === 'lshape') return [takeoff(), forward(leg), turnRight(90), forward(leg), land()]
  return [takeoff(), repeat(3, [forward(leg)]), land()]
}

export const EXAMPLES: { id: MissionId; title: string; bilingual: string; detail: string }[] = [
  {
    id: 'hop',
    title: 'First hop',
    bilingual: '起飛 · 前進 · 降落',
    detail: 'Take off, move forward 80 cm, land.',
  },
  {
    id: 'square',
    title: 'Square path',
    bilingual: '正方形',
    detail: 'Repeat four times: forward 150 cm, turn right 90°.',
  },
  {
    id: 'lshape',
    title: 'L around a cone',
    bilingual: 'L 形繞錐',
    detail: 'Forward 160 cm, turn right 90°, forward 160 cm.',
  },
  {
    id: 'line',
    title: 'Line patrol',
    bilingual: '直線巡邏',
    detail: 'Repeat three times: forward 100 cm along the corridor.',
  },
]

export function updateBlock(
  blocks: Block[],
  id: string,
  patch: Partial<Pick<Block, 'cm' | 'deg' | 'seconds' | 'times'>>,
): Block[] {
  return blocks.map((b) => {
    if (b.id === id) return { ...b, ...patch }
    if (b.body.length === 0) return b
    return { ...b, body: updateBlock(b.body, id, patch) }
  })
}

export function removeBlock(blocks: Block[], id: string): Block[] {
  return blocks
    .filter((b) => b.id !== id)
    .map((b) => ({ ...b, body: removeBlock(b.body, id) }))
}

export function moveBlock(blocks: Block[], id: string, dir: -1 | 1): Block[] {
  const idx = blocks.findIndex((b) => b.id === id)
  if (idx !== -1) {
    const next = idx + dir
    if (next < 0 || next >= blocks.length) return blocks
    const copy = blocks.slice()
    const [item] = copy.splice(idx, 1)
    copy.splice(next, 0, item)
    return copy
  }
  return blocks.map((b) => (b.body.length ? { ...b, body: moveBlock(b.body, id, dir) } : b))
}

export function insertBlock(blocks: Block[], block: Block, parentId: string | null): Block[] {
  if (parentId === null) return [...blocks, block]
  return blocks.map((b) => {
    if (b.id === parentId && b.kind === 'repeat') return { ...b, body: [...b.body, block] }
    return { ...b, body: insertBlock(b.body, block, parentId) }
  })
}

export function findBlock(blocks: Block[], id: string | null): Block | null {
  if (!id) return null
  for (const b of blocks) {
    if (b.id === id) return b
    const inner = findBlock(b.body, id)
    if (inner) return inner
  }
  return null
}

export function blockContains(block: Block, id: string | null): boolean {
  if (!id) return false
  if (block.id === id) return true
  return block.body.some((child) => blockContains(child, id))
}

export type Step =
  | { kind: 'takeoff'; blockId: string }
  | { kind: 'land'; blockId: string }
  | { kind: 'forward'; cm: number; blockId: string }
  | { kind: 'turn'; deg: number; blockId: string }
  | { kind: 'wait'; s: number; blockId: string }

export function flatten(blocks: Block[], depth = 0): Step[] {
  const out: Step[] = []
  for (const b of blocks) {
    if (b.kind === 'repeat') {
      if (depth >= 2) continue
      const inner = flatten(b.body, depth + 1)
      const times = clamp(Math.round(b.times), 1, 8)
      for (let i = 0; i < times; i += 1) out.push(...inner)
      continue
    }
    if (b.kind === 'takeoff') out.push({ kind: 'takeoff', blockId: b.id })
    else if (b.kind === 'land') out.push({ kind: 'land', blockId: b.id })
    else if (b.kind === 'forward') out.push({ kind: 'forward', cm: clamp(b.cm, 10, 300), blockId: b.id })
    else if (b.kind === 'turnLeft') out.push({ kind: 'turn', deg: -clamp(b.deg, 15, 180), blockId: b.id })
    else if (b.kind === 'turnRight') out.push({ kind: 'turn', deg: clamp(b.deg, 15, 180), blockId: b.id })
    else out.push({ kind: 'wait', s: clamp(b.seconds, 0.5, 5), blockId: b.id })
    if (out.length > 240) break
  }
  return out.slice(0, 240)
}

export function stepDuration(step: Step) {
  if (step.kind === 'takeoff') return TAKEOFF_S
  if (step.kind === 'land') return LAND_S
  if (step.kind === 'forward') return step.cm / PROGRAM_CM_S
  if (step.kind === 'turn') return Math.abs(step.deg) / PROGRAM_TURN_DPS
  return step.s
}

export function poseAlong(origin: DronePose, step: Step, u: number): DronePose {
  const t = clamp(u, 0, 1)
  if (step.kind === 'takeoff') {
    return { ...origin, height: origin.height + (HOVER_CM - origin.height) * t }
  }
  if (step.kind === 'land') {
    return { ...origin, height: origin.height * (1 - t) }
  }
  if (step.kind === 'forward') {
    const dir = forwardVector(origin.heading)
    const moved = step.cm * t
    return { ...origin, x: origin.x + dir.x * moved, y: origin.y + dir.y * moved }
  }
  if (step.kind === 'turn') {
    return { ...origin, heading: origin.heading + step.deg * t }
  }
  return origin
}

export type Runner = {
  steps: Step[]
  index: number
  elapsed: number
  origin: DronePose
}

export function advanceRunner(runner: Runner, dt: number): {
  runner: Runner
  pose: DronePose
  done: boolean
  activeBlockId: string | null
} {
  if (runner.index >= runner.steps.length) {
    return { runner, pose: clampPose(runner.origin), done: true, activeBlockId: null }
  }
  const step = runner.steps[runner.index]
  const elapsed = runner.elapsed + dt
  const dur = stepDuration(step)
  if (elapsed >= dur - 1e-6) {
    const end = clampPose(poseAlong(runner.origin, step, 1))
    const index = runner.index + 1
    const done = index >= runner.steps.length
    return {
      runner: { steps: runner.steps, index, elapsed: 0, origin: end },
      pose: end,
      done,
      activeBlockId: done ? null : runner.steps[index].blockId,
    }
  }
  const u = dur <= 0 ? 1 : elapsed / dur
  return {
    runner: { ...runner, elapsed },
    pose: clampPose(poseAlong(runner.origin, step, u)),
    done: false,
    activeBlockId: step.blockId,
  }
}

/** Fast-forward a script. Used to confirm example missions reach every waypoint. */
export function simulateProgram(mission: Mission, blocks: Block[], dt = 1 / 40) {
  const steps = flatten(blocks)
  let runner: Runner = { steps, index: 0, elapsed: 0, origin: poseFor(mission) }
  let pose = runner.origin
  let visited = 0
  let guard = 0
  let done = steps.length === 0
  while (!done && guard < 30000) {
    const next = advanceRunner(runner, dt)
    runner = next.runner
    pose = next.pose
    visited = captureWaypoints(pose, mission, visited)
    done = next.done
    guard += 1
  }
  return { visited, pose, steps: steps.length, done }
}

export function roundTo(n: number, step: number) {
  const scaled = Math.round(n / step)
  return Math.round(scaled * step * 1000) / 1000
}
