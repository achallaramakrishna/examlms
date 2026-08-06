# Seeding Practice `learning_aid`

1. Prefer per-question LLM generation using `vectordb/prompts/practice-learning-aid-prompt.md`.
2. Always set `meta.coachMode`:
   - `recall` — fact / unit / definition MCQs → empty `formulaLadder`
   - `formula` — numerical / apply equation
   - `concept` — short reasoning path
   - `reaction` / `process` — Chem / Bio
3. Pattern-based batch seed:
   - Physics and Measurement — done on prod
   - Laws of Motion — done on prod
   - **Kinematics** — `node vectordb/scripts/seed-kinematics-learning-aids.js` (127/127 on prod)
4. After pattern seeds, run `backend/migrations/manual/20260806_tag_learning_aid_coach_mode.sql` so conceptual fact MCQs become `recall` and drop fake formula ladders (Kinematics seed already sets `coachMode`).
5. Learn “From Practice bank” only aggregates non-`recall` aids with a real path.
6. Next chapter without aids: **Work, Energy and Power** (90), then **Gravitation** (82).
