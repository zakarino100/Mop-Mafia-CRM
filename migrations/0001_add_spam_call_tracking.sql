DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'call_status' AND e.enumlabel = 'spam'
  ) THEN
    ALTER TYPE call_status ADD VALUE 'spam';
  END IF;
END $$;

ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS spam_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_spam integer DEFAULT 0;

UPDATE calls
SET
  spam_score = CASE
    WHEN (ivr_option IS NULL OR ivr_option IN ('timeout', '0')) THEN 2 ELSE 0 END
      + CASE
          WHEN COALESCE(duration_seconds, 0) < 8 THEN 2 ELSE 0 END
      + CASE
          WHEN call_status IN ('busy', 'failed', 'no-answer', 'canceled') THEN 2 ELSE 0 END
      + CASE
          WHEN regexp_replace(COALESCE(from_number, ''), '\\D', '', 'g') = regexp_replace(COALESCE(to_number, ''), '\\D', '', 'g') THEN 3 ELSE 0 END
      + CASE
          WHEN length(regexp_replace(COALESCE(from_number, ''), '\\D', '', 'g')) < 10 THEN 3 ELSE 0 END,
  is_spam = CASE
    WHEN (
      (CASE WHEN (ivr_option IS NULL OR ivr_option IN ('timeout', '0')) THEN 2 ELSE 0 END)
      + (CASE WHEN COALESCE(duration_seconds, 0) < 8 THEN 2 ELSE 0 END)
      + (CASE WHEN call_status IN ('busy', 'failed', 'no-answer', 'canceled') THEN 2 ELSE 0 END)
      + (CASE WHEN regexp_replace(COALESCE(from_number, ''), '\\D', '', 'g') = regexp_replace(COALESCE(to_number, ''), '\\D', '', 'g') THEN 3 ELSE 0 END)
      + (CASE WHEN length(regexp_replace(COALESCE(from_number, ''), '\\D', '', 'g')) < 10 THEN 3 ELSE 0 END)
    ) >= 5 THEN 1
    ELSE 0
  END;

UPDATE calls
SET call_status = 'spam'
WHERE is_spam = 1
  AND call_status IN ('initiated', 'busy', 'failed', 'no-answer', 'canceled');
