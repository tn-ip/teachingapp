import { useEffect, useState } from 'react'
import type { QuestionId } from './sequence'

/** Hash routes work on GitHub Pages at /teachingapp/ without a server rewrite. */

export type RouteId =
  | 'home'
  | 'counting'
  | 'permutations'
  | 'combinations'
  | 'probability'
  | 'sequence'

export type AppRoute =
  | { id: Exclude<RouteId, 'sequence'> }
  | { id: 'sequence'; question: QuestionId | null }

const SIMPLE: Exclude<RouteId, 'sequence'>[] = [
  'home',
  'counting',
  'permutations',
  'combinations',
  'probability',
]

function asQuestionId(value: string | undefined): QuestionId | null {
  if (value === '1' || value === '2' || value === '3' || value === '4') {
    return Number(value) as QuestionId
  }
  return null
}

function parseHash(): AppRoute {
  const raw = window.location.hash.replace(/^#\/?/, '').trim()
  if (!raw) return { id: 'home' }
  const parts = raw.split('/').filter(Boolean)
  const head = parts[0]
  if (head === 'sequence') {
    return { id: 'sequence', question: asQuestionId(parts[1]) }
  }
  if (parts.length === 1 && (SIMPLE as string[]).includes(head)) {
    return { id: head as Exclude<RouteId, 'sequence'> }
  }
  return { id: 'home' }
}

export function navigate(route: RouteId, question?: QuestionId) {
  if (route === 'home') {
    window.location.hash = '#/'
    return
  }
  if (route === 'sequence') {
    window.location.hash = question ? `#/sequence/${question}` : '#/sequence'
    return
  }
  window.location.hash = `#/${route}`
}

export function useHashRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(parseHash)
  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    if (!window.location.hash) window.location.hash = '#/'
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
