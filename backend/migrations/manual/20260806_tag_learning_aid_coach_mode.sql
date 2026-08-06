-- Tag Practice learning_aid coachMode and strip fake formula ladders from fact-recall MCQs.
-- Safe to re-run. Targets Physics chapters already seeded with pattern-based aids.

-- 1) Numerical → formula
UPDATE questions q
SET learning_aid = jsonb_set(
  learning_aid,
  '{meta,coachMode}',
  '"formula"'::jsonb,
  true
)
WHERE learning_aid IS NOT NULL
  AND COALESCE(learning_aid->'meta'->>'coachMode', '') = ''
  AND learning_aid->'meta'->>'questionType' = 'numerical_mcq';

-- 2) Conceptual / assertion / match with NO latex in ladder → recall + empty ladder
UPDATE questions q
SET learning_aid =
  jsonb_set(
    jsonb_set(learning_aid, '{meta,coachMode}', '"recall"'::jsonb, true),
    '{formulaLadder}',
    '[]'::jsonb,
    true
  )
WHERE learning_aid IS NOT NULL
  AND COALESCE(learning_aid->'meta'->>'coachMode', '') = ''
  AND learning_aid->'meta'->>'questionType' IN ('conceptual', 'assertion_reason', 'match', 'diagram')
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(learning_aid->'formulaLadder', '[]'::jsonb)) e
    WHERE e->>'latex' IS NOT NULL
      AND e->>'latex' NOT IN ('', 'null')
      AND length(trim(e->>'latex')) > 0
  );

-- 3) Conceptual-with-latex → concept
UPDATE questions q
SET learning_aid = jsonb_set(
  learning_aid,
  '{meta,coachMode}',
  '"concept"'::jsonb,
  true
)
WHERE learning_aid IS NOT NULL
  AND COALESCE(learning_aid->'meta'->>'coachMode', '') = ''
  AND learning_aid->'meta'->>'questionType' IN ('conceptual', 'assertion_reason', 'match', 'diagram')
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(learning_aid->'formulaLadder', '[]'::jsonb)) e
    WHERE e->>'latex' IS NOT NULL
      AND e->>'latex' NOT IN ('', 'null')
      AND length(trim(e->>'latex')) > 0
  );

-- 4) Anything else still missing coachMode: formula if latex else recall
UPDATE questions q
SET learning_aid = jsonb_set(
  learning_aid,
  '{meta,coachMode}',
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(learning_aid->'formulaLadder', '[]'::jsonb)) e
      WHERE e->>'latex' IS NOT NULL
        AND e->>'latex' NOT IN ('', 'null')
        AND length(trim(e->>'latex')) > 0
    ) THEN '"formula"'::jsonb
    ELSE '"recall"'::jsonb
  END,
  true
)
WHERE learning_aid IS NOT NULL
  AND COALESCE(learning_aid->'meta'->>'coachMode', '') = '';

-- Clear ladders on anything tagged recall (idempotent)
UPDATE questions
SET learning_aid = jsonb_set(learning_aid, '{formulaLadder}', '[]'::jsonb, true)
WHERE learning_aid IS NOT NULL
  AND learning_aid->'meta'->>'coachMode' = 'recall'
  AND jsonb_typeof(learning_aid->'formulaLadder') = 'array'
  AND jsonb_array_length(learning_aid->'formulaLadder') > 0;

-- 5) Mis-tagged numericals with no latex → concept (or recall if conceptual wording)
UPDATE questions q
SET learning_aid = jsonb_set(
  learning_aid,
  '{meta,coachMode}',
  '"concept"'::jsonb,
  true
)
WHERE learning_aid IS NOT NULL
  AND learning_aid->'meta'->>'coachMode' = 'formula'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(learning_aid->'formulaLadder', '[]'::jsonb)) e
    WHERE e->>'latex' IS NOT NULL
      AND e->>'latex' NOT IN ('', 'null')
      AND length(trim(e->>'latex')) > 0
  );
