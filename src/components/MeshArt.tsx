import type { MeshId } from '../lib/print3d'

export function MeshArt({ id }: { id: MeshId }) {
  if (id === 'dragon') return <Dragon />
  if (id === 'vase') return <Vase />
  if (id === 'cat') return <Cat />
  return <BlockMascot />
}

function Dragon() {
  return (
    <svg className="mesh-art" viewBox="0 0 160 120" aria-hidden="true">
      <ellipse cx="78" cy="70" rx="36" ry="24" fill="#fde6dc" stroke="#c4451a" strokeWidth="2" />
      <path d="M40 62 L18 40 L36 58 L16 70 L38 72 Z" fill="#c4451a" />
      <path d="M108 50 L132 28 L118 54 L146 48 L116 66 Z" fill="#a16207" />
      <path d="M70 46 L74 18 L82 44 L96 16 L90 48" fill="none" stroke="#c4451a" strokeWidth="2" />
      <circle cx="92" cy="66" r="3" fill="#1a2330" />
      <path d="M48 88 Q78 108 112 86" fill="none" stroke="#c4451a" strokeWidth="2" />
    </svg>
  )
}

function Vase() {
  return (
    <svg className="mesh-art" viewBox="0 0 160 120" aria-hidden="true">
      <path
        d="M58 28 H102 L110 48 C118 70 112 96 80 108 C48 96 42 70 50 48 Z"
        fill="#fde6dc"
        stroke="#c4451a"
        strokeWidth="2"
      />
      <circle cx="70" cy="58" r="6" fill="#fffaf2" stroke="#c4451a" />
      <circle cx="90" cy="70" r="7" fill="#fffaf2" stroke="#c4451a" />
      <circle cx="74" cy="84" r="5" fill="#fffaf2" stroke="#c4451a" />
      <circle cx="96" cy="88" r="4" fill="#fffaf2" stroke="#c4451a" />
      <path d="M80 108 L80 116" stroke="#c4451a" strokeWidth="2" />
    </svg>
  )
}

function Cat() {
  return (
    <svg className="mesh-art" viewBox="0 0 160 120" aria-hidden="true">
      <rect x="36" y="96" width="88" height="10" rx="3" fill="#0f6e67" />
      <rect x="46" y="48" width="68" height="50" rx="16" fill="#d5efe8" stroke="#0f6e67" strokeWidth="3" />
      <path d="M52 52 L62 28 L74 50 Z" fill="#0f6e67" />
      <path d="M86 50 L100 28 L110 52 Z" fill="#0f6e67" />
      <circle cx="68" cy="70" r="4" fill="#1a2330" />
      <circle cx="96" cy="70" r="4" fill="#1a2330" />
      <path d="M76 80 H88" stroke="#0a4f4a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function BlockMascot() {
  return (
    <svg className="mesh-art" viewBox="0 0 160 120" aria-hidden="true">
      <rect x="28" y="92" width="104" height="14" rx="4" fill="#1e4b8a" />
      <rect x="48" y="36" width="64" height="58" rx="8" fill="#dce8f8" stroke="#1e4b8a" strokeWidth="3" />
      <circle cx="70" cy="60" r="4" fill="#1a2330" />
      <circle cx="90" cy="60" r="4" fill="#1a2330" />
      <rect x="72" y="74" width="16" height="6" rx="3" fill="#1e4b8a" />
    </svg>
  )
}
