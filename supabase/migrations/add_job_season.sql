-- Add season column to distinguish Summer vs Winter internship postings
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS season TEXT;

-- Backfill existing rows as 'summer' since that was the only season synced previously
UPDATE jobs SET season = 'summer' WHERE season IS NULL;

-- Create index on season for faster tab filtering
CREATE INDEX IF NOT EXISTS idx_jobs_season ON jobs(season);
