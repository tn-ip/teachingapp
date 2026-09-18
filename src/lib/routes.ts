import { useEffect, useState } from 'react'
import type { InterestMode } from './interest'
import type { QuestionId } from './sequence'

/** Hash routes work on GitHub Pages at /teachingapp/ without a server rewrite. */

export type RouteId =
  | 'home'
  | 'counting'
  | 'permutations'
  | 'combinations'
  | 'probability'
  | 'sequence'
  | 'interest'

export type AppRoute =
  | { id: Exclude<RouteId, 'sequence' | 'interest'> }
  | { id: 'sequence'; question: QuestionId | null }
  | { id: 'interest'; mode: InterestMode }

const SIMPLE: Exclude<RouteId, 'sequence' | 'interest'>[] = [
  'home',
  'counting',
  'permutations',
  'combinations',
  'probability',
]

const INTEREST_MODES: InterestMode[] = ['simple', 'compound', 'compare']

function asQuestionId(value: string | undefined): QuestionId | null {
  if (value === '1' || value === '2' || value === '3' || value === '4') {
    return Number(value) as QuestionId
  }
  return null
}

function asInterestMode(value: string | undefined): InterestMode {
  if (value && (INTEREST_MODES as string[]).includes(value)) {
    return value as InterestMode
  }
  return 'simple'
}

function parseHash(): AppRoute {
  const raw = window.location.hash.replace(/^#\/?/, '').trim()
  if (!raw) return { id: 'home' }
  const parts = raw.split('/').filter(Boolean)
  const head = parts[0]
  if (head === 'sequence') {
    return { id: 'sequence', question: asQuestionId(parts[1]) }
  }
  if (head === 'interest') {
    return { id: 'interest', mode: asInterestMode(parts[1]) }
  }
  if (parts.length === 1 && (SIMPLE as string[]).includes(head)) {
    return { id: head as Exclude<RouteId, 'sequence' | 'interest'> }
  }
  return { id: 'home' }
}

export function navigate(route: RouteId, detail?: QuestionId | InterestMode) {
  if (route === 'home') {
    window.location.hash = '#/'
    return
  }
  if (route === 'sequence') {
    const q = detail === 1 || detail === 2 || detail === 3 || detail === 4 ? detail : undefined
    window.location.hash = q ? `#/sequence/${q}` : '#/sequence'
    return
  }
  if (route === 'interest') {
    const mode =
      detail === 'simple' || detail === 'compound' || detail === 'compare' ? detail : undefined
    window.location.hash = mode ? `#/interest/${mode}` : '#/interest'
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
