import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

type MathTexProps = {
  tex: string
  /** Inline (default) sits in a sentence; display is a block equation. */
  mode?: 'inline' | 'display'
  /** Spoken plain-text equivalent; required so KaTeX HTML is not the only a11y tree. */
  ariaLabel: string
  className?: string
}

/**
 * Shared KaTeX renderer. Bundle CSS + fonts with Vite (no CDN).
 * Other labs can adopt this later; Interest is the first consumer.
 */
export function MathTex({ tex, mode = 'inline', ariaLabel, className }: MathTexProps) {
  const display = mode === 'display'
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        strict: 'ignore',
        output: 'html',
        trust: false,
      }),
    [tex, display],
  )

  const Tag = display ? 'div' : 'span'
  return (
    <Tag
      className={`math-tex${display ? ' math-tex-display' : ''}${className ? ` ${className}` : ''}`}
      data-mode={mode}
      role="img"
      aria-label={ariaLabel}
    >
      <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
    </Tag>
  )
}
