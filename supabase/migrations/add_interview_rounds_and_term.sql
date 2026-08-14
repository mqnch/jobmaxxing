ALTER TABLE user_job
ADD COLUMN IF NOT EXISTS interview_rounds INTEGER NOT NULL DEFAULT 0;

ALTER TABLE user_job
ADD COLUMN IF NOT EXISTS term TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_job_interview_rounds_check'
  ) THEN
    ALTER TABLE user_job
    ADD CONSTRAINT user_job_interview_rounds_check
    CHECK (interview_rounds >= 0 AND interview_rounds <= 4);
  END IF;
END $$;

UPDATE user_job uj
SET term = CASE WHEN j.season = 'winter' THEN 'W27' ELSE 'S27' END
FROM jobs j
WHERE uj.job_id = j.id AND uj.term IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_job_term ON user_job(term);
