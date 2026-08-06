import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type {
  Difficulty,
  LadderItem,
  RevisionFlashcard,
  RevisionFormula,
  RevisionPack,
} from '../types/ncertRevision'
import { speakText, stopSpeaking } from '../utils/speech'

type ViewId =
  | 'cheat'
  | 'lines'
  | 'definitions'
  | 'formulas'
  | 'flashcards'
  | 'ladder'
  | 'prompt'

const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'cheat', label: 'Cheat sheet' },
  { id: 'lines', label: 'NCERT lines' },
  { id: 'definitions', label: 'Definitions' },
  { id: 'formulas', label: 'Formula studio' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'ladder', label: 'Problem ladder' },
  { id: 'prompt', label: 'Tutor prompt' },
]

function SpeakButton({ text, label = 'Listen' }: { text: string; label?: string }) {
  if (!text?.trim()) return null
  return (
    <button type="button" className="learn-speak" onClick={() => speakText(text)} title="Play audio">
      ▶ {label}
    </button>
  )
}

function symbolLine(formula: RevisionFormula): string {
  const symbols = formula.symbols
  if (!symbols?.length) return ''
  return symbols
    .map((s) => (typeof s === 'string' ? s : `${s.symbol}: ${s.meaning}`))
    .join(' · ')
}

