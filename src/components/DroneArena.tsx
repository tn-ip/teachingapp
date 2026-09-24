import { useId } from 'react'
import {
  ARENA,
  GRID_CM,
  WAYPOINT_R,
  type DronePose,
  type Mission,
} from '../lib/drone'

type Point = { x: number; y: number }

type DroneArenaProps = {
  mission: Mission
  pose: DronePose
  visited: number
  trail: Point[]
}

export function DroneArena({ mission, pose, visited, trail }: DroneArenaProps) {
  const uid = useId().replace(/:/g, '')
  const glow = `drone-glow-${uid}`
  const points = mission.waypoints.map((wp) => `${wp.x},${wp.y}`).join(' ')
  const trailPoints = trail.map((p) => `${p.x},${p.y}`).join(' ')
  const lift = pose.height * 0.12

  return (
    <div className="drone-arena">
      <svg
        className="drone-svg"
        viewBox={`0 0 ${ARENA.w} ${ARENA.h}`}
        role="img"
        aria-label={`Top-down arena. Drone height ${Math.round(pose.height)} centimetres. ${visited} of ${mission.waypoints.length} waypoints visited.`}
      >
        <defs>
          <filter id={glow} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width={ARENA.w} height={ARENA.h} rx="16" fill="#e7f3ee" />
        {Array.from({ length: Math.floor(ARENA.w / GRID_CM) + 1 }, (_, i) => (
          <line
            key={`v${i}`}
            className="drone-grid"
            x1={i * GRID_CM}
            y1={0}
            x2={i * GRID_CM}
            y2={ARENA.h}
          />
        ))}
        {Array.from({ length: Math.floor(ARENA.h / GRID_CM) + 1 }, (_, i) => (
          <line
            key={`h${i}`}
            className="drone-grid"
            x1={0}
            y1={i * GRID_CM}
            x2={ARENA.w}
            y2={i * GRID_CM}
          />
        ))}
        <polyline className="drone-path-glow" points={points} filter={`url(#${glow})`} />
        <polyline className="drone-path" points={points} />
        <g transform={`translate(${mission.start.x} ${mission.start.y})`}>
          <circle r="26" fill="#d5efe8" stroke="#0f6e67" strokeWidth="2.5" />
          <text className="drone-pad-label" y="1">
            H
          </text>
          <text className="drone-pad-caption" y="40">
            start
          </text>
        </g>
        {mission.cones.map((cone) => (
          <g key={`${cone.x}-${cone.y}`} transform={`translate(${cone.x} ${cone.y})`}>
            <ellipse cx="0" cy="6" rx={cone.r * 0.85} ry={cone.r * 0.32} fill="rgba(26,35,48,0.16)" />
            <polygon
              points={`0,${-cone.r - 4} ${cone.r * 0.78},${cone.r * 0.55} ${-cone.r * 0.78},${cone.r * 0.55}`}
              fill="#c4451a"
            />
            <polygon
              points={`0,${-cone.r - 4} ${cone.r * 0.22},${cone.r * 0.55} ${-cone.r * 0.22},${cone.r * 0.55}`}
              fill="#f0a07a"
            />
          </g>
        ))}
        {mission.waypoints.map((wp, index) => {
          const state = index < visited ? 'done' : index === visited ? 'current' : 'future'
          return (
            <g key={wp.id} transform={`translate(${wp.x} ${wp.y})`}>
              {state === 'current' ? (
                <circle className="drone-wp-ring" r={WAYPOINT_R} filter={`url(#${glow})`} />
              ) : null}
              <circle className={`drone-wp drone-wp-${state}`} r={state === 'current' ? 16 : 13} />
              <text className={`drone-wp-num drone-wp-num-${state}`} y="1">
                {state === 'done' ? '✓' : wp.label}
              </text>
            </g>
          )
        })}
        {trail.length > 1 ? <polyline className="drone-trail" points={trailPoints} /> : null}
        <g transform={`translate(${pose.x} ${pose.y})`}>
          <ellipse
            cx="0"
            cy="10"
            rx={15 + pose.height * 0.04}
            ry={7 + pose.height * 0.015}
            fill={`rgba(26,35,48,${0.14 + Math.min(pose.height, 100) / 500})`}
          />
          <g transform={`translate(0 ${-lift}) rotate(${pose.heading})`}>
            <line className="drone-arm" x1="-18" y1="-18" x2="18" y2="18" />
            <line className="drone-arm" x1="18" y1="-18" x2="-18" y2="18" />
            {[
              [-18, -18],
              [18, -18],
              [18, 18],
              [-18, 18],
            ].map(([x, y]) => (
              <circle key={`${x}${y}`} className="drone-rotor" cx={x} cy={y} r="6.5" />
            ))}
            <circle className="drone-body" r="6.5" />
            <polygon className="drone-nose" points="0,-20 6.5,-8 -6.5,-8" />
          </g>
        </g>
      </svg>
      <p className="caption">
        Top-down simulator · each grid square is {GRID_CM} cm · red triangle is the nose (forward)
      </p>
    </div>
  )
}
