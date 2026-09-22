import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

type MathTexProps = {
  tex: string
  display?: boolean
  className?: string
}

/** Render a TeX formula with KaTeX. Chinese labels stay outside the math. */
export function MathTex({ tex, display = false, className }: MathTexProps) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        throwOnError: false,
        displayMode: display,
        output: 'htmlAndMathml',
      }),
    [tex, display],
  )
  const classes = `mathtex${display ? ' display' : ''}${className ? ` ${className}` : ''}`
  if (display) {
    return <div className={classes} dangerouslySetInnerHTML={{ __html: html }} />
  }
  return <span className={classes} dangerouslySetInnerHTML={{ __html: html }} />
}
