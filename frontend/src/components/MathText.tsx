import { useMemo, type ReactNode } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
// Registers \ce (chemical equations) and \pu (physical units) on the katex instance.
import 'katex/dist/contrib/mhchem.mjs';

/**
 * Renders NEET-style exam text with proper notation for:
 *   Physics  — vectors, Greek letters, units, exponents, sqrts, hats, …
 *   Chemistry — mhchem \ce{…} / \pu{…}, reaction arrows, charges, states
 *   Biology  — Greek letters, subscripts/superscripts, simple chemical formulae
 *
 * Supported delimiters (extracted OCR often uses these):
 *   \( … \) / $ … $      → inline
 *   \[ … \] / $$ … $$    → display
 * Bare \ce{…}, \pu{…}, and contiguous TeX command runs outside delimiters
 * are auto-wrapped so chemistry/physics markup still renders.
 */

const MATH_SEGMENT =
  /(\\\[[\s\S]+?\\\])|(\$\$[\s\S]+?\$\$)|(\\\([\s\S]+?\\\))|(\$(?:\\\$|[^$])+?\$)/g;

/** Contiguous TeX that often appears outside delimiters in OCR'd solutions. */
const BARE_TEX =
  /(\\ce\{(?:[^{}]|\{[^{}]*\})*\})|(\\pu\{(?:[^{}]|\{[^{}]*\})*\})|((?:\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{[^{}]*\})?|[_^](?:\{[^{}]*\}|[A-Za-z0-9+\-\\]+)|\\[,:;!\s]|\\[{}|])+)/g;

const KATEX_OPTS: katex.KatexOptions = {
  throwOnError: false,
  strict: 'ignore',
  trust: false,
  // Common NEET shorthand that OCR / solution keys use across subjects.
  macros: {
    '\\R': '\\mathrm{R}',
    '\\N': '\\mathrm{N}',
    '\\e': '\\mathrm{e}',
    '\\diff': '\\mathrm{d}',
    '\\degree': '{}^{\\circ}',
    '\\celcius': '{}^{\\circ}\\mathrm{C}',
    '\\ohm': '\\Omega',
    '\\angstrom': '\\text{Å}',
    '\\kcal': '\\text{kcal}',
    '\\kJ': '\\text{kJ}',
  },
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Normalize OCR / textbook quirks before KaTeX sees them.
 * Covers physics, chemistry, and biology solution markup.
 */
function normalizeLatex(latex: string): string {
  let s = latex.trim();

  // \sqrt{a = b} → \sqrt{a} = b
  s = s.replace(/\\sqrt\{([^=}]+?)\s*=\s*([^}]+)\}/g, '\\sqrt{$1} = $2');

  // Legacy \cf → \ce (old mhchem)
  s = s.replace(/\\cf\{/g, '\\ce{');

  // Unicode arrows → TeX (physics/chem reaction & mechanism arrows)
  s = s.replace(/(?<![\\])→/g, '\\rightarrow ');
  s = s.replace(/(?<![\\])←/g, '\\leftarrow ');
  s = s.replace(/(?<![\\])↔/g, '\\leftrightarrow ');
  s = s.replace(/(?<![\\])⇌/g, '\\rightleftharpoons ');
  s = s.replace(/(?<![\\])⇒/g, '\\Rightarrow ');

  // Unicode superscripts/subscripts that leak into TeX bodies (chem charges, bio C₃, etc.)
  const superMap: Record<string, string> = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    '⁺': '+', '⁻': '-',
  };
  const subMap: Record<string, string> = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
    '₊': '+', '₋': '-',
  };
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g, (run) => `^{${[...run].map((c) => superMap[c] ?? c).join('')}}`);
  s = s.replace(/[₀₁₂₃₄₅₆₇₈₉₊₋]+/g, (run) => `_{${[...run].map((c) => subMap[c] ?? c).join('')}}`);

  return s;
}

function renderLatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(normalizeLatex(latex), {
      ...KATEX_OPTS,
      displayMode,
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

/**
 * Wrap bare TeX (especially \ce / \pu and command runs) that OCR left
 * outside \( … \) so chemistry equations and physics fragments still render.
 * Skips regions already inside math delimiters.
 */
function autoWrapBareTex(text: string): string {
  const placeholders: string[] = [];
  const protectedText = text.replace(MATH_SEGMENT, (block) => {
    const key = `\uE000${placeholders.length}\uE001`;
    placeholders.push(block);
    return key;
  });

  const wrapped = protectedText.replace(BARE_TEX, (match) => {
    if (!match.startsWith('\\ce') && !match.startsWith('\\pu')) {
      if (!/[a-zA-Z]/.test(match) || match.length < 3) return match;
    }
    return `\\(${match}\\)`;
  });

  return wrapped.replace(/\uE000(\d+)\uE001/g, (_, i) => placeholders[Number(i)]);
}

/**
 * Outside math mode, upgrade plain-text science patterns NEET questions use
 * without LaTeX. Conservative — only formulas with digits / charges.
 */
function enhancePlainScience(text: string): string {
  const placeholders: string[] = [];
  let s = text.replace(MATH_SEGMENT, (block) => {
    const key = `\uE000${placeholders.length}\uE001`;
    placeholders.push(block);
    return key;
  });

  // Chemical formulae: H2SO4, CO2, C6H12O6, Fe2O3, Na+ / Cl- with digit or multi-atom
  s = s.replace(
    /\b((?:[A-Z][a-z]?\d*){2,}(?:\d*[+-])?)\b/g,
    (formula) => {
      if (!/\d/.test(formula) && !/[+-]/.test(formula)) return formula;
      if (formula.includes('\\') || formula.includes('\uE000')) return formula;
      return `\\(\\ce{${formula}}\\)`;
    }
  );

  // Simple ions: Na+, Cl-, Fe3+, H+ — avoid matching lone A+/B+/C+/D+ option noise
  s = s.replace(
    /\b([A-Z][a-z]\d*[+-]|[A-Z]\d+[+-]|H[+-])\b/g,
    (ion) => `\\(\\ce{${ion}}\\)`
  );

  // Scientific notation: 1.5 × 10^-7 or 10^-3
  s = s.replace(
    /(\d+(?:\.\d+)?)\s*[×xX]\s*10\^(-?\d+)/g,
    (_m, coeff, exp) => `\\(${coeff} \\times 10^{${exp}}\\)`
  );
  s = s.replace(
    /(?<![\w.\\])10\^(-?\d+)/g,
    (_m, exp) => `\\(10^{${exp}}\\)`
  );

  // Degree Celsius written as 25°C or 25 deg C — leave unicode ° as-is (renders fine).
  // C3 / C4 pathway style already becomes C_3 via unicode path when OCR uses C₃.

  return s.replace(/\uE000(\d+)\uE001/g, (_, i) => placeholders[Number(i)]);
}

export function renderMathHtml(text: string): string {
  if (!text) return '';

  const prepared = autoWrapBareTex(enhancePlainScience(text));

  let html = '';
  let lastIndex = 0;

  for (const match of prepared.matchAll(MATH_SEGMENT)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      html += escapeHtml(prepared.slice(lastIndex, index));
    }
    const { latex, displayMode } = stripDelimiters(match[0]);
    html += renderLatex(latex, displayMode);
    lastIndex = index + match[0].length;
  }

  if (lastIndex < prepared.length) {
    html += escapeHtml(prepared.slice(lastIndex));
  }

  return html.replace(/\n/g, '<br/>');
}

/**
 * Two calling conventions are used across the app:
 *   <MathText as="p" className="…" text={someString} />        — question/option/explanation text
 *   <MathText>{someString}</MathText>                            — Learn-page prose (children form)
 * Both go through the same renderMathHtml pipeline above.
 */
export function MathText({
  text,
  children,
  as: Tag = 'span',
  display = false,
  className,
}: {
  text?: string;
  children?: ReactNode;
  as?: 'span' | 'p' | 'div';
  display?: boolean;
  className?: string;
}) {
  const raw = text ?? (typeof children === 'string' ? children : '');
  const html = useMemo(() => renderMathHtml(raw), [raw]);
  if (!raw) return null;
  const ResolvedTag = display ? 'div' : Tag;
  return <ResolvedTag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Block formula (centered / display style), used throughout the Learn pages. */
export function MathBlock({ children, className }: { children: string; className?: string }) {
  return (
    <MathText
      text={children}
      as="div"
      className={className ? `formula-latex ${className}` : 'formula-latex'}
    />
  );
}
