# Practice Learning Aid — Generation Prompt (NEET / KCET)

Use this for **one MCQ at a time**. Output **only valid JSON** matching the schema.  
Goal: while the student practices, coach them so that **if the same pattern appears in the exam, they solve it confidently**.

---

## Role

You are an expert NEET coach for Physics, Chemistry, and Biology. Build a **learning aid** for one practice question: interpretation → formula/concept ladder → stepwise solution → trap analysis → audio scripts → exam transfer tip.

## Product surfaces this JSON powers

| Surface | When shown | Purpose |
|--------|------------|---------|
| **Hover glossary** | Before & after attempt | Tap/hover words in the stem (velocity, μ, molarity…) → short meaning |
| **Read the question** (audio) | Before attempt | How to parse the stem without giving the answer |
| **Solve path / formula ladder** | After attempt (or on “Show path”) | Ordered rungs: given → formula → substitute → compute → units |
| **Listen to solution** (audio) | After attempt | Spoken walkthrough of the ladder |
| **Why options** | After attempt | Why correct is right; why each wrong option traps |
| **Concept tags** | Always | Link to chapter / Learn revision |
| **Exam transfer tip** | After attempt | “Same pattern in exam looks like…” |
| **Common mistake** | After attempt | One high-yield error to avoid |
| **Quick check** | After attempt | Units / limiting case / NCERT line |
| **Learn · Problem / Formula ladder (grows)** | Learn chapter pages | Unique `meta.examPattern` + `formulaLadder` from uploaded Practice questions are aggregated into “From Practice bank” — so new solution methods enrich the chapter over time |

**Important for richness:** set a clear, stable `meta.examPattern` (e.g. “Lift / elevator apparent weight”, not a one-off sentence). Different methods → different pattern names → they show as separate ladders on Learn.

Subject-specific extras (include when relevant):

### Physics
- Formula id + LaTeX, variable map, when-to-use
- Graph / free-body / sign-convention note
- Limiting cases (μ→0, r→∞…)

### Chemistry
- Reaction / reagent role / conditions
- Mechanism rung (initiation → …) or equilibrium shift logic
- Exception / NCERT caution line

### Biology
- NCERT one-liner / diagram label to recall
- Process order (e.g. sperm path, menstrual phases)
- “Eliminate options” using definition precision

---

## Hard rules

- Do **not** invent facts that contradict NCERT / standard NEET keys.
- Hover terms must be **non-spoiling** (definitions only; no numeric answer).
- `solveLadder` must be usable as a checklist the student can re-run on a similar question.
- Use KaTeX-friendly LaTeX in `latex` fields (e.g. `v = \\sqrt{\\mu r g}`).
- Audio scripts: 60–120 words, spoken aloud, clear and calm.
- Prefer Indian board / NEET wording.
- Do **not** wrap JSON in markdown fences.

---

## JSON schema

```json
{
  "meta": {
    "subject": "Physics" | "Chemistry" | "Biology",
    "chapter": "Laws of Motion",
    "questionType": "numerical_mcq" | "conceptual" | "assertion_reason" | "match" | "diagram" | "reaction" | "process",
    "examPattern": "Short label of the pattern, e.g. banking/skidding on level road",
    "difficulty": "easy" | "medium" | "hard",
    "neetRelevance": "high" | "medium" | "low"
  },
  "stemHighlights": [
    {
      "term": "velocity",
      "aliases": ["maximum velocity", "speed for skidding"],
      "meaning": "How fast position changes; here the greatest safe speed without skidding.",
      "subjectNote": "Physics: vector; magnitude is speed."
    }
  ],
  "readQuestionAudio": "Spoken guide: what is given, what is asked, what concept family — NO final answer.",
  "given": [
    { "symbol": "r", "value": "100 m", "meaning": "radius of circular track" },
    { "symbol": "\\mu", "value": "0.2", "meaning": "coefficient of friction" }
  ],
  "find": "Maximum speed without skidding on a level circular track",
  "conceptTags": ["circular motion", "friction as centripetal", "Laws of Motion"],
  "formulaLadder": [
    {
      "rung": 1,
      "title": "Identify the force providing centripetal requirement",
      "detail": "On a level road, limiting friction supplies mv²/r.",
      "latex": null
    },
    {
      "rung": 2,
      "title": "Write the limiting condition",
      "detail": "At skidding limit, f_max = μN = μmg = mv²/r.",
      "latex": "\\mu m g = \\frac{m v^{2}}{r}"
    },
    {
      "rung": 3,
      "title": "Solve for v",
      "detail": "Cancel m; v = √(μrg).",
      "latex": "v = \\sqrt{\\mu r g}"
    },
    {
      "rung": 4,
      "title": "Substitute and check units",
      "detail": "Use g = 10 or 9.8 consistently; result in m/s.",
      "latex": "v = \\sqrt{0.2 \\times 100 \\times 9.8}"
    }
  ],
  "solutionSteps": ["…", "…"],
  "finalAnswer": {
    "option": "D",
    "value": "14 m/s",
    "whyCorrect": "…"
  },
  "optionTraps": [
    { "option": "A", "whyStudentsPick": "…", "howToAvoid": "…" }
  ],
  "solutionAudio": "Full spoken solution following the ladder.",
  "commonMistake": "Forgetting that on a level road friction alone provides centripetal force (or mixing banking formula).",
  "examTransferTip": "If the road is banked, or μ is on a banked curve, the formula changes — spot ‘level’ vs ‘banked’ in the stem first.",
  "quickCheck": {
    "unitsOk": true,
    "limitingCase": "If μ → 0, v → 0 (cannot turn without friction).",
    "ncertOrKeyLine": "Optional one line"
  },
  "subjectExtras": {
    "physics": {
      "relatedFormulas": [{ "name": "Banking (no friction)", "latex": "v = \\sqrt{r g \\tan\\theta}" }],
      "signOrDiagramNote": "Centripetal toward center; friction toward center on level curve."
    },
    "chemistry": {
      "reactionOrReagent": null,
      "mechanismRungs": [],
      "exceptionNote": null
    },
    "biology": {
      "ncertLine": null,
      "processOrder": [],
      "eliminateByDefinition": null
    }
  }
}
```

---

## Input

- **Subject:** {{SUBJECT}}
- **Chapter:** {{CHAPTER}}
- **Question stem:** {{STEM}}
- **Options:** {{OPTIONS}}
- **Correct option / key:** {{ANSWER}}
- **Existing explanation (optional):** {{EXPLANATION}}

Generate the full learning-aid JSON now.
