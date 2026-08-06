import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MathBlock, MathText } from '../components/MathText'
import {
  deleteLearnFigure,
  fetchFigureOverrides,
  uploadLearnFigure,
} from '../services/ncertRevisionApi'
import type {
  Difficulty,
  LadderItem,
  RevisionFigure,
  RevisionFlashcard,
  RevisionFormula,
  RevisionPack,
} from '../types/ncertRevision'
import { isAdmin } from '../utils/auth'
import { speakText, stopSpeaking } from '../utils/speech'

type ViewId =
  | 'cheat'
  | 'lines'
  | 'definitions'
  | 'figures'
  | 'formulas'
  | 'flashcards'
  | 'ladder'
  | 'prompt'

const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'cheat', label: 'Cheat sheet' },
  { id: 'lines', label: 'NCERT lines' },
  { id: 'definitions', label: 'Definitions' },
  { id: 'figures', label: 'Figures' },
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

function figureSrc(src: string | null | undefined): string | null {
  if (!src) return null
  if (/^https?:\/\//i.test(src) || src.startsWith('/')) return src
  return `${import.meta.env.BASE_URL}${src.replace(/^\//, '')}`
}

function FigureCard({
  figure,
  admin,
  busy,
  onUpload,
  onRemove,
}: {
  figure: RevisionFigure
  admin?: boolean
  busy?: boolean
  onUpload?: (file: File) => void
  onRemove?: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const src = figureSrc(figure.src)
  return (
    <article className="figure-card">
      <div className="figure-meta">
        <span className="badge badge-neutral">{figure.kind}</span>
        <strong>{figure.label}</strong>
        <span className="muted">NCERT p.{figure.ncertPage}</span>
        {figure.section && <span className="ref">§{figure.section}</span>}
      </div>
      {src ? (
        <img key={src} className="figure-img" src={src} alt={figure.caption || figure.label} />
      ) : (
        <div className="figure-placeholder" role="img" aria-label={figure.placeholderText}>
          <div className="figure-placeholder-page">Page {figure.ncertPage}</div>
          <div className="figure-placeholder-label">{figure.label}</div>
          <div className="figure-placeholder-hint">{figure.placeholderText}</div>
          {figure.uploadHint && <p className="muted">{figure.uploadHint}</p>}
          <p className="figure-upload-note">
            {admin ? 'Placeholder — upload the cropped NCERT page image below' : 'Image coming soon'}
          </p>
        </div>
      )}
      <p className="figure-caption">
        <MathText>{figure.caption}</MathText>
      </p>
      {admin && (
        <div className="figure-admin-actions">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file && onUpload) onUpload(file)
            }}
          />
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? 'Uploading…' : src ? 'Replace image' : 'Upload image'}
          </button>
          {src && (
            <button type="button" className="btn" disabled={busy} onClick={() => onRemove?.()}>
              Remove
            </button>
          )}
        </div>
      )}
    </article>
  )
}

function FormulaStudio({
  formulas,
  figures,
  admin,
  busyId,
  onUpload,
  onRemove,
}: {
  formulas: RevisionFormula[]
  figures: RevisionFigure[]
  admin?: boolean
  busyId?: string | null
  onUpload?: (figureId: string, file: File) => void
  onRemove?: (figureId: string) => void
}) {
  const [activeId, setActiveId] = useState(formulas[0]?.id ?? '')
  const formula = formulas.find((f) => f.id === activeId) ?? formulas[0]
  if (!formula) return <p className="muted">No formulas in this pack.</p>

  const patterns = formula.questionPatterns ?? []
  const linked = figures.filter((f) => formula.figureIds?.includes(f.id))

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
        <MathBlock>{formula.latex}</MathBlock>
        {formula.plain && <p className="formula-plain">{formula.plain}</p>}
        {symbolLine(formula) && (
          <p className="muted">
            <strong>Variables:</strong> <MathText>{symbolLine(formula)}</MathText>
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

      {linked.length > 0 && (
        <div className="formula-figures">
          <h4>NCERT figure</h4>
          <div className="figure-grid">
            {linked.map((fig) => (
              <FigureCard
                key={fig.id}
                figure={fig}
                admin={admin}
                busy={busyId === fig.id}
                onUpload={(file) => onUpload?.(fig.id, file)}
                onRemove={() => onRemove?.(fig.id)}
              />
            ))}
          </div>
        </div>
      )}

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
            <p>
              <MathText>{p.exampleStem}</MathText>
            </p>
            <h4>Interpretation</h4>
            <p>
              <MathText>{p.howToInterpret}</MathText>
            </p>
            <h4>Connect to formula</h4>
            <p>
              <MathText>{p.howItConnectsToFormula}</MathText>
            </p>
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
  const isFormulaPhase = current.key === 'formula' && current.body !== 'none' && !current.body.startsWith('none')

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
              <li key={s}>
                <MathText>{s}</MathText>
              </li>
            ))}
          </ol>
        ) : isFormulaPhase ? (
          <MathBlock>{current.body}</MathBlock>
        ) : (
          <p className="flash-body">
            <MathText>{current.body}</MathText>
          </p>
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
                    <p>
                      <MathText>{item.question}</MathText>
                    </p>
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
                      <p>
                        <MathText>{item.interpretation}</MathText>
                      </p>
                      {(item.formulaIds?.length ?? 0) > 0 && (
                        <>
                          <h4>Formula link</h4>
                          <p>{item.formulaIds!.join(', ')}</p>
                        </>
                      )}
                      <h4>Steps</h4>
                      <ol>
                        {(item.steps || []).map((s) => (
                          <li key={s}>
                            <MathText>{s}</MathText>
                          </li>
                        ))}
                      </ol>
                      <p className="answer-line">
                        <strong>Answer:</strong> <MathText>{item.answer}</MathText>
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
      const anyD = d as { id?: string; term: string; definition: string; section?: string }
      return {
        id: anyD.id || `d${i + 1}`,
        term: anyD.term,
        definition: anyD.definition,
        section: anyD.section,
      }
    }),
    figures: raw.figures || [],
  }
}

