import { useEffect, useState } from 'react'

/** Hash routes work on GitHub Pages at /teachingapp/ without a server rewrite. */

export type RouteId =
  | 'home'
  | 'counting'
  | 'permutations'
  | 'combinations'
  | 'probability'

const VALID: RouteId[] = [
  'home',
  'counting',
  'permutations',
  'combinations',
  'probability',
]

function parseHash(): RouteId {
  const raw = window.location.hash.replace(/^#\/?/, '').trim()
  if (!raw) return 'home'
  return (VALID as string[]).includes(raw) ? (raw as RouteId) : 'home'
}

export function navigate(route: RouteId) {
  window.location.hash = route === 'home' ? '#/' : `#/${route}`
}

export function useHashRoute(): RouteId {
  const [route, setRoute] = useState<RouteId>(parseHash)
  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    if (!window.location.hash) window.location.hash = '#/'
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
