import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { ReactNode } from 'react'

/** True when the string looks like TeX worth rendering. */
export function looksLikeTex(s: string): boolean {
  return /\\[a-zA-Z]+|[_^]|\{|\}|\\frac|\\text|\\mathrm|\\left|\\right|\\Delta|\\Omega|\\theta|\\times|\\pm|\\approx|\\rightarrow|\\to/.test(
    s
  )
}

function renderTex(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      throwOnError: false,
      displayMode,
      strict: 'ignore',
      trust: false,
    })
  } catch {
    return tex
  }
}

/**
 * Render a string that may be pure TeX, or mixed prose with $...$ / $$...$$.
 * Safe HTML from KaTeX only.
 */
export function MathText({
  children,
  display = false,
  className,
}: {
  children: string | null | undefined
  display?: boolean
  className?: string
}) {
  const text = (children ?? '').trim()
  if (!text) return null

  // Pure TeX (formula fields)
  if (display || (looksLikeTex(text) && !text.includes('$') && text.length < 280 && !/\s{2,}/.test(text))) {
    // Prefer display for standalone formula blocks
    const html = renderTex(text, display)
    return (
      <span
        className={className ? `math-text ${className}` : 'math-text'}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  // Mixed: split on $$...$$ then $...$
  const parts: ReactNode[] = []
  const displaySplit = text.split(/(\$\$[\s\S]+?\$\$)/g)
  displaySplit.forEach((chunk, i) => {
    if (chunk.startsWith('$$') && chunk.endsWith('$$')) {
      const tex = chunk.slice(2, -2).trim()
      parts.push(
        <span
          key={`d${i}`}
          className="math-text math-display"
          dangerouslySetInnerHTML={{ __html: renderTex(tex, true) }}
        />
      )
      return
    }
    const inlineSplit = chunk.split(/(\$[^$\n]+?\$)/g)
    inlineSplit.forEach((bit, j) => {
      if (bit.startsWith('$') && bit.endsWith('$') && bit.length > 2) {
        const tex = bit.slice(1, -1)
        parts.push(
          <span
            key={`i${i}-${j}`}
            className="math-text"
            dangerouslySetInnerHTML={{ __html: renderTex(tex, false) }}
          />
        )
      } else if (bit) {
        // If a whole line/token is TeX-ish without dollars, still try
        if (looksLikeTex(bit) && bit.length < 120 && !/[.!?]/.test(bit.slice(-1))) {
          parts.push(
            <span
              key={`t${i}-${j}`}
              className="math-text"
              dangerouslySetInnerHTML={{ __html: renderTex(bit, false) }}
            />
          )
        } else {
          parts.push(<span key={`p${i}-${j}`}>{bit}</span>)
        }
      }
    })
  })

  return <span className={className}>{parts}</span>
}

/** Block formula (centered / display style). */
export function MathBlock({ children, className }: { children: string; className?: string }) {
  return (
    <div className={className ? `formula-latex ${className}` : 'formula-latex'}>
      <MathText display>{children}</MathText>
    </div>
  )
}
