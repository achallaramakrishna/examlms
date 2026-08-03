import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Renders plain text mixed with LaTeX math delimiters:
 *   \( ... \) / $ ... $     → inline math
 *   \[ ... \] / $$ ... $$   → display math
 *
 * Extracted exam content often ships with these delimiters from OCR/solutions.
 * Non-math segments are HTML-escaped; bad LaTeX falls back to the raw source.
 */
const MATH_SEGMENT =
  /(\\\[[\s\S]+?\\\])|(\$\$[\s\S]+?\$\$)|(\\\([\s\S]+?\\\))|(\$(?:\\\$|[^$])+?\$)/g;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Light cleanup for common OCR/solution LaTeX mistakes. */
function normalizeLatex(latex: string): string {
  let s = latex.trim();
  // \sqrt{a = b} → \sqrt{a} = b  (closing brace often placed after the equals result)
  s = s.replace(/\\sqrt\{([^=}]+?)\s*=\s*([^}]+)\}/g, '\\sqrt{$1} = $2');
  // v_{max} style is fine; ensure \text{m/s} isn't required
  return s;
}

function renderLatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(normalizeLatex(latex), {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
    });
  } catch {
    return escapeHtml(latex);
  }
}

function stripDelimiters(segment: string): { latex: string; displayMode: boolean } {
  if (segment.startsWith('\\[') && segment.endsWith('\\]')) {
    return { latex: segment.slice(2, -2), displayMode: true };
  }
  if (segment.startsWith('$$') && segment.endsWith('$$')) {
    return { latex: segment.slice(2, -2), displayMode: true };
  }
  if (segment.startsWith('\\(') && segment.endsWith('\\)')) {
    return { latex: segment.slice(2, -2), displayMode: false };
  }
  if (segment.startsWith('$') && segment.endsWith('$')) {
    return { latex: segment.slice(1, -1), displayMode: false };
  }
  return { latex: segment, displayMode: false };
}

export function renderMathHtml(text: string): string {
  if (!text) return '';

  let html = '';
  let lastIndex = 0;

  for (const match of text.matchAll(MATH_SEGMENT)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      html += escapeHtml(text.slice(lastIndex, index));
    }
    const { latex, displayMode } = stripDelimiters(match[0]);
    html += renderLatex(latex, displayMode);
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    html += escapeHtml(text.slice(lastIndex));
  }

  // Preserve intentional line breaks from multi-line explanations
  return html.replace(/\n/g, '<br/>');
}

export function MathText({
  text,
  as: Tag = 'span',
  className,
}: {
  text: string;
  as?: 'span' | 'p' | 'div';
  className?: string;
}) {
  const html = useMemo(() => renderMathHtml(text), [text]);
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
