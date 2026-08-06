-- Optional coaching JSON for Practice (formula ladder, glossary, audio).
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS learning_aid jsonb;
