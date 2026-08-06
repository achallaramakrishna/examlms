# Seeding Practice learning aids

1. Use prompt: `vectordb/prompts/practice-learning-aid-prompt.md` for high-quality per-question JSON (preferred for flagship chapters).
2. Pattern-based batch seed (Laws of Motion done on prod): export questions with `learning_aid IS NULL`, generate JSON, `UPDATE questions SET learning_aid = ...`.
3. UI: Practice shows hover glossary + listen before check; formula ladder after check.

Status:
- Laws of Motion: 101/101 aids seeded on production (2026-08-06).
- Next chapters: Motion in a Straight Line, Work Energy Power, etc.
