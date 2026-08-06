# NCERT Revision Pack — Generation Prompt (Physics XI)

Use this prompt for **one chapter at a time**. Attach the chapter NCERT PDF (or paste the chapter text). Output **only valid JSON** matching the schema below.

---

## Role

You are an expert NEET / Class 11 Physics teacher and instructional designer. Build a **revision pack** that helps a student go from **NCERT concepts → formula fluency → basic → intermediate → advanced problem solving**.

## Goals for the pack

1. Highlight **must-remember NCERT lines**, definitions, and formulas (cheat sheet).
2. Provide a **Formula View**: each formula surrounded by question types that use it, how to interpret the question, and how to connect to the formula.
3. Provide **Flashcards** with stages: Question → Interpretation → Formula → Solution steps → Answer.
4. Provide a **Problem Ladder** (basic → intermediate → advanced) with teaching narration (for later audio).
5. Include a short **student tutor prompt** they can paste into an AI chat to practice that chapter.

## Hard rules

- Stay faithful to **NCERT Class 11 Physics** for this chapter. Do not invent non-NCERT formulas as “core”.
- Mark exam usefulness (`neetRelevance`: high | medium | low).
- Use KaTeX-friendly LaTeX in `latex` fields (e.g. `v = u + at`).
- Every formula must list: symbols, when to use, common mistakes, and at least 2 question patterns.
- Flashcards must include all five stages.
- Problem ladder: at least 3 basic, 3 intermediate, 3 advanced.
- Audio scripts: write clear spoken narration (60–120 words) for formula overview and for each ladder problem’s “how to think”.
- Prefer Indian board / NEET style wording.
- Do **not** wrap JSON in markdown fences.

## JSON schema

```json
{
  "meta": {
    "examTrack": "NEET",
    "subject": "Physics",
    "classLevel": "XI",
    "chapterNumber": 1,
    "chapterTitle": "Units and Measurement",
    "ncertCode": "keph101",
    "topicIdHint": "Units and Measurements",
    "estimatedRevisionMinutes": 45
  },
  "learningOutcomes": ["..."],
  "cheatSheet": {
    "oneLiner": "...",
    "mustKnowBullets": ["..."],
    "keyTables": [{ "title": "...", "rows": [["col1","col2"]] }]
  },
  "highlights": [
    {
      "id": "h1",
      "type": "definition" | "statement" | "formula_intro" | "caution" | "summary",
      "section": "1.2",
      "text": "Exact or lightly cleaned NCERT-important line",
      "whyItMatters": "One sentence for NEET revision",
      "neetRelevance": "high"
    }
  ],
  "definitions": [
    { "id": "d1", "term": "...", "definition": "...", "section": "1.1" }
  ],
  "figures": [
    {
      "id": "fig-1-1a",
      "kind": "figure" | "table" | "graph",
      "label": "Fig. 1.1(a)",
      "ncertPage": 2,
      "section": "1.2",
      "caption": "Short caption from NCERT",
      "placeholderText": "NCERT Physics XI · Ch 1 · Page 2 · Fig. 1.1(a)",
      "src": null,
      "uploadHint": "Crop from keph1XX.pdf page N"
    }
  ],
  "formulas": [
    {
      "id": "f1",
      "name": "Percent error",
      "latex": "\\delta a / a \\times 100\\%",
      "plain": "percent error = (absolute error / true value) × 100%",
      "symbols": [{ "symbol": "a", "meaning": "measured quantity" }],
      "whenToUse": "...",
      "derivedFrom": "NCERT error analysis",
      "commonMistakes": ["..."],
      "questionPatterns": [
        {
          "patternName": "Find % error from repeated readings",
          "howToInterpret": "Student is given multiple measurements → find mean, absolute error, then % error",
          "howItConnectsToFormula": "Identify a (mean), δa (max deviation), plug into formula",
          "exampleStem": "Short sample question stem",
          "difficulty": "basic"
        }
      ],
      "audioScript": "Spoken overview of this formula for revision"
    }
  ],
  "views": {
    "formulaViewOrder": ["f1", "f2"],
    "definitionViewOrder": ["d1"],
    "cheatSheetFocus": ["mustKnowBullets", "formulas"]
  },
  "flashcards": [
    {
      "id": "fc1",
      "difficulty": "basic" | "intermediate" | "advanced",
      "tags": ["significant figures"],
      "stages": {
        "question": "...",
        "interpretation": "What is being asked / which concept?",
        "formula": "LaTeX or 'none — definition'",
        "solutionSteps": ["Step 1...", "Step 2..."],
        "answer": "..."
      },
      "audioScript": "Narrate the interpretation and first solving move"
    }
  ],
  "problemLadder": {
    "conceptWarmup": ["Short concept check Q1", "Q2"],
    "basic": [
      {
        "id": "pb1",
        "question": "...",
        "interpretation": "...",
        "formulaIds": ["f1"],
        "steps": ["..."],
        "answer": "...",
        "audioScript": "..."
      }
    ],
    "intermediate": [],
    "advanced": [],
    "transferPrompt": "After finishing the ladder, invent one new NEET-style MCQ that uses two formulas from this chapter."
  },
  "studentTutorPrompt": "A ready-to-paste prompt that coaches the student from concepts to advanced problems for THIS chapter only.",
  "selfCheck": [
    { "q": "...", "a": "..." }
  ]
}
```

## Student tutor prompt requirements

`studentTutorPrompt` must instruct the AI tutor to:

1. Ask the student their goal (revise / practice / weak area).
2. Quiz definitions & formulas first (no calculation).
3. Move to basic numericals tied to one formula.
4. Then intermediate (multi-step / unit conversion / error).
5. Then advanced (dimensional analysis tricks, precision comparisons).
6. After each wrong answer: show Interpretation → Formula link → Steps.
7. Offer flashcard mode and formula-view mode.
8. Stay within this chapter unless the student asks to link outward.

## Chapter-specific input

- **Chapter number / title:** {{CHAPTER}}
- **NCERT source:** attached PDF or text
- **Extra focus (optional):** {{FOCUS}} e.g. “emphasize dimensional analysis for NEET”

Generate the full JSON revision pack now.