export function LearnChapter() {
  const { slug = '' } = useParams()
  const [pack, setPack] = useState<RevisionPack | null>(null)
  const [error, setError] = useState('')
  const [view, setView] = useState<ViewId>('cheat')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const admin = isAdmin()

  useEffect(() => {
    let cancelled = false
    setPack(null)
    setError('')
    setUploadError(null)
    setView('cheat')
    stopSpeaking()
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}ncert-revision/physics-xi/${slug}.json`).then(async (r) => {
        if (!r.ok) throw new Error(`Pack not found (${r.status})`)
        return r.json()
      }),
      fetchFigureOverrides(slug).catch((): Record<string, { src: string }> => ({})),
    ])
      .then(([data, overrides]) => {
        if (cancelled) return
        const normalized = normalizePack(data)
        const overrideMap = overrides as Record<string, { src: string }>
        const figures = (normalized.figures || []).map((f) => ({
          ...f,
          src: overrideMap[f.id]?.src || f.src || null,
        }))
        setPack({ ...normalized, figures })
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || 'Failed to load chapter pack')
      })
    return () => {
      cancelled = true
      stopSpeaking()
    }
  }, [slug])

  async function handleFigureUpload(figureId: string, file: File) {
    setBusyId(figureId)
    setUploadError(null)
    try {
      const data = await uploadLearnFigure(slug, figureId, file)
      setPack((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          figures: (prev.figures || []).map((f) =>
            f.id === figureId ? { ...f, src: data.src } : f
          ),
        }
      })
    } catch (err: any) {
      setUploadError(err.response?.data?.error ?? err.message ?? 'Upload failed')
    } finally {
      setBusyId(null)
    }
  }

  async function handleFigureRemove(figureId: string) {
    setBusyId(figureId)
    setUploadError(null)
    // Optimistic clear
    setPack((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        figures: (prev.figures || []).map((f) =>
          f.id === figureId ? { ...f, src: null } : f
        ),
      }
    })
    try {
      await deleteLearnFigure(slug, figureId)
    } catch (err: any) {
      setUploadError(err.response?.data?.error ?? err.message ?? 'Remove failed')
      try {
        const overrides = await fetchFigureOverrides(slug)
        setPack((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            figures: (prev.figures || []).map((f) => ({
              ...f,
              src: overrides[f.id]?.src || null,
            })),
          }
        })
      } catch {
        /* ignore */
      }
    } finally {
      setBusyId(null)
    }
  }

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

  const views = useMemo(() => {
    if ((pack?.figures?.length ?? 0) === 0) return VIEWS.filter((v) => v.id !== 'figures')
    return VIEWS
  }, [pack])

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
        {views.map((v) => (
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
                  <span>
                    <MathText>{line}</MathText>
                  </span>
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
                      <strong>{f.name}:</strong> <MathText>{f.latex}</MathText>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(pack.cheatSheet?.keyTables?.length ?? 0) > 0 && (
              <div className="cheat-tables">
                {pack.cheatSheet!.keyTables!.map((t) => (
                  <div key={t.title} className="key-table">
                    <h3>{t.title}</h3>
                    <table>
                      <tbody>
                        {t.rows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <td key={ci}>
                                <MathText>{cell}</MathText>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
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
                    <p className="highlight-text">
                      <MathText>{h.text}</MathText>
                    </p>
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
                <p>
                  <MathText>{d.definition}</MathText>
                </p>
                {d.section && <p className="ref">§{d.section}</p>}
              </article>
            ))}
          </div>
        )}

        {view === 'figures' && (
          <div className="figures-view">
            <p className="lede">
              NCERT figures/tables for this chapter. Placeholders show the textbook page
              {admin
                ? ' — upload a crop here or from Admin → Learn figures.'
                : '.'}
            </p>
            {uploadError && <p className="error">{uploadError}</p>}
            <div className="figure-grid">
              {(pack.figures || []).map((fig) => (
                <FigureCard
                  key={fig.id}
                  figure={fig}
                  admin={admin}
                  busy={busyId === fig.id}
                  onUpload={(file) => void handleFigureUpload(fig.id, file)}
                  onRemove={() => void handleFigureRemove(fig.id)}
                />
              ))}
            </div>
          </div>
        )}

        {view === 'formulas' && (
          <FormulaStudio
            formulas={pack.formulas || []}
            figures={pack.figures || []}
            admin={admin}
            busyId={busyId}
            onUpload={(id, file) => void handleFigureUpload(id, file)}
            onRemove={(id) => void handleFigureRemove(id)}
          />
        )}

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
