import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BATTERY_S,
  BURST_S,
  ZERO_AXES,
  advanceRunner,
  captureWaypoints,
  findBlock,
  flatten,
  integrateManual,
  poseFor,
  type AutoMode,
  type Axes,
  type Block,
  type DronePose,
  type Mission,
  type Runner,
} from '../lib/drone'

type Stick = { x: number; y: number }
type Mode = 'manual' | 'program'

const ZERO_STICK: Stick = { x: 0, y: 0 }

function pick(held: number, burst: number, stick: number) {
  if (held !== 0) return held
  if (burst !== 0) return burst
  return stick
}

export function useDroneSim({
  mode,
  mission,
  blocks,
  active,
}: {
  mode: Mode
  mission: Mission
  blocks: Block[]
  active: boolean
}) {
  const missionRef = useRef(mission)
  missionRef.current = mission
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks
  const modeRef = useRef(mode)
  modeRef.current = mode

  const poseRef = useRef<DronePose>(poseFor(mission))
  const visitedRef = useRef(0)
  const batteryRef = useRef(100)
  const autoRef = useRef<AutoMode>('none')
  const trailRef = useRef<{ x: number; y: number }[]>([])
  const runnerRef = useRef<Runner | null>(null)
  const runningRef = useRef(false)
  const completeRef = useRef(false)
  const leftRef = useRef<Stick>({ ...ZERO_STICK })
  const rightRef = useRef<Stick>({ ...ZERO_STICK })
  const buttonsRef = useRef<Axes>({ ...ZERO_AXES })
  const burstRef = useRef<{ t: number; axes: Axes }>({ t: 0, axes: { ...ZERO_AXES } })
  const downAt = useRef<Partial<Record<keyof Axes, number>>>({})
  const groundNudgeRef = useRef(false)
  const publishedAuto = useRef<AutoMode>('none')

  const [pose, setPose] = useState<DronePose>(poseRef.current)
  const [visited, setVisited] = useState(0)
  const [battery, setBattery] = useState(100)
  const [auto, setAuto] = useState<AutoMode>('none')
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([])
  const [running, setRunning] = useState(false)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [complete, setComplete] = useState(false)
  const [emptyRun, setEmptyRun] = useState(false)
  const [groundNudge, setGroundNudge] = useState(false)
  const [edge, setEdge] = useState(false)
  const [stickReset, setStickReset] = useState(0)
  const edgeTimer = useRef<number | null>(null)

  const publishPose = (next: DronePose, nextVisited: number) => {
    poseRef.current = next
    visitedRef.current = nextVisited
    setPose(next)
    setVisited(nextVisited)
    if (nextVisited >= missionRef.current.waypoints.length && !completeRef.current) {
      completeRef.current = true
      setComplete(true)
    }
  }

  const rememberTrail = (next: DronePose) => {
    if (next.height < 8) return
    const prev = trailRef.current[trailRef.current.length - 1]
    if (prev && Math.hypot(prev.x - next.x, prev.y - next.y) < 4) return
    trailRef.current = [...trailRef.current, { x: next.x, y: next.y }].slice(-220)
    setTrail(trailRef.current)
  }

  const reset = useCallback(() => {
    const origin = poseFor(missionRef.current)
    poseRef.current = origin
    visitedRef.current = 0
    batteryRef.current = 100
    autoRef.current = 'none'
    publishedAuto.current = 'none'
    trailRef.current = []
    runnerRef.current = null
    runningRef.current = false
    completeRef.current = false
    groundNudgeRef.current = false
    buttonsRef.current = { ...ZERO_AXES }
    burstRef.current = { t: 0, axes: { ...ZERO_AXES } }
    downAt.current = {}
    leftRef.current = { ...ZERO_STICK }
    rightRef.current = { ...ZERO_STICK }
    setPose(origin)
    setVisited(0)
    setBattery(100)
    setAuto('none')
    setTrail([])
    setRunning(false)
    setActiveBlockId(null)
    setComplete(false)
    setEmptyRun(false)
    setGroundNudge(false)
    setEdge(false)
    setStickReset((n) => n + 1)
  }, [])

  useEffect(() => {
    reset()
  }, [mission.id, mode, reset])

  const markEdge = () => {
    setEdge(true)
    if (edgeTimer.current) window.clearTimeout(edgeTimer.current)
    edgeTimer.current = window.setTimeout(() => setEdge(false), 1600)
  }

  useEffect(() => {
    if (!active) return
    if (mode === 'program' && !running) return
    let frame = 0
    let last = performance.now()
    let alive = true

    const tick = (now: number) => {
      if (!alive) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const currentMission = missionRef.current

      if (modeRef.current === 'manual') {
        const burst = burstRef.current
        const held = buttonsRef.current
        const burstAxes = burst.t > 0 ? burst.axes : ZERO_AXES
        const input: Axes = {
          pitch: pick(held.pitch, burstAxes.pitch, rightRef.current.y),
          roll: pick(held.roll, burstAxes.roll, rightRef.current.x),
          yaw: pick(held.yaw, burstAxes.yaw, leftRef.current.x),
          throttle: pick(held.throttle, burstAxes.throttle, leftRef.current.y),
        }
        let autoMode = autoRef.current
        if (batteryRef.current <= 0 && poseRef.current.height > 0) autoMode = 'land'
        const stepped = integrateManual(poseRef.current, input, autoMode, dt)
        if (stepped.auto !== publishedAuto.current) {
          publishedAuto.current = stepped.auto
          setAuto(stepped.auto)
        }
        autoRef.current = stepped.auto
        if (burst.t > 0 && stepped.auto !== 'takeoff') burst.t = Math.max(0, burst.t - dt)
        if (stepped.hitEdge) markEdge()
        const pushing =
          input.pitch !== 0 || input.roll !== 0 || input.yaw !== 0 || input.throttle > 0.2
        if (stepped.pose.height < 12 && pushing && stepped.auto === 'none') {
          if (!groundNudgeRef.current) {
            groundNudgeRef.current = true
            setGroundNudge(true)
          }
        } else if (stepped.pose.height >= 12 && groundNudgeRef.current) {
          groundNudgeRef.current = false
          setGroundNudge(false)
        }
        if (stepped.pose.height > 5) {
          batteryRef.current = Math.max(0, batteryRef.current - dt * (100 / BATTERY_S))
          const shown = Math.ceil(batteryRef.current)
          setBattery((cur) => (Math.ceil(cur) === shown ? cur : batteryRef.current))
        }
        const nextVisited = captureWaypoints(stepped.pose, currentMission, visitedRef.current)
        const prev = poseRef.current
        const moved =
          Math.abs(stepped.pose.x - prev.x) > 0.15 ||
          Math.abs(stepped.pose.y - prev.y) > 0.15 ||
          Math.abs(stepped.pose.heading - prev.heading) > 0.15 ||
          Math.abs(stepped.pose.height - prev.height) > 0.15 ||
          nextVisited !== visitedRef.current
        if (moved) {
          rememberTrail(stepped.pose)
          publishPose(stepped.pose, nextVisited)
        }
      } else if (runningRef.current && runnerRef.current) {
        const next = advanceRunner(runnerRef.current, dt)
        runnerRef.current = next.runner
        const nextVisited = captureWaypoints(next.pose, currentMission, visitedRef.current)
        rememberTrail(next.pose)
        publishPose(next.pose, nextVisited)
        setActiveBlockId(next.activeBlockId)
        if (next.done) {
          runningRef.current = false
          setRunning(false)
          return
        }
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => {
      alive = false
      cancelAnimationFrame(frame)
    }
  }, [active, mode, running])

  const axisDown = (axis: keyof Axes, sign: 1 | -1) => {
    buttonsRef.current[axis] = sign
    downAt.current[axis] = performance.now()
  }

  const axisUp = (axis: keyof Axes) => {
    const started = downAt.current[axis]
    if (started == null) return
    const sign = buttonsRef.current[axis]
    delete downAt.current[axis]
    buttonsRef.current[axis] = 0
    if (performance.now() - started < 320 && sign !== 0) {
      burstRef.current = {
        t: BURST_S,
        axes: { ...ZERO_AXES, [axis]: sign },
      }
    }
  }

  const takeoff = () => {
    if (batteryRef.current <= 0) return
    autoRef.current = 'takeoff'
    publishedAuto.current = 'takeoff'
    setAuto('takeoff')
    groundNudgeRef.current = false
    setGroundNudge(false)
  }

  const land = () => {
    autoRef.current = 'land'
    publishedAuto.current = 'land'
    setAuto('land')
    burstRef.current = { t: 0, axes: { ...ZERO_AXES } }
    buttonsRef.current = { ...ZERO_AXES }
  }

  const hover = () => {
    autoRef.current = 'none'
    publishedAuto.current = 'none'
    setAuto('none')
    buttonsRef.current = { ...ZERO_AXES }
    burstRef.current = { t: 0, axes: { ...ZERO_AXES } }
    downAt.current = {}
    setStickReset((n) => n + 1)
  }

  const startProgram = () => {
    const steps = flatten(blocksRef.current)
    if (steps.length === 0) {
      setEmptyRun(true)
      return
    }
    const origin = poseFor(missionRef.current)
    poseRef.current = origin
    visitedRef.current = 0
    trailRef.current = []
    completeRef.current = false
    runnerRef.current = { steps, index: 0, elapsed: 0, origin }
    runningRef.current = true
    setEmptyRun(false)
    setPose(origin)
    setVisited(0)
    setTrail([])
    setComplete(false)
    setActiveBlockId(steps[0].blockId)
    setRunning(true)
  }

  const stopProgram = () => {
    runningRef.current = false
    runnerRef.current = null
    setRunning(false)
    setActiveBlockId(null)
  }

  useEffect(() => {
    return () => {
      if (edgeTimer.current) window.clearTimeout(edgeTimer.current)
    }
  }, [])

  const sliding =
    mode === 'program' &&
    running &&
    pose.height < 12 &&
    findBlock(blocks, activeBlockId)?.kind === 'forward'

  return {
    pose,
    visited,
    battery,
    auto,
    trail,
    running,
    activeBlockId,
    complete,
    emptyRun,
    groundNudge,
    edge,
    sliding,
    stickReset,
    leftRef,
    rightRef,
    reset,
    axisDown,
    axisUp,
    takeoff,
    land,
    hover,
    startProgram,
    stopProgram,
  }
}