function FormulaStudio({ formulas }: { formulas: RevisionFormula[] }) {
  const [activeId, setActiveId] = useState(formulas[0]?.id ?? '')
  const formula = formulas.find((f) => f.id === activeId) ?? formulas[0]
  if (!formula) return <p className="muted">No formulas in this pack.</p>

  const patterns = formula.questionPatterns ?? []

  return (
    <div className="formula-studio">
      <div className="formula-picker">
        {formulas.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`pill ${f.id === formula.id ? 'active' : ''}`}
            onClick={() => setActiveId(f.id)}
          >
            {f.name}
          </button>
        ))}
      </div>

      <article className="formula-hero">
        <div className="formula-hero-top">
          <h3>{formula.name}</h3>
          <SpeakButton
            text={
              formula.audioScript ||
              `${formula.name}. ${formula.plain || formula.latex}. ${formula.whenToUse || ''}`
            }
          />
        </div>
        <div className="formula-latex">{formula.latex}</div>
        {formula.plain && <p>{formula.plain}</p>}
        {symbolLine(formula) && (
          <p className="muted">
            <strong>Variables:</strong> {symbolLine(formula)}
          </p>
        )}
        {formula.whenToUse && (
          <p className="muted">
            <strong>When to use:</strong> {formula.whenToUse}
          </p>
        )}
        {(formula.commonMistakes?.length ?? 0) > 0 && (
          <ul className="mistake-list">
            {formula.commonMistakes!.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </article>

      <div className="pattern-grid">
        {patterns.map((p, idx) => (
          <article key={`${formula.id}-p${idx}`} className="pattern-card">
            <div className="pattern-head">
              <span className={`badge badge-${p.difficulty}`}>{p.difficulty}</span>
              <span className="pattern-name">{p.patternName}</span>
              <SpeakButton
                text={`${p.patternName}. Question: ${p.exampleStem}. Interpretation: ${p.howToInterpret}. Connect: ${p.howItConnectsToFormula}.`}
              />
            </div>
            <h4>Question</h4>
            <p>{p.exampleStem}</p>
            <h4>Interpretation</h4>
            <p>{p.howToInterpret}</p>
            <h4>Connect to formula</h4>
            <p>{p.howItConnectsToFormula}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

function FlashcardDeck({ cards }: { cards: RevisionFlashcard[] }) {
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState(0)
  const card = cards[i]
  if (!card) return <p className="muted">No flashcards.</p>

  const stages = card.stages
  const phases: { key: string; title: string; body: string; list?: string[] }[] = [
    { key: 'question', title: 'Question', body: stages.question },
    { key: 'interpretation', title: 'Interpretation', body: stages.interpretation },
    { key: 'formula', title: 'Formula', body: stages.formula },
    {
      key: 'solution',
      title: 'Solution steps',
      body: stages.solutionSteps.join('\n'),
      list: stages.solutionSteps,
    },
    { key: 'answer', title: 'Answer', body: stages.answer },
  ]

  const current = phases[Math.min(phase, phases.length - 1)]

  return (
    <div className="flash-deck">
      <div className="flash-meta">
        Card {i + 1} / {cards.length} · {card.difficulty} · phase {phase + 1}/5
      </div>
      <article className="flash-card">
        <div className="flash-card-top">
          <h3>{current.title}</h3>
          <SpeakButton
            text={
              phase === 0 && card.audioScript
                ? card.audioScript
                : `${current.title}. ${current.body}`
            }
          />
        </div>
        {current.list ? (
          <ol>
            {current.list.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        ) : (
          <p className="flash-body">{current.body}</p>
        )}
      </article>
      <div className="flash-actions">
        <button type="button" className="btn" disabled={phase === 0} onClick={() => setPhase((p) => p - 1)}>
          Prev phase
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={phase >= phases.length - 1}
          onClick={() => setPhase((p) => p + 1)}
        >
          Reveal next
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setI((x) => (x + 1) % cards.length)
            setPhase(0)
          }}
        >
          Next card
        </button>
      </div>
    </div>
  )
}

function Ladder({
  basic,
  intermediate,
  advanced,
}: {
  basic: LadderItem[]
  intermediate: LadderItem[]
  advanced: LadderItem[]
}) {
  const [open, setOpen] = useState<string | null>(null)
  const sections: { title: string; items: LadderItem[]; tone: Difficulty }[] = [
    { title: 'Basic', items: basic, tone: 'basic' },
    { title: 'Intermediate', items: intermediate, tone: 'intermediate' },
    { title: 'Advanced', items: advanced, tone: 'advanced' },
  ]

  return (
    <div className="ladder">
      {sections.map((sec) => (
        <section key={sec.title} className="ladder-section">
          <h3>
            <span className={`badge badge-${sec.tone}`}>{sec.title}</span>
          </h3>
          <div className="ladder-list">
            {sec.items.map((item) => {
              const isOpen = open === item.id
              return (
                <article key={item.id} className="ladder-item">
                  <div className="ladder-item-head">
                    <p>{item.question}</p>
                    <div className="ladder-item-actions">
                      <SpeakButton
                        text={
                          item.audioScript ||
                          `${item.question}. Interpretation: ${item.interpretation}. ${(item.steps || []).join('. ')}. Answer: ${item.answer}`
                        }
                      />
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setOpen(isOpen ? null : item.id)}
                      >
                        {isOpen ? 'Hide' : 'Show path'}
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="ladder-reveal">
                      <h4>Interpretation</h4>
                      <p>{item.interpretation}</p>
                      {(item.formulaIds?.length ?? 0) > 0 && (
                        <>
                          <h4>Formula link</h4>
                          <p>{item.formulaIds!.join(', ')}</p>
                        </>
                      )}
                      <h4>Steps</h4>
                      <ol>
                        {(item.steps || []).map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ol>
                      <p className="answer-line">
                        <strong>Answer:</strong> {item.answer}
                      </p>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

/** Normalize packs that use slightly different meta / highlight shapes. */
function normalizePack(raw: RevisionPack & Record<string, unknown>): RevisionPack {
  const meta = raw.meta as RevisionPack['meta'] & {
    chapter?: string
    class?: string
    chapterTitle?: string
    chapterNumber?: number
  }
  return {
    ...raw,
    meta: {
      ...meta,
      subject: meta.subject || 'Physics',
      classLevel: meta.classLevel || meta.class || 'XI',
      chapterNumber: meta.chapterNumber ?? 1,
      chapterTitle: meta.chapterTitle || meta.chapter || 'Chapter',
    },
    highlights: (raw.highlights || []).map((h, i) => {
      const anyH = h as {
        id?: string
        type?: string
        kind?: string
        text?: string
        content?: string
        whyItMatters?: string
        section?: string
        neetRelevance?: 'high' | 'medium' | 'low'
      }
      return {
        id: anyH.id || `h${i + 1}`,
        type: anyH.type || anyH.kind || 'statement',
        section: anyH.section,
        text: anyH.text || anyH.content || '',
        whyItMatters: anyH.whyItMatters,
        neetRelevance: anyH.neetRelevance,
      }
    }),
    definitions: (raw.definitions || []).map((d, i) => {
      const anyD = d as { id?: string; term: string; definition: string; section?: string; examNote?: string }
      return {
        id: anyD.id || `d${i + 1}`,
        term: anyD.term,
        definition: anyD.definition,
        section: anyD.section,
      }
    }),
  }
}

export function LearnChapter() {
  const { slug = '' } = useParams()
  const [pack, setPack] = useState<RevisionPack | null>(null)
  const [error, setError] = useState('')
  const [view, setView] = useState<ViewId>('cheat')

  useEffect(() => {
    let cancelled = false
    setPack(null)
    setError('')
    setView('cheat')
    stopSpeaking()
    fetch(`${import.meta.env.BASE_URL}ncert-revision/physics-xi/${slug}.json`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Pack not found (${r.status})`)
        return r.json()
      })
      .then((data) => {
        if (!cancelled) setPack(normalizePack(data))
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || 'Failed to load chapter pack')
      })
    return () => {
      cancelled = true
      stopSpeaking()
    }
  }, [slug])

  const highlightGroups = useMemo(() => {
    if (!pack?.highlights) return []
    const order = ['definition', 'statement', 'formula_intro', 'caution', 'summary', 'exam_tip']
    const kinds = [...new Set([...order, ...pack.highlights.map((h) => h.type)])]
    return kinds
      .map((kind) => ({
        kind,
        items: pack.highlights!.filter((h) => h.type === kind),
      }))
      .filter((g) => g.items.length > 0)
  }, [pack])

  const cheatBullets =
    pack?.cheatSheet?.mustKnowBullets ||
    (Array.isArray(pack?.cheatSheet) ? (pack!.cheatSheet as unknown as string[]) : [])

  if (error) {
    return (
      <div className="learn-page">
        <p className="error">{error}</p>
        <Link to="/learn">← Back to Learn</Link>
      </div>
    )
  }

  if (!pack) {
    return (
      <div className="learn-page">
        <p className="loading-state">Loading revision pack…</p>
      </div>
    )
  }

  return (
    <div className="learn-page">
      <div className="learn-chapter-top">
        <Link to="/learn" className="back-link">
          ← All chapters
        </Link>
        <div>
          <p className="eyebrow">
            NCERT Physics {pack.meta.classLevel} · Ch {pack.meta.chapterNumber} ·{' '}
            {pack.meta.examTrack || 'NEET'}
          </p>
          <h1>{pack.meta.chapterTitle}</h1>
          {pack.cheatSheet?.oneLiner && <p className="lede">{pack.cheatSheet.oneLiner}</p>}
          {!pack.cheatSheet?.oneLiner && pack.learningOutcomes?.[0] && (
            <p className="lede">{pack.learningOutcomes[0]}</p>
          )}
        </div>
      </div>

      <div className="view-tabs" role="tablist">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            className={`view-tab ${view === v.id ? 'active' : ''}`}
            onClick={() => {
              stopSpeaking()
              setView(v.id)
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="view-panel">
        {view === 'cheat' && (
          <div className="cheat-sheet">
            <div className="cheat-actions">
              <SpeakButton text={cheatBullets.join('. ')} label="Listen all" />
            </div>
            <ul>
              {cheatBullets.map((line) => (
                <li key={line}>
                  <span>{line}</span>
                  <SpeakButton text={line} label="" />
                </li>
              ))}
            </ul>
            {(pack.formulas?.length ?? 0) > 0 && (
              <div className="cheat-formulas">
                <h3>Key formulas</h3>
                <ul>
                  {pack.formulas.map((f) => (
                    <li key={f.id}>
                      <strong>{f.name}:</strong> <code>{f.latex}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {view === 'lines' && (
          <div className="highlight-groups">
            {highlightGroups.map((g) => (
              <section key={g.kind}>
                <h3>{g.kind.replace(/_/g, ' ')}</h3>
                {g.items.map((h) => (
                  <article key={h.id} className="highlight-card">
                    <div className="highlight-top">
                      <span className="badge badge-neutral">{h.type}</span>
                      {h.neetRelevance && (
                        <span className="badge badge-warning">{h.neetRelevance}</span>
                      )}
                      <SpeakButton
                        text={`${h.text}${h.whyItMatters ? `. Why it matters: ${h.whyItMatters}` : ''}`}
                      />
                    </div>
                    <p className="highlight-text">{h.text}</p>
                    {h.whyItMatters && <p className="muted">{h.whyItMatters}</p>}
                    {h.section && <p className="ref">NCERT §{h.section}</p>}
                  </article>
                ))}
              </section>
            ))}
          </div>
        )}

        {view === 'definitions' && (
          <div className="def-grid">
            {(pack.definitions || []).map((d) => (
              <article key={d.id} className="def-card">
                <div className="def-top">
                  <h3>{d.term}</h3>
                  <SpeakButton text={`${d.term}. ${d.definition}`} />
                </div>
                <p>{d.definition}</p>
                {d.section && <p className="ref">§{d.section}</p>}
              </article>
            ))}
          </div>
        )}

        {view === 'formulas' && <FormulaStudio formulas={pack.formulas || []} />}

        {view === 'flashcards' && <FlashcardDeck cards={pack.flashcards || []} />}

        {view === 'ladder' && (
          <Ladder
            basic={pack.problemLadder?.basic || []}
            intermediate={pack.problemLadder?.intermediate || []}
            advanced={pack.problemLadder?.advanced || []}
          />
        )}

        {view === 'prompt' && (
          <div className="tutor-prompt">
            <p className="lede">
              Paste this into ChatGPT / Claude / Cursor for a guided session: concepts → basic →
              intermediate → advanced → MCQ drill.
            </p>
            <SpeakButton
              text={(pack.studentTutorPrompt || '').slice(0, 600)}
              label="Listen intro"
            />
            <pre className="prompt-box">{pack.studentTutorPrompt}</pre>
            <button
              type="button"
              className="btn primary"
              onClick={() => navigator.clipboard.writeText(pack.studentTutorPrompt || '')}
            >
              Copy prompt
            </button>
            {pack.problemLadder?.transferPrompt && (
              <p className="muted transfer-note">{pack.problemLadder.transferPrompt}</p>
            )}
          </div>
        )}
      </div>

      <div className="learn-practice-cta">
        <Link to="/practice" className="btn primary">
          Practice MCQs →
        </Link>
      </div>
    </div>
  )
}
