# Seeding Practice `learning_aid`

1. Prefer per-question LLM generation using `vectordb/prompts/practice-learning-aid-prompt.md`.
2. Always set `meta.coachMode`:
   - `recall` — fact / unit / definition MCQs → empty `formulaLadder`
   - `formula` — numerical / apply equation
   - `concept` — short reasoning path
   - `reaction` / `process` — Chem / Bio
3. Pattern-based batch seed (Laws of Motion / Physics and Measurement done on prod): export questions with `learning_aid IS NULL`, generate JSON, `UPDATE questions SET learning_aid = ...`.
4. After pattern seeds, run `backend/migrations/manual/20260806_tag_learning_aid_coach_mode.sql` so conceptual fact MCQs become `recall` and drop fake formula ladders.
5. Learn “From Practice bank” only aggregates non-`recall` aids with a real path.
